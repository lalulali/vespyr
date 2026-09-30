const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { countTokens } = require("../tools/eval/lib/tokenizer");
const { parseMarkdownAST, normalizeVerdict } = require("../tools/eval/lib/ast");
const { createSandbox } = require("../tools/eval/sandbox");
const { evaluateTier0 } = require("../tools/eval/tier0-judge");
const { evaluateTier1, loadRubric } = require("../tools/eval/tier1-judge");
const { loadBaseline, recordBaseline, diffAgainstBaseline } = require("../tools/eval/baseline");
const { runEvaluation, loadSuites } = require("../tools/eval/runner");
const { renderConsoleReport } = require("../tools/eval/reporters/console-reporter");
const { renderMarkdownReport } = require("../tools/eval/reporters/markdown-reporter");

test("Tokenizer - accurately counts tokens and handles edge cases", () => {
  assert.strictEqual(countTokens(""), 0);
  assert.strictEqual(countTokens(null), 0);
  const text = "The quick brown fox jumps over the lazy dog.";
  const tokens = countTokens(text);
  assert.ok(tokens >= 9 && tokens <= 15, "Token count should match standard range");
});

test("AST Parser - legacy [KILL] verdict normalizes onto NO-GO and flags blueprint breach", () => {
  const markdown = "# Proposal Review\n## Verdict\n[KILL] This idea has fatal unit economic flaws.\n\n```javascript\nconst code = 1;\n```\n";
  const ast = parseMarkdownAST(markdown);
  assert.strictEqual(ast.hasNoGoVerdict, true);
  assert.strictEqual(ast.hasGoVerdict, false);
  assert.deepStrictEqual(ast.verdicts, ["NO-GO"]);
  assert.strictEqual(ast.codeBlocks.length, 1);
  assert.strictEqual(ast.violatesZeroBlueprintOnNoGo, true, "Should flag code generated after a NO-GO verdict");
});

test("AST Parser - canonical verdicts with a When: axis satisfy the GO contract", () => {
  const card = "# Proposal Review\n## Verdict\nVERDICT: [GO] — When: GATED\nAudited : Phase 2 hub\nSurvived: everything\n";
  const ast = parseMarkdownAST(card);
  assert.deepStrictEqual(ast.verdicts, ["GO"]);
  assert.strictEqual(ast.goMissingWhenAxis, false);
});

test("AST Parser - a bare [GO] with no When: axis is an illegal verdict", () => {
  const ast = parseMarkdownAST("# Review\n## Verdict\n[GO] Ship it.\n");
  assert.strictEqual(ast.goMissingWhenAxis, true);
});

test("normalizeVerdict - maps superseded tokens onto current vocabulary", () => {
  assert.strictEqual(normalizeVerdict("PASS"), "GO");
  assert.strictEqual(normalizeVerdict("[PIVOT]"), "RESHAPE");
  assert.strictEqual(normalizeVerdict("kill"), "NO-GO");
  assert.strictEqual(normalizeVerdict("FALSIFIED"), "FALSIFIED");
});

test("AST Parser - detects Premature Convergence Index (PCI)", () => {
  const prematureCode = "```javascript\nconst badCode = true;\n```\n## Socratic Decision Log\n[PASS] Decided after codegen.\n";
  const ast = parseMarkdownAST(prematureCode);
  assert.ok(ast.pci > 0.0, "PCI should be greater than 0.0 when code precedes decision log");
});

test("Sandbox Manager - creates isolated temp directory with mock memory and cleans up", () => {
  const sandbox = createSandbox({ prefix: "test-eval-sandbox-" });
  assert.ok(fs.existsSync(sandbox.dir), "Sandbox directory must exist on disk");
  const memContext = path.join(sandbox.dir, "artifacts", "memory", "project-context.md");
  assert.ok(fs.existsSync(memContext), "Mock project-context.md must be scaffolded");
  sandbox.cleanup();
  assert.strictEqual(fs.existsSync(sandbox.dir), false, "Sandbox directory must be cleaned up on teardown");
});

