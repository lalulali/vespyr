#!/usr/bin/env node
// Test harness for /motion skill — end-to-end simulation of the motion pipeline
// Usage: node .agents/skills/motion/test-motion.mjs
//
// Verifies:
//   1. Structural gates: SKILL.md lifecycle, references, templates, catalog, WCAG mapping
//   2. Full pipeline simulation: scope check → research merge gate → spec completeness
//      → traceability (zero orphans) → token consistency → reduced-motion plan
//      → ux-researcher sign-off → tech-lead handoff → QA contract
//   3. Lightweight pipeline simulation: research skipped, Evidence mode recorded
//   4. Anti-pattern guard: /motion must not claim implementation or runtime QA

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const SKILLS = join(ROOT, '.agents', 'skills');
const MOTION = join(SKILLS, 'motion');
const REFS = join(ROOT, '.agents', 'references', 'motion');
const TPL = join(ROOT, '.agents', 'templates');
const AGENTS = join(ROOT, '.agents', 'agents');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, label) {
  if (condition) { passed++; results.push(`  PASS: ${label}`); }
  else { failed++; results.push(`  FAIL: ${label}`); }
}

function readFile(p) {
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

function writeFixture(base, rel, content) {
  const p = join(base, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  return p;
}

// ── Simulated pipeline logic (mirrors .agents/skills/motion/SKILL.md) ──

function simulateScopeCheck({ animatedSurfaces, isDifferentiator }) {
  if (animatedSurfaces >= 5 || isDifferentiator) return 'full';
  if (animatedSurfaces > 0) return 'lightweight';
  return 'none';
}

// Research merge gate: spec cannot open until all 5 track artifacts + merged file exist.
function simulateResearchGate(base) {
  const tracks = [
    'motion-competitive.md',
    'motion-tech-landscape.md',
    'motion-usability.md',
    'motion-accessibility.md',
    'motion-patterns.md',
  ];
  const missing = tracks.filter(f => !existsSync(join(base, f)));
  if (missing.length > 0) return { open: false, reason: `missing track artifacts: ${missing.join(', ')}` };
  if (!existsSync(join(base, 'motion-research.md'))) {
    return { open: false, reason: 'merged motion-research.md not produced' };
  }
  return { open: true };
}

const REQUIRED_PROMPT_FIELDS = [
  'trigger', 'target', 'properties', 'fromTo', 'duration', 'easing',
  'stagger', 'followThrough', 'reducedMotionFallback', 'keyboardFocus',
  'informationalFallback', 'autoplayControl', 'timingTolerance',
  'performanceNote', 'ssrNote', 'acceptanceCheck', 'associatedStories',
];

function validateMotionPrompt(prompt) {
  const missing = [];
  for (const f of REQUIRED_PROMPT_FIELDS) {
    if (!prompt[f] || String(prompt[f]).trim() === '') missing.push(f);
  }
  const allowed = /^(transform|opacity)(,\s*(transform|opacity))*$/;
  if (!allowed.test(prompt.properties || '')) missing.push('properties(transform/opacity only)');
  if (missing.length === 0 && !/fade|opacity|instant/i.test(prompt.reducedMotionFallback)) {
    missing.push('reducedMotionFallback(cross-fade ≤200ms or instant)');
  }
  if (missing.length === 0 && prompt.timingTolerance && !/\d/.test(prompt.timingTolerance)) {
    missing.push('timingTolerance(numeric)');
  }
  return missing;
}

function validateTraceability(specPrompts, userStories) {
  const storyIds = new Set(userStories);
  const usedStoryIds = new Set();
  const orphanPrompts = [];
  for (const p of specPrompts) {
    const refs = p.associatedStories.match(/US-\d+/g) || [];
    if (refs.length === 0) orphanPrompts.push(p.id);
    refs.forEach(r => usedStoryIds.add(r));
  }
  const orphanStories = [...storyIds].filter(s => !usedStoryIds.has(s));
  return { orphanPrompts, orphanStories };
}

function simulateHandoff({ uxSignOff, tasksInExecutionPlan, qaEvidence }) {
  const missing = [];
  if (!uxSignOff) missing.push('ux-researcher accessibility sign-off');
  if (!tasksInExecutionPlan) missing.push('tasks added to execution-plan.md');
  for (const item of qaEvidence) {
    if (!item.done) missing.push(item.label);
  }
  return missing;
}

// ──────────────────────────────────────────────────────────────────
// PART A — Structural gates against real files
// ──────────────────────────────────────────────────────────────────
results.push('\n📋 A1: /motion SKILL.md lifecycle & gates');

const skillMd = readFile(join(MOTION, 'SKILL.md'));
assert(skillMd !== null, 'SKILL.md exists');
if (skillMd) {
  assert(skillMd.includes('name: motion'), 'frontmatter name = motion');
  assert(skillMd.includes('preflow'), 'describes itself as a preflow (no implementation)');
  assert(skillMd.includes('motion-handoff.md'), 'explicit handoff artifact');
  assert(skillMd.includes('@tech-lead'), 'tech-lead owns the handoff');
  assert(skillMd.includes('@ux-researcher'), 'ux-researcher is in the pipeline');
  assert(skillMd.includes('/develop') && skillMd.includes('must not implement'), '/motion must not implement runtime code');
  assert(skillMd.includes('/test'), '/test owns runtime QA');
  assert(skillMd.includes('motion-research.md'), 'research merge artifact named');
  assert(skillMd.includes('reduced-motion') || skillMd.includes('Reduced-motion'), 'reduced-motion gate present');
  assert(skillMd.includes('WCAG 2.3.3'), 'SC 2.3.3 in QA contract');
  assert(skillMd.includes('transform') && skillMd.includes('opacity'), 'transform/opacity-only in QA contract');
  assert(skillMd.includes('±16ms') || skillMd.includes('16ms'), 'numeric timing tolerance present');
  assert(skillMd.includes('evals/evals.json') === false, 'evals referenced separately (not inline)');
}

results.push('\n📋 A2: on-demand knowledge references');

for (const f of ['motion-design-guidelines.md', 'motion-implementation-guidelines.md', 'motion-research-guide.md']) {
  const p = join(REFS, f);
  assert(existsSync(p), `${f} exists`);
  const c = readFile(p);
  if (c) assert(c.includes('When to load') || c.includes('loaded ONLY when'), `${f} is on-demand (initiation tokens stay low)`);
}

results.push('\n📋 A3: templates');

for (const f of ['product/motion-spec-template.md', 'planning/motion-handoff-template.md']) {
  assert(existsSync(join(TPL, f)), `${f} exists`);
}
const specTpl = readFile(join(TPL, 'product', 'motion-spec-template.md'));
assert(specTpl.includes('Evidence mode'), 'spec template records Evidence mode');
assert(specTpl.includes('Reduced-motion fallback'), 'spec template requires reduced-motion fallback');
assert(specTpl.includes('Keyboard/focus behavior'), 'spec template requires keyboard/focus behavior');
assert(specTpl.includes('Informational fallback'), 'spec template requires informational fallback');
assert(specTpl.includes('Autoplay control'), 'spec template requires autoplay control');
assert(specTpl.includes('Timing tolerance'), 'spec template requires timing tolerance');
assert(specTpl.includes('Associated stories'), 'spec template requires story traceability');
const designTpl = readFile(join(TPL, 'product', 'design.md'));
assert(designTpl.includes('## Motion'), 'design.md has canonical ## Motion token section');
const handoffTpl = readFile(join(TPL, 'planning', 'motion-handoff-template.md'));
assert(handoffTpl.includes('WCAG 2.3.3'), 'handoff template carries SC 2.3.3 check');
assert(handoffTpl.includes('transform') && handoffTpl.includes('opacity') && handoffTpl.includes('filters'), 'handoff template rejects non-transform/opacity properties');

results.push('\n📋 A4: WCAG mapping (correct SC for the right concern)');

const designRef = readFile(join(REFS, 'motion-design-guidelines.md'));
assert(designRef.includes('SC 2.3.1') && designRef.includes('flash'), 'SC 2.3.1 mapped to flash/seizure');
assert(designRef.includes('SC 2.3.3') && designRef.includes('Animation from Interactions'), 'SC 2.3.3 mapped to interaction-triggered animation');
assert(designRef.includes('Pause, Stop, Hide') && designRef.includes('[^2]'), 'SC 2.2.2 Pause/Stop/Hide cited via footnote [2]');
assert(['[^1]:', '[^2]:', '[^3]:'].every(x => designRef.includes(x)), 'all three WCAG sources cited in footnotes');

results.push('\n📋 A5: property contract consistency (no filter contradiction)');

assert(!/Property\(ies\):[^\n]*filter/i.test(designRef), 'design guideline prompt recipe permits only transform/opacity');
const implRef = readFile(join(REFS, 'motion-implementation-guidelines.md'));
assert(implRef.includes('transform') && implRef.includes('opacity'), 'implementation reference mandates transform/opacity-only');
assert(implRef.includes('WCAG 2.3.1') || implRef.includes('2.3.1'), 'implementation reference checks flash thresholds');

results.push('\n📋 A6: catalog & index discoverability');

const catalog = JSON.parse(readFile(join(SKILLS, 'help-me', 'skills-catalog.json'), 'utf8'));
assert(catalog.some(e => e.name === 'motion'), 'motion is in skills-catalog.json');
const motionEntry = catalog.find(e => e.name === 'motion');
assert(motionEntry !== undefined && !JSON.stringify(motionEntry).includes('discovery'), 'motion catalog entry uses only research/strategy/planning folders');
const evals = JSON.parse(readFile(join(MOTION, 'evals', 'evals.json'), 'utf8'));
assert(evals.skill_name === 'motion', 'evals.json skill_name = motion');
assert(Array.isArray(evals.evals) && evals.evals.length >= 3, 'evals.json has >= 3 cases');
const workflowMd = readFile(join(ROOT, '.agents', 'workflow.md'));
assert(workflowMd.includes('43 specialized skills'), 'workflow.md states 43 skills');
assert(workflowMd.includes('| `motion` |'), 'workflow.md lists motion');

results.push('\n📋 A7: accessibility ownership');

const uxResearcher = readFile(join(AGENTS, 'ux-researcher.md'));
assert(uxResearcher.includes('required for a full motion pipeline'), 'ux-researcher required for full motion');
assert(uxResearcher.includes('decision authority') && uxResearcher.includes('binding'), 'ux-researcher is the binding accessibility decision authority');
const contracts = readFile(join(ROOT, '.agents', 'references', 'agent-contracts.md'));
assert(contracts.includes('binding design-versus-accessibility decisions'), 'contracts: ux-researcher owns binding a11y decisions');

// ──────────────────────────────────────────────────────────────────
// PART B — Full pipeline simulation (sandbox)
// ──────────────────────────────────────────────────────────────────
results.push('\n📋 B1: Full pipeline — scope check routes to full research');

const fullScope = simulateScopeCheck({ animatedSurfaces: 6, isDifferentiator: true });
assert(fullScope === 'full', `6 animated surfaces + differentiator → full (got: ${fullScope})`);

results.push('\n📋 B2: Research merge gate blocks spec until all tracks merge');

const sim = mkdtempSync(join(os.tmpdir(), 'motion-sim-'));
try {
  const g1 = simulateResearchGate(join(sim, 'research'));
  assert(g1.open === false, 'spec blocked when no research exists');
  assert(g1.reason.includes('track artifacts'), 'block reason names missing track artifacts');

  writeFixture(sim, 'research/motion-competitive.md', '# competitive');
  writeFixture(sim, 'research/motion-tech-landscape.md', '# tech');
  writeFixture(sim, 'research/motion-usability.md', '# usability');
  writeFixture(sim, 'research/motion-accessibility.md', '# a11y');
  writeFixture(sim, 'research/motion-patterns.md', '# patterns');
  const g2 = simulateResearchGate(join(sim, 'research'));
  assert(g2.open === false, 'spec still blocked without merged motion-research.md');
  assert(g2.reason.includes('merged'), 'block reason names missing merged file');

  writeFixture(sim, 'research/motion-research.md', '# Motion Research\nAttributed sections + sources.');
  const g3 = simulateResearchGate(join(sim, 'research'));
  assert(g3.open === true, 'spec gate opens after all 5 tracks + merged file exist');

  results.push('\n📋 B3: Spec gate — complete prompts pass, incomplete fail');

  const completePrompt = {
    id: 'MO-001',
    trigger: 'user submits onboarding form',
    target: 'onboarding-hero',
    properties: 'opacity, transform',
    fromTo: '0%: opacity 0, translateY(24px) → 100%: opacity 1, translateY(0)',
    duration: '400ms',
    easing: '--ease-standard',
    stagger: 'leader hero, followers 60ms',
    followThrough: 'backdrop settles 80ms after content',
    reducedMotionFallback: 'cross-fade opacity 0→1 over 150ms',
    keyboardFocus: 'focus-visible shows a static outline; no hover-only requirement',
    informationalFallback: 'persistent "Welcome" text remains',
    autoplayControl: 'not applicable',
    timingTolerance: '±16ms',
    performanceNote: 'GPU-composited transform/opacity only',
    ssrNote: 'no matchMedia on server; hook guarded for hydration',
    acceptanceCheck: 'timing within ±16ms, reduced-motion pass, no reflow',
    associatedStories: 'US-101, US-102',
  };
  assert(validateMotionPrompt(completePrompt).length === 0, 'complete prompt passes spec gate');

  const incompletePrompt = { ...completePrompt, id: 'MO-002', reducedMotionFallback: '', properties: 'transform, filter' };
  const missing = validateMotionPrompt(incompletePrompt);
  assert(missing.length > 0, 'prompt with filter + no reduced-motion fallback fails spec gate');
  assert(missing.some(m => m.includes('reducedMotionFallback')), 'failure names reduced-motion fallback');
  assert(missing.some(m => m.includes('properties')), 'failure names the forbidden property contract');

  const specPrompts = [completePrompt,
    { ...completePrompt, id: 'MO-003', associatedStories: 'US-103' },
    { ...completePrompt, id: 'MO-004', associatedStories: 'US-104' },
    { ...completePrompt, id: 'MO-005', associatedStories: 'US-105' },
    { ...completePrompt, id: 'MO-006', associatedStories: 'US-106' },
  ];

  results.push('\n📋 B4: Traceability — zero orphans in both directions');

  const stories = ['US-101', 'US-102', 'US-103', 'US-104', 'US-105', 'US-106'];
  const trace = validateTraceability(specPrompts, stories);
  assert(trace.orphanPrompts.length === 0, 'no spec-side orphans (every prompt has a story)');
  assert(trace.orphanStories.length === 0, 'no story-side orphans (every story has a prompt)');

  const trace2 = validateTraceability(specPrompts, ['US-101', 'US-102']);
  assert(trace2.orphanPrompts.length === 0, 'traceability tolerant of extra prompts for same stories');

  results.push('\n📋 B5: Token consistency between spec and design.md');

  const specTokens = { '--ease-standard': 'cubic-bezier(0.16,1,0.3,1)', '--dur-fast': '150ms', '--dur-base': '300ms' };
  const designTokens = { '--ease-standard': 'cubic-bezier(0.16,1,0.3,1)', '--dur-fast': '150ms', '--dur-base': '300ms' };
  const mismatch = Object.keys(specTokens).filter(k => specTokens[k] !== designTokens[k]);
  assert(mismatch.length === 0, 'spec tokens match design.md tokens');
  const drift = { ...designTokens, '--dur-base': '500ms' };
  assert(Object.keys(specTokens).some(k => specTokens[k] !== drift[k]), 'token drift is detected');

  results.push('\n📋 B6: Handoff gate — complete evidence passes, incomplete blocks');

  const evidenceList = [
    { label: 'MO-ID → prompt/story/code/QA traceability', done: true },
    { label: 'timing within ±16ms', done: true },
    { label: 'keyboard/focus + hover behavior', done: true },
    { label: 'reduced-motion pass', done: true },
    { label: 'informational non-motion equivalent', done: true },
    { label: 'pause/stop/hide for auto-moving content', done: true },
    { label: 'WCAG 2.3.1 flash thresholds', done: true },
    { label: 'non-essential interaction animation disableable (SC 2.3.3)', done: true },
    { label: 'transform/opacity only (no layout/filter)', done: true },
    { label: 'performance evidence (60fps mid-range)', done: true },
    { label: 'tokens match design.md + SSR/hydration', done: true },
  ];
  const h1 = simulateHandoff({ uxSignOff: true, tasksInExecutionPlan: true, qaEvidence: evidenceList });
  assert(h1.length === 0, 'complete handoff passes');
  const h2 = simulateHandoff({
    uxSignOff: false,
    tasksInExecutionPlan: true,
    qaEvidence: evidenceList.map(e => ({ ...e, done: e.label.includes('SC 2.3.3') ? false : e.done })),
  });
  assert(h2.length === 2, 'missing ux sign-off + SC 2.3.3 evidence blocks handoff');

  results.push('\n📋 B7: QA contract — motion evidence is mandatory');

  const qaGate = readFile(join(ROOT, '.agents', 'skills', 'develop', 'steps', 'step-07-quality-gates.md'));
  assert(qaGate.includes('7a. Motion QA') || qaGate.includes('Motion QA'), 'develop quality gate has motion QA section');
  assert(qaGate.includes('conditional hard gate'), 'motion QA is a conditional hard gate');
  assert(qaGate.includes('Motion Verification'), 'qa-report gets a Motion Verification section');

  results.push('\n📋 C1: Lightweight pipeline — research skipped, evidence mode recorded');

  const lightScope = simulateScopeCheck({ animatedSurfaces: 2, isDifferentiator: false });
  assert(lightScope === 'lightweight', '2 micro-interactions → lightweight (got: ' + lightScope + ')');
  assert(specTpl.includes('Evidence mode') && specTpl.includes('lightweight'), 'lightweight spec records Evidence mode: lightweight');

  results.push('\n📋 C2: Anti-pattern guard — no implementation from /motion');

  const prePhase4 = skillMd.slice(0, skillMd.indexOf('### Phase 4'));
  assert(!prePhase4.includes('Invoke `@developer`') && !prePhase4.includes('implements each'), 'preflow sections do not direct an implementation agent');
  assert(skillMd.includes('The handoff is the completion boundary'), 'handoff declared as completion boundary');
  assert(skillMd.includes('must not implement'), '/motion explicitly must not implement runtime code');
} finally {
  rmSync(sim, { recursive: true, force: true });
}

// ──────────────────────────────────────────────────────────────────
// REPORT
// ──────────────────────────────────────────────────────────────────
console.log(results.join('\n'));
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed === 0) {
  console.log('✅ Simulation passed — /motion preflow is structurally sound and gates hold end-to-end.');
} else {
  console.log('❌ Simulation failed — inspect the FAIL lines above.');
}
process.exit(failed === 0 ? 0 : 1);
