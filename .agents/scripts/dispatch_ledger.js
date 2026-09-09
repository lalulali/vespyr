#!/usr/bin/env node
/**
 * Dispatch Ledger — attribution for subagent fan-out (round-table synthesis, turn 10)
 *
 * Problem: token spend on the subagent path is harness-side invisible, but
 * "which agents were called and what they did" IS observable by the
 * dispatcher. This ledger records per-dispatch attribution rows so gates and
 * reports can answer causality (who ran, on what, with what outcome) while
 * spend stays honestly flagged unknown.
 *
 * Doctrine (panel-converged):
 * - One append-only store: artifacts/telemetry/dispatches-YYYY-MM-DD.ndjson.
 *   No second ledgers (summons stays a raw counter; spans stay OTel).
 * - Writer = the dispatcher, writing at completion with final outcome.
 *   Retries are COUNTED on the single row (--attempt N), never re-rowed.
 * - outcome is a closed enum; free text is rejected at write.
 * - Cost/token columns do not exist here. Every row carries machine-readable
 *   blindness flags (tokens_unknown/cost_unknown); spend aggregation over
 *   flagged rows is REFUSED, not zero-filled (see rollupUsage).
 * - Anti-forgery minimum: writer_id + ts + parent trace linkage on every row.
 * - Empty window FAILS verify (zero signal never passes — P0-3 doctrine).
 *
 * Usage:
 *   node dispatch_ledger.js record --writer <id> --agent <a> --task "<t>" --outcome <enum> [--dispatch <id>] [--attempt N] [--phase <p>] [--parent-trace <id>] [--parent-span <id>] [--artifact <path>] [--session <id>] [--context-bytes N]
 *   node dispatch_ledger.js consume --dispatch <id> --consumer <label> [--artifact <path>]
 *   node dispatch_ledger.js verify [--days N] [--expect N]
 *   node dispatch_ledger.js summary [--days N]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TELEMETRY_DIR = path.join(process.cwd(), 'artifacts', 'telemetry');
const OUTCOMES = ['success', 'error', 'timeout', 'rejected_by_gate', 'cancelled'];

function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16));
}

function ensureDir() {
  try {
    if (!fs.existsSync(TELEMETRY_DIR)) fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  } catch (e) { /* created on write attempt; write errors surface via return values */ }
}

function ledgerFile(dateStr) {
  const d = dateStr || new Date().toISOString().split('T')[0];
  return path.join(TELEMETRY_DIR, `dispatches-${d}.ndjson`);
}

/**
 * Validate a dispatch row. Returns { valid, errors[] }.
 * Missing required field = invalid; free-text outcome = invalid;
 * flags inconsistent with usage block = invalid.
 */
function validateRow(row) {
  const errors = [];
  if (!row || typeof row !== 'object') return { valid: false, errors: ['row must be an object'] };
  if (row.type !== 'dispatch') errors.push('type must be "dispatch"');
  if (typeof row.dispatch_id !== 'string' || !row.dispatch_id) errors.push('dispatch_id required');
  if (typeof row.ts !== 'string' || Number.isNaN(Date.parse(row.ts))) errors.push('ts must be a date-time string');
  if (typeof row.writer_id !== 'string' || !row.writer_id) errors.push('writer_id required (anti-forgery)');
  if (typeof row.agent !== 'string' || !row.agent) errors.push('agent required');
  if (typeof row.task !== 'string' || !row.task) errors.push('task required');
  if (!OUTCOMES.includes(row.outcome)) errors.push(`outcome must be one of ${OUTCOMES.join('|')} (free text rejected)`);
  if (!Number.isInteger(row.attempt_count) || row.attempt_count < 1) errors.push('attempt_count must be an integer >= 1');
  if (typeof row.tokens_unknown !== 'boolean') errors.push('tokens_unknown flag required');
  if (typeof row.cost_unknown !== 'boolean') errors.push('cost_unknown flag required');
  // Proxy drift metric (round-table turn 12): optional context_bytes at dispatch
  // time — sum is monotonic with spend for trend alarms, never dollars.
  if (row.context_bytes !== undefined && row.context_bytes !== null && (!Number.isInteger(row.context_bytes) || row.context_bytes < 0)) {
    errors.push('context_bytes must be an integer >= 0');
  }
  if (row.artifact_path !== undefined && row.artifact_path !== null && typeof row.artifact_path !== 'string') errors.push('artifact_path must be string or null');
  if (row.usage !== undefined && row.usage !== null) {
    const u = row.usage;
    const exact = typeof u.prompt_tokens === 'number' && typeof u.completion_tokens === 'number' && u.estimated === false;
    if (exact && (row.tokens_unknown !== false || row.cost_unknown !== false)) {
      errors.push('exact usage present but blindness flags not false — flags must match the block');
    }
    if (!exact && (row.tokens_unknown !== true || row.cost_unknown !== true)) {
      errors.push('non-exact usage requires tokens_unknown:true and cost_unknown:true');
    }
  } else if (row.tokens_unknown !== true || row.cost_unknown !== true) {
    errors.push('rows without a usage block must carry tokens_unknown:true and cost_unknown:true');
  }
  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [] };
}

function validateConsumption(row) {
  const errors = [];
  if (!row || typeof row !== 'object') return { valid: false, errors: ['row must be an object'] };
  if (row.type !== 'consumption') errors.push('type must be "consumption"');
  if (typeof row.dispatch_id !== 'string' || !row.dispatch_id) errors.push('dispatch_id required (must reference a dispatch row)');
  if (typeof row.consumer !== 'string' || !row.consumer) errors.push('consumer required');
  if (typeof row.ts !== 'string' || Number.isNaN(Date.parse(row.ts))) errors.push('ts must be a date-time string');
  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [] };
}

/**
 * Record one dispatch row. Exactly-once per dispatch_id: a second record
 * with the same id is REFUSED (DUPLICATE_DISPATCH_ID) — retries increment
 * attempt_count on the single completion row via --attempt.
 */
function recordDispatch(opts) {
  ensureDir();
  const row = {
    type: 'dispatch',
    dispatch_id: opts.dispatch_id || generateId(),
    ts: new Date().toISOString(),
    writer_id: opts.writer_id,
    session_id: opts.session_id || null,
    parent_trace_id: opts.parent_trace_id || null,
    parent_span_id: opts.parent_span_id || null,
    agent: opts.agent,
    task: opts.task,
    phase: opts.phase || null,
    outcome: opts.outcome,
    attempt_count: opts.attempt_count != null ? opts.attempt_count : 1,
    artifact_path: opts.artifact_path !== undefined ? opts.artifact_path : null,
    tokens_unknown: opts.tokens_unknown !== undefined ? opts.tokens_unknown : true,
    cost_unknown: opts.cost_unknown !== undefined ? opts.cost_unknown : true,
    usage: opts.usage !== undefined ? opts.usage : null,
    context_bytes: opts.context_bytes !== undefined ? opts.context_bytes : null,
  };
  const v = validateRow(row);
  if (!v.valid) return { ok: false, error: v.errors.join('; ') };
  // Exactly-once: refuse second row for the same dispatch_id (all shards).
  const existing = readRows(365).rows.some((r) => r.type === 'dispatch' && r.dispatch_id === row.dispatch_id);
  if (existing) return { ok: false, error: `DUPLICATE_DISPATCH_ID: ${row.dispatch_id} already recorded (count retries via attempt_count)` };
  try {
    fs.appendFileSync(ledgerFile(), JSON.stringify(row) + '\n');
  } catch (e) {
    return { ok: false, error: `write failed: ${e.message}` };
  }
  return { ok: true, row };
}

/** Link a downstream consumer to a dispatch row's artifact ("did it matter"). */
function recordConsumption(opts) {
  ensureDir();
  const row = { type: 'consumption', ts: new Date().toISOString(), dispatch_id: opts.dispatch_id, consumer: opts.consumer, artifact_path: opts.artifact_path || null };
  const v = validateConsumption(row);
  if (!v.valid) return { ok: false, error: v.errors.join('; ') };
  const known = readRows(365).rows.some((r) => r.type === 'dispatch' && r.dispatch_id === row.dispatch_id);
  if (!known) return { ok: false, error: `UNKNOWN_DISPATCH: ${row.dispatch_id} has no dispatch row` };
  try {
    fs.appendFileSync(ledgerFile(), JSON.stringify(row) + '\n');
  } catch (e) {
    return { ok: false, error: `write failed: ${e.message}` };
  }
  return { ok: true, row };
}

function readRows(days = 30) {
  const rows = [];
  const corrupt = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const file = ledgerFile(d.toISOString().split('T')[0]);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        rows.push(JSON.parse(line));
      } catch (e) {
        corrupt.push(line.slice(0, 80));
      }
    }
  }
  // NOTE: returns a pair so verify can report corrupt lines honestly.
  return { rows, corrupt };
}