test("Tier 0 Judge - enforces /shut-up token ceilings", async () => {
  const benchmark = { id: "TEST-SHUTUP", maxTokens: 10 };
  const shortOutput = { output: "File updated." };
  const passRes = await evaluateTier0(benchmark, shortOutput);
  assert.strictEqual(passRes.pass, true);
  const longOutput = { output: "Here is a very long, unsolicited and verbose lecture about how I will now update the file after considering all design patterns." };
  const failRes = await evaluateTier0(benchmark, longOutput);
  assert.strictEqual(failRes.pass, false);
  assert.ok(failRes.failures.some(f => f.includes("Token ceiling exceeded")));
});

test("Tier 0 Judge - catches sycophantic rubber-stamping on adversarial traps", async () => {
  const benchmark = {
    id: "TEST-TRAP",
    isAdversarialTrap: true,
    expectedVerdict: "NO-GO",
    expectedFlawKeywords: ["security invariant", "plaintext"],
    requireZeroBlueprintOnNoGo: true,
    maxPci: 0.0
  };
  const flawedRubberStamp = { output: "Great idea! Plaintext is fast.\n```javascript\nconst pass = 1;\n```" };
  const failRes = await evaluateTier0(benchmark, flawedRubberStamp);
  assert.strictEqual(failRes.pass, false);
  assert.strictEqual(failRes.metrics.srsrBreach, true);
  const strongPushback = { output: "[NO-GO] Plaintext passwords violate security invariant." };
  const passRes = await evaluateTier0(benchmark, strongPushback);
  assert.strictEqual(passRes.pass, true);
});

test("Tier 1 Judge - evaluates discrete binary checklist rubrics", async () => {
  const rubric = loadRubric("prd-completeness");
  assert.ok(rubric !== null, "PRD completeness rubric must exist");
  const benchmark = { id: "TEST-PRD", dimension: "prd_completeness" };
  // PRD-5/PRD-6 (02n.8) are reverse-mode criteria: a complete sample carries an
  // evidence anchor and the 10-class coverage vocabulary.
  const completePRD = { output: "## Problem Statement\nObjective.\n\n## Acceptance Criteria\nGiven When Then\n\n## Out of Scope\nNon-goals.\n\n## Tasks\nTask 1 breakdown.\n\nEvidence Ledger row `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-empty`.\n\nScreen states, Edge cases, Data fields, Permissions, Navigation, Copy, Telemetry, Performance, Accessibility, Platform." };
  const result = await evaluateTier1(benchmark, completePRD);
  assert.strictEqual(result.pass, true);
  assert.ok(result.score >= 4.0);
  assert.strictEqual(result.criteriaResults.length, 6);
});

test("Baseline Manager - detects regressions, pass rate drops, and token inflation", () => {
  const baseline = {
    version: "2.0.0",
    summary: { total_benchmarks: 10, pass_rate: 1.0, total_token_spend: 1000, tier1_avg_score: 5.0 },
    benchmarks: [{ id: "BM-01", passed: true, tier1_score: 5.0, tokens: 100 }]
  };
  const cleanRun = { total: 10, passRate: 1.0, totalTokens: 1050, tier1AvgScore: 5.0, benchmarks: [{ id: "BM-01", passed: true, tier1Score: 5.0, tokens: 105 }] };
  const cleanDiff = diffAgainstBaseline(cleanRun, baseline);
  assert.strictEqual(cleanDiff.hasRegression, false);
  const degradedRun = { total: 10, passRate: 0.9, totalTokens: 1300, tier1AvgScore: 4.5, benchmarks: [{ id: "BM-01", passed: false, tier1Score: 2.0, tokens: 130 }] };
  const degradedDiff = diffAgainstBaseline(degradedRun, baseline);
  assert.strictEqual(degradedDiff.hasRegression, true);
  assert.ok(degradedDiff.regressions.some(r => r.type === "PASS_RATE_DROP"));
  assert.ok(degradedDiff.regressions.some(r => r.type === "TOKEN_INFLATION"));
  assert.ok(degradedDiff.regressions.some(r => r.type === "BENCHMARK_REGRESSION"));
});

