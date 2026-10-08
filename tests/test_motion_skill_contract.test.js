'use strict';
/**
 * test_motion_skill_contract.test.js — skill-level contract for /motion.
 *
 * Companion to test_motion_spec_check.test.js, which covers the validator. This file
 * covers the SKILL.md prose contract, and it exists because three separate audits of
 * /motion found the same shape of defect: the rule that governs EVERY phase was stated
 * nowhere at skill level, so each phase could satisfy itself against a local reading.
 *
 * Point-2 rule applied here (generalised from the /design audit): if a rule applies to
 * every mode or phase, it goes in SKILL.md ONCE — not copied into each step, and not left
 * implicit inside one. /motion ships no step files, so SKILL.md is the only surface there
 * is; a contract that only exists in a phase body is invisible to the other four.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILL = path.join(ROOT, '.agents/skills/motion/SKILL.md');
const src = fs.readFileSync(SKILL, 'utf8');

/**
 * Collapse runs of whitespace so a phrase can be asserted across a wrapped markdown line.
 *
 * Written after a phrase split across two source lines failed its regex three separate times,
 * each time patched with a `\s+` rather than fixed at the class level. These files are wrapped at
 * ~90 columns, so any assertion spanning a sentence boundary is fragile unless whitespace is
 * normalised first. A failed assertion here usually means the text moved, not that a rule changed.
 */
function flat(text) {
  return String(text).replace(/\s+/g, ' ');
}

function section(name) {
  // NOTE: no `\Z` in the terminator. In JavaScript `\Z` is NOT an end-of-input anchor —
  // it is an Annex B identity escape matching the literal letter `Z`, and with the `i`
  // flag it matches lowercase `z` too. A terminator of `(?=^##\s|\Z)` therefore stopped at
  // the first `z` in the section: `## Workflow` truncated mid-sentence at
  // "Every motion traces to a user story (zero orphans)", and the Phase 3 gate below it
  // was invisible to the test that claims to check it. Verified in sandbox; use `(?![\s\S])`
  // for end-of-input and `$` for end-of-line.
  const m = src.match(new RegExp(`^##\\s*${name}[^\\n]*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'mi'));
  assert.ok(m, `/motion SKILL.md must have a "## ${name}" section`);
  return m[1];
}

// ---- The Phase 3 gate must be the blocking form, not the self-vacating one ----
//
// Measured before the fix: `motion_spec_check.js check --json` exits 0 when the spec is
// absent, and SKILL.md told the agent to read that exit code. Phase 3 is only reachable
// once motion IS in scope, so absence is the failure the gate exists to catch. The gate
// passed, and printed "motion not in scope" while running inside /motion.

test('the Phase 3 gate passes --require-spec', () => {
  const gate = section('Workflow');
  assert.match(
    gate,
    /motion_spec_check\.js check --require-spec/,
    'without --require-spec the gate returns exit 0 on an absent spec — the defect'
  );
});

test('the SKILL.md warns that omitting --require-spec disables the gate', () => {
  assert.match(
    src,
    /omitting it silently disables the gate|without the flag[\s\S]{0,200}exits?\s*\*?\*?0/i,
    'the flag is load-bearing, so the consequence of dropping it must be written down'
  );
});

test('the lenient default stays reserved for design/develop', () => {
  for (const [label, file] of [
    ['develop', '.agents/skills/develop/steps/step-07-quality-gates.md'],
    ['design', '.agents/skills/design/steps/step-06a-handoff.md'],
  ]) {
    const body = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(body, /motion_spec_check\.js check --json/, `${label} keeps the lenient default`);
    assert.match(
      body,
      /not add|not.*--require-spec/i,
      `${label} must say why it does NOT pass --require-spec, or someone will "fix" it`
    );
  }
});

test('the property check is documented as reading keyframes, not the label', () => {
  assert.match(
    src,
    /keyframes[\s\S]{0,120}not the label|reads the keyframes/i,
    'reading only the declared Property(ies) label let a height-animating spec pass'
  );
});

// ---- Skill-level contracts, stated once, applying to every phase ----

test('Two surfaces is stated once at skill level and covers every phase', () => {
  const s = section('Two surfaces');
  assert.match(s, /document surface/i);
  assert.match(s, /chat surface/i);
  assert.match(s, /every phase|all of them/i,
    'the rule governs all five phases; saying so is what makes it a contract');
});

test('Halt conditions exist and cover the contradictory-evidence case', () => {
  const s = section('Halt conditions');
  for (const [pattern, why] of [
    [/None[\s\S]{0,200}asked for motion|asked for motion/i, 'a `None` call that contradicts the request is a disagreement, not a finding'],
    [/contradict/i, 'a label/artifact contradiction must go back, not be silently resolved'],
    [/reduced-motion[\s\S]{0,300}halt|halt[\s\S]{0,300}reduced-motion/i, 'unavailable reduced-motion is an accessibility defect, not a degraded mode'],
  ]) {
    assert.match(s, pattern, `Halt conditions must cover: ${why}`);
  }
});

test('Done when exists and refuses to complete at Phase 3', () => {
  const s = section('Done when');
  assert.match(s, /does not complete at Phase 3|handoff is the completion boundary/i);
  assert.match(s, /motion-handoff\.md/);
  assert.match(s, /--require-spec/, 'the mechanical gate belongs in the completion contract');
  assert.match(
    s,
    /spec exists but the handoff does not/i,
    'a spec with no handoff is how motion gets silently dropped — name that failure mode'
  );
});

test('Done when distinguishes full from lightweight, including the scope lock', () => {
  const s = section('Done when');
  // Asserted as the track table rather than the old "**`full`:** / **`lightweight`:**" headings,
  // which were replaced when Done-when was restructured so the a11y sign-off became one
  // provenance-keyed cell instead of three label-dependent ones.
  for (const track of ['`lightweight`', '`full`', '`creative`']) {
    assert.ok(s.includes(`| ${track} |`), `the track table must have a row for ${track}`);
  }
  assert.match(s, /evidence consulted and why dedicated research was not warranted/i,
    'the lightweight path must record why Phase 2 was skipped, or the skip is unauditable');
  // `scope-lock` the *command* lives in Phase 1, not in Done-when; what Done-when must carry is
  // the requirement that the track was actually recorded.
  assert.match(s, /scope lock|record exactly one in the scope lock/i,
    'the chosen track must be recorded, or a later audit cannot tell which row applied');
});

// ---- Phase 1 decision must be recordable ----

test('Phase 1 records its scope decision via scope-lock', () => {
  const w = section('Workflow');
  assert.match(
    w,
    /step_tracker\.js scope-lock --skill motion/,
    'Full/Lightweight/None decides whether Phase 2 runs; unrecorded, it cannot be audited'
  );
  assert.match(w, /full\|lightweight\|none/);
});

test('Output artifacts declares full paths so audit can decide ran-untracked', () => {
  const s = section('Output artifacts');
  assert.match(s, /artifacts\/output\/03-strategy\/motion-spec\.md/);
  assert.match(s, /artifacts\/output\/05-planning\/motion-handoff\.md/);
});

// ---- The prerequisite bypass must state its consequence ----

test('the design.md bypass names the token-merge consequence', () => {
  const p = section('Prerequisites');
  assert.match(p, /bypass/i);
  assert.match(
    p,
    /design\.md/,
    'Phase 3 merges tokens into design.md, so bypassing /design leaves nothing to merge into'
  );
});

// ---- Structural sanity: every cited script and template must exist ----

test('every script and template /motion cites exists', () => {
  const cited = new Set();
  const re = /(?:\.agents\/scripts\/[A-Za-z0-9_.-]+\.js|\.agents\/templates\/[A-Za-z0-9_./-]+\.md|\.agents\/references\/motion\/[A-Za-z0-9_.-]+\.md)/g;
  let m;
  while ((m = re.exec(src)) !== null) cited.add(m[0]);
  assert.ok(cited.size >= 6, `expected the skill to cite its scripts and templates, found ${cited.size}`);
  for (const rel of cited) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} is cited by /motion but does not exist`);
  }
});

