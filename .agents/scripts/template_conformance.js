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
 * ACCEPTANCE-CRITERIA DEPTH (2026-09-30)
 * Counting ACs was tried twice and failed the same way: any numeric floor becomes
 * a target the generator optimises to. So nothing here counts ACs. Instead four
 * decidable facts are asserted, and one judgement call is surfaced as a warning:
 *
 *   FAIL (machine-decidable):
 *     R1  every story defines >=1 AC, and every AC its self-audit cites resolves
 *         to a criterion that story actually defines (referential integrity)
 *     R2  reverse mode: every AC carries [prototype L-NN] or [derived]
 *     R3  every Feature carries a "#### State Model"; every transition marked
 *         illegal names a criterion (illegal transitions are where ACs go missing)
 *     R4  reverse mode: every [DEFERRED TO SPEC] ledger row is answered in the
 *         "#### Deferred-Evidence AC Focus" block
 *   WARN (never fails — a second look, not a verdict):
 *     R5  a story reasoning away most categories; the same N/A wording reused
 *         across stories; a uniform AC count across stories
 *
 * R5 exists because the instructions always said a human should challenge thin
 * self-audit reasoning — and nothing ever asked one to. These are warnings by
 * design: they mark reasoning that deserves attention, they do not define
 * correctness, and they never change the exit code.
 *
 * Usage:
 *   node .agents/scripts/template_conformance.js check \
 *     [--requirements <path>] [--user-stories <path>] [--mode create|reverse] \
 *     [--root <dir>] [--json]
 *
 * Exit 0 = conformant (warnings may still print). Exit 1 = missing structure
 * (listed). Exit 2 = usage/IO error.
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

// An AC identifier: AC-H1, AC-U12, AC-E3, AC-AI-1. The class segment is
// letters, the number may be separated by a hyphen (the AI class uses one).
const AC_ID = 'AC-[A-Za-z]+-?\\d+';
const AC_DEF_RE = new RegExp('\\*\\*' + AC_ID + ':\\*\\*', 'g');
const AC_REF_RE = new RegExp(AC_ID, 'g');
// Source tag required on every AC in reverse mode.
const AC_TAG_RE = /\[(prototype\s+L-\d+|derived)\]/i;

// R5 smell-detector thresholds. These produce WARNINGS, never failures: they
// mark reasoning that deserves a second look, they do not define correctness.
const NA_HEAVY_THRESHOLD = 13;       // of 16 categories reasoned away
const REPEATED_REASON_THRESHOLD = 3; // same N/A wording in N stories

function truncate(s, n = 60) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

/**
 * Reduce an N/A reason to a comparable key so "no list is rendered here" and
 * "no list is rendered here." count as the same reason. Deliberately crude — it
 * only needs to catch verbatim reuse, never to judge phrasing.
 */