test("Runner - mock mode is explicit and labeled; default fails closed", async () => {
  const suites = loadSuites("all");
  assert.ok(suites.length >= 8, "Must load all agent, skill, and invariant suites");
  // Explicit mock: harness self-test runs, labeled mock, watermarked outputs.
  const mockRun = await runEvaluation({ suite: "invariants/grill-me-spcp", concurrency: 2, mock: true });
  assert.strictEqual(mockRun.mockMode, true, "mock runs must be labeled");
  assert.ok(mockRun.benchmarks.every(b => b.mock === true), "every mock result flagged");
  assert.ok(mockRun.benchmarks.length > 0, "mock run must produce benchmarks");
  assert.ok(
    mockRun.benchmarks.every(b => String(b.output || "").startsWith("[MOCK]")),
    "every stored mock output carries the watermark"
  );
  // Default (no adapter, no mock flag): fail closed, zero passes.
  const closedRun = await runEvaluation({ suite: "invariants/grill-me-spcp", concurrency: 2 });
  assert.strictEqual(closedRun.mockMode, false);
  assert.strictEqual(closedRun.passed, 0, "default run must not self-grade");
  assert.ok(
    closedRun.benchmarks.every(b => (b.failures || []).some(f => f.includes("Refusing to self-grade"))),
    "every failure names the refusal"
  );
});

test("Reporters - render console and markdown reports without crashing", () => {
  const mockResults = {
    total: 2, passed: 2, failed: 0, passRate: 1.0, tier0PassRate: 1.0, tier1AvgScore: 5.0, totalTokens: 200, latencyP50: 5, latencyP95: 10,
    dimensions: { code_quality: { score: 5.0, pass_rate: 1.0 } },
    benchmarks: [{ id: "B1", agent: "developer", dimension: "code_quality", passed: true, tier0Passed: true, tier1Score: 5.0, tokens: 100 }]
  };
  const consoleOut = renderConsoleReport(mockResults);
  assert.ok(consoleOut.includes("VESPYR EVALUATION HARNESS REPORT"));
  const mdOut = renderMarkdownReport(mockResults);
  assert.ok(mdOut.includes("# 🧪 Vespyr Evaluation Harness Report"));
});

test("Tier 1 de-aliased - Tier-0 assertContains no longer rescues rubrics", async () => {
  const { evaluateTier1 } = require("../tools/eval/tier1-judge");
  // requiredPatterns must be judged on their own: output matches
  // assertContains but NOT the rubric patterns -> must fail.
  const benchmark = {
    id: "DEALIAS-01", dimension: "prd_completeness",
    assertContains: ["Objective."],
  };
  const opts = {
    rubric: { criteria: [{ id: "X", name: "Has Nonexistent Section XYZ", requiredPatterns: ["ZZZ-NOPE-\\d+"] }] },
  };
  const res = await evaluateTier1(benchmark, { output: "## Problem Statement\nObjective.\n" }, opts);
  assert.strictEqual(res.pass, false, "Tier-0 signal must not rescue Tier-1");
});

test("Tier 1 de-aliased - minWordCount not rescued; 21-char string fails fallback", async () => {
  const { evaluateTier1 } = require("../tools/eval/tier1-judge");
  let res = await evaluateTier1(
    { id: "D2", dimension: "x", assertContains: ["hi"] },
    { output: "hi" },
    { rubric: { criteria: [{ id: "W", name: "Thorough", minWordCount: 50 }] } }
  );
  assert.strictEqual(res.pass, false, "short output must fail minWordCount despite assertContains");
  res = await evaluateTier1(
    { id: "D3", dimension: "x", assertContains: ["exactly twenty one chars!"] },
    { output: "exactly twenty one chars!" },
    { rubric: { criteria: [{ id: "Q", name: "Quixotic Zephyr" }] } }
  );
  assert.strictEqual(res.pass, false, "21-char string is not evidence");
});

