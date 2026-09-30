#!/usr/bin/env node

/**
 * vespyr-eval — Standalone Multi-Agent Swarm Evaluation CLI Entrypoint (02j)
 * Executes deterministic Tier 0 gates, deterministic Tier 1 checklist rubrics,
 * and SPC metrics across all 20 agent personas and all skill workflows.
 */

const path = require("path");
const fs = require("fs");
const { runEvaluation } = require("../tools/eval/runner");
const { loadBaseline, recordBaseline, diffAgainstBaseline, DEFAULT_BASELINE_PATH } = require("../tools/eval/baseline");
const { renderConsoleReport } = require("../tools/eval/reporters/console-reporter");
const { renderJsonReport, renderNdjsonReport } = require("../tools/eval/reporters/json-reporter");
const { renderMarkdownReport } = require("../tools/eval/reporters/markdown-reporter");

function printHelp() {
  console.log(`
vespyr-eval — Standalone Multi-Agent Swarm Evaluation Harness

Usage:
  npx vespyr-eval run [options]
  npx vespyr-eval record-baseline [options]
  npx vespyr-eval diff [options]

Subcommands:
  run                Run benchmark test suites across agents and skills
  record-baseline    Run benchmarks and record results (refuses mock runs at the default path)
  diff               Compare latest evaluation run against baseline

Options:
  --suite, -s <name>         Benchmark suite to run (all, agents/core-swarm, invariants/grill-me-spcp, etc.)
  --agent, -a <name>         Filter benchmarks to specific agent persona (@founder, @developer, etc.)
  --skill, -k <name>         Filter benchmarks to specific skill workflow (/develop, /grill-me, etc.)
  --model, -m <model>        Force model tier (inherit, flash, pro, claude-3-5-sonnet)
  --adapter <type>           Execution adapter (auto, mock, cli, openai, anthropic, gemini, ollama)
  --mock                   Explicit mock mode: grade canned fixtures (watermarked [MOCK]).
                           Without --mock/--adapter mock and without a real adapter,
                           benchmarks FAIL CLOSED instead of self-grading.
  --cli <command>            Command string for CLI execution adapter
  --temp, -t <float>         Temperature for evaluation runs (default: 0.0)
  --seed <int>               Run seed for model sampling (default: unset).
                           Recorded in provenance for rerunnable configs.
  --min-rqsd <float>          Global RQS-D floor (0..1) for benchmarks with no explicit
                            RQS-D contract; explicit requireRQSD/minRQSD wins.
  --concurrency, -c <int>    Number of concurrent worker sandboxes (default: 4)
  --baseline, -b <path>      Path to baseline.json (default: artifacts/evals/baseline.json)
  --fail-fast                Stop immediately on first failure
  --fail-on-regression       Exit with code 2 if regression detected against baseline (default: true)
  --tier0                    Run deterministic static checks only (fast mode, zero LLM tokens)
  --reporter, -r <format>    Report format: console, json, ndjson, markdown (default: console)
  --output, -o <file>        Write report output to specified file path
  --help, -h                 Show this help message

Exit Codes:
  0: All benchmarks passed; zero regressions.
  1: Functional benchmark failure detected.
  2: Regression detected against baseline (pass rate drop, sycophancy leak, token inflation >15%).
  3: Runtime or configuration error.
`);
}

function parseArgs(args) {
  const options = {
    subcommand: "run",
    suite: "all",
    agent: "all",
    skill: "all",
    model: "inherit",
    adapter: "auto",
    cli: null,
    mock: false,
    temp: 0.0,
    seed: null,
    minRQSD: null,
    concurrency: 4,
    baseline: DEFAULT_BASELINE_PATH,
    failFast: false,
    failOnRegression: true,
    tier0Only: false,
    reporter: "console",
    output: null
  };

  const needValue = (flag, val) => {
    if (val === undefined || (typeof val === "string" && val.startsWith("-") && !/^\-\d/.test(val))) {
      console.error(`Missing value for flag: ${flag}`);
      process.exit(3);
    }
    return val;
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "run" || arg === "record-baseline" || arg === "diff") {
      options.subcommand = arg;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--suite" || arg === "-s") {
      options.suite = needValue(arg, args[++i]);
    } else if (arg === "--agent" || arg === "-a") {
      const v = needValue(arg, args[++i]);
      options.agent = String(v).replace(/^@/, "");
    } else if (arg === "--skill" || arg === "-k") {
      const v = needValue(arg, args[++i]);
      options.skill = String(v).replace(/^\//, "");
    } else if (arg === "--model" || arg === "-m") {
      options.model = needValue(arg, args[++i]);
    } else if (arg === "--adapter") {
      options.adapter = needValue(arg, args[++i]);
    } else if (arg === "--mock") {
      options.mock = true;
      options.adapter = "mock";
    } else if (arg === "--cli") {
      options.cli = needValue(arg, args[++i]);
    } else if (arg === "--temp" || arg === "-t") {
      const raw = needValue(arg, args[++i]);
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v < 0 || v > 2) {
        console.error(`Invalid value for ${arg}: ${raw} (expected finite float 0..2)`);
        process.exit(3);
      }
      options.temp = v;
    } else if (arg === "--min-rqsd") {
      const raw = needValue(arg, args[++i]);
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v < 0 || v > 1) {
        console.error(`Invalid value for ${arg}: ${raw} (expected finite float 0..1)`);
        process.exit(3);
      }
      options.minRQSD = v;
    } else if (arg === "--seed") {
      const raw = needValue(arg, args[++i]);
      const v = parseInt(raw, 10);
      if (!Number.isInteger(v) || v < 0) {
        console.error(`Invalid value for ${arg}: ${raw} (expected non-negative integer)`);
        process.exit(3);
      }
      options.seed = v;
    } else if (arg === "--concurrency" || arg === "-c") {
      const raw = needValue(arg, args[++i]);
      const v = parseInt(raw, 10);
      if (!Number.isInteger(v) || v < 1 || v > 64) {
        console.error(`Invalid value for ${arg}: ${raw} (expected integer 1..64)`);
        process.exit(3);
      }
      options.concurrency = v;
    } else if (arg === "--baseline" || arg === "-b") {
      const v = needValue(arg, args[++i]);
      options.baseline = path.resolve(v);
    } else if (arg === "--fail-fast") {
      options.failFast = true;
    } else if (arg === "--no-fail-on-regression") {
      options.failOnRegression = false;
    } else if (arg === "--fail-on-regression") {
      options.failOnRegression = true;
    } else if (arg === "--tier0") {
      options.tier0Only = true;
    } else if (arg === "--reporter" || arg === "-r") {
      const v = needValue(arg, args[++i]);
      const allowed = ["console", "json", "ndjson", "markdown"];
      if (!allowed.includes(v)) {
        console.error(`Unknown reporter: ${v}. Available: ${allowed.join(", ")}`);
        process.exit(3);
      }
      options.reporter = v;
    } else if (arg === "--output" || arg === "-o") {
      const v = needValue(arg, args[++i]);
      options.output = path.resolve(v);
    } else {
      console.error(`Unknown flag: ${arg}`);
      process.exit(3);
    }
  }

  return options;
}

