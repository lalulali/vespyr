/**
 * Test Runner & Concurrency Orchestrator for vespyr-eval (WS-1 Task 1.3)
 * Manages benchmark matrix execution, ephemeral sandboxing, Tier 0 -> Tier 1 gating,
 * and comprehensive telemetry aggregation (INV-MOD-1, INV-JUDGE-1, INV-EXEC-1).
 */

const fs = require("fs");
const path = require("path");
const { createSandbox } = require("./sandbox");
const { evaluateTier0 } = require("./tier0-judge");
const { evaluateTier1 } = require("./tier1-judge");
const { countTokens } = require("./lib/tokenizer");

const SUITES_DIR = path.join(__dirname, "..", "..", "evals", "suites");

/**
 * Best-effort git SHA probe for run provenance (review 04 residual: SHA was
 * env-only). Order: explicit env override, then a bounded read-only
 * `git rev-parse`. Never throws, never blocks: 2s timeout, stderr silenced,
 * any failure yields null (e.g. packaged installs without .git).
 */
function resolveGitSha() {
  try {
    if (process.env.VESPYR_GIT_SHA) return String(process.env.VESPYR_GIT_SHA);
    if (process.env.GITHUB_SHA) return String(process.env.GITHUB_SHA);
    const { spawnSync } = require("child_process");
    const res = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: path.join(__dirname, "..", ".."),
      encoding: "utf8",
      timeout: 2000,
      stdio: ["ignore", "pipe", "ignore"]
    });
    const sha = res && typeof res.stdout === "string" ? res.stdout.trim() : "";
    return /^[0-9a-f]{4,40}$/i.test(sha) ? sha : null;
  } catch (e) {
    return null;
  }
}

/**
 * Loads all benchmark suites or filters by suite name.
 * @param {string} [suiteFilter="all"]
 * @returns {Array<Object>} List of suites
 */
function loadSuites(suiteFilter = "all") {
  const suites = [];
  const warnings = [];

  function scanDir(dir, relPath = "") {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relEntryPath = relPath ? (relPath + "/" + entry.name) : entry.name;
      if (entry.isDirectory()) {
        scanDir(fullPath, relEntryPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, "utf8"));
          suites.push({
            filePath: fullPath,
            relPath: relEntryPath.replace(/\.json$/, ""),
            data: content
          });
        } catch (e) {
          // Malformed suites are reported, never silently swallowed: a broken
          // suite file previously vanished from the run with zero signal.
          warnings.push({ file: fullPath, error: e.message });
        }
      }
    }
  }

  scanDir(SUITES_DIR);

  let filtered = suites;
  if (suiteFilter && suiteFilter !== "all") {
    filtered = suites.filter(s => {
      return s.relPath === suiteFilter ||
             s.relPath.startsWith(suiteFilter) ||
             (s.data && s.data.suite === suiteFilter);
    });
  }
  filtered.warnings = warnings;
  return filtered;
}

/**
 * Generates an execution response for benchmark evaluation.
 *
 * Fail-closed contract (de-circularized): canned fixtures (adversarial-trap
 * echo, /shut-up strings, per-agent/per-skill templates, generic fallback)
 * are ONLY served when the caller explicitly opts into mock mode
 * (`options.mock === true`, i.e. `--adapter mock` / `--mock`). Without a
 * real executionAdapter, an executionCommand, a benchmark mockOutput, or
 * explicit mock mode, this THROWS instead of grading the harness against
 * its own answer key. Mock outputs carry a `[MOCK]` watermark.
 */
async function generateExecutionResponse(benchmark, options = {}, sandbox = null) {
  if (options.executionAdapter && typeof options.executionAdapter === "function") {
    const res = await options.executionAdapter(benchmark, { options, sandbox });
    if (res !== undefined && res !== null) return res;
  }

  if (sandbox && benchmark.executionCommand) {
    validateBenchmarkCommand(benchmark.executionCommand);
    const cmdParts = splitCommand(benchmark.executionCommand);
    const res = await sandbox.runCommand(cmdParts[0], cmdParts.slice(1));
    return res.stdout || res.output || res.stderr;
  }

  if (benchmark.mockOutput) {
    // Author-supplied fixture output: legitimate for hermetic tests, but it
    // is still a mock — flag it unless a real adapter is executing.
    // Watermarked like canned fixtures: judges match substrings, and a
    // prefix preserves every match while marking provenance.
    if (options.executionAdapter && typeof options.executionAdapter === "function") {
      return benchmark.mockOutput;
    }
    if (options.mock === true) {
      return "[MOCK] " + benchmark.mockOutput;
    }
    throw new Error(
      `No execution path for benchmark ${benchmark.id}: mockOutput requires explicit ` +
      `--mock/--adapter mock (fixture output is not a measurement). Refusing to self-grade.`
    );
  }

  if (options.mock !== true) {
    throw new Error(
      `No execution path for benchmark ${benchmark.id}: no executionAdapter, ` +
      `no executionCommand, no mockOutput, and mock mode not enabled. ` +
      `Pass --adapter <real-adapter> or explicit --mock/--adapter mock. ` +
      `Refusing to self-grade.`
    );
  }

  const canned = await cannedMockResponse(benchmark);
  return "[MOCK] " + canned;
}

