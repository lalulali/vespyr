#!/usr/bin/env node
/**
 * motion_spec_check.js — Real-artifact validator for motion-spec.md.
 *
 * WHY THIS EXISTS
 * A standalone /motion test harness once existed (test-motion.mjs, 73 checks) but
 * it SIMULATED the pipeline: it re-implemented validateMotionPrompt /
 * traceability in JS and ran them against fixtures it wrote itself. It proved
 * the skill's logic was internally consistent and the docs carried the right
 * strings — it did NOT parse a real project's motion-spec.md. So a real spec
 * with an incomplete MO-### prompt (missing reduced-motion fallback, an animated
 * layout property, an orphan prompt) was caught only by the LLM reading the prose
 * gate — the same soft mechanism that let /design ship generic output. That
 * harness was removed in 02s (dead weight once this script existed, and an
 * unreferenced second test convention); its logic lives here now. This
 * script ports that tested logic onto the real markdown artifact and
 * exits 1 when the spec is incomplete, so the /motion Phase 3 gate and /develop
 * step-07 motion QA gate have a mechanical enforcer.
 *
 * SCOPE (deliberate): the deterministically checkable per-prompt contract from
 * the motion-spec template + bidirectional MO-###↔US-### traceability. It cannot
 * judge whether the motion is *tasteful* — only whether each prompt is fully and
 * legally specified. Structure/completeness, not aesthetics.
 *
 * ABSENCE IS CONTEXT-DEPENDENT — read before trusting exit 0.
 * By default a missing motion-spec.md is a SKIP (exit 0): correct for /design
 * step-06a and /develop step-07, where motion may legitimately be out of scope.
 *
 * It is NOT correct for the /motion Phase 3 gate. /motion is only ever entered when
 * motion IS in scope, so an absent spec there is the failure the gate exists to
 * catch. Measured: run verbatim from the SKILL.md on a repo with no motion spec, the
 * gate returned exit 0 with `"reason": "motion-spec.md not present (motion not in
 * scope)"` — the gate passed, and its reason string asserted the opposite of the
 * fact. A gate that passes in the one state it must fail is worse than no gate,
 * because it is read as evidence.
 *
 * `--require-spec` makes absence a FAILURE. /motion Phase 3 must pass it.
 *
 * Usage:
 *   node .agents/scripts/motion_spec_check.js check \
 *     [--motion-spec <path>] [--user-stories <path>] [--root <dir>] \
 *     [--require-spec] [--json]
 *
 * Exit 0 = conformant. Exit 1 = incomplete/orphaned (listed). Exit 2 = usage/IO error.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  motionSpec: 'artifacts/output/03-strategy/motion-spec.md',
  userStories: 'artifacts/output/03-strategy/user-stories.md',
};

// Properties that force layout, paint, or a filter pass instead of staying on the
// compositor — the 60fps defect the spec exists to prevent. Checked against BOTH the
// declared `Property(ies)` label and the real keyframe text.
//
// A denylist, not an allowlist: the template's keyframe field is free-form pose prose,
// so enumerating permitted properties would misfire on legitimate wording
// (`translateY(...)`, `scale(...)`, `cubic-bezier(...)`). Missing a banned word is the
// safe failure direction; inventing a banned one is caught by the clean-spec test.
const BANNED_PROPERTIES = [
  'filter', 'width', 'height', 'top', 'left', 'right', 'bottom',
  'margin', 'padding', 'box-shadow', 'background', 'border-radius',
];

// Required per-prompt fields, keyed by the bold label used in the template.
// (Carried over from the removed test-motion.mjs harness, mapped to markdown labels.)
const REQUIRED_FIELDS = [
  'Trigger',
  'Target',
  'Property(ies)',
  'From → To (keyframes)',
  'Duration',
  'Easing',
  'Reduced-motion fallback',
  'Keyboard/focus behavior',
  'Informational fallback',
  'Autoplay control',
  'Timing tolerance',
  'Performance note',
  'SSR/hydration note',
  'Acceptance check',
  'Associated stories',
];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--require-spec') args.requireSpec = true;
    else if (a === '--motion-spec') args.motionSpec = argv[++i];
    else if (a === '--user-stories') args.userStories = argv[++i];
    else if (a === '--root') args.root = argv[++i];
    else args._.push(a);
  }
  return args;
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

// Split the spec into MO-### prompt blocks. A block runs from a
// "### Motion Prompt: MO-###" heading to the next "###"/"##" heading.
function extractPromptBlocks(text) {
  const blocks = [];
  const re = /^#{2,4}\s+Motion Prompt:\s*(MO-\d{2,})\b[^\n]*$/gim;
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    matches.push({ id: m[1], start: m.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].start;
    // End at the next prompt heading, or the next section heading, or EOF.
    const afterHeading = text.indexOf('\n', start) + 1;
    const rest = text.slice(afterHeading);
    const nextHeading = rest.search(/^#{2,4}\s+\S/m);
    const end = nextHeading === -1 ? text.length : afterHeading + nextHeading;
    blocks.push({ id: matches[i].id, body: text.slice(start, end) });
  }
  return blocks;
}

// Read a **Label:** value from a prompt block. Returns '' when absent/empty.
// The template uses both inline (`**Duration:** 400ms`) and block
// (`**From → To (keyframes):**\n- 0%: ...`) forms — accept either.
function fieldValue(body, label) {
  // Escape regex metacharacters in the label (it contains → ( ) / etc.).
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Inline: **Label:** value on the same line (horizontal whitespace only —
  // \s would consume the newline and bleed into the next field).
  const inline = new RegExp(`\\*\\*${esc}:?\\*\\*[ \\t]*([^\\n]*)`, 'i');
  const mi = body.match(inline);
  if (!mi) return null; // label absent entirely
  let val = (mi[1] || '').trim();
  if (val.length > 0 && !/^\{[^}]*\}$/.test(val)) return val;
  // Block form: value(s) live on following lines until the next **label** or blank-gap.
  const afterLabel = body.slice(body.indexOf(mi[0]) + mi[0].length);
  const lines = afterLabel.split('\n').slice(1);
  const collected = [];
  for (const line of lines) {
    // Break on the next field label, tolerating a leading list bullet: the real template writes
    // `- **Duration:** …`. A break that required `**` at column zero never fired, so the block
    // absorbed every following field label and the keyframe-property extractor reported
    // "Duration, Easing, Fallback, Behavior…" as animated properties.
    if (/^\s*(?:[-*+]\s+)?\*\*[^*]+\*\*/.test(line)) break;
    if (/^\s*(?:[-*+]\s+)?#{2,4}\s/.test(line)) break;
    if (line.trim().length > 0) collected.push(line.trim());
  }
  const blockVal = collected.join(' ').replace(/\s+/g, ' ').trim();
  if (blockVal.length > 0 && !/^\{[^}]*\}$/.test(blockVal)) return blockVal;
  return ''; // present but empty/placeholder
}

