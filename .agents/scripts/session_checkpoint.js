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
    const out = execSync('node .agents/scripts/orchestrator_state.js next', {
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

function writeCheckpoint({ event, agent, artifact = null, domain = null, next = null }) {
  if (!event || !agent) throw new Error('Missing event or agent');

  if (!fs.existsSync(CHECKPOINT_DIR)) fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });

  const phase = canonicalPhase();
  const blockers = activeBlockers();
  const activity = latestActivity();
  let nextAction = next || pipelineNext();

  const content = [
    '# Session Checkpoint',
    '',
    `**Updated:** ${nowStamp()} (auto-emitted by orchestrator_state.js)`,
    `**Event:** ${event}`,
    `**Agent:** @${agent}`,
    domain ? `**Domain:** ${domain}` : null,
    '',
    '## Current Cursor',
    `- **Phase:** ${phase || '(unknown)'}`,
    `- **Blockers:** ${blockers === null ? '?' : blockers}`,
    artifact ? `- **Artifact:** ${artifact}` : null,
    activity ? `- **Session Activity:** ${activity}` : null,
    '',
    '## Next Action',
    nextAction || '(none detected — check orchestrator_state.js next)',
    ''
  ].filter((l) => l !== null).join('\n');

  fs.writeFileSync(CHECKPOINT_FILE, content, 'utf8');
  return {
    file: 'session-checkpoints/checkpoint.md',
    event,
    agent,
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
