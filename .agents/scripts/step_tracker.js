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
 *   node step_tracker.js route --skill design [--json]     (design artifact + baseline-hash evidence)
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
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { writeFileSync: atomicWriteFileSync } = require('./lib/fs_atomic.js');
const { withLock } = require('./lib/lock.js');
const { resolveSessionId, windowSessionId, ensureSessionCurrent } = require('./lib/session.js');
const path = require('path');

// `--root` must be honoured. It was parsed by parseArgs and never read — `args.root` appeared
// zero times in this file — while every gate script in the engine does honour it, so passing it
// here is the natural thing to do and it silently did nothing. A flag that is accepted and
// ignored is worse than an unknown one, which at least errors.
const ROOT_FLAG_INDEX = process.argv.indexOf('--root');
const PROJECT_ROOT =
  ROOT_FLAG_INDEX !== -1 && process.argv[ROOT_FLAG_INDEX + 1] && !process.argv[ROOT_FLAG_INDEX + 1].startsWith('--')
    ? path.resolve(process.argv[ROOT_FLAG_INDEX + 1])
    : process.cwd();
const CONFIG_FILE = path.join(PROJECT_ROOT, '.agents', 'config.yaml');
const AUDIT_FILE = path.join(PROJECT_ROOT, 'artifacts', 'output', 'step-audit.json');
const REPORT_FILE = path.join(PROJECT_ROOT, 'artifacts', 'output', 'step-audit-report.md');

