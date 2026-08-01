#!/usr/bin/env node
/**
 * Swarm Telemetry — Passive Event Recorder for Vespyr
 *
 * Appends structured events to newline-delimited JSON files.
 * Never blocks, never overwrites, never throws.
 *
 * Usage:
 *   node swarm_telemetry.js record --type memory_load --data '{...}'
 *   node swarm_telemetry.js record --type agent_invoke --agent founder --phase validation --tokens 12000
 *   node swarm_telemetry.js summary --days 7
 *   node swarm_telemetry.js report
 *   node swarm_telemetry.js baseline
 */

const fs = require('fs');
const path = require('path');

const TELEMETRY_DIR = path.join(process.cwd(), 'artifacts', 'telemetry');

// Ensure telemetry directory exists
function ensureDir() {
  try {
    if (!fs.existsSync(TELEMETRY_DIR)) {
      fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    }
  } catch (e) {
    // Silent fail — telemetry must never block
  }
}

// Get today's ndjson file path
function getTodayFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(TELEMETRY_DIR, `events-${date}.ndjson`);
}

/**
 * Record a telemetry event
 * @param {string} type - Event type (memory_load, memory_write, archive_compact, archive_search, agent_delegation, context_relevance_feedback)
 * @param {object} data - Arbitrary event payload
 */
function recordEvent(type, data) {
  ensureDir();
  const event = {
    ts: new Date().toISOString(),
    type,
    data: data || {}
  };
  const line = JSON.stringify(event) + '\n';
  try {
    fs.appendFileSync(getTodayFile(), line);
  } catch (e) {
    // Silent fail — telemetry must never block
  }
}

/**
 * Read all events from the last N days
 * @param {number} days
 * @returns {Array}
 */
function readEvents(days = 7) {
  ensureDir();
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
        } catch (e) {
          // Skip corrupt lines
        }
      }
    }
  }
  return events;
}

/**
 * Generate a summary report of recent telemetry
 */
function generateSummary(days = 7) {
  const events = readEvents(days);
  const stats = {
    total_events: events.length,
    by_type: {},
    memory_load_avg_tokens: 0,
    memory_load_count: 0,
    dedupe_pass_rate: null,
    dedupe_total: 0,
    dedupe_passes: 0,
    archive_compact_count: 0,
    archive_search_avg_results: 0,
    archive_search_count: 0,
    agent_delegation_count: 0,
    context_feedback_positive: 0,
    context_feedback_total: 0
  };

  for (const ev of events) {
    stats.by_type[ev.type] = (stats.by_type[ev.type] || 0) + 1;

    if (ev.type === 'memory_load') {
      stats.memory_load_count++;
      if (ev.data.tokens) {
        stats.memory_load_avg_tokens += ev.data.tokens;
      }
    }

    if (ev.type === 'memory_write') {
      stats.dedupe_total++;
      if (ev.data.dedupe_result === 'pass') stats.dedupe_passes++;
    }

    if (ev.type === 'archive_compact') {
      stats.archive_compact_count++;
    }

    if (ev.type === 'archive_search') {
      stats.archive_search_count++;
      if (ev.data.results_returned != null) {
        stats.archive_search_avg_results += ev.data.results_returned;
      }
    }

    if (ev.type === 'agent_delegation') {
      stats.agent_delegation_count++;
    }

    if (ev.type === 'context_relevance_feedback') {
      stats.context_feedback_total++;
      if (ev.data.rating === 'positive') stats.context_feedback_positive++;
    }
  }

  if (stats.memory_load_count > 0) {
    stats.memory_load_avg_tokens = Math.round(stats.memory_load_avg_tokens / stats.memory_load_count);
  }

  if (stats.dedupe_total > 0) {
    stats.dedupe_pass_rate = (stats.dedupe_passes / stats.dedupe_total * 100).toFixed(1) + '%';
  }

  if (stats.archive_search_count > 0) {
    stats.archive_search_avg_results = (stats.archive_search_avg_results / stats.archive_search_count).toFixed(1);
  }

  if (stats.context_feedback_total > 0) {
    stats.context_feedback_positive_rate = (stats.context_feedback_positive / stats.context_feedback_total * 100).toFixed(1) + '%';
  }

  return stats;
}

/**
 * Generate a per-agent-per-phase token usage report.
 * Reads all events and groups by phase + agent.
 */
function generateReport(days = 30) {
  const events = readEvents(days);
  const phases = {};

  for (const ev of events) {
    if (ev.type === 'agent_invoke' && ev.data.phase && ev.data.agent) {
      const phase = ev.data.phase;
      const agent = ev.data.agent;
      if (!phases[phase]) phases[phase] = {};
      if (!phases[phase][agent]) phases[phase][agent] = { count: 0, total_tokens: 0, min_tokens: Infinity, max_tokens: 0, durations: [] };

      phases[phase][agent].count++;
      if (ev.data.tokens) {
        phases[phase][agent].total_tokens += ev.data.tokens;
        phases[phase][agent].min_tokens = Math.min(phases[phase][agent].min_tokens, ev.data.tokens);
        phases[phase][agent].max_tokens = Math.max(phases[phase][agent].max_tokens, ev.data.tokens);
      }
      if (ev.data.duration_ms) {
        phases[phase][agent].durations.push(ev.data.duration_ms);
      }
    }
  }

  // Compute averages and clean up
  const report = {};
  for (const [phase, agents] of Object.entries(phases)) {
    report[phase] = {};
    for (const [agent, stats] of Object.entries(agents)) {
      report[phase][agent] = {
        invocations: stats.count,
        avg_tokens: stats.total_tokens > 0 ? Math.round(stats.total_tokens / stats.count) : null,
        total_tokens: stats.total_tokens > 0 ? stats.total_tokens : null,
        min_tokens: stats.min_tokens === Infinity ? null : stats.min_tokens,
        max_tokens: stats.max_tokens === 0 ? null : stats.max_tokens,
        avg_duration_ms: stats.durations.length > 0 ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length) : null
      };
    }
  }

  return report;
}

