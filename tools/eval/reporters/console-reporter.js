/**
 * Rich ASCII Console Reporter for vespyr-eval (WS-4 Task 4.2)
 */

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

  const summary = [
    ["Total Benchmarks", runResults.total],
    ["Passed", runResults.passed],
    ["Failed", runResults.failed],
    ["Overall Pass Rate", (runResults.passRate * 100).toFixed(1) + "%"],
    ["Tier 0 Deterministic Pass Rate", (runResults.tier0PassRate * 100).toFixed(1) + "%"],
    ["Tier 1 Semantic Avg Score", runResults.tier1AvgScore ? runResults.tier1AvgScore.toFixed(2) + " / 5.0" : "N/A"],
    ["Total Token Spend", runResults.totalTokens.toLocaleString() + " tokens"],
    ["Latency p50 / p95", `${runResults.latencyP50 || 0}ms / ${runResults.latencyP95 || 0}ms`]
  ];

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
        special = `SRSR: ${(dimData.srsr * 100).toFixed(1)}% | PCI: ${dimData.pci.toFixed(2)} | PBCR: ${(dimData.pbcr * 100).toFixed(1)}%`;
      } else if (dimKey === "research_grounding") {
        special = `Hallucination: ${(dimData.hallucination_rate * 100).toFixed(1)}%`;
      } else if (dimKey === "code_quality") {
        special = `Build Pass: ${(dimData.build_pass_rate * 100).toFixed(1)}%`;
      }
      dimRows.push([
        dimKey,
        dimData.score !== undefined ? dimData.score.toFixed(2) : "N/A",
        dimData.pass_rate !== undefined ? (dimData.pass_rate * 100).toFixed(1) + "%" : "100.0%",
        special
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
        b.id,
        target,
        b.dimension || "general",
        b.tier0Passed ? "PASS" : "FAIL",
        b.tier1Score ? b.tier1Score.toFixed(2) : "-",
        b.tokens || 0,
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
        lines.push(`    * ${reg.message}`);
      }
    } else {
      lines.push("  [OK] No regressions detected against baseline.json");
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
