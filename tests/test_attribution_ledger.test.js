#!/usr/bin/env node
// test_attribution_ledger.test.js — dispatch attribution ledger (round-table turn-10 spec)
// One row per dispatch, closed outcome enum, machine-readable cost blindness,
// exactly-once ids, consumption linkage, fail-closed verify. Each with red.
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ledgerPath = path.join(__dirname, '..', '.agents', 'scripts', 'dispatch_ledger.js');
let ledger;
let tmpDir, origCwd;

function mkTmp() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-ledger-test-'));
  origCwd = process.cwd();
  process.chdir(tmpDir);
  delete require.cache[require.resolve(ledgerPath)];
  ledger = require(ledgerPath);
}

function cleanup() {
  process.chdir(origCwd);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  delete require.cache[require.resolve(ledgerPath)];
}

function good(over = {}) {
  return {
    writer_id: '@round-table', agent: '@developer', task: 'implement x',
    outcome: 'success', ...over,
  };
}

// Fully-formed row for direct validateRow calls (bypasses recordDispatch defaults).
function row(over = {}) {
  return {
    type: 'dispatch', dispatch_id: 'x', ts: new Date().toISOString(),
    attempt_count: 1, tokens_unknown: true, cost_unknown: true,
    ...good(), ...over,
  };
}

