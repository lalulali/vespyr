#!/usr/bin/env node
/**
 * collision_detector.js — Concurrent-writer detection for Vespyr memory (02o.4)
 *
 * Reads the memory-write ledger (.agents/state/memory-write-ledger.jsonl —
 * one line per successful memory_write.js, appended under the memory lock)
 * and flags any shared memory file written by MORE THAN ONE session id
 * inside the detection window. That interleaving pattern is the signature
 * of the 2026-08-28 parallel-window collision.
 *
 * Standalone by design (gate-review Grant-b): drift_monitor.js is a
 * security-engineer-owned at-rest hash aggregate with a fail-closed exit
 * contract — grafting behavioral detection into it was rejected.
 *
 * Usage:
 *   node collision_detector.js [--window-min 10] [--json] [--strict]
 *
 * Exit codes: 0 = no collisions; 1 = collisions detected (or --strict with
 * warnings); telemetry hook: emits `memory_collision` events for 02l spans.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const LEDGER = path.join(process.cwd(), '.agents', 'state', 'memory-write-ledger.jsonl');
const EVENTS_DIR = path.join(process.cwd(), 'artifacts', 'telemetry');

function readLedger() {
  try {
    return fs.readFileSync(LEDGER, 'utf8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function detect(windowMin) {
  const entries = readLedger();
  const now = Date.now();
  const windowMs = windowMin * 60 * 1000;
  const byFile = new Map();
  for (const e of entries) {
    if (!e.file || !e.session_id || !e.ts) continue;
    const ts = Date.parse(e.ts);
    if (Number.isNaN(ts) || now - ts > windowMs) continue;
    if (!byFile.has(e.file)) byFile.set(e.file, new Map());
    const sessions = byFile.get(e.file);
    const n = sessions.get(e.session_id) || 0;
    sessions.set(e.session_id, n + 1);
  }
  const collisions = [];
  for (const [file, sessions] of byFile) {
    if (sessions.size > 1) {
      collisions.push({
        file,
        window_minutes: windowMin,
        sessions: [...sessions.entries()].map(([session_id, writes]) => ({ session_id, writes })),
        detected_at: new Date().toISOString()
      });
    }
  }
  return collisions;
}

function emitTelemetry(collisions) {
  if (collisions.length === 0) return;
  try {
    fs.mkdirSync(EVENTS_DIR, { recursive: true });
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const f = path.join(EVENTS_DIR, `events-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.ndjson`);
    for (const c of collisions) {
      fs.appendFileSync(f, JSON.stringify({
        event: 'memory_collision',
        ts: c.detected_at,
        file: c.file,
        sessions: c.sessions,
        window_minutes: c.window_minutes
      }) + '\n', 'utf8');
    }
  } catch { /* telemetry must never block detection reporting */ }
}

function main() {
  const args = process.argv.slice(2);
  let windowMin = 10, json = false, strict = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--window-min') windowMin = parseInt(args[i + 1], 10) || 10;
    if (args[i] === '--json') json = true;
    if (args[i] === '--strict') strict = true;
  }

  const collisions = detect(windowMin);
  emitTelemetry(collisions);

  if (json) {
    console.log(JSON.stringify({ collisions, window_minutes: windowMin }, null, 2));
  } else if (collisions.length === 0) {
    console.log(`✓ no concurrent-writer collisions in the last ${windowMin} min`);
  } else {
    console.error(`⚠️  ${collisions.length} concurrent-writer collision(s) in the last ${windowMin} min:`);
    for (const c of collisions) {
      const ids = c.sessions.map(s => `${s.session_id} (×${s.writes})`).join(', ');
      console.error(`  - ${c.file}: ${ids}`);
    }
    console.error('Multiple sessions wrote the same memory file inside the window. Serialize the windows or use a git worktree per session.');
  }
  process.exit(collisions.length > 0 ? 1 : (strict ? 0 : 0));
}

if (require.main === module) main();
module.exports = { detect, readLedger };
