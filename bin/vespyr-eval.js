#!/usr/bin/env node

/**
 * vespyr-eval — Standalone Multi-Agent Swarm Evaluation CLI Entrypoint (02j)
 * Executes deterministic Tier 0 gates, calibrated Tier 1 rubrics, and SPC metrics
 * across all 20 agent personas and all skill workflows.
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
  record-baseline    Run benchmarks and record results to baseline.json
  diff               Compare latest evaluation run against baseline

Options:
  --suite, -s <name>         Benchmark suite to run (all, agents/core-swarm, invariants/grill-me-spcp, etc.)
  --agent, -a <name>         Filter benchmarks to specific agent persona (@founder, @developer, etc.)
  --skill, -k <name>         Filter benchmarks to specific skill workflow (/develop, /grill-me, etc.)
  --model, -m <model>        Force model tier (inherit, flash, pro, claude-3-5-sonnet)
  --adapter <type>           Execution adapter (auto, mock, cli, openai, anthropic, gemini, ollama)
  --cli <command>            Command string for CLI execution adapter
  --temp, -t <float>         Temperature for evaluation runs (default: 0.0)
  --concurrency, -c <int>    Number of concurrent worker sandboxes (default: 4)
  --baseline, -b <path>      Path to baseline.json (default: evals/baseline.json)
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
    temp: 0.0,
    concurrency: 4,
    baseline: DEFAULT_BASELINE_PATH,
    failFast: false,
    failOnRegression: true,
    tier0Only: false,
    reporter: "console",
    output: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "run" || arg === "record-baseline" || arg === "diff") {
      options.subcommand = arg;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--suite" || arg === "-s") {
      options.suite = args[++i];
    } else if (arg === "--agent" || arg === "-a") {
      options.agent = args[++i].replace(/^@/, "");
    } else if (arg === "--skill" || arg === "-k") {
      options.skill = args[++i].replace(/^\//, "");
    } else if (arg === "--model" || arg === "-m") {
      options.model = args[++i];
    } else if (arg === "--adapter") {
      options.adapter = args[++i];
    } else if (arg === "--cli") {
      options.cli = args[++i];
    } else if (arg === "--temp" || arg === "-t") {
      options.temp = parseFloat(args[++i]);
    } else if (arg === "--concurrency" || arg === "-c") {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg === "--baseline" || arg === "-b") {
      options.baseline = path.resolve(args[++i]);
    } else if (arg === "--fail-fast") {
      options.failFast = true;
    } else if (arg === "--no-fail-on-regression") {
      options.failOnRegression = false;
    } else if (arg === "--fail-on-regression") {
      options.failOnRegression = true;
    } else if (arg === "--tier0") {
      options.tier0Only = true;
    } else if (arg === "--reporter" || arg === "-r") {
      options.reporter = args[++i];
    } else if (arg === "--output" || arg === "-o") {
      options.output = path.resolve(args[++i]);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  try {
    if (options.subcommand === "diff") {
      const baseline = loadBaseline(options.baseline);
      if (!baseline) {
        console.error(`Error: Baseline file not found at ${options.baseline}`);
        process.exit(3);
      }
      console.log(`Loaded baseline ${options.baseline} (${baseline.summary.total_benchmarks} benchmarks, pass rate: ${(baseline.summary.pass_rate * 100).toFixed(1)}%)`);
      process.exit(0);
    }

    const runResults = await runEvaluation(options);
    let baseline = loadBaseline(options.baseline);
    let diffReport = null;

    if (options.subcommand === "record-baseline") {
      baseline = recordBaseline(runResults, options.baseline);
      diffReport = diffAgainstBaseline(runResults, baseline);
      console.log(`Successfully recorded new baseline to ${options.baseline}`);
    } else {
      diffReport = diffAgainstBaseline(runResults, baseline);
    }

    // Render report based on chosen reporter
    let reportText = "";
    if (options.reporter === "json") {
      reportText = renderJsonReport(runResults, diffReport);
    } else if (options.reporter === "ndjson") {
      reportText = renderNdjsonReport(runResults);
    } else if (options.reporter === "markdown") {
      reportText = renderMarkdownReport(runResults, diffReport);
    } else {
      reportText = renderConsoleReport(runResults, diffReport);
    }

    if (options.output) {
      fs.writeFileSync(options.output, reportText + "\n");
      console.log(`Report written to ${options.output}`);
    } else {
      console.log(reportText);
    }

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

main();