/**
 * Verify the ledger window. Fails closed: empty window fails; invalid rows,
 * duplicate dispatch_ids, dangling consumption refs, or count below --expect
 * all fail. Exit 0 only on a clean, non-empty, fully-valid window.
 */
function verifyLedger(days = 30, expect = null) {
  const { rows, corrupt } = readRows(days);
  const dispatches = rows.filter((r) => r.type === 'dispatch');
  if (dispatches.length === 0) {
    return { total: 0, valid: 0, invalid: 0, duplicates: 0, dangling: 0, corrupt: corrupt.length, pass: false, reason: 'no dispatch rows in window — gate FAILS (empty window is zero signal)' };
  }
  let valid = 0;
  const invalid = [];
  const seen = new Set();
  const dupes = new Set();
  for (const r of dispatches) {
    const v = validateRow(r);
    if (v.valid) valid++;
    else invalid.push({ dispatch_id: r.dispatch_id || null, errors: v.errors });
    if (r.dispatch_id) {
      if (seen.has(r.dispatch_id)) dupes.add(r.dispatch_id);
      seen.add(r.dispatch_id);
    }
  }
  const dangling = rows.filter((r) => r.type === 'consumption' && !seen.has(r.dispatch_id)).length;
  const missing = expect != null ? Math.max(0, expect - dispatches.length) : 0;
  const pass = invalid.length === 0 && dupes.size === 0 && dangling === 0 && corrupt.length === 0 && missing === 0;
  const reason = pass ? 'pass'
    : invalid.length ? `INVALID rows present (${invalid.length})`
    : dupes.size ? `DUPLICATE_DISPATCH_ID present (${[...dupes].join(',')})`
    : dangling ? `dangling consumption refs present (${dangling})`
    : corrupt.length ? `corrupt lines present (${corrupt.length})`
    : `MISSING_ATTRIBUTION: expected ${expect}, found ${dispatches.length}`;
  return { total: dispatches.length, valid, invalid: invalid.length, duplicates: dupes.size, dangling, corrupt: corrupt.length, missing, pass, reason, invalid_detail: invalid };
}

/**
 * Spend rollup that REFUSES flagged rows instead of zero-filling them.
 * Throws when any input row carries cost_unknown:true — callers must filter
 * to exact rows first. A total that silently drops unknowns is a lie.
 */
function rollupUsage(rows) {
  const blind = rows.filter((r) => r.cost_unknown !== false);
  if (blind.length) throw new Error(`REFUSED: ${blind.length} row(s) carry cost_unknown:true — filter to exact rows before aggregating spend`);
  return rows.reduce((sum, r) => sum + (r.usage && typeof r.usage.total_tokens === 'number' ? r.usage.total_tokens : 0), 0);
}

