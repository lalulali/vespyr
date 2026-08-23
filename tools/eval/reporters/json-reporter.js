/**
 * JSON & NDJSON Reporter for vespyr-eval (WS-4 Task 4.3)
 */

function renderJsonReport(runResults, diffReport = null) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    run: runResults,
    diff: diffReport
  }, null, 2);
}

function renderNdjsonReport(runResults) {
  const lines = [];
  lines.push(JSON.stringify({ type: "summary", data: runResults }));
  for (const b of (runResults.benchmarks || [])) {
    lines.push(JSON.stringify({ type: "benchmark", data: b }));
  }
  return lines.join("\n");
}

module.exports = {
  renderJsonReport,
  renderNdjsonReport
};
