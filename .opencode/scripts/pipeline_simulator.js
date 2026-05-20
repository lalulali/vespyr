#!/usr/bin/env node
/**
 * Pipeline Simulator — Generates Realistic Telemetry Data for Vespyr
 *
 * Simulates a full pipeline run (validation → exploration → design → development)
 * and records telemetry events for profiling and optimization analysis.
 *
 * Usage:
 *   node pipeline_simulator.js
 *   node pipeline_simulator.js --runs 3
 *   node pipeline_simulator.js --project "SaaS Dashboard" --type startup
 */

const { execSync } = require('child_process');
const path = require('path');

const TELEMETRY_SCRIPT = path.join(__dirname, 'swarm_telemetry.js');

// Realistic token estimates based on actual agent prompt sizes + memory load
const PHASE_CONFIG = {
  validation: {
    agents: [
      { name: 'founder', base_tokens: 2107, memory_load: 800, template_tokens: 1370, duration_ms: 45000 }
    ]
  },
  exploration: {
    agents: [
      { name: 'researcher', base_tokens: 906, memory_load: 1000, template_tokens: 1192, duration_ms: 60000 },
      { name: 'user-researcher', base_tokens: 1044, memory_load: 1000, template_tokens: 1720, duration_ms: 55000 }
    ]
  },
  design: {
    agents: [
      { name: 'product-manager', base_tokens: 2542, memory_load: 1200, template_tokens: 1066, duration_ms: 70000 },
      { name: 'product-designer', base_tokens: 1255, memory_load: 1000, template_tokens: 3045, duration_ms: 65000 }
    ]
  },
  development: {
    agents: [
      { name: 'tech-lead', base_tokens: 1719, memory_load: 1000, template_tokens: 1606, duration_ms: 50000 },
      { name: 'developer', base_tokens: 1988, memory_load: 1200, template_tokens: 0, duration_ms: 120000 },
      { name: 'code-reviewer', base_tokens: 1026, memory_load: 800, template_tokens: 0, duration_ms: 40000 },
      { name: 'qa-engineer', base_tokens: 1270, memory_load: 800, template_tokens: 0, duration_ms: 35000 }
    ]
  }
};

// Variance factors (real runs aren't deterministic)
function variance(base, pct = 0.15) {
  return Math.round(base * (1 + (Math.random() - 0.5) * 2 * pct));
}

function simulateRun(projectName = 'Simulated Project', projectType = 'startup') {
  console.log(`\n=== Simulating: ${projectName} (${projectType}) ===\n`);

  const events = [];

  for (const [phaseName, phaseConfig] of Object.entries(PHASE_CONFIG)) {
    console.log(`Phase: ${phaseName}`);

    for (const agent of phaseConfig.agents) {
      const totalTokens = variance(agent.base_tokens + agent.memory_load + agent.template_tokens);
      const durationMs = variance(agent.duration_ms, 0.2);

      // Record agent invocation
      const recordCmd = `node "${TELEMETRY_SCRIPT}" record --type agent_invoke --agent "${agent.name}" --phase "${phaseName}" --data '{"tokens":${totalTokens},"duration_ms":${durationMs},"memory_load":${variance(agent.memory_load, 0.1)},"template_tokens":${variance(agent.template_tokens, 0.1)}}'`;
      execSync(recordCmd, { stdio: 'pipe' });

      // Record memory load event
      const memCmd = `node "${TELEMETRY_SCRIPT}" record --type memory_load --data '{"agent":"${agent.name}","tokens":${variance(agent.memory_load, 0.1)},"phase":"${phaseName}"}'`;
      execSync(memCmd, { stdio: 'pipe' });

      console.log(`  @${agent.name}: ${totalTokens} tokens, ${durationMs}ms`);
      events.push({ agent: agent.name, phase: phaseName, tokens: totalTokens, duration_ms: durationMs });
    }
  }

  const totalTokens = events.reduce((s, e) => s + e.tokens, 0);
  const totalDuration = events.reduce((s, e) => s + e.duration_ms, 0);
  console.log(`\n  Total: ${totalTokens} tokens, ${Math.round(totalDuration / 1000)}s`);

  return events;
}

function main() {
  const runs = parseInt(process.argv.find(a => a.startsWith('--runs='))?.split('=')[1] || '1', 10);
  const project = process.argv.find(a => a.startsWith('--project='))?.split('=')[1] || 'Simulated Project';
  const type = process.argv.find(a => a.startsWith('--type='))?.split('=')[1] || 'startup';

  console.log('Vespyr Pipeline Simulator');
  console.log('========================\n');
  console.log(`Configuration: ${runs} run(s), project="${project}", type="${type}"`);

  const allEvents = [];
  for (let i = 0; i < runs; i++) {
    const events = simulateRun(project, type);
    allEvents.push(...events);
  }

  console.log('\n\n=== Telemetry Summary ===\n');

  // Run the telemetry report
  const reportCmd = `node "${TELEMETRY_SCRIPT}" report`;
  console.log(execSync(reportCmd, { encoding: 'utf8' }));

  // Run the summary
  const summaryCmd = `node "${TELEMETRY_SCRIPT}" summary --days 1`;
  console.log(execSync(summaryCmd, { encoding: 'utf8' }));
}

main();