test('no step files, so SKILL.md is the only surface that can carry the contract', () => {
  // Guards the assumption the tests above rest on: if /motion ever grows steps/ dir, the
  // skill-level contracts must be re-checked for duplication and per-phase drift.
  const stepsDir = path.join(ROOT, '.agents/skills/motion/steps');
  assert.ok(!fs.existsSync(stepsDir), 'this suite assumes /motion ships no step files');
});
// --- Creative track + asset pipeline ---------------------------------------------
// The owner's brief: `/motion` must produce boundary-breaking interactive sites (the GSAP +
// Lenis + Three.js class), and it must generate or source the assets those sites need.
// Measured before this work: the library catalogue listed GSAP/Lenis/Three.js, and a grep
// across all motion references and templates for asset/licence/texture/HDRI/generation
// returned exactly ONE hit — an incidental "motion assets" mention in a tool-description
// table. No asset pipeline existed at all.

test('the creative track is a named scope-lock value, not a synonym for full', () => {
  const w = section('Workflow');
  assert.match(w, /Creative\/experiential/i, 'the track must be selectable at Phase 1');
  assert.match(
    w,
    /scope-lock --skill motion --track "[^"]*creative/,
    'Phase 1 must be able to record it — an unrecorded decision is unauditable'
  );
  assert.match(
    w,
    /most generic output|indistinguishable from every AI-generated site/i,
    'the track must state why it exists, or nobody will pick it over Full'
  );
});

test('Phase 2b forces a thesis and its proving moment before any spec', () => {
  const w = section('Workflow');
  assert.match(w, /Phase 2b: Creative thesis/);
  assert.match(w, /creative-site-playbook\.md/, 'the playbook is the knowledge source');
  assert.match(w, /proving moment/i,
    'a thesis with no proving moment is a mood board — that is the gate');
  assert.match(w, /if Ivy cannot name the proving moment, stop/i,
    'the gate must be a stop, not a suggestion');
});

test('Phase 3b writes an asset manifest and gates it with --require-assets', () => {
  const w = section('Workflow');
  assert.match(w, /Phase 3b: Asset manifest/);
  assert.match(w, /motion-assets\.md/);
  assert.match(w, /motion-assets-template\.md/);
  assert.match(w, /motion_assets_check\.js check --require-assets/,
    'without the flag an absent manifest exits 0 — the same self-vacating gate as Phase 3');
  assert.match(w, /reuse → CSS\/SVG → procedural → stock → generated/i,
    'generation must be the last resort, with the order stated');
});

