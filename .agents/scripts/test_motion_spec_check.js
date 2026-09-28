#!/usr/bin/env node
/**
 * test_motion_spec_check.js — Test suite for motion_spec_check.js.
 *
 * Verifies the real-artifact motion spec validator:
 *   - a complete, traceable spec passes (exit 0)
 *   - a prompt missing reduced-motion fallback fails
 *   - a prompt animating a banned property (filter/width) fails
 *   - a non-numeric timing tolerance fails
 *   - an orphan prompt (no US-###) fails
 *   - a prompt not referenced in user-stories.md fails
 *   - a missing Reduced-motion plan section fails
 *   - an absent motion-spec.md is skipped (exit 0 — motion not in scope)
 *
 * Exit codes: 0 = all passed, 1 = one or more failed.
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, 'motion_spec_check.js');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  process.stdout.write(`• Testing: ${name}... `);
  try {
    fn();
    console.log('PASS');
    passCount++;
  } catch (e) {
    console.log('FAIL');
    console.error(`  Error: ${e.message}`);
    failCount++;
  }
}

function runChecker(specContent, userStoriesContent) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motionspec-'));
  const outDir = path.join(dir, 'artifacts', 'output', '03-strategy');
  fs.mkdirSync(outDir, { recursive: true });
  if (specContent !== null) {
    fs.writeFileSync(path.join(outDir, 'motion-spec.md'), specContent, 'utf8');
  }
  if (userStoriesContent !== undefined) {
    fs.writeFileSync(path.join(outDir, 'user-stories.md'), userStoriesContent, 'utf8');
  }
  let code = 0;
  let stdout = '';
  try {
    stdout = execFileSync('node', [SCRIPT, 'check', '--root', dir, '--json'], { encoding: 'utf8' });
  } catch (e) {
    code = e.status;
    stdout = e.stdout || '';
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return { code, stdout };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// A complete, legal MO-001 prompt block (all required fields, transform/opacity
// only, fade fallback, numeric tolerance, traced to US-101).
function prompt(id, story, overrides = {}) {
  const f = {
    Trigger: 'user submits onboarding form',
    Target: 'onboarding-hero',
    'Property(ies)': 'opacity, transform',
    Duration: '400ms',
    Easing: '--ease-standard',
    'Reduced-motion fallback': 'cross-fade opacity 0→1 over 150ms',
    'Keyboard/focus behavior': 'focus-visible shows a static outline',
    'Informational fallback': 'persistent "Welcome" text remains',
    'Autoplay control': 'not applicable',
    'Timing tolerance': '±16ms',
    'Performance note': 'GPU-composited transform/opacity only',
    'SSR/hydration note': 'hook guarded for hydration',
    'Acceptance check': 'timing within ±16ms, reduced-motion pass',
    'Associated stories': story,
    ...overrides,
  };
  return `### Motion Prompt: ${id} — reveal
**Trigger:** ${f.Trigger}
**Target:** ${f.Target}
**Property(ies):** ${f['Property(ies)']}
**From → To (keyframes):**
- 0%: opacity 0, translateY(24px)
- 100%: opacity 1, translateY(0)
**Duration:** ${f.Duration}
**Easing:** ${f.Easing}
**Reduced-motion fallback:** ${f['Reduced-motion fallback']}
**Keyboard/focus behavior:** ${f['Keyboard/focus behavior']}
**Informational fallback:** ${f['Informational fallback']}
**Autoplay control:** ${f['Autoplay control']}
**Timing tolerance:** ${f['Timing tolerance']}
**Performance note:** ${f['Performance note']}
**SSR/hydration note:** ${f['SSR/hydration note']}
**Acceptance check:** ${f['Acceptance check']}
**Associated stories:** ${f['Associated stories']}
`;
}

function spec(...promptBlocks) {
  return `# Feature — Motion Specification

## Motion prompts

${promptBlocks.join('\n')}

## Reduced-motion plan (mandatory)
- Global policy: replace transforms with cross-fades.
`;
}

// ---- Tests ----

runTest('complete traceable spec passes (exit 0)', () => {
  const r = runChecker(spec(prompt('MO-001', 'US-101')), 'Story US-101 references MO-001.');
  const out = JSON.parse(r.stdout);
  assert(r.code === 0, `expected exit 0, got ${r.code}; failures: ${JSON.stringify(out.failures)}`);
});

runTest('missing reduced-motion fallback fails', () => {
  const r = runChecker(spec(prompt('MO-001', 'US-101', { 'Reduced-motion fallback': '' })), 'US-101 MO-001');
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.failures.some((f) => /Reduced-motion fallback/i.test(f)), `no rmf failure: ${JSON.stringify(out.failures)}`);
});

runTest('banned animated property (filter) fails', () => {
  const r = runChecker(spec(prompt('MO-001', 'US-101', { 'Property(ies)': 'transform, filter' })), 'US-101 MO-001');
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.failures.some((f) => /non-composited property.*filter/i.test(f)), `no property failure: ${JSON.stringify(out.failures)}`);
});

runTest('non-numeric timing tolerance fails', () => {
  const r = runChecker(spec(prompt('MO-001', 'US-101', { 'Timing tolerance': 'tight' })), 'US-101 MO-001');
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.failures.some((f) => /timing tolerance must be numeric/i.test(f)), `no tolerance failure: ${JSON.stringify(out.failures)}`);
});

runTest('orphan prompt (no US-###) fails traceability', () => {
  const r = runChecker(spec(prompt('MO-001', 'none')), 'no story refs here');
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.failures.some((f) => /spec-side orphan/i.test(f)), `no orphan failure: ${JSON.stringify(out.failures)}`);
});

runTest('prompt not referenced in user-stories.md fails', () => {
  const r = runChecker(spec(prompt('MO-001', 'US-101')), 'user stories mention US-101 but not the motion id');
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.failures.some((f) => /not referenced in user-stories/i.test(f)), `no unreferenced failure: ${JSON.stringify(out.failures)}`);
});

runTest('missing Reduced-motion plan section fails', () => {
  const noPlan = `# Feature — Motion Specification
## Motion prompts
${prompt('MO-001', 'US-101')}
`;
  const r = runChecker(noPlan, 'US-101 MO-001');
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.failures.some((f) => /Reduced-motion plan/i.test(f)), `no plan failure: ${JSON.stringify(out.failures)}`);
});

runTest('absent motion-spec.md is skipped (exit 0, motion not in scope)', () => {
  const r = runChecker(null, 'US-101');
  const out = JSON.parse(r.stdout);
  assert(r.code === 0, `expected exit 0, got ${r.code}`);
  assert(out.skipped === true, 'expected skipped:true');
});

runTest('multi-prompt spec: one bad prompt fails the whole spec', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101'), prompt('MO-002', 'US-102', { Duration: '' })),
    'US-101 MO-001 US-102 MO-002'
  );
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.failures.some((f) => /MO-002.*Duration/i.test(f)), `no MO-002 duration failure: ${JSON.stringify(out.failures)}`);
  assert(!out.failures.some((f) => /MO-001/.test(f)), `MO-001 should be clean: ${JSON.stringify(out.failures)}`);
});

// ---- Summary ----
console.log(`\n${passCount} passed, ${failCount} failed`);
process.exit(failCount === 0 ? 0 : 1);
