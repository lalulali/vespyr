#!/usr/bin/env node
/**
 * Swarm Telemetry — Passive Event + Span Recorder for Vespyr (02l Option A Thin Slice)
 *
 * Appends structured events to newline-delimited JSON files.
 * Also emits minimal OpenTelemetry-compatible spans to spans-*.ndjson (canonical schema: tools/telemetry/schema.json)
 * Never blocks, never overwrites, never throws (events); spans validate but never crash caller.
 *
 * Usage:
 *   node swarm_telemetry.js record --type memory_load --data '{...}'
 *   node swarm_telemetry.js record-span --data '{full span json}'
 *   node swarm_telemetry.js record-span --trace <trace_id> --span <span_id> --agent <persona> --workflow <workflow> --model <model_id> --provider <provider> --prompt <n> --completion <n> --duration <ms>
 *   node swarm_telemetry.js summary --days 7
 *   node swarm_telemetry.js report
 *   node swarm_telemetry.js baseline
 *   node swarm_telemetry.js verify --days 7
 *   node swarm_telemetry.js spans --days 7
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function getSpanFile(dateStr) {
  const d = dateStr || new Date().toISOString().split('T')[0];
  return path.join(TELEMETRY_DIR, `spans-${d}.ndjson`);
}

function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16));
}

function estimateTokensFallback(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil(text.length / 4);
}

// Canonical schema path — single owner
function loadCanonicalSchema() {
  try {
    const p = path.join(process.cwd(), 'tools', 'telemetry', 'schema.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {}
  return null;
}

function validateSpan(span) {
  const errors = [];
  if (!span.trace_id) errors.push('trace_id required');
  if (!span.span_id) errors.push('span_id required');
  if (span.parent_span_id !== null && span.parent_span_id !== undefined && typeof span.parent_span_id !== 'string') errors.push('parent_span_id must be string or null');
  if (!span.timestamp) errors.push('timestamp required');
  if (!span.session_id) errors.push('session_id required');
  if (!span.workflow) errors.push('workflow required');
  if (!span.agent_persona) errors.push('agent_persona required');
  if (!span.model || !span.model.provider || !span.model.model_id) errors.push('model.provider/model_id required');
  if (!span.usage || typeof span.usage.total_tokens !== 'number') errors.push('usage.total_tokens required');
  if (typeof span.usage.estimated !== 'boolean') errors.push('usage.estimated must be boolean');
  if (typeof span.duration_ms !== 'number' || span.duration_ms < 0) errors.push('duration_ms must be >=0');
  if (!span.quality_scorecard || typeof span.quality_scorecard.rqs_d_score !== 'number') errors.push('quality_scorecard.rqs_d_score required');
  if (errors.length) return { valid: false, errors };
  return { valid: true };
}

/**
 * Record a telemetry event (legacy)
 * @param {string} type - Event type
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
 * Record a distributed span (02l Option A Hybrid)
 * @param {object} span - Full VespyrTelemetrySpan per tools/telemetry/schema.json
 * @returns {object} { ok, span, validation }
 */
function recordSpan(span) {
  ensureDir();
  const now = new Date().toISOString().split('T')[0];
  const s = { ...span };
  // Auto-populate defaults
  if (!s.trace_id) s.trace_id = generateId();
  if (!s.span_id) s.span_id = generateId();
  if (s.parent_span_id === undefined) s.parent_span_id = null;
  if (!s.timestamp) s.timestamp = new Date().toISOString();
  if (!s.session_id) s.session_id = process.env.VESPYR_SESSION_ID || 'local';
  if (!s.workflow) s.workflow = 'unknown';
  if (!s.agent_persona) s.agent_persona = 'unknown';
  if (!s.model) s.model = { provider: 'unknown', model_id: 'unknown', temperature: 0 };
  if (!s.usage) s.usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost_usd: null, estimated: true };
  if (s.usage.cost_usd === undefined) s.usage.cost_usd = null;
  if (typeof s.usage.estimated !== 'boolean') s.usage.estimated = true;
  if (s.usage.total_tokens == null) s.usage.total_tokens = (s.usage.prompt_tokens||0)+(s.usage.completion_tokens||0);
  if (typeof s.duration_ms !== 'number') s.duration_ms = 0;
  if (!s.quality_scorecard) s.quality_scorecard = { rqs_d_score: 0, rqs_j_score: null, rating: 'REJECTED', biomarkers: { scr: 0, msha: 0, placeholder_density: 1, pci: 1, ac_testability: 0, srsr: null, scope_drift: null } };
  if (!s.tier0_evaluation) s.tier0_evaluation = { executed: false, passed: false, checks: [] };
  if (s.error === undefined) s.error = null;

  const v = validateSpan(s);
  // Even if invalid, we still write with error marker to surface fault — never throw
  if (!v.valid) {
    s.error = { code: 'SPAN_VALIDATION', message: v.errors.join('; ') };
  }
  try {
    fs.appendFileSync(getSpanFile(now), JSON.stringify(s) + '\n');
  } catch (e) {}
  return { ok: v.valid, span: s, validation: v };
}

