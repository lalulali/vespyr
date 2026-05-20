#!/usr/bin/env node
/**
 * Hot Path Analyzer — Identifies Most Expensive Pipeline Paths
 *
 * Reads telemetry events and identifies:
 * - Highest token consumers per phase
 * - Slowest agents (duration)
 * - Memory load efficiency (memory tokens vs total tokens)
 * - Optimization opportunities
 *
 * Usage:
 *   node hot_path_analyzer.js
 *   node hot_path_analyzer.js --days 7
 */

const fs = require('fs');
const path = require('path');

const TELEMETRY_DIR = path.join(process.cwd(), 'artifacts', 'telemetry');

function readEvents(days = 7) {
  const events = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const file = path.join(TELEMETRY_DIR, `events-${dateStr}.ndjson`);
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          events.push(JSON.parse(line));
        } catch (e) {}
      }
    }
  }
  return events;
}

function analyzeHotPaths(days = 7) {
  const events = readEvents(days);
  const agentInvokes = events.filter(e => e.type === 'agent_invoke');

  if (agentInvokes.length === 0) {
    console.log('No agent_invoke events found. Run pipeline_simulator.js first.');
    process.exit(0);
  }

  // Group by phase + agent
  const groups = {};
  for (const ev of agentInvokes) {
    const key = `${ev.data.phase}.${ev.data.agent}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }

  const analysis = [];
  for (const [key, events] of Object.entries(groups)) {
    const [phase, agent] = key.split('.');
    const tokens = events.map(e => e.data.tokens || 0);
    const durations = events.map(e => e.data.duration_ms || 0);
    const memoryLoads = events.map(e => e.data.memory_load || 0);
    const templateTokens = events.map(e => e.data.template_tokens || 0);

    const avgTokens = tokens.reduce((a, b) => a + b, 0) / tokens.length;
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const avgMemory = memoryLoads.reduce((a, b) => a + b, 0) / memoryLoads.length;
    const avgTemplate = templateTokens.reduce((a, b) => a + b, 0) / templateTokens.length;

    // Memory efficiency: how much of total is memory vs prompt+template
    const memoryRatio = avgMemory / avgTokens;
    const templateRatio = avgTemplate / avgTokens;
    const promptRatio = 1 - memoryRatio - templateRatio;

    analysis.push({
      phase,
      agent,
      invocations: events.length,
      avg_tokens: Math.round(avgTokens),
      total_tokens: tokens.reduce((a, b) => a + b, 0),
      min_tokens: Math.min(...tokens),
      max_tokens: Math.max(...tokens),
      avg_duration_ms: Math.round(avgDuration),
      avg_memory_load: Math.round(avgMemory),
      avg_template_tokens: Math.round(avgTemplate),
      memory_ratio: (memoryRatio * 100).toFixed(1),
      template_ratio: (templateRatio * 100).toFixed(1),
      prompt_ratio: (promptRatio * 100).toFixed(1)
    });
  }

  // Sort by total tokens descending
  analysis.sort((a, b) => b.total_tokens - a.total_tokens);

  return analysis;
}

function printReport(analysis) {
  console.log('Vespyr Hot Path Analysis');
  console.log('========================\n');

  // Top token consumers
  console.log('=== Top Token Consumers (by total tokens) ===\n');
  console.log(`${'Phase'.padEnd(15)} ${'Agent'.padEnd(20)} ${'Invocations'.padStart(11)} ${'Avg Tokens'.padStart(11)} ${'Total Tokens'.padStart(13)} ${'Avg Duration'.padStart(13)}`);
  console.log('-'.repeat(85));
  for (const a of analysis) {
    console.log(`${a.phase.padEnd(15)} ${a.agent.padEnd(20)} ${String(a.invocations).padStart(11)} ${String(a.avg_tokens).padStart(11)} ${String(a.total_tokens).padStart(13)} ${String(Math.round(a.avg_duration_ms / 1000) + 's').padStart(13)}`);
  }

  // Memory efficiency analysis
  console.log('\n=== Memory Efficiency (lower memory ratio = better) ===\n');
  const byMemoryRatio = [...analysis].sort((a, b) => parseFloat(b.memory_ratio) - parseFloat(a.memory_ratio));
  console.log(`${'Phase'.padEnd(15)} ${'Agent'.padEnd(20)} ${'Memory %'.padStart(9)} ${'Template %'.padStart(11)} ${'Prompt %'.padStart(9)}`);
  console.log('-'.repeat(65));
  for (const a of byMemoryRatio) {
    console.log(`${a.phase.padEnd(15)} ${a.agent.padEnd(20)} ${a.memory_ratio.padStart(8)}% ${a.template_ratio.padStart(10)}% ${a.prompt_ratio.padStart(8)}%`);
  }

  // Hot path identification
  console.log('\n=== Hot Paths (highest cost per invocation) ===\n');
  const byAvgTokens = [...analysis].sort((a, b) => b.avg_tokens - a.avg_tokens);
  for (let i = 0; i < Math.min(5, byAvgTokens.length); i++) {
    const a = byAvgTokens[i];
    console.log(`${i + 1}. ${a.phase}/${a.agent}: ${a.avg_tokens} tokens/invocation`);
    console.log(`   Memory: ${a.avg_memory_load} tokens (${a.memory_ratio}%) | Template: ${a.avg_template_tokens} tokens (${a.template_ratio}%) | Prompt: ${a.avg_tokens - a.avg_memory_load - a.avg_template_tokens} tokens (${a.prompt_ratio}%)`);
    console.log(`   Duration: ${Math.round(a.avg_duration_ms / 1000)}s | Invocations: ${a.invocations}`);
    console.log();
  }

  // Optimization recommendations
  console.log('=== Optimization Recommendations ===\n');

  // 1. Heavy templates
  const heavyTemplates = analysis.filter(a => parseFloat(a.template_ratio) > 30);
  if (heavyTemplates.length > 0) {
    console.log('1. HEAVY TEMPLATES (>30% of tokens are template content):');
    for (const a of heavyTemplates) {
      console.log(`   - ${a.phase}/${a.agent}: ${a.avg_template_tokens} template tokens (${a.template_ratio}% of total)`);
    }
    console.log('   Fix: Simplify templates or use section-loading (only read relevant sections).\n');
  }

  // 2. High memory load
  const heavyMemory = analysis.filter(a => parseFloat(a.memory_ratio) > 35);
  if (heavyMemory.length > 0) {
    console.log('2. HIGH MEMORY LOAD (>35% of tokens are memory):');
    for (const a of heavyMemory) {
      console.log(`   - ${a.phase}/${a.agent}: ${a.avg_memory_load} memory tokens (${a.memory_ratio}% of total)`);
    }
    console.log('   Fix: Reduce memory_filter.js max results, or use more targeted search queries.\n');
  }

  // 3. Long duration agents
  const slowAgents = analysis.filter(a => a.avg_duration_ms > 60000);
  if (slowAgents.length > 0) {
    console.log('3. SLOW AGENTS (>60s average duration):');
    for (const a of slowAgents) {
      console.log(`   - ${a.phase}/${a.agent}: ${Math.round(a.avg_duration_ms / 1000)}s average`);
    }
    console.log('   Fix: These are likely doing web searches. Consider caching or pre-fetching.\n');
  }

  // 4. Phase cost summary
  const phaseCosts = {};
  for (const a of analysis) {
    if (!phaseCosts[a.phase]) phaseCosts[a.phase] = { total: 0, agents: 0 };
    phaseCosts[a.phase].total += a.total_tokens;
    phaseCosts[a.phase].agents += a.invocations;
  }

  console.log('4. PHASE COST SUMMARY:');
  const phaseOrder = ['validation', 'exploration', 'design', 'development'];
  for (const phase of phaseOrder) {
    const cost = phaseCosts[phase];
    if (cost) {
      console.log(`   ${phase}: ${cost.total} tokens across ${cost.agents} invocations`);
    }
  }
}

function main() {
  const days = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] || '7', 10);
  const analysis = analyzeHotPaths(days);
  printReport(analysis);
}

main();
