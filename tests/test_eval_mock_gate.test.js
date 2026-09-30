'use strict';

/**
 * Mock runs are not quality gates (2026-09-30)
 *
 * `npm run eval` runs `--mock`, where no model executes. Of 148 benchmarks only
 * 18 declare a mockOutput; the other 130 are scored against
 * cannedMockResponse()'s explicit "Unmeasured fixture response" string, and
 * adversarial traps are handed a stub that deliberately carries no verdict. The
 * runner's own comment says: "mock runs go RED on traps, demonstrating harness
 * mechanics rather than laundering fixture-recall as pushback capability."
 *
 * So a red mock run is the DESIGNED behaviour. But bin/vespyr-eval.js exited 1
 * on any benchmark failure, and the recorded mock baseline itself contains 104
 * failures — so the gate could never pass and had to be permanently ignored.
 * That is how the harness and its baselines rotted unnoticed.
 *
 * These tests pin the corrected contract:
 *   mock run   -> exits 0 unless a suite is malformed or a REGRESSION appears
 *   real run   -> still exits 1 on any benchmark failure (unchanged)
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'vespyr-eval.js');
const RUNNER = path.join(ROOT, 'tools', 'eval', 'runner.js');

function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd || ROOT,
    timeout: opts.timeout || 600000,
    env: { ...process.env, ...(opts.env || {}) },
  });
}

test('MOCK-1: a mock run exits 0 even when most benchmarks fail', () => {
  // The whole point. A red mock run is designed behaviour, not a fault.
  const res = runCli(['run', '--mock']);
  const out = (res.stdout || '') + (res.stderr || '');
  assert.strictEqual(res.status, 0,
    `mock run must exit 0; got ${res.status}\n${out.slice(-2000)}`);
});

test('MOCK-2: a mock run says plainly that it is not a quality gate and reports the measured split', () => {
  const res = runCli(['run', '--mock']);
  const out = (res.stdout || '') + (res.stderr || '');
  assert.match(out, /NOT a quality gate/i, 'must not read as a passing quality measurement');
  assert.match(out, /UNMEASURED/i, 'must distinguish unmeasured from passing');
  assert.match(out, /canned stub/i, 'must report how many benchmarks had no output of their own');
  // The split must be real numbers, not a hardcoded number.
  const m = out.match(/(\d+)\/(\d+) benchmarks supplied their own output;\s*(\d+) were scored against a canned stub/);
  assert.ok(m, `expected a measured/canned split line, got:\n${out.slice(-1200)}`);
  const withOwn = Number(m[1]);
  const total = Number(m[2]);
  const canned = Number(m[3]);
  assert.strictEqual(withOwn + canned, total,
    `measured (${withOwn}) + canned (${canned}) must equal the total (${total})`);
});

test('MOCK-3: a mock run still exits 2 on a genuine regression', () => {
  // The control. Without this, "always exit 0" would pass MOCK-1 and the gate
  // would have no signal at all. Plant a regression by claiming in the baseline
  // that a benchmark which currently fails used to pass.
  const baselinePath = path.join(ROOT, 'artifacts', 'evals', 'mock-baseline.json');
  const backup = fs.readFileSync(baselinePath);
  const baseline = JSON.parse(backup.toString('utf8'));

  // Pick a benchmark the mock run actually fails.
  const probe = runCli(['run', '--mock', '--json']);
  const parsed = (() => {
    try { return JSON.parse(probe.stdout); } catch { return null; }
  })();
  let target = null;
  if (parsed && Array.isArray(parsed.benchmarks)) {
    target = parsed.benchmarks.find((b) => b && b.passed === false && b.id);
  }
  if (!target) {
    // Fall back to a known-failing id so the test still means something.
    target = { id: 'AGENT-FOUNDER-01' };
  }

  const entry = baseline.benchmarks.find((b) => b.id === target.id);
  assert.ok(entry, `baseline must contain ${target.id} to plant a regression`);
  const original = { passed: entry.passed, tier0_passed: entry.tier0_passed };
  entry.passed = true;
  entry.tier0_passed = true;

  try {
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
    const res = runCli(['run', '--mock']);
    const out = (res.stdout || '') + (res.stderr || '');
    assert.strictEqual(res.status, 2,
      `a planted PASS->FAIL regression must still exit 2; got ${res.status}\n${out.slice(-1500)}`);
    assert.match(out, /REGRESSION DETECTED/i);
  } finally {
    // Always restore. A leaked mutation here would corrupt the committed
    // baseline, which is exactly the class of bug this work is about.
    fs.writeFileSync(baselinePath, backup);
  }

  const after = runCli(['run', '--mock']);
  assert.strictEqual(after.status, 0, 'restoring the baseline must return the run to exit 0');
  void original;
});

test('MOCK-4: a real-adapter run is NOT excused — it still gates on benchmark failure', () => {
  // The mock carve-out must not leak into the quality path. A run with an
  // adapter is measuredExecution, so mockMode is false and the
  // exit-1-on-any-failure behaviour must still apply.
  //
  // Scope note: bin/vespyr-eval.js has more than one exit block (the `diff` and
  // `record-baseline` paths each compute their own). So this asserts on the
  // LAST exit-1 block, which is the one the `run` path reaches, and checks
  // that the mock branch above it is gated on runResults.mockMode.
  const src = fs.readFileSync(CLI, 'utf8');
  const mockBranch = src.lastIndexOf('if (runResults.mockMode)');
  const failBranch = src.lastIndexOf('if (runResults.failed > 0)');

  assert.ok(mockBranch > -1, 'expected a mockMode branch');
  assert.ok(failBranch > mockBranch,
    'the exit-1-on-failure branch must come AFTER the mock branch, so a real run still reaches it');
  assert.match(src, /if \(runResults\.failed > 0\) \{\s*\n\s*process\.exit\(1\);/,
    'a non-mock run with failures must still exit 1');

  // The mock branch must terminate in its own exit(0) so a mock run can never
  // fall through to the exit(1) below it.
  const mockBody = src.slice(mockBranch, failBranch);
  assert.match(mockBody, /process\.exit\(0\)/,
    'the mock branch must exit explicitly rather than fall through');
  // ...and it must be conditional on mockMode, not on "no adapter" or "dry run".
  assert.match(mockBody, /runResults\.fromCanned|runResults\.withOwnOutput/,
    'the mock branch should be reporting the measured/canned split');
});

test('MOCK-6: every real suite loads with zero warnings', () => {
  // This is the live invariant, and the one that actually protects the run.
  //
  // LIMITATION, stated rather than hidden: loadSuites(suiteFilter) takes a
  // FILTER, not a directory — it always scans the repo's own evals/suites/. So
  // the malformed-file branch cannot be unit-tested without writing a broken
  // file into the repository from inside the test suite, which is precisely the
  // hazard this work exists to remove. That branch is therefore covered only by
  // the CLI's behaviour (it prints `malformed suite:` and exits 3), not here.
  // What IS testable, and what matters day to day, is that all six skills
  // suites, four agents suites, three invariants and the models suite parse.
  const res = spawnSync(process.execPath, ['-e', `
    const { loadSuites } = require(${JSON.stringify(path.join(ROOT, 'tools', 'eval', 'runner.js'))});
    // loadSuites returns an ARRAY of suites with .warnings bolted on, not an
    // object with .benchmarks.
    const s = loadSuites("all");
    const arr = Array.isArray(s) ? s : [];
    console.log(JSON.stringify({
      warnings: s.warnings || [],
      suiteCount: arr.length,
      benchmarkCount: arr.reduce((n, x) => n + ((x.data && x.data.benchmarks && x.data.benchmarks.length) || 0), 0),
      relPaths: arr.map(x => x.relPath).sort(),
    }));
  `], { encoding: 'utf8', cwd: ROOT, timeout: 120000 });

  const out = (res.stdout || '').trim().split('\n').pop();
  let data;
  try { data = JSON.parse(out); } catch { data = { error: 'unparseable: ' + out }; }
  assert.ok(!data.error, `loadSuites probe failed: ${JSON.stringify(data)}`);
  assert.deepStrictEqual(data.warnings, [],
    `every suite on disk must parse; warnings: ${JSON.stringify(data.warnings)}`);
  assert.ok(data.suiteCount >= 10,
    `expected every suite on disk to load; got ${data.suiteCount}: ${JSON.stringify(data.relPaths)}`);
  assert.ok(data.benchmarkCount > 100,
    `expected the full suite to load; got ${data.benchmarkCount} benchmarks`);
});

test('MOCK-5: the runner records where each output came from', () => {
  // `outputSource` is what makes the measured/canned split computable. Without
  // it the CLI would be printing a hardcoded number.
  const res = spawnSync(process.execPath, ['-e', `
    const { runEvaluation } = require(${JSON.stringify(path.join(ROOT, 'tools', 'eval', 'runner.js'))});
    runEvaluation({ mock: true, suites: null, concurrency: 2 }).then(r => {
      const kinds = new Set((r.benchmarks || []).map(b => b.outputSource));
      console.log(JSON.stringify({
        total: r.total,
        withOwnOutput: r.withOwnOutput,
        fromCanned: r.fromCanned,
        kinds: [...kinds].sort(),
      }));
    }).catch(e => { console.log(JSON.stringify({error: String(e.message)})); });
  `], { encoding: 'utf8', cwd: ROOT, timeout: 600000 });

  const out = (res.stdout || '').trim().split('\n').pop();
  let data;
  try { data = JSON.parse(out); } catch { data = { error: 'unparseable: ' + out }; }
  assert.ok(!data.error, `runner probe failed: ${JSON.stringify(data)}`);
  assert.ok(data.total > 0, 'probe should have run benchmarks');
  assert.strictEqual(data.withOwnOutput + data.fromCanned, data.total,
    'withOwnOutput + fromCanned must equal total');
  assert.ok(data.kinds.includes('canned'),
    `expected a "canned" source for benchmarks with no mockOutput; got ${JSON.stringify(data.kinds)}`);
  assert.ok(data.kinds.every((k) => ['adapter', 'command', 'fixture', 'canned'].includes(k)),
    `unexpected outputSource value(s): ${JSON.stringify(data.kinds)}`);
});


