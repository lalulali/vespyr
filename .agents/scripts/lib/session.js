/**
 * lib/session.js — Session identity + derived latest.md (02o)
 *
 * Session identity (gate-review amended twice — execution note 2026-08-28):
 * a per-session id CANNOT come from pid (memory_write.js is a fresh process
 * per write), and a shared session-current.json would merge two PARALLEL
 * windows into one identity — exactly the hazard 02o exists to catch.
 * Resolution order:
 *   1. VESPYR_SESSION_ID env (harness-provided, explicit) — trusted ONLY if
 *      it matches the safe id shape (see VALID_SESSION_ID); an off-shape
 *      value falls through rather than forging attribution rows.
 *   2. `w-<hash(hostname:ppid)>` — stable per terminal/harness window,
 *      distinct per window, zero coordination (ppid = the harness process
 *      every script invocation from that window shares). This is a FALLBACK:
 *      forked-per-call harnesses mint multiple ids per real session, and two
 *      sessions sharing a ppid collapse to one id — set VESPYR_SESSION_ID to
 *      a unique-per-session token to get exact attribution (harness contract:
 *      GUARDRAILS "Parallel Session Protocol").
 * 'unattributed' only if both fail (practically never).
 *
 * latest.md is a DERIVED VIEW of append-only history.md — never a
 * hand-written second source of truth. regenerateLatest() rebuilds it from
 * the last history entry in the exact byte format orchestrator_state.js
 * historically wrote, so all readers (witness, session_checkpoint,
 * delegation_audit, compaction_guard, personas) keep parsing it unchanged.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { writeFileSync: atomicWriteFileSync } = require('./fs_atomic.js');

const STATE_DIR = path.join(process.cwd(), '.agents', 'state');
const SESSION_CURRENT = path.join(STATE_DIR, 'session-current.json');
const SESSION_DIR = path.join(process.cwd(), 'artifacts', 'memory', 'session-summaries');

function windowSessionId() {
  const h = crypto.createHash('sha1').update(`${os.hostname()}:${process.ppid}`).digest('hex');
  return `w-${h.slice(0, 12)}`;
}

// Harness contract: VESPYR_SESSION_ID must be a unique-per-session token of
// safe id chars only. It is interpolated raw into ledger rows and memory
// entries, so an unvalidated value (empty, whitespace, or newline-bearing)
// would forge attribution rows — the same injection class memory_write.js
// guards for --agent. Reject anything off-shape and fall through to the
// window id rather than trust it.
const VALID_SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function isValidSessionId(v) {
  return typeof v === 'string' && VALID_SESSION_ID.test(v);
}

/**
 * Resolve the session id and its source.
 * @returns {{ id: string, source: 'explicit'|'window-fallback'|'unattributed' }}
 */
function resolveSessionInfo() {
  const env = process.env.VESPYR_SESSION_ID;
  if (env !== undefined && isValidSessionId(env)) {
    return { id: env, source: 'explicit' };
  }
  try { return { id: windowSessionId(), source: 'window-fallback' }; } catch { /* fall through */ }
  return { id: 'unattributed', source: 'unattributed' };
}

function resolveSessionId() {
  return resolveSessionInfo().id;
}

/** Called once per session (session_start). Idempotent per agent call. */
function ensureSessionCurrent(agent) {
  try {
    const existing = JSON.parse(fs.readFileSync(SESSION_CURRENT, 'utf8'));
    if (existing && existing.session_id) return existing.session_id;
  } catch { /* create below */ }
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  atomicWriteFileSync(SESSION_CURRENT, JSON.stringify({
    session_id: id,
    agent: agent || null,
    started: new Date().toISOString()
  }, null, 2));
  return id;
}

function parseLastHistoryEntry(historyText) {
  if (!historyText) return null;
  const blocks = [];
  // Body ends at the next entry header or the true end of string. Do NOT use
  // `\n*$` here: under the `m` flag `$` matches before ANY newline, which
  // truncated the body to its first line and emptied latest.md fields
  // (harness-defects-2026-09-10.md D2).
  const re = /^## \[([0-9-]+ [0-9:]+)\] Agent: @([^\n]+)\n([\s\S]*?)(?=\n## \[[0-9-]+ [0-9:]+\] Agent: @|(?![\s\S]))/gm;
  let m;
  while ((m = re.exec(historyText)) !== null) {
    blocks.push({ date: m[1], agent: m[2].trim(), body: m[3] });
  }
  if (blocks.length === 0) return null;
  const last = blocks[blocks.length - 1];
  const field = (label) => {
    const fm = last.body.match(new RegExp(`^- ${label}: (.*)$`, 'm'));
    return fm ? fm[1].trim() : '';
  };
  const session = (last.body.match(/^- Session: (.*)$/m) || [])[1];
  return {
    date: last.date,
    agent: last.agent,
    workedOn: field('Worked on') || '(not specified)',
    decisions: field('Decisions') || 'none',
    nextStep: field('Next step') || '(not specified)',
    blockers: field('Blockers') || 'none',
    sessionId: session ? session.trim() : null
  };
}

function latestFromHistory() {
  let history = null;
  try { history = fs.readFileSync(path.join(SESSION_DIR, 'history.md'), 'utf8'); } catch { return null; }
  const e = parseLastHistoryEntry(history);
  if (!e) return null;
  return [
    `# Session Summary (latest)`,
    ``,
    `## Last Session`,
    `- **Date:** ${e.date}`,
    `- **Agent:** @${e.agent}`,
    `- **Worked on:** ${e.workedOn}`,
    `- **Decisions:** ${e.decisions}`,
    `- **Next step:** ${e.nextStep}`,
    `- **Blockers:** ${e.blockers}`,
    ``
  ].join('\n');
}

/** Rebuild latest.md from history.md. Caller is responsible for locking. */
function regenerateLatest() {
  const derived = latestFromHistory();
  if (derived === null) return false;
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  atomicWriteFileSync(path.join(SESSION_DIR, 'latest.md'), derived, 'utf8');
  return true;
}

module.exports = { resolveSessionId, resolveSessionInfo, isValidSessionId, windowSessionId, ensureSessionCurrent, regenerateLatest, latestFromHistory, parseLastHistoryEntry };
