#!/usr/bin/env node
/**
 * Step Tracker — Step-level audit breadcrumbs for Vespyr
 *
 * Reads .agents/config.yaml for step_tracking mode:
 *   off     — exits immediately, 0 output, 0 files written
 *   silent  — writes breadcrumb to step-audit.json, no stdout
 *   verbose — writes breadcrumb + prints one-liner to stdout
 *
 * Usage:
 *   node step_tracker.js begin --skill shape-up --step 2 [--agent founder]
 *   node step_tracker.js complete --step 2 [--skill shape-up]
 *   node step_tracker.js status [--skill shape-up]
 *   node step_tracker.js audit --skill shape-up
 *   node step_tracker.js audit --all
 */

const fs = require('fs');
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
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(entries, null, 2));
  } catch {
    // Silent fail — tracking must never block agent work
  }
}

function appendAudit(entry) {
  const entries = readAudit();
  entries.push(entry);
  writeAudit(entries);
}

// ---------------------------------------------------------------------------
// Skill step sequence reader — reads SKILL.md for declared step list
// ---------------------------------------------------------------------------
function readStepSequence(skill) {
  const skillPath = path.join(PROJECT_ROOT, '.agents', 'skills', skill, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return [];
  const raw = fs.readFileSync(skillPath, 'utf8');
  const steps = [];
  // Match lines like: 1. **Name** → `steps/step-01-name.md`
  const regex = /^\d+[a-z]?\.\s+\*\*([^*]+)\*\*/gm;
  let m;
  while ((m = regex.exec(raw)) !== null) {
    steps.push(m[1].trim());
  }
  return steps;
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
    const stepIndex = parseInt(String(step)) - 1;
    const stepName = sequence[stepIndex] || `Step ${step}`;
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
    const stepIndex = parseInt(String(step)) - 1;
    const stepName = sequence[stepIndex] || `Step ${step}`;
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

    // Build per-step status
    const maxStep = Math.max(sequence.length, ...skillEntries.map(e => parseInt(String(e.step)) || 0));
    for (let i = 1; i <= maxStep; i++) {
      const stepName = sequence[i - 1] || `Step ${i}`;
      const begun = skillEntries.find(e => e.type === 'begin' && String(e.step) === String(i));
      const done = skillEntries.find(e => e.type === 'complete' && String(e.step) === String(i));
      const drift = driftWarnings.find(e => String(e.step) === String(i));

      let status = '⬜ not started';
      let started = '—';
      let duration = '—';
      if (done) { status = '✅ completed'; }
      else if (begun) { status = '🔄 in progress'; }

      if (begun) started = new Date(begun.ts).toTimeString().slice(0, 8);
      if (done) duration = done.duration || '—';

      const issues = drift ? `Prereq step ${drift.prevStep} not marked complete before begin` : '—';
      report += `| ${i} | ${stepName} | ${status} | ${started} | ${duration} | ${issues} |\n`;
    }

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
    fs.writeFileSync(REPORT_FILE, report);
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

// In off mode, only allow audit/status (read-only commands). For write commands, exit immediately.
if (mode === 'off' && !['audit', 'status'].includes(command)) {
  process.exit(0);
}

switch (command) {
  case 'begin':    cmdBegin(args, mode); break;
  case 'complete': cmdComplete(args, mode); break;
  case 'status':   cmdStatus(args); break;
  case 'audit':    cmdAudit(args); break;
  default:
    console.error(`step_tracker: unknown command "${command}". Use begin, complete, status, or audit.`);
    process.exit(1);
}
