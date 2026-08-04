#!/usr/bin/env node
/**
 * delegation_audit.js — Weekly Delegation Summary for Vespyr
 *
 * Reports per-agent delegation activity for the last 7 days. Reads the
 * documented delegation log convention first (delegation-policy.md:
 * `state/delegation-log.json` — the justification log for direct-I/O
 * overrides), then falls back to scanning session summaries for delegation
 * sub-agent mentions. Exits 0 with an honest message when no data exists.
 *
 * Usage:
 *   node delegation_audit.js [--json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// Candidate log locations for the delegation log convention.
// delegation-policy.md:37 logs justifications to `state/delegation-log.json`;
// .agents/state/ is the canonical state dir (see loop-state.json on :27).
const LOG_CANDIDATES = [
  path.join(ROOT, '.agents', 'state', 'delegation-log.json'),
  path.join(ROOT, '.agents', 'state', 'delegation-log.jsonl'),
  path.join(ROOT, 'artifacts', 'state', 'delegation-log.json'),
  path.join(ROOT, 'artifacts', 'state', 'delegation-log.jsonl')
];

const SESSION_DIR = path.join(ROOT, 'artifacts', 'memory', 'session-summaries');

// Sub-agent handles that count as delegation targets
const DELEGATION_HANDLES = ['@reader', '@writer', '@executor', '@memory-controller'];

function findLog() {
  return LOG_CANDIDATES.find(p => fs.existsSync(p)) || null;
}

function parseDate(value) {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function readRecords(logPath) {
  const content = fs.readFileSync(logPath, 'utf8').trim();
  if (!content) return [];

  if (logPath.endsWith('.jsonl')) {
    const records = [];
    for (const line of content.split('\n')) {
      const s = line.trim();
      if (!s) continue;
      try {
        const obj = JSON.parse(s);
        if (obj && typeof obj === 'object') records.push(obj);
      } catch (e) {
        // skip corrupt lines
      }
    }
    return records;
  }

  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.records)) return data.records;
    return [];
  } catch (e) {
    return null; // corrupt log
  }
}

function summarizeRecords(records, now) {
  const perAgent = {};
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const rec of records) {
    const agent = (rec.agent || '').replace(/^@+/, '');
    if (!agent) continue;
    const date = parseDate(rec.timestamp || rec.date || rec.created_at || rec.createdAt);
    if (!perAgent[agent]) {
      perAgent[agent] = { agent, weekly: 0, total: 0, last_date: null };
    }
    perAgent[agent].total++;
    if (date) {
      if (date >= weekAgo) perAgent[agent].weekly++;
      if (!perAgent[agent].last_date || date > perAgent[agent].last_date) {
        perAgent[agent].last_date = date;
      }
    }
  }
  return Object.values(perAgent).sort((a, b) => b.total - a.total);
}

function scanSessionSummaries(now) {
  const historyPath = path.join(SESSION_DIR, 'history.md');
  const latestPath = path.join(SESSION_DIR, 'latest.md');
  const files = [historyPath, latestPath].filter(p => fs.existsSync(p));
  if (files.length === 0) return null;

  const perAgent = {};
  let currentAgent = null;
  let currentDate = null;
  let currentLines = [];

  const flush = () => {
    if (!currentAgent) return;
    const agent = currentAgent.replace(/^@+/, '');
    if (!perAgent[agent]) {
      perAgent[agent] = { agent, weekly: 0, total: 0, last_date: null };
    }
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const body = currentLines.join('\n');
    const mentions = DELEGATION_HANDLES.filter(h => body.includes(h)).length;
    const record = mentions > 0 ? 1 : 0; // entry counts once if it delegated
    perAgent[agent].total += record;
    if (record > 0 && currentDate) {
      if (currentDate >= weekAgo) perAgent[agent].weekly++;
      if (!perAgent[agent].last_date || currentDate > perAgent[agent].last_date) {
        perAgent[agent].last_date = currentDate;
      }
    }
  };

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    currentAgent = null;
    currentDate = null;
    currentLines = [];
    for (const line of content.split('\n')) {
      const entryMatch = line.match(/^##\s+\[(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?\]\s+Agent:\s*(@+[A-Za-z0-9_-]+)/);
      if (entryMatch) {
        flush();
        currentDate = entryMatch[1];
        currentAgent = entryMatch[2];
        currentLines = [line];
      } else if (currentAgent) {
        currentLines.push(line);
      }
    }
    flush();
  }

  const rows = Object.values(perAgent).filter(r => r.total > 0);
  return rows.length > 0 ? rows.sort((a, b) => b.total - a.total) : null;
}

function printReport(rows, source, now, useJson) {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const summary = {
    generated: now.toISOString().split('T')[0],
    period: `last 7 days (since ${weekAgo})`,
    source,
    agents: rows || []
  };

  if (useJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Delegation Audit — ${summary.period}`);
  console.log(`Source: ${source}`);
  console.log('');
  if (!rows || rows.length === 0) {
    console.log('No delegation records found yet. Delegation is tracked via');
    console.log('`[DIRECT-IO-JUSTIFIED: ...]` overrides logged to state/delegation-log.json');
    console.log('and sub-agent mentions in session summaries. Nothing to report.');
    return;
  }
  console.log('Agent                    Weekly  Total   Last date');
  console.log('------------------------ ------  ------  ----------');
  for (const r of rows) {
    console.log(
      r.agent.padEnd(24) +
      String(r.weekly).padStart(7) +
      String(r.total).padStart(8) +
      '  ' + (r.last_date || '—')
    );
  }
  console.log('');
  console.log(`${rows.length} agent(s) with delegation activity.`);
}

function main() {
  const args = process.argv.slice(2);
  const useJson = args.includes('--json');
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage:
  node delegation_audit.js [--json]

Reads state/delegation-log.json (or .jsonl) for per-agent delegation records;
falls back to scanning artifacts/memory/session-summaries/ for delegation
sub-agent mentions. Reports the weekly summary per agent and exits 0.`);
    process.exit(0);
  }

  const now = new Date();
  const logPath = findLog();

  if (logPath) {
    const records = readRecords(logPath);
    if (records === null) {
      printReport(null, `delegation log (unreadable): ${logPath}`, now, useJson);
      process.exit(0);
    }
    const rows = summarizeRecords(records, now);
    printReport(rows, `delegation log: ${path.relative(ROOT, logPath)}`, now, useJson);
    process.exit(0);
  }

  const rows = scanSessionSummaries(now);
  printReport(rows, 'session summaries (no delegation log exists yet)', now, useJson);
  process.exit(0);
}

main();