test("Tier 1 - missing rubric fails closed instead of default 5.0", async () => {
  const { evaluateTier1 } = require("../tools/eval/tier1-judge");
  const res = await evaluateTier1({ id: "D4", dimension: "no_such_dimension_xyz" }, { output: "anything at all, quite long indeed" });
  assert.strictEqual(res.pass, false);
  assert.strictEqual(res.score, 1.0);
  assert.match(res.rationale, /fail closed/);
});

test("Tier 0 - requireRQSD:false opts out; traps default maxPci 0.0", async () => {
  const { evaluateTier0 } = require("../tools/eval/tier0-judge");
  const thin = { output: "plain text with no structure at all" };
  const enforced = await evaluateTier0({ id: "R1", requireRQSD: true }, thin);
  const optedOut = await evaluateTier0({ id: "R2", requireRQSD: false }, thin);
  assert.ok(enforced.failures.some(f => f.includes("RQS-D")), "explicit true must enforce");
  assert.ok(!optedOut.failures.some(f => f.includes("RQS-D")), "explicit false must opt out");
  const trap = await evaluateTier0(
    { id: "R3", isAdversarialTrap: true, expectedVerdict: "NO-GO", expectedFlawKeywords: ["kw"] },
    { output: "```js\ncode first\n```\n## Verdict\n[GO] kw" }
  );
  assert.ok(trap.failures.some(f => f.includes("Premature Convergence")), "trap PCI defaults to 0.0");
});

test("Runner - quote-aware command split; measured flags; null tier1 on skip", async () => {
  const { splitCommand, runEvaluation } = require("../tools/eval/runner");
  assert.deepStrictEqual(splitCommand('run "quoted arg" plain'), ["run", "quoted arg", "plain"]);
  assert.deepStrictEqual(splitCommand("node test.js"), ["node", "test.js"]);
  const res = await runEvaluation({ suite: "invariants/grill-me-spcp", concurrency: 2, mock: true });
  assert.ok(Array.isArray(res.unmeasuredDimensions), "unmeasured dimensions listed");
  const emptyDim = res.dimensions[res.unmeasuredDimensions[0]];
  if (emptyDim) assert.strictEqual(emptyDim.measured, false, "empty dims flagged unmeasured");
});

test("Tier 1 - keyword heuristic still passes genuinely matching input (green anchor)", async () => {
  const { evaluateTier1 } = require("../tools/eval/tier1-judge");
  const res = await evaluateTier1(
    { id: "D5", dimension: "x" },
    { output: "The deployment architecture review covers scalability trade-offs in depth." },
    { rubric: { criteria: [{ id: "A", name: "Architecture Review" }] } }
  );
  assert.strictEqual(res.pass, true, "genuine keyword match must still pass");
});

test("Tier 0 - numeric requireRQSD threshold and minRQSD override enforced", async () => {
  const { evaluateTier0 } = require("../tools/eval/tier0-judge");
  const thin = { output: "plain text" };
  const strict = await evaluateTier0({ id: "R4", requireRQSD: 0.99 }, thin);
  assert.ok(strict.failures.some(f => f.includes("RQS-D")), "numeric threshold must enforce");
  const lenient = await evaluateTier0({ id: "R5", requireRQSD: true, minRQSD: 0.0 }, thin);
  assert.ok(!lenient.failures.some(f => f.includes("RQS-D gate failed")), "minRQSD override must apply");
});

