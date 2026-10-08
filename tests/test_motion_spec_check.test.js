'use strict';
/**
 * test_motion_spec_check.test.js — the real-artifact motion spec validator.
 *
 * WHY THIS FILE EXISTS (twice over):
 *
 * 1. This suite was orphaned. It lived at `.agents/scripts/test_motion_spec_check.js`
 *    with a `test_*.js` name and a hand-rolled runner, while `tests/run-all.js` only
 *    collects `*.test.js` under `tests/`. So its 9 checks had not been running against
 *    the script they were written for — not in `npm test`, not in CI. A suite that never
 *    executes cannot protect anything, and it is exactly why the gate defect below
 *    survived. It is now a `node --test` fixture and `npm test` runs it.
 *    `.agents/scripts/test_motion_spec_check.js` is retained because it is referenced by
 *    `.agents/manifest.json`; it is a launcher for this file, not a second implementation.
 *
 * 2. Two defects the original suite could not have caught, because it asserted the
 *    behaviour rather than the requirement:
 *
 *    a) ABSENCE SELF-VACUATED THE GATE. `/motion`'s Phase 3 gate ran
 *       `motion_spec_check.js check --json`, which exits 0 when motion-spec.md is absent
 *       ("motion not in scope"). But Phase 3 is only reachable once motion IS in scope,
 *       so an absent spec is the failure the gate exists to catch. Measured: exit 0 on a
 *       repo with no spec on disk, with the reason string asserting the opposite of the
 *       fact. Fixed with `--require-spec`; the default stays lenient for `/design`
 *       step-06a and `/develop` step-07, where an absent spec genuinely is out of scope.
 *
 *    b) THE PROPERTY CHECK READ THE LABEL, NOT THE ARTIFACT. It only inspected the
 *       declared `Property(ies)` field, so a spec claiming `transform` while its
 *       keyframes animated `height` and `box-shadow` passed — the precise layout-thrash
 *       and 60fps defect the gate exists to catch. Now the keyframe text is read too,
 *       and a label/artifact disagreement is its own failure.
 *
 * Structure is deliberately built from `prompt()`/`spec()` helpers rather than fixtures:
 * a fixture directory invites the corpus-shape trap where a test asserts against
 * content that itself describes the subject.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents/scripts/motion_spec_check.js');

/** Run the checker in a throwaway tree. `--require-spec` toggles defect (a) above. */
function runChecker(specContent, userStoriesContent, { requireSpec = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motionspec-'));
  const outDir = path.join(dir, 'artifacts', 'output', '03-strategy');
  fs.mkdirSync(outDir, { recursive: true });
  if (specContent !== null) {
    fs.writeFileSync(path.join(outDir, 'motion-spec.md'), specContent, 'utf8');
  }
  if (userStoriesContent !== undefined) {
    fs.writeFileSync(path.join(outDir, 'user-stories.md'), userStoriesContent, 'utf8');
  }
  const args = [SCRIPT, 'check', '--root', dir, '--json'];
  if (requireSpec) args.push('--require-spec');

  let code = 0;
  let stdout = '';
  try {
    stdout = execFileSync('node', args, { encoding: 'utf8' });
  } catch (e) {
    code = e.status;
    stdout = e.stdout || '';
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return { code, json: JSON.parse(stdout) };
}

/** A complete, legal prompt block. `overrides` replaces any field for defect tests. */
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
    keyframes: '- 0%: opacity 0, translateY(24px)\n- 100%: opacity 1, translateY(0)',
    ...overrides,
  };
  return `### Motion Prompt: ${id} — reveal
**Trigger:** ${f.Trigger}
**Target:** ${f.Target}
**Property(ies):** ${f['Property(ies)']}
**From → To (keyframes):**
${f.keyframes}
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

function spec(...blocks) {
  // `Evidence mode:` is mandatory under --require-spec and is now gate-enforced. Fixtures that
  // omit it fail for a reason unrelated to what each test is asserting.
  return `# Feature — Motion Specification

## Overview
- **Evidence mode:** full
- **Research provenance:** delegated

## Motion prompts

${blocks.join('\n')}

## Reduced-motion plan (mandatory)
- Global policy: replace transforms with cross-fades.
`;
}

// ---- Carried over verbatim from the orphaned suite ----

test('a complete, traceable spec passes', () => {
  const r = runChecker(spec(prompt('MO-001', 'US-101')), 'Story US-101 references MO-001.');
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

test('a prompt missing the reduced-motion fallback fails', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101', { 'Reduced-motion fallback': '' })),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /Reduced-motion fallback/i.test(f)));
});

test('a declared non-composited property fails', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101', { 'Property(ies)': 'transform, filter' })),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /non-composited property.*filter/i.test(f)));
});

test('a non-numeric timing tolerance fails', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101', { 'Timing tolerance': 'tight' })),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /timing tolerance must be numeric/i.test(f)));
});

test('an orphan prompt with no US-### fails traceability', () => {
  const r = runChecker(spec(prompt('MO-001', 'none')), 'no story refs here');
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /spec-side orphan/i.test(f)));
});

test('a prompt not referenced in user-stories.md fails', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101')),
    'user stories mention US-101 but not the motion id'
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /not referenced in user-stories/i.test(f)));
});

test('a spec with no Reduced-motion plan section fails', () => {
  const noPlan = `# Feature — Motion Specification\n## Motion prompts\n${prompt('MO-001', 'US-101')}\n`;
  const r = runChecker(noPlan, 'US-101 MO-001');
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /Reduced-motion plan/i.test(f)));
});