function normalizeReason(reason) {
  return String(reason)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(this|that|the|a|an|is|are|here|there)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Blank out fenced code blocks while PRESERVING line count.
 *
 * WHY: the backlog hierarchy tree is a ```text fence that literally contains
 * lines like "## Feature: Billing" and "User Story: US-01". Scanning raw text
 * treated the tree as real structure, so a document could satisfy the Feature
 * state-model rule with a tree, and a real story could merge into its
 * predecessor. Blank lines keep every offset and line number stable, so the
 * self-audit bounding below still works.
 */
function stripFences(text) {
  return String(text).replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm, (fence) =>
    fence.replace(/[^\n]/g, ' '));
}

/**
 * Read a Markdown table, locating columns BY HEADER NAME rather than position.
 *
 * WHY: hard-indexing cells meant adding a column silently shifted every later
 * one. A state model written `| From | Event | To | Legal | Criteria | Owner |`
 * then reported "no acceptance criterion in the Criteria column" while the
 * criterion sat one column over — a false failure whose message pointed at the
 * wrong cell. Names are stable; positions are not.
 *
 * `anchor` is a regex matched against the first header cell to identify the
 * table when several are in scope. Returns null when no such table exists.
 */
function mdRows(text, anchor) {
  const lines = String(text).split('\n');
  let header = null;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t.startsWith('|')) continue;
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^[-: ]*$/.test(c) || c === '')) continue;   // separator
    if (anchor && !anchor.test(cells[0] || '')) continue;
    header = { cells, line: i };
    break;
  }
  if (!header) return null;
  const data = [];
  for (let i = header.line + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t.startsWith('|')) { if (data.length) break; else continue; }
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^[-: ]*$/.test(c) || c === '')) continue;
    data.push(cells);
  }
  return {
    header: header.cells,
    data,
    headerIndex: (re) => header.cells.findIndex((h) => re.test(h)),
  };
}

// Legal-column vocabulary. A closed 4-token set silently DROPPED rows written
// "N", "not allowed", "false" or "❌" — so a document could mark a transition
// illegal in plain English and the rule would count zero illegal transitions
// while reporting success. Anything outside both sets is reported as unreadable
// rather than guessed at.
const LEGAL_NO = /^(no|n|false|illegal|illeg[ea]l|prohibited|forbidden|not[\s-]?allowed|disallowed|blocked|x|✗|✘|❌|✖|0)$/i;
const LEGAL_YES = /^(yes|y|true|legal|allowed|permitted|ok|okay|✓|✔|✅|1)$/i;

/**
 * Split a user-stories document into per-story blocks.
 *
 * WHY THIS IS CAREFUL: splitting only on a "- **Story ID:**" line meant any story
 * using a different metadata layout merged into its predecessor's block. Only the
 * FIRST self-audit in a merged block was then validated, so a later story could
 * ship with no self-audit at all and the gate reported clean. That is the worst
 * failure mode a gate can have — it disables itself silently and looks green.
 *
 * But splitting on BOTH boundaries is equally wrong: in the canonical template a
 * "### User Story:" heading is followed by "- **Tracker:**" and then
 * "- **Story ID:**", so two boundaries fired for one story and cut it in half.
 *
 * So: the heading is authoritative when the document uses story headings, and
 * the metadata line is only a fallback for documents that do not. Fences are
 * blanked first so the ```text backlog tree — which contains literal
 * "User Story:" and "## Feature:" lines — cannot manufacture phantom stories.
 *
 * KNOWN LIMITATION: a document that uses story headings for some stories and
 * bare "Story ID:" metadata for others will merge the latter into the former.
 * Both layouts are standardised in user-story-instructions.md; mixed documents
 * are not supported rather than silently half-validated.
 */
function storyBlocks(text) {
  const src = stripFences(text);
  const hasHeadings = /^#{2,6}[ \t]*User Story\b/im.test(src);
  const boundary = hasHeadings
    ? /(?=^#{2,6}[ \t]*User Story\b)/mi
    : /(?=^[-*\s]*\*{0,2}Story ID\b)/mi;
  return src.split(boundary).filter((b) => /Story ID\b|^#{2,6}\s+User Story\b/i.test(b));
}

/** ACs actually DEFINED in a block (bold `**AC-XN:**`), not merely mentioned. */
function definedACs(block) {
  const out = new Set();
  let m;
  AC_DEF_RE.lastIndex = 0;
  while ((m = AC_DEF_RE.exec(block)) !== null) out.add(m[0].replace(/\*/g, '').replace(/:$/, ''));
  return out;
}

/**
 * R3 — Feature state model (the biggest AC-depth lever).
 *
 * Most missed acceptance criteria are ILLEGAL STATE TRANSITIONS, and no
 * per-story checklist finds them: each story reasons about its own slice while
 * nobody enumerates the transitions between them. So the state model lives at
 * Feature level (one per feature, not one per story — it scales), and every
 * transition the author marks illegal must be covered by a named criterion.
 *
 * Required shape, inside each "## Feature:" block:
 *
 *   #### State Model
 *   **Entity:** {name}
 *   | From | Event | To | Legal | Criteria |
 *   |------|-------|----|-------|----------|
 *   | draft    | submit  | pending | yes | —     |
 *   | pending  | submit  | pending | no  | AC-U4 |
 */
function checkStateModels(text) {
  const failures = [];
  const src = stripFences(text);
  // Every AC this document actually defines, for resolving the Criteria column.
  const allACs = definedACs(src);
  const parts = src.split(/(?=^#{1,4}\s+(?:Feature|Epic)\s*:)/mi);
  const features = parts.filter((p) => /^#{1,4}\s+Feature\s*:/i.test(p.trim()));

  if (features.length === 0) {
    failures.push('User stories: no "## Feature:" block carries a "#### State Model" — every feature must enumerate its entity states and transitions, because illegal transitions are where acceptance criteria are usually missing (see user-story-instructions.md §3.4).');
    return failures;
  }

  for (const block of features) {
    const nameMatch = block.match(/^#{1,4}\s+Feature\s*:\s*(.+)$/mi);
    const featureName = nameMatch ? nameMatch[1].trim() : '(unnamed feature)';
    const smIdx = block.search(/^#{3,6}[ \t]*State Model\b[^\n]*$/im);
    if (smIdx < 0) {
      failures.push(`User stories: feature "${featureName}" is missing its "#### State Model" — enumerate the entity's states and transitions, and give every ILLEGAL transition an acceptance criterion (user-story-instructions.md §3.4).`);
      continue;
    }
    // The table lives under the heading, not inside it; stop at the next heading
    // of the same or higher level so one feature cannot borrow another's table.
    const after = block.slice(smIdx).indexOf('\n');
    const rest = block.slice(smIdx + (after < 0 ? 0 : after));
    const stop = rest.search(/\n#{1,4}\s+\S/);
    const smText = stop < 0 ? rest : rest.slice(0, stop);

    const rows = mdRows(smText, /^from$/i);
    if (!rows) {
      failures.push(`User stories: feature "${featureName}" has a "#### State Model" heading but no transition table — expected a "| From | Event | To | Legal | Criteria |" table.`);
      continue;
    }
    const legalCol = rows.headerIndex(/^legal$/i);
    const critCol = rows.headerIndex(/^(criteria|criterion|criteria ref|covered|covered by|ac)$/i);
    if (legalCol < 0) {
      failures.push(`User stories: feature "${featureName}" state model table has no "Legal" column — each transition must be marked legal or illegal.`);
      continue;
    }

    let illegal = 0;
    let uncovered = 0;
    let unresolved = 0;
    const ghost = new Set();
    const unreadable = [];
    for (const row of rows.data) {
      const cell = (row[legalCol] || '').trim();
      if (!cell) continue;
      if (LEGAL_YES.test(cell)) continue;
      if (!LEGAL_NO.test(cell)) {
        // Fail closed: an unrecognised value means the gate cannot judge the row,
        // and guessing "probably illegal" would hide a real gap.
        unreadable.push(`"${cell}"`);
        continue;
      }
      illegal++;
      const crit = critCol >= 0 ? (row[critCol] || '') : '';
      const refs = crit.match(new RegExp(AC_ID, 'g')) || [];
      if (refs.length === 0) {
        uncovered++;
        continue;
      }
      // THE POINT OF THE RULE: a named criterion must actually exist. Without
      // this, "AC-U99" satisfies the column while forbidding nothing.
      for (const r of refs) {
        if (!allACs.has(r)) { unresolved++; ghost.add(r); }
      }
    }

    if (unreadable.length > 0) {
      failures.push(`User stories: feature "${featureName}" state model uses unreadable Legal value(s) ${unreadable.join(', ')}. Write exactly "yes" or "no" in the Legal column.`);
    }
    if (illegal === 0) {
      failures.push(`User stories: feature "${featureName}" state model lists no ILLEGAL transitions. Every entity has some transition that must not happen — if you genuinely cannot name one, the state model is not describing real behaviour.`);
    } else if (uncovered > 0) {
      failures.push(`User stories: feature "${featureName}" marks ${illegal} transition(s) illegal but ${uncovered} of them have no acceptance criterion in the Criteria column. Every illegal transition must be covered by a named AC — that is the whole point of the state model.`);
    }
    if (unresolved > 0) {
      failures.push(`User stories: feature "${featureName}" state model points at ${unresolved} acceptance criterion/criteria that this document never defines: ${[...ghost].join(', ')}. A transition covered by a criterion that does not exist forbids nothing. Write the criterion, or point at one that exists.`);
    }
  }
  return failures;
}

/**
 * R4 — Deferred-evidence AC focus (reverse mode only).
 *
 * Step 2d's Fidelity Partition deliberately marks infrastructure, telemetry,
 * persistence and DB-bound statements `[DEFERRED TO SPEC]` because no prototype
 * can witness them. Those are exactly the rows where acceptance criteria go
 * thin, and nothing concentrated attention there. This forces each one to be
 * answered somewhere in user-stories.md.
 */
function checkDeferredFocus(usText, prdText, mode) {
  if (mode !== 'reverse') return [];
  const failures = [];
  const deferred = new Set();
  // Ledger columns are located BY NAME. Hard-indexing cell 5 for the status
  // meant inserting a column before it silently switched the rule off — the
  // whole rule became a no-op with no warning, which is the failure mode a
  // gate must never have.
  // Column lookups are ANCHORED to the whole header cell. Unanchored matching
  // found a real bug: /status|state/i matched "Statement" (which contains
  // "state") at index 1, so the gate read the Statement column as the Status
  // column, saw no "[DEFERRED TO SPEC]" anywhere, and switched the entire
  // deferred-evidence rule off without a word.
  const ledger = mdRows(stripFences(prdText), /^(id|ledger id)$/i);
  if (ledger) {
    const idCol = ledger.headerIndex(/^(id|ledger id|ledger row)$/i);
    const stCol = ledger.headerIndex(/^(status|state)$/i);
    if (idCol >= 0 && stCol >= 0) {
      for (const row of ledger.data) {
        const id = (row[idCol] || '').trim();
        if (!/^L-\d+$/i.test(id)) continue;
        if (/DEFERRED\s+TO\s+SPEC/i.test(row[stCol] || '')) deferred.add(id);
      }
    }
  }
  if (deferred.size === 0) return [];

  // The block is document-level, so `##` is the canonical depth (sibling of
  // "## Story Dependencies Diagram"). Accept 2-6 so a nested placement also works.
  // An optional parenthetical suffix is allowed, e.g. "(reverse mode only)".
  const focusStart = usText.search(/^#{2,6}[ \t]*Deferred-Evidence AC Focus\b[^\n]*$/im);
  if (focusStart < 0) {
    failures.push(`User stories (reverse): missing the "Deferred-Evidence AC Focus" block. ${deferred.size} ledger row(s) are marked \`[DEFERRED TO SPEC]\` (${[...deferred].join(', ')}) — infrastructure, telemetry, persistence and DB bounds no prototype can witness, and therefore where acceptance criteria go thinnest. Name the criteria that cover each one (user-story-instructions.md §3.5).`);
    return failures;
  }
  // Bound the window to THIS block. Slicing to end-of-document let any later
  // appendix mentioning "L-07" satisfy a row the focus table itself never
  // answered.
  const afterFocus = usText.slice(focusStart).indexOf('\n');
  const focusBody = usText.slice(focusStart + (afterFocus < 0 ? 0 : afterFocus));
  const stop = focusBody.search(/\n#{1,6}\s+\S/);
  const focusText = stop < 0 ? focusBody : focusBody.slice(0, stop);
  const usACs = definedACs(stripFences(usText));
  const focus = mdRows(focusText, /ledger row|^id$/i);
  const coverCol = focus ? focus.headerIndex(/^(covered by|covered|criteria|criterion|ac)$/i) : -1;
  const rowCol = focus ? focus.headerIndex(/^(ledger row|id|ledger id)$/i) : -1;
  const unresolved = new Set();

  for (const id of [...deferred].sort()) {
    if (!focusText.includes(id)) {
      failures.push(`User stories (reverse): ledger row ${id} is \`[DEFERRED TO SPEC]\` but does not appear in the "#### Deferred-Evidence AC Focus" block. Every deferred row must be answered by at least one acceptance criterion.`);
      continue;
    }
    // The "Covered by" cell must name criteria that EXIST. Checking presence of
    // the id alone let "L-05 | telemetry | AC-QQ7, AC-NOPE9" pass while naming
    // nothing that exists — the exact "points at nothing" failure this block
    // was introduced to prevent.
    if (!focus || coverCol < 0 || rowCol < 0) continue;
    const row = focus.data.find((r) => (r[rowCol] || '').trim() === id);
    if (!row) continue;
    const cell = row[coverCol] || '';
    const refs = cell.match(new RegExp(AC_ID, 'g')) || [];
    if (refs.length === 0) {
      failures.push(`User stories (reverse): the Deferred-Evidence AC Focus row for ${id} names no acceptance criterion in its "Covered by" column. Every deferred row must be answered by a criterion you actually wrote.`);
      continue;
    }
    for (const r of refs) if (!usACs.has(r)) unresolved.add(r);
  }
  if (unresolved.size > 0) {
    failures.push(`User stories (reverse): the Deferred-Evidence AC Focus block is covered by ${unresolved.size} acceptance criterion/criteria this document never defines: ${[...unresolved].sort().join(', ')}. A deferred row covered by a criterion that does not exist is uncovered. Write the criterion, or point at one that exists.`);
  }
  return failures;
}

function checkUserStories(text, opts = {}) {
  const { mode = 'create', prdText = '' } = opts;
  const failures = [];
  const warnings = [];
  const perStory = [];

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
    const colocated = storyBlocks(text).some((block) => {
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
    const blocks = storyBlocks(text);

    // The 16 canonical risk categories. Each is matched by a stable leading label.
    // 12 original + 4 added 2026-09-30 (AC-depth work) because /test step-01 §1b
    // already asks "what breaks if things happen out of order" and "delayed", and
    // the design sweep had no slot to record the answer — so that risk could only
    // ever land downstream. Evidence for each addition:
    //   Write ordering      <- QA §1b.2 "out of order"
    //   Clock / time        <- QA §1b.2 "delayed"; step-03d's own worked example
    //                          cites "timer drift while backgrounded"
    //   Degraded capability <- step-03d worked example cites "clipboard API absent"
    //   Observability       <- nothing asked it anywhere; without it a behavior can
    //                          be correct and still be invisible in production
    const CATEGORIES = [
      { label: 'Invalid / malformed input', re: /Invalid\s*\/\s*malformed input/i },
      { label: 'Empty / boundary state', re: /Empty\s*\/\s*boundary state/i },
      { label: 'Duplicate / idempotency', re: /Duplicate\s*\/\s*idempotency/i },
      { label: 'Concurrency / race', re: /Concurrency\s*\/\s*race/i },
      { label: 'Write ordering / partial failure', re: /Write ordering\s*\/\s*partial failure/i },
      { label: 'Auth / permission', re: /Auth\s*\/\s*permission/i },
      { label: 'State / lifecycle', re: /State\s*\/\s*lifecycle/i },
      { label: 'External dependency failure', re: /External dependency failure/i },
      { label: 'Rate / abuse limits', re: /Rate\s*\/\s*abuse limits/i },
      { label: 'Data integrity', re: /Data integrity/i },
      { label: 'Clock / time', re: /Clock\s*\/\s*time/i },
      { label: 'Localization / encoding', re: /Localization\s*\/\s*encoding/i },
      { label: 'Accessibility / device', re: /Accessibility\s*\/\s*device/i },
      { label: 'Degraded capability', re: /Degraded capability/i },
      { label: 'Observability', re: /Observability/i },
      { label: 'Security', re: /Security/i },
    ];

    for (const block of blocks) {
      const idMatch = block.match(/Story ID:\s*\**\s*([A-Za-z0-9-]+)/i);
      const storyId = idMatch ? idMatch[1] : '(unnamed story)';

      // 1. The self-audit block header must be present, and must be a real
      // HEADING. A prose mention ("this story has no AC Coverage Self-Audit
      // yet") used to satisfy the check, because it was a bare substring search.
      const auditIdx = block.search(/^#{1,6}[ \t]*AC Coverage Self-Audit\b[^\n]*$/im);
      if (auditIdx < 0) {
        failures.push(`User stories: story ${storyId} is missing its "#### AC Coverage Self-Audit" heading — every story must reason about each risk category (see user-story-instructions.md §3.3). The gate checks reasoning, not AC count.`);
        continue;
      }
      // Bound the self-audit to its OWN block: from the heading to the next
      // heading at the same or higher level. Without this bound the audit text
      // runs to end-of-document and swallows later sections (UI/UX notes, the
      // document-level Deferred-Evidence block), whose AC references would then
      // be misread as this story's own and reported as dangling.
      const afterHeading = block.indexOf('\n', auditIdx);
      const rest = block.slice(afterHeading < 0 ? auditIdx : afterHeading);
      const nextHeading = rest.search(/\n#{1,6}\s+\S/);
      const auditText = nextHeading < 0 ? rest : rest.slice(0, nextHeading);
      // Scope AC definitions to the story's own body, up to the next story or
      // feature heading. Left unbounded, a criterion defined in a LATER section
      // satisfied this story's checks, and a criterion outside every story was
      // reported against whichever story happened to come first.
      const bodyEnd = block.search(/\n#{2,6}\s+(?:User Story|Feature|Epic|Story Dependencies|Deferred-Evidence)\b/i);
      const body = bodyEnd > 0 ? block.slice(0, bodyEnd) : block;
      const storyACs = definedACs(body);
      // For R5: how many categories resolved to a real reason with no AC, and what
      // those reasons were. A story that reasons about almost nothing is legal but
      // suspicious — the docs always said a human should challenge it, and nothing
      // ever asked one to. This is that ask, mechanised as a warning.
      const naReasons = [];
      let naCount = 0;

      // R1a — a story with no acceptance criteria at all is a defect. This is a
      // floor of ONE, not a quota: the anti-quota rule (no target count, no H/U/E
      // ratio) is preserved. A legitimately simple story still passes with one.
      if (storyACs.size === 0) {
        failures.push(`User stories: story ${storyId} defines no acceptance criteria — a story with no AC cannot be handed to @developer or @qa-engineer. Write at least one; depth beyond that follows the risk sweep, not a count.`);
      }

      // R1b — referential integrity. Every AC the self-audit cites must be one the
      // story actually defines. A dangling reference means the category was
      // "resolved" on paper against a criterion that does not exist.
      AC_REF_RE.lastIndex = 0;
      let ref;
      const dangling = new Set();
      while ((ref = AC_REF_RE.exec(auditText)) !== null) {
        if (!storyACs.has(ref[0])) dangling.add(ref[0]);
      }
      if (dangling.size > 0) {
        failures.push(`User stories: story ${storyId} self-audit cites acceptance criteria that the story does not define: ${[...dangling].join(', ')}. Every AC reference must resolve to a criterion in this story's Acceptance Criteria block.`);
      }

      // R2 — reverse mode only. Every defined AC must declare its evidence source.
      // [prototype L-NN] = witnessed in the prototype; [derived] = reasoned to
      // complete coverage. This is the mechanism that stops a derived criterion
      // from quietly inventing a product capability, so it is enforced, not advised.
      if (mode === 'reverse') {
        // Per CRITERION, not per line. Testing the whole line meant two criteria
        // on one line shared a single tag: "**AC-U1:** no tag **AC-E1:** [derived]"
        // passed, and AC-U1 shipped with no declared evidence source.
        const untagged = [];
        for (const line of body.split('\n')) {
          const marks = [];
          AC_DEF_RE.lastIndex = 0;
          let d;
          while ((d = AC_DEF_RE.exec(line)) !== null) {
            marks.push({ id: d[0].replace(/\*/g, '').replace(/:$/, ''), at: d.index, end: d.index + d[0].length });
          }
          if (marks.length === 0) continue;
          for (let i = 0; i < marks.length; i++) {
            // The window owned by this criterion: from the previous criterion's
            // end (or line start) to the next criterion's start (or line end).
            const from = i === 0 ? 0 : marks[i - 1].end;
            const to = i === marks.length - 1 ? line.length : marks[i + 1].at;
            if (!AC_TAG_RE.test(line.slice(from, to))) untagged.push(marks[i].id);
          }
        }
        if (untagged.length > 0) {
          failures.push(`User stories (reverse): story ${storyId} has acceptance criteria with no source tag: ${untagged.join(', ')}. Tag each AC \`[prototype L-NN]\` (witnessed in the prototype) or \`[derived]\` (reasoned to complete coverage) — see step-03d §5.`);
        }
      }

      for (const cat of CATEGORIES) {
        // 2. Each category label must appear in the self-audit.
        const line = auditText.split('\n').find((l) => cat.re.test(l));
        if (!line) {
          failures.push(`User stories: story ${storyId} self-audit is missing the "${cat.label}" category line (all ${CATEGORIES.length} categories must be addressed).`);
          continue;
        }
        // 3. The line must be RESOLVED: either it references an AC (AC-…) or it
        //    gives an "N/A because <reason>" with a real reason. A bare N/A, a
        //    placeholder in angle brackets, or an empty value fails — that is the
        //    signal that no reasoning happened.
        const value = line.replace(cat.re, '').replace(/^[\s:*\-|]+/, '').trim();
        const hasAcRef = new RegExp(AC_ID).test(value);
        const naMatch = value.match(/N\/?A\b\s*(?:because|:|-|—)?\s*(.*)$/i);
        const naReason = naMatch ? naMatch[1].trim() : '';
        const isPlaceholder = /^<.*>$/.test(value) || value === '' || /^(N\/?A)$/i.test(value);
        const resolved = hasAcRef || (naMatch && naReason.length >= 8 && !/^<.*>$/.test(naReason));
        // Collected for the smell detector (R5) — a warning channel, never a gate.
        if (resolved && !hasAcRef && naReason) naReasons.push(normalizeReason(naReason));
        if (isPlaceholder || !resolved) {
          failures.push(`User stories: story ${storyId} self-audit line "${cat.label}" is not resolved — it must name an AC (e.g. AC-U3) or give "N/A because <concrete reason>". A bare N/A, placeholder, or blank means the category was not actually reasoned about.`);
        }
      }

      // R5a — most categories reasoned away with no criterion at all.
      if (naReasons.length >= NA_HEAVY_THRESHOLD) {
        warnings.push(`User stories: story ${storyId} marks ${naReasons.length} of ${CATEGORIES.length} risk categories N/A with no acceptance criterion. That is legal — a simple story can be simple — but it is the exact pattern the instructions say a human must challenge, and nothing was asking one to. Re-read each reason and confirm this story really has no failure mode there.`);
      }
      perStory.push({ id: storyId, acCount: storyACs.size, naReasons });
    }
  }

  // R5b — the same N/A reason copy-pasted across stories is a template artefact,
  // not reasoning. One story's phrasing is fine; three is a smell.
  const reasonUse = new Map();
  for (const s of perStory) {
    for (const r of new Set(s.naReasons)) {
      if (!reasonUse.has(r)) reasonUse.set(r, []);
      reasonUse.get(r).push(s.id);
    }
  }
  for (const [reason, ids] of reasonUse) {
    if (ids.length >= REPEATED_REASON_THRESHOLD) {
      warnings.push(`User stories: the N/A reason "${truncate(reason)}" is used by ${ids.length} stories (${ids.join(', ')}). Identical reasons across stories mean the sweep was filled in rather than reasoned. Make each reason specific to that story.`);
    }
  }

  // R5c — a uniform AC count across every story is the "hit-a-quota" tell the
  // anti-quota rule warns about. Stories of differing complexity should
  // essentially never land on the same number.
  const distinctCounts = new Set(perStory.map((s) => s.acCount));
  if (perStory.length >= 3 && distinctCounts.size === 1) {
    warnings.push(`User stories: all ${perStory.length} stories define exactly ${[...distinctCounts][0]} acceptance criteria. A uniform count across stories of differing complexity is a tell that coverage was filled to a shape rather than reasoned. The gate will not force a number — vary it honestly.`);
  }

  failures.push(...checkStateModels(text));
  failures.push(...checkDeferredFocus(text, prdText, mode));

  return { failures, warnings };
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

  const result = { mode, requirements: {}, userStories: {}, failures: [], warnings: [] };

  // requirements.md
  let prdText = '';
  if (!fs.existsSync(reqPath)) {
    result.failures.push(`PRD: file not found: ${path.relative(root, reqPath)}`);
    result.requirements = { path: reqPath, found: false };
  } else {
    prdText = read(reqPath);
    const f = checkPRD(prdText, mode, root);
    result.requirements = { path: reqPath, found: true, failures: f };
    result.failures.push(...f);
  }

  // user-stories.md
  if (!fs.existsSync(usPath)) {
    result.failures.push(`User stories: file not found: ${path.relative(root, usPath)}`);
    result.userStories = { path: usPath, found: false };
  } else {
    const r = checkUserStories(read(usPath), { mode, prdText });
    result.userStories = { path: usPath, found: true, failures: r.failures, warnings: r.warnings };
    result.failures.push(...r.failures);
    result.warnings.push(...r.warnings);
  }

  const ok = result.failures.length === 0;

  if (args.json) {
    console.log(JSON.stringify({ ok, ...result }, null, 2));
  } else {
    // Warnings never change the exit code. They exist because the instructions
    // promised a human would challenge thin self-audit reasoning and nothing ever
    // asked one to; this is that ask, mechanised.
    for (const w of result.warnings) console.log(`  ! ${w}`);
    if (ok) {
      console.log('✓ template conformance: requirements.md + user-stories.md follow the canonical templates');
      if (result.warnings.length > 0) {
        console.log(`  (${result.warnings.length} reasoning smell(s) — see above. Not failures: re-read them and decide.)`);
      }
    } else {
      console.error(`✗ template conformance FAILED (${result.failures.length} issue${result.failures.length === 1 ? '' : 's'}) — mode=${mode}`);
      console.error('  The /design artifacts must follow the canonical templates (prd-template.md / user-story-template.md).');
      console.error('  A grounded-but-off-template document is not a valid substitute (SKILL.md "Canonical document contracts").');
      for (const msg of result.failures) console.error(`  - ${msg}`);
    }
  }

  process.exit(ok ? 0 : 1);
}

main();
