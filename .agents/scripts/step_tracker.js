#!/usr/bin/env node
/**
 * Step Tracker — Step-level audit breadcrumbs for Vespyr
 *
 * Reads .agents/config.yaml for step_tracking mode:
 *   off     — write commands exit silently (no stdout/audit); EXCEPT the Step-0 scope gate (stderr + exit 1 on bypass) and scope-lock (records gate state)
 *   silent  — writes breadcrumb to step-audit.json, no stdout
 *   verbose — writes breadcrumb + prints one-liner to stdout
 *
 * Usage:
 *   node step_tracker.js begin --skill shape-up --step 2 [--agent founder]
 *   node step_tracker.js complete --step 2 [--skill shape-up]
 *   node step_tracker.js scope-lock --skill develop --track "<track-name>" [--agent NAME]
 *   node step_tracker.js status [--skill shape-up]
 *   node step_tracker.js audit --skill shape-up
 *   node step_tracker.js audit --all
 *
 * Step 0 scope gate (02k): skills that ship step-00-scope-and-decision-anchoring.md
 * reject any `begin --step 1+` with exit code 1 until a scope_lock entry exists
 * for the skill. Enforced in ALL tracking modes — a bypassed gate is a
 * correctness failure, not telemetry. `scope-lock` is recordable in every mode.
 */

const fs = require('fs');
const { writeFileSync: atomicWriteFileSync } = require('./lib/fs_atomic.js');
const { withLock } = require('./lib/lock.js');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const CONFIG_FILE = path.join(PROJECT_ROOT, '.agents', 'config.yaml');
const AUDIT_FILE = path.join(PROJECT_ROOT, 'artifacts', 'output', 'step-audit.json');
const REPORT_FILE = path.join(PROJECT_ROOT, 'artifacts', 'output', 'step-audit-report.md');

// ---------------------------------------------------------------------------
// Config reader — lightweight YAML scalar parser (no external deps)
// ---------------------------------------------------------------------------
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { step_tracking: 'off' };
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const match = raw.match(/^step_tracking:\s*(\S+)/m);
    const mode = match ? match[1].trim() : 'off';
    return { step_tracking: mode };
  } catch {
    return { step_tracking: 'off' };
  }
}

