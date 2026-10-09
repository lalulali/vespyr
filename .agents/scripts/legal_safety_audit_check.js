#!/usr/bin/env node
/**
 * legal_safety_audit_check.js — mechanical gate for /legal-safety-audit.
 *
 * WHY THIS EXISTS. The skill is unusually well specified: six numbered guardrails, 20 checks, an
 * applicability gate before any check runs, and a mandated report shape. Almost none of it could be
 * falsified. Nothing checked that all 20 checks were accounted for, so G6 — "every skipped check is
 * disclosed with its reason and evidence, never skip silently" — was a promise rather than a
 * property. An audit could run two checks, skip eighteen without a word, and still produce a report
 * that satisfied every written rule.
 *
 * Four invariants here are genuinely mechanical:
 *
 *   G1  every generated document carries the DRAFT header, and none is marked done
 *   G3  the report names the region(s) it resolved — there is no default to fall back on
 *   G5/G6  all 20 checks (A1-A7, B1-B13) are accounted for as ran, skipped, or flagged
 *   G6  every skipped check carries a reason
 *
 * WHAT THIS DOES NOT CHECK, stated rather than implied: whether a legal judgement was correct, whether
 * a finding is real, or whether the drafted documents are adequate. Those need a lawyer. A green result
 * here means the audit was conducted and disclosed completely — nothing more, and G1's own header says
 * every generated document still requires human review.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

/** The 20 checks in references/checklist.md. Hardcoded on purpose: it is the contract. */
const PHASE_A = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'];
const PHASE_B = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13'];
const ALL_CHECKS = [...PHASE_A, ...PHASE_B];

const DRAFT_MARKER = /DRAFT\s*[—-]\s*requires human\/lawyer review/i;
const REGION_RE = /^\s*(?:[-*]\s*)?\**\s*(?:Region|Regions|Jurisdiction|Jurisdictions)s?\b\**\s*:/im;

/** A heading whose text matches, and the body beneath it up to the next same-or-higher heading. */
function section(text, headingRe) {
  const lines = String(text).split('\n');
  const re = new RegExp(`^(\\s*)(#{1,6})\\s*${headingRe}`, 'i');
  let hit = -1;
  let bestLevel = 99;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const level = m[2].length;
    if (level >= 2 && level < bestLevel) { hit = i; bestLevel = level; }
  }
  if (hit === -1) return null;
  const level = lines[hit].match(re)[2].length;
  const body = [];
  for (let j = hit + 1; j < lines.length; j++) {
    const h = lines[j].match(/^(\s*)(#{1,6})\s/);
    if (h && h[2].length <= level) break;
    body.push(lines[j]);
  }
  return body.join('\n');
}

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  } else {
    console.error(`✗ legal_safety_audit_check: ${msg}`);
  }
  process.exit(2);
}

/** Every check id mentioned in a block, e.g. `B7` or `B7/B8`. */
function idsIn(text) {
  const found = new Set();
  const re = /\b([AB](?:1[0-3]|[1-9]))\b/g;
  let m;
  while ((m = re.exec(String(text || ''))) !== null) found.add(m[1]);
  return found;
}

