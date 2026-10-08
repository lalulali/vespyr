#!/usr/bin/env node
/**
 * spec_parity.js — Mechanical parity checker for the reverse-PRD workflow (02n).
 *
 * Structural tier (deterministic, test-backed; see tests/test_spec_parity.test.js):
 *   - Ghosts      : ledger rows (non-[OPEN]) whose `path#id` anchor does not resolve
 *   - Orphans     : inventory rows whose anchor is referenced by no ledger row
 *                   (allowed only with an owner+date deferral in parity-report.md)
 *   - Grounding   : resolvable ÷ (resolvable + ghosts); [OPEN] rows are exempt
 *   - 10 classes  : parity-report.md class table — covered-with-evidence or N/A-with-reason
 *   - Baseline    : prototype hash (file) / inventory snapshot hash (non-file) vs report
 *
 * Frozen anchor grammar (A11): `path#id` — one `#`; repo-relative POSIX path;
 * id token `^[A-Za-z][A-Za-z0-9._:-]*$`; HTML/SVG anchors are `id="..."`,
 * other files match the id as a word-boundary symbol. Semantic fidelity (does
 * the anchor support the statement?) is judged tier — owner sampling at R4 (A7).
 *
 * Usage:
 *   node .agents/scripts/spec_parity.js check [--inventory P] [--requirements P] [--report P] [--root R] [--json] [--metrics-only]
 *   node .agents/scripts/spec_parity.js baseline stamp [--report P] [--prototype P] [--inventory P] [--pointer URL] [--now ISO] [--json]
 *   node .agents/scripts/spec_parity.js baseline check [--report P] [--inventory P] [--root R] [--json]
 *
 * Exit: 0 pass/absent, 1 gate violation, 2 usage/IO error.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

const DEFAULTS = {
  inventory: 'artifacts/output/03-strategy/prototype-inventory.md',
  requirements: 'artifacts/output/03-strategy/requirements.md',
  report: 'artifacts/output/03-strategy/parity-report.md',
};

const ANCHOR_RE = /^[A-Za-z0-9._/-]+#[A-Za-z][A-Za-z0-9._:-]*$/;
const OPEN = '[OPEN]';
const DEFERRED = '[DEFERRED TO SPEC]';

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------
function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: content, hasFm: false };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    data[mm[1]] = v;
  }
  return { data, body: content.slice(m[0].length), hasFm: true };
}

function serializeFrontmatter(data, body) {
  const lines = Object.entries(data).map(([k, v]) => {
    const s = String(v);
    const needsQuote = s === '' || /:\s/.test(s) || s.startsWith(' ') || s.endsWith(' ') || s.startsWith('[');
    return `${k}: ${needsQuote ? `"${s.replace(/"/g, '\\"')}"` : s}`;
  });
  return `---\n${lines.join('\n')}\n---\n${body.replace(/^\r?\n/, '')}`;
}

// ---------------------------------------------------------------------------
// Anchor resolution (frozen A11 grammar)
// ---------------------------------------------------------------------------
function resolveAnchor(root, anchor) {
  if (!ANCHOR_RE.test(anchor)) return { ok: false, reason: `anchor does not match the frozen path#id grammar` };
  const i = anchor.indexOf('#');
  const rel = anchor.slice(0, i);
  const id = anchor.slice(i + 1);
  if (path.isAbsolute(rel) || rel.includes('..')) return { ok: false, reason: 'anchor path must be repo-relative' };
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return { ok: false, reason: `file not found: ${rel}` };
  const content = fs.readFileSync(file, 'utf8');
  if (/\.(html?|svg)$/i.test(file)) {
    const ok = new RegExp(`id=["']${escapeRe(id)}["']`).test(content);
    return ok ? { ok: true } : { ok: false, reason: `id="${id}" not found in ${rel}` };
  }
  const ok = new RegExp(`(^|[^A-Za-z0-9_-])${escapeRe(id)}([^A-Za-z0-9_-]|$)`).test(content);
  return ok ? { ok: true } : { ok: false, reason: `symbol "${id}" not found in ${rel}` };
}

// ---------------------------------------------------------------------------
// Markdown table helpers
// ---------------------------------------------------------------------------
function stripTicks(s) {
  return s.replace(/`/g, '').trim();
}

function rowsUnderHeading(content, headingRe) {
  const lines = content.split(/\r?\n/);
  let start = -1;
  let level = 3;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,3})\s/);
    if (m && headingRe.test(lines[i])) { start = i; level = m[1].length; break; }
  }
  if (start === -1) return [];
  const rows = [];
  let seen = false;
  // SILENT TRUNCATION, measured twice, and both times on real artifacts.
  //
  // (a) This loop used to `break` on the first heading of ANY level after the table started. A
  //     §14 Evidence Ledger split across three sub-headed tables read 28 rows of 41, dropped 13,
  //     and exited 0 with no warning. A gate that reports a fraction of its input without saying
  //     so is worse than one that fails: the number it prints is the only number the reader gets.
  //
  // (b) It then stopped at the first non-table line. A section that opens with a small pointer
  //     map, then prose, then the real table — which is exactly what a prototype inventory
  //     documenting its anchor grammar looks like — read the pointer map, found no row with the
  //     expected column count, and reported `inventory: 0`.
  //
  // So: scan the WHOLE section. A heading at the same or shallower level ends it; a deeper
  // heading is a subsection and is followed; prose is not a boundary. Each parser then filters
  // by its own id pattern and minimum column count, so unrelated tables are ignored rather than
  // terminating the scan.
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const h = line.match(/^(#{1,6})\s/);
    if (h) {
      if (h[1].length <= level) break;   // same or shallower: this section is over
      continue;                            // deeper: a subsection, keep reading
    }
    if (!trimmed.startsWith('|')) continue; // prose between tables is not a section boundary
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    // A header row is identified STRUCTURALLY — it is the row immediately above a `|---|`
    // separator — not by a list of expected column names.
    //
    // The previous check was `/^(ID|Metric|Class|Anchor|...)$/`, so a document naming its first
    // column anything else ("Orphan", "Behaviour", "Ref") had its header parsed as data and every
    // subsequent cell read one column out of step. Found while writing the fixture below: my own
    // test used `| Orphan |` and the gate silently mis-parsed it.
    const next = (lines[i + 1] || '').trim();
    if (/^\|?[\s:|-]+\|/.test(next) && next.includes('-') && cells.some((c) => c.length > 0)) continue;
    // Name-based skip retained for documents that omit the separator row entirely.
    if (cells.length >= 2 && /^(ID|Metric|Class|Anchor|Detail class|Prototype|Requirement|Orphan|Behaviour|Behavior|Ref)$/i.test(cells[0])) continue;
    seen = true;
    rows.push(cells);
  }
  return rows;
}

function parseLedger(content) {
  const rows = rowsUnderHeading(content, /Evidence Ledger/i);
  const out = [];
  for (const cells of rows) {
    if (cells.length < 5) continue;
    const [id, statement, anchor, type, status] = cells.map(stripTicks);
    if (!/^L-\d+$/.test(id)) continue;
    out.push({ id, statement, anchor, type, status });
  }
  return out;
}

function parseInventory(content) {
  const rows = rowsUnderHeading(content, /Prototype Inventory/i);
  const out = [];
  for (const cells of rows) {
    if (cells.length < 5) continue;
    const [id, kind, name, anchor] = cells.map(stripTicks);
    if (!/^INV-\d+$/.test(id)) continue;
    out.push({ id, kind, name, anchor });
  }
  return out;
}

function parseReport(content) {
  const { data, body } = parseFrontmatter(content);
  const classRows = rowsUnderHeading(body, /Detail-class coverage/i);
  const classes = [];
  for (const cells of classRows) {
    if (cells.length < 3) continue;
    const [cls, evidence, status] = cells.map(stripTicks);
    if (!CLASSES.includes(cls)) continue;
    classes.push({ cls, evidence, status });
  }
  const deferralRows = rowsUnderHeading(body, /Orphan deferrals/i);
  const deferrals = [];
  for (const cells of deferralRows) {
    if (cells.length < 4) continue;
    const [anchor, owner, date, reason] = cells.map(stripTicks);
    if (!anchor || anchor === '—' || !owner || !date) continue;
    deferrals.push({ anchor, owner, date, reason });
  }
  return { frontmatter: data, classes, deferrals };
}

// ---------------------------------------------------------------------------
// Metrics + gates
// ---------------------------------------------------------------------------
function computeMetrics(root, inventoryPath, requirementsPath) {
  const inventory = parseInventory(fs.readFileSync(inventoryPath, 'utf8'));
  const ledger = parseLedger(fs.readFileSync(requirementsPath, 'utf8'));

  const ghosts = [];
  const ledgerAnchors = new Set();
  let resolvable = 0;
  let openCount = 0;
  let deferredCount = 0;

  for (const row of ledger) {
    if (row.status === OPEN) { openCount++; continue; }
    if (row.status === DEFERRED) deferredCount++;
    if (!row.anchor || row.anchor === '—') {
      ghosts.push({ id: row.id, anchor: row.anchor, reason: 'non-[OPEN] row has no anchor' });
      continue;
    }
    ledgerAnchors.add(row.anchor);
    const res = resolveAnchor(root, row.anchor);
    if (res.ok) resolvable++;
    else ghosts.push({ id: row.id, anchor: row.anchor, reason: res.reason });
  }

  const orphans = inventory.filter((r) => !ledgerAnchors.has(r.anchor));
  const grounding = resolvable + ghosts.length > 0 ? resolvable / (resolvable + ghosts.length) : 1;

  return {
    inventory,
    ledger,
    ghosts,
    orphans,
    open: openCount,
    deferred: deferredCount,
    grounding,
    resolvable,
    ledgerAnchors,
  };
}

function evaluateClassCoverage(root, report, ledger) {
  const problems = [];
  const seen = new Set();
  for (const row of report.classes) {
    seen.add(row.cls);
    if (/^N\/A/i.test(row.status)) {
      const reason = row.status.replace(/^N\/A\s*[:\-—]?\s*/i, '');
      if (!reason) problems.push(`${row.cls}: N/A without reason`);
      continue;
    }
    if (!/covered/i.test(row.status)) {
      problems.push(`${row.cls}: status must be "covered" or "N/A: reason" (got "${row.status}")`);
      continue;
    }
    const ledgerIds = [...row.evidence.matchAll(/L-\d+/g)].map((m) => m[0]);
    const anchors = [...row.evidence.matchAll(/[A-Za-z0-9._/-]+#[A-Za-z][A-Za-z0-9._:-]*/g)].map((m) => m[0]);
    if (ledgerIds.length === 0 && anchors.length === 0) {
      problems.push(`${row.cls}: covered without evidence refs`);
      continue;
    }
    for (const id of ledgerIds) {
      const led = ledger.find((l) => l.id === id);
      if (!led) { problems.push(`${row.cls}: evidence ${id} not in ledger`); continue; }
      if (led.status === OPEN) { problems.push(`${row.cls}: evidence ${id} is [OPEN]`); continue; }
      const res = resolveAnchor(root, led.anchor);
      if (!res.ok) problems.push(`${row.cls}: evidence ${id} anchor unresolved (${res.reason})`);
    }
    for (const a of anchors) {
      const res = resolveAnchor(root, a);
      if (!res.ok) problems.push(`${row.cls}: evidence anchor unresolved (${res.reason})`);
    }
  }
  const missing = CLASSES.filter((c) => !seen.has(c));
  for (const c of missing) problems.push(`${c}: missing from the class table`);
  return problems;
}

