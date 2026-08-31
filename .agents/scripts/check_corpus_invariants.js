#!/usr/bin/env node
/**
 * check_corpus_invariants.js — CI gate for the security red-team corpus (02f F1.54).
 *
 * Verifies the per-rule fixture invariant declared in evals/security/corpus/README.md:
 *   (a) every rule in audit-spec.json has >=1 positive + >=1 negative fixture,
 *   (b) a positive-only scan exits 1,
 *   (c) a negative-only scan exits 0,
 *   (d) the corpus-root scan is deterministic (baseline comparison).
 *
 * Exit codes: 0 = invariants hold, 1 = invariant violated (CI fails).
 * Usage: node .agents/scripts/check_corpus_invariants.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCANNER = path.join(ROOT, '.agents', 'scripts', 'security-scan.js');
const SPEC = path.join(ROOT, 'security', 'audit-spec.json');
const CORPUS = path.join(ROOT, 'evals', 'security', 'corpus');
const BASELINE = path.join(CORPUS, 'baseline-2026-08-10.json');

function run(args) {
  try {
    const out = execFileSync('node', [SCANNER, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return { exit: 0, out };
  } catch (e) {
    return { exit: e.status == null ? 2 : e.status, out: e.stdout || '' };
  }
}

function main() {
  const failures = [];

  // (a) per-rule fixture invariant: every rule has >=1 positive + >=1 negative fixture dir
  const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
  const positiveDir = path.join(CORPUS, 'positive');
  const negativeDir = path.join(CORPUS, 'negative');

  function fixtureCounts(rootDir) {
    const counts = {};
    const walkDir = (d) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        // Skip the corpus root's own .git (none exists) and DS_Store; do NOT
        // skip nested .git dirs — GH-1 fixtures deliberately live at
        // gh1/.git/config.
        if (d === rootDir && (ent.name === '.git' || ent.name === '.DS_Store')) continue;
        if (ent.name === '.DS_Store') continue;
        const full = path.join(d, ent.name);
        if (ent.isDirectory()) walkDir(full);
        else {
          // map fixture file -> rule. Priority: dir name match, then filename.
          const rel = path.relative(rootDir, full);
          const dirPart = rel.split(path.sep)[0];
          let ruleId = null;
          if (/^gh1/.test(dirPart)) ruleId = 'GH-1';
          else if (/^harness-shaped/.test(dirPart)) ruleId = 'INJ-CONFIG';
          else if (/^inj-path/.test(dirPart)) ruleId = 'INJ-PATH';
          else if (dirPart === 'templates') ruleId = 'INJ-TEMPLATE';
          else if (/^inj-symlink/.test(dirPart)) ruleId = 'INJ-SYMLINK';
          else if (/^beacon-1/.test(ent.name)) ruleId = 'BEACON-1';
          else if (ent.name === 'opencode.json') ruleId = 'INJ-CONFIG';
          else if (/^inj-[a-z-]+\./.test(ent.name)) ruleId = 'INJ-' + ent.name.slice(4).split('.')[0].toUpperCase();
          if (ruleId) counts[ruleId] = (counts[ruleId] || 0) + 1;
        }
      }
    };
    walkDir(rootDir);
    return counts;
  }

  const pos = fixtureCounts(positiveDir);
  const neg = fixtureCounts(negativeDir);
  for (const rule of spec.rules) {
    if (!(rule.id in pos) || pos[rule.id] < 1) failures.push(`rule ${rule.id}: no positive fixture (invariant a)`);
    if (!(rule.id in neg) || neg[rule.id] < 1) failures.push(`rule ${rule.id}: no negative fixture (invariant a)`);
  }

  // (b) positive-only scan exits 1
  const posScan = run(['--dir', positiveDir, '--spec', SPEC]);
  if (posScan.exit !== 1) failures.push(`positive-only scan: expected exit 1, got ${posScan.exit}`);

  // (c) negative-only scan exits 0
  const negScan = run(['--dir', negativeDir, '--spec', SPEC]);
  if (negScan.exit !== 0) failures.push(`negative-only scan: expected exit 0, got ${negScan.exit} — ${negScan.out.slice(0, 200)}`);

  // (d) determinism: two corpus-root runs byte-identical, and match the frozen baseline if present
  const run1 = run(['--dir', CORPUS, '--spec', SPEC, '--json']);
  const run2 = run(['--dir', CORPUS, '--spec', SPEC, '--json']);
  if (run1.out !== run2.out) failures.push('corpus-root scan: nondeterministic output across two runs');
  if (fs.existsSync(BASELINE)) {
    const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    const cur = JSON.parse(run1.out);
    // INJ-SYMLINK details embed the OS-resolved symlink target
    // (/private/etc/passwd on macOS firmlink vs /etc/passwd on Linux vs
    // <unresolvable> on Windows) — environment-dependent by construction,
    // so cross-environment comparison keys on rule|path|line only. The
    // platform-local value is still covered by the byte-identical double-run
    // determinism check above.
    const key = (f) =>
      f.rule === 'INJ-SYMLINK'
        ? JSON.stringify([f.rule, f.path, f.line || 0])
        : JSON.stringify([f.rule, f.path, f.line || 0, f.detail.slice(0, 80)]);
    // Order-insensitive set comparison: readdir order is filesystem-dependent
    // (APFS vs ext4 vs NTFS), so sequence equality would fail honest clones.
    const curKeys = cur.findings.map(key).map((k) => JSON.stringify(k)).sort();
    const baseKeys = baseline.findings.map(key).map((k) => JSON.stringify(k)).sort();
    if (JSON.stringify(curKeys) !== JSON.stringify(baseKeys)) {
      const curSet = new Set(curKeys);
      const baseSet = new Set(baseKeys);
      const onlyCur = curKeys.filter((k) => !baseSet.has(k)).slice(0, 5);
      const onlyBase = baseKeys.filter((k) => !curSet.has(k)).slice(0, 5);
      failures.push(
        'corpus-root scan: findings differ from frozen baseline-2026-08-10.json' +
        ` (only-in-current[${onlyCur.length}]: ${onlyCur.join(' | ') || '—'}` +
        `; only-in-baseline[${onlyBase.length}]: ${onlyBase.join(' | ') || '—'})`
      );
    }
  }

  if (failures.length) {
    console.error('CORPUS INVARIANTS FAILED:');
    for (const f of failures) console.error('  - ' + f);
    process.exitCode = 1;
  } else {
    console.log('corpus invariants OK: all rules have pos+neg fixtures; pos=1, neg=0, deterministic.');
  }
}

main();
