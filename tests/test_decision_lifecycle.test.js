/**
 * Decision lifecycle: a finished decision becomes a lesson, exactly once, at a session
 * boundary.
 *
 * WHY THE MECHANISM HAS TWO SEPARATE PATHS.
 *
 *   compactActiveDecisions()  — "is this entry still worth LOADING?" Age-based, moves to
 *                               the cold archive.
 *   flushDecisionsToLessons() — "is this entry still a DECISION?" Completion-based, moves
 *                               to lessons-learned.md, WHICH IS LOADED EVERY SESSION.
 *
 * Conflating them would push aged entries into the always-loaded file and make
 * lessons-learned the next thing to bloat. So the flush fires only on explicit completion,
 * never on age.
 *
 * WHY NOTHING IS GUESSED. Domain similarity was measured and rejected: five of one
 * session's verdict-gate decisions shared the DECISION domain while several remained
 * independently binding, so "a newer entry exists in the same domain" would have retired
 * live constraints. Domain overlap is REPORTED as a candidate and never moved.
 *
 * THE SIGNAL DID NOT EXIST. Measured 0 of 120 historical entries — and 0 of the 7
 * surviving — carried a resolvable status, so every status-driven path ever built fired on
 * nothing. One entry was titled "RESOLVED: …" while its Status field read `active`, a
 * record contradicting itself. Hence `--resolve` and `--supersedes`: without them the
 * flush is dead code.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const MW = path.join(ROOT, '.agents/scripts/memory_write.js');
const ORCH = path.join(ROOT, '.agents/scripts/orchestrator_state.js');

function run(script, cwd, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd });
}

function fixture(entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-flush-'));
  fs.mkdirSync(path.join(dir, 'artifacts', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts', 'output'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.agents', 'state'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/memory/active-decisions.md'),
    '# Active Decisions\n\nCritical active design choices.\n\n---\n\n' + entries.join('\n---\n\n') + '\n');
  fs.writeFileSync(path.join(dir, 'artifacts/memory/lessons-learned.md'), '# Lessons Learned\n');
  return dir;
}

const ent = (domain, title, opts = {}) => {
  const lines = [`### [${domain}] ${title} [date: ${opts.date || '2026-10-05'}] [agent: @tester]`];
  lines.push(opts.body || `Body for ${title}.`);
  if (opts.supersedes) lines.push(`**Supersedes:** ${opts.supersedes}`);
  lines.push(`**Status:** ${opts.status || 'active'}`);
  lines.push(`**Session:** seed`);
  return lines.join('\n');
};

const active = (dir) => fs.readFileSync(path.join(dir, 'artifacts/memory/active-decisions.md'), 'utf8');
const lessons = (dir) => fs.readFileSync(path.join(dir, 'artifacts/memory/lessons-learned.md'), 'utf8');
const count = (t) => t.split('\n').filter((l) => l.startsWith('### ')).length;

// --- A. completion-signalled ---

test('a resolved decision is translated into a lesson and leaves active-decisions', () => {
  const dir = fixture([
    ent('DECISION', 'Still binding constraint', { date: '2026-10-04' }),
    ent('DECISION', 'Finished work', { date: '2026-10-04', status: 'resolved' }),
  ]);
  try {
    const r = run(ORCH, dir, ['flush-decisions']);
    assert.strictEqual(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.strictEqual(out.translated.length, 1);
    assert.strictEqual(out.activeAfter, 1);
    assert.ok(active(dir).includes('Still binding constraint'), 'the ACTIVE decision must survive');
    assert.ok(!active(dir).includes('Finished work'), 'the resolved one leaves');
    assert.ok(lessons(dir).includes('Finished work'), 'and lands in lessons');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the translated entry is reframed as a decision that produced a lesson', () => {
  const dir = fixture([ent('DECISION', 'Shipped the gate', { status: 'resolved' })]);
  try {
    run(ORCH, dir, ['flush-decisions']);
    const l = lessons(dir);
    assert.match(l, /\[LESSON\] Shipped the gate/, 'domain becomes LESSON');
    assert.match(l, /\*\*Decision:\*\*/, 'it records what the decision was');
    assert.match(l, /Originally a \[DECISION\] entry/, 'and where it lived');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('an active decision is NEVER translated, however old it is', () => {
  // The age/flush separation. Age belongs to compaction -> archive; translation is
  // completion-only. Merging them would push aged entries into the always-loaded file.
  const dir = fixture([ent('DECISION', 'Ancient but still binding', { date: '2020-01-01', status: 'active' })]);
  try {
    const out = JSON.parse(run(ORCH, dir, ['flush-decisions']).stdout.trim().split('\n').pop());
    assert.strictEqual(out.translated.length, 0, 'age alone must not translate');
    assert.ok(active(dir).includes('Ancient but still binding'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the flush is idempotent — a second run translates nothing', () => {
  const dir = fixture([
    ent('DECISION', 'One done', { status: 'resolved' }),
    ent('DECISION', 'Two done', { status: 'resolved' }),
  ]);
  try {
    const first = JSON.parse(run(ORCH, dir, ['flush-decisions']).stdout.trim().split('\n').pop());
    assert.strictEqual(first.translated.length, 2);
    const after = lessons(dir);
    const second = JSON.parse(run(ORCH, dir, ['flush-decisions']).stdout.trim().split('\n').pop());
    assert.strictEqual(second.translated.length, 0, 'nothing left to translate');
    assert.strictEqual(lessons(dir), after, 'lessons must not gain a duplicate');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('dry-run reports what WOULD translate without touching either file', () => {
  // The first implementation populated `translated` only on the live path, so --dry-run
  // said 0 while it had found an entry — a report that understated the next real run.
  const dir = fixture([ent('DECISION', 'Pending move', { status: 'resolved' })]);
  try {
    const before = active(dir) + lessons(dir);
    const out = JSON.parse(run(ORCH, dir, ['flush-decisions', '--dry-run']).stdout.trim().split('\n').pop());
    assert.strictEqual(out.wouldTranslate, 1, 'dry-run must state the count');
    assert.strictEqual(out.pending.length, 1);
    assert.strictEqual(out.pending[0].reason, 'status resolved');
    assert.strictEqual(active(dir) + lessons(dir), before, 'nothing written');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// --- B. supersession ---

test('an entry another entry DECLARES it supersedes is translated', () => {
  const dir = fixture([
    ent('DECISION', 'Old rule', { date: '2026-10-01', body: 'Old rule body.' }),
    ent('DECISION', 'New rule', {
      date: '2026-10-05',
      supersedes: '[DECISION] Old rule [date: 2026-10-01] [agent: @tester]',
      body: 'Replaces it.'
    }),
  ]);
  try {
    const out = JSON.parse(run(ORCH, dir, ['flush-decisions']).stdout.trim().split('\n').pop());
    assert.strictEqual(out.translated.length, 1);
    assert.ok(lessons(dir).includes('Old rule'), 'the superseded entry becomes a lesson');
    assert.ok(active(dir).includes('New rule'), 'the replacement stays live');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('domain similarity alone produces a CANDIDATE and moves nothing', () => {
  // The rejected heuristic, kept as a report. Five of one session's decisions shared a
  // domain while several stayed independently binding.
  const dir = fixture([
    ent('DECISION', 'Older constraint', { date: '2026-10-01' }),
    ent('DECISION', 'Newer constraint', { date: '2026-10-05' }),
  ]);
  try {
    const out = JSON.parse(run(ORCH, dir, ['flush-decisions']).stdout.trim().split('\n').pop());
    assert.strictEqual(out.translated.length, 0, 'a domain guess must never move an entry');
    assert.ok(out.candidates.length >= 1, 'but it must be surfaced');
    const cand = out.candidates.find((c) => c.header.includes('Older constraint'));
    assert.ok(cand, 'the OLDER entry is the candidate — not the newer one');
    assert.strictEqual(cand.newer, 1);
    assert.ok(cand.promote_with.includes('--promote'), 'and it must say how to promote it');
    assert.strictEqual(count(active(dir)), 2, 'both entries untouched');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// --- the signals that make it fire at all ---

test('--resolve sets a Status on an entry that has none', () => {
  const bare = `### [PROCESS] Entry with no status field [date: 2026-10-05] [agent: @tester]\nBody.\n`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-resolve-'));
  try {
    fs.mkdirSync(path.join(dir, 'artifacts/memory'), { recursive: true });
    fs.mkdirSync(path.join(dir, '.agents', 'state'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'artifacts/memory/active-decisions.md'), '# Active Decisions\n\n' + bare);
    fs.writeFileSync(path.join(dir, 'artifacts/memory/lessons-learned.md'), '# Lessons\n');
    const r = run(MW, dir, ['--resolve', '--file', 'active-decisions.md',
      '--header', '[PROCESS] Entry with no status field', '--status', 'resolved']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(fs.readFileSync(path.join(dir, 'artifacts/memory/active-decisions.md'), 'utf8'),
      /\*\*Status:\*\* resolved/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('--resolve rejects an unknown status rather than writing it', () => {
  const dir = fixture([ent('DECISION', 'Some decision')]);
  try {
    const r = run(MW, dir, ['--resolve', '--file', 'active-decisions.md',
      '--header', '[DECISION] Some decision', '--status', 'mostly-done']);
    assert.strictEqual(r.status, 1, 'must refuse a status the flush would not understand');
    assert.match(active(dir), /\*\*Status:\*\* active/, 'and leave the entry alone');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('--supersedes records the link so the flush can find it', () => {
  const dir = fixture([ent('DECISION', 'Replacement rule', { date: '2026-10-05' })]);
  try {
    const r = run(MW, dir, ['--file', 'active-decisions.md', '--agent', '@tester',
      '--domain', 'DECISION', '--title', 'Newest rule',
      '--content', 'Body.',
      '--supersedes', '[DECISION] Replacement rule [date: 2026-10-05] [agent: @tester]']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(active(dir), /\*\*Supersedes:\*\*/, 'the declared link is written');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// --- routing advisory ---

test('a PROCESS entry in active-decisions warns but is still written', () => {
  // A warning, not a gate: "all memory writes go through memory_write.js" is a PROCESS
  // entry that genuinely IS a standing constraint. A hard block would fire on correct
  // entries — the same false-positive machine rejected on ZERO-CONSUMPTION.
  const dir = fixture([]);
  try {
    const r = run(MW, dir, ['--file', 'active-decisions.md', '--agent', '@tester',
      '--domain', 'PROCESS', '--title', 'Work record', '--content', 'Something done.']);
    assert.strictEqual(r.status, 0, 'must NOT block');
    assert.match(r.stderr, /routing/, 'must advise');
    assert.match(r.stderr, /lessons-learned/, 'and name the right file');
    assert.ok(active(dir).includes('Work record'), 'the write still lands');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a DECISION entry in active-decisions produces no advisory', () => {
  const dir = fixture([]);
  try {
    const r = run(MW, dir, ['--file', 'active-decisions.md', '--agent', '@tester',
      '--domain', 'DECISION', '--title', 'Standing rule', '--content', 'Binds future work.']);
    assert.strictEqual(r.status, 0);
    assert.ok(!/routing/.test(r.stderr), 'a genuine decision must not be nagged');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// --- the end-of-session hook ---

test('session-write runs the flush and reports it', () => {
  const dir = fixture([ent('DECISION', 'Done at session end', { status: 'resolved' })]);
  try {
    fs.writeFileSync(path.join(dir, 'artifacts/memory/project-context.md'),
      '# Project Context\n\n## [IDENTITY]\n- **User Nickname:** t\n');
    const r = run(ORCH, dir, ['session-write', '--agent', 'tester', '--worked-on', 'x']);
    assert.strictEqual(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.ok('decisions_flushed' in out, 'the flush result must be visible on the session summary');
    assert.ok(out.decisions_flushed && out.decisions_flushed.translated.length === 1,
      'the resolved entry should have been translated at the session boundary');
    assert.ok(lessons(dir).includes('Done at session end'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
