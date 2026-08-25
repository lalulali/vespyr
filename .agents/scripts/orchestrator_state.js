#!/usr/bin/env node
/**
 * Pipeline State Manager — DAG Pipeline Execution for Vespyr
 *
 * Manages pipeline state, validates outputs, tracks artifact versions,
 * and determines next actions. This script is the canonical source of
 * truth for project state — every skill calls it directly.
 * There is no @orchestrator subagent; the script itself
 * is the state machine.
 *
 * State hierarchy:
 *   Source of truth: artifacts/output/pipeline-state.json (full state: phases,
 *     artifacts, history, change_requests, last_session_write, blockers)
 *   Display mirror:  artifacts/output/sprint-status.yaml (human-readable subset)
 *   readState() prefers JSON; YAML is only a fallback when JSON is absent.
 *
 * Usage:
 *   node orchestrator_state.js init --name "My Project" --type startup
 *   node orchestrator_state.js status
 *   node orchestrator_state.js next
 *   node orchestrator_state.js complete --agent founder --artifact idea-brief.md
 *   node orchestrator_state.js complete --agent founder --artifact idea-brief.md --check-memory
 *   node orchestrator_state.js session-write --agent developer
 *   node orchestrator_state.js file-cr --from developer --to product-manager --target user-stories.md --issue "..."
 *   node orchestrator_state.js validate --phase planning
 *   node orchestrator_state.js --help | usage | -h
 */

const fs = require('fs');
const path = require('path');

const { writeFileSync: atomicWriteFileSync, writeJsonSync, readJsonSync } = require('./lib/fs_atomic.js');
const { syncProjectContext } = require('./session_start.js');

const STATE_FILE = path.join(process.cwd(), 'artifacts', 'output', 'pipeline-state.json');
const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'output');
const TELEMETRY_DIR = path.join(process.cwd(), 'artifacts', 'telemetry');
const PROJECT_ROOT = process.cwd();

function countTokens(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / 0.75);
}

