/**
 * GitHub / CI Markdown Reporter for vespyr-eval (WS-4 Task 4.3)
 * Generates eval-report.md
 */

function esc(v) {
  return String(v ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}
function pct(rate, digits = 1) {
  return typeof rate === "number" && Number.isFinite(rate) ? (rate * 100).toFixed(digits) + "%" : "N/A";
}
function num(v, digits = 2) {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : "N/A";
}
function int(v) {
  return typeof v === "number" && Number.isFinite(v) ? v.toLocaleString() : "N/A";
}

function renderMarkdownReport(runResults, diffReport = null) {
  const lines = [];

  lines.push("# 🧪 Vespyr Evaluation Harness Report");
  lines.push("");
  lines.push(`**Generated at:** ${new Date().toISOString()}  `);
  if (runResults.mockMode) {
    lines.push(`> **Mock run** — canned fixtures, not a model measurement.  `);
  }
  lines.push(`**Overall Pass Rate:** ${pct(runResults.passRate)} (${int(runResults.passed)}/${int(runResults.total)} Passed)  `);
  lines.push(`**Tier 0 Deterministic Pass Rate:** ${pct(runResults.tier0PassRate)}  `);
  lines.push(`**Tier 1 Semantic Avg Score:** ${runResults.tier1AvgScore != null ? num(runResults.tier1AvgScore) + " / 5.0" : "N/A"}  `);
  lines.push(`**Total Token Spend (local):** ${int(runResults.totalTokens)} tokens  `);
  if (runResults.totalProviderTokens != null) {
    lines.push(`**Total Token Spend (provider):** ${int(runResults.totalProviderTokens)} tokens  `);
  }
  if (runResults.split && runResults.split.measured.count > 0 && runResults.split.mocked.count > 0) {
    lines.push(`**Measured (real exec):** ${int(runResults.split.measured.passed)}/${int(runResults.split.measured.count)} (${pct(runResults.split.measured.pass_rate)})  `);
    lines.push(`**Mocked (fixtures):** ${int(runResults.split.mocked.passed)}/${int(runResults.split.mocked.count)} (${pct(runResults.split.mocked.pass_rate)})  `);
  }
  if (runResults.tier1Independence && runResults.tier1Independence.evaluated > 0) {
    const ti = runResults.tier1Independence;
    lines.push(`**Tier-1 Independence:** ${ti.coauthored}/${ti.evaluated} co-authored, ${ti.held_out} held-out  `);
  }
  if (runResults.provenance) {
    const p = runResults.provenance;
    lines.push(`**Provenance:** adapter=\`${esc(p.adapter || "?")}\` model=\`${esc(p.model || "?")}\` temp=\`${esc(p.temp ?? "?")}\`  `);
  }
  if (runResults.failFastTruncated) {
    lines.push(`**Truncated:** fail-fast stopped early (${int(runResults.evaluated)}/${int(runResults.total)} evaluated)  `);
  }
  if ((runResults.suiteWarnings || []).length > 0) {
    lines.push(`**Suite Warnings:** ${runResults.suiteWarnings.length} malformed suite file(s) skipped  `);
  }
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
          : `**SRSR:** ${pct(srsr)} | **PCI:** ${num(pci)} | **PBCR:** ${pct(pbcr)}`;
      } else if (dimKey === "research_grounding") {
        special = typeof dimData.hallucination_rate === "number"
          ? `Hallucination Rate: ${pct(dimData.hallucination_rate)}`
          : "Hallucination Rate: N/A (unmeasured)";
      } else if (dimKey === "code_quality") {
        special = typeof dimData.build_pass_rate === "number"
          ? `Build Pass: ${pct(dimData.build_pass_rate)}`
          : "Build Pass: N/A (unmeasured)";
      }
      lines.push("| " + [
        "`" + esc(dimKey) + "`",
        typeof dimData.score === "number" ? num(dimData.score) : "N/A",
        typeof dimData.pass_rate === "number" ? pct(dimData.pass_rate) : "N/A",
        esc(special)
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
        lines.push(`> - ${esc(reg.message)}`);
      }
    } else {
      lines.push("> [!NOTE]");
      lines.push("> **Clean run:** All metrics meet or exceed baseline thresholds.");
    }
    for (const imp of diffReport.improvements || []) {
      lines.push(`> - ✅ ${esc(imp.message)}`);
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
        "`" + esc(b.id) + "`",
        esc(target),
        esc(b.dimension || "general"),
        b.tier0Passed ? "✅" : "❌",
        b.tier1Score != null ? num(b.tier1Score) : "-",
        int(b.tokens),
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
