/**
 * Memory reclassification — moving an entry between canonical files.
 *
 * WHY THIS OPERATION EXISTS. `active-decisions.md` is for "critical active design choices
 * and architectural constraints". Measured 2026-10-05: 6 of its 13 entries were work
 * records — 4 `[PROCESS]` and 2 `[TEST]` audit-session logs — which pushed the file to
 * 7,944 tokens against a 2,500 budget and past any retention window. They belong in
 * `lessons-learned.md`.
 *
 * They could not simply be edited by hand: AGENTS.md §Interacting with Memory prohibits
 * direct edits to `artifacts/memory/**`, because that bypasses secret scrubbing, injection
 * sanitisation, provenance attestation and dedupe. So the move needed a sanctioned path,
 * which reuses the same lock, dedupe validator, scrubber and ledger as an append.
 *
 * THE BUG THIS SUITE EXISTS TO LOCK. The first implementation indexed `starts` (an array of
 * LINE NUMBERS) with `startIdx + 1`, so `starts[96]` on a 13-element array was undefined,
 * `endIdx` fell through to end-of-file, and "remove one block" truncated the file from the
 * target entry onward. Measured: moving ONE entry turned 13 headers into 5 — eight
 * decisions silently destroyed.
 *
 * It was caught only because the operation was rehearsed on a throwaway copy first. That
 * is the practice these tests encode: verify the count, not just the exit code.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { thresholdsFor } = require(path.join(ROOT, '.agents/scripts/lib/memory_thresholds.js'));
const { spawnSync } = require('node:child_process');

const CLI = path.join(ROOT, '.agents/scripts/memory_write.js');

// Spawned, not called in-process: memory_write.js resolves MEMORY_DIR at REQUIRE time
// (line 45), so a test cannot chdir it. The first version of this file used
// process.chdir plus a direct call, and every "no entry matches" result was an artifact
// of that rather than of the code under test. Subprocess is also how the tool really runs.
function reclassify(cwd, args) {
  const res = spawnSync(process.execPath, [CLI, '--reclassify', ...args],
    { encoding: 'utf8', cwd });
  const out = (res.stdout || '').trim();
  return { status: res.status, json: out ? JSON.parse(out.split('\n').pop()) : null };
}

const MEM = path.join(ROOT, 'artifacts', 'memory');

function fixture(entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-reclass-'));
  fs.mkdirSync(path.join(dir, 'artifacts', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts', 'output'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.agents', 'state'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts/memory/active-decisions.md'),
    '# Active Decisions\n\nCritical active design choices.\n\n---\n\n' + entries.join('\n---\n\n') + '\n');
  fs.writeFileSync(path.join(dir, 'artifacts/memory/lessons-learned.md'), '# Lessons Learned\n');
  // memory_write.js resolves MEMORY_DIR from process.cwd(), so chdir for the call.
  return dir;
}

const ent = (domain, title, date = '2026-10-05') =>
  `### [${domain}] ${title} [date: ${date}] [agent: @tester]\nBody for ${title}.\n**Status:** active\n`;

const headersIn = (dir, file) =>
  fs.readFileSync(path.join(dir, 'artifacts/memory', file), 'utf8')
    .split('\n').filter((l) => l.startsWith('### ') || l.startsWith('## AD-')).length;

test('reclassify moves exactly ONE entry and leaves every other entry intact', () => {
  // The regression lock. The first implementation destroyed 8 of 13 entries here.
  const dir = fixture([
    ent('DECISION', 'Decision alpha'),
    ent('PROCESS', 'Audit work log beta'),
    ent('DECISION', 'Decision gamma'),
    ent('TEST', 'Shipped note delta'),
    ent('DECISION', 'Decision epsilon'),
  ]);
  try {
    {
      const r = reclassify(dir, ['--from', 'active-decisions.md', '--to', 'lessons-learned.md',
        '--header', '[PROCESS] Audit work log beta']);
      assert.strictEqual(r.status, 0, JSON.stringify(r.json));
      assert.strictEqual(headersIn(dir, 'active-decisions.md'), 4,
        'exactly one entry leaves the source');
      assert.strictEqual(headersIn(dir, 'lessons-learned.md'), 1);
    }
    const src = fs.readFileSync(path.join(dir, 'artifacts/memory/active-decisions.md'), 'utf8');
    assert.ok(!src.includes('Audit work log beta'), 'the moved entry leaves the source');
    for (const keep of ['Decision alpha', 'Decision gamma', 'Shipped note delta', 'Decision epsilon']) {
      assert.ok(src.includes(keep), `${keep} MUST survive — this is the bug under test`);
    }
    const dst = fs.readFileSync(path.join(dir, 'artifacts/memory/lessons-learned.md'), 'utf8');
    assert.ok(dst.includes('Audit work log beta'), 'and it lands in the destination');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('reclassify matching works on a title prefix, not just the full header', () => {
  // A stored header carries trailing [date:] / [agent:] tags. Demanding exact equality
  // rejected the obvious spelling of the title and pushed operators toward pasting
  // machine metadata by hand.
  const dir = fixture([ent('PROCESS', 'A very long audit title that continues', '2026-10-04')]);
  try {
    {
      const r = reclassify(dir, ['--from', 'active-decisions.md', '--to', 'lessons-learned.md',
        '--header', '[PROCESS] A very long audit title']);
      assert.strictEqual(r.status, 0, JSON.stringify(r.json));
    }
    assert.strictEqual(headersIn(dir, 'active-decisions.md'), 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('reclassify refuses an entry that does not exist', () => {
  const dir = fixture([ent('DECISION', 'Only entry')]);
  try {
    {
      const r = reclassify(dir, ['--from', 'active-decisions.md', '--to', 'lessons-learned.md',
        '--header', '[DECISION] nothing like this']);
      assert.strictEqual(r.status, 1, 'must refuse rather than guess');
    }
    assert.strictEqual(headersIn(dir, 'active-decisions.md'), 1, 'source untouched');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('reclassify refuses a non-canonical destination', () => {
  const dir = fixture([ent('PROCESS', 'Work log')]);
  try {
    {
      const r = reclassify(dir, ['--from', 'active-decisions.md', '--to', 'notes.md',
        '--header', '[PROCESS] Work log']);
      assert.strictEqual(r.status, 1, 'must refuse a non-canonical file');
    }
    assert.strictEqual(headersIn(dir, 'active-decisions.md'), 1, 'source untouched');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('reclassify refuses to duplicate an entry the destination already has', () => {
  const dir = fixture([ent('PROCESS', 'Already known work log')]);
  try {
    fs.appendFileSync(path.join(dir, 'artifacts/memory/lessons-learned.md'),
      ent('PROCESS', 'Already known work log'));
    {
      const r = reclassify(dir, ['--from', 'active-decisions.md', '--to', 'lessons-learned.md',
        '--header', '[PROCESS] Already known work log']);
      assert.strictEqual(r.status, 1, 'must refuse to create a second copy');
    }
    assert.strictEqual(headersIn(dir, 'active-decisions.md'), 1, 'source untouched');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('reclassify preserves the original date and agent', () => {
  const dir = fixture([ent('PROCESS', 'Dated work log', '2026-09-01')]);
  try {
    reclassify(dir, ['--from', 'active-decisions.md', '--to', 'lessons-learned.md',
      '--header', '[PROCESS] Dated work log']);
    const dst = fs.readFileSync(path.join(dir, 'artifacts/memory/lessons-learned.md'), 'utf8');
    assert.ok(dst.includes('[date: 2026-09-01]'), 'date preserved');
    assert.ok(dst.includes('@tester'), 'agent preserved');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// --- budgets are derived, and only live in one place ---

test('the threshold table is the single source, and documents its derivation', () => {
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/lib/memory_thresholds.js'), 'utf8');
  assert.ok(/measured/i.test(src), 'the module must state that budgets are derived from measurement');
  // Scoped to the executable body only. A naive whole-file scan flags the module's own
  // doc comment, which quotes `tokens <= 400` as an example of the drift being fixed —
  // so the first version of this assertion failed against the very file it protects.
  const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/\btokens\s*<=\s*\d/.test(body),
    'no budget comparison may be hardcoded outside the table');
});

test('memory-controller.md no longer restates the thresholds as its own table', () => {
  // The fourth copy: 1,800 WORDS (~1,350 tokens), a different unit and a different value
  // from all three in code — and not the copy that ran.
  const doc = fs.readFileSync(path.join(ROOT, '.agents/agents/memory-controller.md'), 'utf8');
  assert.ok(!/^\|\s*`active-decisions\.md`\s*\|\s*[\d,]+\s*\|/m.test(doc),
    'the agent doc must not carry its own thresholds table');
  assert.ok(/memory_thresholds\.js/.test(doc),
    'it must point at the single source instead');
});

test('memory-controller.md documents decision-vs-lesson routing', () => {
  // The actual cause: the routing table said what each file was FOR but never said that
  // an audit record is not a standing decision.
  const doc = fs.readFileSync(path.join(ROOT, '.agents/agents/memory-controller.md'), 'utf8');
  assert.ok(/standing choice/i.test(doc), 'must define what a decision entry is');
  assert.ok(/lessons-learned\.md/.test(doc) && /audit/i.test(doc),
    'must say that audit/work records go to lessons');
  assert.ok(/reclassify/.test(doc), 'must document the sanctioned move command');
});

test('every live memory file is inside its derived budget', (t) => {
  // BLIND REVIEW 2026-10-13: artifacts/memory is gitignored live state. A clean clone has
  // none, so the budget rule cannot be exercised — skip rather than fail.
  if (!fs.existsSync(path.join(ROOT, 'artifacts', 'memory'))) {
    t.skip('artifacts/memory absent (gitignored live state)');
    return;
  }
  const { countTokens } = require(path.join(ROOT, 'tools/eval/lib/tokenizer.js'));
  const over = [];
  for (const f of fs.readdirSync(MEM).filter((x) => x.endsWith('.md'))) {
    const c = thresholdsFor(f);
    if (c.tokens === null) continue; // dynamic tier
    const tok = countTokens(fs.readFileSync(path.join(MEM, f), 'utf8'));
    if (tok > c.tokens) over.push(`${f}: ${tok} > ${c.tokens}`);
  }
  assert.deepStrictEqual(over, [], `files over their calibrated budget: ${over.join('; ')}`);
});