test('one bad prompt fails the whole spec', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101'), prompt('MO-002', 'US-102', { Duration: '' })),
    'US-101 MO-001 US-102 MO-002'
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /MO-002.*Duration/i.test(f)));
  assert(!r.json.failures.some((f) => /MO-001/.test(f)));
});

// ---- Defect (a): the gate that passed in the one state it must fail ----
//
// The lenient default is deliberate and is asserted here so a future "tightening" does
// not silently break `/design` step-06a and `/develop` step-07, where an absent spec
// really does mean motion is out of scope.

test('DEFAULT: an absent spec is skipped — motion may be out of scope', () => {
  const r = runChecker(null, 'US-101');
  assert.strictEqual(r.code, 0, 'the lenient default must stay lenient for design/develop');
  assert.strictEqual(r.json.skipped, true);
  assert.strictEqual(r.json.ok, true);
});

test('DEFAULT: a present but conformant spec is not reported as skipped', () => {
  const r = runChecker(spec(prompt('MO-001', 'US-101')), 'US-101 MO-001');
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.json.motionSpec.found, true);
});

test('--require-spec: an absent spec FAILS — the /motion Phase 3 gate', () => {
  const r = runChecker(null, 'US-101', { requireSpec: true });
  assert.strictEqual(r.code, 1, 'this is the defect: Phase 3 is in-scope, so absence is a failure');
  assert.strictEqual(r.json.ok, false);
  assert.strictEqual(r.json.skipped, false);
  assert.strictEqual(r.json.motionSpec.found, false);
});

test('--require-spec: the failure must NOT claim motion is out of scope', () => {
  const r = runChecker(null, 'US-101', { requireSpec: true });
  const text = JSON.stringify(r.json).toLowerCase();
  assert(
    !/motion not in scope/.test(text),
    'the reason string asserted the opposite of the fact — that is how the gate lied'
  );
  assert(/in scope/.test(text), 'the failure must explain that motion IS in scope here');
});

test('--require-spec: a present conformant spec still passes', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101')),
    'US-101 MO-001',
    { requireSpec: true }
  );
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

// ---- Defect (b): the check that read the label and ignored the artifact ----

test('keyframes animating height fail even when the label claims transform', () => {
  const r = runChecker(
    spec(
      prompt('MO-001', 'US-101', {
        'Property(ies)': 'transform',
        keyframes: '- 0%: height 0\n- 100%: height 420px',
      })
    ),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 1, 'the label is a claim; the keyframes are the artifact');
  assert(
    r.json.failures.some((f) => /keyframes animate non-composited propert/i.test(f) && /height/.test(f)),
    JSON.stringify(r.json.failures)
  );
});

test('keyframes animating box-shadow are caught', () => {
  const r = runChecker(
    spec(
      prompt('MO-001', 'US-101', {
        'Property(ies)': 'transform, opacity',
        keyframes: '- 0%: transform: translateY(0); box-shadow: 0 0 0 rgba(0,0,0,0.4)\n' +
                     '- 100%: transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,.24)',
      })
    ),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /keyframes animate/i.test(f) && /box-shadow/.test(f)));
});

test('a label/artifact disagreement is reported as its own failure', () => {
  const r = runChecker(
    spec(
      prompt('MO-001', 'US-101', {
        'Property(ies)': 'transform',
        keyframes: '- 0%: transform: translateY(0)\n- 100%: transform: translateY(-4px); height: 420px',
      })
    ),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 1);
  assert(
    r.json.failures.some((f) => /declaration and the artifact disagree/i.test(f)),
    'a spec that contradicts itself is unusable by an implementer — say so explicitly'
  );
});