/**
 * Baseline metrics collection
 * Scans the current state and records a baseline snapshot.
 */
function recordBaseline() {
  const baseline = {
    type: 'baseline',
    data: {
      memory_files: {},
      archive_entries: 0,
      agent_files: 0,
      skill_files: 0,
      source_files: 0
    }
  };

  // Count memory files
  const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
  if (fs.existsSync(memoryDir)) {
    const files = fs.readdirSync(memoryDir);
    for (const f of files) {
      if (f.endsWith('.md')) {
        const fp = path.join(memoryDir, f);
        const content = fs.readFileSync(fp, 'utf8');
        baseline.data.memory_files[f] = {
          words: content.split(/\s+/).length,
          entries: (content.match(/^### /gm) || []).length
        };
      }
    }
    // Archive index: canonical format is NDJSON (index.ndjson, written by
    // archive_manager.js append-ndjson) — a schema header line followed by one
    // JSON entry object per line. Legacy fallback: index.json with an `entries`
    // array. Mirrors memory_filter.js searchArchive().
    const archiveIndexNdjson = path.join(memoryDir, 'archive', 'index.ndjson');
    const archiveIndexJson = path.join(memoryDir, 'archive', 'index.json');
    if (fs.existsSync(archiveIndexNdjson)) {
      try {
        const lines = fs.readFileSync(archiveIndexNdjson, 'utf8').split('\n');
        let count = 0;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          try {
            const entry = JSON.parse(trimmed);
            // Schema header line has no `id` — only count real entries.
            if (entry && typeof entry === 'object' && entry.id) count++;
          } catch (e) {
            // Skip corrupt lines
          }
        }
        baseline.data.archive_entries = count;
      } catch (e) {}
    } else if (fs.existsSync(archiveIndexJson)) {
      try {
        const idx = JSON.parse(fs.readFileSync(archiveIndexJson, 'utf8'));
        baseline.data.archive_entries = (idx.entries || []).length;
      } catch (e) {}
    }
  }

  // Count agent files
  const agentsDir = path.join(process.cwd(), '.agents', 'agents');
  if (fs.existsSync(agentsDir)) {
    baseline.data.agent_files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).length;
  }

  // Count skill files
  const skillsDir = path.join(process.cwd(), '.agents', 'skills');
  if (fs.existsSync(skillsDir)) {
    const countSkills = (dir) => {
      let count = 0;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          count += countSkills(path.join(dir, entry.name));
        } else if (entry.name === 'SKILL.md') {
          count++;
        }
      }
      return count;
    };
    baseline.data.skill_files = countSkills(skillsDir);
  }

  // Count source files (src/ or project root JS/TS files)
  const srcDir = path.join(process.cwd(), 'src');
  if (fs.existsSync(srcDir)) {
    const countSrc = (dir) => {
      let count = 0;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          count += countSrc(path.join(dir, entry.name));
        } else if (/\.(js|ts|jsx|tsx|py|go|rs|java|rb|php)$/.test(entry.name)) {
          count++;
        }
      }
      return count;
    };
    baseline.data.source_files = countSrc(srcDir);
  }

  recordEvent('baseline', baseline.data);
  return baseline.data;
}

// CLI
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node swarm_telemetry.js record --type <event_type> [--agent <agent>] [--phase <phase>] [--data '<json>']
  node swarm_telemetry.js summary [--days N]
  node swarm_telemetry.js report [--days N]
  node swarm_telemetry.js baseline`);
    process.exit(0);
  }

  const cmd = args[0];

  if (cmd === 'record') {
    let type = null;
    let data = {};
    let agent = null;
    let phase = null;
    for (let i = 1; i < args.length; i += 2) {
      if (args[i] === '--type') type = args[i + 1];
      if (args[i] === '--data') {
        try {
          data = JSON.parse(args[i + 1]);
        } catch (e) {
          data = { raw: args[i + 1] };
        }
      }
      if (args[i] === '--agent') agent = args[i + 1];
      if (args[i] === '--phase') phase = args[i + 1];
    }
    if (!type) {
      console.error('Missing --type');
      process.exit(1);
    }
    if (agent) data.agent = agent;
    if (phase) data.phase = phase;
    recordEvent(type, data);
    console.log('OK');
  }

  if (cmd === 'summary') {
    let days = 7;
    for (let i = 1; i < args.length; i += 2) {
      if (args[i] === '--days') days = parseInt(args[i + 1], 10) || 7;
    }
    const summary = generateSummary(days);
    console.log(JSON.stringify(summary, null, 2));
  }

  if (cmd === 'baseline') {
    const baseline = recordBaseline();
    console.log(JSON.stringify(baseline, null, 2));
  }

  if (cmd === 'report') {
    let days = 30;
    for (let i = 1; i < args.length; i += 2) {
      if (args[i] === '--days') days = parseInt(args[i + 1], 10) || 30;
    }
    const report = generateReport(days);
    console.log(JSON.stringify(report, null, 2));
  }
}

main();
