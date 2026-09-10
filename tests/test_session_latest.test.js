/**
 * test_session_latest.test.js — 2026-09-10 D2 regression fixture
 * (harness-defects-2026-09-10.md): `parseLastHistoryEntry` truncated the
 * captured body at the first line end (`\n*$` under the `m` flag), so
 * `latest.md` always showed `Decisions: none / Next step: (not specified) /
 * Blockers: none`.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { parseLastHistoryEntry } = require(path.resolve(__dirname, '..', '.agents', 'scripts', 'lib', 'session.js'));

const ENTRY_1 = [
  '## [2026-09-10 15:36] Agent: @round-table',
  '- Worked on: handoff write',
  '- Decisions: A12 GO',
  '- Next step: name target',
  '- Blockers: none',
  '- Session: w-test-1',
].join('\n');

const ENTRY_2 = [
  '## [2026-09-10 16:00] Agent: @founder',
  '- Worked on: hand-run prep',
  '- Decisions: hand-run scope fixed',
  '- Next step: run the hand-run — with an em-dash → and arrow',
  '- Blockers: execution held',
  '- Session: w-test-2',
].join('\n');

describe('D2 — latest.md derived fields (2026-09-10)', () => {
  it('parses Decisions/Next step/Blockers of the LAST entry in a multi-entry history', () => {
    const e = parseLastHistoryEntry(`\n${ENTRY_1}\n\n${ENTRY_2}\n`);
    assert.strictEqual(e.agent, 'founder');
    assert.strictEqual(e.workedOn, 'hand-run prep');
    assert.strictEqual(e.decisions, 'hand-run scope fixed');
    assert.strictEqual(e.nextStep, 'run the hand-run — with an em-dash → and arrow');
    assert.strictEqual(e.blockers, 'execution held');
    assert.strictEqual(e.sessionId, 'w-test-2');
  });

  it('parses a single-entry history with trailing newlines', () => {
    const e = parseLastHistoryEntry(`${ENTRY_1}\n\n`);
    assert.strictEqual(e.decisions, 'A12 GO');
    assert.strictEqual(e.nextStep, 'name target');
    assert.strictEqual(e.blockers, 'none');
    assert.strictEqual(e.sessionId, 'w-test-1');
  });

  it('keeps default fallbacks for entries with genuinely missing fields', () => {
    const minimal = ['## [2026-09-10 16:10] Agent: @developer', '- Worked on: bare entry'].join('\n');
    const e = parseLastHistoryEntry(minimal);
    assert.strictEqual(e.workedOn, 'bare entry');
    assert.strictEqual(e.decisions, 'none');
    assert.strictEqual(e.nextStep, '(not specified)');
    assert.strictEqual(e.blockers, 'none');
  });
});