/**
 * Capture usage at LLM call site — harness-agnostic single callback (02l Option A)
 * Thin wrapper around recordSpan that computes total and estimated flag.
 * @param {object} opts { trace_id, span_id, parent_span_id, workflow, agent_persona, model, usage, duration_ms, quality_scorecard }
 */
function captureUsage(opts) {
  const usage = opts.usage || {};
  const hasNative = typeof usage.prompt_tokens === 'number' && typeof usage.completion_tokens === 'number';
  const prompt = hasNative ? usage.prompt_tokens : 0;
  const completion = hasNative ? usage.completion_tokens : 0;
  const total = hasNative ? (usage.total_tokens != null ? usage.total_tokens : prompt + completion) : (usage.total_tokens != null ? usage.total_tokens : estimateTokensFallback(opts.rawText||''));
  const estimated = !hasNative;
  return recordSpan({
    trace_id: opts.trace_id,
    span_id: opts.span_id,
    parent_span_id: opts.parent_span_id || null,
    session_id: opts.session_id,
    workflow: opts.workflow,
    agent_persona: opts.agent_persona,
    model: opts.model,
    usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: total, cost_usd: usage.cost_usd != null ? usage.cost_usd : null, estimated },
    duration_ms: opts.duration_ms || 0,
    quality_scorecard: opts.quality_scorecard || { rqs_d_score: 0, rqs_j_score: null, rating: 'REJECTED', biomarkers: { scr: 0, msha: 0, placeholder_density: 1, pci: 1, ac_testability: 0, srsr: null, scope_drift: null } },
    tier0_evaluation: opts.tier0_evaluation || { executed: false, passed: false, checks: [] },
    error: opts.error || null,
    timestamp: opts.timestamp,
  });
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

function readSpans(days = 7) {
  ensureDir();
  const spans = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const file = path.join(TELEMETRY_DIR, `spans-${dateStr}.ndjson`);
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          spans.push(JSON.parse(line));
        } catch (e) {}
      }
    }
  }
  return spans;
}

function verifySpans(days = 7) {
  const spans = readSpans(days);
  const total = spans.length;
  if (total === 0) return { total: 0, exact: 0, estimated: 0, exact_coverage: null, zero_token: 0, valid: 0, invalid: 0, hybrid_pass: true, reason: 'no spans yet — skip gate (empty window passes)' };
  let exact = 0, estimated = 0, zero = 0, valid = 0, invalid = 0;
  for (const s of spans) {
    if (s.usage && s.usage.estimated === false) exact++;
    else estimated++;
    if (!s.usage || s.usage.total_tokens === 0) zero++;
    const v = validateSpan(s);
    if (v.valid) valid++; else invalid++;
  }
  const exact_coverage = total ? exact / total : null;
  const hybrid_pass = total > 0 && exact_coverage != null && exact_coverage >= 0.8 && zero < total; // zero < total ensures not all zero, but allow zero check separate
  // strict hybrid: >=80% exact and no >20% estimated, plus not all zero
  const hybridStrict = exact_coverage >= 0.8 && zero !== total;
  return { total, exact, estimated, exact_coverage: exact_coverage != null ? Number(exact_coverage.toFixed(3)) : null, zero_token: zero, valid, invalid, hybrid_pass: hybridStrict, reason: hybridStrict ? 'pass' : (exact_coverage < 0.8 ? 'INSUFFICIENT_EXACT_COVERAGE (<80% exact)' : 'zero-token window') };
}

/**
 * Generate a summary report of recent telemetry
 */
