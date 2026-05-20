#!/usr/bin/env node
/**
 * Orchestrator State Manager — DAG Pipeline Execution for Vespyr
 *
 * Manages pipeline state, validates outputs, tracks artifact versions,
 * and determines next actions. The LLM orchestrator agent uses this
 * script for deterministic state operations.
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

function ensureDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function readState() {
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
}

function createInitialState(name, type) {
  return {
    project: { name, type },
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    current_phase: 'validation',
    phases: {
      validation: { status: 'pending', started_at: null, completed_at: null, agents: ['founder'] },
      exploration: { status: 'pending', started_at: null, completed_at: null, agents: ['researcher', 'user-researcher'] },
      design: { status: 'pending', started_at: null, completed_at: null, agents: ['product-manager', 'product-designer'] },
      development: { status: 'pending', started_at: null, completed_at: null, agents: ['tech-lead', 'developer', 'code-reviewer', 'qa-engineer'] }
    },
    artifacts: {},
    change_requests: [],
    blockers: [],
    history: []
  };
}

function getPhaseArtifacts(phase) {
  const artifactMap = {
    validation: [
      { name: 'idea-brief.md', path: '00-discovery/idea-brief.md', required: true }
    ],
    exploration: [
      { name: 'market-analysis.md', path: '01-research/market-analysis.md', required: true },
      { name: 'competitive-analysis.md', path: '01-research/competitive-analysis.md', required: true },
      { name: 'user-personas.md', path: '01-research/user-personas.md', required: true }
    ],
    design: [
      { name: 'requirements.md', path: '02-strategy/requirements.md', required: true },
      { name: 'user-stories.md', path: '02-strategy/user-stories.md', required: true },
      { name: 'product-spec.md', path: '02-strategy/product-spec.md', required: true }
    ],
    development: [
      { name: 'execution-plan.md', path: '04-planning/execution-plan.md', required: true },
      { name: 'change-requests.md', path: '04-planning/change-requests.md', required: false }
    ]
  };
  return artifactMap[phase] || [];
}

function validatePhaseArtifacts(phase) {
  const artifacts = getPhaseArtifacts(phase);
  const results = [];
  let allPresent = true;

  for (const art of artifacts) {
    const fullPath = path.join(OUTPUT_DIR, art.path);
    const exists = fs.existsSync(fullPath);
    if (!exists && art.required) allPresent = false;

    let version = null;
    if (exists) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const versionMatch = content.match(/\*\*Version:\*\*\s*(\d+)/);
      version = versionMatch ? parseInt(versionMatch[1], 10) : null;
    }

    results.push({
      name: art.name,
      path: art.path,
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

  // Current phase complete, advance to next
  if (phaseIdx < phaseOrder.length - 1) {
    const nextPhase = phaseOrder[phaseIdx + 1];
    return {
      action: 'advance-phase',
      from: currentPhase,
      to: nextPhase,
      reason: `${currentPhase} phase complete, ready for ${nextPhase}`
    };
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
  node orchestrator_state.js validate --phase design`);
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
      console.log(JSON.stringify({ success: true, project: name, type, state_file: STATE_FILE }));
    }

    if (cmd === 'status') {
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found. Run init first.' }));
        process.exit(1);
      }
      console.log(JSON.stringify(state, null, 2));
    }

    if (cmd === 'next') {
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found. Run init first.' }));
        process.exit(1);
      }
      const action = determineNextAction(state);
      console.log(JSON.stringify(action, null, 2));
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

      // Record telemetry if tokens or duration provided
      if (tokens !== null || durationMs !== null) {
        const telemetryScript = path.join(__dirname, 'swarm_telemetry.js');
        if (fs.existsSync(telemetryScript)) {
          try {
            const dataParts = [];
            if (tokens !== null) dataParts.push(`"tokens":${tokens}`);
            if (durationMs !== null) dataParts.push(`"duration_ms":${durationMs}`);
            const data = `{${dataParts.join(',')}}`;
            require('child_process').execSync(
              `node "${telemetryScript}" record --type agent_invoke --agent "${agent}" --phase "${state.current_phase}" --data '${data}'`,
              { stdio: 'ignore' }
            );
          } catch (e) {
            // Telemetry failure must not block orchestration
          }
        }
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
