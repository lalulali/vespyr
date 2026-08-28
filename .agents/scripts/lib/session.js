/**
 * lib/session.js — Session identity + derived latest.md (02o)
 *
 * Session identity primitive (gate-review amended): a per-session id CANNOT
 * come from pid (memory_write.js is a fresh process per write). Resolution
 * order: VESPYR_SESSION_ID env → .agents/state/session-current.json →
 * 'unattributed'.
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
const { writeFileSync: atomicWriteFileSync } = require('./fs_atomic.js');

const STATE_DIR = path.join(process.cwd(), '.agents', 'state');
const SESSION_CURRENT = path.join(STATE_DIR, 'session-current.json');
const SESSION_DIR = path.join(process.cwd(), 'artifacts', 'memory', 'session-summaries');

function resolveSessionId() {
  if (process.env.VESPYR_SESSION_ID) return process.env.VESPYR_SESSION_ID;
  try {
    const j = JSON.parse(fs.readFileSync(SESSION_CURRENT, 'utf8'));
    if (j && j.session_id) return j.session_id;
  } catch { /* fall through */ }
  return 'unattributed';
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
  const re = /^## \[([0-9-]+ [0-9:]+)\] Agent: @([^\n]+)\n([\s\S]*?)(?=\n## \[|\n*$)/gm;
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

module.exports = { resolveSessionId, ensureSessionCurrent, regenerateLatest, latestFromHistory, parseLastHistoryEntry };
