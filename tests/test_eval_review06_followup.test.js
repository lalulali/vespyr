const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { executeBenchmark, runEvaluation } = require("../tools/eval/runner");
const { evaluateTier1 } = require("../tools/eval/tier1-judge");

function loadDev01() {
  const suite = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "evals", "suites", "agents", "core-swarm.json"), "utf8"));
  return suite.benchmarks.find(b => b.id === "DEV-01");
}

// --- Review 06 P1-3 follow-on: model output materialized before tests ---

test("Review06-followup - DEV-01 declares fixture+materialize+test wiring", () => {
  const dev01 = loadDev01();
  assert.strictEqual(dev01.fixturePath, "evals/fixtures/dev-tasks");
  assert.deepStrictEqual(dev01.materialize, { file: "rate-limiter.js", fenceIndex: 0 });
  assert.ok(dev01.runTestCommand, "runTestCommand declared");
  assert.ok(dev01.assertTestOutput, "assertTestOutput declared");
});

test("Review06-followup - mock echo goes RED through materialization (no vacuous pass)", async () => {
  const dev01 = loadDev01();
  const res = await executeBenchmark({ ...dev01 }, { mock: true });
  assert.strictEqual(res.passed, false, "mock kitchen-sink echo must not pass a materialized gate");
  assert.strictEqual(res.tier0Passed, false);
  assert.ok(
    (res.failures || []).some(f => f.includes("exit code")),
    `failures must name the test-command failure, got: ${JSON.stringify(res.failures)}`
  );
});

test("Review06-followup - materialize without a code fence fails closed", async () => {
  const res = await executeBenchmark({
    id: "MAT-NOFENCE",
    dimension: "code_quality",
    fixturePath: "evals/fixtures/dev-tasks",
    materialize: { file: "rate-limiter.js", fenceIndex: 0 },
    runTestCommand: "node rate-limiter.test.js",
    mockOutput: "prose with no code fence at all"
  }, { mock: true });
  assert.strictEqual(res.passed, false);
  assert.ok(res.failures.some(f => f.includes("Materialization failed")));
});

test("Review06-followup - fixture-level red-green: correct passes, buggy fails", () => {
  const dir = path.join(__dirname, "..", "evals", "fixtures", "dev-tasks");
  const good = spawnSync(process.execPath, ["rate-limiter.test.js"], { cwd: dir, encoding: "utf8" });
  assert.strictEqual(good.status, 0, `correct fixture must pass: ${good.stderr}`);
  assert.match(good.stdout, /rate-limiter tests passed/);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "review06-buggy-"));
  try {
    fs.copyFileSync(path.join(dir, "rate-limiter.test.js"), path.join(tmp, "rate-limiter.test.js"));
    fs.copyFileSync(path.join(dir, "rate-limiter.buggy.js"), path.join(tmp, "rate-limiter.js"));
    const bad = spawnSync(process.execPath, ["rate-limiter.test.js"], { cwd: tmp, encoding: "utf8" });
    assert.notStrictEqual(bad.status, 0, "buggy variant must fail the same test");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// --- Review 06 P1-1 follow-on: RG-1 requires citation AND resolvable URL ---

test("Review06-followup - RG-1 fails bare [1], passes with URL", async () => {
  const bare = await evaluateTier1(
    { id: "RG-URL-01", dimension: "research_grounding" },
    { output: "Market analysis covering competitors and TAM/SAM trends. [1] Source: Gartner Market Guide 2026. " + "word ".repeat(60) }
  );
  const rg1bare = bare.criteriaResults.find(c => c.id === "RG-1");
  assert.ok(rg1bare, "RG-1 criterion must exist");
  assert.strictEqual(rg1bare.passed, false, "citation shape without URL must fail RG-1");
  const grounded = await evaluateTier1(
    { id: "RG-URL-02", dimension: "research_grounding" },
    { output: "Market analysis covering competitors and TAM/SAM trends. [1] https://example.com/gartner-vector-guide-2026 " + "word ".repeat(60) }
  );
  const rg1grounded = grounded.criteriaResults.find(c => c.id === "RG-1");
  assert.strictEqual(rg1grounded.passed, true, "citation plus URL must pass RG-1");
});

// --- Review 06 P0-3 follow-on: seed is plumbable, not vacuous-by-construction ---

test("Review06-followup - --seed flows into run provenance", async () => {
  const seeded = await runEvaluation({ suite: "invariants/intent-routing", mock: true, seed: 42, concurrency: 2 });
  assert.strictEqual(seeded.provenance.seed, 42);
  const unseeded = await runEvaluation({ suite: "invariants/intent-routing", mock: true, concurrency: 2 });
  assert.strictEqual(unseeded.provenance.seed, null);
});

test("Review06-followup - gate discriminates output polarity via adapter (correct green, buggy red)", async () => {
  const { executeBenchmark } = require("../tools/eval/runner");
  const fs = require("fs");
  const path = require("path");
  const dir = path.join(__dirname, "..", "evals", "fixtures", "dev-tasks");
  const goodCode = fs.readFileSync(path.join(dir, "rate-limiter.js"), "utf8");
  const badCode = fs.readFileSync(path.join(dir, "rate-limiter.buggy.js"), "utf8");
  const bench = {
    id: "MAT-POLARITY",
    dimension: "code_quality",
    fixturePath: "evals/fixtures/dev-tasks",
    materialize: { file: "rate-limiter.js", fenceIndex: 0 },
    runTestCommand: "node rate-limiter.test.js",
    assertTestOutput: ["rate-limiter tests passed"]
  };
  const fence = (code) => "Output below:\n```javascript\n" + code + "\n```\n";
  const green = await executeBenchmark({ ...bench }, {
    executionAdapter: async () => ({ output: fence(goodCode) })
  });
  assert.strictEqual(green.mock, false, "adapter execution is measured, not mock");
  assert.strictEqual(green.tier0Passed, true, `correct model output must pass Tier-0: ${JSON.stringify(green.failures)}`);
  const red = await executeBenchmark({ ...bench }, {
    executionAdapter: async () => ({ output: fence(badCode) })
  });
  assert.strictEqual(red.tier0Passed, false, "buggy model output must fail Tier-0");
  assert.ok(red.failures.some(f => f.includes("exit code")), "red path names the test failure");
});
