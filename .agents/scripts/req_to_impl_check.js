#!/usr/bin/env node
/**
 * req_to_impl_check.js — Orphan-AC sweep + fidelity audit (02o).
 *
 * Runner-enforced (A9): every acceptance-criteria id in the story set must have
 * at least one reference in the declared implementation file set, or a dated
 * deferral row in the coverage report. Exit 1 on the first unresolved orphan.
 *
 * Frozen grammar (B9):
 *   - File set        : --targets (comma list, defaults src,lib,tests)
 *   - Exclusion set   : the stories file and coverage report are never targets
 *                       (self-match impossible); node_modules/.git skipped
 *   - Row key vs ref  : a report ref that is itself an AC id is a cross-ref,
 *                       never implementation evidence
 *   - Anchored match  : AC-1 does not satisfy AC-10 (nor AC-1-2); word-anchored
 *   - AC ids          : AC-[A-Z]*[-]N[-N...] (H happy / U unhappy / E edge / AI)
 *   - Evidence refs   : `path#id` (A11 anchor) or `path:line` (weaker)
 *
 * Usage:
 *   node .agents/scripts/req_to_impl_check.js [--stories P] [--report P]
 *        [--targets a,b] [--root R] [--json]
 *   node .agents/scripts/req_to_impl_check.js --fidelity [--report P] [--root R] [--json]
 *
 * Exit: 0 pass, 1 gate violation, 2 usage/IO.
 */
'use strict';

const fs = require('fs');
const path = require('path');
// B1 (frozen 2026-09-23): ONE grammar implementation shared with the spec
// parity checker — anchor refs are never re-parsed here.
const { resolveAnchor } = require('./spec_parity.js');

const DEFAULTS = {
  stories: 'artifacts/output/03-strategy/user-stories.md',
  report: 'artifacts/output/05-execution/quality/coverage-report.md',
  targets: 'src,lib,tests',
};

