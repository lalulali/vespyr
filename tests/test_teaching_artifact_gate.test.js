'use strict';

/**
 * tests/test_teaching_artifact_gate.test.js — /teach-me and /craft-lesson finally have a gate.
 *
 * Both skills declared a Done-when contract in prose and nothing checked any of it: no gate script,
 * no test, and `artifacts/output/teaching/` did not exist. A run that skipped the Knowledge Map,
 * batched all six formats, or produced a note with no citations was indistinguishable from one that
 * followed the workflow.
 *
 * The gate checks STRUCTURE only. Its own output says so, and the tests below pin both directions —
 * the documented pass cases pass, and every documented failure mode fails — because a gate that
 * only ever passes is the defect this file exists to prevent.
 *
 * NOT tested here, and stated so nobody reads a green as more than it is: whether a /craft-lesson
 * run PAUSED for approval between formats. A script cannot see a pause. That sequence is verified by
 * reading the per-format `orchestrator_state.js complete` milestones.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const GATE = path.join(REPO, '.agents/scripts/teaching_artifact_check.js');

function check(kind, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'teach-'));
  const f = path.join(dir, 'artifact.md');
  fs.writeFileSync(f, body);
  const r = spawnSync('node', [GATE, 'check', '--kind', kind, '--file', f, '--json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* fail-closed prints JSON too */ }
  return { code: r.status, json: j };
}
const has = (r, re) => r.json.failures && r.json.failures.some((f) => re.test(f));

// --- fixtures ---------------------------------------------------------------------------------

const KM = ({ tiers = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE'], anchors = true, ph = false } = {}) => {
  const body = ['# Knowledge Map — Distributed Consensus', '', '## Prerequisites'];
  body.push(`- [${tiers[0]}] ${ph ? '{define node}' : 'What a node is'}${anchors ? '. **If Nothing Else, Remember This:** a node is a process that can fail.' : '.'}`);
  body.push('', '## Core');
  for (const t of tiers.slice(1)) {
    body.push(`- [${t}] Objective at ${t}${anchors ? '. **If Nothing Else, Remember This:** the term number orders everything.' : '.'}`);
  }
  return body.join('\n') + '\n';
};

const NOTE = ({ sections = true, cite = 'footnote', words = 900 } = {}) => {
  const b = ['# Consensus — Deep Dive Note', ''];
  if (sections) {
    b.push('## Table of Contents', '- one', '');
    b.push('## Executive Overview & First Principles', `Consensus is agreement among fallible processes${cite !== 'none' ? ' [1]' : ''}.`, '');
    b.push('## Edge Cases, Trade-offs & Common Pitfalls', 'Split brain is the classic pitfall.', '');
    b.push('## Historical & Theoretical Context', 'Lamport introduced Paxos.', '');
    b.push('## Active Recall Scenarios', '1. What breaks if two leaders are elected?', '');
  }
  if (cite === 'footnote') b.push('## References', '[^1]: Lamport, "The Part-Time Parliament", 1998.', '');
  if (cite === 'reflist') b.push('## References', '1. Lamport, "The Part-Time Parliament", 1998.', '');
  if (cite === 'orphan') b.push('## References', '[^7]: a source that resolves nothing cited above.', '');
  b.push('Consensus requires a quorum of nodes to agree on an ordered log of operations. '.repeat(Math.ceil(words / 12)));
  return b.join('\n');
};

// --- /craft-lesson: knowledge map --------------------------------------------------------------

test('a conformant knowledge map passes', () => {
  const r = check('knowledge-map', KM());
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures, null, 2));
});

