#!/usr/bin/env node
/**
 * Session Checkpoint — rolling point-in-time cursor of an in-progress session.
 *
 * Unlike session-summaries/latest.md (a post-hoc wrap-up of an ENDED unit of
 * work), the checkpoint captures "where the cursor is RIGHT NOW" mid-loop.
 * It is auto-emitted by orchestrator_state.js at every state-changing
 * invocation (complete, session-start, session-write, set-phase, file-cr,
 * sync-context), so it stays fresh without requiring agent discipline.
 *
 * The file overwrites in place (bounded, ~150 tokens) so a long multi-turn
 * loop never accumulates noise — it is always just the latest cursor.
 *
 * Usage (CLI):
 *   node session_checkpoint.js --event {complete|session-start|...} \
 *     --agent {name} [--artifact {path}] [--domain {domain}] [--next {text}]
 */

const fs = require('fs');
const path = require('path');

const CHECKPOINT_FILE = path.join(process.cwd(), 'artifacts', 'memory', 'session-checkpoints', 'checkpoint.md');
const CHECKPOINT_DIR = path.dirname(CHECKPOINT_FILE);
const PIPELINE_STATE = path.join(process.cwd(), 'artifacts', 'output', 'pipeline-state.json');
const PROJECT_CONTEXT = path.join(process.cwd(), 'artifacts', 'memory', 'project-context.md');

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function canonicalPhase() {
  const raw = readFile(PIPELINE_STATE);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw);
    return state.current_phase || state.phase || null;
  } catch {
    return null;
  }
}

function activeBlockers() {
  const raw = readFile(PROJECT_CONTEXT);
  if (!raw) return null;
  const m = raw.match(/^Blockers:\s*(\d+)/m);
  return m ? parseInt(m[1], 10) : null;
}

function latestActivity() {
  const raw = readFile(PROJECT_CONTEXT);
  if (!raw) return null;
  const lines = raw.split('\n').filter((l) => /^-\s*\d{4}-\d{2}-\d{2}/.test(l.trim()));
  return lines[0] ? lines[0].trim() : null;
}

function pipelineNext() {
  // Best-effort: reuse the orchestrator's next-action command.
  const { execSync } = require('child_process');
  try {
    const out = execSync(`"${process.execPath}" .agents/scripts/orchestrator_state.js next`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000
    });
    const match = out.match(/Action needed:\s*([^\n]+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * @deprecated Deprecated by Epic 02i in Vespyr 2.0.7.
 * Designated artifacts/memory/session-summaries/latest.md as the single live cursor.
 */
function writeCheckpoint({ event, agent, artifact = null, domain = null, next = null } = {}) {
  const phase = canonicalPhase();
  const nextAction = next || pipelineNext();
  return {
    deprecated: true,
    file: 'session-summaries/latest.md',
    event: event || 'deprecated',
    agent: agent || 'unknown',
    phase: phase || null,
    next: nextAction
  };
}

module.exports = { writeCheckpoint };

if (require.main === module) {
  const args = process.argv.slice(2);
  const out = { event: null, agent: null, artifact: null, domain: null, next: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--event') out.event = args[i + 1];
    if (args[i] === '--agent') out.agent = args[i + 1];
    if (args[i] === '--artifact') out.artifact = args[i + 1];
    if (args[i] === '--domain') out.domain = args[i + 1];
    if (args[i] === '--next') out.next = args[i + 1];
  }
  try {
    const result = writeCheckpoint(out);
    console.log(JSON.stringify({ success: true, ...result }));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}