const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.rb', '.go', '.java', '.cs', '.php', '.swift', '.kt', '.rs', '.sh', '.vue', '.svelte']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.agents', 'artifacts']);
const EXCLUDED_BASENAMES = /coverage-report|user-stories|requirements/i;
const AC_ID_RE = /\bAC-(?:[A-Z]+)?-?\d+(?:-\d+)*\b/g;
const CLASSES = [
  'Screen states',
  'Edge cases & validation',
  'Data fields & types',
  'Permissions & auth',
  'Navigation & flows',
  'Copy & tone',
  'Telemetry',
  'Performance notes',
  'Accessibility',
  'Platform constraints',
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || String(next).startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Stories / refs / report parsing
// ---------------------------------------------------------------------------
function extractAcs(content) {
  return [...new Set(content.match(AC_ID_RE) || [])];
}

function isAcId(token) {
  return /^AC-(?:[A-Z]+)?-?\d+(?:-\d+)*$/.test(token);
}

function stripTicks(s) {
  return s.replace(/`/g, '').trim();
}

function rowsUnderHeading(content, headingRe) {
  const lines = content.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,3}\s/.test(lines[i]) && headingRe.test(lines[i])) { start = i; break; }
  }
  if (start === -1) return [];
  const rows = [];
  let seen = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^#{1,3}\s/.test(line)) { if (seen) break; continue; }
    if (!trimmed.startsWith('|')) { if (seen) break; continue; }
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (cells.length >= 2 && /^(AC id|Detail class|Class|ID)$/i.test(cells[0])) continue;
    seen = true;
    rows.push(cells);
  }
  return rows;
}

function parseCoverageRows(reportContent) {
  const rows = rowsUnderHeading(reportContent, /AC coverage/i);
  const out = [];
  for (const cells of rows) {
    if (cells.length < 5) continue;
    const [acId, refsCell, mechanism, check, status] = cells.map(stripTicks);
    if (!isAcId(acId)) continue;
    const refs = refsCell
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r && r !== '—' && r !== '-');
    out.push({ acId, refs, mechanism, check, status });
  }
  return out;
}

function parseClassRows(reportContent) {
  const rows = rowsUnderHeading(reportContent, /fidelity review/i);
  const out = [];
  for (const cells of rows) {
    if (cells.length < 3) continue;
    const [cell, status, evidence] = cells.map(stripTicks);
    const cls = CLASSES.find((c) => cell === c || cell.startsWith(c));
    if (!cls) continue;
    out.push({ cls, status, evidence });
  }
  return out;
}

function isDeferral(row) {
  return /deferr/i.test(row.status) && /owner\s*:/i.test(row.status) && /\d{4}-\d{2}-\d{2}/.test(row.status);
}

// ---------------------------------------------------------------------------
// File set
// ---------------------------------------------------------------------------
function collectFiles(root, targets, exclusions) {
  const files = [];
  const excluded = new Set(exclusions.map((p) => path.resolve(root, p)));
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        walk(full);
      } else if (entry.isFile()) {
        if (!CODE_EXT.has(path.extname(entry.name))) continue;
        if (excluded.has(path.resolve(full))) continue;
        if (EXCLUDED_BASENAMES.test(entry.name)) continue;
        files.push(full);
      }
    }
  };
  for (const t of targets) {
    const p = path.resolve(root, t);
    if (!fs.existsSync(p)) continue;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (CODE_EXT.has(path.extname(p))) files.push(p);
  }
  return files;
}

function hasAnchoredRef(files, acId) {
  const re = new RegExp(`(^|[^A-Za-z0-9-])${escapeRe(acId)}(?![0-9-])`);
  for (const file of files) {
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    if (re.test(content)) return path.relative(process.cwd(), file);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Ref resolution (row key vs ref target)
// ---------------------------------------------------------------------------
function resolveRef(root, ref) {
  if (isAcId(ref)) return { ok: true, kind: 'ac-cross-ref' };
  const hashIdx = ref.indexOf('#');
  if (hashIdx > 0) {
    // Frozen A11 grammar (D1 fixed 2026-09-23): delegate to the single
    // implementation — rejects absolute paths, `..` escapes, empty ids.
    const res = resolveAnchor(root, ref);
    return res.ok ? { ok: true, kind: 'anchor' } : { ok: false, kind: 'anchor', reason: res.reason };
  }
  const lineIdx = ref.lastIndexOf(':');
  if (lineIdx > 0 && /^\d+$/.test(ref.slice(lineIdx + 1))) {
    const rel = ref.slice(0, lineIdx);
    const line = parseInt(ref.slice(lineIdx + 1), 10);
    if (path.isAbsolute(rel) || rel.split('/').includes('..')) {
      return { ok: false, kind: 'line', reason: `ref path must be repo-relative: ${rel}` };
    }
    const file = path.resolve(root, rel);
    if (!fs.existsSync(file)) return { ok: false, kind: 'line', reason: `file not found: ${rel}` };
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    return line >= 1 && line <= lines.length
      ? { ok: true, kind: 'line' }
      : { ok: false, kind: 'line', reason: `${rel}:${line} beyond EOF (${lines.length} lines)` };
  }
  return { ok: false, kind: 'unknown', reason: `unrecognized ref "${ref}"` };
}

function extractRefs(text) {
  const found = [...String(text).matchAll(/(?:[A-Za-z0-9._/-]+#[A-Za-z][A-Za-z0-9._:-]*|[A-Za-z0-9._/-]+:\d+)/g)].map((m) => m[0]);
  return [...new Set(found)];
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
function cmdFidelity(root, reportPath, json) {
  if (!fs.existsSync(reportPath)) {
    console.error(`req_to_impl_check: coverage report not found: ${path.relative(root, reportPath)}`);
    process.exit(2);
  }
  const rows = parseClassRows(fs.readFileSync(reportPath, 'utf8'));
  const problems = [];
  const byCls = new Map(rows.map((r) => [r.cls, r]));
  let implemented = 0;
  let deferred = 0;
  let refsResolved = 0;
  for (const cls of CLASSES) {
    const row = byCls.get(cls);
    if (!row) { problems.push(`${cls}: missing from the fidelity table`); continue; }
    if (/^deferr/i.test(row.status)) {
      const reason = row.status.replace(/^deferred?\s*[:\-—]?\s*/i, '').trim();
      if (!reason && !row.evidence) problems.push(`${cls}: deferred without a reason`);
      else deferred++;
    } else if (/^implemented/i.test(row.status)) {
      if (!row.evidence) { problems.push(`${cls}: implemented without evidence`); continue; }
      // D2 fixed 2026-09-23: evidence refs are RESOLVED, not counted as non-empty strings.
      const refs = extractRefs(row.evidence);
      if (refs.length === 0) problems.push(`${cls}: implemented without a resolvable evidence ref`);
      for (const r of refs) {
        const res = resolveRef(root, r);
        if (!res.ok) problems.push(`${cls}: evidence ref ${r} does not resolve (${res.reason})`);
        else refsResolved++;
      }
      implemented++;
    } else {
      problems.push(`${cls}: status must be "implemented" or "deferred: reason" (got "${row.status}")`);
    }
  }
  const out = { gate: 'fidelity', classes: rows.length, implemented, deferred, refsResolved, problems, pass: problems.length === 0 };
  if (json) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`req_to_impl_check --fidelity: ${rows.length}/10 classes recorded (${implemented} implemented with ${refsResolved} resolvable ref(s), ${deferred} deferred with reasons)`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    if (out.pass) console.log('fidelity: PASS — implemented classes carry resolvable evidence refs; deferred rows carry reasons');
  }
  process.exit(out.pass ? 0 : 1);
}

function cmdFreshness(args) {
  const root = path.resolve(args.root || process.cwd());
  const reportPath = path.resolve(root, args.report || DEFAULTS.report);
  const targets = String(args.targets || DEFAULTS.targets).split(',').map((s) => s.trim()).filter(Boolean);
  const result = { gate: 'freshness', report: path.relative(root, reportPath), fresh: true, reason: null, newest: null };
  if (!fs.existsSync(reportPath)) {
    result.reason = 'no coverage report — nothing to check';
  } else {
    const files = collectFiles(root, targets, [reportPath]);
    const reportMtime = fs.statSync(reportPath).mtimeMs;
    let newest = { file: null, mtime: 0 };
    for (const f of files) {
      const m = fs.statSync(f).mtimeMs;
      if (m > newest.mtime) newest = { file: path.relative(root, f), mtime: m };
    }
    result.newest = newest.file;
    if (newest.mtime > reportMtime) {
      result.fresh = false;
      result.reason = `coverage report is older than ${newest.file} — re-run the sweep before proceeding`;
    } else {
      result.reason = `report newer than the newest target file (${newest.file || 'none'})`;
    }
  }
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else if (result.fresh) console.log(`req_to_impl_check --freshness: FRESH — ${result.reason}`);
  else console.error(`req_to_impl_check --freshness: STALE — ${result.reason}`);
  process.exit(result.fresh ? 0 : 1);
}

function cmdSweep(args) {
  const root = path.resolve(args.root || process.cwd());
  const storiesPath = path.resolve(root, args.stories || DEFAULTS.stories);
  const reportPath = path.resolve(root, args.report || DEFAULTS.report);
  const targets = String(args.targets || DEFAULTS.targets).split(',').map((s) => s.trim()).filter(Boolean);

  if (args.freshness) return cmdFreshness(args);
  if (args.fidelity) return cmdFidelity(root, reportPath, Boolean(args.json));

  if (!fs.existsSync(storiesPath)) {
    console.error(`req_to_impl_check: stories not found: ${path.relative(root, storiesPath)}`);
    process.exit(2);
  }

  const acs = extractAcs(fs.readFileSync(storiesPath, 'utf8'));
  const files = collectFiles(root, targets, [storiesPath, reportPath]);
  const orphans = [];
  for (const ac of acs) {
    const hit = hasAnchoredRef(files, ac);
    if (!hit) orphans.push(ac);
  }

  let reportRows = [];
  let refProblems = [];
  if (fs.existsSync(reportPath)) {
    reportRows = parseCoverageRows(fs.readFileSync(reportPath, 'utf8'));
    for (const row of reportRows) {
      if (!acs.includes(row.acId)) refProblems.push(`${row.acId}: row key not present in the story set`);
      for (const ref of row.refs) {
        const res = resolveRef(root, ref);
        if (!res.ok) refProblems.push(`${row.acId}: ${res.reason}`);
      }
    }
  }

  const deferred = new Set(reportRows.filter(isDeferral).map((r) => r.acId));
  const unresolvedOrphans = orphans.filter((ac) => !deferred.has(ac));
  const violations = [];
  if (unresolvedOrphans.length > 0) violations.push(`${unresolvedOrphans.length} orphan AC(s): ${unresolvedOrphans.join(', ')}`);
  violations.push(...refProblems.map((p) => `ref: ${p}`));

  const out = {
    root,
    stories: path.relative(root, storiesPath),
    targets,
    files: files.length,
    acs,
    orphans,
    deferred: [...deferred],
    unresolvedOrphans,
    refProblems,
    violations,
    pass: violations.length === 0,
  };

  if (args.json) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`req_to_impl_check${args.fidelity ? ' --fidelity' : ''}`);
    console.log(`  stories      : ${path.relative(root, storiesPath)}`);
    console.log(`  target files : ${files.length}`);
    console.log(`  AC ids       : ${acs.length}`);
    console.log(`  orphans      : ${orphans.length}${orphans.length ? ' — ' + orphans.join(', ') : ''}`);
    console.log(`  deferred     : ${deferred.size}${deferred.size ? ' — ' + [...deferred].join(', ') : ''}`);
    for (const v of violations) console.error(`  ✗ ${v}`);
    if (out.pass) console.log('req_to_impl_check: PASS — zero orphan ACs');
  }
  process.exit(out.pass ? 0 : 1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  cmdSweep(args);
}

if (require.main === module) main();

module.exports = { extractAcs, isAcId, parseCoverageRows, parseClassRows, resolveRef, extractRefs, hasAnchoredRef, collectFiles };