// ---------------------------------------------------------------------------
// Config reader — lightweight YAML scalar parser (no external deps)
// ---------------------------------------------------------------------------
function readConfig() {
  try {
    // An ABSENT config is not the same instruction as `step_tracking: off`. Measured by a
    // blind run: `begin --step N` from a working tree with no `.agents/config.yaml` exited 0,
    // printed nothing, and wrote no breadcrumb — the caller read that as "step recorded".
    // The default stays `off` for portability, but the degradation is now announced, so
    // "tracked" and "silently discarded" cannot be confused.
    if (!fs.existsSync(CONFIG_FILE)) return { step_tracking: 'off', configMissing: true };
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const match = raw.match(/^step_tracking:\s*(\S+)/m);
    const mode = match ? match[1].trim() : 'off';
    return { step_tracking: mode, configMissing: false };
  } catch {
    return { step_tracking: 'off', configMissing: true };
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
      // A step with NO mode field is mode-agnostic and belongs to every track.
      //
      // It used to be dropped from every track. Measured on /design: step-00 is the
      // non-skippable scope gate for all four modes, and it carried no `mode:`, so every
      // mode's step list began at step 1 and the gate SKILL.md calls non-skippable was
      // invisible to the tracker in all four modes — unlistable and untrackable, while
      // looking perfectly correct in the file.
      if (modeMatch && modeMatch[1] !== modeFilter) return;
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

function getActiveSessionContext() {
  const envSession = process.env.VESPYR_SESSION_ID;
  let currentWindow = null;
  try { currentWindow = windowSessionId(); } catch {}

  let sessionCurrent = null;
  try {
    const sessionFile = path.join(PROJECT_ROOT, '.agents', 'state', 'session-current.json');
    if (fs.existsSync(sessionFile)) {
      sessionCurrent = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    }
  } catch {}

  return { envSession, currentWindow, sessionCurrent };
}

function isLockActive(lock, skill, ctx) {
  if (!lock || lock.type !== 'scope_lock' || lock.skill !== skill) return false;

  const { envSession, currentWindow, sessionCurrent } = ctx || getActiveSessionContext();
  const lockSession = lock.session_id ? String(lock.session_id) : null;
  const lockTime = lock.ts ? new Date(lock.ts).getTime() : 0;
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const isRecent = lockTime > 0 && (Date.now() - lockTime) < FIFTEEN_MINUTES;
  const sessionStart = sessionCurrent && sessionCurrent.started ? new Date(sessionCurrent.started).getTime() : 0;
  const afterSessionStart = sessionStart > 0 && lockTime >= (sessionStart - 5000);
  // Window-bound ids are the only ones allowed to ride the recency fallback.
  const windowBound = !lockSession || lockSession === 'unattributed' || lockSession.startsWith('w-');

  // 1. Explicit Session ID match (CI or orchestrated runs)
  if (envSession) {
    return lockSession === envSession;
  }

  // 2. Window Hash match — the window IS the session identity for interactive
  // runs (02o), so a same-window lock stays valid for the window's lifetime,
  // bounded by process-tree identity rather than a TTL.
  if (lockSession && currentWindow && lockSession === currentWindow) {
    return true;
  }

  // 3. Any-window recency fallback (forked-ppid harnesses, ≤15 min). Window-bound
  // locks from an unrelated window can satisfy the gate within the TTL; this is
  // an accepted residual, not a subshell-specific guarantee (roundtable
  // 2026-09-21). Session-UUID-shaped locks are never honored — no producer
  // exists for them, so they stay fail-closed.
  if (windowBound && afterSessionStart && isRecent) {
    return true;
  }

  return false;
}

function enforceScopeGate(skill, step, mode) {
  const raw = String(step ?? '');
  if (!skill || !/^\d+[a-z]?$/i.test(raw)) {
    console.error(`[ERROR] Step gate: invalid --step "${raw}" (expected N or Na).`);
    process.exit(1);
  }
  const num = parseInt(raw, 10);
  if (!(num >= 1) || !requiresScopeLock(skill)) return;
  const ctx = getActiveSessionContext();
  const locks = readAudit().filter(e => isLockActive(e, skill, ctx));
  if (locks.length > 0) return;
  // Mode-variant chains (e.g. validate-idea-create) may satisfy the gate via a
  // base-skill lock ONLY when the locked track names this mode — 02k-era binding.
  const hyphen = skill.lastIndexOf('-');
  if (hyphen > 0) {
    const base = skill.slice(0, hyphen);
    const suffix = skill.slice(hyphen + 1).toLowerCase();
    if (skillStepsDir(base)) {
      const baseLocks = readAudit().filter(e => isLockActive(e, base, ctx));
      const mismatch = baseLocks.find(e => String(e.track).toLowerCase() === suffix);
      if (mismatch) return;
      if (baseLocks.length > 0) {
        console.error(`[ERROR] Scope gate: base lock for '${base}' has track "${baseLocks[0].track}", not mode '${suffix}' — ${skill} is not unlocked.`);
        console.error(`Fix: node .agents/scripts/step_tracker.js scope-lock --skill ${base} --track "${suffix}"`);
        process.exit(1);
      }
    }
  }
  console.error('[ERROR] Step 0 Scope Gate bypassed. Scope must be locked before Step 1 execution.');
  console.error(`Fix: node .agents/scripts/step_tracker.js scope-lock --skill ${skill} --track "<track-name>"`);
  process.exit(1);
}

function ensureSessionAnchor() {
  try {
    const sessionFile = path.join(PROJECT_ROOT, '.agents', 'state', 'session-current.json');
    if (!fs.existsSync(sessionFile)) ensureSessionCurrent();
  } catch {}
}

// ---------------------------------------------------------------------------
// Design routing evidence (02n.9) — artifact presence + baseline-hash state.
// The 4-way routing decision becomes auditable: a lock taken with a stale
// The baseline hash is distinguishable from one taken after a recompute.
// ---------------------------------------------------------------------------
const DESIGN_ARTIFACTS = [
  // The prototype ITSELF is routing evidence. It was missing from this list, which made the
  // reverse route undetectable on arrival: the only reverse signal was
  // prototype-inventory.md, and that file is what reverse mode PRODUCES. A bootstrap paradox —
  // `computeDesignRoute` could never return 'reverse' for a tree that had not already been
  // routed to reverse. Measured: a tree with `artifacts/input/prototype/p.html` and no
  // requirements.md returned `route: "create"`, while SKILL.md says reverse is chosen when
  // "the user arrives prototype-first" and step-00 calls the route output "Deterministic
  // evidence". A false negative, which is the more dangerous direction: it routes an imported
  // prototype into create mode instead of reverse.
  'artifacts/input/prototype',
  'artifacts/output/03-strategy/prototype-inventory.md',
  'artifacts/output/03-strategy/requirements.md',
  'artifacts/output/03-strategy/product-spec.md',
  'artifacts/output/03-strategy/parity-report.md',
  'artifacts/output/03-strategy/SPEC.md',
];

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function designArtifactEvidence() {
  const out = {};
  for (const rel of DESIGN_ARTIFACTS) {
    const p = path.join(PROJECT_ROOT, rel);
    if (!fs.existsSync(p)) { out[rel] = { present: false, sha256: null }; continue; }
    // A routing input may be a directory (`artifacts/input/prototype/`), so hashing the first
    // real file inside it is what makes the evidence meaningful rather than merely present.
    if (fs.statSync(p).isDirectory()) {
      const entries = fs.readdirSync(p).filter((f) => !f.startsWith('.')).sort();
      const digest = entries.length
        ? crypto.createHash('sha256').update(entries.map((f) => `${f}:${sha256File(path.join(p, f))}`).join('\n')).digest('hex')
        : null;
      out[rel] = { present: entries.length > 0, sha256: digest, entries: entries.length, kind: 'directory' };
      continue;
    }
    out[rel] = { present: true, sha256: sha256File(p) };
  }
  return out;
}

function baselineEvidence() {
  const script = [
    path.join(PROJECT_ROOT, '.agents', 'scripts', 'spec_parity.js'),
    path.join(__dirname, 'spec_parity.js'),
  ].find((p) => fs.existsSync(p));
  if (!script) return { state: 'unknown', reason: 'spec_parity.js missing' };
  const res = spawnSync(process.execPath, [script, 'baseline', 'check', '--json'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
  try {
    const j = JSON.parse(res.stdout);
    return { state: j.baseline, ok: j.ok, reason: j.reason || null };
  } catch {
    return { state: 'unknown', reason: 'baseline check output unparsable' };
  }
}

function computeDesignRoute(evidence) {
  const protoDir = evidence.artifacts['artifacts/input/prototype'].present;
  const inv = evidence.artifacts['artifacts/output/03-strategy/prototype-inventory.md'].present;
  const req = evidence.artifacts['artifacts/output/03-strategy/requirements.md'].present;
  const spec = evidence.artifacts['artifacts/output/03-strategy/product-spec.md'].present;
  const kernel = evidence.artifacts['artifacts/output/03-strategy/SPEC.md'].present;
  const w = evidence.baseline.state;

  // PROTOTYPE-FIRST, ON ARRIVAL. step-00 states the rule directly: "`artifacts/input/prototype/`
  // contains a reachable prototype AND no `artifacts/output/03-strategy/SPEC.md` → imported",
  // and SKILL.md says reverse is chosen when "the user arrives prototype-first (prototype source
  // present, no requirements)". Neither clause was implemented, so the router returned `create`
  // for exactly the arrival it was documented to detect. This branch implements both.
  if (protoDir && !kernel) {
    return {
      route: 'reverse',
      reason: inv
        ? 'prototype present and inventory written — continuing reverse (A1 reverse-first)'
        : 'prototype present in artifacts/input/prototype/ with no SPEC.md — reverse on arrival ' +
          '(step-00 imported-sub-track rule); the inventory does not exist yet, which is expected',
    };
  }
  if (inv && !req) {
    return { route: 'reverse', reason: 'inventory present and no requirements.md (A1 reverse-first)' };
  }
  if (req || spec) {
    if (w === 'stale' || w === 'missing' || w === 'broken') {
      return { route: 'rollback', blocked: true, reason: `prototype baseline hash is ${w} — Step-0 blocks; run step-05d Spike Rollback before edit` };
    }
    return { route: 'edit', reason: `artifacts present; baseline hash ${w}` };
  }
  return { route: 'create', reason: 'no requirements.md or product-spec.md present' };
}

function cmdRoute(args) {
  const evidence = { artifacts: designArtifactEvidence(), baseline: baselineEvidence() };
  const decision = computeDesignRoute(evidence);
  const out = {
    skill: 'design',
    route: decision.route,
    blocked: Boolean(decision.blocked),
    reason: decision.reason,
    baseline_state: evidence.baseline.state,
    artifacts: Object.fromEntries(
      Object.entries(evidence.artifacts).filter(([, v]) => v.present).map(([k, v]) => [k, v.sha256])
    ),
    ts: new Date().toISOString(),
  };
  if (args.json) console.log(JSON.stringify(out, null, 2));
  else console.log(`route: ${out.route}${out.blocked ? ' (blocked)' : ''} — ${out.reason}`);
}

// Per-skill allowed track values. A track recorded with a typo ("creatve") looks identical in
// the audit to a correct one, and `audit` groups by the raw string — so the typo silently
// removes the run from the track it claimed. `creative` was measured missing because the
// SKILL.md help text advertised a value nothing enforced.
const VALID_TRACKS = {
  motion: ['full', 'lightweight', 'none', 'creative'],
  validate_idea: ['create', 'validate', 'brownfield'],
  explore_idea: ['new-company', 'company-brownfield-internal-permissions', 'company-brownfield-new-product'],
  unpack_problem: ['guided', 'automated', 'combination'],
  design: ['create', 'validate', 'edit', 'reverse'],
};

function cmdScopeLock(args, mode) {
  const { skill, track, agent = 'unknown' } = args;
  if (!skill || !track) {
    console.error('step_tracker: --skill and --track are required for scope-lock');
    process.exit(1);
  }
  // Validate when we know the skill's vocabulary. An unknown skill is allowed through — the
  // table is not exhaustive by design, and refusing a track for a skill not listed would
  // break every skill that has not been catalogued yet.
  const allowed = VALID_TRACKS[String(skill).toLowerCase()];
  if (allowed && !allowed.includes(String(track).toLowerCase())) {
    console.error(
      `step_tracker: --track "${track}" is not a valid track for ${skill}. Expected one of: ${allowed.join(' | ')}`
    );
    console.error('  An unvalidated track is what makes a scope lock unauditable — `audit` groups by the raw string.');
    process.exit(1);
  }
  ensureSessionAnchor();
  const session_id = resolveSessionId();

  // Say where the record went. The command used to exit 0 in total silence, which means an
  // audit trail nobody can locate is not an audit trail — a real-model run hunted for the file
  // after "recording the decision" and found nothing pointing at it.
  const auditPath = path.join(PROJECT_ROOT, 'artifacts', 'output', 'step-audit.json');

  const entry = {
    type: 'scope_lock',
    skill,
    track,
    session_id,
    agent,
    ts: new Date().toISOString()
  };
  if (String(skill).startsWith('design')) {
    try {
      const artifacts = designArtifactEvidence();
      const baseline = baselineEvidence();
      entry.artifacts = Object.fromEntries(
        Object.entries(artifacts).filter(([, v]) => v.present).map(([k, v]) => [k, v.sha256])
      );
      entry.baseline_state = baseline.state;
      entry.route = computeDesignRoute({ artifacts, baseline }).route;
    } catch {
      // Evidence is advisory — locking must never fail on it.
    }
  }
  appendAudit(entry);

  // Always report the record and where to read it back — not only in verbose mode. Silent
  // success is indistinguishable from a no-op, and this record is the only thing that makes a
  // later `audit` able to tell "lightweight was correct" from "research was silently skipped".
  console.log(`🔒 Scope locked: ${skill} — track "${track}" (session: ${session_id})`);
  console.log(`   recorded in: ${auditPath}`);
  console.log(`   read back with: node .agents/scripts/step_tracker.js audit --all`);
}

// ---------------------------------------------------------------------------
// Arg parser
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || String(next).startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
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
    const prevCompleted = entries.some((e) => {
      if (e.skill !== skill || e.type !== 'complete') return false;
      const done = String(e.step);
      // (a) A parent step is satisfied by any of its lettered sub-steps. develop-state.md
      // documents `"3" means both 3a+3b done`; without this, completing 3a and 3b left "3"
      // unmet and warned on every subsequent step.
      if (done === String(prevStepNum)) return true;
      if (done.replace(/[a-z]/i, '') === String(prevStepNum)) return true;
      // (b) An explicitly skipped step satisfies the prerequisite. A conditional or optional
      // step (develop step 2 is conditional, step 5 optional) is *correctly* absent; recording
      // the skip is how the tracker tells that apart from real drift.
      return e.skipped === true;
    });
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
  if (!skill) {
    console.error('step_tracker: --skill is required for complete (prevents cross-skill misattribution).');
    process.exit(1);
  }
  if (!step) {
    if (mode === 'verbose') console.error('step_tracker: --step is required for complete');
    return;
  }

  const startEntry = readAudit().find(
    e => e.skill === (skill || e.skill) && e.type === 'begin' && String(e.step) === String(step)
  );
  const durationMs = startEntry ? Date.now() - new Date(startEntry.ts).getTime() : null;
  const durationStr = durationMs !== null ? `${Math.round(durationMs / 1000)}s` : 'unknown';

  // `--skipped "<reason>"` records a step that was deliberately not performed — a conditional
  // step whose condition is false (develop step 2, Architecture, when ArchitectPhase is absent)
  // or an optional one with no unknowns (step 5, Spike). Without this, a correct skip is
  // indistinguishable from real drift and every subsequent step warns.
  //
  // A skip is NOT a silent pass: the reason is required, and it is recorded in the audit so a
  // reader can see what was skipped and why. `--skipped` with no reason is rejected.
  const skippedReason = typeof args.skipped === 'string' ? args.skipped.trim() : args.skipped === true ? '' : null;
  if (skippedReason !== null && skippedReason.length < 8) {
    console.error(
      'step_tracker: --skipped requires a reason of at least 8 characters, e.g.\n' +
        '  --skipped "conditional: ArchitectPhase false, no ADRs required"\n' +
        'A skip with no reason is indistinguishable from an omission.'
    );
    process.exit(1);
  }

  appendAudit({
    type: 'complete',
    skill: skill || startEntry?.skill,
    step,
    agent,
    ts: new Date().toISOString(),
    duration: durationStr,
    ...(skippedReason !== null ? { skipped: true, skipReason: skippedReason } : {}),
  });

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

/**
 * Output artifact paths a skill declares it WRITES, scoped to its `## Output artifacts`
 * section. This is what makes "ran untracked" decidable: zero step records plus an
 * artifact on disk means work happened that no record accounts for, which is a different
 * problem from never having run.
 *
 * TWO REASONS THIS IS STRICT, both learned the hard way:
 *
 *   1. Scoped to the section, NOT the whole file. A whole-file scan read
 *      `artifacts/output/02-research/journey-map.md` out of /design's Prerequisites and
 *      reported "ran untracked" — but that file is /unpack-problem's OUTPUT which /design
 *      CONSUMES. The first version invented evidence.
 *   2. Only FULL `artifacts/output/...` paths are probed. Most skills declare bare
 *      filenames there (`requirements.md`, `product-spec.md`) with no directory, and some
 *      (`validate-idea`) have no such section at all. Guessing a directory would probe the
 *      wrong file, so a skill that declares none is reported `unknown` — never "never ran".
 *
 * Brace templates like `{feature}` are skipped: they are shapes, not paths.
 */
function declaredArtifacts(skillsDir, name) {
  const md = path.join(skillsDir, name, 'SKILL.md');
  if (!fs.existsSync(md)) return [];
  let text;
  try { text = fs.readFileSync(md, 'utf8'); } catch { return []; }

  const section = text.match(/^##\s*Output artifacts\s*$([\s\S]*?)(?=^##\s|\Z)/mi);
  if (!section) return [];

  const out = new Set();
  const re = /artifacts\/output\/[A-Za-z0-9_\-./]+/g;
  let m;
  while ((m = re.exec(section[1])) !== null) {
    const p = m[0].replace(/\/+$/, '');
    if (!p.includes('{')) out.add(p);
  }
  return [...out];
}

function cmdAudit(args) {
  const { skill, all } = args;
  const entries = readAudit();
  const tracked = [...new Set(entries.map(e => e.skill).filter(Boolean))];
  const skills = all ? tracked : skill ? [skill] : tracked;

  if (skills.length === 0) {
    console.log('No audit data found. Set step_tracking: silent or verbose in .agents/config.yaml first.');
    return;
  }

  let report = `# Step Audit Report\nGenerated: ${new Date().toISOString()}\n\n`;

  // UNTRACKED SKILLS (2026-10-06).
  //
  // The skill list used to be derived from the audit records themselves, so a skill with
  // ZERO records could never appear — it was indistinguishable from a skill that does not
  // exist. Measured on this repo: /design had run and produced results, but held no step
  // records at all, and `audit --all` listed explore-idea, shape-up and unpack-problem while
  // saying nothing about /design. A missing skill in a health report reads as "nothing to
  // report", which is exactly the wrong reading: the honest reading is "ran, untracked".
  //
  // Enumerated from the skills DIRECTORY, not the records, so absence becomes visible.
  if (all || !skill) {
    const skillsDir = path.join(PROJECT_ROOT, '.agents', 'skills');
    let onDisk = [];
    try {
      onDisk = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
        .map(e => e.name);
    } catch { /* skills dir unreadable — report tracked only */ }

    // A tracked skill may be recorded under a mode variant (`design-validate`), so match on
    // the base name too before calling anything untracked.
    //
    // Step files live in `<skill>/steps/`, not at the skill root — counting at the root
    // reported "0" for every skill, which was worse than no column at all. And a skill that
    // ships no step files is not "untracked", it is simply not step-tracked; listing 38 of
    // them as untracked buried the one that mattered.
    const stepFileCount = (name) => {
      const stepsDir = path.join(skillsDir, name, 'steps');
      if (!fs.existsSync(stepsDir)) return 0;
      return fs.readdirSync(stepsDir).filter(f => /^step-.*\.md$/.test(f)).length;
    };
    const hasSteps = new Map(onDisk.map(n => [n, stepFileCount(n)]));

    const untracked = onDisk.filter(name =>
      hasSteps.get(name) > 0 && !tracked.some(t => t === name || t.startsWith(name + '-')));
    const generic = onDisk.filter(name => hasSteps.get(name) === 0);

    if (untracked.length) {
      report += `## Untracked skills (${untracked.length})\n\n`;
      report += `These skills ship step files but have **zero** records in \`step-audit.json\`.\n\n`;
      report += `The **Evidence** column makes "ran untracked" distinguishable from "never ran":\n`;
      report += `if the skill declares output artifacts and they exist on disk, it produced work\n`;
      report += `without being tracked. That is a decidable fact, not a guess.\n\n`;
      report += `| Skill | Step files | Evidence | Declared artifacts found |\n|---|---|---|---|\n`;
      for (const n of untracked.sort()) {
        const declared = declaredArtifacts(skillsDir, n);
        const found = declared.filter(p => fs.existsSync(path.join(PROJECT_ROOT, p)));
        const verdict = declared.length === 0
          ? 'unknown — declares no full artifact path'
          : found.length > 0
            ? '⚠️ **ran untracked**'
            : 'declared artifacts absent — never ran, or cleaned up';
        report += `| \`${n}\` | ${hasSteps.get(n)} | ${verdict} | ${found.length}/${declared.length}` +
          (found.length ? ` (${found.slice(0, 2).map(p => `\`${p.split('/').pop()}\``).join(', ')})` : '') + ' |\n';
      }
      report += '\n';
    }
    if (generic.length) {
      report += `> ${generic.length} skill(s) ship no \`step-*.md\` files, so they are not step-tracked by design: ` +
        `${generic.sort().map(n => `\`${n}\``).join(', ')}\n\n`;
    }
  }

  skills.forEach(s => {
    const sequence = readStepSequence(s);
    const skillEntries = entries.filter(e => e.skill === s);
    const driftWarnings = skillEntries.filter(e => e.type === 'drift_warning');

    report += `## Skill: ${s}\n\n`;
    report += `| Step | Name | Status | Started | Duration | Issues |\n`;
    report += `|---|---|---|---|---|---|\n`;

    // Build per-step status — iterate over labels from sequence + any stray entries.
    // scope_lock/drift_warning rows carry no step label and are excluded here.
    const seqLabels = sequence.map(s => s.label);
    const entryLabels = skillEntries.filter(e => e.type === 'begin' || e.type === 'complete').map(e => String(e.step));
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

// Announce the degradation once, on the write commands where a caller could otherwise believe
// something was recorded. Behaviour is unchanged — still `off`, still exit 0 — but it is no
// longer a success that reports nothing.
if (config.configMissing && ['begin', 'complete'].includes(command)) {
  console.error(
    `[WARN] No ${CONFIG_FILE} found (cwd: ${process.cwd()}).\n` +
      `       step_tracking defaulted to "off": this call recorded NOTHING, despite exiting 0.\n` +
      `       Run from the project root, or set step_tracking explicitly, if the step should be tracked.`
  );
}

// No command → show usage regardless of mode (human error, not an agent call)
if (!command) {
  console.error('step_tracker: no command given. Use begin, complete, scope-lock, status, or audit.');
  console.error('Usage: node step_tracker.js <begin|complete|scope-lock|route|status|audit> [--skill NAME] [--step N] [--track NAME] [--agent NAME]');
  process.exit(1);
}

// Deterministic Step 0 scope gate — enforced in ALL modes (incl. off), before
// the off-mode early exit: a bypassed gate is a correctness failure.
if (command === 'begin' && args.skill && args.step) {
  enforceScopeGate(args.skill, args.step, mode);
}

// In off mode, audit/status/scope-lock run; begin/complete still enforce the
// Step-0 gate (checked above) but skip breadcrumb writes. Unknown commands
// always exit 1 regardless of mode.
if (!['begin', 'complete', 'scope-lock', 'route', 'status', 'audit'].includes(command)) {
  console.error(`step_tracker: unknown command "${command}". Use begin, complete, scope-lock, route, status, or audit.`);
  process.exit(1);
}
if (mode === 'off' && ['begin', 'complete'].includes(command)) {
  // R01-D1: even in off mode (the shipped default), a skill-less begin or
  // complete must not silently pass — it is the cross-skill misattribution
  // audit hole (P0-6). Enforce --skill before the no-breadcrumb return.
  if (!args.skill) {
    console.error(`step_tracker: --skill is required for ${command} (prevents cross-skill misattribution).`);
    process.exit(1);
  }
  return; // gate already enforced; no breadcrumb write in off mode
}

switch (command) {
  case 'begin':      cmdBegin(args, mode); break;
  case 'complete':   cmdComplete(args, mode); break;
  case 'scope-lock': cmdScopeLock(args, mode); break;
  case 'route':      cmdRoute(args); break;
  case 'status':     cmdStatus(args); break;
  case 'audit':      cmdAudit(args); break;
  default:
    console.error(`step_tracker: unknown command "${command}". Use begin, complete, scope-lock, route, status, or audit.`);
    process.exit(1);
}
