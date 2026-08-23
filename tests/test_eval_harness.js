const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { countTokens } = require("../tools/eval/lib/tokenizer");
const { parseMarkdownAST } = require("../tools/eval/lib/ast");
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

test("AST Parser - parses headings, fences, verdicts, and calculates PCI", () => {
  const markdown = "# Proposal Review\n## Verdict\n[KILL] This idea has fatal unit economic flaws.\n\n```javascript\nconst code = 1;\n```\n";
  const ast = parseMarkdownAST(markdown);
  assert.strictEqual(ast.hasKillVerdict, true);
  assert.strictEqual(ast.hasPassVerdict, false);
  assert.strictEqual(ast.codeBlocks.length, 1);
  assert.strictEqual(ast.violatesZeroBlueprintOnKill, true, "Should flag code generated after [KILL]");
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
    expectedVerdict: "KILL",
    expectedFlawKeywords: ["security invariant", "plaintext"],
    requireZeroBlueprintOnKill: true,
    maxPci: 0.0
  };
  const flawedRubberStamp = { output: "Great idea! Plaintext is fast.\n```javascript\nconst pass = 1;\n```" };
  const failRes = await evaluateTier0(benchmark, flawedRubberStamp);
  assert.strictEqual(failRes.pass, false);
  assert.strictEqual(failRes.metrics.srsrBreach, true);
  const strongPushback = { output: "[KILL] Plaintext passwords violate security invariant." };
  const passRes = await evaluateTier0(benchmark, strongPushback);
  assert.strictEqual(passRes.pass, true);
});

test("Tier 1 Judge - evaluates discrete binary checklist rubrics", async () => {
  const rubric = loadRubric("prd-completeness");
  assert.ok(rubric !== null, "PRD completeness rubric must exist");
  const benchmark = { id: "TEST-PRD", dimension: "prd_completeness" };
  const completePRD = { output: "## Problem Statement\nObjective.\n\n## Acceptance Criteria\nGiven When Then\n\n## Out of Scope\nNon-goals.\n\n## Tasks\nTask 1 breakdown." };
  const result = await evaluateTier1(benchmark, completePRD);
  assert.strictEqual(result.pass, true);
  assert.ok(result.score >= 4.0);
  assert.strictEqual(result.criteriaResults.length, 4);
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

test("Runner - loads all suites and executes matrix cleanly", async () => {
  const suites = loadSuites("all");
  assert.ok(suites.length >= 8, "Must load all agent, skill, and invariant suites");
  const runResult = await runEvaluation({ suite: "invariants/grill-me-spcp", concurrency: 2 });
  assert.strictEqual(runResult.failed, 0);
  assert.strictEqual(runResult.passRate, 1.0);
  assert.strictEqual(runResult.tier0PassRate, 1.0);
  assert.strictEqual(runResult.dimensions.sycophantic_premature_convergence.srsr, 0.0);
  assert.strictEqual(runResult.dimensions.sycophantic_premature_convergence.pci, 0.0);
  assert.strictEqual(runResult.dimensions.sycophantic_premature_convergence.pbcr, 1.0);
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
