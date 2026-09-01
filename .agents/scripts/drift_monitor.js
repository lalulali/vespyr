#!/usr/bin/env node
/**
 * drift_monitor.js — R47 Detection Stub (02f §14 / DoD #19)
 *
 * Hash-history drift monitor over the `.agents/` baseline: computes an
 * aggregate SHA-256 over every file under `.agents/` (manifest exclusions
 * apply), keeps a history in `artifacts/telemetry/drift-history.json`, and alerts
 * when the aggregate differs from the last recorded snapshot.
 *
 * DETECTION tripwire for at-rest drift (memory-poisoning persistence,
 * unreviewed tier promotion). It does not prevent writes; prevention lives
 * in write-time guards (F1.50) and security-scan.js.
 *
 * Usage:
 *   node drift_monitor.js              # check: exit 1 if drifted vs last snapshot
 *   node drift_monitor.js --record     # check, then refresh snapshot for next run
 *   node drift_monitor.js --init       # seed history from current state (exit 0)
 *
 * Exit codes:
 *   0 = no drift (or --init seeded)
 *   1 = drift detected (aggregate differs from last snapshot)
 *   2 = tool/environment failure (fail-closed)
 *
 * Owner: @security-engineer (Victor) per 02f §14 R47. Stub scope: single
 * snapshot chain; scheduled CI runs + diff alerts are Phase 2 hardening.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(ROOT, '.agents');
const TELEMETRY_DIR = path.join(ROOT, 'artifacts', 'telemetry');
const HISTORY_FILE = path.join(TELEMETRY_DIR, 'drift-history.json');
const MAX_HISTORY = 50;

// Same exclusion set as bin/cli.js's manifest walks (which also exclude
// top-level `state/` per ADR-006). The monitor's own history lives outside
// .agents/ (artifacts/telemetry/), so it never enters the aggregate.
const EXCLUSIONS = new Set(['.DS_Store', 'node_modules', '.git', 'manifest.json', '.vespyr-manifest.json']);

let faulted = false;
function failClosed(msg) {
  console.error(`FAIL-CLOSED: ${msg}`);
  process.exitCode = 2;
  faulted = true;
}

function walkAggregate(dir, hashes) {
  if (faulted) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    failClosed(`cannot read ${dir} (${e.code || e.message})`);
    return;
  }
  for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (EXCLUSIONS.has(ent.name)) continue;
    // ADR-006: only the top-level state/ dir is excluded (runtime-writable);
    // nested state-named entries must stay visible to the aggregate.
    if (dir === AGENTS_DIR && ent.name === 'state') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkAggregate(full, hashes);
    } else {
      try {
        const h = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
        hashes.push(`${path.relative(AGENTS_DIR, full)}:${h}`);
      } catch (e) {
        // F-7 parity: unreadable files are tool failures, never silent skips.
        failClosed(`cannot read ${full} (${e.code || e.message})`);
        return;
      }
    }
  }
}

function computeAggregate() {
  const hashes = [];
  walkAggregate(AGENTS_DIR, hashes);
  if (faulted) return null;
  // Baseline anchor must exist — same fail-closed rule as vespyr verify (N-12).
  if (!fs.existsSync(path.join(AGENTS_DIR, 'manifest.json'))) {
    failClosed(
      'baseline anchor .agents/manifest.json missing — run `vespyr manifest` and review the diff before initializing drift history'
    );
    return null;
  }
  return crypto.createHash('sha256').update(hashes.join('\n')).digest('hex');
}

function loadHistory() {
  try {
    const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    if (!Array.isArray(parsed.snapshots)) throw new Error('invalid schema');
    return parsed;
  } catch (e) {
    return { note: 'R47 drift history — maintained by drift_monitor.js (--init/--record)', snapshots: [] };
  }
}

function main() {
  const args = process.argv.slice(2);
  const init = args.includes('--init');
  const record = init || args.includes('--record');

  const aggregate = computeAggregate();
  if (aggregate === null) return;

  const history = loadHistory();
  const last = history.snapshots[history.snapshots.length - 1];

  if (init && history.snapshots.length > 0 && !args.includes('--force')) {
    failClosed('history already initialized — use --force to re-seed deliberately (human-reviewed re-baseline)');
    return;
  }

  if (last && last.aggregate !== aggregate && !init && !record) {
    console.log(`DRIFT DETECTED (R47): .agents/ aggregate changed since ${last.timestamp}.`);
    console.log(`  previous: ${last.aggregate}`);
    console.log(`  current:  ${aggregate}`);
    console.log('Action: run `node security-scan.js` + human-review diffs; re-record only after review (--record).');
    process.exitCode = 1;
    return;
  }

  // --record after drift = explicit operator acceptance of the reviewed state.
  if (last && last.aggregate !== aggregate && record) {
    console.log(`Drift acknowledged via --record: recording reviewed state (${aggregate.slice(0, 16)}…).`);
  }

  if (record) {
    fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    history.snapshots.push({ timestamp: new Date().toISOString(), aggregate });
    while (history.snapshots.length > MAX_HISTORY) history.snapshots.shift();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2) + '\n', 'utf8');
    console.log(init ? `R47 drift history initialized (${aggregate.slice(0, 16)}…)` : `R47 snapshot refreshed (${aggregate.slice(0, 16)}…)`);
    process.exitCode = 0;
    return;
  }

  if (!last) {
    console.log('R47 stub: no history yet — initialize with `node drift_monitor.js --init`.');
    process.exitCode = 0;
    return;
  }

  console.log(`R47 stub: no drift since ${last.timestamp} (aggregate ${aggregate.slice(0, 16)}…).`);
  process.exitCode = 0;
}

main();
