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
 * Usage:
 *   node .agents/scripts/motion_spec_check.js check \
 *     [--motion-spec <path>] [--user-stories <path>] [--root <dir>] [--json]
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
    if (/^\s*\*\*[^*]+\*\*/.test(line)) break; // next field
    if (line.trim().length > 0) collected.push(line.trim());
  }
  const blockVal = collected.join(' ').trim();
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
  const props = fieldValue(body, 'Property(ies)');
  if (props && props.length > 0) {
    const cleaned = props.toLowerCase();
    // Reject any animated property that is not transform/opacity.
    const banned = ['filter', 'width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'box-shadow', 'background'];
    const hit = banned.find((p) => new RegExp(`\\b${p}\\b`).test(cleaned));
    if (hit) {
      failures.push(`${id}: animates a non-composited property ("${hit}") — only transform and opacity are permitted.`);
    }
  }

  // Reduced-motion fallback must describe a fade/opacity/instant fallback.
  const rmf = fieldValue(body, 'Reduced-motion fallback');
  if (rmf && rmf.length > 0 && !/fade|opacity|instant|none|static/i.test(rmf)) {
    failures.push(`${id}: reduced-motion fallback must be a cross-fade/opacity/instant fallback (got: "${rmf.slice(0, 40)}...").`);
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

  return failures;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    console.error('Usage: node motion_spec_check.js check [--motion-spec P] [--user-stories P] [--root R] [--json]');
    process.exit(2);
  }

  const root = args.root ? path.resolve(args.root) : process.cwd();
  const specPath = path.resolve(root, args.motionSpec || DEFAULTS.motionSpec);
  const usPath = path.resolve(root, args.userStories || DEFAULTS.userStories);

  const result = { motionSpec: {}, failures: [] };

  if (!fs.existsSync(specPath)) {
    // No motion spec = motion not in scope. This is NOT a failure; the caller
    // (Phase 3 gate) only runs this when motion is in scope. Report and exit 0.
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