// Validate one prompt block. Returns array of failure strings.
function validatePromptBlock({ id, body }) {
  const failures = [];
  for (const label of REQUIRED_FIELDS) {
    const v = fieldValue(body, label);
    if (v === null) {
      failures.push(`${id}: missing field "${label}"`);
    } else if (v === '') {
      failures.push(`${id}: field "${label}" is empty or a {placeholder}`);
    }
  }

  // Property contract: only transform/opacity may be animated.
  //
  // TWO SOURCES, and the keyframes are the authoritative one. Reading only the declared
  // `Property(ies)` label was measured letting a spec through that declared `transform`
  // while its actual keyframes animated `height` and `box-shadow` — precisely the
  // layout-thrash and 60fps defect this check exists to catch. A label is a claim; the
  // keyframes are the artifact. Both are now checked, and a disagreement between them is
  // itself a failure.
  const props = fieldValue(body, 'Property(ies)');
  const declared = (props || '').toLowerCase();
  if (props && props.length > 0) {
    // Reject any animated property that is not transform/opacity.
    const hit = BANNED_PROPERTIES.find((p) => new RegExp(`\\b${p}\\b`).test(declared));
    if (hit) {
      failures.push(`${id}: animates a non-composited property ("${hit}") — only transform and opacity are permitted.`);
    }
  }

  // Read the real keyframes. The template's block form is deliberately FREE-FORM pose
  // text, not a `prop: value` table:
  //   **From → To (keyframes):**
  //   - 0%: opacity 0, translateY(8px)
  //   - 100%: opacity 1, translateY(0)
  // so both `prop: value` and bare `prop value` appear in real specs. Strip the leading
  // `<pct>%:` offset, then look for banned CSS property identifiers as standalone words.
  const kf = fieldValue(body, 'From → To (keyframes)');
  if (kf && kf.length > 0) {
    const offenders = new Set();
    // Split on newlines, `;`, and `,` so each clause is examined separately.
    for (const raw of kf.split(/[\n;,]+/)) {
      // Drop the keyframe offset (`- 0%: ` / `100%: `).
      const clause = raw.replace(/^\s*-?\s*\d+(\.\d+)?%\s*:?\s*/, '');
      // Ignore anything inside a function call — rgba(...), translateY(...), var(...).
      // Those are values; a banned word inside them is part of an allowed property.
      const withoutFns = clause.replace(/\w+\([^)]*\)/g, ' ');
      for (const prop of BANNED_PROPERTIES) {
        if (new RegExp(`(^|[^\\w-])${prop}([^\\w-]|$)`, 'i').test(withoutFns)) {
          offenders.add(prop);
        }
      }
    }
    if (offenders.size > 0) {
      const list = [...offenders];
      failures.push(
        `${id}: keyframes animate non-composited propert${list.length > 1 ? 'ies' : 'y'} ` +
        `(${list.join(', ')}) — only transform and opacity are permitted, whatever ` +
        `the "Property(ies)" label claims.`
      );
    }
    // A declared label that contradicts the keyframes is an inconsistency, not a
    // style preference — one of the two is wrong and the implementer cannot tell which.
    if (declared) {
      const declaredClean = declared.replace(/[^a-z]/g, '');
      const claimsCompositedOnly =
        /\btransform\b|\bopacity\b/.test(declared) &&
        !BANNED_PROPERTIES.some((p) => new RegExp(`\\b${p}\\b`).test(declared));
      if (claimsCompositedOnly && offenders.size > 0) {
        failures.push(
          `${id}: "Property(ies)" declares composited-only (${declaredClean}) but the keyframes ` +
          `animate ${[...offenders].join(', ')} — the declaration and the artifact disagree.`
        );
      }
    }
  }

  // Reduced-motion fallback must describe a non-vestibularar outcome.
  //
  // This was a closed three-word vocabulary string-matched against the whole field, which meant
  // a MORE precise sentence was rejected. Measured: "the loop never starts. Not slowed, not
  // shortened — absent." is strictly better than "instant" — it says the loop is not created —
  // and the gate refused it, so an agent had to downgrade a correct answer to pass.
  //
  // The rule being enforced is "no vestibular trigger under reduced motion", not "use one of
  // three words". So the vocabulary is opened to the semantic family of *absence*: an instant
  // state change, a cross-fade, or the motion simply not existing. Sliding, parallax, spinning,
  // auto-playing, and continuous motion remain rejected, because those are the triggers.
  const rmf = fieldValue(body, 'Reduced-motion fallback');
  if (rmf && rmf.length > 0) {
    // DURATION BOUND. The skill mandates a cross-fade of <=200ms; nothing enforced that, so a
    // blind run substituted "a gentle 900ms fade that is still running" into its own passing
    // spec and got exit 0. A slow transition is still vestibular motion wearing a fade's name.
    const ms = [...rmf.matchAll(/(\d{2,5})\s*ms/gi)].map((m) => Number(m[1]));
    const secs = [...rmf.matchAll(/(\d+(?:\.\d+)?)\s*s\b/gi)].map((m) => Number(m[1]) * 1000);
    const durations = [...ms, ...secs].filter((n) => Number.isFinite(n) && n > 0);
    // Stemmed, for the same reason the negation verbs are: `\bfade\b` does not match "fades", so
    // "opacity fades gently over 400ms" escaped the 200ms bound entirely while "fade 400ms" was
    // caught. A duration bound that a synonym evades is not a bound.
    const FADE = /\b(?:cross-?fad\w*|fad\w*|transition\w*|opacity\s+(?:chang|fad)\w*)\b/i;
    const slowFade = FADE.test(rmf) && durations.some((d) => d > 200);
    if (slowFade) {
      failures.push(
        `${id}: reduced-motion fallback specifies a transition longer than 200ms ` +
          `(${[...durations].join(', ')}ms) — "cross-fade 900ms" is not a cross-fade, it is a slow ` +
          `transition. State the endpoint and keep any fade <=200ms.`
      );
    }

    // STILL RUNNING. A duration alone is not the tell; the tell is describing the motion as
    // continuing. This fires even with no vestibular keyword, which is why the earlier
    // keyword-only check let "a gentle 900ms fade that is still running" through.
    const STILL_RUNNING =
      /\b(still\s+(running|going|animating|moving|playing|crolling|spinning)|continues?\b|keeps?\s+(going|running|moving|playing)|does\s+not\s+stop|never\s+stops?)\b/i;
    if (STILL_RUNNING.test(rmf)) {
      failures.push(
        `${id}: reduced-motion fallback describes the motion as still running ("${rmf.slice(0, 70)}") — ` +
          `under reduced motion the motion must not run. State the endpoint it settles at, or that ` +
          `it is never created.`
      );
    }
    // Matched as STEMS, not an enumerated list of inflections.
    //
    // The first version enumerated past participles — `created|started|run|ran|played|…` — and so
    // rejected `the loop never starts`, which the SKILL.md documents as ACCEPTED and which is the
    // most precise answer available. The list had `started` and not `starts`. Enumerating inflections
    // of a verb is the same defect as enumerating the vocabulary of a concept: there is always another
    // form, and the missing form rejects honest work. (Blind run 12, F3, both directions.)
    const benign =
      /\b(fade|cross-?fade|opacity|transparent|instant|immediate|absent|removed|omitted|disabled|static|snap|end\s+state)\b/i.test(rmf) ||
      /\b(?:no|not|never|without|isn't|aren't|won't)\b[^.;]{0,30}?\b(?:motion|animation|transition|loop|drift|scroll|marquee|auto-?play|spin|orbit)\b/i.test(rmf) ||
      /\b(?:never|not|no|without)\s+(?:\w+\s+){0,2}?(?:creat|start|run|play|animat|show|render|execut|perform|appl|scroll|exist|begin|beg|appear|mov|happen|occur)\w*\b/i.test(rmf) ||
      /\bdoes\s+not\s+(?:\w+\s+){0,2}?(?:run|start|play|animat|exist|scroll|render|appear|mov|happen|occur)\w*\b/i.test(rmf) ||
      /\bstays?\s+(?:put|still|fixed|in\s+place|static)\b/i.test(rmf);

    // A vestibular word is only a problem when it is NOT negated. "the loop never starts"
    // mentions `loop` and is the most precise possible answer; "the loop stops at 20% opacity"
    // is motion being described more gently, which is the actual defect.
    //
    // Evaluated per clause so a sentence can disable one thing and describe another, and only
    // the undescribed thing is flagged.
    const clauses = rmf.split(/[;.]|\bbut\b|\bwhile\b|\band\b/i).map((s) => s.trim()).filter(Boolean);
    const NEG = /\b(no|not|never|without|disabled|removed|absent|stops?|stopped|halts?|halted|cancelled?|canceled|skipped?|omitted|suppressed?)\b/i;
    const VEST = /\b(slide|sliding|parallax|spin|spinning|rotate|rotating|scroll-?scrub|scrub|scrubbed|autoplay|auto-play|loop|looping|continuous|continues|drift|drifting|orbit|bounce|elastic|marquee|zoom|fly|swipe|flip)\b/i;
    const unnegated = clauses.filter((c) => VEST.test(c) && !NEG.test(c));

    if (!benign) {
      failures.push(
        `${id}: reduced-motion fallback must describe a non-vestibular outcome — a cross-fade, ` +
          `an instant state change, or the motion simply not existing (got: "${rmf.slice(0, 60)}..."). ` +
          `Saying "the loop never starts" is accepted; saying "the loop stops" is not.`
      );
    } else if (unnegated.length > 0) {
      failures.push(
        `${id}: reduced-motion fallback still describes motion as running: "${unnegated[0].slice(0, 50)}" — ` +
          `under reduced motion the motion must not run, not be described as running more gently.`
      );
    }
  }

  // Timing tolerance must be numeric.
  const tol = fieldValue(body, 'Timing tolerance');
  if (tol && tol.length > 0 && !/\d/.test(tol)) {
    failures.push(`${id}: timing tolerance must be numeric (e.g. ±16ms), got "${tol}".`);
  }

  return failures;
}