// Quote-aware splitter shared from lib/process.js (single source with tier0-judge).
const { splitCommand, validateBenchmarkCommand } = require("./lib/process");

async function cannedMockResponse(benchmark) {

  // 1. Adversarial Traps — DELETED trap echo (review 04 §6.1): the old fixture
  // derived its output from the answer key (expectedVerdict +
  // expectedFlawKeywords), so mock mode "passed" every trap with zero model.
  // The canned trap now intentionally carries NO verdict and NO flaw keywords:
  // mock runs go RED on traps, demonstrating harness mechanics rather than
  // laundering fixture-recall as pushback capability.
  if (benchmark.isAdversarialTrap) {
    return "Unmeasured fixture response: no model executed. Adversarial traps require a real adapter to demonstrate pushback; this canned output carries no verdict.";
  }

  // 2. /shut-up Mode Fixtures
  if (benchmark.prompt && benchmark.prompt.startsWith("/shut-up")) {
    if (benchmark.assertContains && benchmark.assertContains.includes("confirm")) {
      return "Warning: destructive operation requested. Please confirm execution.";
    }
    if (benchmark.prompt.includes("package.json")) {
      return "package.json updated to 2.0.8.";
    }
    if (benchmark.prompt.includes("frontmatter") || benchmark.prompt.includes("validate_frontmatter")) {
      return "validate_frontmatter check passed with 0 errors.";
    }
    if (benchmark.prompt.includes("test/mock.js")) {
      return "test/mock.js created.";
    }
    if (benchmark.prompt.includes("git status")) {
      return "git status: working tree clean on branch main.";
    }
    if (benchmark.prompt.includes("current project phase")) {
      return "Current phase: validation.";
    }
    if (benchmark.prompt.includes("index.js")) {
      return "index.js updated with license comment appended.";
    }
    if (benchmark.prompt.includes("README.md")) {
      return "README.md formatted and trimmed.";
    }
    return "Operation completed under /shut-up.";
  }

  // 3. Agent Personas
  if (benchmark.agent) {
    switch (benchmark.agent) {
      case "founder":
        return "## Socratic Decision Log\n[GO] Validated concept meets unit economics, TAM/SAM, and strategic ROI criteria.\n\nAcceptance Criteria verified.";
      case "developer":
        return "Implemented module " + benchmark.id + ".\n```javascript\nconst rateLimiter = { tokens: 10, capacity: 10, refill: 1 };\nfunction allowRequest() { return true; }\nconst idempotencyKey = 'key_123'; const status = 200; const conflictStatus = 409;\nconst tenantId = 't_1'; const role = 'admin'; const permissions = ['read', 'write'];\nfunction hasPermission(r, p) { return true; }\nconst CREATED = 'CREATED'; const PAID = 'PAID'; const SHIPPED = 'SHIPPED';\nfunction transition(s) { return s; }\nfunction verify(t) { return true; } const blacklist = new Set(); const bearer = 'token'; const unauthorized = 401;\nfunction parse(chunk) { return chunk; } const stream = { on: () => {} }; const error = null;\nconst cursor = 'cur_1'; const limit = 10; const cache = new Map(); const ttl = 300;\nconst parameterized = true; const path = require('path'); path.normalize('/safe'); function sanitize(q) { return q; }\nconst backoff = 1000; const circuit = 'CLOSED'; const OPEN = 'OPEN'; const CLOSED = 'CLOSED'; function retry() {}\nconst service = {}; const controller = {}; function refactor() {}\nmodule.exports = { rateLimiter, allowRequest, idempotencyKey, status, conflictStatus, tenantId, role, permissions, hasPermission, CREATED, PAID, SHIPPED, transition, verify, blacklist, bearer, unauthorized, parse, stream, error, cursor, limit, cache, ttl, parameterized, sanitize, backoff, circuit, OPEN, CLOSED, retry, service, controller, refactor };\n```\nAll unit tests passing with clean diff, retry mechanisms, and sanitized parameterized queries.";
      case "product-manager":
        return "## Problem Statement\nStructured problem statement for user verification.\n\n## Acceptance Criteria\n- Given valid email, When submitted, Then token is generated.\n\n## Out of Scope\nThird-party SMS verification.\n\n## Tasks\n- Task 1: API Endpoint (2 hours)\n- Task 2: Schema update (1 hour)";
      case "product-designer":
        return "## Screen Specifications & Layout\n- Empty State: Display empty placeholder card.\n- Loading State: Skeleton shimmer active.\n- Error State: Accessible alert banner.\n- Success State: User profile rendered.\n- Tokens: Color primary, spacing md, typography body.\nWCAG 2.2 AA compliant contrast and keyboard focus.";
      case "architect":
        return "## ADR-010 Multi-Tenant Boundary\n### Context Boundary\nInvariants and architectural trade-offs analyzed. Strict tenant boundary isolation enforced.";
      case "tech-lead":
        return "## Granular Execution Breakdown\n- Task 1: API Endpoint (2 hours)\n- Task 2: Schema Migration (2 hours)\nDependencies: Sequential DAG. Blast Radius: Isolated to auth module.";
      case "code-reviewer":
        return "## Code Review Audit\n- Findings: Ensure HttpOnly, SameSite, and Secure flags on auth cookies.\n- Recommendation: Approve PR with non-blocking suggestions.";
      case "qa-engineer":
        return "## QA Test Plan & Edge Cases\n- Edge Cases: Network timeout, invalid payload, concurrency collision.\n- Test Suite: 15 unit and integration assertions.\n- Pass/Fail Criteria: 100% test pass required for release gate.\n- Regression Suite: Full regression test coverage verified.";
      case "researcher":
        return "## Market Research & Competitive Landscape\nTAM/SAM market analysis covering key competitors, pricing models, and strategic differentiators. [1] Source: Gartner Market Guide 2026.";
      case "user-researcher":
        return "## User Interview Synthesis\nPersona card mapping key pain points, Jobs to be Done, user behaviors, and primary goals.";
      case "ux-researcher":
        return "## Heuristic Usability Evaluation\nNielsen-Norman heuristic review identifying visibility of system status, interaction friction, and recommendations.";
      case "shifu":
        return "## Pedagogical Curriculum & Syllabus\nStructured 3-part learning syllabus: Prerequisites, Learning Objectives, Module 1 Raft Consensus, and Assessment.";
      case "data-analyst":
        return "## Telemetry Event Schema\nEvent schema defining event_name, properties payload, funnel stages, and conversion_rate metrics.";
      case "security-engineer":
        return "## STRIDE Threat Model & Security Audit\nThreat analysis covering Spoofing, Tampering, Information Disclosure, and automated mitigation controls.";
      case "performance-engineer":
        return "## Database Query Profiling & Optimization\nEXPLAIN query plan analysis, B-tree Index optimization, p95 latency reduction, and Cache invalidation strategy.";
      case "ml-ai-engineer":
        return "## RAG Pipeline & Retrieval Architecture\nHybrid vector and keyword retrieval pipeline with Chunking, Embedding models, and Reranking algorithms.";
      case "ml-ai-ops":
        return "## Model Drift Monitoring Runbook\nProduction serving runbook with Drift detection thresholds, automated Alert routing, Fallback model routing, and Rollback triggers.";
      case "devops-engineer":
        return "## GitHub Actions CI/CD Workflow\nWorkflow definition with jobs, steps, actions/checkout, and lint/test matrix execution.";
      case "technical-writer":
        return "## OpenAPI 3.0 Contract & Guide\n```yaml\nopenapi: 3.0\npaths:\n  /auth/token:\n    post:\n      responses:\n        200:\n          description: Success\nschemas:\n  Token:\n    type: object\n```\nDeveloper integration guide.";
      case "memory-controller":
        return "## Memory Controller Operations\nContext loaded from project-context, active-decisions, and patterns-and-conventions.\n<!-- BEGIN MACHINE STATE -->\n- Stack: JavaScript\n- Active Phase: validation\n<!-- END MACHINE STATE -->\nsession-write complete.";
      default:
        return "Execution completed for @" + benchmark.agent + ". Domain criteria and invariants satisfied.";
    }
  }

  // 4. Skills Workflows
  if (benchmark.skill) {
    switch (benchmark.skill) {
      case "validate-idea":
        return "## Socratic Verdict Gate\n[GO] Validated concept. Assumptions matrix evaluated. Risk register updated.";
      case "unpack-problem":
        return "## Problem Definition & Exploration\n- Problem Definition: Clear statement of user friction.\n- User Impact: Quantified reach and severity.\n- Root Cause: Explored without premature solution jumping.";
      case "root-cause":
        return "## Root Cause Analysis\n- 5 Whys: Deep five-level breakdown.\n- Fishbone: People, Process, Technology categories.\n- Root Cause: Pinpointed failure mode.\n- Action Item: Preventative invariant guard.";
      case "shape-up":
        return "## Shape Up Pitch Brief\n- Appetite: 2 weeks.\n- Boundaries: Fixed scope.\n- Rabbit Holes: Identified and fenced out.";
      case "brainstorming":
        return "## Brainstorming Session\n- SCAMPER method applied.\n- Ideas: 10 structured concepts.\n- Prioritization: Effort vs impact matrix.";
      case "explore-idea":
        return "## Evidence-Backed Research\n- Market Analysis: Total addressable market trends.\n- Competitors: Competitive landscape mapping.\n- Findings: Key differentiators and opportunities. [1]";
      case "research-plan":
        return "## Comprehensive Research Plan\n- Goals: Study objectives.\n- Profile Questions: Demographics and tooling.\n- Behavioral Questions: Workflow observations.";
      case "empathy-map":
        return "## User Empathy Map Canvas\n- Says: Direct interview quotes.\n- Thinks: Unspoken motivations.\n- Does: Observed actions.\n- Feels: Frustrations and delights.";
      case "journey-map":
        return "## User Journey Map\n- Touchpoints: Discovery, Onboarding, Daily Use.\n- Emotional State: Delight and friction curve.\n- Friction: Identified bottlenecks.";
      case "jtbd":
        return "## Jobs to be Done & Canvas\n- Job Statement: When X, I want to Y, so I can Z.\n- Outcome: Measurable success criteria.\n- How Might We: Key opportunity vectors.";
      case "discovery-report":
        return "## Discovery & Usability Report\n- Executive Summary: Key takeaways.\n- Usability Score: System Usability Scale 85/100.\n- Next Steps: Design backlog readiness.";
      case "design":
        return "## Product Specification\n- Screen States: Empty, Loading, Error, Success.\n- Interactions: User flows and transitions.\n- Components: Design system atomic elements.";
      case "motion":
        return "## Motion Specification\n- Duration: 200ms.\n- Easing: ease-out-cubic.\n- Trigger: Hover and active states.";
      case "validation-patterns":
        return "## Validation Pattern Matrix\n- Pattern: Concierge MVP.\n- Hypothesis: User willingness to pay.\n- Success Metric: 15% conversion.";
      case "develop":
        return "## Step 1: Spec Review\nStep 2: Implementation plan\nStep 3: Verification\nStep 4: Review\nSession Complete with all acceptance criteria verified.";
      case "plan":
        return "## Standalone Execution Plan\n- Tasks: Granular breakdown.\n- Dependencies: Sequential DAG.\n- Estimates: 1-4 hour sizing.";
      case "review":
        return "## Standalone Code Audit\n- Audit: Read-only security and correctness review.\n- Findings: Code standards verified.\n- Recommendations: Approved for merge.";
      case "test":
        return "## QA Test Execution Report\n- Test Execution: 20 unit and integration tests run.\n- Pass/Fail: 20/20 Passed (100%).\n- Coverage: 95% line coverage.";
      case "launch":
        return "## Release Readiness Gate\n- Readiness Gate: UTTERLY SATISFIED unanimous pass.\n- Smoke Tests: Post-deploy smoke test green.\n- Rollback Plan: Pinned prior version sha.";
      case "iterate":
        return "## Feature Iteration Plan\n- Telemetry Analysis: Retention funnel telemetry.\n- Hypothesis: Improved onboarding UX.\n- Change Scope: Targeted button flow.";
      case "incident":
        return "## Production Incident Triage\n- Severity: P1 - Degraded auth endpoint.\n- Mitigation: Rolled back to previous release.\n- Post-Mortem: Root cause and monitoring gap identified.";
      case "retro":
        return "## Post-Cycle Retrospective\n- Lessons Learned: Architecture and testing takeaways.\n- Compaction: Memory compacted to <500 tokens.\n- Action Items: Team workflow adjustments.";
      case "analyze-data":
        return "## Exploratory Data Analysis\n- Dataset: 10,000 telemetry events.\n- Distribution: Normal distribution with long tail.\n- Insights: Conversion bottleneck at step 3.";
      case "sprint-status":
        return "## Sprint Status Kanban\n- Sprint: Sprint 1.\n- Phase: validation.\n- Status: In progress.";
      case "teach-me":
        return "## Learning Overview\n- Concept: Distributed consensus.\n- Explanation: High-level mental model and deep dive.\n- Key Takeaways: Summary checklist.";
      case "craft-lesson":
        return "## Educational Material\n- Objectives: Bloom taxonomy goals.\n- Handbook: Complete student guide.\n- Cheatsheet: Quick reference syntax.";
      case "round-table":
        return "### Live Dialogue Stream\n### @founder -> @architect: Challenging unit economics.\n[GO] Verdict Gate reached with unified consensus.";
      case "create-skill":
        return "## Skill Scaffold\n- SKILL.md: Frontmatter and step instructions generated.\n- Frontmatter: Valid schema.\n- Workflow: Verified step gates.";
      case "customize-skill":
        return "## Surgical Skill Customization\n- Diff: Surgical block edit applied.\n- Customization: User instructions mapped.\n- Preserve: Core invariants preserved.";
      case "create-agent":
        return "## Agent Persona Scaffold\n- Role: Specialized domain role.\n- Socratic Stance: Explicit challenge stance.\n- Guardrails: Safety invariants declared.";
      case "customize-agent":
        return "## Agent Customization TOML\n- Override: TOML configuration written.\n- Model: Pinned model selection.\n- Temperature: Pinned temperature setting.";
      case "kanban":
        return "## Kanban Board State\n- Backlog: 5 items.\n- In Progress: 2 items.\n- Done: 10 items.";
      case "status":
        return "## Project Status Snapshot\n- Active Phase: validation.\n- Blockers: 0 active blockers.\n- Memory Health: Green (<500 tokens).";
      case "phase":
        return "## Phase Switch Gate\n- Current Phase: validation.\n- Transition: Prerequisites checked.";
      case "memory":
        return "## Memory Search Results\n- Search: Keyword match.\n- Results: 3 relevant historical decisions.\n- Context: Retrieved context.";
      default:
        return "Skill /" + benchmark.skill + " executed with verified output schema.";
    }
  }

  return "Standard benchmark execution output.";
}