test('NO FALSE POSITIVE: composited-only keyframes in both forms pass', () => {
  // Both the bare `prop value` and the `prop: value` form appear in real specs; the
  // template's keyframe field is free-form pose text, so a denylist keyed on `prop:`
  // alone would miss the first form entirely.
  for (const keyframes of [
    '- 0%: opacity 0, translateY(24px)\n- 100%: opacity 1, translateY(0)',
    '- 0%: opacity: 0; transform: translateY(24px)\n- 100%: opacity: 1; transform: translateY(0)',
    '- 0%: scale(0.98)\n- 100%: scale(1)',
  ]) {
    const r = runChecker(
      spec(prompt('MO-001', 'US-101', { 'Property(ies)': 'transform, opacity', keyframes })),
      'US-101 MO-001'
    );
    assert.strictEqual(r.code, 0, `false positive on: ${keyframes}\n${JSON.stringify(r.json.failures)}`);
  }
});

test('NO FALSE POSITIVE: a banned word inside a longer word is not a property', () => {
  // `stops`, `desktop`, `stopper` all contain "top". The denylist must require word
  // boundaries, or a legitimate annotation inside a keyframe comment would be reported
  // as animating a layout property — which trains people to ignore this check.
  const r = runChecker(
    spec(
      prompt('MO-001', 'US-101', {
        'Property(ies)': 'transform, opacity',
        keyframes:
          '- 0%: opacity 0, transform: translateY(24px) /* stops on hover */\n' +
          '- 100%: opacity 1, transform: translateY(0)',
      })
    ),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

test('NO FALSE POSITIVE: function values are parsed, not scanned as properties', () => {
  const r = runChecker(
    spec(
      prompt('MO-001', 'US-101', {
        'Property(ies)': 'transform, opacity',
        keyframes:
          '- 0%: opacity 0, transform: rotate(0deg) scale(0.98)\n' +
          '- 100%: opacity 1, transform: rotate(2deg) scale(1)',
      })
    ),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 0, `rotate/scale are transform values, not properties: ${JSON.stringify(r.json.failures)}`);
});
// --- Run 2 finding: the reduced-motion vocabulary was a closed string match ------------
// A blind real-model run wrote "the loop never starts. Not slowed, not shortened — absent."
// That is strictly more precise than "instant" — it says the loop is never created — and the
// gate rejected it, so the agent had to downgrade a correct answer to pass. That trains the
// exact behaviour a gate should suppress: saying less to satisfy a checker.

test('a fallback describing non-existence is accepted, not just the three magic words', () => {
  for (const v of [
    'the loop never starts. Not slowed, not shortened — absent.',
    'never created',
    'does not run',
    'cross-fade 150ms',
    'instant - no transition',
    'static pose from first paint',
  ]) {
    const r = runChecker(
      spec(prompt('MO-001', 'US-101', { 'Reduced-motion fallback': v })),
      'US-101 MO-001'
    );
    assert.strictEqual(r.code, 0, `"${v}" should be accepted: ${JSON.stringify(r.json.failures)}`);
  }
});

test('a genuine vestibular fallback is still rejected', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101', { 'Reduced-motion fallback': 'a slow 800ms parallax drift' })),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 1, 'opening the vocabulary must not admit real vestibular motion');
  assert(r.json.failures.some((f) => /non-vestibular outcome/i.test(f)));
});

test('a negated vestibular word is not itself a violation', () => {
  // "the loop never starts" mentions `loop`. The check must read the negation, or it will
  // reject the most precise answer available — which is exactly the bug being fixed here.
  const r = runChecker(
    spec(prompt('MO-001', 'US-101', { 'Reduced-motion fallback': 'the autoplay marquee is disabled and the loop never starts' })),
    'US-101 MO-001'
  );
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

// --- The taxonomy that punished honesty -----------------------------------------------
// The old single field was `full | lightweight | degraded`, and Done-when waived the
// `@ux-researcher` accessibility sign-off whenever the label was `degraded`. A blind run measured
// the consequence: with 3 of 5 track artifacts landed and @ux-researcher having genuinely signed
// off, the only honest-ish label was `degraded` — which WAIVED a sign-off that had been earned.
// The label taxed accuracy.
//
// Split into two orthogonal fields so the waiver keys on provenance (was there an agent to sign
// off?) rather than on extent (how much research landed).

test('partial research has an honest label', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101')).replace(
      '- **Evidence mode:** full\n- **Research provenance:** delegated',
      '- **Evidence mode:** partial\n- **Research provenance:** delegated'
    ),
    'US-101 MO-001',
    { requireSpec: true }
  );
  assert.strictEqual(r.code, 0, `"partial" must be accepted: ${JSON.stringify(r.json.failures)}`);
});

test('partial + delegated is distinct from partial + single-session', () => {
  for (const prov of ['delegated', 'single-session']) {
    const r = runChecker(
      spec(prompt('MO-001', 'US-101')).replace(
        '- **Evidence mode:** full\n- **Research provenance:** delegated',
        `- **Evidence mode:** partial\n- **Research provenance:** ${prov}`
      ),
      'US-101 MO-001',
      { requireSpec: true }
    );
    assert.strictEqual(r.code, 0, `partial + ${prov} must be accepted`);
  }
});

test('full or partial without a provenance value fails', () => {
  for (const mode of ['full', 'partial']) {
    const r = runChecker(
      spec(prompt('MO-001', 'US-101')).replace(
        '- **Evidence mode:** full\n- **Research provenance:** delegated',
        `- **Evidence mode:** ${mode}`
      ),
      'US-101 MO-001',
      { requireSpec: true }
    );
    assert.strictEqual(r.code, 1, `${mode} must require a provenance value`);
    assert(r.json.failures.some((f) => /Research provenance is missing/i.test(f)));
  }
});

test('lightweight needs no provenance — no research ran to attribute', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101')).replace(
      '- **Evidence mode:** full\n- **Research provenance:** delegated',
      '- **Evidence mode:** lightweight'
    ),
    'US-101 MO-001',
    { requireSpec: true }
  );
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