test('the spec gate documents shader/WebGL prompts as legitimate', () => {
  const w = section('Workflow');
  assert.match(w, /uTime|uProgress|Shader/i,
    'a uniform-driven shader hero is a real prompt and must not be rejected as an orphan');
});

test('Done when names the creative-track obligations, not just the happy path', () => {
  const d = section('Done when');
  for (const [re, why] of [
    [/respectReducedMotion/, 'setting it false re-breaks the accessibility gate'],
    [/lagSmoothing\(0\)/, 'the GSAP/Lenis sync is wrong without it and reads as jitter'],
    [/public `gsap` package|CClub paywall|Club paywall/i, 'GSAP plugins are free now; stale advice costs money'],
    [/motion-assets\.md/, 'the asset manifest is a completion obligation'],
    [/context loss/i, 'a white-screen recovery is a shipped-behaviour requirement'],
    [/proving moment/i, 'the thesis gate must survive into Done when'],
  ]) {
    assert.match(d, re, `Done when must cover: ${why}`);
  }
});

test('asset generation precedes the licence decision, not after it', () => {
  const g = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-asset-generation.md'),
    'utf8'
  );
  const licenceAt = g.search(/## 2\. Licence first/);
  const recipesAt = g.search(/## 3\. The prompt recipes/);
  assert.ok(licenceAt > -1 && recipesAt > -1);
  assert(licenceAt < recipesAt,
    'licence traps must be taught before prompt craft, or the licence check happens after the credits are spent');
  assert.match(g, /free tier ≠ commercial right|free-tier/i);
  assert.match(g, /does not retro-license|retroactive/i,
    'Suno free-tier output stays non-commercial after upgrade — the trap nobody checks');
  assert.match(g, /Udio/, 'Udio cannot export a file at all; it must not be recommended');
});

test('the creative playbook states the stack integrations that are commonly wrong', () => {
  const p = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/creative-site-playbook.md'),
    'utf8'
  );
  assert.match(p, /lagSmoothing\(0\)/, 'the Lenis×GSAP sync needs it');
  assert.match(p, /respectReducedMotion/, 'Lenis honours reduced motion by default — do not disable');
  assert.match(p, /free for commercial use/i, 'GSAP licensing must be current');
  assert.match(p, /WebGPURenderer/, 'the renderer fork is a real 2026 decision');
  assert.match(p, /RenderPipeline/, 'EffectComposer is not the current API under WebGPU');
  assert.match(p, /Budget|≤ 2MB/, 'asset weight is a motion problem and must be budgeted');
});

