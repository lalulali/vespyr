#!/usr/bin/env node
/**
 * Pipeline State Manager — DAG Pipeline Execution for Vespyr
 *
 * Manages pipeline state, validates outputs, tracks artifact versions,
 * and determines next actions. This script is the canonical source of
 * truth for project state — every skill calls it directly via
 * `@executor`. There is no @orchestrator subagent; the script itself
 * is the state machine.
 *
 * State hierarchy:
 *   Source of truth: artifacts/output/sprint-status.yaml (human-readable)
 *   Derived cache:   artifacts/output/pipeline-state.json (backward compat)
 *   readState() tries YAML first, falls back to JSON.
 *
 * Usage:
 *   node orchestrator_state.js init --name "My Project" --type startup
 *   node orchestrator_state.js status
 *   node orchestrator_state.js next
 *   node orchestrator_state.js complete --agent founder --artifact idea-brief.md
 *   node orchestrator_state.js file-cr --from developer --to product-manager --target user-stories.md --issue "..."
 *   node orchestrator_state.js validate --phase design
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.cwd(), 'artifacts', 'output', 'pipeline-state.json');
const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'output');
const TELEMETRY_DIR = path.join(process.cwd(), 'artifacts', 'telemetry');
const PROJECT_ROOT = process.cwd();

function ensureDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Parse sprint-status.yaml into a state-compatible object.
// This is a lightweight parser for the known YAML schema — no external deps.
function readYaml() {
  if (!fs.existsSync(YAML_STATE)) return null;
  try {
    const raw = fs.readFileSync(YAML_STATE, 'utf8');
    const lines = raw.split('\n');
    const state = {
      project: { name: '', type: '', squad: '' },
      created_at: null,
      last_updated: null,
      current_phase: 'discovery',
      phases: {},
      artifacts: {},
      change_requests: [],
      blockers: [],
      stories: {},
      history: []
    };

    let section = null; // 'phases' | 'stories'
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed === '') continue;

      // Top-level scalar fields
      if (trimmed.startsWith('generated:')) {
        state.created_at = trimmed.split(':').slice(1).join(':').trim();
      } else if (trimmed.startsWith('last_updated:')) {
        state.last_updated = trimmed.split(':').slice(1).join(':').trim();
      } else if (trimmed.startsWith('project:') && !trimmed.startsWith('project_key:')) {
        state.project.name = trimmed.split(':').slice(1).join(':').trim();
        state.name = state.project.name;
      } else if (trimmed.startsWith('squad:')) {
        state.project.squad = trimmed.split(':').slice(1).join(':').trim();
        state.squad = state.project.squad;
      } else if (trimmed.startsWith('phase:')) {
        state.current_phase = trimmed.split(':').slice(1).join(':').trim();
        state.phase = state.current_phase;
      } else if (trimmed === 'phases:') {
        section = 'phases';
      } else if (trimmed === 'stories:') {
        section = 'stories';
      } else if (section && line.startsWith('  ') && trimmed.includes(':')) {
        const [key, ...valParts] = trimmed.split(':');
        const val = valParts.join(':').trim();
        if (section === 'phases') {
          state.phases[key.trim()] = { status: val, started_at: null, completed_at: null, agents: [] };
        } else if (section === 'stories') {
          state.stories[key.trim()] = val;
        }
      }
    }
    return state;
  } catch (e) {
    return null;
  }
}

function readState() {
  // Source of truth: YAML. Fallback: JSON.
  const yamlState = readYaml();
  if (yamlState) return yamlState;
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeState(state) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  syncYaml(state);
}

// Sync pipeline state to sprint-status.yaml (human-readable mirror)
const YAML_STATE = path.join(OUTPUT_DIR, 'sprint-status.yaml');

function syncYaml(state) {
  const name = (state.project && state.project.name) || state.name || '';
  const phase = state.current_phase || state.phase || 'discovery';
  const squad = (state.project && state.project.squad) || state.squad || 'full-team';
  const yaml = [
    '# artifacts/output/sprint-status.yaml',
    `generated: ${state.created_at ? state.created_at.split('T')[0] : new Date().toISOString().split('T')[0]}`,
    `last_updated: ${new Date().toISOString().split('T')[0]}`,
    `project: ${name}`,
    `project_key: ${name.toLowerCase().replace(/\s+/g, '-')}`,
    'tracking_system: file-system',
    `squad: ${squad}`,
    `phase: ${phase}`,
    '',
    '# Phase-level status',
    'phases:',
  ];
  for (const [p, v] of Object.entries(state.phases || {})) {
    const status = typeof v === 'string' ? v : (v.status || 'pending');
    yaml.push(`  ${p}: ${status}`);
  }
  yaml.push('');
  yaml.push('# Story-level status (when in development)');
  yaml.push('stories:');
  if (state.stories && Object.keys(state.stories).length > 0) {
    for (const [id, v] of Object.entries(state.stories)) {
      const status = typeof v === 'string' ? v : (v.status || v);
      yaml.push(`  ${id}: ${status}`);
    }
  } else {
    yaml.push('  # US-001-feature-name: done');
  }
  yaml.push('');
  try {
    fs.writeFileSync(YAML_STATE, yaml.join('\n'), 'utf8');
  } catch (e) {
    // YAML sync is best-effort; don't block on write failure
  }
}

// ASCII dashboard for 'status' command
function printDashboard(state) {
  const icon = (s) => s === 'done' ? '✅' : s === 'in-progress' ? '▶️ ' : s === 'pending' ? '  ' : '  ';
  const name = (state.project && state.project.name) || state.name || 'unnamed';
  const phase = state.current_phase || state.phase || 'unknown';
  const squad = (state.project && state.project.squad) || state.squad || 'full-team';
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  Project: ${name.padEnd(28)} ║`);
  console.log(`║  Phase:   ${phase.padEnd(28)} ║`);
  console.log(`║  Squad:   ${squad.padEnd(28)} ║`);
  console.log(`╠══════════════════════════════════════════╣`);
  console.log(`║  Phase Pipeline                          ║`);
  console.log(`╠══════════════════════════════════════════╣`);
  if (state.phases) {
    const entries = Object.entries(state.phases);
    for (const [p, v] of entries) {
      const s = typeof v === 'string' ? v : (v.status || 'pending');
      console.log(`║  ${icon(s)} ${p.padEnd(34)} ║`);
    }
  }
  console.log(`╚══════════════════════════════════════════╝\n`);
}

// ASCII dashboard for 'next' command
function printNextDashboard(state, action) {
  printDashboard(state);
  if (action.phase) {
    console.log(`Current phase:  ${action.phase}`);
    console.log(`Phase status:   ${action.status || 'unknown'}`);
  }
  if (action.action === 'generate-artifacts' && action.artifacts) {
    console.log(`Action needed:  generate artifacts`);
    for (const a of action.artifacts) {
      console.log(`  - ${a}`);
    }
  } else if (action.action === 'advance-phase') {
    console.log(`Next phase:     ${action.next_phase || 'unknown'}`);
  }
  if (action.recommendations) {
    console.log(`\nRecommendations:`);
    for (const r of action.recommendations) {
      console.log(`  → ${r}`);
    }
  }
  console.log('');
}

// Best-effort token estimate from file size: ~0.75 words per token on average.
// Used only when the caller does not supply --tokens.
function estimateTokensFromFile(absPath) {
  try {
    if (!fs.existsSync(absPath)) return 0;
    const content = fs.readFileSync(absPath, 'utf8');
    const words = content.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 0.75));
  } catch (e) {
    return 0;
  }
}

// Auto-record a telemetry event. Never throws — telemetry must not block orchestration.
function recordTelemetry(eventType, fields) {
  const telemetryScript = path.join(__dirname, 'swarm_telemetry.js');
  if (!fs.existsSync(telemetryScript)) return;
  try {
    if (!fs.existsSync(TELEMETRY_DIR)) fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    const parts = [`--type ${eventType}`];
    if (fields.agent) parts.push(`--agent ${fields.agent}`);
    if (fields.phase) parts.push(`--phase ${fields.phase}`);
    if (fields.data) parts.push(`--data '${JSON.stringify(fields.data)}'`);
    require('child_process').execSync(
      `node "${telemetryScript}" record ${parts.join(' ')}`,
      { stdio: 'ignore' }
    );
  } catch (e) {
    // Silent fail
  }
}

// Ensure a structural graph is fresh, recording the result as telemetry.
// Never throws — graph failures must not block orchestration.
function ensureGraph(type) {
  const ensureScript = path.join(__dirname, 'ensure_graph.js');
  if (!fs.existsSync(ensureScript)) return null;
  try {
    const stdout = require('child_process').execFileSync(
      'node', [ensureScript, type],
      { encoding: 'utf8', cwd: PROJECT_ROOT }
    );
    const result = JSON.parse(stdout);
    recordTelemetry('graph_status', {
      data: { graph: type, ...result }
    });
    return result;
  } catch (e) {
    recordTelemetry('graph_status', {
      data: { graph: type, status: 'failed', error: e.message, stderr: e.stderr ? e.stderr.toString() : null }
    });
    return null;
  }
}

function createInitialState(name, type, squadName = 'full-team') {
  let squad = null;
  try {
    const squadsUtil = require('./squads');
    squad = squadsUtil.loadSquad(squadName);
  } catch (e) {
    squad = { name: 'full-team', agents: [] };
  }

  const defaultPhases = {
    validation: { status: 'pending', started_at: null, completed_at: null, agents: ['founder'] },
    exploration: { status: 'pending', started_at: null, completed_at: null, agents: ['researcher', 'user-researcher'] },
    design: { status: 'pending', started_at: null, completed_at: null, agents: ['product-manager', 'product-designer'] },
    development: { status: 'pending', started_at: null, completed_at: null, agents: ['tech-lead', 'developer', 'code-reviewer', 'qa-engineer'] }
  };

  if (squadName !== 'full-team') {
    const activeAgents = new Set(squad.agents);
    for (const phaseKey of Object.keys(defaultPhases)) {
      defaultPhases[phaseKey].agents = defaultPhases[phaseKey].agents.filter(a => activeAgents.has(a));
      if (defaultPhases[phaseKey].agents.length === 0) {
        defaultPhases[phaseKey].status = 'complete';
      }
    }
  }

  let startPhase = 'validation';
  const phaseOrder = ['validation', 'exploration', 'design', 'development'];
  for (const phaseKey of phaseOrder) {
    if (defaultPhases[phaseKey].status !== 'complete') {
      startPhase = phaseKey;
      break;
    }
  }

  return {
    project: { name, type, squad: squadName },
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    current_phase: startPhase,
    phases: defaultPhases,
    artifacts: {},
    change_requests: [],
    blockers: [],
    history: []
  };
}

function getPhaseArtifacts(phase) {
  const artifactMap = {
    validation: [
      { name: 'idea-brief.md', path: '01-discovery/idea-brief.md', required: true, fallbackPath: '01-discovery/validation-brief.md', fallbackName: 'validation-brief.md' }
    ],
    exploration: [
      { name: 'market-analysis.md', path: '02-research/market-analysis.md', required: true },
      { name: 'competitive-analysis.md', path: '02-research/competitive-analysis.md', required: true },
      { name: 'user-personas.md', path: '02-research/user-personas.md', required: true }
    ],
    design: [
      { name: 'requirements.md', path: '03-strategy/requirements.md', required: true },
      { name: 'user-stories.md', path: '03-strategy/user-stories.md', required: true },
      { name: 'product-spec.md', path: '03-strategy/product-spec.md', required: true }
    ],
    development: [
      { name: 'execution-plan.md', path: '05-planning/execution-plan.md', required: true },
      { name: 'change-requests.md', path: '05-planning/change-requests.md', required: false }
    ]
  };
  return artifactMap[phase] || [];
}

function validatePhaseArtifacts(phase) {
  const artifacts = getPhaseArtifacts(phase);
  const results = [];
  let allPresent = true;

  for (const art of artifacts) {
    let fullPath = path.join(OUTPUT_DIR, art.path);
    let exists = fs.existsSync(fullPath);
    let name = art.name;
    let actualPath = art.path;

    if (!exists && art.fallbackPath) {
      const fallbackFullPath = path.join(OUTPUT_DIR, art.fallbackPath);
      if (fs.existsSync(fallbackFullPath)) {
        fullPath = fallbackFullPath;
        exists = true;
        name = art.fallbackName;
        actualPath = art.fallbackPath;
      }
    }

    if (!exists && art.required) allPresent = false;

    let version = null;
    if (exists) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const versionMatch = content.match(/\*\*Version:\*\*\s*(\d+)/);
      version = versionMatch ? parseInt(versionMatch[1], 10) : null;
    }

    results.push({
      name: name,
      path: actualPath,
      required: art.required,
      exists,
      version
    });
  }

  return { allPresent, artifacts: results };
}

function determineNextAction(state) {
  const phaseOrder = ['validation', 'exploration', 'design', 'development'];
  const currentPhase = state.current_phase;
  const phaseIdx = phaseOrder.indexOf(currentPhase);

  // Check for open change requests first
  const openCRs = state.change_requests.filter(cr => cr.status === 'OPEN');
  if (openCRs.length > 0) {
    return {
      action: 'resolve-cr',
      cr: openCRs[0],
      reason: `${openCRs.length} open change request(s) must be resolved before proceeding`
    };
  }

  // Check for blockers
  if (state.blockers.length > 0) {
    return {
      action: 'resolve-blocker',
      blocker: state.blockers[0],
      reason: 'Active blockers must be resolved before proceeding'
    };
  }

  // Validate current phase artifacts
  const validation = validatePhaseArtifacts(currentPhase);
  if (!validation.allPresent) {
    const missing = validation.artifacts.filter(a => a.required && !a.exists);
    return {
      action: 'generate-artifacts',
      phase: currentPhase,
      missing: missing.map(a => a.name),
      reason: `Required artifacts missing for ${currentPhase} phase`
    };
  }

  // Current phase complete, advance to next non-complete phase
  if (phaseIdx < phaseOrder.length - 1) {
    let nextPhaseIdx = phaseIdx + 1;
    while (nextPhaseIdx < phaseOrder.length) {
      const nextPhase = phaseOrder[nextPhaseIdx];
      const phaseObj = state.phases[nextPhase];
      if (phaseObj && phaseObj.status !== 'complete') {
        return {
          action: 'advance-phase',
          from: currentPhase,
          to: nextPhase,
          reason: `${currentPhase} phase complete, ready for ${nextPhase}`
        };
      }
      nextPhaseIdx++;
    }
  }

  return {
    action: 'complete',
    reason: 'All phases complete'
  };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node orchestrator_state.js init --name "Project" --type startup
  node orchestrator_state.js status
  node orchestrator_state.js next
  node orchestrator_state.js complete --agent founder --artifact idea-brief.md
  node orchestrator_state.js file-cr --from developer --to product-manager --target user-stories.md --issue "..."
  node orchestrator_state.js set-phase --phase design
  node orchestrator_state.js ensure-graph <code|doc>
  node orchestrator_state.js validate --phase design`);
    process.exit(0);
  }

  const cmd = args[0];

  try {
    if (cmd === 'ensure-graph') {
      const type = args[1];
      if (!['code', 'doc'].includes(type)) {
        console.error('Usage: orchestrator_state.js ensure-graph <code|doc>');
        process.exit(2);
      }
      const result = ensureGraph(type);
      if (!result) process.exit(1);
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (cmd === 'init') {
      let name = 'Untitled';
      let type = 'startup';
      let squad = 'full-team';
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--name') name = args[i + 1];
        if (args[i] === '--type') type = args[i + 1];
        if (args[i] === '--squad') squad = args[i + 1];
      }
      const state = createInitialState(name, type, squad);
      writeState(state);

      // Pre-create and write project-context.md if artifacts/memory/ exists
      const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
      const projectContextFile = path.join(memoryDir, 'project-context.md');
      if (fs.existsSync(memoryDir)) {
        let content = `# Project Context\n\n## [CORE]\nProject: ${name} (${type})\nStack: None\nPhase: ${state.current_phase}\nSprint: none\nBlockers: 0\nSquad: ${squad}\n`;
        fs.writeFileSync(projectContextFile, content, 'utf8');
      }

      console.log(JSON.stringify({ success: true, project: name, type, squad, state_file: STATE_FILE }));

      recordTelemetry('phase_transition', {
        phase: state.current_phase,
        data: { action: 'init', project: name, type, squad }
      });

      // Seed the doc-graph on project init so traceability is available
      // from the very first skill call.
      ensureGraph('doc');
    }

    if (cmd === 'status') {
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found. Run init first.' }));
        process.exit(1);
      }
      const useJson = args.includes('--json');
      if (useJson) {
        console.log(JSON.stringify(state, null, 2));
      } else {
        printDashboard(state);
      }
    }

    if (cmd === 'next') {
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({
          action: 'init-required',
          reason: 'No pipeline state found. Project is uninitialized.'
        }));
        return;
      }
      const action = determineNextAction(state);
      const useJson = args.includes('--json');
      if (useJson) {
        console.log(JSON.stringify(action, null, 2));
      } else {
        printNextDashboard(state, action);
      }
    }

    if (cmd === 'complete') {
      let agent = null;
      let artifact = null;
      let tokens = null;
      let durationMs = null;
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--agent') agent = args[i + 1];
        if (args[i] === '--artifact') artifact = args[i + 1];
        if (args[i] === '--tokens') tokens = parseInt(args[i + 1], 10) || null;
        if (args[i] === '--duration-ms') durationMs = parseInt(args[i + 1], 10) || null;
      }
      if (!agent || !artifact) {
        console.error('Missing --agent or --artifact');
        process.exit(1);
      }

      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found.' }));
        process.exit(1);
      }

      const artifactPath = path.join(OUTPUT_DIR, artifact);
      let version = null;
      if (fs.existsSync(artifactPath)) {
        const content = fs.readFileSync(artifactPath, 'utf8');
        const versionMatch = content.match(/\*\*Version:\*\*\s*(\d+)/);
        version = versionMatch ? parseInt(versionMatch[1], 10) : 1;
      }

      // Auto-estimate tokens from artifact size when caller did not supply them.
      // This guarantees telemetry is never empty during real workflow runs.
      if (tokens === null) {
        tokens = estimateTokensFromFile(artifactPath);
      }

      state.artifacts[artifact] = {
        agent,
        completed_at: new Date().toISOString(),
        version,
        phase: state.current_phase
      };

      state.history.push({
        action: 'artifact-complete',
        agent,
        artifact,
        version,
        tokens,
        duration_ms: durationMs,
        timestamp: new Date().toISOString()
      });

      state.last_updated = new Date().toISOString();
      writeState(state);

      // Always record an agent_invoke telemetry event. Use provided duration_ms or 0.
      recordTelemetry('agent_invoke', {
        agent,
        phase: state.current_phase,
        data: { tokens, duration_ms: durationMs, artifact, version }
      });

      // Code-modifying agents should refresh the code-graph so the next
      // consumer (architect, tech-lead, developer) reads a current graph
      // instead of a stale one.
      const codeModifyingAgents = new Set(['developer', 'architect', 'tech-lead']);
      if (codeModifyingAgents.has(agent)) {
        ensureGraph('code');
      }

      console.log(JSON.stringify({ success: true, agent, artifact, version, tokens, duration_ms: durationMs }));
    }

    if (cmd === 'file-cr') {
      let from = null, to = null, target = null, issue = null, proposedFix = null, impact = null;
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--from') from = args[i + 1];
        if (args[i] === '--to') to = args[i + 1];
        if (args[i] === '--target') target = args[i + 1];
        if (args[i] === '--issue') issue = args[i + 1];
        if (args[i] === '--proposed-fix') proposedFix = args[i + 1];
        if (args[i] === '--impact') impact = args[i + 1];
      }
      if (!from || !to || !target || !issue) {
        console.error('Missing required args: --from, --to, --target, --issue');
        process.exit(1);
      }

      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found.' }));
        process.exit(1);
      }

      const crId = `CR-${String(state.change_requests.length + 1).padStart(3, '0')}`;
      const cr = {
        id: crId,
        from, to, target, issue,
        proposed_fix: proposedFix || '',
        impact: impact || '',
        status: 'OPEN',
        created_at: new Date().toISOString()
      };

      state.change_requests.push(cr);
      state.last_updated = new Date().toISOString();
      writeState(state);
      console.log(JSON.stringify({ success: true, cr_id: crId, cr }));
    }

    if (cmd === 'set-phase') {
      let phase = null;
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--phase') phase = args[i + 1];
      }
      if (!phase) {
        console.error('Missing --phase');
        process.exit(1);
      }
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found. Run init first.' }));
        process.exit(1);
      }

      const phaseOrder = ['validation', 'exploration', 'design', 'development'];
      if (!phaseOrder.includes(phase)) {
        console.error(JSON.stringify({ error: `Invalid phase: ${phase}. Must be one of ${phaseOrder.join(', ')}` }));
        process.exit(1);
      }

      const oldPhase = state.current_phase;
      state.current_phase = phase;

      if (state.phases[phase] && state.phases[phase].status === 'pending') {
        state.phases[phase].status = 'in-progress';
        state.phases[phase].started_at = new Date().toISOString();
      }

      state.history.push({
        action: 'phase-switch',
        from: oldPhase,
        to: phase,
        timestamp: new Date().toISOString()
      });

      state.last_updated = new Date().toISOString();
      writeState(state);

      // Sync back to project-context.md
      const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
      const projectContextFile = path.join(memoryDir, 'project-context.md');
      if (fs.existsSync(memoryDir) && fs.existsSync(projectContextFile)) {
        try {
          let content = fs.readFileSync(projectContextFile, 'utf8');
          content = content.replace(/Phase:\s*\S+/g, `Phase: ${phase}`);
          fs.writeFileSync(projectContextFile, content, 'utf8');
        } catch (err) {
          // Sync failure shouldn't crash the script, but print a warning
        }
      }

      console.log(JSON.stringify({ success: true, from: oldPhase, to: phase }));

      recordTelemetry('phase_transition', {
        phase,
        data: { action: 'set-phase', from: oldPhase, to: phase }
      });
    }

    if (cmd === 'validate') {
      let phase = null;
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--phase') phase = args[i + 1];
      }
      if (!phase) {
        console.error('Missing --phase');
        process.exit(1);
      }
      const result = validatePhaseArtifacts(phase);
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: e.message }));
    process.exit(1);
  }
}

main();