/** Attribution summary: who ran what, outcome split, orphan-artifact rate. */
function summarizeLedger(days = 30) {
  const { rows } = readRows(days);
  const dispatches = rows.filter((r) => r.type === 'dispatch');
  const consumed = new Set(rows.filter((r) => r.type === 'consumption').map((r) => r.dispatch_id));
  const by_agent = {};
  const by_outcome = {};
  let with_artifact = 0;
  let orphaned = 0;
  // Proxy drift decomposition (Nova): volume × unit. Total is monotonic with
  // spend for trend alarms; unit isolates context inflation from fan-out.
  // Rows without context_bytes are counted in volume, excluded from unit.
  let proxy_total = 0;
  let proxy_rows = 0;
  for (const r of dispatches) {
    by_agent[r.agent] = (by_agent[r.agent] || 0) + 1;
    by_outcome[r.outcome] = (by_outcome[r.outcome] || 0) + 1;
    if (typeof r.context_bytes === 'number') {
      proxy_total += r.context_bytes;
      proxy_rows++;
    }
    if (r.artifact_path) {
      with_artifact++;
      if (!consumed.has(r.dispatch_id)) orphaned++;
    }
  }
  return {
    total_dispatches: dispatches.length,
    by_agent,
    by_outcome,
    artifacts_produced: with_artifact,
    orphan_artifacts: orphaned,
    orphan_rate: with_artifact ? Number((orphaned / with_artifact).toFixed(3)) : null,
    proxy_bytes_total: proxy_rows ? proxy_total : null,
    proxy_unit_mean: proxy_rows ? Math.round(proxy_total / proxy_rows) : null,
    proxy_coverage: dispatches.length ? Number((proxy_rows / dispatches.length).toFixed(3)) : null,
  };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node dispatch_ledger.js record --writer <id> --agent <a> --task "<t>" --outcome <success|error|timeout|rejected_by_gate|cancelled> [--dispatch <id>] [--attempt N] [--phase <p>] [--parent-trace <id>] [--parent-span <id>] [--artifact <path>] [--session <id>]
  node dispatch_ledger.js consume --dispatch <id> --consumer <label> [--artifact <path>]
  node dispatch_ledger.js verify [--days N] [--expect N]
  node dispatch_ledger.js summary [--days N]`);
    process.exit(0);
  }
  const cmd = args[0];
  const flags = {};
  const valued = new Set(['--writer', '--agent', '--task', '--outcome', '--dispatch', '--attempt', '--phase', '--parent-trace', '--parent-span', '--artifact', '--session', '--consumer', '--days', '--expect', '--context-bytes']);
  for (let i = 1; i < args.length;) {
    if (!valued.has(args[i])) { console.error(`Unknown flag: ${args[i]}`); process.exit(1); }
    const v = args[i + 1];
    if (v === undefined || (typeof v === 'string' && v.startsWith('--'))) { console.error(`Missing value for ${args[i]}`); process.exit(1); }
    flags[args[i]] = v;
    i += 2;
  }
  if (cmd === 'record') {
    for (const f of ['--writer', '--agent', '--task', '--outcome']) {
      if (flags[f] == null) { console.error(`Missing required flag: ${f}`); process.exit(1); }
    }
    let attempt = 1;
    if (flags['--attempt'] != null) {
      attempt = parseInt(flags['--attempt'], 10);
      if (!Number.isInteger(attempt) || attempt < 1) { console.error('Invalid --attempt (integer >= 1)'); process.exit(1); }
    }
    let contextBytes = undefined;
    if (flags['--context-bytes'] != null) {
      contextBytes = parseInt(flags['--context-bytes'], 10);
      if (!Number.isInteger(contextBytes) || contextBytes < 0) { console.error('Invalid --context-bytes (integer >= 0)'); process.exit(1); }
    }
    const r = recordDispatch({
      writer_id: flags['--writer'], agent: flags['--agent'], task: flags['--task'], outcome: flags['--outcome'],
      dispatch_id: flags['--dispatch'] || undefined, attempt_count: attempt, phase: flags['--phase'] || undefined,
      parent_trace_id: flags['--parent-trace'] || undefined, parent_span_id: flags['--parent-span'] || undefined,
      artifact_path: flags['--artifact'] || undefined, session_id: flags['--session'] || undefined,
      context_bytes: contextBytes,
    });
    console.log(JSON.stringify(r.ok ? { ok: true, dispatch_id: r.row.dispatch_id } : { ok: false, error: r.error }, null, 2));
    process.exit(r.ok ? 0 : 2);
  }
  if (cmd === 'consume') {
    for (const f of ['--dispatch', '--consumer']) {
      if (flags[f] == null) { console.error(`Missing required flag: ${f}`); process.exit(1); }
    }
    const r = recordConsumption({ dispatch_id: flags['--dispatch'], consumer: flags['--consumer'], artifact_path: flags['--artifact'] || undefined });
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 2);
  }
  if (cmd === 'verify') {
    const days = flags['--days'] != null ? parseInt(flags['--days'], 10) || 30 : 30;
    const expect = flags['--expect'] != null ? parseInt(flags['--expect'], 10) : null;
    if (flags['--expect'] != null && (!Number.isInteger(expect) || expect < 0)) { console.error('Invalid --expect (integer >= 0)'); process.exit(1); }
    const v = verifyLedger(days, expect);
    console.log(JSON.stringify(v, null, 2));
    process.exit(v.pass ? 0 : 2);
  }
  if (cmd === 'summary') {
    const days = flags['--days'] != null ? parseInt(flags['--days'], 10) || 30 : 30;
    console.log(JSON.stringify(summarizeLedger(days), null, 2));
    return;
  }
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

if (require.main === module) main();

module.exports = { recordDispatch, recordConsumption, validateRow, validateConsumption, verifyLedger, summarizeLedger, rollupUsage, readRows, OUTCOMES };