test('every file the creative track adds is cited by the SKILL.md', () => {
  for (const rel of [
    '.agents/references/motion/creative-site-playbook.md',
    '.agents/references/motion/motion-asset-generation.md',
    '.agents/templates/product/motion-assets-template.md',
    '.agents/scripts/motion_assets_check.js',
  ]) {
    assert.ok(src.includes(rel), `${rel} is added for the creative track but SKILL.md never cites it`);
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} does not exist`);
  }
});

// --- Measured baselines, not invented budgets ---------------------------------------
// I first shipped "hero GLB <=2MB / above-the-fold <=4MB" with no evidence behind either
// number. A crawl of six real showcase sites then showed the 4MB line is violated by two of
// them, including the only site in the set with the full GSAP+Lenis+Three+GLSL stack. These
// tests lock the correction in place so the invented thresholds cannot creep back.

test('the playbook states that its earlier thresholds were invented and replaced', () => {
  const p = flat(fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/creative-site-playbook.md'),
    'utf8'
  ));
  assert.match(
    p,
    /replaces a set of thresholds I wrote earlier|could not defend|asserted, not measured/i,
    'the correction must be visible, or a future reader trusts the numbers again'
  );
  assert.match(p, /lower bound/i, 'the measurement method does not execute JS — say so');
  assert.match(
    p,
    /17\.3 MB|10\.18 MB|10\.2 MB/,
    'the real measured figures must be present, not just the aspiration'
  );
});

test('measured baselines name the lean site, not only the heavy ones', () => {
  const p = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/creative-site-playbook.md'),
    'utf8'
  );
  assert.match(p, /mindmarket/i,
    'the 14-canvas / 0.17 MB site is the actual target; an award-site table of only heavy ' +
    'sites teaches the wrong lesson');
  assert.match(p, /WebP|AVIF/i);
  assert.match(p, /format-capped|HDRI/);
});

test('the accessibility finding is recorded as a differentiator, not a complaint', () => {
  const p = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/creative-site-playbook.md'),
    'utf8'
  );
  assert.match(p, /no award covers|never be satisfied by/i,
    '4 of 6 measured sites ship no reduced-motion handling — the gate has no external ' +
    'pressure behind it, which is exactly why the doc must say so');
  assert.match(p, /232/, 'the 232/143 polarity count is the strongest real-world evidence available');
});

test('custom GLSL is documented as the measured top-tier signal', () => {
  const p = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/creative-site-playbook.md'),
    'utf8'
  );
  assert.match(p, /table stakes/i, 'Lenis+ScrollTrigger is common; shader work is the tier above');
  assert.match(p, /GLSL|shader/);
});

test('the assets template asks for a measured total, not a copied budget', () => {
  const tpl = fs.readFileSync(
    path.join(ROOT, '.agents/templates/product/motion-assets-template.md'),
    'utf8'
  );
  assert.match(tpl, /Measured on this surface|measure/i);
  assert.match(
    tpl,
    /state your own number/i,
    'no universal total exists — 0.17 MB and 17.3 MB are both award sites'
  );
  assert.match(tpl, /WebP\/AVIF/, 'the CRAV PNG trap must survive into the template');
  assert.ok(
    !/above-the-fold total \| ≤ 4MB/i.test(tpl),
    'the invented 4MB threshold must not reappear'
  );
});

test('NO REGRESSION: an invented universal page-weight threshold cannot return', () => {
  // Written because restoring "≤4MB above the fold" passed every other test in this file.
  // The correction is only real if the wrong number is now detectable.
  const p = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/creative-site-playbook.md'),
    'utf8'
  );
  const invented = /above[- ]the[- ]fold total\s*\|\s*\**\s*≤\s*4\s*MB/i;
  assert.ok(
    !invented.test(p),
    'the 4MB above-the-fold threshold was asserted without evidence and is violated by ' +
      'two award sites in the measured set (sentient.foundation 17.3MB video, nudot 10.2MB). ' +
      'It must not come back as a "budget".'
  );
  assert.ok(
    !/hero 3d model\s*\|\s*\**\s*≤\s*2\s*MB/i.test(p),
    'same for the invented 2MB hero-GLB line'
  );
});

// --- Wiring: every reference must know the others exist -------------------------------
// Measured before this block: `motion-implementation-guidelines.md` — the file Rex actually
// loads — had ZERO mention of `creative-site-playbook.md` or `motion-asset-generation.md`. I
// wired two new references into SKILL.md and left the three on-demand references pointing at
// nothing, so the creative track was reachable from the design side and invisible from the
// build and research sides. A reference only the SKILL.md knows about is not on-demand; it is
// unreachable at exactly the moment it is needed.

test('every motion reference points at the other four', () => {
  const refs = [
    'motion-design-guidelines.md',
    'motion-implementation-guidelines.md',
    'motion-research-guide.md',
    'creative-site-playbook.md',
    'motion-asset-generation.md',
  ];
  for (const name of refs) {
    const body = fs.readFileSync(
      path.join(ROOT, '.agents/references/motion', name),
      'utf8'
    );
    // A reference must name at least one sibling, so an agent loading it can route onward.
    const siblings = refs.filter((n) => n !== name && body.includes(n));
    assert.ok(
      siblings.length > 0,
      `${name} names no sibling reference — an agent who loads it gets a dead end`
    );
  }
});

test('Rex is told the two facts he gets wrong without the playbook', () => {
  const body = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-implementation-guidelines.md'),
    'utf8'
  );
  assert.match(body, /respectReducedMotion/, 'Lenis honours reduced motion by default');
  assert.match(body, /no plugin paywall|GreenSock|greensock/i,
    'stale "GSAP plugins are paid" advice costs the owner real money');
  assert.match(body, /Do not duplicate facts|must not drift|is wrong/i,
    'duplicated facts drift; the load-order table must say which file owns what');
});

test('load-order routing must sit at the TOP of each reference, not be buried', () => {
  // A sibling-mention check alone is too weak: it passed even after I deleted the routing
  // table, because the files were still named further down. The property that matters is
  // discoverability at load time — an agent reads the header block and decides what to open.
  // If it has to read 150 lines to find out another file exists, the routing has failed.
  const cases = [
    ['motion-implementation-guidelines.md', 'creative-site-playbook.md'],
    ['motion-implementation-guidelines.md', 'motion-asset-generation.md'],
    ['motion-design-guidelines.md', 'creative-site-playbook.md'],
    ['motion-design-guidelines.md', 'motion-asset-generation.md'],
    ['motion-research-guide.md', 'creative-site-playbook.md'],
    ['motion-research-guide.md', 'motion-asset-generation.md'],
  ];
  for (const [file, target] of cases) {
    const body = fs.readFileSync(path.join(ROOT, '.agents/references/motion', file), 'utf8');
    const head = body.split('\n').slice(0, 30).join('\n');
    assert.ok(
      head.includes(target),
      `${file} mentions ${target} but not in its first 30 lines — an agent deciding what to ` +
        `load will not find it. Routing belongs in the header block.`
    );
  }
});

test('Ivy is told this file is wrong for creative surfaces', () => {
  const body = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-design-guidelines.md'),
    'utf8'
  );
  assert.match(body, /When this file is NOT enough/i);
  assert.match(body, /creative-site-playbook\.md/);
  assert.match(body, /motion-asset-generation\.md/);
  assert.match(
    body,
    /right\*? for product UI and \*?wrong\*?|wrong.?.?for a motion-led site/i,
    'the design guide own rules are deliberately conservative — say that they do not apply, ' +
      'or Ivy follows "one signature motion per screen" straight onto an Awwwards brief'
  );
  assert.match(body, /stays mandatory/i, 'reduced-motion rules must survive the creative track');
});

test('research is told licence-and-tier and measured-weight, not a guess', () => {
  const body = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-research-guide.md'),
    'utf8'
  );
  assert.match(body, /before generation/i, 'licence must be settled before credits are spent');
  assert.match(body, /does not retro-licen|retro-licen/i, 'the Suno trap nobody checks');
  assert.match(body, /Content-Length/, 'report a measurement, not a budget');
  assert.match(body, /0\.17 MB|17\.3 MB/, 'the measured range that makes the point');
});

test('no reference silently contradicts another on GSAP or Lenis', () => {
  // The two facts most likely to drift: GSAP licensing and Lenis reduced-motion default.
  const refs = fs.readdirSync(path.join(ROOT, '.agents/references/motion')).filter((f) => f.endsWith('.md'));
  for (const name of refs) {
    const body = fs.readFileSync(path.join(ROOT, '.agents/references/motion', name), 'utf8');
    assert.ok(
      !/respectReducedMotion:\s*false/.test(body) || /never|do not|not recommended/i.test(body),
      `${name} instructs setting respectReducedMotion false — Lenis defaults to true, and ` +
        `turning it off re-breaks the accessibility gate`
    );
    assert.ok(
      !/requires? (a )?(club|membership|paid)/i.test(body) || /free|outdated|not a paywall|no plugin paywall/i.test(body),
      `${name} claims a GSAP plugin needs Club/membership — all plugins are free for ` +
        `commercial use in the public package`
    );
  }
});

// --- Real-model findings (sandbox/motion-realmodel, n=1) ----------------------------
// Everything below was reported by a real model executing this skill against a real brief,
// then verified by me against the files. Each fix is paired with the trap it closes.

// (a) The documented phase order was 3b-then-3, which is circular.
test('Phase 3b is documented AFTER Phase 3, and says why the reverse is impossible', () => {
  const t = section('Workflow');
  const i3 = t.indexOf('### Phase 3: Motion spec');
  const i3b = t.indexOf('### Phase 3b: Asset manifest');
  assert.ok(i3 > -1 && i3b > -1, 'both phases must exist');
  assert.ok(i3 < i3b, '3b must come after 3 — AS-### ids are allocated in the spec, and the gate cross-checks them');
  assert.match(
    t.slice(i3b, i3b + 900),
    /AFTER Phase 3, never before|circular/i,
    'state WHY, or a future editor reorders them back and the circularity returns silently'
  );
});

// (b) user-stories.md was a hard gate dependency mentioned nowhere.
test('user-stories.md is a named Phase 3 output and an Output artifact', () => {
  const w = section('Workflow');
  const i3 = w.indexOf('### Phase 3: Motion spec');
  assert.match(
    w.slice(i3, i3 + 1400),
    /user-stories\.md/,
    'the spec gate fails without it; the skill never said to produce it'
  );
  const o = section('Output artifacts');
  assert.match(o, /artifacts\/output\/03-strategy\/user-stories\.md/,
    'audit --all reads declared outputs to decide ran-untracked');
});

// (c) the spec template had no Asset: field, though the manifest depends on it.
test('the spec template carries a mandatory Asset: field and a composited-exception line', () => {
  const tpl = fs.readFileSync(
    path.join(ROOT, '.agents/templates/product/motion-spec-template.md'),
    'utf8'
  );
  assert.match(tpl, /^\*\*Asset:\*\*/m,
    'motion-assets-template.md says "MO-### references AS-###", but the MO block had no such field');
  assert.match(tpl, /\*\*Composited exception:\*\*/,
    'the sanctioned escape for stroke-dashoffset etc. — a real-model run had to invent one');
  assert.match(tpl, /Describe nothing|mandatory on every prompt/i);
});

// (d) Phase 5 prose forbade what the playbook recommends; no exception mechanism existed.
test('Phase 5 prose and the sanctioned exception mechanism agree', () => {
  const w = section('Workflow');
  assert.match(
    w,
    /Composited exception/i,
    'stroke-dashoffset/DrawSVG is permitted by the gate and recommended by the playbook, ' +
      'so the skill must offer a declared way to use it rather than leaving agents to pick'
  );
  assert.match(w, /stroke-dashoffset/);
  assert.match(w, /its own QA assertion/,
    'an exception that inherits the composited-only claim is not an exception');
});

// (f) the Phase 1 phase-match check had no defined failure mode.
test('a phase mismatch has defined, sanctioned options and forbids state-fudging', () => {
  const w = section('Workflow');
  const i1 = w.indexOf('### Phase 1: Scope check');
  const block = w.slice(i1, i1 + 4000);
  assert.match(block, /three sanctioned options/i, 'an unsatisfiable check with no "no" case halts every fresh project');
  assert.match(block, /auto-initialises/i,
    '`status` auto-creates a pipeline, so "has no phase yet" was unreachable — say that');
  assert.match(block, /Do not `set-phase` or `advance`/,
    'advancing state to satisfy a precondition is a silent change disguised as a check');
});

// (g) Done when told agents the creative list "adds to either above" — mutually exclusive.
test('Done when presents the three tracks as mutually exclusive', () => {
  const d = section('Done when');
  assert.match(d, /record exactly one in the scope lock/i,
    'the tracks are alternatives selected at Phase 1');
  assert.match(d, /Scope track — record exactly one/i);
  for (const track of ['`lightweight`', '`full`', '`creative`', '`none`']) {
    assert.ok(d.includes(track), `the track table must name ${track}`);
  }
  assert.match(d, /user-stories\.md/,
    'the completion contract must carry the file the gate needs');
  assert.match(d, /execution-plan\.md/, 'Phase 4 assumes a file that may not exist');
});

// (h) Phase 2 pressured a single-session run into fabricating per-agent attribution.
test('Phase 2 has a degraded path that forbids fabricated attribution', () => {
  const w = section('Workflow');
  // Anchored to the next phase, not a fixed character count. An earlier version used a 2000-char
  // window and silently stopped matching once the degraded block grew past it — the same
  // slice-too-small mistake as the truncated-section bug.
  const i2 = w.indexOf('### Phase 2: Motion research');
  const iNext = w.indexOf('### Phase 2b', i2);
  const block = w.slice(i2, iNext > i2 ? iNext : i2 + 4000);
  assert.match(block, /delegation is unavailable/i);
  assert.match(
    block,
    /do not fabricate|state the real attribution/i,
    'the artifact format demands eight per-agent research passes that one session cannot supply'
  );
});

test('Phase 2 gives a degraded COMMAND, not only a degraded rule', () => {
  // Run 2, blind to the gates, ran the documented six-command block verbatim and attributed
  // artifacts it had written to agents that did not write them — because the rule forbidding
  // that sat nine lines above a command block that did it.
  const w = section('Workflow');
  const i2 = w.indexOf('### Phase 2: Motion research');
  const iNext = w.indexOf('### Phase 2b', i2);
  const block = w.slice(i2, iNext > i2 ? iNext : i2 + 4000);
  assert.match(
    block,
    /single-session variant/i,
    'a rule without a command still loses to the command that contradicts it'
  );
  assert.match(
    block,
    /ONLY when @researcher and @ux-researcher actually ran|only when/i,
    'the full-research block must be gated on delegation really having happened'
  );
});

// (i) scope-lock accepted a typo'd track and recorded it as if correct.
test('scope-lock rejects an invalid track for a known skill', () => {
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/step_tracker.js'), 'utf8');
  assert.match(src, /VALID_TRACKS/,
    'the SKILL.md help advertised "full|lightweight|none|creative" and nothing enforced it');
  assert.match(src, /creative/);
  assert.match(
    src,
    /not a valid track|VALID_TRACKS\[/,
    'the rejection must be in cmdScopeLock, not a comment'
  );
});

test('Phase 5 honours the Composited exception that Phase 3 sanctions', () => {
  // Run 2 flagged this: Phase 3 grew a sanctioned exception mechanism while Phase 5's prose
  // still read "Only transform and opacity are animated — no other animated properties",
  // forbidding what the mechanism exists to permit. A checklist an agent must satisfy
  // cannot contradict the mechanism that governs the same artifact.
  const w = section('Workflow');
  const i5 = w.indexOf('### Phase 5:');
  const block = w.slice(i5);
  assert.match(block, /Composited exception/,
    'Phase 5 must reference the Phase 3 exception mechanism, not forbid the properties it allows');
  assert.ok(
    !/Only `transform` and `opacity` are animated \(no layout properties, filters, or other animated properties\)/.test(block),
    'the old absolute wording must not survive alongside the exception'
  );
});

test('Done when has no orphaned or duplicated sub-heading', () => {
  // My own patch left "**`full`:**" immediately followed by "**`full` — research delegated:**".
  const d = section('Done when');
  const heads = [...d.matchAll(/^\*\*`?(full|lightweight|creative)`?[^*]*\*\*:/gm)].map((m) => m[0]);
  const norm = heads.map((h) => h.replace(/—.*$/, '').trim());
  assert.equal(new Set(norm).size, norm.length, `duplicated Done-when branch headings: ${JSON.stringify(heads)}`);
});

test('research mode is stated once in Phase 3, not as two overlapping rules', () => {
  const w = section('Workflow');
  const i3 = w.indexOf('### Phase 3: Motion spec');
  const i3b = w.indexOf('### Phase 3b');
  const block = w.slice(i3, i3b > i3 ? i3b : i3 + 6000);
  const mentions = (block.match(/Evidence mode:/g) || []).length;
  assert.ok(mentions <= 3, `Evidence mode is discussed ${mentions} times in Phase 3; consolidate`);
  assert.match(block, /Research provenance/,
    'extent and provenance are two fields, not one — the conflation is what punished honesty');
  assert.match(block, /both gate-enforced/i);
  for (const mode of ['full', 'partial', 'lightweight']) {
    assert.match(block, new RegExp(`\\b${mode}\\b`), `evidence modes must all be named: ${mode}`);
  }
  for (const prov of ['delegated', 'single-session']) {
    assert.match(block, new RegExp(prov), `provenance values must both be named: ${prov}`);
  }
});

// --- Run 4 (blind, B2B marine brief, died on a rate limit after Phase 3b) -----------------
// The agent rejected all five expressive theses as wrong for an investor/technical audience and
// had to translate the thesis into a register the catalogue did not contain. It logged the gap
// itself. These tests lock the fix in: the skill must not be consumer-only.

test('the thesis step names two registers, and credibility is first-class', () => {
  const w = section('Workflow');
  const i2b = w.indexOf('### Phase 2b');
  const i3 = w.indexOf('### Phase 3:', i2b);
  const block = w.slice(i2b, i3 > i2b ? i3 : i2b + 4000);
  assert.match(block, /Expressive/i, 'the register that already existed');
  assert.match(block, /Credibility/, 'the register a B2B/investor/technical brief needs');
  assert.match(
    block,
    /first-class answer, not a fallback/i,
    'or a technical brief reads the credibility route as a failure to have a thesis'
  );
  assert.match(block, /B2B|investor|technical/i);
});

test('the falsifiability test is stated as the shared mechanism across registers', () => {
  const w = section('Workflow');
  assert.match(
    w,
    /could a\s+skeptical reader falsify it/i,
    'the mechanism that transfers between registers is falsifiability, not the feeling'
  );
});

test('the playbook carries credibility theses, not only expressive ones', () => {
  const p = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/creative-site-playbook.md'),
    'utf8'
  );
  assert.match(p, /### Credibility theses/, 'the catalogue must contain the second register');
  assert.match(p, /Measurement made live/, 'a worked theses row, not just a heading');
  assert.match(p, /client-data/);
  assert.match(
    p,
    /register swap|same slot, same mechanism/i,
    'the worked example is what shows the swap is legitimate rather than a workaround'
  );
});

test('client-data is a valid asset route, ahead of reuse', () => {
  const src = fs.readFileSync(path.join(ROOT, '.agents/scripts/motion_assets_check.js'), 'utf8');
  assert.match(src, /clientdata/, 'the enum stores normalised values — a hyphenated entry never matches');
  assert.match(src, /client-data/, 'and the comment must name it as authors write it');
});

test('the route ladder puts the client own material first', () => {
  const g = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-asset-generation.md'),
    'utf8'
  );
  const clientAt = g.indexOf("client's own material");
  const genAt = g.indexOf('Only then generate');
  assert.ok(clientAt > -1 && genAt > -1);
  assert.ok(clientAt < genAt, 'generation must remain last; client material must precede reuse');
});

// --- Round 4 (blind, B2B marine brief) — the skill TOLERATED credibility but did not EQUIP ---
// The credibility register existed and was chosen, with no invented mechanism. What failed was
// everything underneath it: an agent had to override four named rules (stagger, follow-through,
// spring token, cinematic zone) and record each override, because no rule said which wins.

test('every file that states a route order states the SAME six-rung order', () => {
  // Round 4 found three files with a five-rung order against SKILL.md's six — including the
  // reference's OWN §4 contract block, which is the block agents copy per asset. An agent
  // copying §4 verbatim had no legal slot for the client's own station table.
  const ORDER_ARROW = /client-data → reuse → CSS\/SVG → procedural → stock → generated/;
  const files = [
    '.agents/skills/motion/SKILL.md',
    '.agents/references/motion/motion-asset-generation.md',
    '.agents/references/motion/motion-design-guidelines.md',
  ];
  for (const f of files) {
    const body = flat(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    const mentionsLadder = /route order|Route order is fixed/i.test(body);
    if (!mentionsLadder) continue;
    assert.match(body, ORDER_ARROW, `${f} states a route order that omits client-data`);
  }
  // And no file may carry the superseded five-rung form as a live instruction.
  for (const f of [...files, '.agents/templates/product/motion-assets-template.md']) {
    const body = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(
      !/\*\*Route:\*\*\s*reuse \| css \| procedural/.test(body),
      `${f} still offers a Route enum without client-data — an agent copying it has no slot for the client's own material`
    );
  }
});