function check(report, draftsDir, jsonMode) {
  const failures = [];

  // ---- G3: the region must be resolved and stated. There is no default. ----
  const regions = String(report).match(REGION_RE);
  if (!regions) {
    failures.push(
      'The report does not state the region(s) it resolved (G3). Everything downstream — which legal ' +
      'regime drives each check — depends on it, and there is deliberately no hardcoded default.'
    );
  }

  // ---- G5/G6: all 20 checks accounted for. ----
  const ranSec = section(report, '(Ran|Applicable checks|Will run)') || '';
  const skippedSec = section(report, 'Skipped') || '';
  const flaggedSec = section(report, '(Flagged|Owner decision)') || '';

  const ran = idsIn(ranSec);
  const skipped = idsIn(skippedSec);
  const flagged = idsIn(flaggedSec);

  if (!ranSec && !skippedSec && !flaggedSec) {
    failures.push(
      'The report has none of the three mandated sections (Ran / Skipped / Flagged for owner ' +
      'decision). The report shape in the skill is part of the contract, not a suggestion.'
    );
  }

  const accounted = new Set([...ran, ...skipped, ...flagged]);
  const missing = ALL_CHECKS.filter((c) => !accounted.has(c));
  if (missing.length) {
    failures.push(
      `${missing.length} of ${ALL_CHECKS.length} checks are unaccounted for: ${missing.join(', ')}. ` +
      'G6 is "never skip silently" — a check that appears in none of Ran, Skipped or Flagged is ' +
      'indistinguishable from a check that was quietly dropped.'
    );
  }

  // A check cannot be both ran and skipped. That combination is a report that was assembled rather
  // than written, and it makes the totals meaningless.
  const both = [...ran].filter((c) => skipped.has(c));
  if (both.length) {
    failures.push(
      `${both.length} check(s) appear as both ran and skipped: ${both.join(', ')}. A check is ` +
      'applicable or it is not; listing it twice makes the accounting unfalsifiable.'
    );
  }

  // ---- G6: every skipped check carries a reason. ----
  if (skippedSec) {
    const missingReason = [];
    for (const line of skippedSec.split('\n')) {
      const ids = idsIn(line);
      if (!ids.size) continue;
      const rest = line.replace(/\b[A-B](?:1[0-3]|[1-9])\b/g, '').replace(/[|:*_`\-–—]/g, ' ').trim();
      if (rest.split(/\s+/).filter(Boolean).length < 3) missingReason.push([...ids].join('/'));
    }
    if (missingReason.length) {
      failures.push(
        `${missingReason.length} skipped check row(s) carry no reason: ${missingReason.join(', ')}. ` +
        'G6 requires a reason AND the evidence behind it — a bare id is not a disclosure.'
      );
    }
  }

  // ---- G1: every draft carries the DRAFT header, and none is marked done. ----
  let drafts = [];
  try {
    drafts = fs.existsSync(draftsDir)
      ? fs.readdirSync(draftsDir).filter((f) => /\.(md|html|txt|docx?)$/i.test(f))
      : [];
  } catch (e) {
    return failClosed(`cannot read drafts directory: ${e.message}`, jsonMode);
  }
  for (const f of drafts) {
    const full = path.join(draftsDir, f);
    let body;
    try {
      body = fs.readFileSync(full, 'utf8');
    } catch (e) {
      failures.push(`cannot read draft ${f}: ${e.message}`);
      continue;
    }
    if (!DRAFT_MARKER.test(body)) {
      failures.push(
        `Draft "${f}" carries no DRAFT — requires human/lawyer review header (G1). A generated legal ` +
        'document without that marker reads as final, which is the one thing it must never be.'
      );
    }
    if (/\b(?:status\s*[:*]*\s*)?(?:final|approved|done|complete[d]?)\b/i.test(body.slice(0, 400))) {
      failures.push(
        `Draft "${f}" appears marked final/approved/done near its top (G1). A legal draft is never ` +
        'marked done — it is always a draft for human review.'
      );
    }
  }

  return {
    kind: 'legal-safety-audit',
    ok: failures.length === 0,
    exit: failures.length ? 1 : 0,
    totals: {
      checks: ALL_CHECKS.length,
      ran: ran.size,
      skipped: skipped.size,
      flagged: flagged.size,
      unaccounted: missing.length,
      drafts: drafts.length,
    },
    failures,
    note:
      'This gate checks DISCLOSURE, not legal correctness — a green result is NOT legal advice. It ' +
      'means the audit was conducted and disclosed completely: every check accounted for, every ' +
      'skip justified, every draft stamped. It says nothing about whether a legal judgement was ' +
      'right or whether the drafts are adequate. Every generated document still requires review by ' +
      'a lawyer, which is what G1\'s own header says.',
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--report') args.report = argv[++i];
    else if (a === '--drafts') args.drafts = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

const USAGE = `Usage: node .agents/scripts/legal_safety_audit_check.js check --report <path> [--drafts <dir>] [--json]

  --report  artifacts/output/legal-safety-audit/audit-report.md
  --drafts  artifacts/output/legal-safety-audit/drafts   (defaults to <report dir>/drafts)

Checks G1 (every draft stamped DRAFT, none marked done), G3 (region resolved and stated),
and G5/G6 (all 20 checks A1-A7 / B1-B13 accounted for as ran, skipped, or flagged, with every
skip carrying a reason).

Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).

This checks DISCLOSURE, not legal correctness. A green result is not legal advice.`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.report) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') failClosed(`unknown command "${cmd}" (expected "check")`, args.json);

  const reportPath = path.resolve(process.cwd(), args.report);
  if (!fs.existsSync(reportPath)) {
    failClosed(`cannot read ${args.report} — a missing audit report is a missing deliverable, never a pass`, args.json);
  }
  const report = fs.readFileSync(reportPath, 'utf8');
  if (!report.trim()) failClosed(`${args.report} is empty — an empty audit is a failure, not a pass`, args.json);

  const draftsDir = path.resolve(
    process.cwd(),
    args.drafts || path.join(path.dirname(reportPath), 'drafts')
  );

  const result = check(report, draftsDir, args.json);
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.ok) {
    const t = result.totals;
    console.log(`✓ legal-safety-audit: disclosure conformant — ${t.ran} ran, ${t.skipped} skipped, ${t.flagged} flagged, ${t.unaccounted} unaccounted, ${t.drafts} drafts stamped`);
    console.log('  ' + result.note);
  } else {
    const plural = result.failures.length === 1 ? '' : 's';
    console.error(`✗ legal-safety-audit: ${result.failures.length} issue${plural} — ${args.report}`);
    for (const f of result.failures) console.error(`  - ${f}`);
  }
  process.exit(result.exit);
}

main();
