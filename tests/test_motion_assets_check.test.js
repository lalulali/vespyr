'use strict';
/**
 * test_motion_assets_check.test.js — the asset-manifest gate.
 *
 * WHY THIS FILE EXISTS
 * `motion_spec_check.js` validates the motion PROMPT and has no visibility into the assets a
 * prompt depends on. So a spec can be perfectly complete — every MO-### carrying duration,
 * easing, reduced-motion fallback, and a US-### reference — and still be unimplementable,
 * because MO-004 animates a hero model that was never generated, or sits on a licence that
 * forbids shipping it, or has nothing to fall back on if generation fails.
 *
 * That is the same defect class as an under-specified prompt: the work looks finished and is
 * not. And unlike the prompt gate, nothing caught it — measured before this script existed,
 * `grep` across all of `.agents/references/motion/` and both motion templates for "asset",
 * "licence", "texture", "HDRI" or any generation tool returned exactly one hit, an
 * incidental mention of "motion assets" in a tool-description table.
 *
 * Structure is built from `asset()`/`spec()` helpers rather than fixtures: a fixture
 * directory invites the corpus-shape trap where a test asserts against a document that
 * itself describes the subject.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents/scripts/motion_assets_check.js');

function runCheck(specContent, assetsContent, { requireAssets = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motionassets-'));
  const outDir = path.join(dir, 'artifacts', 'output', '03-strategy');
  fs.mkdirSync(outDir, { recursive: true });
  if (specContent !== null) fs.writeFileSync(path.join(outDir, 'motion-spec.md'), specContent, 'utf8');
  if (assetsContent !== null) fs.writeFileSync(path.join(outDir, 'motion-assets.md'), assetsContent, 'utf8');

  const args = [SCRIPT, 'check', '--root', dir, '--json'];
  if (requireAssets) args.push('--require-assets');

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

function asset(id, consumedBy, overrides = {}) {
  const f = {
    'Consumed by': consumedBy,
    Purpose: 'ground plane surface',
    Type: 'texture.png',
    Route: 'generated',
    Spec: '1024x1024, seamless tileable',
    Source: 'FLUX.1 schnell',
    Licence: 'Apache 2.0',
    'Generation prompt': 'weathered brass compass surface, brushed metal, soft studio light, seamless tileable, no text',
    Fallback: 'solid #2a2622',
    ...overrides,
  };
  return `### Asset: ${id} — ground
- **Consumed by:** ${f['Consumed by']}
- **Purpose:** ${f.Purpose}
- **Type:** ${f.Type}
- **Route:** ${f.Route}
- **Spec:** ${f.Spec}
- **Source:** ${f.Source}
- **Licence:** ${f.Licence}
- **Generation prompt:** ${f['Generation prompt']}
- **Fallback:** ${f.Fallback}
`;
}

function spec(prompts) {
  // `Evidence mode:` is mandatory under --require-spec; motion_spec_check.js enforces it.
  return `# Motion Spec — Hero

## Overview
- **Evidence mode:** full
- **Research provenance:** delegated

## Reduced-motion plan
reduce → static hero.

${prompts}
`;
}

// A prompt carrying the fields `motion_spec_check.js` requires, so the cross-gate test can
// build a spec that passes the spec gate. That is the whole point of that test: the spec is
// provably complete and the work is still unbuildable.
function prompt(id, story, overrides = {}) {
  // Most tests pair a manifest whose AS-001 is consumed by MO-001 with this spec, so the
  // default declares AS-001. `Asset:` is mandatory once assets are in scope, and the gate now
  // cross-checks it in both directions — a manifest claiming a consumer whose spec says `none`
  // is a genuine orphan, which is why a `none` default broke these fixtures.
  const f = { Asset: 'AS-001', Duration: '800ms', ...overrides };
  return `### Motion Prompt: ${id} — hero reveal
- **Trigger:** page load
- **Target:** .hero
- **Property(ies):** transform, opacity
- **From → To (keyframes):**
- 0%: opacity 0, translateY(24px)
- 100%: opacity 1, translateY(0)
- **Duration:** ${f.Duration}
- **Easing:** ease-out
- **Reduced-motion fallback:** cross-fade ≤200ms
- **Keyboard/focus behavior:** n/a
- **Informational fallback:** static hero text
- **Autoplay control:** not applicable
- **Timing tolerance:** ±16ms
- **Performance note:** compositor only
- **SSR/hydration note:** not applicable
- **Acceptance check:** hero settles
- **Associated stories:** ${story}
${f.Asset ? `- **Asset:** ${f.Asset}\n` : ''}`;
}

// ---- The happy path ----

test('a complete manifest with full coverage passes', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001', { Asset: 'AS-001' })),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001')}`
  );
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

// ---- Absence is context-dependent, exactly as for the spec gate ----

test('DEFAULT: an absent manifest is skipped — most motion needs no external assets', () => {
  const r = runCheck(spec(prompt('MO-001', 'US-001')), null);
  assert.strictEqual(r.code, 0, 'lenient by default so /design and /develop are unaffected');
  assert.strictEqual(r.json.skipped, true);
  assert.strictEqual(r.json.ok, true);
});

test('--require-assets: an absent manifest FAILS — the /motion Phase 3b gate', () => {
  const r = runCheck(spec(prompt('MO-001', 'US-001')), null, { requireAssets: true });
  assert.strictEqual(r.code, 1, 'Phase 3b is only reachable once assets are in scope');
  assert.strictEqual(r.json.ok, false);
  assert.strictEqual(r.json.skipped, false);
});

test('--require-assets: the failure must not claim assets are out of scope', () => {
  const r = runCheck(spec(prompt('MO-001', 'US-001')), null, { requireAssets: true });
  const text = JSON.stringify(r.json).toLowerCase();
  assert(!/no external assets in scope/.test(text),
    'asserting out-of-scope from inside the in-scope phase is how the spec gate lied');
  assert(/in scope/.test(text));
});

// ---- Coverage: the defect this script exists for ----

test('an MO-### declaring an unnamed external asset with nothing covering it fails', () => {
  // Note the manifest covers MO-002 only. MO-001 asks for a hero model and no AS-### answers
  // it — this is the unimplementable-prompt case, distinct from the AS-### reference below.
  const r = runCheck(
    spec(
      prompt('MO-001', 'US-001', { Asset: 'generated hero model, desc not written' }) +
      prompt('MO-002', 'US-002')
    ),
    `# Motion Assets\n\n${asset('AS-001', 'MO-002')}`
  );
  assert.strictEqual(r.code, 1);
  assert(
    r.json.failures.some((f) => /MO-001.*describes an asset instead of naming one/i.test(f)),
    'the message now names the fix (reference an AS-### or a path) rather than only the gap'
  );
});

test('an AS-### referencing a MO-### the spec does not define fails', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-009')}`
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /references MO-009, which is not defined/i.test(f)));
});

test('an asset naming no MO-### fails — nothing consumes it', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'none')}`
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /names no MO-###/i.test(f)));
});

test('a direct repo path in the spec needs no AS-### entry', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001', { Asset: 'src/assets/hero.png' })),
    null
  );
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

test('a manifest with no AS-### entries at all fails', () => {
  const r = runCheck(spec(prompt('MO-001', 'US-001')), '# Motion Assets\n\nNothing here yet.');
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /no `### Asset: AS-###` entries/i.test(f)));
});

// ---- Required fields ----

test('every required field is enforced', () => {
  for (const field of ['Consumed by', 'Purpose', 'Type', 'Route', 'Spec', 'Source', 'Licence', 'Fallback']) {
    const r = runCheck(
      spec(prompt('MO-001', 'US-001')),
      `# Motion Assets\n\n${asset('AS-001', 'MO-001', { [field]: '' })}`
    );
    assert.strictEqual(r.code, 1, `a blank "${field}" must fail`);
    assert(
      r.json.failures.some((f) => new RegExp(`"${field.replace(/[()]/g, '\\$&')}"`).test(f)),
      `expected a failure naming "${field}", got: ${JSON.stringify(r.json.failures)}`
    );
  }
});

test('an unfilled template placeholder is not a value', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Fallback: '{what ships if generation fails}' })}`
  );
  assert.strictEqual(r.code, 1, 'a {placeholder} left in the template must not satisfy the gate');
});

test('an unknown route is rejected', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Route: 'find it on the internet' })}`
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /is not one of/i.test(f)));
});

test('every valid route is accepted, including procedural', () => {
  for (const route of ['reuse', 'css', 'procedural', 'stock', 'generated']) {
    const src = route === 'stock' ? 'https://polyhaven.com/a'
      : route === 'reuse' ? 'src/assets/logo.png'
      : route === 'generated' ? 'FLUX.1 schnell'
      : route === 'procedural' ? 'derived at build time from src/data/palette.json'
      : 'CSS gradient';
    const r = runCheck(
      spec(prompt('MO-001', 'US-001')),
      `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Route: route, Source: src })}`
    );
    assert.strictEqual(r.code, 0, `route "${route}" should be valid: ${JSON.stringify(r.json.failures)}`);
  }
});

// ---- Licence traps — the ones that cost real money ----

test('a non-commercial licence blocks shipping', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Licence: 'free tier non-commercial' })}`
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /cannot ship/i.test(f)));
});

test('an unverified licence is rejected', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Licence: 'check later' })}`
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /unverified/i.test(f)));
});

test('CC-BY requires an explicit attribution line', () => {
  const bare = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Licence: 'CC-BY-4.0' })}`
  );
  assert.strictEqual(bare.code, 1, 'CC-BY without a credit line is an unmet obligation');
  assert(bare.json.failures.some((f) => /attribution/i.test(f)));

  const credited = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', {
      Licence: 'CC-BY-4.0 — attribution: photo by Meshy',
    })}`
  );
  assert.strictEqual(credited.code, 0, JSON.stringify(credited.json.failures));
});

test('known-permissive licences pass', () => {
  for (const licence of ['Apache 2.0', 'CC0', 'SIL OFL 1.1', 'MIT']) {
    const r = runCheck(
      spec(prompt('MO-001', 'US-001')),
      `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Licence: licence })}`
    );
    assert.strictEqual(r.code, 0, `${licence} should be accepted`);
  }
});

// ---- Provenance ----

test('a generated asset with no source is unreproducible and must fail', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Source: '' })}`
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /unreproducible/i.test(f)));
});

test('a stock route needs a resolvable source', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Route: 'stock', Source: 'from the free website' })}`
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /needs a Source/i.test(f)));
});

// ---- Prompt safety ----

test('a generation prompt naming an artist is rejected', () => {
  for (const bad of [
    'ambient drone in the style of Brian Eno',
    'a beat sounds like Daft Punk',
    'orchestral swells reminiscent of Hans Zimmer',
  ]) {
    const r = runCheck(
      spec(prompt('MO-001', 'US-001')),
      `# Motion Assets\n\n${asset('AS-001', 'MO-001', { 'Generation prompt': bad })}`
    );
    assert.strictEqual(r.code, 1, `"${bad}" should be rejected`);
    assert(r.json.failures.some((f) => /names an artist/i.test(f)));
  }
});

test('a descriptive audio prompt is accepted', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001')),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', {
      Type: 'sfx.wav',
      'Generation prompt': 'ambient drone, 60-70 BPM, no meter, felt piano and bowed strings, sparse, long hall reverb',
    })}`
  );
  assert.strictEqual(r.code, 0, JSON.stringify(r.json.failures));
});

// ---- Integration with the spec gate ----

test('both gates agree: a complete spec with an incomplete manifest fails assets only', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-both-'));
  const outDir = path.join(dir, 'artifacts', 'output', '03-strategy');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'motion-spec.md'), spec(prompt('MO-001', 'US-001', { Asset: 'AS-001' })));
  fs.writeFileSync(path.join(outDir, 'user-stories.md'), '# US\n## US-001\n**Acceptance:** MO-001\n');
  fs.writeFileSync(path.join(outDir, 'motion-assets.md'), `# Motion Assets\n\n${asset('AS-001', 'MO-001')}`);

  // Capture output, not just the exit code: a bare `1 !== 0` says the gate failed but not why,
  // and that cost real debugging time when the new Evidence-mode check started firing here.
  const runBoth = (script, extra = []) => {
    try {
      const out = execFileSync('node', [script, 'check', '--root', dir, ...extra, '--json'], { encoding: 'utf8' });
      return { code: 0, out };
    } catch (e) { return { code: e.status, out: e.stdout || '' }; }
  };
  const specRes = runBoth(path.join(ROOT, '.agents/scripts/motion_spec_check.js'), ['--require-spec']);
  const assetsRes = runBoth(SCRIPT);
  fs.rmSync(dir, { recursive: true, force: true });

  assert.strictEqual(specRes.code, 0, `a well-formed spec must pass the spec gate: ${specRes.out}`);
  assert.strictEqual(assetsRes.code, 0, `a well-formed manifest must pass the assets gate: ${assetsRes.out}`);
});

test('a missing MO-### asset makes the prompt unimplementable even though the spec gate passes', () => {
  // This is the whole point. The spec is complete; the work still cannot be built.
  const r = runCheck(
    spec(prompt('MO-001', 'US-001', { Asset: 'AS-404 — never written' })),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001')}`
  );
  assert.strictEqual(r.code, 1);
  assert(r.json.failures.some((f) => /unimplementable prompt/i.test(f)));
});
test('an Asset field must NAME an asset, not describe one', () => {
  // Found by mutating the e2e fixture, not by reasoning. A prompt reading
  // `**Asset:** generated card texture, not yet written` passed the gate because some other
  // AS-### happened to list this MO-### under "Consumed by". That is the ASSET asserting a
  // relationship, not the PROMPT's need being resolved — the implementer still cannot tell
  // which bytes to load. Describing is exactly how an unfinished prompt reads as finished.
  const r = runCheck(
    spec(prompt('MO-001', 'US-001', { Asset: 'generated hero model, desc not written' })),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001')}`
  );
  assert.strictEqual(r.code, 1, 'a covering AS-### must not launder a prose asset reference');
  assert(
    r.json.failures.some((f) => /describes an asset instead of naming one/i.test(f)),
    JSON.stringify(r.json.failures)
  );
});

test('the two escapes from the naming rule both still work', () => {
  // AS-### reference
  const viaId = runCheck(
    spec(prompt('MO-001', 'US-001', { Asset: 'AS-001' })),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001')}`
  );
  assert.strictEqual(viaId.code, 0, JSON.stringify(viaId.json.failures));

  // direct repo path — MO-001 keeps AS-001 so the manifest entry stays consumed
  const viaPath = runCheck(
    spec(prompt('MO-001', 'US-001') + prompt('MO-002', 'US-002', { Asset: 'src/assets/hero.glb' })),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001')}`
  );
  assert.strictEqual(viaPath.code, 0, JSON.stringify(viaPath.json.failures));
});

// --- Run 2 (blind to the gates) findings ----------------------------------------------
// Run 2 could not read these scripts, so it discovered the accepted vocabulary empirically by
// bisecting with a throwaway spec. That is the failure mode worth preventing: a gate whose
// accepted values are undocumented forces an agent to spend gate iterations guessing.

test('every natural spelling of "no external asset" is accepted', () => {
  // `none` in backticks is exactly how the skill's own prose writes it, and "none" in quotes
  // is exactly what motion-spec-template.md printed as its example. Both were rejected, so the
  // template shipped a value its own gate refused.
  for (const v of ['`none`', 'none', '"none"', 'n/a', 'No external asset', 'none — pure CSS']) {
    // MO-001 keeps AS-001 so the manifest entry is not orphaned; MO-002 carries the value under test.
    const r = runCheck(
      spec(prompt('MO-001', 'US-001') + prompt('MO-002', 'US-002', { Asset: v })),
      `# Motion Assets\n\n${asset('AS-001', 'MO-001')}`
    );
    assert.strictEqual(r.code, 0, `"${v}" must be accepted: ${JSON.stringify(r.json.failures)}`);
  }
});

test('prose is still rejected — the fix did not open the door to descriptions', () => {
  const r = runCheck(
    spec(prompt('MO-001', 'US-001', { Asset: 'a hero model, TBD' })),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001')}`
  );
  assert.strictEqual(r.code, 1, 'opening the no-asset vocabulary must not admit vague prose');
  assert(r.json.failures.some((f) => /describes an asset instead of naming one/i.test(f)));
});

test('project-authored is a first-class licence term in the template', () => {
  // Run 2 wrote "Project-authored. No third-party rights" and it passed only because the gate
  // checks presence rather than value. That was luck, not a contract, and the template offered
  // no term for it.
  const tpl = fs.readFileSync(
    path.join(__dirname, '..', '.agents/templates/product/motion-assets-template.md'),
    'utf8'
  );
  assert.match(tpl, /project-authored/i, 'first-party work with no third-party rights is common');
});

test('client-data is accepted and requires a resolvable source', () => {
  // Added after a blind B2B run had no rung for the manufacturer's own engineering data —
  // hull geometry and build photography — and had to file it under `reuse`, which reads as
  // "we found an existing asset" rather than "this is the client's primary source material".
  const ok = runCheck(
    spec(prompt('MO-001', 'US-001', { Asset: 'AS-001' })),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Route: 'client-data', Source: 'repo: assets/hull-44/stations.json' })}`
  );
  assert.strictEqual(ok.code, 0, `client-data must be accepted: ${JSON.stringify(ok.json.failures)}`);

  const sourceless = runCheck(
    spec(prompt('MO-001', 'US-001', { Asset: 'AS-001' })),
    `# Motion Assets\n\n${asset('AS-001', 'MO-001', { Route: 'client-data', Source: 'from the client somewhere' })}`
  );
  assert.strictEqual(sourceless.code, 1, 'client-data still needs a path or URL a reviewer can open');
});