test('choreography rules are conditional on register, with a decline mechanism', () => {
  const g = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-design-guidelines.md'),
    'utf8'
  );
  const i = g.indexOf('## 4. Choreography & Staging');
  const block = flat(g.slice(i, i + 2600));
  assert.match(block, /conditional on the register|not universal/i,
    'round 4 found a 30-80ms stagger makes a credibility thesis false, with no way to decline it');
  assert.match(block, /Choreography override/,
    'declining needs a named, recorded mechanism — not silent non-compliance');
  assert.match(block, /thesis wins|thesis.*precedence/i,
    'something must win when the choreography rules and the falsification test conflict');
});

test('motion tokens are defaults, and may be omitted with a stated reason', () => {
  const tpl = flat(fs.readFileSync(
    path.join(ROOT, '.agents/templates/product/motion-spec-template.md'),
    'utf8'
  ));
  assert.match(tpl, /Every token below is a default, not a deliverable/i);
  assert.match(tpl, /omit any token/i,
    'round 4 deleted --ease-spring and --dur-epic and had to justify it in-file');
});

test('reduced-motion phrasings the gate rejects are documented', () => {
  // Round 4 lost two gate iterations: it wrote "cross-fades from opacity 0 to 1", which the prose
  // in motion-design-guidelines §6 permits and the mechanical gate rejects. An agent forbidden
  // from reading the gate cannot discover this except by failing.
  const w = flat(section('Workflow'));
  assert.match(w, /reduced-motion phrasings the gate accepts/i);
  assert.match(w, /not an endpoint|duration-bearing transition/i);
});