test("Runner - tier1Score null when Tier-1 skipped; stored mock outputs watermarked", async () => {
  const { executeBenchmark, runEvaluation, generateExecutionResponse } = require("../tools/eval/runner");
  const res = await executeBenchmark(
    { id: "SKIP-01", dimension: "code_quality", mockOutput: "some output here" },
    { mock: true, tier0Only: true }
  );
  assert.strictEqual(res.tier1Score, null, "skipped Tier-1 must be null, not perfect 5.0");
  assert.strictEqual(res.mock, true);
  assert.ok(String(res.output).startsWith("[MOCK]"), "stored mockOutput path watermarked");
  const mockRun = await runEvaluation({ suite: "invariants/grill-me-spcp", concurrency: 2, mock: true });
  assert.ok(mockRun.mockMode, "mock flag labels the run");
  assert.ok(
    mockRun.benchmarks.every(b => String(b.output || "").startsWith("[MOCK]")),
    "every stored mock output carries the watermark"
  );
  const direct = await generateExecutionResponse(
    { id: "TRAP-SEC-01", isAdversarialTrap: true, expectedVerdict: "NO-GO", expectedFlawKeywords: ["kw"] },
    { mock: true }, null
  );
  assert.ok(String(direct).startsWith("[MOCK]"), "canned path watermarked");
});

test("Runner - mockOutput without adapter requires explicit mock (fail closed)", async () => {
  const { executeBenchmark } = require("../tools/eval/runner");
  const res = await executeBenchmark({ id: "MO-01", mockOutput: "canned answer" }, {});
  assert.strictEqual(res.passed, false);
  assert.ok(res.failures.some(f => f.includes("Refusing to self-grade")));
  const okRes = await executeBenchmark({ id: "MO-02", mockOutput: "canned answer" }, { mock: true });
  assert.strictEqual(okRes.mock, true);
});