/**
 * Executes a single benchmark test case inside an ephemeral sandbox.
 */
async function executeBenchmark(benchmark, options = {}) {
  const sandbox = createSandbox({
    prefix: "vespyr-eval-" + String(benchmark.id || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "-") + "-"
  });

  const startTime = Date.now();

  // Global --min-rqsd floor (review 04 residual: RQS-D unenforced by
  // default). Applies only when the benchmark declares NO explicit RQS-D
  // contract of its own — an explicit `requireRQSD:false` opt-out or a
  // benchmark-level threshold always wins over the global flag.
  let effectiveBenchmark = benchmark;
  if (options.minRQSD != null && benchmark.minRQSD == null && benchmark.requireRQSD === undefined) {
    effectiveBenchmark = { ...benchmark, requireRQSD: options.minRQSD };
  }
  const benchmarkRef = effectiveBenchmark;

  try {
    const rawResult = await generateExecutionResponse(benchmarkRef, options, sandbox);
    const executionOutput = typeof rawResult === "object" && rawResult !== null ? (rawResult.output || rawResult.text || "") : String(rawResult || "");

    const executionResult = {
      output: executionOutput,
      stdout: executionOutput,
      stderr: (typeof rawResult === "object" && rawResult !== null && rawResult.stderr) || "",
      exitCode: (typeof rawResult === "object" && rawResult !== null && rawResult.exitCode !== undefined) ? rawResult.exitCode : 0
    };

    // 2. Tier 0 Deterministic Evaluation
    const t0Result = await evaluateTier0(benchmarkRef, executionResult, sandbox);

    let t1Result = null;
    if (t0Result.pass && !options.tier0Only) {
      // 3. Tier 1 Semantic Evaluation (only if Tier 0 passes)
      t1Result = await evaluateTier1(benchmarkRef, executionResult);
    }

    const durationMs = Date.now() - startTime;
    const passed = t0Result.pass && (t1Result ? t1Result.pass : true);

    // Mock provenance: true unless a real model adapter executed OR a real
    // sandboxed command produced the output. Canned fixtures and fixture
    // mockOutput without an adapter are mocks, even when judgments pass.
    const measuredExecution = !!(
      (options.executionAdapter && typeof options.executionAdapter === "function") ||
      (sandbox && benchmarkRef.executionCommand)
    );
    // Token provenance: provider `usage.total_tokens` and the local
    // deterministic counter are INCOMMENSURABLE units (different tokenizers).
    // `tokens` is always the local count (consistent denominator for the 15%
    // inflation gate); provider figures ride alongside, never mixed in.
    const providerTokens = (typeof rawResult === "object" && rawResult !== null && typeof rawResult.tokens === "number")
      ? rawResult.tokens
      : null;
    const localTokens = countTokens(executionOutput);
    return {
      id: benchmarkRef.id,
      name: benchmarkRef.name || benchmarkRef.id,
      suite: benchmarkRef.suite || "default",
      agent: benchmarkRef.agent || null,
      skill: benchmarkRef.skill || null,
      dimension: benchmarkRef.dimension || "general",
      modelTier: options.model || 'inherit',
      mock: !measuredExecution,
      passed,
      tier0Passed: t0Result.pass,
      tier1Score: t1Result ? t1Result.score : null,
      // Held-out / co-authorship provenance (review 04 residual): which
      // rubric judged this output and whether Tier-1 re-measured Tier-0's
      // author-chosen vocabulary.
      rubricSource: t1Result ? (t1Result.rubricSource || null) : null,
      tier1Overlap: t1Result ? (t1Result.tier1Overlap ?? null) : null,
      tier1Coauthored: t1Result ? (t1Result.tier1Coauthored ?? null) : null,
      tokens: localTokens,
      providerTokens,
      tokenSource: providerTokens !== null ? "provider+local" : "local",
      durationMs,
      output: executionOutput,
      failures: t0Result.failures || [],
      t0Metrics: t0Result.metrics,
      t1Results: t1Result
    };
  } catch (err) {
    return {
      id: benchmark.id,
      name: benchmark.name || benchmark.id,
      suite: benchmark.suite || "default",
      agent: benchmark.agent || null,
      skill: benchmark.skill || null,
      dimension: benchmark.dimension || "general",
      modelTier: options.model || 'inherit',
      mock: options.mock === true,
      passed: false,
      tier0Passed: false,
      tier1Score: null,
      rubricSource: null,
      tier1Overlap: null,
      tier1Coauthored: null,
      tokens: 0,
      providerTokens: null,
      tokenSource: "local",
      durationMs: Date.now() - startTime,
      output: "",
      failures: [err.message]
    };
  } finally {
    sandbox.cleanup();
  }
}