test('the expressive-only signals say so where they are stated', () => {
  const g = flat(fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-design-guidelines.md'),
    'utf8'
  ));
  assert.match(g, /Register warning/i, '§9 is consumer-expressive inventory and must be labelled');

  const p = fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/creative-site-playbook.md'),
    'utf8'
  );
  assert.match(
    p,
    /expressive\*? register/i,
    '§6.3 shader-as-tier-signal only holds in one register, and the measurement inverts'
  );

  const r = flat(fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-research-guide.md'),
    'utf8'
  ));
  assert.match(r, /not universal findings|hypotheses to check/i,
    '"faster feels faster" is not the finding for every surface — round 4 measured the inverse');
  assert.match(r, /Source: unverified. is a valid finding/);
});

test('the signature-moment rule is per page, not per screen', () => {
  const g = flat(fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-design-guidelines.md'),
    'utf8'
  ));
  assert.ok(
    !/each screen should have ONE signature motion moment/i.test(g),
    'per-screen framing authorises one signature moment per section — three sections, three moments'
  );
  assert.match(g, /page gets ONE signature motion moment|per \*page\*/i);
});

// --- Runs 6 & 7 (blind, clinical holdout + supplied-data marine) -------------------------
// Both reports converged on one shape: the contract has holes exactly where a credibility
// surface operates. Run 6 called it "tolerates but does not equip"; run 7 found the two routes
// such a surface must use (`client-data`, `procedural`) had no Source form and no enforcement.