function checkMotionSpec(specText, userStoriesText) {
  const failures = [];

  // Reduced-motion plan is mandatory (non-skippable per SKILL.md anti-patterns).
  if (!/##\s+Reduced-motion plan/i.test(specText)) {
    failures.push('motion-spec.md: missing the mandatory "## Reduced-motion plan" section.');
  }

  const blocks = extractPromptBlocks(specText);
  if (blocks.length === 0) {
    failures.push('motion-spec.md: no "### Motion Prompt: MO-###" blocks found — the spec defines no motion prompts.');
    return failures;
  }

  for (const block of blocks) {
    failures.push(...validatePromptBlock(block));
  }

  // Bidirectional traceability (ported from the removed test-motion.mjs harness).
  const specStoryRefs = new Set();
  const orphanPrompts = [];
  for (const block of blocks) {
    const refs = block.body.match(/US-\d{2,}/g) || [];
    if (refs.length === 0) orphanPrompts.push(block.id);
    refs.forEach((r) => specStoryRefs.add(r));
  }
  if (orphanPrompts.length > 0) {
    failures.push(
      `Traceability: ${orphanPrompts.length} motion prompt(s) (${orphanPrompts.join(', ')}) reference no user story (spec-side orphan).`
    );
  }

  // If user-stories.md is available, verify each MO-### id is referenced there
  // (motion must become an engineering contract, not just a spec artifact).
  if (userStoriesText) {
    const unreferenced = blocks
      .map((b) => b.id)
      .filter((id) => !new RegExp(`\\b${id}\\b`).test(userStoriesText));
    if (unreferenced.length > 0) {
      failures.push(
        `Traceability: ${unreferenced.length} motion prompt(s) (${unreferenced.join(', ')}) are not referenced in user-stories.md — spec'd but never traced to an acceptance criterion.`
      );
    }
  }

  // Hoisted: both checks below read these, and declaring them at the point of first *use*
// produced a temporal-dead-zone crash when the second check was inserted above the first.
const STDLIB = /^(transform|opacity|transform-origin|transform-style)$/i;
const SHADER_UNIFORM = /^u[A-Z]/;

// Split a Property(ies) field into single-identifier clauses.
// Only identifiers count. A real spec wrote
  // "`uScrollProgress`, `uDensity` (canvas uniforms — this is a canvas layer, not a …)" across
  // two lines, and a looser split produced the "property" `not a` out of the surrounding prose.
function propertyTokens(props) {
  return props
    .split(/[,;/]|\band\b/i)
    .map((s) => s.trim().replace(/^["'`(]+|["'`).]+$/g, '').trim())
    .filter((s) => /^[a-zA-Z][a-zA-Z0-9-]*$/.test(s));
}

// A prompt may not claim composited-only while its keyframes animate something else.
// The banned-property contradiction check below only fires on BANNED words, so a run that
// relabelled `stroke-dashoffset` (exception-permitted) as `transform, opacity` and left the
// keyframes alone passed both gates — a mislabelled prompt shipping as verified.
  for (const b of blocks) {
    const declaredRaw = fieldValue(b.body, 'Property(ies)');
    const kf = fieldValue(b.body, 'From → To (keyframes)');
    if (!declaredRaw || !kf) continue;
    const declaredTokens = propertyTokens(declaredRaw);
    if (!declaredTokens.length) continue;
    const claimsStdlibOnly = declaredTokens.every((p) => STDLIB.test(p) || SHADER_UNIFORM.test(p));
    if (!claimsStdlibOnly) continue; // an honest exception label; nothing to contradict

    // What properties do the keyframes actually animate?
    const animated = new Set();
    for (const raw of kf.split(/[\n;,]+/)) {
      // Strip the keyframe offset and quoting first. Specs write this as
      // `` `stroke-dashoffset: 220` `` — a backtick before the property name, so a boundary
      // that required whitespace or line-start never matched and the property went unseen.
      const clause = raw.replace(/^\s*-?\s*\d+(\.\d+)?%\s*:?\s*/, '').replace(/[`'"]/g, '');
      for (const part of clause.replace(/\w+\([^)]*\)/g, ' ').split(/\s+/)) {
        const id = part.replace(/[^A-Za-z-]/g, '');
        // An identifier immediately followed by ':' is a property; a value is not.
        // Boundary is "not alphanumeric", so backticks and brackets are fine.
        if (/^[a-zA-Z][a-zA-Z-]*$/.test(id) && new RegExp(`(^|[^A-Za-z0-9-])${id}\\s*:`).test(clause)) {
          animated.add(id);
        }
      }
    }
    const mismatch = [...animated].filter((p) => !STDLIB.test(p) && !SHADER_UNIFORM.test(p));
    if (mismatch.length) {
      failures.push(
        `${b.id}: declares Property(ies) "${declaredTokens.join(', ')}" but the keyframes animate ` +
          `${mismatch.join(', ')} — a composited-only claim the artifact does not support. If that ` +
          `property is genuinely exception-permitted, declare it and add a "Composited exception:" line.`
      );
    }
  }

  // A prompt whose Property(ies) names something outside {transform, opacity} needs the
  // sanctioned `Composited exception:` line. Without this the mechanism was documentation only:
  // a blind run deleted the line from a stroke-dashoffset prompt and both gates exited 0.
  //
  // Shader uniforms (uTime, uProgress, ...) are exempt — they are not CSS properties at all, and
  // the playbook treats them as first-class. So the test is: is this a CSS/SVG property that is
  // neither transform nor opacity? If yes, an exception line must exist and say why.
  for (const b of blocks) {
    const props = fieldValue(b.body, 'Property(ies)');
    if (!props || props.length === 0) continue;
    const tokens = propertyTokens(props);
    const needsException = tokens.filter((p) => !STDLIB.test(p) && !SHADER_UNIFORM.test(p));
    if (needsException.length === 0) continue;
    const exception = fieldValue(b.body, 'Composited exception');
    if (!exception || exception.length === 0) {
      failures.push(
        `${b.id}: animates ${needsException.join(', ')}, which is neither transform nor opacity — ` +
          `add a "Composited exception:" line stating why it is not layout-triggering. Without it ` +
          `the property is undocumented and QA inherits a false composited-only claim.`
      );
    }
  }

  return failures;
}

// TWO ENUMS, because the old single field conflated two orthogonal axes and punished honesty.
//
//   Evidence mode:      full | partial | lightweight   — HOW MUCH research happened
//   Research provenance: delegated | single-session     — WHO produced it
//
// The old vocabulary was `full | lightweight | degraded`, and Done-when waived the
// `@ux-researcher` accessibility sign-off whenever the label was `degraded`. Measured by a blind
// run: with 3 of 5 track artifacts landed and @ux-researcher having genuinely signed off, the
// only honest-ish label was `degraded`, which WAIVED a sign-off that had actually been earned.
// The taxonomy made under-claiming cheaper than accuracy.
//
// The split removes the perverse incentive rather than discouraging it: the sign-off requirement
// now keys on PROVENANCE (was there a @ux-researcher to sign off?), never on the extent label.
//
// Both live in the Overview, not in a prompt block, so they are read from the whole spec and
// checked only under --require-spec, where Phase 3's completion claim applies.
const EVIDENCE_MODES = ['full', 'partial', 'lightweight'];
const PROVENANCES = ['delegated', 'single-session'];

// Reads an Overview field. Returns the FIRST value, or null when absent — but records every
// match, because a spec carrying two conflicting values for the same axis must fail rather than
// silently resolving to whichever line came first. Found while fixing a test that inserted a
// second `Evidence mode:` line and watched the gate read the earlier one without complaint.
function readFieldAll(specText, label) {
  const re = new RegExp(`^\\s*[-*]?\\s*\\*\\*${label}:?\\*\\*[ \\t]*(.+)$`, 'gmi');
  const found = [];
  let m;
  while ((m = re.exec(specText)) !== null) found.push(m[1].trim());
  return found;
}

function readField(specText, label) {
  const all = readFieldAll(specText, label);
  return all.length ? all[0] : null;
}

function checkResearchAxes(specText) {
  const failures = [];
  const isPlaceholder = (v) => v !== null && (/^\{.*\}$|^__[A-Z_]+__$/i.test(v));

  const mode = readField(specText, 'Evidence mode');
  const modeAll = readFieldAll(specText, 'Evidence mode');
  if (modeAll.length > 1) {
    const distinct = [...new Set(modeAll.map((v) => v.toLowerCase()))];
    failures.push(
      `Evidence mode is declared ${modeAll.length} times (${modeAll.map((v) => `"${v.slice(0, 30)}"`).join(', ')})` +
        `${distinct.length > 1 ? ' with conflicting values' : ''} — state it once. A second value is ` +
        `silently ignored today, which is how a spec can appear to say one thing and gate as another.`
    );
  }
  const provAll = readFieldAll(specText, 'Research provenance');
  if (provAll.length > 1) {
    failures.push(
      `Research provenance is declared ${provAll.length} times (${provAll.map((v) => `"${v.slice(0, 30)}"`).join(', ')}) — state it once.`
    );
  }
  if (mode === null) {
    failures.push(
      'Evidence mode is missing. State how much research happened, as exactly one of: ' +
        `${EVIDENCE_MODES.join(' | ')}.`
    );
  } else if (isPlaceholder(mode)) {
    failures.push(`Evidence mode is still a placeholder; state one of: ${EVIDENCE_MODES.join(' | ')}.`);
  } else if (!EVIDENCE_MODES.some((v) => new RegExp(`\\b${v}\\b`, 'i').test(mode))) {
    failures.push(
      `Evidence mode "${mode.slice(0, 60)}" is not one of: ${EVIDENCE_MODES.join(' | ')}. ` +
        `"partial" means some research landed but not all — use it rather than claiming ` +
        `"full" or downgrading to "lightweight".`
    );
  }

  const prov = readField(specText, 'Research provenance');
  // Provenance is only meaningful when research actually ran. Lightweight records an evidence
  // exception instead, so it carries no provenance claim.
  const needsProvenance = mode !== null && /\b(full|partial)\b/i.test(mode);
  if (needsProvenance && prov === null) {
    failures.push(
      'Research provenance is missing. State who produced the research as exactly one of: ' +
        `${PROVENANCES.join(' | ')}. "single-session" is what waives the @ux-researcher ` +
        `accessibility sign-off — it is not a judgement on the research itself.`
    );
  } else if (prov !== null && isPlaceholder(prov)) {
    failures.push(`Research provenance is still a placeholder; state one of: ${PROVENANCES.join(' | ')}.`);
  } else if (prov !== null && !PROVENANCES.some((v) => new RegExp(`\\b${v}\\b`, 'i').test(prov))) {
    failures.push(
      `Research provenance "${prov.slice(0, 60)}" is not one of: ${PROVENANCES.join(' | ')}.`
    );
  }
  return failures;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    console.error('Usage: node motion_spec_check.js check [--motion-spec P] [--user-stories P] [--root R] [--require-spec] [--json]');
    process.exit(2);
  }

  const root = args.root ? path.resolve(args.root) : process.cwd();
  const specPath = path.resolve(root, args.motionSpec || DEFAULTS.motionSpec);
  const usPath = path.resolve(root, args.userStories || DEFAULTS.userStories);

  const result = { motionSpec: {}, failures: [] };

  if (!fs.existsSync(specPath)) {
    // Absence means two different things depending on the caller.
    //
    // Default (skip): the caller is /design step-06a or /develop step-07, where
    // motion may be out of scope. A missing spec genuinely is not a defect there.
    //
    // --require-spec (fail): the caller is the /motion Phase 3 gate, which is only
    // reachable once motion IS in scope. An absent spec there is exactly the defect
    // the gate exists to catch, so it must fail — and must NOT report the "not in
    // scope" reason, which would assert something the caller has already ruled out.
    if (args.requireSpec) {
      const msg = `motion-spec.md is absent at ${specPath}, but this gate was invoked with --require-spec (the /motion Phase 3 gate). Reaching Phase 3 means motion IS in scope, so an absent spec is a missing deliverable, not an out-of-scope skip. Write ${path.relative(root, specPath) || specPath} from .agents/templates/product/motion-spec-template.md and re-run.`;
      if (args.json) {
        console.log(JSON.stringify({ ok: false, skipped: false, required: true, reason: msg, motionSpec: { path: specPath, found: false }, failures: [msg] }, null, 2));
      } else {
        console.error(`✗ motion spec check FAILED — required spec absent`);
        console.error(`  ${msg}`);
      }
      process.exit(1);
    }

    if (args.json) {
      console.log(JSON.stringify({ ok: true, skipped: true, reason: 'motion-spec.md not present (motion not in scope)', motionSpec: { path: specPath, found: false } }, null, 2));
    } else {
      console.log('✓ motion spec check skipped — motion-spec.md not present (motion not in scope)');
    }
    process.exit(0);
  }

  let specText;
  try {
    specText = read(specPath);
  } catch (e) {
    console.error(`motion_spec_check: cannot read ${specPath}: ${e.message}`);
    process.exit(2);
  }
  const usText = fs.existsSync(usPath) ? read(usPath) : '';

  const f = checkMotionSpec(specText, usText);

  // A spec that names US-### references needs user-stories.md to exist. Without this, deleting
  // the file turned traceability into a no-op: `ok: true`, `userStoriesFound: false`,
  // `failures: []`, exit 0 — while SKILL.md claimed "if the file does not exist, the gate fails
  // on every prompt". The claim was false, and it was false in the dangerous direction: a run
  // that trusted it never had to read the JSON.
  //
  // Only under --require-spec. The flagless form is used by /design step-06a and /develop
  // step-07, where a project may legitimately have a motion spec and no user-story file yet.
  if (args.requireSpec && !usText && /US-\d{2,}/.test(specText)) {
    const msg =
      `user-stories.md is absent at ${usPath}, but motion-spec.md references US-### stories. ` +
      `Under --require-spec that is a failure, not a skip: every MO-### must be traceable to a ` +
      `story that exists. Create the file, or drop the traceability claims from the spec.`;
    f.push(msg);
  }

  // Evidence mode only matters where Phase 3's completion claim applies.
  if (args.requireSpec) {
    for (const msg of checkResearchAxes(specText)) f.push(msg);
  }
  // Assign once, after the traceability-missing check above, so the reported
  // `userStoriesFound` and the failure list cannot disagree with each other.
  result.motionSpec = { path: specPath, found: true, userStoriesFound: usText.length > 0, failures: f };
  result.failures.push(...f);

  const ok = result.failures.length === 0;

  if (args.json) {
    console.log(JSON.stringify({ ok, ...result }, null, 2));
  } else if (ok) {
    console.log('✓ motion spec: every MO-### prompt is complete (transform/opacity only, reduced-motion fallback, numeric tolerance) and traces to a user story');
  } else {
    console.error(`✗ motion spec check FAILED (${result.failures.length} issue${result.failures.length === 1 ? '' : 's'})`);
    console.error('  motion-spec.md prompts must be fully specified and traceable (motion-spec-template.md + /motion Phase 3 gate).');
    console.error('  An underspecified prompt is flagged back to Ivy — Rex must not improvise timing.');
    for (const msg of result.failures) console.error(`  - ${msg}`);
  }

  process.exit(ok ? 0 : 1);
}

main();
