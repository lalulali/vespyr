#!/usr/bin/env node
/**
 * teaching_artifact_check.js — mechanical gate for /teach-me and /craft-lesson.
 *
 * WHY THIS EXISTS. Both skills declare a Done-when contract in prose and **nothing checked any of
 * it.** `grep -rln "teach-me\|craft-lesson" .agents/scripts/*.js` returned nothing, `grep` over
 * `tests/` returned nothing, and `artifacts/output/teaching/` did not exist — so a `/craft-lesson`
 * run that skipped the Knowledge Map, batched all six formats, or never recorded a single approval
 * produced exactly the same observable result as one that followed the workflow: none.
 *
 * WHAT IS CHECKED, AND WHAT DELIBERATELY IS NOT.
 *
 * The two skills make three different kinds of claim, and only two are checkable:
 *
 *   1. STRUCTURE of a produced artifact — sections exist, Bloom's tiers are tagged, anchors are
 *      present, citations resolve. Checkable, and checked here.
 *   2. SEQUENCING of a human workflow — "generate ONE format, present it, PAUSE for approval, only
 *      then continue." This is the skill's centrepiece and it is **not checkable**. A script cannot
 *      see a pause. What it CAN see is the evidence a pause leaves behind: the per-format
 *      `orchestrator_state.js complete` milestone. This gate checks the artifacts, not the pauses,
 *      and says so in its notes rather than pretending otherwise.
 *   3. QUALITY of the teaching — whether the analogy lands, whether the Bloom's tier is the right
 *      one, whether the citations support the claim. Needs a human. Recorded as a limit.
 *
 * THE RULE THIS GATE FOLLOWS, learned the hard way in this repo: check only what has a canonical
 * form the author can look up. A closed tag vocabulary (`[REMEMBER]`…`[CREATE]`), a declared
 * section list, and a citation syntax all qualify. Open prose does not — three gates built on
 * prose vocabulary in this session rejected honest work at 83%, 49% and 33% before they were
 * narrowed, and the cheapest response to such a rejection is to reword the sentence until it
 * passes, which teaches nothing and measures less.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

/** The six tiers /craft-lesson's Phase 3 declares. A closed set — nothing here is a judgement. */
const BLOOM_TIERS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];

/** The anchor phrase the skill declares, quoted from its own text. */
const ANCHOR_RE = /if nothing else,? remember this/i;

/** Placeholders that mean the artifact is still the template. */
const PLACEHOLDER_RE = /\{\{?[a-z][^}]*\}?\}|<[a-z][a-z _-]{2,}>|\b(?:TBD|TODO|FIXME|XXX)\b/i;

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  } else {
    console.error(`✗ teaching_artifact_check: ${msg}`);
  }
  process.exit(2);
}

/**
 * Remove fenced code blocks before any structural read.
 *
 * WHY (blind review, @qa-engineer + @code-reviewer): a fenced sample counted as a real section and as
 * real Bloom tags. A note could carry ```` ```\n## Table of Contents\n``` ```` — an example of a
 * heading — and satisfy the section rule with no such section in the document. A gate that reads
 * examples as content is reading the wrong document.
 */
function unfenced(text) {
  return String(text).replace(/^```[\s\S]*?^```/gm, '\n').replace(/^~~~[\s\S]*?^~~~/gm, '\n');
}