test('a map with no Bloom tags fails — Phase 3 requires every objective tagged', () => {
  const r = check('knowledge-map', KM({ tiers: ['', '', '', '', ''] }));
  assert.ok(has(r, /No Bloom's tier tag/), JSON.stringify(r.json.failures));
});

test('a map using fewer than three tiers fails — a single tier is a list, not a sequence', () => {
  const r = check('knowledge-map', KM({ tiers: ['REMEMBER', 'REMEMBER', 'REMEMBER', 'REMEMBER', 'REMEMBER'] }));
  assert.ok(has(r, /Only 1 Bloom's tier/), JSON.stringify(r.json.failures));
});

test('a map with no takeaway anchors fails — a map without stated priority is not a map', () => {
  const r = check('knowledge-map', KM({ anchors: false }));
  assert.ok(has(r, /No "If Nothing Else, Remember This" anchor/), JSON.stringify(r.json.failures));
});

test('a map still carrying template placeholders fails', () => {
  const r = check('knowledge-map', KM({ ph: true }));
  assert.ok(has(r, /unfilled template placeholder/), JSON.stringify(r.json.failures));
});

// --- /teach-me: the note ----------------------------------------------------------------------

test('a conformant Deep Dive note passes', () => {
  const r = check('note', NOTE());
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures, null, 2));
});

test('a note missing the declared sections fails and names them', () => {
  const r = check('note', NOTE({ sections: false }));
  // 5 of 6: the fixture omits the five content sections but keeps `## References`, which is not one
  // of the six the template declares — it is where citations resolve.
  assert.ok(has(r, /missing 5 of the 6 sections/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /Table of Contents/), 'the failure must name what is missing');
});

test('a note with no citations at all fails — DNA 5 applies to teaching too', () => {
  const r = check('note', NOTE({ cite: 'none' }));
  assert.ok(has(r, /No citations/), JSON.stringify(r.json.failures));
});

test('an inline [N] that resolves to nothing fails — a marker is not a source', () => {
  const r = check('note', NOTE({ cite: 'orphan' }));
  assert.ok(has(r, /resolve to nothing/), JSON.stringify(r.json.failures));
});

test('both legitimate citation styles resolve: footnotes and a numbered reference list', () => {
  for (const style of ['footnote', 'reflist']) {
    const r = check('note', NOTE({ cite: style }));
    assert.strictEqual(r.code, 0, `${style} must resolve: ${JSON.stringify(r.json.failures)}`);
  }
});

test('a numbered list OUTSIDE the references section does not resolve a citation', () => {
  // The first version scanned the whole note, so `1. What breaks if two leaders are elected?` under
  // "Active Recall Scenarios" was resolving `[1]` in the body. A question in the exercises is not a
  // source, and the check now reads the references section only.
  // FIXED after the QA seat proved this test passed for the wrong reason: the old fixture replaced
  // the references heading with a no-op and left the note with ZERO `[1]` markers, so it only ever
  // reached "No citations" — the whole-document scan could have been restored and this test would
  // still have passed. The fixture now keeps the inline markers and removes only their resolution,
  // which is the behaviour the test names.
  const body = NOTE({ cite: 'footnote' })
    .replace(/^\[\^1\]:.*$/m, '')      // the footnote is gone
    .replace('## References', '## Notes'); // and so is the heading that could hold a list
  const r = check('note', body);
  assert.ok(has(r, /resolve to nothing/),
    `the inline [1] must be reported as unresolvable, not as absent: ${JSON.stringify(r.json.failures)}`);
});

test('a note too short to be a reference note fails', () => {
  const r = check('note', NOTE({ words: 300 }));
  assert.ok(has(r, /not a reference note at all/), JSON.stringify(r.json.failures));
});

test('length above the floor is a disclosed note, never an enforced floor', () => {
  // This repo has already measured what a hard word floor does to honest work — cycle_state_check's
  // 58-word floor passes `word0 word1 … word57`. Padding to a number is the failure a count cannot
  // detect, so the count is reported and never enforced.
  const r = check('note', NOTE({ words: 900 }));
  assert.strictEqual(r.code, 0);
  assert.ok(r.json.notes.some((n) => /Length: \d+ words/.test(n)), JSON.stringify(r.json.notes));
});

// --- fail-closed ------------------------------------------------------------------------------

test('a missing file, an unknown kind, and no arguments all fail closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'teach-missing-'));
  const missing = spawnSync('node', [GATE, 'check', '--kind', 'note', '--file', path.join(dir, 'nope.md'), '--json'], { encoding: 'utf8' });
  assert.strictEqual(missing.status, 2, 'a missing artifact is a missing deliverable, never a pass');

  const good = path.join(dir, 'a.md');
  fs.writeFileSync(good, KM());
  const kind = spawnSync('node', [GATE, 'check', '--kind', 'bogus', '--file', good, '--json'], { encoding: 'utf8' });
  assert.strictEqual(kind.status, 2);
  assert.match(kind.stderr + kind.stdout, /expected knowledge-map or note/);

  const none = spawnSync('node', [GATE, 'check'], { encoding: 'utf8' });
  assert.strictEqual(none.status, 2);

  const empty = path.join(dir, 'empty.md');
  fs.writeFileSync(empty, '   \n');
  const e = spawnSync('node', [GATE, 'check', '--kind', 'note', '--file', empty, '--json'], { encoding: 'utf8' });
  assert.strictEqual(e.status, 2, 'an empty artifact must never read as conformant');

  fs.rmSync(dir, { recursive: true, force: true });
});

// --- the limit, asserted rather than described -------------------------------------------------

test('a green result says it is not a judgement on the teaching', () => {
  const r = check('note', NOTE());
  assert.strictEqual(r.code, 0);
  assert.match(r.json.note, /not that it teaches well/);
  assert.ok(r.json.notes.some((n) => /NOT CHECKED/.test(n)), 'the limit must be on the page');
});

test('the skill files name this gate — an undocumented gate is never run', () => {
  for (const s of ['teach-me', 'craft-lesson']) {
    const src = fs.readFileSync(path.join(REPO, `.agents/skills/${s}/SKILL.md`), 'utf8');
    assert.ok(src.includes('teaching_artifact_check.js'), `${s} must document the gate that checks it`);
  }
});
