/**
 * test_session_id_validation.test.js — 02q hardening (2026-09-29)
 *
 * resolveSessionId() interpolates VESPYR_SESSION_ID raw into ledger rows and
 * memory entries. Before this guard it trusted the env var unconditionally,
 * so an empty/whitespace/newline-bearing value could forge attribution rows
 * (same injection class memory_write.js already guards for --agent) or blank
 * out attribution entirely. This fixture pins the contract: a valid id shape
 * is trusted (source 'explicit'); anything off-shape falls back to the
 * per-window id (source 'window-fallback') rather than being trusted.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { resolveSessionInfo, isValidSessionId } = require(
  path.resolve(__dirname, '..', '.agents', 'scripts', 'lib', 'session.js')
);

let saved;
beforeEach(() => { saved = process.env.VESPYR_SESSION_ID; });
afterEach(() => {
  if (saved === undefined) delete process.env.VESPYR_SESSION_ID;
  else process.env.VESPYR_SESSION_ID = saved;
});

describe('VESPYR_SESSION_ID validation (02q)', () => {
  it('trusts a valid UUID and reports source=explicit', () => {
    process.env.VESPYR_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
    const info = resolveSessionInfo();
    assert.strictEqual(info.source, 'explicit');
    assert.strictEqual(info.id, '550e8400-e29b-41d4-a716-446655440000');
  });

  it('trusts a safe token with allowed separators', () => {
    process.env.VESPYR_SESSION_ID = 'sess_kiro-01:main.2';
    assert.strictEqual(resolveSessionInfo().source, 'explicit');
  });

  for (const [name, val] of [
    ['empty string', ''],
    ['whitespace only', '   '],
    ['newline forge', 'abc\ndef'],
    ['leading dash', '-bad'],
    ['leading dot', '.bad'],
    ['space inside', 'a b'],
    ['over 128 chars', 'a'.repeat(129)],
  ]) {
    it(`rejects ${name} → window-fallback (never trusted)`, () => {
      process.env.VESPYR_SESSION_ID = val;
      const info = resolveSessionInfo();
      assert.strictEqual(info.source, 'window-fallback');
      assert.ok(info.id.startsWith('w-'), 'must fall back to the window id');
    });
  }

  it('falls back to the window id when the env var is absent', () => {
    delete process.env.VESPYR_SESSION_ID;
    const info = resolveSessionInfo();
    assert.strictEqual(info.source, 'window-fallback');
    assert.match(info.id, /^w-[0-9a-f]{12}$/);
  });

  it('isValidSessionId agrees with the resolution contract', () => {
    assert.ok(isValidSessionId('a'));
    assert.ok(isValidSessionId('A0._:-'));
    assert.ok(!isValidSessionId(''));
    assert.ok(!isValidSessionId('has space'));
    assert.ok(!isValidSessionId('\nleadingnl'));
    assert.ok(!isValidSessionId(undefined));
  });
});