function renderReport(options, runResults, diffReport) {
  if (options.reporter === "json") {
    return renderJsonReport(runResults, diffReport);
  } else if (options.reporter === "ndjson") {
    return renderNdjsonReport(runResults);
  } else if (options.reporter === "markdown") {
    return renderMarkdownReport(runResults, diffReport);
  }
  return renderConsoleReport(runResults, diffReport);
}

function emitReport(options, reportText) {
  if (options.output) {
    fs.writeFileSync(options.output, reportText + "\n");
    console.log(`Report written to ${options.output}`);
  } else {
    console.log(reportText);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  try {
    if (options.subcommand === "diff") {
      // Real diff: fresh run with the requested filters vs the pinned
      // baseline. All flags (--suite/--fail-on-regression/--reporter/
      // --output) are honored; exit 2 on regression when enabled.
      const baseline = loadBaseline(options.baseline);
      if (!baseline) {
        console.error(`Error: Baseline file not found at ${options.baseline}`);
        process.exit(3);
      }
      const runResults = await runEvaluation(options);
      if (runResults.total === 0) {
        console.error("Harness configuration error: 0 benchmarks matched (check --suite/--agent/--skill filters).");
        process.exit(3);
      }
      const diffReport = diffAgainstBaseline(runResults, baseline);
      const reportText = renderReport(options, runResults, diffReport);
      emitReport(options, reportText);
      if (options.failOnRegression && diffReport && diffReport.hasRegression) {
        process.exit(2);
      }
      if (runResults.failed > 0) {
        process.exit(1);
      }
      process.exit(0);
    }

    const runResults = await runEvaluation(options);
    let baseline = loadBaseline(options.baseline);
    let diffReport = null;

    // Nothing evaluated (e.g. a --suite/--agent filter matched zero
    // benchmarks) is a configuration error, not a green run.
    if (runResults.total === 0) {
      console.error("Harness configuration error: 0 benchmarks matched (check --suite/--agent/--skill filters and suite warnings).");
      if ((runResults.suiteWarnings || []).length > 0) {
        for (const w of runResults.suiteWarnings) console.error(`  malformed suite: ${w.file} — ${w.error}`);
      }
      process.exit(3);
    }

    if (options.subcommand === "record-baseline") {
      // A mock run must never become the production baseline silently:
      // fixture-recall numbers are a self-test reference, not a quality
      // reference. Explicit --baseline override = explicit intent.
      if (runResults.mockMode && path.resolve(options.baseline) === path.resolve(DEFAULT_BASELINE_PATH)) {
        console.error("Refusing to record a mock run as artifacts/evals/baseline.json (would launder fixture-recall as quality evidence).");
        console.error("Re-run with a real adapter, or pass an explicit --baseline <mock-baseline-path> for self-test references.");
        process.exit(2);
      }
      baseline = recordBaseline(runResults, options.baseline);
      diffReport = diffAgainstBaseline(runResults, baseline);
      if (diffReport) diffReport.baselinePath = path.relative(process.cwd(), options.baseline);
      console.log(`Successfully recorded new baseline to ${options.baseline}`);
    } else {
      diffReport = diffAgainstBaseline(runResults, baseline);
      if (diffReport) diffReport.baselinePath = path.relative(process.cwd(), (baseline && baseline.__path) || options.baseline);
    }

    const reportText = renderReport(options, runResults, diffReport);
    emitReport(options, reportText);

    // Determine exit code
    if (options.subcommand !== "record-baseline" && options.failOnRegression && diffReport && diffReport.hasRegression) {
      process.exit(2);
    }

    if (runResults.failed > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error("Harness runtime error:", err);
    process.exit(3);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs };
