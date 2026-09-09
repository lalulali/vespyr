/**
 * Rich ASCII Console Reporter for vespyr-eval (WS-4 Task 4.2)
 */

// Crash-proof numeric formatting: malformed run objects (null/NaN/string)
// render as N/A instead of throwing on `.toFixed`.
function pct(rate, digits = 1) {
  return typeof rate === "number" && Number.isFinite(rate) ? (rate * 100).toFixed(digits) + "%" : "N/A";
}
function num(v, digits = 2) {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : "N/A";
}
function int(v) {
  return typeof v === "number" && Number.isFinite(v) ? v.toLocaleString() : "N/A";
}
// Cell text must not break the table grid: strip newlines, neutralize pipes.
function cell(v) {
  return String(v ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "/");
}

function formatTable(headers, rows) {
  const colWidths = headers.map((h, i) => {
    const maxRowLen = rows.reduce((max, row) => Math.max(max, String(row[i] || "").length), 0);
    return Math.max(h.length, maxRowLen);
  });

  const sepLine = "+-" + colWidths.map(w => "-".repeat(w)).join("-+-") + "-+";
  const headerLine = "| " + headers.map((h, i) => h.padEnd(colWidths[i])).join(" | ") + " |";

  const dataLines = rows.map(row => {
    return "| " + row.map((cell, i) => String(cell || "").padEnd(colWidths[i])).join(" | ") + " |";
  });

  return [sepLine, headerLine, sepLine, ...dataLines, sepLine].join("\n");
}

function renderConsoleReport(runResults, diffReport = null) {
  const lines = [];

  lines.push("");
  lines.push("================================================================================");
  lines.push("                        VESPYR EVALUATION HARNESS REPORT                        ");
  lines.push("================================================================================");
  lines.push("");
  if (runResults.mockMode) {
    lines.push("  *** MOCK RUN — canned fixtures, not a model measurement ***");
    lines.push("");
  }

  const summary = [
    ["Total Benchmarks", int(runResults.total)],
    ["Passed", int(runResults.passed)],
    ["Failed", int(runResults.failed)],
    ["Overall Pass Rate", pct(runResults.passRate)],
    ["Tier 0 Deterministic Pass Rate", pct(runResults.tier0PassRate)],
    ["Tier 1 Semantic Avg Score", runResults.tier1AvgScore != null && Number.isFinite(runResults.tier1AvgScore) ? num(runResults.tier1AvgScore) + " / 5.0" : "N/A"],
    ["Total Token Spend (local)", int(runResults.totalTokens) + " tokens"],
    ["Latency p50 / p95", `${runResults.latencyP50 || 0}ms / ${runResults.latencyP95 || 0}ms`]
  ];
  if (runResults.totalProviderTokens != null) {
    summary.push(["Total Token Spend (provider)", int(runResults.totalProviderTokens) + " tokens"]);
  }
  // Split aggregates: shown whenever a run mixes fixture-recall with real
  // measurements, so the blended headline rate can't pass silently.
  if (runResults.split && runResults.split.measured.count > 0 && runResults.split.mocked.count > 0) {
    summary.push(["Measured (real exec)", `${int(runResults.split.measured.passed)}/${int(runResults.split.measured.count)} (${pct(runResults.split.measured.pass_rate)})`]);
    summary.push(["Mocked (fixtures)", `${int(runResults.split.mocked.passed)}/${int(runResults.split.mocked.count)} (${pct(runResults.split.mocked.pass_rate)})`]);
  }
  // Tier-1 independence: co-authored scores re-measure Tier-0 vocabulary.
  if (runResults.tier1Independence && runResults.tier1Independence.evaluated > 0) {
    const ti = runResults.tier1Independence;
    summary.push(["Tier-1 Independence", `${ti.coauthored}/${ti.evaluated} co-authored, ${ti.held_out} held-out`]);
  }
  if (runResults.provenance) {
    const p = runResults.provenance;
    summary.push(["Provenance", `adapter=${p.adapter || "?"} model=${p.model || "?"} temp=${p.temp ?? "?"}`]);
  }
  if (runResults.failFastTruncated) {
    summary.push(["Truncated", `fail-fast stopped early (${runResults.evaluated}/${runResults.total} evaluated)`]);
  }
  if ((runResults.suiteWarnings || []).length > 0) {
    summary.push(["Suite Warnings", `${runResults.suiteWarnings.length} malformed suite file(s) skipped`]);
  }

  lines.push("--- Summary Metrics ---");
  for (const [k, v] of summary) {
    lines.push(`  ${(k + ":").padEnd(32)} ${v}`);
  }
  lines.push("");

  if (runResults.dimensions) {
    lines.push("--- 7 Foundational Evaluation Dimensions ---");
    const dimHeaders = ["Dimension", "Score", "Pass Rate", "Special Metrics"];
    const dimRows = [];
    for (const [dimKey, dimData] of Object.entries(runResults.dimensions)) {
      let special = "";
      if (dimKey === "sycophantic_premature_convergence") {
        const srsr = typeof dimData.srsr === "number" ? dimData.srsr : null;
        const pci = typeof dimData.pci === "number" ? dimData.pci : null;
        const pbcr = typeof dimData.pbcr === "number" ? dimData.pbcr : null;
        special = (srsr === null || pci === null || pbcr === null)
          ? "SRSR/PCI/PBCR: N/A"
          : `SRSR: ${pct(srsr)} | PCI: ${num(pci)} | PBCR: ${pct(pbcr)}`;
      } else if (dimKey === "research_grounding") {
        // hallucination_rate null = unmeasured (no deterministic oracle).
        // Never default to 0.0: that fabricated a perfect.
        special = typeof dimData.hallucination_rate === "number"
          ? `Hallucination: ${pct(dimData.hallucination_rate)}`
          : "Hallucination: N/A (unmeasured)";
      } else if (dimKey === "code_quality") {
        const bRateVal = dimData.build_pass_rate;
        const bRate = typeof bRateVal === "number" ? `Build Pass: ${pct(bRateVal)}` : "Build Pass: N/A (unmeasured)";
        special = bRate;
      }
      dimRows.push([
        cell(dimKey + (dimData.measured === false ? " (unmeasured)" : "")),
        typeof dimData.score === "number" ? num(dimData.score) : "N/A",
        typeof dimData.pass_rate === "number" ? pct(dimData.pass_rate) : "N/A",
        cell(special)
      ]);
    }
    lines.push(formatTable(dimHeaders, dimRows));
    lines.push("");
  }

  // Benchmark detail table
  if (runResults.benchmarks && runResults.benchmarks.length > 0) {
    lines.push("--- Benchmark Results Breakdown ---");
    const bmHeaders = ["ID", "Target", "Dimension", "T0", "T1 Score", "Tokens", "Status"];
    const bmRows = runResults.benchmarks.map(b => {
      const target = b.agent ? `@${b.agent}` : (b.skill ? `/${b.skill}` : b.suite);
      const statusStr = b.passed ? "PASS" : "FAIL";
      return [
        cell(b.id),
        cell(target),
        cell(b.dimension || "general"),
        b.tier0Passed ? "PASS" : "FAIL",
        b.tier1Score != null ? num(b.tier1Score) : "-",
        int(b.tokens),
        statusStr
      ];
    });
    lines.push(formatTable(bmHeaders, bmRows));
    lines.push("");
  }

  // Failures section
  const failedBenchmarks = (runResults.benchmarks || []).filter(b => !b.passed);
  if (failedBenchmarks.length > 0) {
    lines.push("--- Benchmark Failures ---");
    for (const fb of failedBenchmarks) {
      lines.push(`[!] ${fb.id} (${fb.name}):`);
      for (const err of fb.failures || []) {
        lines.push(`    - ${err}`);
      }
    }
    lines.push("");
  }

  // Regression section
  if (diffReport) {
    lines.push("--- Baseline Regression Diff ---");
    if (diffReport.hasRegression) {
      lines.push("  [!] REGRESSION DETECTED against baseline:");
      for (const reg of diffReport.regressions) {
        lines.push(`    * [${reg.type || "UNKNOWN"}] ${reg.message}`);
      }
    } else {
      lines.push("  [OK] No regressions detected against baseline.json");
    }
    for (const imp of diffReport.improvements || []) {
      lines.push(`    + [${imp.type || "IMPROVEMENT"}] ${imp.message}`);
    }
    lines.push("");
  }

  lines.push("================================================================================");
  lines.push("");

  return lines.join("\n");
}

module.exports = {
  renderConsoleReport
};