/** Words, ignoring markdown furniture. Used for reporting, never as a quality proxy. */
function wordCount(text) {
  return String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`|[\]()]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w)).length;
}

/**
 * Body of the heading matching `headingRe`, up to the next same-or-higher heading.
 *
 * The guard is the lesson from `brainstorming_session_check.js`: a heading pattern is interpolated
 * into an anchored regex, so an UNGROUPED alternation silently becomes `^(\s*)(#{1,6})\s*A|B|C` —
 * four alternatives, only the first anchored — and the bare `B` then matches anywhere with no
 * group 2. Callers pass `(?:A|B)`.
 */
function section(text, headingRe) {
  if (headingRe.replace(/\([^()]*\)/g, '').includes('|')) {
    throw new Error(`section(): headingRe "${headingRe}" contains an ungrouped alternation. Wrap it: "(?:A|B)".`);
  }
  const lines = String(text).split('\n');
  const re = new RegExp(`^(\\s*)(#{1,6})\\s*${headingRe}`, 'i');
  let hit = -1;
  let best = 99;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const level = m[2].length;
    if (level >= 2 && level < best) { hit = i; best = level; }
  }
  if (hit === -1) return null;
  const level = lines[hit].match(re)[2].length;
  const body = [];
  for (let j = hit + 1; j < lines.length; j++) {
    const h = lines[j].match(/^(\s*)(#{1,6})\s/);
    if (h && h[2].length <= level) break;
    body.push(lines[j]);
  }
  return body.join('\n');
}

/** A heading at any level, matched on a normalized form so numbering does not defeat it. */
function hasSection(text, re) {
  return String(text).split('\n').some((l) => /^#{1,6}\s/.test(l) && re.test(l.replace(/^#{1,6}\s*/, '')));
}

// ---------------------------------------------------------------------------------------------
// /craft-lesson — knowledge-map.md
// ---------------------------------------------------------------------------------------------

function checkKnowledgeMap(text) {
  const failures = [];
  const notes = [];

  const ph = text.split('\n')
    .map((l, i) => {
      const m = l.match(PLACEHOLDER_RE);
      return m ? { line: i + 1, token: m[0] } : null;
    })
    .filter(Boolean);
  if (ph.length) {
    failures.push(
      `${ph.length} unfilled template placeholder(s) remain (${ph.slice(0, 3).map((p) => `line ${p.line} ${p.token}`).join('; ')}). ` +
      'This is still the map template, not a map.'
    );
  }

  // ---- Bloom's tagging: Phase 3 says "Tag every objective with Bloom's Taxonomy Level" ----------
  // Tags are counted on LIST ITEMS, not anywhere in the document. The first version counted any
  // occurrence, so a map with zero tagged objectives passed by printing the tier legend once
  // ("[REMEMBER] … [CREATE]") — or by mentioning the tiers inside a code fence. A legend is not a
  // tagged objective, and `unfenced` is what stops the fence case.
  const body = unfenced(text);
  const objectiveLines = body.split('\n').filter((l) => /^\s*(?:[-*+]|\d+[.)])\s+/.test(l));
  const tiers = BLOOM_TIERS.filter((t) => objectiveLines.some((l) => new RegExp(`\\[${t}\\]`, 'i').test(l)));
  if (!tiers.length) {
    failures.push(
      `No Bloom's tier tag. Phase 3 requires every objective tagged with one of ` +
      `${BLOOM_TIERS.map((t) => `\`[${t}]\``).join(', ')} — an untagged map has not been sequenced, ` +
      'it has been listed.'
    );
  } else if (tiers.length < 3) {
    // A map whose every objective sits at one tier is not a progression. Three is the floor the
    // skill's own sequencing implies (Prerequisites -> Core -> Advanced), not a target to hit.
    failures.push(
      `Only ${tiers.length} Bloom's tier(s) used (${tiers.join(', ')}). Phase 3 sequences ` +
      'Prerequisites -> Core -> Advanced, which cannot be expressed in fewer than three tiers.'
    );
  }

  // ---- "If Nothing Else, Remember This" anchors, one per section -------------------------------
  if (!ANCHOR_RE.test(body)) {
    failures.push(
      'No "If Nothing Else, Remember This" anchor. Phase 3 requires a takeaway anchor per section — ' +
      'a map without them gives a reader no stated priority, which is the one thing a map is for.'
    );
  }

  // ---- sequencing: the three declared bands ----------------------------------------------------
  const bands = [
    ['prerequisite', /prerequisit|foundation|fundamental|basic|introduct/i],
    ['core', /\bcore\b|mechanic|intermediate|essential|main/i],
    ['advanced', /advanced|mastery|expert|deep|expert-level/i],
  ];
  // Broadened after review: `Foundation / Mechanics / Mastery` is the same three-band progression as
  // `Prerequisites / Core / Advanced`, and rejecting it rejected a correctly tagged map for its
  // vocabulary rather than its structure. The bands are a shape, not a phrase list.
  const missingBands = bands.filter(([, re]) => !re.test(body)).map(([n]) => n);
  if (missingBands.length === bands.length) {
    failures.push(
      'No prerequisite / core / advanced sequencing. Phase 3 declares "Prerequisites -> Core -> ' +
      'Advanced"; a map with none of the three is an outline, and formats generated from it have ' +
      'no ordering to follow.'
    );
  } else if (missingBands.length) {
    notes.push(
      `No "${missingBands.join('" or "')}" band found. The gate accepts a map that names at least one ` +
      'band, because section naming is the author\'s; confirm the sequencing is real before building ' +
      'formats from it.'
    );
  }

  notes.push(
    'NOT CHECKED: whether each objective is tagged at the RIGHT tier, whether the sequencing is ' +
    'pedagogically sound, and whether the anchors are worth remembering. Those need a human who ' +
    'knows the subject.'
  );

  return { failures, notes, tiers };
}

// ---------------------------------------------------------------------------------------------
// /teach-me — a saved learning note
// ---------------------------------------------------------------------------------------------

/**
 * The Deep Dive section list, quoted from the skill's Step 3C.
 *
 * Matched by stem, not by exact heading text: `Executive Overview & First Principles` and
 * `## 2. Executive Overview and First Principles` are the same section to any reader, and pinning
 * the ampersand would reject the second for no reason a learner would recognize.
 */
const NOTE_SECTIONS = [
  ['Table of Contents', /table of contents|^contents\b/i],
  ['Executive Overview / First Principles', /executive overview|first principles/i],
  // Step 3C declares SIX sections and the first version of this gate checked five — the same
  // count-vs-list defect the audit keeps finding, inside the gate written to catch it. "Deep-Dive
  // Technical/Domain Architecture (4-6 core sections)" is the one that was missing, and it is the
  // body of the note: without it the gate passed a note that was preamble and references only.
  ['Deep-Dive Technical / Domain Architecture', /technical|architecture|deep[- ]?dive|domain|mechanism|how it works|internals/i],
  ['Edge Cases, Trade-offs, or Common Pitfalls', /edge case|trade-?off|pitfall|limitation/i],
  ['Historical / Theoretical Context', /historical|theoretical|background|context/i],
  ['Active Recall / Self-Assessment', /active recall|self-assessment|self assessment|exercise/i],
];

function checkNote(text) {
  const failures = [];
  const notes = [];

  // The skill's own Done-when table claims "no unfilled template placeholders" for the note, and the
  // first version of this gate did not implement it — a note reading `# {Topic}` with `TODO: {rest}`
  // passed green. The claim was on the page and not in the code, which is the exact defect class this
  // whole audit exists to find.
  const body = unfenced(text);
  const ph = body.split('\n')
    .map((l, i) => { const m = l.match(PLACEHOLDER_RE); return m ? { line: i + 1, token: m[0] } : null; })
    .filter(Boolean);
  if (ph.length) {
    failures.push(
      `${ph.length} unfilled template placeholder(s) remain (${ph.slice(0, 3).map((x) => `line ${x.line} ${x.token}`).join('; ')}). ` +
      'This is still the note template, not a note.'
    );
  }

  const missing = NOTE_SECTIONS.filter(([, re]) => !hasSection(body, re)).map(([n]) => n);
  if (missing.length) {
    failures.push(
      `The note is missing ${missing.length} of the ${NOTE_SECTIONS.length} sections the Deep Dive ` +
      `template declares: ${missing.map((n) => `"${n}"`).join(', ')}. Step 3C lists them as the shape ` +
      'of a comprehensive note; a note without them is a long answer, not a reference.'
    );
  }

  // ---- citations: DNA 5 applies to teaching too -------------------------------------------------
  // Citations are read from the unfenced body, and `[0]` is NOT a citation — it is an array index.
  // A note containing `arr[0]` in a code block was told it had an unresolved citation; the reviewer
  // caught it. Numbered citations start at 1 by every convention this template uses.
  const inlineMarkers = body.match(/\[(\d+(?:\s*,\s*\d+)*)\]/g) || [];
  const citedNumbers = new Set(
    inlineMarkers.flatMap((m) => m.replace(/[[\]]/g, '').split(',').map((n) => n.trim())).filter((n) => Number(n) >= 1)
  );
  const inline = citedNumbers.size;
  const unverified = (body.match(/\[Source:\s*unverified\]/gi) || []).length;
  if (inline === 0 && unverified === 0) {
    failures.push(
      'No citations. The Deep Dive template requires "Historical / Theoretical Context & Footnote ' +
      'Citations [N]", and DNA 5 says a factual claim from a real source carries one. If nothing in ' +
      'the note came from a source, say so explicitly with `[Source: unverified]` rather than ' +
      'leaving every claim unmarked.'
    );
  } else if (inline > 0) {
    // A `[N]` with no matching footnote is a promise the reader cannot redeem.
    const footnotes = new Set((body.match(/^\[\^(\d+)\]/gm) || []).map((m) => m.replace(/[^\d]/g, '')));
    const cited = citedNumbers;
    // A numbered reference LIST is a second legitimate style — `## References` followed by `1. …`
    // entries resolves `[1]` exactly as a footnote block does. Both are accepted; the first version
    // of this check only knew about footnotes and left the list style as an unverifiable note, which
    // meant a note whose citations resolved to nothing at all still exited 0.
    // The numbered list is read INSIDE the references section only. The first version scanned the
    // whole note, so `1. What breaks if two leaders are elected?` under "Active Recall Scenarios"
    // satisfied `[1]` — a question in the exercises was resolving a citation in the body.
    // The heading vocabulary is wider than the first version's. `Works Cited`, `Citations` and
    // `Cited Sources` are the same section to any reader, and rejecting a note because it used the
    // MLA name for its reference list is rejecting form, not substance.
    const refBody = section(body, '(?:References?|Sources?|Bibliograph\\w*|Further Reading|Works Cited|Citations?|Cited Sources?|Endnotes?)');
    const numbered = new Set(
      ((refBody || '').match(/^\s*(\d+)[.)]\s+\S/gm) || []).map((m) => m.replace(/[^\d]/g, ''))
    );
    const resolves = (n) => footnotes.has(n) || numbered.has(n);
    const orphaned = [...cited].filter((n) => !resolves(n));
    if (orphaned.length) {
      failures.push(
        `${orphaned.length} inline citation(s) resolve to nothing (${orphaned.slice(0, 6).map((n) => `[${n}]`).join(', ')}). ` +
        'A marker is resolved by a `[^N]` footnote or by a numbered entry under a references heading. ' +
        'An inline marker with neither is a claim wearing the costume of a cited one.'
      );
    }
  }

  const words = wordCount(body);
  if (words < 800) {
    failures.push(
      `The note is ${words} words. The Deep Dive scope declares ~2,000–5,000, and below 800 this is ` +
      'not a reference note at all. Either it is really an Explain-scope answer that should not have ' +
      'been saved here, or it is unfinished.'
    );
  } else {
    // Deliberately a NOTE, not a failure. A 1,900-word note that says everything is better than a
    // 2,000-word one padded to clear a floor — and this repo has already measured what a hard word
    // floor does to honest work (`cycle_state_check`'s 58-word floor passes `word0 word1 … word57`).
    notes.push(
      `Length: ${words} words (declared target ~2,000–5,000). The gate does not enforce the ceiling ` +
      'or the floor beyond "this is a note", because padding to a number is the failure mode a word ' +
      'count cannot detect and does not prevent.'
    );
  }

  notes.push(
    'NOT CHECKED: whether the explanation is correct, whether the analogy lands, whether the ' +
    'active-recall questions test what the note taught, or whether the citations support the claims ' +
    'they sit beside. Those need a human who knows the subject.'
  );

  return { failures, notes };
}

// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kind') args.kind = argv[++i];
    else if (a === '--file') args.file = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

const USAGE = `Usage: node .agents/scripts/teaching_artifact_check.js check \\
  --kind <knowledge-map|note> --file <artifact.md> [--json]

knowledge-map: /craft-lesson Phase 3. Bloom's tier tags (>=3 distinct), an
               "If Nothing Else, Remember This" anchor, prerequisite/core/advanced
               sequencing, and no unfilled placeholders.
note:          /teach-me Deep Dive. The six declared sections, resolvable citations,
               and enough length to be a reference note rather than an answer.

NOT checked, by design: whether a /craft-lesson run paused for approval between
formats. A script cannot see a pause. Check the per-format milestone records instead.

Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file || !args.kind) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') failClosed(`unknown command "${cmd}" (expected "check")`, args.json);
  if (!['knowledge-map', 'note'].includes(args.kind)) {
    failClosed(`unknown --kind "${args.kind}" (expected knowledge-map or note)`, args.json);
  }

  const file = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(file)) {
    failClosed(
      `cannot read ${args.file} — a missing teaching artifact is a missing deliverable, never a pass`,
      args.json
    );
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) failClosed(`${args.file} is empty`, args.json);

  const { failures, notes, tiers } =
    args.kind === 'knowledge-map' ? checkKnowledgeMap(text) : checkNote(text);

  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          exit: failures.length ? 1 : 0,
          kind: args.kind,
          file: args.file,
          bloomTiers: tiers || undefined,
          notes,
          failures,
          note:
            'That the artifact is STRUCTURED — tagged, anchored, sectioned, citable — not that it ' +
            'teaches well.',
        },
        null,
        2
      ) + '\n'
    );
  } else if (failures.length) {
    console.error(`✗ ${args.kind}: ${failures.length} issue(s) — ${args.file}`);
    for (const f of failures) console.error(`  - ${f}`);
    for (const n of notes) console.error(`  note: ${n}`);
  } else {
    console.log(`✓ ${args.kind}: structure and disclosure conformant — ${args.file}`);
    for (const n of notes) console.log(`  note: ${n}`);
  }
  process.exit(failures.length ? 1 : 0);
}

if (require.main === module) main();

module.exports = { checkKnowledgeMap, checkNote, wordCount, BLOOM_TIERS };