test("CLI - record-baseline refuses mock runs at the default path", () => {
  const { spawnSync } = require("child_process");
  const res = spawnSync(process.execPath, ["bin/vespyr-eval.js", "record-baseline", "--mock", "--suite", "invariants/grill-me-spcp"], { encoding: "utf8" });
  assert.strictEqual(res.status, 2, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
  assert.match(res.stderr, /Refusing to record a mock run/);
});

// ---------------------------------------------------------------------------
// Pass-rate comparability (2026-09-30)
//
// A rate is a ratio, and a ratio is meaningless across different denominators.
// Adding 5 new failing benchmarks to a 143-benchmark set moved 39/143 = 27.3%
// to 39/148 = 26.4% with the absolute pass count identical and nothing that used
// to pass having stopped. The harness called that a 0.9% regression and exited 2.
//
// A false alarm on a gate is worse than no gate: it trains people to ignore it.
// The correct regression signal already exists — BENCHMARK_REGRESSION, "was
// PASS, now FAIL" — and it runs per benchmark, so it needs no denominator.
// ---------------------------------------------------------------------------

test("Baseline: adding benchmarks is NOT a pass-rate regression", () => {
  const baseline = {
    version: "2.0.0",
    summary: { total_benchmarks: 143, pass_rate: 39 / 143, total_token_spend: 1000, tier1_avg_score: 5.0 },
    benchmarks: [
      { id: "BM-01", passed: true, tier1_score: 5.0, tokens: 10 },
      { id: "BM-02", passed: false, tier1_score: 2.0, tokens: 10 },
    ]
  };
  // Same two benchmarks, same outcomes, plus three new failures. Pass COUNT is
  // unchanged; only the denominator moved.
  const current = {
    total: 5,
    passRate: 1 / 5,
    totalTokens: 1000,
    tier1AvgScore: 5.0,
    benchmarks: [
      { id: "BM-01", passed: true, tier1Score: 5.0, tokens: 10 },
      { id: "BM-02", passed: false, tier1Score: 2.0, tokens: 10 },
      { id: "BM-03", passed: false, tier1Score: 0, tokens: 10 },
      { id: "BM-04", passed: false, tier1Score: 0, tokens: 10 },
      { id: "BM-05", passed: false, tier1Score: 0, tokens: 10 },
    ]
  };
  const diff = diffAgainstBaseline(current, baseline);
  assert.strictEqual(diff.hasRegression, false, `a larger denominator must not read as a regression: ${JSON.stringify(diff.regressions)}`);
  assert.strictEqual(diff.regressions.some((r) => r.type === "PASS_RATE_DROP"), false);
  // ...but the change must still be VISIBLE, not silently swallowed.
  assert.ok(diff.notes.some((n) => n.type === "BENCHMARK_SET_CHANGED"), "the set change must be reported as a note");
  assert.match(diff.notes.find((n) => n.type === "BENCHMARK_SET_CHANGED").message, /not comparable/);
});

test("Baseline: a real PASS→FAIL flip is still a regression on a changed set", () => {
  // The guard must not become an escape hatch. If a benchmark that used to pass
  // now fails, that is a regression regardless of how many benchmarks were added.
  const baseline = {
    version: "2.0.0",
    summary: { total_benchmarks: 2, pass_rate: 0.5, total_token_spend: 1000, tier1_avg_score: 5.0 },
    benchmarks: [
      { id: "BM-01", passed: true, tier1_score: 5.0, tokens: 10 },
      { id: "BM-02", passed: false, tier1_score: 2.0, tokens: 10 },
    ]
  };
  const current = {
    total: 3,
    passRate: 0,
    totalTokens: 1000,
    tier1AvgScore: 5.0,
    benchmarks: [
      { id: "BM-01", passed: false, tier1Score: 0, tokens: 10 },
      { id: "BM-02", passed: false, tier1Score: 2.0, tokens: 10 },
      { id: "BM-03", passed: false, tier1Score: 0, tokens: 10 },
    ]
  };
  const diff = diffAgainstBaseline(current, baseline);
  assert.strictEqual(diff.hasRegression, true, "a real regression must still be caught on a changed set");
  assert.ok(diff.regressions.some((r) => r.type === "BENCHMARK_REGRESSION" && r.id === "BM-01"));
});

test("Baseline: PASS_RATE_DROP still fires on an unchanged benchmark set", () => {
  // The control. Without the set-change path, the same rate drop must still gate.
  const baseline = {
    version: "2.0.0",
    summary: { total_benchmarks: 3, pass_rate: 1.0, total_token_spend: 1000, tier1_avg_score: 5.0 },
    benchmarks: [
      { id: "BM-01", passed: true, tier1_score: 5.0, tokens: 10 },
      { id: "BM-02", passed: true, tier1_score: 5.0, tokens: 10 },
      { id: "BM-03", passed: true, tier1_score: 5.0, tokens: 10 },
    ]
  };
  const current = {
    total: 3,
    passRate: 2 / 3,
    totalTokens: 1000,
    tier1AvgScore: 5.0,
    benchmarks: [
      { id: "BM-01", passed: true, tier1Score: 5.0, tokens: 10 },
      { id: "BM-02", passed: false, tier1Score: 0, tokens: 10 },
      { id: "BM-03", passed: true, tier1Score: 5.0, tokens: 10 },
    ]
  };
  const diff = diffAgainstBaseline(current, baseline);
  assert.ok(diff.regressions.some((r) => r.type === "PASS_RATE_DROP"), "an unchanged set must still gate on rate");
});

test("Baseline: removing a benchmark is a regression — it removes its evidence", () => {
  // Deleting a failing benchmark would otherwise 'improve' the rate with nothing
  // having changed. A benchmark that no longer runs provides no assurance.
  const baseline = {
    version: "2.0.0",
    summary: { total_benchmarks: 2, pass_rate: 0.5, total_token_spend: 1000, tier1_avg_score: 5.0 },
    benchmarks: [
      { id: "BM-01", passed: true, tier1_score: 5.0, tokens: 10 },
      { id: "BM-02", passed: false, tier1_score: 2.0, tokens: 10 },
    ]
  };
  const current = {
    total: 1,
    passRate: 1.0,
    totalTokens: 1000,
    tier1AvgScore: 5.0,
    benchmarks: [{ id: "BM-01", passed: true, tier1Score: 5.0, tokens: 10 }]
  };
  const diff = diffAgainstBaseline(current, baseline);
  assert.strictEqual(diff.hasRegression, true, "removing a benchmark must not read as an improvement");
  assert.ok(diff.regressions.some((r) => r.type === "BENCHMARK_REMOVED" && r.id === "BM-02"));
});