/**
 * Runs a collection of benchmarks with concurrency control.
 */
async function runEvaluation(options = {}) {
  const suites = loadSuites(options.suite || "all");
  let allBenchmarks = [];

  for (const s of suites) {
    const bms = s.data.benchmarks || [];
    for (const b of bms) {
      allBenchmarks.push({
        ...b,
        suite: s.data.suite || s.relPath
      });
    }
  }

  // Filter by agent if specified
  if (options.agent && options.agent !== "all") {
    allBenchmarks = allBenchmarks.filter(b => b.agent === options.agent);
  }

  // Filter by skill if specified
  if (options.skill && options.skill !== "all") {
    allBenchmarks = allBenchmarks.filter(b => b.skill === options.skill);
  }

  // Model tier handling (02l Option A — thin: record model tier, no filtering unless suite declares model)
  const modelTier = options.model && options.model !== 'inherit' ? options.model : 'inherit';
  if (modelTier !== 'inherit') {
    // If benchmarks declare requiredModelTier, filter; otherwise just tag results for diffing
    const hasModelField = allBenchmarks.some(b => b.requiredModelTier || b.modelTier);
    if (hasModelField) {
      allBenchmarks = allBenchmarks.filter(b => {
        const req = b.requiredModelTier || b.modelTier;
        if (!req) return true;
        return req === modelTier || req === 'any';
      });
    }
  }

  if (!options.executionAdapter) {
    const { resolveAdapter } = require("./adapters");
    options.executionAdapter = resolveAdapter(options);
  }
  // Mock mode is explicit-only: `--adapter mock` / `--mock`. Auto-resolution
  // with no keys yields NO adapter and NO mock — benchmarks fail closed
  // instead of self-grading (de-circularized).
  if (options.mock === undefined || options.mock === null) {
    options.mock = (options.adapter || process.env.VESPYR_EVAL_ADAPTER || "").toLowerCase() === "mock";
  }

  const total = allBenchmarks.length;
  const suiteWarnings = suites.warnings || [];
  const results = [];
  const concurrency = options.concurrency || 4;

  // failFast stops ALL workers on first failure (shared flag): previously
  // only the observing worker broke its loop while siblings drained the
  // queue, and passRate divided by the pre-filter total either way.
  let failFastStop = false;
  let activeIndex = 0;
  async function worker() {
    while (!failFastStop && activeIndex < allBenchmarks.length) {
      const index = activeIndex++;
      if (index >= allBenchmarks.length) break;
      const benchmark = allBenchmarks[index];
      const res = await executeBenchmark(benchmark, options);
      results.push(res);
      if (options.failFast && !res.passed) {
        failFastStop = true;
        break;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(concurrency, allBenchmarks.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  const failFastTruncated = results.length < total;

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  // Empty runs score 0, never a fabricated perfect 1.0: previously zero
  // benchmarks reported passRate 1.0 (green on nothing measured).
  const passRate = total > 0 ? Number((passed / total).toFixed(4)) : 0;
  const tier0PassedCount = results.filter(r => r.tier0Passed).length;
  const tier0PassRate = total > 0 ? Number((tier0PassedCount / total).toFixed(4)) : 0;

  // Token sums use LOCAL counts only (consistent units); provider figures
  // aggregate separately and never feed the inflation gate.
  const totalTokens = results.reduce((sum, r) => sum + (r.tokens || 0), 0);
  const providerTokenRuns = results.filter(r => typeof r.providerTokens === "number");
  const totalProviderTokens = providerTokenRuns.length > 0
    ? providerTokenRuns.reduce((sum, r) => sum + r.providerTokens, 0)
    : null;
  const t1Scores = results.map(r => r.tier1Score).filter(s => typeof s === "number");
  const tier1AvgScore = t1Scores.length > 0 ? Number((t1Scores.reduce((a, b) => a + b, 0) / t1Scores.length).toFixed(2)) : null;
  const mockMode = results.length > 0 && results.every(r => r.mock === true);

  const durations = results.map(r => r.durationMs).sort((a, b) => a - b);
  const latencyP50 = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
  // Nearest-rank P95: ceil(0.95*n)-th value (1-indexed), clamped.
  const latencyP95 = durations.length > 0 ? durations[Math.min(durations.length - 1, Math.max(0, Math.ceil(durations.length * 0.95) - 1))] : 0;

  // Compute 7-dimension breakdowns & SPC metrics dynamically from benchmark results
  const standardDimensions = [
    "research_grounding",
    "prd_completeness",
    "a11y_design",
    "code_quality",
    "req_to_impl",
    "sycophantic_premature_convergence",
    "memory_adherence"
  ];

  const dimensions = {};
  const unmeasuredDimensions = [];
  for (const dim of standardDimensions) {
    const dimResults = results.filter(r => r.dimension === dim);
    if (dimResults.length === 0) {
      // Unmeasured dimension: nulls, flagged — never a fabricated perfect.
      // (Previous code reported score 5.0 / pass 1.0 for zero samples.)
      unmeasuredDimensions.push(dim);
      dimensions[dim] = { measured: false, score: null, pass_rate: null };
      continue;
    }

    const dimPassed = dimResults.filter(r => r.passed).length;
    const dimPassRate = Number((dimPassed / dimResults.length).toFixed(4));
    const dimScores = dimResults.map(r => r.tier1Score).filter(s => typeof s === "number");
    const avgScore = dimScores.length > 0 ? Number((dimScores.reduce((a, b) => a + b, 0) / dimScores.length).toFixed(2)) : null;

    const dimData = {
      measured: true,
      score: avgScore,
      pass_rate: dimPassRate
    };

    if (dim === "sycophantic_premature_convergence") {
      const spcResults = dimResults.filter(r => r.t0Metrics);
      const srsrCount = spcResults.filter(r => r.t0Metrics && r.t0Metrics.srsrBreach).length;
      const srsr = spcResults.length > 0 ? Number((srsrCount / spcResults.length).toFixed(4)) : 0.0;
      const pciMax = spcResults.length > 0 ? Math.max(...spcResults.map(r => (r.t0Metrics && r.t0Metrics.pci) || 0)) : 0.0;
      dimData.srsr = srsr;
      dimData.pci = pciMax;
      // PBCR is definitionally 1 - SRSR (catch rate vs rubber-stamp rate on
      // the same trap set), not an independent measurement — labeled as such.
      dimData.pbcr = Number((1.0 - srsr).toFixed(4));
      dimData.pbcr_derived = true;
    } else if (dim === "research_grounding") {
      // No deterministic hallucination oracle exists: null (unmeasured),
      // never a fabricated 0.0. Requires held-out labeled claims to measure.
      dimData.hallucination_rate = null;
    } else if (dim === "code_quality") {
      // Tier pass rate is NOT a build/test pass rate (tautology). Real
      // build/test rates need runTestCommand outcomes per benchmark — null
      // until the harness records them.
      dimData.build_pass_rate = null;
      dimData.test_pass_rate = null;
    } else if (dim === "req_to_impl") {
      // Scope drift has no deterministic oracle — null, not 0.0.
      dimData.scope_drift = null;
    } else if (dim === "memory_adherence") {
      // budget_violations is a real count (token-ceiling failures).
      // script_fidelity is MEASURED now: mean matched/total over benchmarks
      // declaring `requiredSteps` (Tier-0 script_steps metric). Null when no
      // benchmark declares steps — never a pass_rate tautology.
      const stepRuns = dimResults.filter(r => r.t0Metrics && r.t0Metrics.script_steps && r.t0Metrics.script_steps.total > 0);
      dimData.script_fidelity = stepRuns.length > 0
        ? Number((stepRuns.reduce((sum, r) => sum + (r.t0Metrics.script_steps.matched / r.t0Metrics.script_steps.total), 0) / stepRuns.length).toFixed(4))
        : null;
      dimData.script_steps_benchmarks = stepRuns.length;
      dimData.budget_violations = dimResults.filter(r => r.failures && r.failures.some(f => f.toLowerCase().includes("token ceiling"))).length;
    }

    dimensions[dim] = dimData;
  }

  // Mock/measured split aggregates (review 04 residual: mock numbers were
  // labeled but never suppressed from aggregates — a mixed run reported one
  // pass rate blending fixture-recall with model measurements).
  const splitAgg = (subset) => {
    const n = subset.length;
    const p = subset.filter(r => r.passed).length;
    return {
      count: n,
      passed: p,
      pass_rate: n > 0 ? Number((p / n).toFixed(4)) : null,
      tokens: subset.reduce((sum, r) => sum + (r.tokens || 0), 0)
    };
  };
  const measuredRuns = results.filter(r => r.mock !== true);
  const mockedRuns = results.filter(r => r.mock === true);
  const split = { measured: splitAgg(measuredRuns), mocked: splitAgg(mockedRuns) };

  // Co-authorship summary: Tier-1 results whose rubric re-measured Tier-0's
  // author-chosen vocabulary (overlap >= 0.5). Held-out rubrics clear it.
  const t1Evaluated = results.filter(r => r.tier1Overlap !== null && r.tier1Overlap !== undefined);
  const coauthoredIds = t1Evaluated.filter(r => r.tier1Coauthored === true).map(r => r.id);
  const heldOutIds = results.filter(r => r.rubricSource && r.rubricSource.startsWith("held-out")).map(r => r.id);
  const tier1Independence = {
    evaluated: t1Evaluated.length,
    coauthored: coauthoredIds.length,
    coauthored_ids: coauthoredIds,
    held_out: heldOutIds.length,
    held_out_ids: heldOutIds
  };

  // Provenance: without model/adapter/threshold/sha pinning, cross-run and
  // cross-model diffs are invalid. Recorded here, persisted by recordBaseline.
  const gitSha = resolveGitSha();
  const provenance = {
    adapter: options.adapter || null,
    model: options.model || "inherit",
    temp: options.temp ?? 0.0,
    mock_mode: mockMode,
    min_rqsd: options.minRQSD ?? null,
    node_version: process.version,
    git_sha: gitSha,
    thresholds: {
      pass_rate_drop: 0.001,
      token_inflation_percent: 15.0,
      tier1_erosion: 0.5,
      rqsd_floor: options.minRQSD ?? null
    }
  };

  return {
    total,
    evaluated: results.length,
    failFastTruncated,
    suiteWarnings,
    passed,
    failed,
    passRate,
    tier0PassRate,
    tier1AvgScore,
    tier1Independence,
    totalTokens,
    totalProviderTokens,
    split,
    latencyP50,
    latencyP95,
    mockMode,
    provenance,
    dimensions,
    unmeasuredDimensions,
    benchmarks: results
  };
}

module.exports = {
  loadSuites,
  executeBenchmark,
  runEvaluation,
  generateExecutionResponse,
  resolveGitSha,
  splitCommand
};
