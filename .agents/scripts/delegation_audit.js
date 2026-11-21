#!/usr/bin/env node
/**
 * delegation_audit.js — weekly delegation audit (F2.21).
 *
 * Reads the append-only `.agents/state/delegation-log.ndjson` written by the
 * delegation hooks (F2.1: pre:bash:delegation / pre:edit:delegation). Each line
 * is one event:
 *   { ts, agent, tool, args, justification, delegated: false }   direct I/O
 *   { ts, agent, mechanism, task, delegated: true }              subagent spawn
 *
 * Per-agent delegated/direct counts and rate are computed from explicit
 * `delegated` booleans only — no delegation count is fabricated on harnesses
 * without subagent telemetry. Agents below `--fail-below` are flagged. Legacy
 * `.json` / `.jsonl` logs and session-summary mentions remain as lower-
 * confidence fallbacks so existing installs do not go blind during migration.
 *
 * Usage:
 *   node delegation_audit.js [--since 7d] [--fail-below 50] [--json]
 * Exit 0 = no flagged agents (or no data). Exit 1 = agents below threshold.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LOG_CANDIDATES = [
  path.join(ROOT, '.agents', 'state', 'delegation-log.ndjson'),
  path.join(ROOT, '.agents', 'state', 'delegation-log.jsonl'),
  path.join(ROOT, '.agents', 'state', 'delegation-log.json'),
  path.join(ROOT, 'artifacts', 'state', 'delegation-log.ndjson'),
  path.join(ROOT, 'artifacts', 'state', 'delegation-log.jsonl'),
  path.join(ROOT, 'artifacts', 'state', 'delegation-log.json'),
];
const SESSION_DIR = path.join(ROOT, 'artifacts', 'memory', 'session-summaries');
const AGENT_DIR = path.join(ROOT, '.agents', 'agents');
const DELEGATION_HANDLES = ['@memory-controller'];
const MAX_LOG_BYTES = 10 * 1024 * 1024; // rotate at ~10MB; tail-read by the audit
const JUSTIFICATION_RATE_LIMIT = 80;    // 01b R20a abuse detection
const MIN_DIRECT_FOR_ABUSE = 5;

function agentRoster() {
  if (!fs.existsSync(AGENT_DIR)) return [];
  return fs.readdirSync(AGENT_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'memory-controller.md')
    .map((f) => f.slice(0, -3))
    .sort();
}

function findLog() {
  return LOG_CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

/** Tail-read so a rotated-but-untrimmed log cannot exhaust memory. */
function tailRead(file) {
  const size = fs.statSync(file).size;
  if (size <= MAX_LOG_BYTES) return fs.readFileSync(file, 'utf8');
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(MAX_LOG_BYTES);
    fs.readSync(fd, buf, 0, MAX_LOG_BYTES, size - MAX_LOG_BYTES);
    return buf.toString('utf8').split('\n').slice(1).join('\n');
  } finally {
    fs.closeSync(fd);
  }
}

function parseDate(value) {
  if (!value) return null;
  const m = String(value).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function readRecords(logPath) {
  if (logPath.endsWith('.json')) {
    try {
      const data = JSON.parse(tailRead(logPath));
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.records)) return data.records;
      return [];
    } catch (e) {
      return null; // corrupt legacy log
    }
  }

  const records = [];
  for (const line of tailRead(logPath).split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === 'object') records.push(obj);
    } catch (e) {
      // skip corrupt lines; never fabricate a record from them
    }
  }
  return records;
}

function inWindow(rec, cutoffDate) {
  const date = parseDate(rec.ts || rec.timestamp || rec.date || rec.created_at || rec.createdAt);
  return date !== null && date >= cutoffDate;
}

function newRow(agent) {
  return {
    agent,
    delegated: 0,
    direct: 0,
    total: 0,
    rate: null,
    justified: 0,
    justification_rate: null,
    has_data: false,
    below_threshold: false,
    justification_abuse: false,
    last_date: null,
  };
}

function summarize(records, roster, days, failBelow) {
  const rows = new Map(roster.map((a) => [a, newRow(a)]));
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  for (const rec of records) {
    const agent = String(rec.agent || '').replace(/^@+/, '');
    if (!agent) continue;
    if (!inWindow(rec, cutoff)) continue;
    let row = rows.get(agent);
    if (!row) {
      row = newRow(agent);
      rows.set(agent, row);
    }
    row.has_data = true;
    row.total++;
    if (rec.delegated === true) row.delegated++;
    else row.direct++; // legacy justification records are direct I/O by definition
    if (String(rec.justification || '').trim()) row.justified++;
    const date = parseDate(rec.ts || rec.timestamp || rec.date || rec.created_at);
    if (date && (!row.last_date || date > row.last_date)) row.last_date = date;
  }

  const result = [...rows.values()];
  for (const row of result) {
    if (row.total > 0) {
      row.rate = Math.round((row.delegated / row.total) * 1000) / 10;
      row.justification_rate = Math.round((row.justified / Math.max(1, row.direct)) * 1000) / 10;
      row.below_threshold = row.rate < failBelow;
      row.justification_abuse = row.direct >= MIN_DIRECT_FOR_ABUSE && row.justification_rate > JUSTIFICATION_RATE_LIMIT;
    }
  }
  return result.sort((a, b) => b.total - a.total || a.agent.localeCompare(b.agent));
}