describe('dispatch attribution ledger', () => {
  beforeEach(mkTmp);
  afterEach(cleanup);

  it('records a valid dispatch row (AC-A2 happy path)', () => {
    const r = ledger.recordDispatch(good());
    assert.equal(r.ok, true);
    assert.ok(r.row.dispatch_id);
    assert.equal(r.row.attempt_count, 1);
    assert.equal(r.row.tokens_unknown, true);
    const v = ledger.verifyLedger(1);
    assert.equal(v.pass, true);
    assert.equal(v.total, 1);
  });

  it('retry counts on the single row; second record same id refused (AC-A1)', () => {
    const first = ledger.recordDispatch(good({ attempt_count: 2 }));
    assert.equal(first.ok, true);
    assert.equal(first.row.attempt_count, 2);
    const dup = ledger.recordDispatch(good({ dispatch_id: first.row.dispatch_id }));
    assert.equal(dup.ok, false);
    assert.match(dup.error, /DUPLICATE_DISPATCH_ID/);
    const v = ledger.verifyLedger(1);
    assert.equal(v.total, 1);
    assert.equal(v.pass, true);
  });

  it('hand-appended duplicate id fails verify (DUPLICATE red)', () => {
    const r = ledger.recordDispatch(good());
    assert.equal(r.ok, true);
    const file = path.join(tmpDir, 'artifacts', 'telemetry', `dispatches-${new Date().toISOString().split('T')[0]}.ndjson`);
    fs.appendFileSync(file, JSON.stringify({ ...r.row, ts: new Date().toISOString() }) + '\n');
    const v = ledger.verifyLedger(1);
    assert.equal(v.pass, false);
    assert.equal(v.duplicates, 1);
    assert.match(v.reason, /DUPLICATE/);
  });

  it('free-text outcome rejected at write (AC-A3 red)', () => {
    const r = ledger.recordDispatch(good({ outcome: 'kinda worked' }));
    assert.equal(r.ok, false);
    assert.match(r.error, /outcome must be one of/);
    for (const o of ['success', 'error', 'timeout', 'rejected_by_gate', 'cancelled']) {
      assert.equal(ledger.validateRow(row({ outcome: o })).valid, true);
    }
  });

  it('missing row fails gate via --expect (MISSING_ATTRIBUTION red)', () => {
    ledger.recordDispatch(good());
    const v = ledger.verifyLedger(1, 3);
    assert.equal(v.pass, false);
    assert.equal(v.missing, 2);
    assert.match(v.reason, /MISSING_ATTRIBUTION/);
  });

  it('empty window FAILS (zero signal never passes)', () => {
    const v = ledger.verifyLedger(1);
    assert.equal(v.total, 0);
    assert.equal(v.pass, false);
    assert.match(v.reason, /zero signal/);
  });

  it('rows without blindness flags are invalid; flags must match usage block', () => {
    const base = row();
    assert.equal(ledger.validateRow({ ...base, tokens_unknown: false }).valid, false);
    // exact usage requires flags false
    const exact = { ...base, tokens_unknown: false, cost_unknown: false, usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost_usd: null, estimated: false } };
    assert.equal(ledger.validateRow(exact).valid, true);
    // exact usage with flags true = inconsistent
    assert.equal(ledger.validateRow({ ...exact, tokens_unknown: true }).valid, false);
  });

  it('rollupUsage REFUSES flagged rows instead of zero-filling', () => {
    const r = ledger.recordDispatch(good());
    assert.throws(() => ledger.rollupUsage([r.row]), /REFUSED/);
    const exact = { ...r.row, tokens_unknown: false, cost_unknown: false, usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost_usd: null, estimated: false } };
    assert.equal(ledger.rollupUsage([exact]), 15);
  });

  it('consumption links artifact to consumer; orphan rate reported', () => {
    const a = ledger.recordDispatch(good({ artifact_path: 'artifacts/output/x.md' }));
    const b = ledger.recordDispatch(good({ agent: '@reviewer', task: 'review x', outcome: 'success' }));
    assert.equal(ledger.recordConsumption({ dispatch_id: a.row.dispatch_id, consumer: b.row.dispatch_id }).ok, true);
    assert.equal(ledger.recordConsumption({ dispatch_id: 'nope', consumer: 'x' }).ok, false);
    const s = ledger.summarizeLedger(1);
    assert.equal(s.total_dispatches, 2);
    assert.equal(s.artifacts_produced, 1);
    assert.equal(s.orphan_artifacts, 0);
    assert.equal(s.orphan_rate, 0);
    assert.deepEqual(s.by_outcome, { success: 2 });
  });

  it('unconsumed artifact counts as orphan (did-it-matter signal)', () => {
    ledger.recordDispatch(good({ artifact_path: 'artifacts/output/orphan.md' }));
    const s = ledger.summarizeLedger(1);
    assert.equal(s.orphan_artifacts, 1);
    assert.equal(s.orphan_rate, 1);
  });

  it('parent trace linkage stored for nesting joins', () => {
    const parent = ledger.recordDispatch(good());
    const child = ledger.recordDispatch(good({ agent: '@qa-engineer', task: 'challenge', parent_trace_id: parent.row.dispatch_id }));
    assert.equal(child.ok, true);
    assert.equal(child.row.parent_trace_id, parent.row.dispatch_id);
  });

  it('proxy metric decomposes volume × unit; missing bytes excluded honestly', () => {
    assert.equal(ledger.recordDispatch(good({ context_bytes: 1000 })).ok, true);
    assert.equal(ledger.recordDispatch(good({ agent: '@b', task: 't2', context_bytes: 3000 })).ok, true);
    assert.equal(ledger.recordDispatch(good({ agent: '@c', task: 't3' })).ok, true);
    assert.equal(ledger.recordDispatch(good({ agent: '@d', task: 't4', context_bytes: -5 })).ok, false);
    const s = ledger.summarizeLedger(1);
    assert.equal(s.total_dispatches, 3);
    assert.equal(s.proxy_bytes_total, 4000);
    assert.equal(s.proxy_unit_mean, 2000);
    assert.equal(s.proxy_coverage, 0.667);
  });

  it('proxy fields null when no row carries context bytes', () => {
    ledger.recordDispatch(good());
    const s = ledger.summarizeLedger(1);
    assert.equal(s.proxy_bytes_total, null);
    assert.equal(s.proxy_unit_mean, null);
    assert.equal(s.proxy_coverage, 0);
  });
});
