#!/usr/bin/env node
/**
 * check_new_findings.js — NEW-FINDINGS-ONLY gate (02f §10 / DoD #8)
 *
 * Runs security-scan.js over the repo and diffs results against the frozen
 * baseline. Fails ONLY on findings whose (rule, path, line) key is absent
 * from the baseline — known/documented findings never auto-block, and new
 * ones can never be silently absorbed (they must be triaged and either
 * fixed or added to the baseline via human-reviewed commit).
 *
 * Exit codes:
 *   0 = no NEW findings vs baseline
 *   1 = NEW findings present (triage required)
 *   2 = tool/environment failure (missing baseline, scan crash, unparseable output)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCAN = path.join(__dirname, 'security-scan.js');
const SPEC = path.join(
  ROOT,
  'security',
  'audit-spec.json'
);
const BASELINE =
  process.env.BASELINE_FILE ||
  path.join(ROOT, 'evals', 'security', 'corpus', 'baseline-repo-2026-08-25.json');

function main() {
  if (!fs.existsSync(BASELINE)) {
    console.error(`FAIL-CLOSED: baseline file missing: ${BASELINE}`);
    process.exitCode = 2;
    return;
  }
  let baseline;
  try {
    baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  } catch (e) {
    console.error(`FAIL-CLOSED: cannot parse baseline (${e.message})`);
    process.exitCode = 2;
    return;
  }
  const baseKeys = new Set((baseline.findings || []).map((f) => `${f.rule}|${f.path}|${f.line || 0}`));
  // O-3 (Victor): line-shift resilience — a finding that moved lines within
  // the same file (rule + identical normalized text) matches its baseline
  // entry via a path+detail key, so doc edits don't churn triage. Genuinely
  // NEW rule hits at a path still fail the gate.
  const crypto = require('crypto');
  const detailKey = (f) =>
    `reloc|${f.rule}|${f.path}|` +
    crypto.createHash('sha256').update(String(f.detail || '')).digest('hex').slice(0, 16);
  const baseReloc = new Set((baseline.findings || []).map(detailKey));

  let out;
  try {
    out = execFileSync('node', [SCAN, '--dir', ROOT, '--spec', SPEC, '--json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    out = e.stdout || '';
    if (!out.trim()) {
      console.error(`FAIL-CLOSED: scan failed without output (${e.message})`);
      process.exitCode = 2;
      return;
    }
  }

  let result;
  try {
    result = JSON.parse(out);
  } catch (e) {
    console.error('FAIL-CLOSED: unparseable scan output');
    process.exitCode = 2;
    return;
  }
  if (result.exit === 2) {
    console.error('FAIL-CLOSED: scanner reported tool failure (exit 2)');
    process.exitCode = 2;
    return;
  }

  const fresh = (result.findings || []).filter(
    (f) => !baseKeys.has(`${f.rule}|${f.path}|${f.line || 0}`) && !baseReloc.has(detailKey(f))
  );

  console.log(`Baseline: ${baseKeys.size} known findings (frozen ${baseline.date || 'n/a'}).`);
  console.log(`Current: ${(result.findings || []).length} findings. NEW: ${fresh.length}.`);

  if (fresh.length > 0) {
    console.error('\nNEW FINDINGS — triage required (fix, or extend baseline via human-reviewed commit):');
    for (const f of fresh.slice(0, 25)) {
      console.error(`  [${f.severity}] ${f.rule} ${f.path}:${f.line || 0} — ${f.detail}`);
    }
    if (fresh.length > 25) console.error(`  …+${fresh.length - 25} more`);
    process.exitCode = 1;
    return;
  }

  console.log('NEW-FINDINGS-ONLY gate: PASS.');
  process.exitCode = 0;
}

main();