// ---------------------------------------------------------------------------
// Audit log reader/writer
// ---------------------------------------------------------------------------
function readAudit() {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeAudit(entries) {
  try {
    const dir = path.dirname(AUDIT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    atomicWriteFileSync(AUDIT_FILE, JSON.stringify(entries, null, 2));
  } catch {
    // Silent fail — tracking must never block agent work
  }
}

function appendAudit(entry) {
  // 02o.1: read-modify-write of the audit JSON is a shared-state mutation —
  // serialize through a dedicated lock. Tracking must never block agent
  // work, so lock failures are swallowed (audit loss beats workflow loss).
  try {
    withLock(path.join(PROJECT_ROOT, '.agents', 'state', 'stepaudit.lock'), () => {
      const entries = readAudit();
      entries.push(entry);
      writeAudit(entries);
    });
  } catch { /* non-blocking by contract */ }
}

// ---------------------------------------------------------------------------
// Skill step sequence reader — reads step file frontmatter for label + name
// Resolves compound skill names (e.g. "design-create" → skills/design/steps/
// filtered by frontmatter mode: create)
// ---------------------------------------------------------------------------
function readStepSequence(skill) {
  // 1. Try exact: .agents/skills/{skill}/steps/
  let stepsDir = path.join(PROJECT_ROOT, '.agents', 'skills', skill, 'steps');
  let modeFilter = null;
  if (!fs.existsSync(stepsDir)) {
    // 2. Try compound: design-create → .agents/skills/design/steps/ filtered by mode
    const parts = skill.split('-');
    if (parts.length >= 2) {
      const mode = parts.pop();
      const base = parts.join('-');
      const baseDir = path.join(PROJECT_ROOT, '.agents', 'skills', base, 'steps');
      if (fs.existsSync(baseDir)) {
        stepsDir = baseDir;
        modeFilter = mode;
      }
    }
  }
  if (!fs.existsSync(stepsDir)) return [];

  const files = fs.readdirSync(stepsDir).filter(f => f.endsWith('.md'));
  const steps = [];
  files.forEach(file => {
    const raw = fs.readFileSync(path.join(stepsDir, file), 'utf8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (!fmMatch) return;
    const fmText = fmMatch[1];
    if (modeFilter) {
      const modeMatch = fmText.match(/^mode:\s*(\S+)/m);
      if (!modeMatch || modeMatch[1] !== modeFilter) return;
    }
    const stepMatch = fmText.match(/^step:\s*(\d+[a-z]?)/m);
    const nameMatch = fmText.match(/^name:\s*(.+)$/m);
    if (stepMatch && nameMatch) {
      // Compound skills track mode-local step numbers (--step 2), so strip the
      // mode letter (2b → 2) for matching against tracker entries.
      const label = modeFilter ? stepMatch[1].replace(/[a-z]/i, '') : stepMatch[1].trim();
      steps.push({ label, name: nameMatch[1].trim() });
    }
  });
  // Natural sort: 1, 2, 3, 3a, 3b, 4, ...
  steps.sort((a, b) => {
    const na = parseInt(a.label), nb = parseInt(b.label);
    if (na !== nb) return na - nb;
    return a.label.localeCompare(b.label);
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Step 0 scope gate (02k) — deterministic enforcement
// ---------------------------------------------------------------------------
function skillStepsDir(skill) {
  let stepsDir = path.join(PROJECT_ROOT, '.agents', 'skills', skill, 'steps');
  if (!fs.existsSync(stepsDir)) {
    const parts = skill.split('-');
    if (parts.length >= 2) {
      const baseDir = path.join(PROJECT_ROOT, '.agents', 'skills', parts.slice(0, -1).join('-'), 'steps');
      if (fs.existsSync(baseDir)) return baseDir;
    }
  }
  return fs.existsSync(stepsDir) ? stepsDir : null;
}

function requiresScopeLock(skill) {
  const dir = skillStepsDir(skill);
  if (!dir) return false;
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).some(f => {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const fm = raw.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    return !!fm && /^step:\s*0\b/m.test(fm[1]);
  });
}

function enforceScopeGate(skill, step, mode) {
  const num = parseInt(String(step).replace(/[a-z]/i, ''), 10);
  if (!skill || !(num >= 1) || !requiresScopeLock(skill)) return;
  const base = skill.includes('-') ? skill.split('-').slice(0, -1).join('-') : null;
  const locked = readAudit().some(e =>
    e.type === 'scope_lock' && (e.skill === skill || (base && e.skill === base))
  );
  if (!locked) {
    console.error('[ERROR] Step 0 Scope Gate bypassed. Scope must be locked before Step 1 execution.');
    console.error(`Fix: node .agents/scripts/step_tracker.js scope-lock --skill ${skill} --track "<track-name>"`);
    process.exit(1);
  }
}

function cmdScopeLock(args, mode) {
  const { skill, track, agent = 'unknown' } = args;
  if (!skill || !track) {
    console.error('step_tracker: --skill and --track are required for scope-lock');
    process.exit(1);
  }
  appendAudit({ type: 'scope_lock', skill, track, agent, ts: new Date().toISOString() });
  if (mode === 'verbose') console.log(`🔒 Scope locked: ${skill} — track "${track}"`);
}

// ---------------------------------------------------------------------------
// Arg parser
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1] || true;
      i++;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
function cmdBegin(args, mode) {
  const { skill, step, agent = 'unknown' } = args;
  if (!skill || !step) {
    if (mode === 'verbose') console.error('step_tracker: --skill and --step are required for begin');
    return;
  }

  // Soft prerequisite check — warn only, never block
  const entries = readAudit();
  const prevStepNum = parseInt(String(step).replace(/[a-z]/i, '')) - 1;
  if (prevStepNum > 0) {
    const prevCompleted = entries.some(
      e => e.skill === skill && e.type === 'complete' && String(e.step) === String(prevStepNum)
    );
    if (!prevCompleted && mode !== 'off') {
      const warn = `⚠️  Drift warning: step ${prevStepNum} not marked complete before begin of step ${step}`;
      appendAudit({ type: 'drift_warning', skill, step, prevStep: prevStepNum, agent, ts: new Date().toISOString() });
      if (mode === 'verbose') console.warn(warn);
    }
  }

  appendAudit({ type: 'begin', skill, step, agent, ts: new Date().toISOString() });

  if (mode === 'verbose') {
    const sequence = readStepSequence(skill);
    const seqEntry = sequence.find(s => s.label === String(step));
    const stepName = seqEntry ? seqEntry.name : `Step ${step}`;
    const total = sequence.length || '?';
    console.log(`📍 Step ${step}/${total}: ${stepName} — started`);
  }
}

function cmdComplete(args, mode) {
  const { skill, step, agent = 'unknown' } = args;
  if (!step) {
    if (mode === 'verbose') console.error('step_tracker: --step is required for complete');
    return;
  }

  const startEntry = readAudit().find(
    e => e.skill === (skill || e.skill) && e.type === 'begin' && String(e.step) === String(step)
  );
  const durationMs = startEntry ? Date.now() - new Date(startEntry.ts).getTime() : null;
  const durationStr = durationMs !== null ? `${Math.round(durationMs / 1000)}s` : 'unknown';

  appendAudit({ type: 'complete', skill: skill || startEntry?.skill, step, agent, ts: new Date().toISOString(), duration: durationStr });

  if (mode === 'verbose') {
    const sequence = skill ? readStepSequence(skill) : [];
    const seqEntry = sequence.find(s => s.label === String(step));
    const stepName = seqEntry ? seqEntry.name : `Step ${step}`;
    const total = sequence.length || '?';
    console.log(`✅ Step ${step}/${total}: ${stepName} — complete (${durationStr})`);
  }
}

function cmdStatus(args) {
  const { skill } = args;
  const entries = readAudit();
  const relevant = skill ? entries.filter(e => e.skill === skill) : entries;
  if (relevant.length === 0) {
    console.log(skill ? `No tracking data for skill: ${skill}` : 'No tracking data.');
    return;
  }
  const last = relevant[relevant.length - 1];
  const allSkills = [...new Set(relevant.map(e => e.skill))];
  allSkills.forEach(s => {
    const skillEntries = relevant.filter(e => e.skill === s);
    const inProgress = skillEntries.filter(e => e.type === 'begin').map(e => e.step)
      .filter(step => !skillEntries.some(e => e.type === 'complete' && String(e.step) === String(step)));
    const completed = skillEntries.filter(e => e.type === 'complete').map(e => e.step);
    console.log(`${s}: completed=[${completed.join(',')}] in-progress=[${inProgress.join(',')}]`);
  });
}

function cmdAudit(args) {
  const { skill, all } = args;
  const entries = readAudit();
  const skills = all ? [...new Set(entries.map(e => e.skill).filter(Boolean))]
    : skill ? [skill] : [...new Set(entries.map(e => e.skill).filter(Boolean))];

  if (skills.length === 0) {
    console.log('No audit data found. Set step_tracking: silent or verbose in .agents/config.yaml first.');
    return;
  }

  let report = `# Step Audit Report\nGenerated: ${new Date().toISOString()}\n\n`;

  skills.forEach(s => {
    const sequence = readStepSequence(s);
    const skillEntries = entries.filter(e => e.skill === s);
    const driftWarnings = skillEntries.filter(e => e.type === 'drift_warning');

    report += `## Skill: ${s}\n\n`;
    report += `| Step | Name | Status | Started | Duration | Issues |\n`;
    report += `|---|---|---|---|---|---|\n`;

    // Build per-step status — iterate over labels from sequence + any stray entries
    const seqLabels = sequence.map(s => s.label);
    const entryLabels = skillEntries.map(e => String(e.step));
    const allLabels = [...new Set([...seqLabels, ...entryLabels])];
    allLabels.sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b);
      if (na !== nb) return na - nb;
      return a.localeCompare(b);
    });

    allLabels.forEach(label => {
      const seqEntry = sequence.find(s => s.label === label);
      const stepName = seqEntry ? seqEntry.name : `Step ${label}`;
      const begun = skillEntries.find(e => e.type === 'begin' && String(e.step) === String(label));
      const done = skillEntries.find(e => e.type === 'complete' && String(e.step) === String(label));
      const drift = driftWarnings.find(e => String(e.step) === String(label));

      let status = '⬜ not started';
      let started = '—';
      let duration = '—';
      if (done) { status = '✅ completed'; }
      else if (begun) { status = '🔄 in progress'; }

      if (begun) started = new Date(begun.ts).toTimeString().slice(0, 8);
      if (done) duration = done.duration || '—';

      const issues = drift ? `Prereq step ${drift.prevStep} not marked complete before begin` : '—';
      report += `| ${label} | ${stepName} | ${status} | ${started} | ${duration} | ${issues} |\n`;
    });

    if (driftWarnings.length > 0) {
      report += `\n### Drift Warnings\n`;
      driftWarnings.forEach(w => {
        report += `- **Step ${w.step}**: \`begin\` called before step ${w.prevStep} was marked \`complete\`\n`;
      });
    }
    report += '\n---\n\n';
  });

  try {
    const dir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    atomicWriteFileSync(REPORT_FILE, report);
    console.log(`Audit report written to: artifacts/output/step-audit-report.md`);
  } catch (e) {
    console.error('Failed to write report:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const [,, command, ...rest] = process.argv;
const args = parseArgs(rest);
const config = readConfig();
const mode = config.step_tracking || 'off';

// No command → show usage regardless of mode (human error, not an agent call)
if (!command) {
  console.error('step_tracker: no command given. Use begin, complete, scope-lock, status, or audit.');
  console.error('Usage: node step_tracker.js <begin|complete|scope-lock|status|audit> [--skill NAME] [--step N] [--track NAME] [--agent NAME]');
  process.exit(1);
}

// Deterministic Step 0 scope gate — enforced in ALL modes (incl. off), before
// the off-mode early exit: a bypassed gate is a correctness failure.
if (command === 'begin' && args.skill && args.step) {
  enforceScopeGate(args.skill, args.step, mode);
}

// In off mode, only allow audit/status (read-only) and scope-lock (the record
// the gate depends on). Other write commands exit immediately.
if (mode === 'off' && !['audit', 'status', 'scope-lock'].includes(command)) {
  process.exit(0);
}

switch (command) {
  case 'begin':      cmdBegin(args, mode); break;
  case 'complete':   cmdComplete(args, mode); break;
  case 'scope-lock': cmdScopeLock(args, mode); break;
  case 'status':     cmdStatus(args); break;
  case 'audit':      cmdAudit(args); break;
  default:
    console.error(`step_tracker: unknown command "${command}". Use begin, complete, status, or audit.`);
    process.exit(1);
}
