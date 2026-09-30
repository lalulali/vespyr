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

function checkPRD(text, mode, root) {
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

  // DNA 5 — §2 Research Foundation no-fabrication guard (mechanical).
  // A §2 row may claim "Reviewed" only if the file it cites actually exists on disk.
  // Fabricated research rows (Reviewed status + invented finding for a non-existent
  // upstream artifact) are the imported/reverse-mode hallucination this catches.
  // A row citing a backtick `path` and marked reviewed ([x] or the word "Reviewed"
  // without a PENDING/ABSENT qualifier) whose path is absent under root => failure.
  if (root) {
    const rowRe = /^\|[^|\n]*\|\s*`([^`]+\.md)`\s*\|([^|\n]*)\|/gm;
    let rm;
    while ((rm = rowRe.exec(text)) !== null) {
      const relPath = rm[1].trim();
      const statusCell = rm[2].trim();
      const claimsReviewed = /\[x\]/i.test(statusCell) || (/\breviewed\b/i.test(statusCell) && !/\bpending\b/i.test(statusCell) && !/\babsent\b/i.test(statusCell));
      if (!claimsReviewed) continue;
      // Resolve the cited artifact path against root; a claimed-reviewed row must resolve.
      const abs = path.resolve(root, relPath);
      if (!fs.existsSync(abs)) {
        failures.push(`PRD §2 Research Foundation: row cites \`${relPath}\` as Reviewed but that file does not exist (DNA 5 fabrication — mark [ABSENT — no upstream research] or [PENDING], never Reviewed)`);
      }
    }
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

  // CR-3 (co-location): the markers above are satisfied by keyword-smeared prose
  // that scatters "Story ID:", "**Given**", "AC-H1", etc. anywhere in the doc.
  // A real user-stories doc has story blocks where a single story owns its own
  // Given/When/Then acceptance criterion. Require at least one story region
  // (bounded by a "Story ID:" line up to the next Story ID / Feature / Epic
  // heading) that contains a complete Given→When→Then triplet in document order.
  if (hasGherkin) {
    const storySplit = text.split(/(?=^[-*\s]*\*{0,2}Story ID\b)/mi);
    const colocated = storySplit.some((block) => {
      if (!/Story ID/i.test(block)) return false;
      const g = block.search(/\*\*Given\*\*/i);
      const w = block.search(/\*\*When\*\*/i);
      const t = block.search(/\*\*Then\*\*/i);
      return g >= 0 && w > g && t > w;
    });
    if (!colocated) {
      failures.push('User stories: no single story block owns a complete Given→When→Then acceptance criterion — the Gherkin tokens are scattered, not co-located under a story (off-template keyword-smear is not a valid substitute)');
    }
  }

  // AC COVERAGE SELF-AUDIT (reasoning gate — NEVER counts acceptance criteria).
  // Counting ACs was tried twice and failed the same way: any numeric floor
  // becomes a target the generator optimizes to, producing a uniform pattern
  // (2/2/1, then 1/1/1). The real defect is missing *reasoning* about failure
  // modes, not a missing count. So the gate verifies that each story reasoned
  // about every risk category and resolved each one — either to an AC reference
  // or to a concrete N/A reason. Depth then follows the reasoning, not a quota.
  // The machine checks presence + resolution of the self-audit; it does not and
  // must not judge how many ACs result. Format: user-story-instructions.md §3.3.
  {
    const storyBlocks = text.split(/(?=^[-*\s]*\*{0,2}Story ID\b)/mi).filter((b) => /Story ID/i.test(b));

    // The 12 canonical risk categories. Each is matched by a stable leading label.
    const CATEGORIES = [
      { label: 'Invalid / malformed input', re: /Invalid\s*\/\s*malformed input/i },
      { label: 'Empty / boundary state', re: /Empty\s*\/\s*boundary state/i },
      { label: 'Duplicate / idempotency', re: /Duplicate\s*\/\s*idempotency/i },
      { label: 'Concurrency / race', re: /Concurrency\s*\/\s*race/i },
      { label: 'Auth / permission', re: /Auth\s*\/\s*permission/i },
      { label: 'State / lifecycle', re: /State\s*\/\s*lifecycle/i },
      { label: 'External dependency failure', re: /External dependency failure/i },
      { label: 'Rate / abuse limits', re: /Rate\s*\/\s*abuse limits/i },
      { label: 'Data integrity', re: /Data integrity/i },
      { label: 'Localization / encoding', re: /Localization\s*\/\s*encoding/i },
      { label: 'Accessibility / device', re: /Accessibility\s*\/\s*device/i },
      { label: 'Security', re: /Security/i },
    ];

    for (const block of storyBlocks) {
      const idMatch = block.match(/Story ID:\s*\**\s*([A-Za-z0-9-]+)/i);
      const storyId = idMatch ? idMatch[1] : '(unnamed story)';

      // 1. The self-audit block header must be present.
      const auditIdx = block.search(/AC Coverage Self-Audit/i);
      if (auditIdx < 0) {
        failures.push(`User stories: story ${storyId} is missing its "AC Coverage Self-Audit" block — every story must reason about each risk category (see user-story-instructions.md §3.3). The gate checks reasoning, not AC count.`);
        continue;
      }
      const auditText = block.slice(auditIdx);

      for (const cat of CATEGORIES) {
        // 2. Each category label must appear in the self-audit.
        const line = auditText.split('\n').find((l) => cat.re.test(l));
        if (!line) {
          failures.push(`User stories: story ${storyId} self-audit is missing the "${cat.label}" category line (all 12 categories must be addressed).`);
          continue;
        }
        // 3. The line must be RESOLVED: either it references an AC (AC-…) or it
        //    gives an "N/A because <reason>" with a real reason. A bare N/A, a
        //    placeholder in angle brackets, or an empty value fails — that is the
        //    signal that no reasoning happened.
        const value = line.replace(cat.re, '').replace(/^[\s:*\-|]+/, '').trim();
        const hasAcRef = /AC-[A-Za-z]*\d+/.test(value);
        const naMatch = value.match(/N\/?A\b\s*(?:because|:|-|—)?\s*(.*)$/i);
        const naReason = naMatch ? naMatch[1].trim() : '';
        const isPlaceholder = /^<.*>$/.test(value) || value === '' || /^(N\/?A)$/i.test(value);
        const resolved = hasAcRef || (naMatch && naReason.length >= 8 && !/^<.*>$/.test(naReason));
        if (isPlaceholder || !resolved) {
          failures.push(`User stories: story ${storyId} self-audit line "${cat.label}" is not resolved — it must name an AC (e.g. AC-U3) or give "N/A because <concrete reason>". A bare N/A, placeholder, or blank means the category was not actually reasoned about.`);
        }
      }
    }
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
  // CR-4: an unknown --mode must fail loudly, not silently degrade to `create`
  // (which runs the weaker ruleset and can hide a missing §14 Evidence Ledger).
  if (args.mode !== undefined && args.mode !== 'create' && args.mode !== 'reverse') {
    console.error(`template_conformance: unknown --mode "${args.mode}" (expected create or reverse)`);
    process.exit(2);
  }
  const mode = args.mode === 'reverse' ? 'reverse' : 'create';
  const reqPath = path.resolve(root, args.requirements || DEFAULTS.requirements);
  const usPath = path.resolve(root, args.userStories || DEFAULTS.userStories);

  const result = { mode, requirements: {}, userStories: {}, failures: [] };

  // requirements.md
  if (!fs.existsSync(reqPath)) {
    result.failures.push(`PRD: file not found: ${path.relative(root, reqPath)}`);
    result.requirements = { path: reqPath, found: false };
  } else {
    const f = checkPRD(read(reqPath), mode, root);
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
