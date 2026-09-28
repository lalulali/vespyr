#!/usr/bin/env node
/**
 * template_conformance.js — Structural template conformance gate for /design artifacts.
 *
 * WHY THIS EXISTS
 * The /design skill instructs agents to author `requirements.md` from
 * `prd-template.md` and `user-stories.md` from `user-story-template.md`, and the
 * SKILL.md "Canonical document contracts" table says a compact report is NOT an
 * acceptable substitute. Those were PROSE contracts only — nothing failed the
 * build when an agent produced an off-template document. The 2026-09 parity
 * benchmarks proved the failure: a grounded-but-off-template PRD (5 ad-hoc
 * sections, no FR table) and a flat "Story Matrix" user-stories doc both passed
 * every gate. This script turns the prose contract into a mechanical,
 * build-failing check.
 *
 * SCOPE (deliberate): structure only, not quality. It asserts the section
 * skeleton and required tables/fields exist — it cannot judge whether the
 * Executive Summary is good or the ACs are meaningful. Strict on skeleton,
 * tolerant on content depth: a section may be present-but-thin or marked N/A,
 * but it may not be ABSENT.
 *
 * Usage:
 *   node .agents/scripts/template_conformance.js check \
 *     [--requirements <path>] [--user-stories <path>] [--mode create|reverse] \
 *     [--root <dir>] [--json]
 *
 * Exit 0 = conformant. Exit 1 = missing structure (listed). Exit 2 = usage/IO error.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  requirements: 'artifacts/output/03-strategy/requirements.md',
  userStories: 'artifacts/output/03-strategy/user-stories.md',
};

// ---- PRD required numbered sections (matched by NUMBER, tolerant of title rewording) ----
// The canonical prd-template.md ships §§1–14. §14 (Evidence Ledger) is reverse-mode only.
const PRD_SECTIONS = [
  { n: 1, label: 'Executive Summary' },
  { n: 2, label: 'Research Foundation' },
  { n: 3, label: 'Problem Statement' },
  { n: 4, label: 'Hypothesis of Solution' },
  { n: 5, label: 'Goals & Success Metrics' },
  { n: 6, label: 'Target Audience' },
  { n: 7, label: 'Feature Overview' },
  { n: 8, label: 'Non-Functional Requirements' },
  { n: 9, label: 'Timeline & Phases' },
  { n: 10, label: 'Out of Scope' },
  { n: 11, label: 'Dependencies & Risks' },
  { n: 12, label: 'Open Questions & Decisions' },
  { n: 13, label: 'Optional Components' },
  { n: 14, label: 'Evidence Ledger', reverseOnly: true },
];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--requirements') args.requirements = argv[++i];
    else if (a === '--user-stories') args.userStories = argv[++i];
    else if (a === '--mode') args.mode = argv[++i];
    else if (a === '--root') args.root = argv[++i];
    else args._.push(a);
  }
  return args;
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

// A line is a heading `## N. Title` (any depth of #, but PRD uses ##). We match
// the leading number so a reworded title still counts.
function presentSectionNumbers(text) {
  const nums = new Set();
  const re = /^#{1,4}\s+(\d{1,2})\.\s+/gm;
  let m;
  while ((m = re.exec(text)) !== null) nums.add(parseInt(m[1], 10));
  return nums;
}

function checkPRD(text, mode) {
  const failures = [];
  const present = presentSectionNumbers(text);

  for (const s of PRD_SECTIONS) {
    if (s.reverseOnly && mode !== 'reverse') continue; // §14 only required in reverse
    if (!present.has(s.n)) {
      failures.push(`PRD: missing section §${s.n} (${s.label}) — expected a "## ${s.n}. ..." heading`);
    }
  }

  // Feature Overview (§7) must carry a functional-requirement table with FR- IDs.
  if (!/\bFR-\d{2,}/.test(text) || !/\|\s*Requirement ID\s*\|/i.test(text)) {
    failures.push('PRD: missing Functional Requirements table (expected a "| Requirement ID | ... |" table with FR-NNN rows in §7)');
  }
  // Non-Functional Requirements (§8) must carry NFR- IDs.
  if (!/\bNFR-\d{2,}/.test(text)) {
    failures.push('PRD: missing Non-Functional Requirements rows (expected NFR-NNN entries in §8)');
  }
  // Reverse mode: §14 must actually contain an anchored Evidence Ledger, not just the heading.
  if (mode === 'reverse' && !/\bL-\d{2,}\b/.test(text)) {
    failures.push('PRD (reverse): §14 Evidence Ledger present but contains no L-NN rows');
  }

  return failures;
}

function checkUserStories(text) {
  const failures = [];

  // Backlog Hierarchy Tree (default top-of-doc structure).
  if (!/Backlog Hierarchy Tree/i.test(text) && !/```text[\s\S]*Epic:/i.test(text)) {
    failures.push('User stories: missing Backlog Hierarchy Tree (the default top-of-doc "Epic → Feature → Story" tree)');
  }
  // At least one Epic and one Feature block.
  if (!/^#{1,3}\s+Epic:/m.test(text)) {
    failures.push('User stories: no "# Epic:" block found — Epic → Feature → Story hierarchy is required (flat US-NN lists are not a valid substitute)');
  }
  if (!/^#{1,3}\s+Feature:/m.test(text)) {
    failures.push('User stories: no "## Feature:" block found — Epic → Feature → Story hierarchy is required');
  }

  // Story-level metadata + contract blocks (require at least one occurrence each;
  // strict presence, tolerant of count).
  const requiredMarkers = [
    { re: /Story ID:/i, msg: 'per-story "Story ID:" metadata' },
    { re: /Priority:/i, msg: 'per-story "Priority:" metadata' },
    { re: /Sprint:/i, msg: 'per-story "Sprint:" metadata' },
    { re: /Traces to PRD/i, msg: '"Traces to PRD" FR reference (traceability to requirements.md §7.3)' },
    { re: /Business Requirement/i, msg: '"Business Requirement" section' },
    { re: /Technical Requirement/i, msg: '"Technical Requirement" section' },
  ];
  for (const marker of requiredMarkers) {
    if (!marker.re.test(text)) {
      failures.push(`User stories: missing ${marker.msg}`);
    }
  }

  // Acceptance criteria must be multi-line Given/When/Then, not single-line prose.
  const hasGherkin = /\*\*Given\*\*/.test(text) && /\*\*When\*\*/.test(text) && /\*\*Then\*\*/.test(text);
  if (!hasGherkin) {
    failures.push('User stories: acceptance criteria are not in multi-line Given/When/Then form (expected **Given** / **When** / **Then** steps)');
  }
  // AC classes.
  if (!/AC-H\d/.test(text)) failures.push('User stories: no Happy-Path acceptance criteria (AC-H*) found');
  if (!/AC-U\d/.test(text)) failures.push('User stories: no Unhappy-Path acceptance criteria (AC-U*) found');
  if (!/AC-E\d/.test(text)) failures.push('User stories: no Edge-Case acceptance criteria (AC-E*) found');

  // Story Dependencies Diagram (Mermaid).
  if (!/Story Dependencies Diagram/i.test(text)) {
    failures.push('User stories: missing "Story Dependencies Diagram" (Mermaid dependency graph)');
  }

  return failures;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    console.error('Usage: node template_conformance.js check [--requirements P] [--user-stories P] [--mode create|reverse] [--root R] [--json]');
    process.exit(2);
  }

  const root = args.root ? path.resolve(args.root) : process.cwd();
  const mode = args.mode === 'reverse' ? 'reverse' : (args.mode === 'create' ? 'create' : 'create');
  const reqPath = path.resolve(root, args.requirements || DEFAULTS.requirements);
  const usPath = path.resolve(root, args.userStories || DEFAULTS.userStories);

  const result = { mode, requirements: {}, userStories: {}, failures: [] };

  // requirements.md
  if (!fs.existsSync(reqPath)) {
    result.failures.push(`PRD: file not found: ${path.relative(root, reqPath)}`);
    result.requirements = { path: reqPath, found: false };
  } else {
    const f = checkPRD(read(reqPath), mode);
    result.requirements = { path: reqPath, found: true, failures: f };
    result.failures.push(...f);
  }

  // user-stories.md
  if (!fs.existsSync(usPath)) {
    result.failures.push(`User stories: file not found: ${path.relative(root, usPath)}`);
    result.userStories = { path: usPath, found: false };
  } else {
    const f = checkUserStories(read(usPath));
    result.userStories = { path: usPath, found: true, failures: f };
    result.failures.push(...f);
  }

  const ok = result.failures.length === 0;

  if (args.json) {
    console.log(JSON.stringify({ ok, ...result }, null, 2));
  } else if (ok) {
    console.log('✓ template conformance: requirements.md + user-stories.md follow the canonical templates');
  } else {
    console.error(`✗ template conformance FAILED (${result.failures.length} issue${result.failures.length === 1 ? '' : 's'}) — mode=${mode}`);
    console.error('  The /design artifacts must follow the canonical templates (prd-template.md / user-story-template.md).');
    console.error('  A grounded-but-off-template document is not a valid substitute (SKILL.md "Canonical document contracts").');
    for (const msg of result.failures) console.error(`  - ${msg}`);
  }

  process.exit(ok ? 0 : 1);
}

main();
