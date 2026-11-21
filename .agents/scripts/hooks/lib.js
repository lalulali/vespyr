#!/usr/bin/env node
/**
 * hooks/lib.js — shared runtime for the 13 Vespyr lifecycle hooks (F2.1–F2.5).
 *
 * Hook scripts are command hooks: they read one JSON event from stdin, act, and
 * communicate through exit codes + stdout/stderr. The same scripts are emitted
 * to Claude Code, Cursor, Copilot and OpenCode by their adapters; this module
 * normalizes the input field names those harnesses use.
 *
 * Fail-closed contract: any script that throws exits 2 (block), never a silent
 * pass. Non-blocking hooks still exit 2 on an internal crash.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const HOOKS_JSON = path.join(__dirname, '..', '..', 'hooks', 'hooks.json');
const MINIMAL_IDS = [
  'pre:bash:safety',
  'pre:bash:delegation',
  'pre:edit:delegation',
  'stop:session-end',
];

/** Pure function — fixture-testable (T-HOOK-1..3). */
function resolveActiveHooks(hooksJson, env = {}) {
  const all = Array.isArray(hooksJson) ? hooksJson : (hooksJson && hooksJson.hooks) || [];
  const ids = all.map((h) => h.id).filter(Boolean);
  const profile = env.VESPYR_HOOK_PROFILE || 'standard';
  const byProfile = profile === 'minimal'
    ? ids.filter((id) => MINIMAL_IDS.includes(id))
    : ids; // standard, strict, and unknown profiles all keep the full set

  const disabledRaw = env.VESPYR_DISABLED_HOOKS || '';
  const disabled = disabledRaw === '*'
    ? new Set(ids)
    : new Set(disabledRaw.split(',').map((s) => s.trim()).filter(Boolean));
  return byProfile.filter((id) => !disabled.has(id));
}

function blockOnWarnings(env = process.env) {
  return (env.VESPYR_HOOK_PROFILE || 'standard') === 'strict';
}

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(HOOKS_JSON, 'utf8'));
  } catch (e) {
    throw new Error(`Cannot read hook registry: ${e.message}`);
  }
}

function isActive(id, env = process.env) {
  return resolveActiveHooks(loadRegistry(), env).includes(id);
}

/** A disabled hook returns true from `skip()` so its script can exit 0 cheaply. */
function skip(id, env = process.env) {
  return !isActive(id, env);
}

function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    throw new Error(`Invalid hook input JSON: ${e.message}`);
  }
}

function rootOf(input) {
  return input.cwd || input.workspace_roots?.[0] || process.cwd();
}

function normalizeTool(input) {
  const name = String(input.tool_name || input.toolName || input.name || '');
  switch (name.toLowerCase()) {
    case 'bash': case 'shell': case 'powershell': return 'Bash';
    case 'write': case 'create': return 'Write';
    case 'edit': case 'str_replace_editor': case 'apply_patch': return 'Edit';
    default: return name;
  }
}

function commandOf(input) {
  return String(input.tool_input?.command || input.toolArgs?.command || input.tool_input?.cmd || '');
}

function filePathOf(input) {
  return String(
    input.tool_input?.file_path || input.tool_input?.filePath ||
    input.tool_input?.path || input.toolArgs?.filePath || input.toolArgs?.path || ''
  );
}

function agentOf(input) {
  return String(
    input.agent_type || input.agentType || input.agent_id || input.agentId ||
    input.subagent_type || input.subagentType || process.env.VESPYR_HOOK_AGENT || ''
  ).replace(/^@+/, '');
}

function isReasoningAgent(agent) {
  if (!agent) return false; // unknown harness signal — do not block on a guess
  if (agent === 'memory-controller') return false;
  return true;
}

function justificationOf(input) {
  const sources = [
    commandOf(input),
    String(input.tool_input?.content || ''),
    String(input.tool_input?.new_string || input.tool_input?.newStr || ''),
    String(input.prompt || input.user_prompt || ''),
  ];
  const joined = sources.join('\n');
  const m = joined.match(/\[DIRECT-IO-JUSTIFIED:\s*([^\]]+)\]/i);
  return m ? m[1].trim() : null;
}

function appendLog(root, rel, record) {
  const file = path.resolve(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n', 'utf8');
}

function activeInstinctIds(root) {
  const file = path.join(root, 'artifacts', 'memory', 'instincts.md');
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const ids = new Set();
  let inFence = false;
  let inDemoted = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^##\s+Demoted/i.test(line)) { inDemoted = true; continue; }
    if (/^##\s+/.test(line)) { inDemoted = false; continue; }
    if (inDemoted) continue;
    const m = line.match(/^###\s+\[(INS-\d+)\]/i);
    if (m) ids.add(m[1].toUpperCase());
  }
  return ids;
}

/** F2.15.a: Stop-hook scanner records [INSTINCT: INS-NNN] citations from assistant output only. */
function logInstinctCitations(input) {
  const text = String(
    input.last_assistant_message || input.lastAssistantMessage || input.response || ''
  );
  let ids = [...new Set((text.match(/\[INSTINCT:\s*(INS-\d+)\]/gi) || []).map((m) => m.match(/INS-\d+/i)[0].toUpperCase()))];
  const root = rootOf(input);
  const active = activeInstinctIds(root);
  if (active !== null) {
    ids = ids.filter((id) => active.has(id));
  }
  if (ids.length === 0) return [];
  let sessionId = input.session_id || input.conversation_id || process.env.VESPYR_SESSION_ID || null;
  if (!sessionId) {
    try { sessionId = require('../lib/session.js').resolveSessionId(); } catch {}
  }
  appendLog(root, '.agents/state/instinct-hits.json', {
    type: 'cite',
    agent: agentOf(input) || null,
    instinct_ids: ids,
    session_id: sessionId,
  });
  return ids;
}

function context(text) {
  process.stdout.write(text.endsWith('\n') ? text : text + '\n');
}

function warn(reason) {
  process.stderr.write(reason.endsWith('\n') ? reason : reason + '\n');
}

function block(reason) {
  warn(reason);
  process.exit(2);
}

/** Wrap a hook body so a crash is a blocking error (exit 2), never a pass. */
function failClosed(fn) {
  try {
    fn();
  } catch (e) {
    warn(`[HOOK-FAIL-CLOSED] ${e && e.message ? e.message : String(e)}`);
    process.exit(2);
  }
}

module.exports = {
  HOOKS_JSON,
  MINIMAL_IDS,
  resolveActiveHooks,
  blockOnWarnings,
  loadRegistry,
  isActive,
  skip,
  readInput,
  rootOf,
  normalizeTool,
  commandOf,
  filePathOf,
  agentOf,
  isReasoningAgent,
  justificationOf,
  appendLog,
  logInstinctCitations,
  context,
  warn,
  block,
  failClosed,
};
