#!/usr/bin/env node
/**
 * Telemetry Display — Thin RQS-D Scorecard Renderer (02l Option A, WS-2.4)
 * Phase-1 thin slice: exact/estimated flag + RQS-D + deterministic biomarkers only.
 * Macro digests (7-day, hot-paths, heatmaps) deferred to 04a telemetry_surface.js
 */

const fs = require('fs');
const path = require('path');
const { computeRQSD } = require('../eval/lib/biomarkers');
const { estimateTokensFallback } = require('../../.agents/scripts/swarm_telemetry');

function renderRQScorecard(opts) {
  const rqs = opts.rqs_d_score != null ? opts.rqs_d_score : 0;
  const pct = (rqs * 100).toFixed(1);
  const rating = rqs >= 0.95 ? 'EXCELLENT' : rqs >= 0.85 ? 'PASS' : rqs >= 0.70 ? 'NEEDS_REPAIR' : 'REJECTED';
  const gate = rqs >= 0.85 ? 'PASS' : 'FAIL';
  const estFlag = opts.estimated ? 'estimated' : 'exact';
  const agent = opts.agent_persona || 'unknown';
  const skill = opts.workflow || 'unknown';
  const model = (opts.model && opts.model.model_id) || 'unknown';
  const dur = opts.duration_ms != null ? opts.duration_ms : 0;
  const tokens = opts.usage ? opts.usage.total_tokens : 0;
  const cost = opts.usage && opts.usage.cost_usd != null ? ` ($${opts.usage.cost_usd})` : '';
  const b = opts.biomarkers || {};
  const lines = [];
  lines.push('┌────────────────────────────────────────────────────────────────────────────────────────┐');
  lines.push(`│ 📊 VESPYR RESULT QUALITY SCORECARD: ${pct}% RQS-D [${rating} / ${gate}]`.padEnd(89) + '│');
  lines.push('├────────────────────────────────────────────────────────────────────────────────────────┤');
  lines.push(`│ Agent: ${agent.padEnd(30)} │ Skill: ${skill.padEnd(40)} │`);
  lines.push(`│ Model: ${model.padEnd(30)} │ Duration: ${String(dur).padEnd(6)}ms │ Tokens: ${tokens} (${estFlag})${cost}`.padEnd(89) + '│');
  lines.push('├────────────────────────────────────────────────────────────────────────────────────────┤');
  lines.push('│ Tier 0 Deterministic Invariants (RQS-D, 0 tokens, <25ms):'.padEnd(89) + '│');
  lines.push(`│ • Schema Compliance (SCR):          ${(b.scr!=null? (b.scr*100).toFixed(0)+'%':'n/a').padEnd(8)} [${b.scr===1?'PASS':'FAIL'}]`.padEnd(89) + '│');
  lines.push(`│ • Markdown Headers (MSHA):          ${(b.msha!=null? (b.msha*100).toFixed(0)+'%':'n/a').padEnd(8)} [${b.msha===1?'PASS':'FAIL'}]`.padEnd(89) + '│');
  lines.push(`│ • Placeholder Density (PD):          ${(b.placeholder_density!=null? (b.placeholder_density*100).toFixed(1)+'%':'n/a').padEnd(8)} [${b.placeholder_density===0?'PASS':'FAIL'}]`.padEnd(89) + '│');
  lines.push(`│ • Acceptance Criteria:              ${(b.ac_testability!=null? (b.ac_testability*100).toFixed(0)+'%':'n/a').padEnd(8)} [${b.ac_testability===1?'PASS':'FAIL'}]`.padEnd(89) + '│');
  lines.push(`│ • Premature Convergence (PCI):       ${(b.pci!=null? b.pci.toFixed(2):'n/a').padEnd(8)} [${b.pci===0?'PASS':'FAIL'}]`.padEnd(89) + '│');
  lines.push('├────────────────────────────────────────────────────────────────────────────────────────┤');
  const shadow = (b.srsr==null && b.scope_drift==null) ? 'shadow: SRSR null | SDS null' : `shadow: SRSR ${b.srsr} | SDS ${b.scope_drift}`;
  lines.push(`│ Semantic Shadow (RQS-J — not gating, Phase 3/04a): [${shadow}]`.padEnd(89) + '│');
  if (opts.artifact) lines.push(`│ 💾 Artifact Saved: ${opts.artifact}`.padEnd(89) + '│');
  lines.push('└────────────────────────────────────────────────────────────────────────────────────────┘');
  return lines.join('\n');
}

function scoreText(text, opts = {}) {
  const res = computeRQSD(text, opts);
  const card = renderRQScorecard({
    rqs_d_score: res.rqs_d_score,
    agent_persona: opts.agent || 'unknown',
    workflow: opts.workflow || 'unknown',
    model: opts.model || { model_id: 'unknown' },
    duration_ms: opts.duration_ms || 0,
    usage: { total_tokens: text ? Math.ceil(text.length/4) : 0, cost_usd: null, estimated: true },
    biomarkers: res.biomarkers,
    artifact: opts.artifact,
    estimated: true,
  });
  return { rqs: res, card };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length===0) {
    console.log(`Usage:
  node tools/telemetry/telemetry_display.js --text "<markdown>"
  node tools/telemetry/telemetry_display.js --file <path> [--agent <a>] [--workflow <w>]
  Outputs RQS-D scorecard (Phase-1 thin). Macro digests deferred to 04a telemetry_surface.js`);
    process.exit(0);
  }
  let text = '';
  let agent = 'unknown', workflow='unknown', file=null;
  for (let i=0;i<args.length;i++) {
    if (args[i]==='--text') text = args[++i];
    if (args[i]==='--file') file = args[++i];
    if (args[i]==='--agent') agent = args[++i];
    if (args[i]==='--workflow') workflow = args[++i];
  }
  if (file) {
    try { text = fs.readFileSync(path.resolve(file),'utf8'); } catch(e){ console.error('file not found'); process.exit(1); }
  }
  const { rqs, card } = scoreText(text, { agent, workflow, artifact: file });
  console.log(card);
  console.log(JSON.stringify({ rqs_d_score: rqs.rqs_d_score, rating: rqs.rating, biomarkers: rqs.biomarkers }, null, 2));
}

if (require.main===module) main();
module.exports = { renderRQScorecard, scoreText };
