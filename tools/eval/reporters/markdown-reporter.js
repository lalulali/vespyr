/**
 * GitHub / CI Markdown Reporter for vespyr-eval (WS-4 Task 4.3)
 * Generates eval-report.md
 */

function renderMarkdownReport(runResults, diffReport = null) {
  const lines = [];

  lines.push("# 🧪 Vespyr Evaluation Harness Report");
  lines.push("");
  lines.push(`**Generated at:** ${new Date().toISOString()}  `);
  lines.push(`**Overall Pass Rate:** ${(runResults.passRate * 100).toFixed(1)}% (${runResults.passed}/${runResults.total} Passed)  `);
  lines.push(`**Tier 0 Deterministic Pass Rate:** ${(runResults.tier0PassRate * 100).toFixed(1)}%  `);
  lines.push(`**Tier 1 Semantic Avg Score:** ${runResults.tier1AvgScore ? runResults.tier1AvgScore.toFixed(2) + " / 5.0" : "N/A"}  `);
  lines.push(`**Total Token Spend:** ${runResults.totalTokens.toLocaleString()} tokens  `);
  lines.push("");

  // Dimensions
  if (runResults.dimensions) {
    lines.push("## 📊 7 Core Evaluation Dimensions");
    lines.push("");
    lines.push("| Dimension | Score | Pass Rate | Key Invariant Metrics |");
    lines.push("|---|---|---|---|");
    for (const [dimKey, dimData] of Object.entries(runResults.dimensions)) {
      let special = "-";
      if (dimData.measured === false) {
        special = "unmeasured — no samples";
      } else if (dimKey === "sycophantic_premature_convergence") {
        const srsr = typeof dimData.srsr === "number" ? dimData.srsr : null;
        const pci = typeof dimData.pci === "number" ? dimData.pci : null;
        const pbcr = typeof dimData.pbcr === "number" ? dimData.pbcr : null;
        special = (srsr === null || pci === null || pbcr === null)
          ? "unmeasured"
          : `**SRSR:** ${(srsr * 100).toFixed(1)}% | **PCI:** ${pci.toFixed(2)} | **PBCR:** ${(pbcr * 100).toFixed(1)}%`;
      } else if (dimKey === "research_grounding") {
        special = typeof dimData.hallucination_rate === "number"
          ? `Hallucination Rate: ${(dimData.hallucination_rate * 100).toFixed(1)}%`
          : "Hallucination Rate: N/A";
      } else if (dimKey === "code_quality") {
        special = typeof dimData.build_pass_rate === "number"
          ? `Build Pass: ${(dimData.build_pass_rate * 100).toFixed(1)}%`
          : "Build Pass: N/A";
      }
      lines.push("| " + [
        "`" + dimKey + "`",
        typeof dimData.score === "number" ? dimData.score.toFixed(2) : "N/A",
        typeof dimData.pass_rate === "number" ? (dimData.pass_rate * 100).toFixed(1) + "%" : "N/A",
        special
      ].join(" | ") + " |");
    }
    lines.push("");
  }

  // Regression Diff
  if (diffReport) {
    lines.push("## 🛡️ Regression Status");
    lines.push("");
    if (diffReport.hasRegression) {
      lines.push("> [!WARNING]");
      lines.push("> **Regression detected against baseline!**");
      for (const reg of diffReport.regressions) {
        lines.push(`> - ${reg.message}`);
      }
    } else {
      lines.push("> [!NOTE]");
      lines.push("> **Clean run:** All metrics meet or exceed baseline thresholds.");
    }
    lines.push("");
  }

  // Benchmark Breakdown Table
  if (runResults.benchmarks && runResults.benchmarks.length > 0) {
    lines.push("## 📋 Benchmark Results Breakdown");
    lines.push("");
    lines.push("| Benchmark ID | Target | Dimension | Tier 0 | Tier 1 Score | Tokens | Status |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const b of runResults.benchmarks) {
      const target = b.agent ? `@${b.agent}` : (b.skill ? `/${b.skill}` : b.suite);
      const statusIcon = b.passed ? "✅ PASS" : "❌ FAIL";
      lines.push("| " + [
        "`" + b.id + "`",
        target,
        b.dimension || "general",
        b.tier0Passed ? "✅" : "❌",
        b.tier1Score ? b.tier1Score.toFixed(2) : "-",
        b.tokens || 0,
        statusIcon
      ].join(" | ") + " |");
    }
    lines.push("");
  }

  return lines.join("\n");
}

module.exports = {
  renderMarkdownReport
};