/**
 * Do two anchor strings point at the same thing?
 *
 * 1. If both name an `INV-NN`, that IS the identity — compare it. This is the path that matters:
 *    an inventory row and its deferral row are the same target written in two documents.
 * 2. Otherwise normalise: drop any directory prefix, drop a trailing parenthetical annotation,
 *    and compare the fragment. Case-insensitive, because file paths and ids vary.
 */
function sameTarget(a, b, bId) {
  const idOf = (s) => (String(s || '').match(/\bINV-\d+\b/) || [])[0] || null;
  const ia = idOf(a);
  // The inventory row's identity is its ID, not its anchor. Passing only the anchor meant the
  // id comparison could never fire on one side, so reconciliation silently fell through to the
  // string path — which is the failure this whole function exists to fix.
  const ib = idOf(b) || bId || null;
  if (ia && ib) return ia === ib;

  const norm = (s) => String(s || '')
    .trim()
    .replace(/\s*\([A-Z]+-\d+\)\s*$/, '')        // trailing (INV-01) annotation
    .replace(/^.*\//, '')                           // directory prefix
    .replace(/^`|`$/g, '')
    .toLowerCase();
  return norm(a) !== '' && norm(a) === norm(b);
}

function evaluateDeferrals(report) {
  const problems = [];
  const bad = report.deferrals.filter((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !d.owner);
  for (const d of bad) problems.push(`orphan deferral needs owner + YYYY-MM-DD date: ${d.anchor}`);
  return problems;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function printMetrics(m, opts) {
  const lines = [];
  lines.push(`spec_parity check${opts.root !== process.cwd() ? ` (root: ${opts.root})` : ''}`);
  lines.push(`  inventory rows : ${m.inventory.length}`);
  lines.push(`  ledger rows    : ${m.ledger.length} (${m.resolvable} resolvable, ${m.deferred} deferred, ${m.open} [OPEN])`);
  lines.push(`  ghosts         : ${m.ghosts.length} (gate: 0)`);
  for (const g of m.ghosts) lines.push(`      ghost ${g.id}: ${g.anchor} — ${g.reason}`);
  lines.push(`  orphans        : ${m.orphans.length} (gate: 0 or owner+date deferral)`);
  for (const o of m.orphans) lines.push(`      orphan ${o.id}: ${o.anchor}`);
  lines.push(`  grounding rate : ${(m.grounding * 100).toFixed(1)}% (gate: 100% of non-[OPEN])`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
function cmdCheck(args) {
  const root = path.resolve(args.root || process.cwd());
  const inventoryPath = path.resolve(root, args.inventory || DEFAULTS.inventory);
  const requirementsPath = path.resolve(root, args.requirements || DEFAULTS.requirements);
  const reportPath = path.resolve(root, args.report || DEFAULTS.report);

  if (!fs.existsSync(inventoryPath)) {
    console.error(`spec_parity: inventory not found: ${path.relative(root, inventoryPath)}`);
    process.exit(2);
  }
  if (!fs.existsSync(requirementsPath)) {
    console.error(`spec_parity: requirements not found: ${path.relative(root, requirementsPath)}`);
    process.exit(2);
  }

  const m = computeMetrics(root, inventoryPath, requirementsPath);
  const violations = [];

  // A HOLLOW PASS. This gate's entire job is reconciling the prototype inventory against the
  // Evidence Ledger. With zero inventory rows there is nothing to reconcile: `orphans: []` is
  // vacuous, `deferrals: N` is credited against a document the gate never read, and every other
  // number in the output is arithmetically valid and substantively empty.
  //
  // Measured: a blind run reached `pass: true` with `inventory: 0`, `orphans: []`, and
  // `deferrals: 28` — and named the pass hollow itself. Nothing here caught it. A gate that
  // reports success because it read nothing is the worst failure mode this repo has: it converts
  // an unread input into a green checkmark, and the green checkmark is the only evidence a
  // reader gets.
  //
  // The previous behaviour also made the failure unrecoverable-by-accident: an inventory the
  // parser cannot read (a renamed heading, a malformed anchor column) is indistinguishable from
  // an inventory that does not exist.
  if (m.inventory.length === 0) {
    violations.push(
      `inventory rows: 0 — the gate read no prototype inventory, so every reconciliation below is ` +
        `vacuous (orphans cannot exist, and deferrals are credited against a document that was ` +
        `never read). Check that ${path.relative(root, inventoryPath)} exists and its table is ` +
        `under a heading this parser recognises ("Prototype Inventory"). A hollow pass is worse ` +
        `than a failure: it is a green result with nothing behind it.`
    );
  }
  if (m.ledger.length === 0) {
    violations.push(
      `ledger rows: 0 — no Evidence Ledger rows were read, so nothing can be grounded, traced, ` +
        `or called an orphan. This gate cannot pass on an empty ledger.`
    );
  }

  if (m.ghosts.length > 0) violations.push(`${m.ghosts.length} ghost statement(s) — gate is 0`);
  if (m.grounding < 1) violations.push(`grounding ${(m.grounding * 100).toFixed(1)}% — gate is 100% of non-[OPEN]`);

  let report = null;
  let unresolvedOrphans = m.orphans;
  if (fs.existsSync(reportPath)) {
    report = parseReport(fs.readFileSync(reportPath, 'utf8'));
    // Reconcile orphans against deferrals BY IDENTITY, not by raw string.
    //
    // `d.anchor === o.anchor` never matched in practice. Measured on a real reverse-mode
    // artifact: the deferral recorded
    //   `artifacts/input/prototype/prototype.html#Tasks</h1>` (INV-01)
    // while the inventory row carried
    //   `prototype.html#Tasks</h1>`
    // — a path-prefix difference AND a trailing `(INV-NN)` annotation. So a deferral with an
    // owner and a date, written exactly as the template asks, did not defer anything, and the
    // gate reported 28 orphans against 28 present deferrals.
    //
    // That is the punish-honesty pattern this repo keeps hitting: the gate failed a correct
    // document because its two halves spelled the same target differently. `INV-NN` is the
    // identity; the anchor is a locator. Compare identities, and normalise anchors only as a
    // fallback for rows that carry no id.
    unresolvedOrphans = m.orphans.filter((o) => !report.deferrals.some((d) => sameTarget(d.anchor, o.anchor, o.id)));
    violations.push(...evaluateDeferrals(report));
    violations.push(...evaluateClassCoverage(root, report, m.ledger));
  } else if (!args['metrics-only']) {
    violations.push(`parity report missing: ${path.relative(root, reportPath)} — class coverage gate cannot pass`);
  }

  if (unresolvedOrphans.length > 0) {
    violations.push(`${unresolvedOrphans.length} orphan behavior(s) with no ledger statement or deferral`);
  }

  const summary = {
    root,
    inventory: m.inventory.length,
    ledger: m.ledger.length,
    resolvable: m.resolvable,
    deferred: m.deferred,
    open: m.open,
    ghosts: m.ghosts.map((g) => g.id),
    orphans: m.orphans.map((o) => o.id),
    // Both counts, always together. Reporting `orphans: 28` beside `pass: true` with nothing
    // saying how many were deferred reads as 28 unresolved problems — the reader has no way to
    // tell a reconciled 28 from an unreconciled 28. The contract is "orphans 0-or-deferred", so
    // print the two numbers that make it checkable.
    orphansDeferred: m.orphans.length - unresolvedOrphans.length,
    unresolvedOrphans: unresolvedOrphans.map((o) => o.id),
    grounding: m.grounding,
    classes: report ? report.classes.length : 0,
    deferrals: report ? report.deferrals.length : 0,
    violations,
    pass: violations.length === 0,
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(printMetrics(m, { root }));
    if (violations.length === 0) {
      console.log('spec_parity: PASS — ghosts 0, orphans 0-or-deferred, grounding 100%, classes 10/10');
    } else {
      for (const v of violations) console.error(`  ✗ ${v}`);
    }
  }

  process.exit(violations.length === 0 ? 0 : 1);
}

function updateFrontmatter(data, body, updates) {
  const merged = { ...data, ...updates };
  return serializeFrontmatter(merged, body);
}

function cmdBaselineStamp(args) {
  const root = path.resolve(args.root || process.cwd());
  const reportPath = path.resolve(root, args.report || DEFAULTS.report);
  if (!fs.existsSync(reportPath)) {
    console.error(`spec_parity: parity report not found: ${path.relative(root, reportPath)}`);
    process.exit(2);
  }
  const content = fs.readFileSync(reportPath, 'utf8');
  const { data, body } = parseFrontmatter(content);

  const prototype = args.prototype ? String(args.prototype) : data.prototype;
  const inventory = args.inventory ? String(args.inventory) : data.inventory;
  if (!prototype) {
    console.error('spec_parity: prototype path/pointer missing (frontmatter or --prototype)');
    process.exit(2);
  }

  const now = args.now || new Date().toISOString();
  const prototypeFile = path.resolve(root, prototype);
  const updates = { prototype, frozen: now };

  if (fs.existsSync(prototypeFile)) {
    updates.prototype_type = 'file';
    updates.prototype_sha256 = sha256File(prototypeFile);
    if (inventory) updates.inventory = inventory;
  } else {
    if (!inventory) {
      console.error('spec_parity: non-file prototype requires --inventory (snapshot hash target)');
      process.exit(2);
    }
    updates.prototype_type = 'non-file';
    updates.source_pointer = args.pointer ? String(args.pointer) : prototype;
    updates.access_timestamp = now;
    updates.inventory_snapshot_sha256 = sha256File(path.resolve(root, inventory));
  }

  fs.writeFileSync(reportPath, updateFrontmatter(data, body, updates));
  const out = { report: path.relative(root, reportPath), updated: updates };
  if (args.json) console.log(JSON.stringify(out, null, 2));
  else console.log(`spec_parity: baseline hash stamped in ${path.relative(root, reportPath)} (${updates.prototype_type})`);
  process.exit(0);
}

function cmdBaselineCheck(args) {
  const root = path.resolve(args.root || process.cwd());
  const reportPath = path.resolve(root, args.report || DEFAULTS.report);

  const result = { report: path.relative(root, reportPath), baseline: 'absent', ok: true, reason: null };

  if (!fs.existsSync(reportPath)) {
    // No report = never frozen: nothing can be stale. A deleted report after a
    // freeze is visible in the scope-lock audit evidence (step_tracker route).
    result.baseline = 'absent';
  } else {
    const { data } = parseFrontmatter(fs.readFileSync(reportPath, 'utf8'));
    const prototype = data.prototype;
    const type = data.prototype_type || (prototype && fs.existsSync(path.resolve(root, prototype)) ? 'file' : 'non-file');
    if (!prototype) {
      result.ok = false;
      result.baseline = 'missing';
      result.reason = 'parity-report.md has no prototype pointer';
    } else if (type === 'file') {
      const file = path.resolve(root, prototype);
      if (!fs.existsSync(file)) {
        result.ok = false; result.baseline = 'broken'; result.reason = `prototype file missing: ${prototype}`;
      } else if (!data.prototype_sha256) {
        result.ok = false; result.baseline = 'missing'; result.reason = 'no prototype_sha256 baseline hash stamped';
      } else {
        const current = sha256File(file);
        if (current !== data.prototype_sha256) {
          result.ok = false; result.baseline = 'stale';
          result.reason = 'prototype hash differs from the recorded baseline hash — run the step-05d Spike Rollback (or restore the frozen prototype)';
          result.expected = data.prototype_sha256;
          result.actual = current;
        } else {
          result.baseline = 'fresh';
        }
      }
    } else {
      const inventory = data.inventory;
      if (!inventory || !fs.existsSync(path.resolve(root, inventory))) {
        result.ok = false; result.baseline = 'broken'; result.reason = `inventory missing: ${inventory || '(unset)'}`;
      } else if (!data.inventory_snapshot_sha256) {
        result.ok = false; result.baseline = 'missing'; result.reason = 'no inventory_snapshot_sha256 baseline hash stamped';
      } else {
        const current = sha256File(path.resolve(root, inventory));
        if (current !== data.inventory_snapshot_sha256) {
          result.ok = false; result.baseline = 'stale';
          result.reason = 'inventory snapshot hash differs from the recorded baseline hash (non-file prototype — honestly weaker)';
          result.expected = data.inventory_snapshot_sha256;
          result.actual = current;
        } else {
          result.baseline = 'fresh';
        }
      }
    }
  }

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else if (result.ok) console.log(`spec_parity: baseline hash ${result.baseline} (${result.report})`);
  else console.error(`spec_parity: baseline hash ${result.baseline} — ${result.reason}`);

  process.exit(result.ok ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
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

function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (sub === 'check') return cmdCheck(args);
  if (sub === 'baseline') {
    const action = rest[0];
    const baselineArgs = parseArgs(rest.slice(1));
    if (action === 'stamp') return cmdBaselineStamp(baselineArgs);
    if (action === 'check') return cmdBaselineCheck(baselineArgs);
    console.error('spec_parity: baseline requires "stamp" or "check"');
    process.exit(2);
  }
  console.error('Usage:\n  node spec_parity.js check [--inventory P] [--requirements P] [--report P] [--root R] [--json] [--metrics-only]\n  node spec_parity.js baseline stamp [--report P] [--prototype P] [--inventory P] [--pointer URL] [--now ISO]\n  node spec_parity.js baseline check [--report P] [--inventory P] [--root R] [--json]');
  process.exit(2);
}

if (require.main === module) main();

module.exports = { resolveAnchor, parseLedger, parseInventory, parseReport, parseFrontmatter, computeMetrics, ANCHOR_RE, CLASSES };
