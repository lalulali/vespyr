/**
 * Memory retention: history stays findable, the loaded file holds only recent decisions.
 *
 * THE DEFECT, measured on this repo. `compactActiveDecisions()` archived a section ONLY
 * when a human had hand-edited `**Status:**` to resolved/superseded/complete/stale. The
 * live file had 121 sections, 120 still `active`, and 0 ever resolved — so compaction
 * archived nothing, ever, and the file only grew. Measured 47,548 tokens, which wedged
 * `advance` and `set-phase` with OVER_BUDGET indefinitely, including a no-op switch to
 * the phase already current.
 *
 * The budget was also a bare `400` hardcoded in four places with no documented rationale,
 * so when it wedged nobody could tell whether to raise it or compact the file.
 *
 * THE MODEL. Nothing is deleted. An entry older than RETENTION_DAYS retires to
 * artifacts/memory/archive/ with its FULL original text plus an index.ndjson row, so
 * `/memory` still finds it. The loaded file keeps only recent decisions.
 *
 * The safety property that matters most: an UNDATED section is never auto-retired. If we
 * cannot date a decision we cannot claim it is stale, and guessing would silently drop a
 * live one. Those are counted in `undatedRetained` so the condition stays visible.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents/scripts/orchestrator_state.js');

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function section(title, date, status = 'active', body = 'Decision body text.') {
  return `### [DECISION] ${title} [date: ${date}] [agent: @tester]\n${body}\n**Status:** ${status}\n`;
}

function makeRepo(entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-mem-'));
  fs.mkdirSync(path.join(dir, 'artifacts/memory'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts/output'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'artifacts/memory/active-decisions.md'),
    '# Active Decisions\n\nCritical active design choices.\n\n---\n\n' + entries
  );
  return dir;
}

function compact(dir) {
  const res = spawnSync(process.execPath, [SCRIPT, 'compact'], { encoding: 'utf8', cwd: dir });
  assert.strictEqual(res.status, 0, (res.stdout || '') + (res.stderr || ''));
  return JSON.parse(res.stdout.trim().split('\n').pop());
}

function readActive(dir) {
  return fs.readFileSync(path.join(dir, 'artifacts/memory/active-decisions.md'), 'utf8');
}

function readArchive(dir) {
  const p = path.join(dir, 'artifacts/memory/archive');
  let text = '';
  for (const f of fs.existsSync(p) ? fs.readdirSync(p) : []) {
    if (f.endsWith('.md')) text += fs.readFileSync(path.join(p, f), 'utf8');
  }
  return text;
}

test('an old entry retires out of the loaded file and stays in the archive', () => {
  const dir = makeRepo(section('ancient decision', isoDaysAgo(90)));
  try {
    const r = compact(dir);
    assert.ok(r.archivedCount >= 1, 'a 90-day-old entry must retire without any human editing it');
    assert.strictEqual(readActive(dir).includes('ancient decision'), false,
      'it must leave the loaded file');
    assert.ok(readArchive(dir).includes('ancient decision'),
      'history stays findable: full text must survive in the archive');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a recent entry stays in the loaded file', () => {
  const dir = makeRepo(section('decision in flight', isoDaysAgo(1)));
  try {
    compact(dir);
    assert.ok(readActive(dir).includes('decision in flight'),
      'the decision being worked on right now must never be auto-retired');
    assert.strictEqual(readArchive(dir).includes('decision in flight'), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the aged entry keeps its FULL text, not just a stub', () => {
  const dir = makeRepo(section('old but detailed', isoDaysAgo(90), 'active', 'A long body with a number in it: 47,548 tokens were measured here.'));
  try {
    compact(dir);
    const archive = readArchive(dir);
    assert.ok(archive.includes('47,548 tokens were measured here'),
      'retirement is not summarisation — the archive must hold the original text');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('an UNDATED entry is never auto-retired', () => {
  // The safety property. We cannot claim an undated decision is stale, and guessing
  // would silently drop a live one.
  const dir = makeRepo('### [DECISION] no date on this header\nSome body.\n**Status:** active\n');
  try {
    const r = compact(dir);
    assert.ok(readActive(dir).includes('no date on this header'),
      'an undated section must stay — absence of a date is not evidence of staleness');
    assert.strictEqual(r.archivedCount, 0, 'nothing should have been archived');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a manually resolved entry still retires regardless of age', () => {
  // The pre-existing manual path must keep working — age retirement is additive, not a
  // replacement.
  const dir = makeRepo(section('freshly resolved', isoDaysAgo(1), 'resolved'));
  try {
    const r = compact(dir);
    assert.ok(r.archivedCount >= 1, '**Status:** resolved must still archive immediately');
    assert.ok(readArchive(dir).includes('freshly resolved'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('compaction is idempotent — a second run archives nothing further', () => {
  const dir = makeRepo(section('old', isoDaysAgo(90)) + section('new', isoDaysAgo(1)));
  try {
    const first = compact(dir);
    const afterFirst = readActive(dir);
    const second = compact(dir);
    assert.strictEqual(second.archivedCount, 0, 'nothing left to retire on a second pass');
    assert.strictEqual(readActive(dir), afterFirst, 'the file must be stable');
    assert.ok(first.archivedCount >= 1, 'precondition: the first pass did retire something');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the budget is a named constant, not a literal repeated at each call site', () => {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(/const ACTIVE_DECISIONS_TOKEN_BUDGET\s*=\s*\d+/.test(src),
    'the budget must be defined once, with a documented rationale');
  // No call site may re-hardcode a number: the old shape was `tokens <= 400` in the
  // check plus `budget: 400` in three error payloads, which is how they drifted apart.
  const literals = src.match(/budget:\s*\d+/g) || [];
  assert.deepStrictEqual(literals, [], `call sites must reference the constant, found: ${literals}`);
  assert.ok(!/tokens\s*<=\s*\d/.test(src), 'the budget check must reference the constant too');
});

test('advance reports the same budget the check uses', () => {
  // The reported budget and the enforced budget must be one number. They were 400 in
  // three payloads while the constant moved — a reader could not tell which was real.
  const src = fs.readFileSync(SCRIPT, 'utf8');
  const declared = Number(src.match(/const ACTIVE_DECISIONS_TOKEN_BUDGET\s*=\s*(\d+)/)[1]);
  const reported = [...src.matchAll(/budget:\s*ACTIVE_DECISIONS_TOKEN_BUDGET/g)].length;
  assert.strictEqual(reported, 2,
    'both the advance and set-phase error payloads must report the constant, not a literal');
  assert.ok(declared >= 2500,
    `budget was raised to 2500 by owner decision on 2026-10-05, found ${declared}`);
});

// --- 10. The budget is a REPORT, never a blocker (owner decision 2026-10-05) ---
// The gate used to exit 1 on ADVANCE_OVER_BUDGET / SET_PHASE_OVER_BUDGET. Measured
// 47,548 tokens against a 400 budget, and even keeping only the current day's entries
// measured ~7,770 — so the agent was told "you may not advance" while the only escape
// provably could not succeed. Permanent deadlock, no in-band recovery.
//
// The gate also never prevented bloat: nothing stopped a 40,000-token write, so the
// failure was merely deferred until work was finished and the board needed to move.
// And it coupled two unrelated questions — "is this phase's work done" (semantic) with
// "how big is the context" (cost).

function phaseRepo(over) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-phase-'));
  fs.mkdirSync(path.join(dir, 'artifacts/output'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts/memory'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/memory/project-context.md'), '# Project Context\n');
  // Deliberately OVER budget AFTER compaction. The entries must be RECENT (inside the
  // 30-day retention window) and individually large, so retention keeps them and the
  // budget is genuinely exceeded. An earlier version used 120/100/90-day-old entries,
  // which all aged straight out — the file ended up nearly empty, stayed under budget,
  // and the over-budget path was never exercised at all.
  // Sized from a measurement, not a guess: 'padding word ' x 220 across 3 entries
  // measured 1,413 tokens — UNDER the 2,500 budget. x600 measures ~3,850, which crosses
  // it. The first attempt at this fixture used stale-dated entries that all aged out,
  // and the second used x220 which simply was not big enough; both passed for the wrong
  // reason. A fixture that does not actually violate the invariant tests nothing.
  const big = 'padding word '.repeat(600);
  fs.writeFileSync(
    path.join(dir, 'artifacts/memory/active-decisions.md'),
    '# Active Decisions\n\n---\n\n' +
    section('recent heavy one', isoDaysAgo(1), 'active', big) +
    section('recent heavy two', isoDaysAgo(2), 'active', big) +
    section('recent heavy three', isoDaysAgo(3), 'active', big)
  );
  fs.writeFileSync(path.join(dir, 'artifacts/output/pipeline-state.json'), JSON.stringify({
    project: { name: 'test', type: 'test' },
    created_at: '2026-07-01T00:00:00.000Z',
    current_phase: 'validation',
    phases: Object.fromEntries(
      ['validation', 'discovery', 'research', 'strategy', 'architecture', 'planning',
       'execution', 'launch', 'iteration', 'documentation', 'retro']
        .map((p) => [p, { status: 'pending', started_at: null, completed_at: null, agents: [] }])),
    artifacts: {}, history: [], stories: {}, blockers: [], change_requests: {}
  }, null, 2));
  return dir;
}

test('advance succeeds even when memory is over budget', () => {
  const dir = phaseRepo();
  try {
    const res = spawnSync(process.execPath, [SCRIPT, 'advance'], { encoding: 'utf8', cwd: dir });
    assert.strictEqual(res.status, 0,
      `advance must not be blocked by memory size. stdout=${res.stdout} stderr=${res.stderr}`);
    const out = JSON.parse(res.stdout.trim().split('\n').pop());
    assert.strictEqual(out.success, true);
    assert.strictEqual(out.from, 'validation');
    assert.strictEqual(out.to, 'discovery');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the over-budget condition is REPORTED, not swallowed', () => {
  const dir = phaseRepo();
  try {
    const res = spawnSync(process.execPath, [SCRIPT, 'advance'], { encoding: 'utf8', cwd: dir });
    const out = JSON.parse(res.stdout.trim().split('\n').pop());
    assert.ok(out.memory, 'the memory report must be in the payload, not hidden');
    assert.ok('under_budget' in out.memory, 'under_budget must be explicit');
    assert.ok(out.memory.budget > 0, 'the budget must be reported so a reader can see the ceiling');
    assert.ok(res.stderr.includes('[warn]'),
      'an over-budget transition must warn on stderr — visible, not silent');
    assert.ok(!res.stdout.includes('OVER_BUDGET'),
      'no error-shaped output: this is a cost warning, not a failure');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('set-phase succeeds even when memory is over budget', () => {
  const dir = phaseRepo();
  try {
    const res = spawnSync(process.execPath, [SCRIPT, 'set-phase', '--phase', 'strategy'],
      { encoding: 'utf8', cwd: dir });
    assert.strictEqual(res.status, 0,
      `set-phase must not be blocked. stdout=${res.stdout} stderr=${res.stderr}`);
    const s = JSON.parse(fs.readFileSync(path.join(dir, 'artifacts/output/pipeline-state.json'), 'utf8'));
    assert.strictEqual(s.current_phase, 'strategy', 'the switch must actually persist');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the phase state actually advances after compaction', () => {
  const dir = phaseRepo();
  try {
    spawnSync(process.execPath, [SCRIPT, 'advance'], { encoding: 'utf8', cwd: dir });
    const s = JSON.parse(fs.readFileSync(path.join(dir, 'artifacts/output/pipeline-state.json'), 'utf8'));
    assert.strictEqual(s.current_phase, 'discovery');
    assert.strictEqual(s.phases.validation.status, 'complete',
      'the outgoing phase must be recorded complete — never silently skipped');
    assert.strictEqual(s.phases.discovery.status, 'in-progress');
    assert.ok(s.phases.validation.completed_at, 'completed_at must be stamped');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// --- 11. Retirement must be idempotent in the ARCHIVE, not just the source file ---
// Measured defect on the real repo: 51 sections appeared TWICE in 2026-Q4-archive.md and
// 54 titles appeared 2-3x in index.ndjson. The shard was append-only with no identity
// check, so re-running compaction over a file that still listed an already-archived entry
// appended it again.
//
// The earlier idempotency test in this file passed while the real archive duplicated,
// because it asserted the SOURCE file was stable — and the source was stable. It never
// checked the archive, which is where the duplication actually landed. A test that only
// checks the side effect it did not think about will not catch this.

test('an already-archived entry is never written to the archive twice', () => {
  const dir = makeRepo(section('duplicate me', isoDaysAgo(120)));
  try {
    compact(dir);
    assert.strictEqual((readArchive(dir).match(/duplicate me/g) || []).length, 1,
      'first run must write the entry exactly once');

    // Re-archive the SAME header by putting it back in the source file, which is what
    // happened when compaction ran twice over overlapping content.
    fs.writeFileSync(
      path.join(dir, 'artifacts/memory/active-decisions.md'),
      '# Active Decisions\n\n---\n\n' + section('duplicate me', isoDaysAgo(120))
    );
    compact(dir);
    assert.strictEqual((readArchive(dir).match(/duplicate me/g) || []).length, 1,
      'a second retirement of the same decision must be SKIPPED, not appended again');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the ndjson index does not re-index an already-archived entry', () => {
  const dir = makeRepo(section('index once only', isoDaysAgo(120)));
  try {
    const idx = () => {
      const p = path.join(dir, 'artifacts/memory/archive/index.ndjson');
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    };
    compact(dir);
    const first = (idx().match(/"index once only"/g) || []).length;
    fs.writeFileSync(
      path.join(dir, 'artifacts/memory/active-decisions.md'),
      '# Active Decisions\n\n---\n\n' + section('index once only', isoDaysAgo(120))
    );
    compact(dir);
    assert.strictEqual((idx().match(/"index once only"/g) || []).length, first,
      'the search index must not gain a second row for the same decision');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the report distinguishes newly archived from duplicates skipped', () => {
  // Silent dedupe would hide a re-retirement. The count must be visible so a repeat run
  // reads as "nothing new" rather than looking like work that happened again.
  const dir = makeRepo(section('counted', isoDaysAgo(120)));
  try {
    const first = compact(dir);
    assert.strictEqual(first.newlyArchived, 1);
    assert.strictEqual(first.duplicatesSkipped, 0);
    fs.writeFileSync(
      path.join(dir, 'artifacts/memory/active-decisions.md'),
      '# Active Decisions\n\n---\n\n' + section('counted', isoDaysAgo(120))
    );
    const second = compact(dir);
    assert.strictEqual(second.newlyArchived, 0, 'nothing new was archived');
    assert.strictEqual(second.duplicatesSkipped, 1, 'the duplicate must be counted, not hidden');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