function generateSummary(days = 7) {
  const events = readEvents(days);
  const spans = readSpans(days);
  const stats = {
    total_events: events.length,
    total_spans: spans.length,
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

  if (spans.length) {
    const verify = verifySpans(days);
    stats.spans = verify;
    // RQS-D avg
    const rqs = spans.filter(s=>s.quality_scorecard && typeof s.quality_scorecard.rqs_d_score==='number').map(s=>s.quality_scorecard.rqs_d_score);
    if (rqs.length) stats.rqs_d_avg = Number((rqs.reduce((a,b)=>a+b,0)/rqs.length).toFixed(3));
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
            if (entry && typeof entry === 'object' && entry.id) count++;
          } catch (e) {}
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
  node swarm_telemetry.js record-span --data '<full span json>'  (or --trace <id> --span <id> --agent <a> --workflow <w> --model <m> --provider <p> --prompt <n> --completion <n> --duration <ms>)
  node swarm_telemetry.js summary [--days N]
  node swarm_telemetry.js report [--days N]
  node swarm_telemetry.js spans [--days N]
  node swarm_telemetry.js verify [--days N]
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

  if (cmd === 'record-span') {
    let data = null;
    const opts = {};
    for (let i = 1; i < args.length; i += 2) {
      if (args[i] === '--data') {
        try { data = JSON.parse(args[i+1]); } catch(e) { console.error('Invalid --data JSON'); process.exit(1); }
      }
      if (args[i] === '--trace') opts.trace_id = args[i+1];
      if (args[i] === '--span') opts.span_id = args[i+1];
      if (args[i] === '--parent') opts.parent_span_id = args[i+1];
      if (args[i] === '--agent') opts.agent_persona = args[i+1];
      if (args[i] === '--workflow') opts.workflow = args[i+1];
      if (args[i] === '--model') opts.model_id = args[i+1];
      if (args[i] === '--provider') opts.provider = args[i+1];
      if (args[i] === '--prompt') opts.prompt_tokens = parseInt(args[i+1],10);
      if (args[i] === '--completion') opts.completion_tokens = parseInt(args[i+1],10);
      if (args[i] === '--total') opts.total_tokens = parseInt(args[i+1],10);
      if (args[i] === '--duration') opts.duration_ms = parseInt(args[i+1],10);
      if (args[i] === '--rqs') opts.rqs_d_score = parseFloat(args[i+1]);
    }
    if (data) {
      const r = recordSpan(data);
      console.log(JSON.stringify({ ok: r.ok, validation: r.validation }, null, 2));
      process.exit(r.ok ? 0 : 2);
    } else {
      // build minimal span from flags
      const span = {
        trace_id: opts.trace_id || generateId(),
        span_id: opts.span_id || generateId(),
        parent_span_id: opts.parent_span_id || null,
        timestamp: new Date().toISOString(),
        session_id: process.env.VESPYR_SESSION_ID || 'local',
        workflow: opts.workflow || 'unknown',
        agent_persona: opts.agent_persona || 'unknown',
        model: { provider: opts.provider || 'unknown', model_id: opts.model_id || 'unknown', temperature: 0 },
        usage: { prompt_tokens: opts.prompt_tokens||0, completion_tokens: opts.completion_tokens||0, total_tokens: (opts.total_tokens!=null?opts.total_tokens:(opts.prompt_tokens||0)+(opts.completion_tokens||0)), cost_usd: null, estimated: !(opts.prompt_tokens!=null && opts.completion_tokens!=null) },
        duration_ms: opts.duration_ms||0,
        quality_scorecard: { rqs_d_score: opts.rqs_d_score!=null?opts.rqs_d_score:0, rqs_j_score: null, rating: (opts.rqs_d_score>=0.95?'EXCELLENT':opts.rqs_d_score>=0.85?'PASS':opts.rqs_d_score>=0.7?'NEEDS_REPAIR':'REJECTED'), biomarkers: { scr: 1, msha: 1, placeholder_density: 0, pci: 0, ac_testability: 1, srsr: null, scope_drift: null } },
        tier0_evaluation: { executed: true, passed: (opts.rqs_d_score||0)>=0.85, checks: [] },
        error: null
      };
      const r = recordSpan(span);
      console.log(JSON.stringify({ ok: r.ok, span: r.span.span_id, validation: r.validation }, null, 2));
      process.exit(r.ok ? 0 : 2);
    }
  }

  if (cmd === 'summary') {
    let days = 7;
    for (let i = 1; i < args.length; i += 2) {
      if (args[i] === '--days') days = parseInt(args[i + 1], 10) || 7;
    }
    const summary = generateSummary(days);
    console.log(JSON.stringify(summary, null, 2));
  }

  if (cmd === 'spans') {
    let days = 7;
    for (let i = 1; i < args.length; i += 2) {
      if (args[i] === '--days') days = parseInt(args[i + 1], 10) || 7;
    }
    const spans = readSpans(days);
    console.log(JSON.stringify(spans, null, 2));
  }

  if (cmd === 'verify') {
    let days = 7;
    for (let i = 1; i < args.length; i += 2) {
      if (args[i] === '--days') days = parseInt(args[i + 1], 10) || 7;
    }
    const v = verifySpans(days);
    console.log(JSON.stringify(v, null, 2));
    process.exit(v.hybrid_pass ? 0 : 2);
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

if (require.main === module) main();

module.exports = { recordEvent, recordSpan, captureUsage, readEvents, readSpans, verifySpans, generateSummary, generateReport, estimateTokensFallback, generateId, validateSpan, loadCanonicalSchema };