test('the removed `degraded` label is no longer accepted as an evidence mode', () => {
  const r = runChecker(
    spec(prompt('MO-001', 'US-101')).replace('- **Evidence mode:** full', '- **Evidence mode:** degraded'),
    'US-101 MO-001',
    { requireSpec: true }
  );
  assert.strictEqual(r.code, 1, '`degraded` conflated the two axes; it must not linger');
  assert(r.json.failures.some((f) => /Evidence mode .*is not one of/i.test(f)));
});

test('two conflicting Evidence mode declarations fail', () => {
  // The gate used to read the FIRST value and ignore the rest, so a spec could say one thing
  // and gate as another. Found while fixing a test that appended a second declaration.
  const r = runChecker(
    spec(prompt('MO-001', 'US-101')).replace(
      '- **Evidence mode:** full',
      '- **Evidence mode:** full\n- **Evidence mode:** lightweight'
    ),
    'US-101 MO-001',
    { requireSpec: true }
  );
  assert.strictEqual(r.code, 1, 'a duplicated axis must not be silently resolved to the first line');
  assert(r.json.failures.some((f) => /Evidence mode is declared 2 times/i.test(f)));
});

// --- Run 6 (blind, clinical trial holdout) — the documented gate did not exist -------------
// SKILL.md carried ~25 lines telling agents which reduced-motion phrasings the gate rejects.
// A blind run substituted "a gentle 900ms fade that is still running" into its own PASSING
// spec, confirmed the substitution applied, and got exit 0. Verified here before fixing.
//
// Two things were unenforced: the <=200ms bound the skill mandates, and "still running" when
// no vestibular keyword is present. Both now fail.

test('a reduced-motion transition over 200ms is rejected', () => {
  // "cross-fade 900ms" is not a cross-fade; it is a slow transition wearing the name.
  for (const v of ['cross-fade 900ms', 'a gentle 900ms fade that is still running', 'cross-fade 240ms']) {
    const r = runChecker(
      spec(prompt('MO-001', 'US-101', { 'Reduced-motion fallback': v })),
      'US-101 MO-001'
    );
    assert.strictEqual(r.code, 1, `"${v}" must fail: ${JSON.stringify(r.json.failures)}`);
    assert(r.json.failures.some((f) => /longer than 200ms/i.test(f)));
  }
});

test('a fallback describing the motion as continuing is rejected, even with no vestibular word', () => {
  // This is the exact hole: "still running" carries no slide/parallax/loop keyword, so the
  // keyword-only check passed it and the fade word satisfied the benign branch.
  for (const v of ['the loop continues at 20% opacity', 'a gentle fade that is still running']) {
    const r = runChecker(
      spec(prompt('MO-001', 'US-101', { 'Reduced-motion fallback': v })),
      'US-101 MO-001'
    );
    assert.strictEqual(r.code, 1, `"${v}" must fail`);
    assert(r.json.failures.some((f) => /still running/i.test(f)));
  }
});

test('the sanctioned fallbacks are still accepted — the new checks are not a tightening trap', () => {
  for (const v of [
    'cross-fade 150ms',
    'cross-fade ≤200ms',
    'instant state change — no transition',
    'the loop never starts. Not slowed, not shortened — absent.',
    'static pose from first paint',
    'never created',
    'does not run',
  ]) {
    const r = runChecker(
      spec(prompt('MO-001', 'US-101', { 'Reduced-motion fallback': v })),
      'US-101 MO-001'
    );
    assert.strictEqual(r.code, 0, `"${v}" should be accepted: ${JSON.stringify(r.json.failures)}`);
  }
});