function compactActiveDecisions() {
  const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
  const decisionsPath = path.join(memoryDir, 'active-decisions.md');
  const archiveDir = path.join(memoryDir, 'archive');
  const archiveNdjson = path.join(archiveDir, 'index.ndjson');

  if (!fs.existsSync(decisionsPath)) return { compacted: false, count: 0, tokens: 0, underBudget: true };

  const content = fs.readFileSync(decisionsPath, 'utf8');
  const lines = content.split('\n');
  const activeSections = [];
  const archivedSections = [];
  const headerLines = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ') || line.startsWith('## AD-')) {
      if (currentSection) {
        if (currentSection.isInactive) {
          archivedSections.push(currentSection);
        } else {
          activeSections.push(currentSection);
        }
      }
      currentSection = {
        header: line.trim(),
        lines: [line],
        isInactive: false
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
      const trimmed = line.trim().toLowerCase();
      if (
        trimmed.includes('**status:** resolved') ||
        trimmed.includes('**status:** superseded') ||
        trimmed.includes('**status:** archived') ||
        trimmed.includes('**status:** complete') ||
        trimmed.includes('**status:** stale')
      ) {
        currentSection.isInactive = true;
      }
    } else {
      headerLines.push(line);
    }
  }

  if (currentSection) {
    if (currentSection.isInactive) {
      archivedSections.push(currentSection);
    } else {
      activeSections.push(currentSection);
    }
  }

  // If there are inactive sections, shard them into archive/
  if (archivedSections.length > 0) {
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    const shardFile = path.join(archiveDir, `${now.getFullYear()}-Q${q}-archive.md`);

    const shardEntries = archivedSections.map(s => s.lines.join('\n').trim()).join('\n\n---\n\n');
    if (!fs.existsSync(shardFile)) {
      const shardHeader = `# Memory Archive (${now.getFullYear()} Q${q})\n\n`;
      atomicWriteFileSync(shardFile, shardHeader + shardEntries + '\n', 'utf8');
    } else {
      fs.appendFileSync(shardFile, '\n\n---\n\n' + shardEntries + '\n', 'utf8');
    }

    // Append to index.ndjson
    for (const s of archivedSections) {
      const headerText = s.header.replace(/^#{2,3}\s+/, '');
      const idMatch = headerText.match(/\[([A-Z]+)\]\s*([^[]+)/) || headerText.match(/(AD-\d{4}-\d{2}-\d{2})\s*—?\s*(.*)/);
      const domain = idMatch ? idMatch[1] : 'DECISION';
      const title = idMatch ? (idMatch[2] || '').trim() : headerText;
      const dateMatch = headerText.match(/\[date:\s*(\d{4}-\d{2}-\d{2})\]/) || headerText.match(/(20\d{2}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : now.toISOString().split('T')[0];
      const entryObj = {
        id: `ARCH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.slice(0, 80),
        domain,
        keywords: [domain.toLowerCase(), ...title.toLowerCase().split(/\s+/).filter(w => w.length > 2)],
        date,
        status: 'superseded',
        summary: s.lines.slice(1, 4).join(' ').trim().slice(0, 200),
        location: `archive/${now.getFullYear()}-Q${q}-archive.md`,
        archived_by: '@orchestrator',
        archived_on: now.toISOString().split('T')[0]
      };
      if (!fs.existsSync(archiveNdjson)) {
        const ndHeader = JSON.stringify({ schema_version: '1.0', created: date, last_updated: date }) + '\n';
        atomicWriteFileSync(archiveNdjson, ndHeader + JSON.stringify(entryObj) + '\n', 'utf8');
      } else {
        fs.appendFileSync(archiveNdjson, JSON.stringify(entryObj) + '\n', 'utf8');
      }
    }

    const newHeader = headerLines.join('\n').trim() || '# Active Decisions\n\nCritical active design choices and architectural constraints for Vespyr development.';
    const newBody = activeSections.map(s => s.lines.join('\n').trim()).join('\n\n---\n\n');
    const newContent = newHeader + '\n\n---\n\n' + newBody + '\n';
    atomicWriteFileSync(decisionsPath, newContent, 'utf8');
  }

  const finalContent = fs.existsSync(decisionsPath) ? fs.readFileSync(decisionsPath, 'utf8') : '';
  const tokens = countTokens(finalContent);

  return {
    compacted: archivedSections.length > 0,
    archivedCount: archivedSections.length,
    activeCount: activeSections.length,
    tokens,
    underBudget: tokens <= 400
  };
}

// Canonical phase order — single source of truth: .agents/references/phase-table.md.
// 11 phases: Validation (Phase -1, pre-phase gate, no folder) + folder phases 0-9.
const PHASE_ORDER = [
  'validation', 'discovery', 'research', 'strategy', 'architecture',
  'planning', 'execution', 'launch', 'iteration', 'documentation', 'retro'
];

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
      project: { name: '', type: '' },
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
  // Source of truth: pipeline-state.json (full state). The YAML mirror is
  // lossy (no artifacts/history/change_requests), so it must never be the
  // primary read source — otherwise every writeState() round-trip would
  // wipe data written by `complete` and `session-write`.
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      // Corrupt JSON: fall through to YAML mirror, then auto-init.
    }
  }
  const yamlState = readYaml();
  if (yamlState) return yamlState;
  if (!fs.existsSync(STATE_FILE)) {
    // Auto-initialize if missing, to prevent "No pipeline state found" errors.
    try {
      const name = path.basename(process.cwd());
      const state = createInitialState(name, 'startup');
      writeState(state);
      
      // Pre-create project-context.md under artifacts/memory/
      const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }
      const projectContextFile = path.join(memoryDir, 'project-context.md');
      if (!fs.existsSync(projectContextFile)) {
        const content = `# Project Context\n\n## [CORE]\nProject: ${name} (startup)\nStack: None\nPhase: ${state.current_phase}\nSprint: none\nBlockers: 0\n\n## [IDENTITY]\nUser Nickname: User\n`;
        atomicWriteFileSync(projectContextFile, content, 'utf8');
      }
      return state;
    } catch (e) {
      return null;
    }
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeState(state) {
  ensureDir();
  writeJsonSync(STATE_FILE, state, 2);
  syncYaml(state);
}

// Sync pipeline state to sprint-status.yaml (human-readable mirror)
const YAML_STATE = path.join(OUTPUT_DIR, 'sprint-status.yaml');

function syncYaml(state) {
  const name = (state.project && state.project.name) || state.name || '';
  const phase = state.current_phase || state.phase || PHASE_ORDER[0];
  const yaml = [
    '# artifacts/output/sprint-status.yaml',
    `generated: ${state.created_at ? state.created_at.split('T')[0] : new Date().toISOString().split('T')[0]}`,
    `last_updated: ${new Date().toISOString().split('T')[0]}`,
    `project: ${name}`,
    `project_key: ${name.toLowerCase().replace(/\s+/g, '-')}`,
    'tracking_system: file-system',
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
  writeYaml(yaml);
}

// Best-effort write of sprint-status.yaml; never blocks orchestration on write failure.
// Symmetric with readYaml() — readYaml parses YAML_STATE, writeYaml persists it.
function writeYaml(lines) {
  try {
    atomicWriteFileSync(YAML_STATE, lines.join('\n'), 'utf8');
  } catch (e) {
    // YAML sync is best-effort; don't block on write failure
  }
}

// ASCII dashboard for 'status' command
function printDashboard(state) {
  const icon = (s) => s === 'done' ? '✅' : s === 'in-progress' ? '▶️ ' : s === 'pending' ? '  ' : '  ';
  const name = (state.project && state.project.name) || state.name || 'unnamed';
  const phase = resolveCurrentPhase(state);
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  Project: ${name.padEnd(28)} ║`);
  console.log(`║  Phase:   ${phase.padEnd(28)} ║`);
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
  const current = resolveCurrentPhase(state);
  const phaseObj = state.phases[current];
  const status = phaseObj ? (typeof phaseObj === 'string' ? phaseObj : (phaseObj.status || 'pending')) : 'pending';
  console.log(`Current phase:  ${current}`);
  console.log(`Phase status:   ${status}`);
  if (action.action === 'generate-artifacts' && (action.artifacts || action.missing)) {
    console.log(`Action needed:  generate artifacts`);
    for (const a of (action.artifacts || action.missing)) {
      console.log(`  - ${a}`);
    }
  } else if (action.action === 'advance-phase') {
    console.log(`Next phase:     ${action.to || 'unknown'}`);
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
      `"${process.execPath}" "${telemetryScript}" record ${parts.join(' ')}`,
      { stdio: 'ignore' }
    );
  } catch (e) {
    // Silent fail
  }
}

function createInitialState(name, type) {
  const defaultPhases = {
    validation: { status: 'pending', started_at: null, completed_at: null, agents: ['founder'] },
    discovery: { status: 'pending', started_at: null, completed_at: null, agents: ['researcher', 'user-researcher'] },
    research: { status: 'pending', started_at: null, completed_at: null, agents: ['researcher', 'user-researcher'] },
    strategy: { status: 'pending', started_at: null, completed_at: null, agents: ['product-manager', 'product-designer'] },
    architecture: { status: 'pending', started_at: null, completed_at: null, agents: ['architect'] },
    planning: { status: 'pending', started_at: null, completed_at: null, agents: ['tech-lead'] },
    execution: { status: 'pending', started_at: null, completed_at: null, agents: ['developer', 'code-reviewer', 'qa-engineer'] },
    launch: { status: 'pending', started_at: null, completed_at: null, agents: ['devops-engineer', 'product-manager'] },
    iteration: { status: 'pending', started_at: null, completed_at: null, agents: ['product-manager', 'data-analyst'] },
    documentation: { status: 'pending', started_at: null, completed_at: null, agents: ['technical-writer'] },
    retro: { status: 'pending', started_at: null, completed_at: null, agents: ['product-manager'] }
  };

  let startPhase = PHASE_ORDER[0];
  for (const phaseKey of PHASE_ORDER) {
    if (defaultPhases[phaseKey].status !== 'complete') {
      startPhase = phaseKey;
      break;
    }
  }

  return {
    project: { name, type },
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
  // Canonical artifact maps sourced from .agents/references/phase-table.md and
  // .agents/workflow.md §2 Handoff Contracts. Phases without a canonical map
  // (execution, documentation) are intentionally omitted so validatePhaseArtifacts
  // warns instead of vacuously passing — see validatePhaseArtifacts().
  const artifactMap = {
    validation: [
      { name: 'idea-brief.md', path: '01-discovery/idea-brief.md', required: true, fallbackPath: '01-discovery/validation-brief.md', fallbackName: 'validation-brief.md' }
    ],
    discovery: [
      { name: 'idea-brief.md', path: '01-discovery/idea-brief.md', required: true, fallbackPath: '01-discovery/validation-brief.md', fallbackName: 'validation-brief.md' }
    ],
    research: [
      { name: 'market-analysis.md', path: '02-research/market-analysis.md', required: true },
      { name: 'competitive-analysis.md', path: '02-research/competitive-analysis.md', required: true },
      { name: 'user-personas.md', path: '02-research/user-personas.md', required: true }
    ],
    strategy: [
      { name: 'requirements.md', path: '03-strategy/requirements.md', required: true },
      { name: 'user-stories.md', path: '03-strategy/user-stories.md', required: true },
      { name: 'product-spec.md', path: '03-strategy/product-spec.md', required: true }
    ],
    // workflow.md §2: @architect → @tech-lead requires ADRs in 04-architecture/
    // ("Must contain data model, API contracts, and tech stack decision").
    // ADRs are numbered (adr-NNN-short-name.md) — check the directory glob.
    architecture: [
      { name: 'adr-*.md', dir: '04-architecture', glob: /^adr-.*\.md$/, required: true }
    ],
    planning: [
      { name: 'execution-plan.md', path: '05-planning/execution-plan.md', required: true },
      { name: 'change-requests.md', path: '05-planning/change-requests.md', required: false }
    ],
    // execution: gate is "all tests green" (workflow.md §2 Quality Gates → Launch);
    // code/tests live in src/ — no canonical artifact file, validated via warning.
    launch: [
      { name: 'go-nogo-decision.md', path: '06-launch/go-nogo-decision.md', required: true },
      { name: 'post-launch-report.md', path: '06-launch/post-launch-report.md', required: true }
    ],
    iteration: [
      { name: 'iteration-results.md', path: '07-iteration/iteration-results.md', required: true }
    ],
    // documentation: cross-cutting (phase-table.md Phase 8, "Docs current") —
    // no canonical artifact path, validated via warning.
    retro: [
      { name: 'action-items.md', path: '09-retro/action-items.md', required: true }
    ]
  };
  return artifactMap[phase] || [];
}

function validatePhaseArtifacts(phase) {
  // Phases outside the canonical 11-phase model (e.g., legacy 4-phase names)
  // must never green-light. Report the phase as invalid.
  if (!PHASE_ORDER.includes(phase)) {
    return {
      allPresent: false,
      checked: 0,
      artifacts: [],
      warning: `'${phase}' is not a canonical phase. Valid phases: ${PHASE_ORDER.join(', ')}`
    };
  }

  const artifacts = getPhaseArtifacts(phase);

  // Canonical phase without a sourced artifact map: warn instead of a
  // vacuous green pass. checked: 0 tells callers nothing was validated.
  if (artifacts.length === 0) {
    return {
      allPresent: false,
      checked: 0,
      artifacts: [],
      warning: `No canonical artifact map for phase '${phase}' (see .agents/references/phase-table.md). Validation skipped — not a green pass.`
    };
  }

  const results = [];
  let allPresent = true;

  for (const art of artifacts) {
    let fullPath = null;
    let exists = false;
    let name = art.name;
    let actualPath = art.path || (art.dir ? `${art.dir}/${art.name}` : null);

    if (art.glob) {
      // Directory-level canonical artifact (e.g., ADRs in 04-architecture/):
      // at least one file matching the glob must exist.
      const dir = path.join(OUTPUT_DIR, art.dir || '');
      if (fs.existsSync(dir)) {
        const matches = fs.readdirSync(dir).filter(f => art.glob.test(f));
        if (matches.length > 0) {
          fullPath = path.join(dir, matches[0]);
          exists = true;
          actualPath = `${art.dir}/${matches[0]}`;
        }
      }
    } else {
      fullPath = path.join(OUTPUT_DIR, art.path);
      exists = fs.existsSync(fullPath);

      if (!exists && art.fallbackPath) {
        const fallbackFullPath = path.join(OUTPUT_DIR, art.fallbackPath);
        if (fs.existsSync(fallbackFullPath)) {
          fullPath = fallbackFullPath;
          exists = true;
          name = art.fallbackName;
          actualPath = art.fallbackPath;
        }
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

  return { allPresent, checked: results.length, artifacts: results };
}

// Resolve the effective current phase. `state.current_phase` may be absent or
// reference a phase that is not a key in `state.phases` (e.g., a legacy
// 4-phase name against the canonical 11-phase map). When that happens, derive
// the current phase from the phases map: first canonical phase that is not
// pending, else the first canonical phase present in the map.
function resolveCurrentPhase(state) {
  const explicit = state.current_phase || state.phase || '';
  const phaseKeys = Object.keys(state.phases || {});
  if (explicit && phaseKeys.includes(explicit)) return explicit;
  if (explicit && PHASE_ORDER.includes(explicit)) return explicit;
  // Prefer the first phase that is actually in progress: a completed phase must
  // never shadow an in-progress phase when current_phase is absent/stale.
  for (const p of PHASE_ORDER) {
    const v = state.phases[p];
    const status = typeof v === 'string' ? v : (v ? v.status : '');
    if (status === 'in-progress' || status === 'active') return p;
  }
  for (const p of PHASE_ORDER) {
    const v = state.phases[p];
    const status = typeof v === 'string' ? v : (v ? v.status : '');
    if (status && status !== 'pending') return p;
  }
  for (const p of PHASE_ORDER) {
    const v = state.phases[p];
    const status = typeof v === 'string' ? v : (v ? v.status : '');
    if (!status || status === 'pending') return p;
  }
  return PHASE_ORDER[0];
}

function determineNextAction(state) {
  const currentPhase = resolveCurrentPhase(state);
  const phaseIdx = PHASE_ORDER.indexOf(currentPhase);

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

  // Validate current phase artifacts. Phases without a canonical artifact map
  // (checked === 0) cannot be validated here — fall through to the phase-status
  // guard below instead of blocking on a vacuous generate-artifacts action.
  const validation = validatePhaseArtifacts(currentPhase);
  if (validation.checked > 0 && !validation.allPresent) {
    const missing = validation.artifacts.filter(a => a.required && !a.exists);
    return {
      action: 'generate-artifacts',
      phase: currentPhase,
      missing: missing.map(a => a.name),
      reason: `Required artifacts missing for ${currentPhase} phase`
    };
  }

  // Only advance when the current phase is actually complete. A phase still
  // in-progress — e.g. an unmapped phase like execution, which has no artifact
  // gate and would otherwise fall through to advance — must not be skipped.
  // (Mapped phases are already gated by the generate-artifacts check above.)
  const phaseObj = state.phases[currentPhase];
  const currentStatus = typeof phaseObj === 'string' ? phaseObj : (phaseObj ? phaseObj.status : 'pending');
  if (currentStatus !== 'complete' && currentStatus !== 'done') {
    return {
      action: 'continue-phase',
      phase: currentPhase,
      reason: `${currentPhase} phase is ${currentStatus || 'unknown'}, not complete — continue work before advancing`
    };
  }

  // Current phase complete, advance to next non-complete phase
  if (phaseIdx >= 0 && phaseIdx < PHASE_ORDER.length - 1) {
    let nextPhaseIdx = phaseIdx + 1;
    while (nextPhaseIdx < PHASE_ORDER.length) {
      const nextPhase = PHASE_ORDER[nextPhaseIdx];
      const phaseObj = state.phases[nextPhase];
      const status = typeof phaseObj === 'string' ? phaseObj : (phaseObj ? phaseObj.status : 'pending');
      if (status !== 'complete') {
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
const USAGE = `Usage:
  node orchestrator_state.js init --name "Project" --type startup
  node orchestrator_state.js status
  node orchestrator_state.js next
  node orchestrator_state.js advance
  node orchestrator_state.js set-phase --phase planning
  node orchestrator_state.js complete --agent founder --artifact idea-brief.md
  node orchestrator_state.js file-cr --from developer --to product-manager --target user-stories.md --issue "..."
  node orchestrator_state.js session-write --agent developer
  node orchestrator_state.js compact
  node orchestrator_state.js validate --phase planning
  node orchestrator_state.js --help | usage | -h`;

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h' || args[0] === 'usage') {
    console.log(USAGE);
    process.exit(0);
  }

  const cmd = args[0];

  try {

    if (cmd === 'init') {
      let name = 'Untitled';
      let type = 'startup';
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--name') name = args[i + 1];
        if (args[i] === '--type') type = args[i + 1];
      }
      const state = createInitialState(name, type);
      writeState(state);

      // Pre-create and write project-context.md if artifacts/memory/ exists
      const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
      const projectContextFile = path.join(memoryDir, 'project-context.md');
      if (fs.existsSync(memoryDir)) {
        let content = `# Project Context\n\n## [CORE]\nProject: ${name} (${type})\nStack: None\nPhase: ${state.current_phase}\nSprint: none\nBlockers: 0\n\n## [IDENTITY]\nUser Nickname: User\n`;
        atomicWriteFileSync(projectContextFile, content, 'utf8');
      }

      console.log(JSON.stringify({ success: true, project: name, type, state_file: STATE_FILE }));

      recordTelemetry('phase_transition', {
        phase: state.current_phase,
        data: { action: 'init', project: name, type }
      });

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
      let checkMemory = false;
      let nextStep = null;
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--agent') agent = args[i + 1];
        if (args[i] === '--artifact') artifact = args[i + 1];
        if (args[i] === '--tokens') tokens = parseInt(args[i + 1], 10) || null;
        if (args[i] === '--duration-ms') durationMs = parseInt(args[i + 1], 10) || null;
        if (args[i] === '--next') nextStep = args[i + 1];
        if (args[i] === '--check-memory') { checkMemory = true; i -= 1; } // flag, no value
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
        phase: resolveCurrentPhase(state)
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

      // Session Activity backstop: guarantee project-context.md is refreshed
      // even when the agent skipped session-start. The complete call is
      // non-negotiable for every agent, so this closes the enforcement gap.
      try {
        const lsw = state.last_session_write || null;
        const workedOn = lsw && lsw.agent === agent ? lsw.worked_on : null;
        const goal = workedOn && workedOn !== '(not specified)' ? workedOn.slice(0, 80) : null;
        syncProjectContext({ agent, domain: 'session', goal, ensureMarker: true });
      } catch (e) {
        // project-context refresh is best-effort; never block completion on it
      }

      // Session checkpoint: rolling cursor of in-progress state.
      try {
        writeCheckpoint({ event: 'complete', agent, artifact, next: nextStep });
      } catch (e) {
        // checkpoint write is best-effort
      }

      // Memory enforcement check: warn if no session-write was recorded for this agent.
      if (checkMemory) {
        const lsw = state.last_session_write;
        if (!lsw || lsw.agent !== agent) {
          console.error(
            `Warning: No session-write detected for @${agent}. ` +
            `Run: @memory-controller session-write [agent: @${agent}] OR ` +
            `node .agents/scripts/orchestrator_state.js session-write --agent ${agent}`
          );
        }
      }

      // Always record an agent_invoke telemetry event. Use provided duration_ms or 0.
      recordTelemetry('agent_invoke', {
        agent,
        phase: resolveCurrentPhase(state),
        data: { tokens, duration_ms: durationMs, artifact, version }
      });

      console.log(JSON.stringify({ success: true, agent, artifact, version, tokens, duration_ms: durationMs }));
    }

    if (cmd === 'session-start') {
      let agent = null;
      let domain = null;
      let goal = null;
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--agent') agent = args[i + 1];
        if (args[i] === '--domain') domain = args[i + 1];
        if (args[i] === '--goal') goal = args[i + 1];
      }
      if (!agent) {
        console.error('Missing --agent');
        process.exit(1);
      }

      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found.' }));
        process.exit(1);
      }

      // Record in pipeline state (for --check-memory enforcement at complete time)
      state.last_session_start = {
        agent,
        domain,
        goal,
        timestamp: new Date().toISOString()
      };
      state.last_updated = new Date().toISOString();
      writeState(state);

      // Refresh project-context.md (Phase / Blockers / Session Activity / footer)
      let result;
      try {
        result = syncProjectContext({ agent, domain, goal });
      } catch (e) {
        console.error(JSON.stringify({ success: false, error: e.message }));
        process.exit(1);
      }

      recordTelemetry('session_start', {
        agent,
        phase: resolveCurrentPhase(state),
        data: { domain, goal }
      });

      console.log(JSON.stringify({ success: true, message: 'Session start recorded.', ...result }));
    }

    if (cmd === 'sync-context') {
      // Refresh project-context.md without an agent session — used by the
      // post-push git hook so the Repository line updates right after a push.
      try {
        const result = syncProjectContext({ agent: 'git', domain: 'repo-sync', goal: null, recordMarker: false });
        console.log(JSON.stringify({ success: true, message: 'Project context refreshed.', ...result }));
      } catch (e) {
        console.error(JSON.stringify({ success: false, error: e.message }));
        process.exit(1);
      }
    }

    if (cmd === 'session-write') {
      let agent = null;
      let workedOn = '';
      let decisions = '';
      let nextStep = '';
      let blockers = 'none';
      for (let i = 1; i < args.length; i += 2) {
        if (args[i] === '--agent') agent = args[i + 1];
        if (args[i] === '--worked-on') workedOn = args[i + 1];
        if (args[i] === '--decisions') decisions = args[i + 1];
        if (args[i] === '--next-step') nextStep = args[i + 1];
        if (args[i] === '--blockers') blockers = args[i + 1];
      }
      if (!agent) {
        console.error('Missing --agent');
        process.exit(1);
      }

      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found.' }));
        process.exit(1);
      }

      // Record in pipeline state
      state.last_session_write = {
        agent,
        timestamp: new Date().toISOString(),
        worked_on: workedOn,
        decisions,
        next_step: nextStep,
        blockers
      };
      state.last_updated = new Date().toISOString();
      writeState(state);

      // Append to session-summaries/latest.md (overwrite) and history.md (append)
      const sessionDir = path.join(process.cwd(), 'artifacts', 'memory', 'session-summaries');
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

      const ts = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const date = `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}`;
      const latestContent = [
        `# Session Summary (latest)`,
        ``,
        `## Last Session`,
        `- **Date:** ${date}`,
        `- **Agent:** @${agent}`,
        `- **Worked on:** ${workedOn || '(not specified)'}`,
        `- **Decisions:** ${decisions || 'none'}`,
        `- **Next step:** ${nextStep || '(not specified)'}`,
        `- **Blockers:** ${blockers}`,
        ``
      ].join('\n');

      const historyEntry = [
        ``,
        `## [${date}] Agent: @${agent}`,
        `- Worked on: ${workedOn || '(not specified)'}`,
        `- Decisions: ${decisions || 'none'}`,
        `- Next step: ${nextStep || '(not specified)'}`,
        `- Blockers: ${blockers}`,
      ].join('\n');

      try {
        atomicWriteFileSync(path.join(sessionDir, 'latest.md'), latestContent, 'utf8');
        fs.appendFileSync(path.join(sessionDir, 'history.md'), historyEntry + '\n', 'utf8');
      } catch (e) {
        console.error('Warning: Could not write session summary files: ' + e.message);
      }

      // Refresh project-context.md (Phase / Blockers / Repository / Stack /
      // Session Activity).
      try {
        const goal = workedOn && workedOn !== '(not specified)' ? workedOn.slice(0, 80) : null;
        const result = syncProjectContext({ agent, domain: 'session', goal });
        console.log(JSON.stringify({ success: true, agent, date, message: 'Session summary written.', ...result }));
      } catch (e) {
        console.log(JSON.stringify({ success: true, agent, date, message: 'Session summary written.' }));
      }
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

    if (cmd === 'advance') {
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found. Run init first.' }));
        process.exit(1);
      }
      const currentPhase = resolveCurrentPhase(state);
      const currentIdx = PHASE_ORDER.indexOf(currentPhase);
      if (currentIdx < 0 || currentIdx >= PHASE_ORDER.length - 1) {
        console.log(JSON.stringify({ error: `Cannot advance past final phase: ${currentPhase}` }));
        process.exit(1);
      }
      const targetPhase = PHASE_ORDER[currentIdx + 1];

      // Mark current phase complete
      if (state.phases[currentPhase]) {
        state.phases[currentPhase].status = 'complete';
        state.phases[currentPhase].completed_at = new Date().toISOString();
      }
      state.current_phase = targetPhase;
      if (!state.phases[targetPhase]) {
        state.phases[targetPhase] = { status: 'in-progress', started_at: new Date().toISOString(), completed_at: null, agents: [] };
      } else {
        state.phases[targetPhase].status = 'in-progress';
        if (!state.phases[targetPhase].started_at) {
          state.phases[targetPhase].started_at = new Date().toISOString();
        }
      }

      state.history.push({
        action: 'phase-advance',
        from: currentPhase,
        to: targetPhase,
        timestamp: new Date().toISOString()
      });
      state.last_updated = new Date().toISOString();
      writeState(state);

      // Phase boundary compaction
      const compactionResult = compactActiveDecisions();

      // Sync project context
      try {
        syncProjectContext({ agent: 'orchestrator', domain: 'phase-advance', goal: `Advanced to ${targetPhase}` });
      } catch (e) {}

      recordTelemetry('phase_transition', {
        phase: targetPhase,
        data: { action: 'advance', from: currentPhase, to: targetPhase, compaction: compactionResult }
      });

      console.log(JSON.stringify({
        success: true,
        from: currentPhase,
        to: targetPhase,
        compaction: compactionResult
      }));
    }

    if (cmd === 'compact') {
      const result = compactActiveDecisions();
      console.log(JSON.stringify({ success: true, ...result }));
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

      if (!PHASE_ORDER.includes(phase)) {
        console.error(JSON.stringify({ error: `Invalid phase: ${phase}. Must be one of ${PHASE_ORDER.join(', ')}` }));
        process.exit(1);
      }

      const oldPhase = resolveCurrentPhase(state);
      state.current_phase = phase;

      // Ensure the phase key exists in the map so next/status stay consistent
      if (!state.phases[phase]) {
        state.phases[phase] = { status: 'pending', started_at: null, completed_at: null, agents: [] };
      }

      if (state.phases[phase].status === 'pending') {
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

      // Phase boundary compaction
      const compactionResult = compactActiveDecisions();

      // Sync back to project-context.md
      try {
        syncProjectContext({ agent: 'orchestrator', domain: 'phase-switch', goal: `Switched to ${phase}` });
      } catch (err) {}

      recordTelemetry('phase_transition', {
        phase,
        data: { action: 'set-phase', from: oldPhase, to: phase, compaction: compactionResult }
      });

      console.log(JSON.stringify({ success: true, from: oldPhase, to: phase, compaction: compactionResult }));
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
      // Never green-light an unchecked or non-canonical phase: warn + non-zero exit.
      if (result.checked === 0) {
        console.error(`Warning: ${result.warning}`);
        process.exit(1);
      }
    }
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: e.message }));
    process.exit(1);
  }
}

main();
