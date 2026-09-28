#!/usr/bin/env node
/**
 * test_motion_intent_check.js — Test suite for motion_intent_check.js.
 *
 * Verifies the halt-and-ask motion-intent detector:
 *   - explicit phrase ("interactive website") → decisionRequired
 *   - motion-led context (Vibrant Brand-First) → decisionRequired
 *   - plain static brief → no decision
 *   - already-decided brief (motion: not in scope / MO-### / motion-spec.md) → no nag
 *   - no source artifacts → no decision, still exit 0
 *   - always exits 0 (advisory, never fails the build)
 *
 * Exit codes: 0 = all passed, 1 = one or more failed.
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, 'motion_intent_check.js');

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

// briefContent/prdContent: string to write, or undefined to omit that file.
function runChecker(briefContent, prdContent) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motionintent-'));
  if (briefContent !== undefined) {
    const d = path.join(dir, 'artifacts', 'output', '01-discovery');
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'idea-brief.md'), briefContent, 'utf8');
  }
  if (prdContent !== undefined) {
    const d = path.join(dir, 'artifacts', 'output', '03-strategy');
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'requirements.md'), prdContent, 'utf8');
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

runTest('explicit "interactive website" triggers decisionRequired', () => {
  const r = runChecker('We want to build an interactive website for our launch.');
  const out = JSON.parse(r.stdout);
  assert(r.code === 0, `expected exit 0, got ${r.code}`);
  assert(out.decisionRequired === true, 'expected decisionRequired:true');
  assert(out.signals.explicit.length > 0, 'expected an explicit signal');
});

runTest('"creative website" triggers decisionRequired', () => {
  const r = runChecker('A creative website to showcase the brand.');
  const out = JSON.parse(r.stdout);
  assert(out.decisionRequired === true, 'expected decisionRequired:true');
});

runTest('motion-led context (Vibrant Brand-First) triggers decisionRequired', () => {
  const r = runChecker(undefined, 'Product context: Vibrant Brand-First campaign site.');
  const out = JSON.parse(r.stdout);
  assert(out.decisionRequired === true, 'expected decisionRequired:true');
  assert(out.signals.contexts.length > 0, 'expected a context signal');
});

runTest('scroll choreography triggers decisionRequired', () => {
  const r = runChecker('The hero uses scroll choreography to reveal sections.');
  const out = JSON.parse(r.stdout);
  assert(out.decisionRequired === true, 'expected decisionRequired:true');
});

runTest('plain static brief → no decision required', () => {
  const r = runChecker('An internal admin dashboard for managing invoices and users.');
  const out = JSON.parse(r.stdout);
  assert(r.code === 0, `expected exit 0, got ${r.code}`);
  assert(out.decisionRequired === false, 'expected decisionRequired:false');
});

runTest('already decided (motion: not in scope) → no nag', () => {
  const r = runChecker('An interactive website. Motion: not in scope for MVP, deferred to Cycle 2.');
  const out = JSON.parse(r.stdout);
  assert(out.decisionRequired === false, 'expected decisionRequired:false when already decided');
  assert(out.alreadyDecided === true, 'expected alreadyDecided:true');
});

runTest('already decided (references motion-spec.md) → no nag', () => {
  const r = runChecker('Creative website. See motion-spec.md for the animation plan.');
  const out = JSON.parse(r.stdout);
  assert(out.decisionRequired === false, 'expected decisionRequired:false');
  assert(out.alreadyDecided === true, 'expected alreadyDecided:true');
});

runTest('no source artifacts → no decision, exit 0', () => {
  const r = runChecker(undefined, undefined);
  const out = JSON.parse(r.stdout);
  assert(r.code === 0, `expected exit 0, got ${r.code}`);
  assert(out.decisionRequired === false, 'expected decisionRequired:false');
  assert(out.scannedSources.length === 0, 'expected no scanned sources');
});

runTest('brief + prd both scanned; signal in PRD alone still fires', () => {
  const r = runChecker('An admin tool.', 'The marketing page is animation-heavy with WebGL.');
  const out = JSON.parse(r.stdout);
  assert(out.decisionRequired === true, 'expected decisionRequired:true from PRD signal');
  assert(out.scannedSources.length === 2, `expected 2 scanned sources, got ${out.scannedSources.length}`);
});

// ---- Summary ----
console.log(`\n${passCount} passed, ${failCount} failed`);
process.exit(failCount === 0 ? 0 : 1);