/** Legacy fallback: scan session summaries for @memory-controller mentions. */
function scanSessionSummaries(days) {
  const files = [path.join(SESSION_DIR, 'history.md'), path.join(SESSION_DIR, 'latest.md')]
    .filter((p) => fs.existsSync(p));
  if (files.length === 0) return null;

  const roster = new Set(agentRoster());
  const rows = new Map();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  let currentAgent = null;
  let currentDate = null;
  let lines = [];
  const flush = () => {
    if (!currentAgent) return;
    const agent = String(currentAgent).replace(/^@+/, '');
    if (!roster.has(agent)) return;
    if (currentDate && currentDate < cutoff) return;
    const mentions = DELEGATION_HANDLES.filter((h) => lines.join('\n').includes(h)).length;
    if (mentions === 0) return;
    const row = rows.get(agent) || newRow(agent);
    row.has_data = true;
    row.delegated += 1;
    row.total += 1;
    row.last_date = currentDate || row.last_date;
    rows.set(agent, row);
  };

  for (const file of files) {
    currentAgent = null;
    currentDate = null;
    lines = [];
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^##\s+\[(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?\]\s+Agent:\s*(@+[A-Za-z0-9_-]+)/);
      if (m) {
        flush();
        currentDate = m[1];
        currentAgent = m[2];
        lines = [line];
      } else if (currentAgent) {
        lines.push(line);
      }
    }
    flush();
  }

  const result = [...rows.values()];
  for (const row of result) row.rate = 100; // mentions count as delegated; no direct data
  return result.length > 0 ? result : null;
}

function report(rows, source, days, failBelow, useJson) {
  const flagged = (rows || []).filter((r) => r.below_threshold || r.justification_abuse);
  const summary = {
    generated: new Date().toISOString().slice(0, 10),
    period: `last ${days} days`,
    source,
    fail_below: failBelow,
    agent_count: (rows || []).length,
    flagged: flagged.map((r) => r.agent),
    agents: rows || [],
  };

  if (useJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Delegation Audit — ${summary.period}`);
  console.log(`Source: ${source}`);
  console.log(`Threshold: ${failBelow}% delegated`);
  console.log('');
  if (!rows || rows.length === 0) {
    console.log('No delegation records found. Nothing to report — no count is fabricated.');
    return;
  }
  console.log('Agent                    Delegated  Direct    Rate  Justif%  Last date  Flag');
  console.log('------------------------ ---------  ------   -----  -------  ---------  ----');
  for (const r of rows) {
    const flags = [r.below_threshold ? 'LOW-RATE' : '', r.justification_abuse ? 'JUSTIFY-ABUSE' : ''].filter(Boolean).join(',') || '—';
    console.log(
      r.agent.padEnd(24) +
      String(r.delegated).padStart(10) +
      String(r.direct).padStart(8) +
      String(r.rate === null ? '—' : r.rate + '%').padStart(7) +
      String(r.justification_rate === null ? '—' : r.justification_rate + '%').padStart(9) +
      '  ' + (r.last_date || '—').padEnd(10) +
      '  ' + flags
    );
  }
  console.log('');
  console.log(`${rows.length} agent(s) reported; ${flagged.length} flagged.`);
  return;
}

function parseArgs(argv) {
  const args = { since: 7, failBelow: 50, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--since') args.since = parseInt(String(argv[++i]).replace(/\D/g, ''), 10) || 7;
    else if (a === '--fail-below') args.failBelow = Number(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node delegation_audit.js [--since 7d] [--fail-below 50] [--json]

Reads .agents/state/delegation-log.ndjson (append-only, tail-read at ~10MB).
Per-agent delegated/direct counts and rate; flags agents below --fail-below.
Agent roster is derived from .agents/agents/*.md, never hardcoded.
Exit 1 when any agent is below threshold or has an implausible justification rate.`);
    process.exit(0);
  }

  const roster = agentRoster();
  const logPath = findLog();
  let rows = null;
  let source = 'no delegation data';

  if (logPath) {
    const records = readRecords(logPath);
    if (records !== null) {
      rows = summarize(records, roster, args.since, args.failBelow);
      source = `delegation log: ${path.relative(ROOT, logPath)} (append-only)`;
    } else {
      source = `delegation log UNREADABLE: ${path.relative(ROOT, logPath)}`;
    }
  }

  if (!rows || rows.every((r) => !r.has_data)) {
    const fallback = scanSessionSummaries(args.since);
    if (fallback) {
      rows = fallback;
      source = 'session summaries (lower confidence — no direct-I/O data)';
    } else {
      rows = roster.map((a) => newRow(a));
      source = logPath
        ? `delegation log present but empty: ${path.relative(ROOT, logPath)}`
        : 'no delegation log exists yet';
    }
  }

  report(rows, source, args.since, args.failBelow, args.json);
  const flagged = rows.filter((r) => r.below_threshold || r.justification_abuse);
  process.exit(flagged.length > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = {
  agentRoster,
  findLog,
  readRecords,
  summarize,
  scanSessionSummaries,
  report,
  parseArgs,
  LOG_CANDIDATES,
};