test('credibility-register surfaces are routable without calling the page a creative site', () => {
  const w = section('Workflow');
  const i1 = w.indexOf('### Phase 1: Scope check');
  const block = flat(w.slice(i1, i1 + 4000));
  assert.match(block, /scientific|clinical|regulated/i,
    'the credibility register names these audiences; Phase 1 must be able to route to it');
  assert.match(
    block,
    /routing defect, not a stretch/i,
    'a blind run had to lock `creative` while stating its own page was `lightweight` by the ' +
      'written definition — that is a routing defect, and saying so prevents the next agent ' +
      'rationalising it as a reasonable stretch'
  );
});

test('the manifest scope is inclusion-by-animation, not exclusion-by-repo', () => {
  const g = flat(fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-asset-generation.md'), 'utf8'));
  assert.match(g, /anything an `MO-###` animates/i,
    'run 7: "not already in the repo" contradicts route 0 and produced an empty manifest on a ' +
      'brief whose whole point was supplied data');
  assert.ok(!/animates that is not already in the repo/i.test(g));
  assert.match(g, /Source. question, not an inclusion question/i);
});

test('every route a credibility surface uses has a Source form and enforcement', () => {
  const tpl = flat(fs.readFileSync(
    path.join(ROOT, '.agents/templates/product/motion-assets-template.md'), 'utf8'));
  assert.match(tpl, /procedural/, 'run 7: the template offered tool+model / stock URL / repo: path — none for procedural');
  assert.match(tpl, /client-data/);

  const src = flat(fs.readFileSync(
    path.join(ROOT, '.agents/scripts/motion_assets_check.js'), 'utf8'));
  assert.match(src, /needs a Source a reviewer can open/i,
    'Source was enforced only for `generated`; client-data and procedural accepted prose');
  assert.match(src, /derived\|computed\|generated\|built\|calculated/i,
    'a procedural source names its deterministic input — "derived at build from AS-001" is one');
});

test('DrawSVG is register-qualified, not shipped against the falsifiability test', () => {
  const p = flat(fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/creative-site-playbook.md'), 'utf8'));
  assert.match(p, /half the true extent|half the true/,
    'run 6: DrawSVG displays half a confidence interval at t=50% — a false statistic wearing craft');
  assert.match(p, /no interpolated figures/i);
  assert.match(p, /Register qualifier/i);
});

test('the library-exclusion escape covers more than the 3D layer', () => {
  const d = flat(section('Done when'));
  assert.match(d, /Library exclusions/i,
    'run 7 declined Lenis and found no sanctioned wording; only the one-RAF-loop rule is absolute');
  assert.match(d, /second RAF loop/i);
});

test('§9 no longer tells you to build effects right after saying not to', () => {
  const g = flat(fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-design-guidelines.md'), 'utf8'));
  assert.ok(
    !/leverage this framework taxonomy to select the right execution engine/i.test(g),
    'run 6: that sentence cancelled the register warning three lines above it'
  );
  assert.match(g, /does not tell you \*whether that effect belongs/i);
});

test('the research guide leads with hypotheses, not borrowed findings', () => {
  const r = flat(fs.readFileSync(
    path.join(ROOT, '.agents/references/motion/motion-research-guide.md'), 'utf8'));
  assert.match(r, /hypotheses? to check, not answers/i);
  assert.match(r, /moderate\W+ beats fast beats none/i,
    'run 7 inverted the textbook answer for incidental waits');
});
