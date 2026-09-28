#!/usr/bin/env node
/**
 * test_anti_generic_check.js — Test suite for anti_generic_check.js.
 *
 * Verifies the anti-generic + motion-coverage gate:
 *   - a compliant design.md passes (exit 0)
 *   - a generic design.md fails (navy surface, empty signature, unfilled brief,
 *     starter inspiration shelf)
 *   - a motion-led context with empty motion tables fails on motion coverage
 *   - a motion-led context that records a motion skip passes
 *   - a missing file fails
 *
 * Exit codes: 0 = all passed, 1 = one or more failed.
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, 'anti_generic_check.js');

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

// Run the checker against a design.md written into a temp root.
// Returns { code, stdout, stderr }.
function runChecker(designContent) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'antigen-'));
  const designDir = path.join(dir, 'artifacts', 'output', '03-strategy');
  fs.mkdirSync(designDir, { recursive: true });
  if (designContent !== null) {
    fs.writeFileSync(path.join(designDir, 'design.md'), designContent, 'utf8');
  }
  let code = 0;
  let stdout = '';
  let stderr = '';
  try {
    stdout = execFileSync('node', [SCRIPT, 'check', '--root', dir, '--json'], { encoding: 'utf8' });
  } catch (e) {
    code = e.status;
    stdout = e.stdout || '';
    stderr = e.stderr || '';
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return { code, stdout, stderr };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---- Fixtures ----

// A compliant, non-generic design.md: neutral dark surface, named signature,
// filled brief, real inspiration shelf, non-motion-led context.
const COMPLIANT = `# Design System

## Product context
- [x] **Minimalist Tech** — docs, devtools.

## Anti-generic rule
**Differentiator requirement:** the signature element is a typewriter-reveal on the hero headline.

## Inspiration shelf
- linear.app — steal: the calm density and hairline borders
- stripe.com/docs — steal: the type rhythm
- vercel.com — steal: the monochrome restraint

## Design brief
Design a devtools dashboard for backend engineers. It should feel calm, precise, fast — never noisy. Style: Minimalism with a typewriter-reveal signature. Signature moment: the hero headline types itself in on first load. Constraints: system mono, dark+light.

## Colors
| Token | Hex | Usage |
|-------|-----|-------|
| \`--color-surface\` | #141414 | page background |
| \`--color-text\` | #e6e6e6 | body text |

## Motion
| Token | Value | Use |
|-------|-------|-----|
| \`--ease-standard\` | | |
`;

// Generic/default: navy dark surface (#0f1729 — blue pushed), no signature, brief
// left as placeholders, starter inspiration shelf intact.
const GENERIC = `# Design System

## Product context
- [x] **Minimalist Tech** — docs, devtools.

## Inspiration shelf
- lafys.com — {what to steal: layout / type / motion}
- motionsites.ai — {what to steal}
- sceneai.art — {what to steal}

## Design brief
Design {product/screen} for {audience}. It should feel {adjective}, {adjective}, {adjective} — never {anti-adjective}.

## Colors
| Token | Hex | Usage |
|-------|-----|-------|
| \`--color-surface\` | #0f1729 | page background |
| \`--color-text\` | #ffffff | body text |
`;

// Motion-led context (Vibrant Brand-First checked) with empty motion tables and
// no recorded skip. Otherwise clean (neutral surface, named signature, filled brief).
const MOTION_LED_EMPTY = `# Design System

## Product context
- [x] **Vibrant Brand-First** — launch campaign, motion-led.

## Anti-generic rule
**Differentiator requirement:** signature element is a scroll-driven hero reveal.

## Inspiration shelf
- igloo.inc — steal: the WebGL depth
- active-theory.com — steal: the transition choreography
- lusion.co — steal: the scroll pacing

## Design brief
Design a launch site for a creator product. It should feel bold, kinetic, premium — never flat. Style: Maximalism with a scroll-driven hero. Signature moment: the hero scene assembles as you scroll. Constraints: brand orange, dark+light.

## Colors
| Token | Hex | Usage |
|-------|-----|-------|
| \`--color-surface\` | #141414 | page background |

## Motion
| Token | Value | Use |
|-------|-------|-----|
| \`--ease-standard\` | | |

## Micro-animations
| Name | Duration | Easing | Trigger |
|------|----------|--------|---------|
| | | | |
`;

// Same motion-led context but records a motion skip → should pass coverage.
const MOTION_LED_SKIP = MOTION_LED_EMPTY.replace(
  '## Motion',
  '> Motion: not in scope for launch — deferred to Cycle 2 per owner.\n\n## Motion'
);

// Motion-led context WITH populated motion table → should pass coverage.
const MOTION_LED_FILLED = MOTION_LED_EMPTY.replace(
  '| \`--ease-standard\` | | |',
  '| \`--ease-standard\` | cubic-bezier(.4,0,.2,1) | default transitions |'
);

// ---- Tests ----

runTest('compliant design.md passes (exit 0)', () => {
  const r = runChecker(COMPLIANT);
  const out = JSON.parse(r.stdout);
  assert(r.code === 0, `expected exit 0, got ${r.code}; failures: ${JSON.stringify(out.failures)}`);
  assert(out.ok === true, 'expected ok:true');
});

runTest('generic design.md fails (exit 1)', () => {
  const r = runChecker(GENERIC);
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.ok === false, 'expected ok:false');
});

runTest('generic: detects navy dark surface', () => {
  const r = runChecker(GENERIC);
  const out = JSON.parse(r.stdout);
  assert(out.failures.some((f) => /navy dark surface/i.test(f)), `no navy failure in ${JSON.stringify(out.failures)}`);
});

runTest('generic: detects missing signature', () => {
  const r = runChecker(GENERIC);
  const out = JSON.parse(r.stdout);
  assert(out.failures.some((f) => /signature differentiator/i.test(f)), `no signature failure in ${JSON.stringify(out.failures)}`);
});

runTest('generic: detects unfilled design brief placeholders', () => {
  const r = runChecker(GENERIC);
  const out = JSON.parse(r.stdout);
  assert(out.failures.some((f) => /unfilled placeholders/i.test(f)), `no brief failure in ${JSON.stringify(out.failures)}`);
});

runTest('generic: detects starter inspiration shelf', () => {
  const r = runChecker(GENERIC);
  const out = JSON.parse(r.stdout);
  assert(out.failures.some((f) => /Inspiration shelf/i.test(f)), `no shelf failure in ${JSON.stringify(out.failures)}`);
});

runTest('motion-led context with empty motion fails on coverage (exit 1)', () => {
  const r = runChecker(MOTION_LED_EMPTY);
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.failures.some((f) => /Motion coverage/i.test(f)), `no motion-coverage failure in ${JSON.stringify(out.failures)}`);
});

runTest('motion-led context with recorded skip passes (exit 0)', () => {
  const r = runChecker(MOTION_LED_SKIP);
  const out = JSON.parse(r.stdout);
  assert(r.code === 0, `expected exit 0, got ${r.code}; failures: ${JSON.stringify(out.failures)}`);
});

runTest('motion-led context with populated motion table passes (exit 0)', () => {
  const r = runChecker(MOTION_LED_FILLED);
  const out = JSON.parse(r.stdout);
  assert(r.code === 0, `expected exit 0, got ${r.code}; failures: ${JSON.stringify(out.failures)}`);
});

runTest('missing design.md fails (exit 1)', () => {
  const r = runChecker(null);
  const out = JSON.parse(r.stdout);
  assert(r.code === 1, `expected exit 1, got ${r.code}`);
  assert(out.failures.some((f) => /file not found/i.test(f)), 'expected file-not-found failure');
});

// ---- Summary ----
console.log(`\n${passCount} passed, ${failCount} failed`);
process.exit(failCount === 0 ? 0 : 1);
