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
  // The control. Without this, "always exit 0" would pass MOCK-1 and the gate would have no signal.
  //
  // REWRITTEN 2026-10-15 (blind run 13, @qa-engineer + @code-reviewer, BLOCKING). The original read
  // `artifacts/evals/mock-baseline.json`, which `.gitignore:16` excludes — so on a clean checkout it
  // SKIPPED, and `tests/run-all.js` propagates exit 0 through a skipped test. A clean clone could
  // report a green suite without ever exercising the regression tripwire, which is the one control
  // that proves the mock carve-out is not "always exit 0".
  //
  // It now builds its own baseline in a temp directory and passes `--baseline`. Nothing is read from
  // gitignored state and nothing in the repository is mutated.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mock-regress-'));
  const currentPath = path.join(dir, 'current.json');

  // 1. Establish the real current state through the JSON reporter. No assumptions about which
  //    benchmarks fail — the previous version fell back to a hardcoded id when the run was unreadable.
  const probe = runCli(['run', '--mock', '--reporter', 'json', '-o', currentPath]);
  assert.ok(fs.existsSync(currentPath),
    `the JSON reporter must write a report; exit ${probe.status}, stderr: ${(probe.stderr || '').slice(0, 300)}`);
  const parsed = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
  // The JSON reporter nests them under `run`; the top level carries timestamp/run/diff.
  const benches = (parsed.run && parsed.run.benchmarks) || parsed.benchmarks || [];
  assert.ok(benches.length > 0, 'the mock run must report per-benchmark results');
  const failing = benches.find((b) => b.passed === false && b.id);
  assert.ok(failing, 'the mock run must contain at least one failing benchmark for this control to mean anything');

  // The exact entry shape `recordBaseline` writes, so a synthetic baseline is indistinguishable
  // from a recorded one to the differ.
  const entry = (b, passed) => ({
    id: b.id, name: b.name, suite: b.suite, agent: b.agent, skill: b.skill, dimension: b.dimension,
    model_tier: b.modelTier || null, mock: b.mock === true, rubric_source: b.rubricSource || null,
    tier1_coauthored: b.tier1Coauthored ?? null, token_source: b.tokenSource || 'local',
    passed, tier0_passed: b.tier0Passed, tier1_score: b.tier1Score, tokens: b.tokens,
    provider_tokens: b.providerTokens ?? null, duration_ms: b.durationMs,
    failures: b.failures || [], output_excerpt: '',
  });
  const baselineWith = (pick, label) => {
    const path_ = path.join(dir, label + '.json');
    fs.writeFileSync(path_, JSON.stringify({
      version: 1, generated_at: new Date().toISOString(), harness_version: 'test-fixture',
      mock_mode: true, provenance: 'synthetic fixture built by MOCK-3',
      summary: {}, dimensions: {}, benchmarks: benches.map(pick),
    }, null, 2) + '\n');
    return path_;
  };

  // 2. A baseline claiming the currently-failing benchmark used to pass is a planted regression.
  const regressedPath = baselineWith((b) => entry(b, b.id === failing.id ? true : b.passed === true), 'regressed');
  const res = runCli(['run', '--mock', '--baseline', regressedPath]);
  const out = (res.stdout || '') + (res.stderr || '');
  assert.strictEqual(res.status, 2,
    `a planted PASS->FAIL regression must exit 2; got ${res.status}\n${out.slice(-1200)}`);
  assert.match(out, /REGRESSION DETECTED/i, 'the failure must name itself');

  // 3. The opposite direction, so this is not a blanket rejection: a baseline matching the current
  //    state must still exit 0.
  const honestPath = baselineWith((b) => entry(b, b.passed === true), 'honest');
  const ok = runCli(['run', '--mock', '--baseline', honestPath]);
  assert.strictEqual(ok.status, 0,
    `a matching baseline must return to exit 0; got ${ok.status}\n${((ok.stdout || '') + (ok.stderr || '')).slice(-800)}`);

  fs.rmSync(dir, { recursive: true, force: true });
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


