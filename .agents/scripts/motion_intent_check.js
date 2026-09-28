#!/usr/bin/env node
/**
 * motion_intent_check.js — Motion-intent detector for the /design halt-and-ask gate.
 *
 * WHY THIS EXISTS
 * The /motion skill can be TRIGGERED by the user naming animation, and the
 * anti_generic_check.js gate FAILS a motion-led design that ships static. But
 * there was no deterministic step that, at the START of /design, surfaces the
 * motion decision when the brief signals a motion-led product but never says the
 * word "animation". True silent auto-invocation of /motion is forbidden (DNA 4:
 * "No intent, no execution" — launching a research→spec→handoff pipeline the user
 * did not ask for is ungated autonomy). The DNA-compliant alternative is
 * halt-and-ASK: detect the signal deterministically, then force the agent to put
 * the decision to the user. This script is the detector.
 *
 * BEHAVIOR (deliberate): it does NOT fail the build and does NOT launch /motion.
 * It reads the discovery brief + PRD (whatever exists) for motion-led signals and
 * reports decisionRequired:true/false. Exit is ALWAYS 0 (it is advisory input to
 * a human-gated decision, not a pass/fail gate). The /design step reads the JSON
 * and, when decisionRequired is true, HALTS and asks the user before proceeding.
 *
 * Usage:
 *   node .agents/scripts/motion_intent_check.js check \
 *     [--brief <path>] [--prd <path>] [--root <dir>] [--json]
 *
 * Exit 0 always (advisory). Exit 2 = usage error only.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Candidate source artifacts (first existing of each kind is scanned).
const BRIEF_CANDIDATES = [
  'artifacts/output/01-discovery/validation-brief.md',
  'artifacts/output/01-discovery/idea-brief.md',
];
const PRD_DEFAULT = 'artifacts/output/03-strategy/requirements.md';

// Explicit phrases that are DNA 4 "Clear intent" for motion (user asked for it).
const EXPLICIT_PHRASES = [
  /interactive website/i,
  /creative website/i,
  /motion[- ]design website/i,
  /animation[- ]heavy/i,
  /animated (?:website|site|landing|experience)/i,
  /scroll(?:-driven| choreography| animation)/i,
  /micro-?interactions?\b/i,
  /\bWebGL\b/i,
  /\bawwwards\b/i,
];

// Motion-led product contexts (from design.md's Product context menu). Their
// presence in the brief/PRD is a strong signal even without an explicit phrase.
const MOTION_LED_CONTEXTS = [/Vibrant Brand-First/i, /Conversion Storefront/i];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--brief') args.brief = argv[++i];
    else if (a === '--prd') args.prd = argv[++i];
    else if (a === '--root') args.root = argv[++i];
    else args._.push(a);
  }
  return args;
}

function readIfExists(p) {
  try {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  } catch {
    return null;
  }
}

// Has the motion decision already been consciously recorded (so we don't nag)?
// A brief/PRD that already says "motion: not in scope", references motion-spec.md,
// or records a motion decision has settled it.
function motionAlreadyDecided(text) {
  return (
    /motion[- ]spec\.md/i.test(text) ||
    /motion:\s*(?:in scope|not in scope|out of scope|deferred|decided)/i.test(text) ||
    /\bMO-\d{2,}\b/.test(text)
  );
}

function detect(text) {
  const explicit = EXPLICIT_PHRASES.filter((re) => re.test(text)).map((re) => re.source);
  const contexts = MOTION_LED_CONTEXTS.filter((re) => re.test(text)).map((re) => re.source);
  return { explicit, contexts };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    console.error('Usage: node motion_intent_check.js check [--brief P] [--prd P] [--root R] [--json]');
    process.exit(2);
  }

  const root = args.root ? path.resolve(args.root) : process.cwd();

  // Resolve brief: explicit --brief, else first existing candidate.
  let briefPath = null;
  if (args.brief) briefPath = path.resolve(root, args.brief);
  else {
    for (const c of BRIEF_CANDIDATES) {
      const p = path.resolve(root, c);
      if (fs.existsSync(p)) { briefPath = p; break; }
    }
  }
  const prdPath = path.resolve(root, args.prd || PRD_DEFAULT);

  const briefText = briefPath ? readIfExists(briefPath) : null;
  const prdText = readIfExists(prdPath);
  const combined = `${briefText || ''}\n${prdText || ''}`;

  const scannedSources = [];
  if (briefText) scannedSources.push(path.relative(root, briefPath));
  if (prdText) scannedSources.push(path.relative(root, prdPath));

  let decisionRequired = false;
  let alreadyDecided = false;
  let signals = { explicit: [], contexts: [] };

  if (combined.trim().length === 0) {
    // No sources to scan — cannot detect; not a failure, just no decision raised.
    decisionRequired = false;
  } else if (motionAlreadyDecided(combined)) {
    alreadyDecided = true;
    decisionRequired = false;
  } else {
    signals = detect(combined);
    decisionRequired = signals.explicit.length > 0 || signals.contexts.length > 0;
  }

  const result = {
    ok: true,
    decisionRequired,
    alreadyDecided,
    scannedSources,
    signals,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (decisionRequired) {
    console.log('⚠ MOTION DECISION REQUIRED — the brief/PRD signals a motion-led product but no motion decision is recorded.');
    if (signals.explicit.length) console.log(`  Explicit intent: ${signals.explicit.join(', ')}`);
    if (signals.contexts.length) console.log(`  Motion-led context: ${signals.contexts.join(', ')}`);
    console.log('  HALT and ASK the user: run /motion, or record why motion is out of scope. Do NOT silently proceed static, and do NOT silently launch /motion.');
  } else if (alreadyDecided) {
    console.log('✓ motion decision already recorded — no prompt needed.');
  } else {
    console.log('✓ no motion-led signal detected — proceed.');
  }

  process.exit(0);
}

main();
