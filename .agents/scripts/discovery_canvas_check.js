#!/usr/bin/env node
/**
 * discovery_canvas_check.js — a mechanical gate for the four discovery canvases.
 *
 * WHY THIS EXISTS. `/root-cause`, `/empathy-map`, `/journey-map` and `/jtbd` each ship a SKILL.md
 * and nothing else: no step files, no gate, no tests. Each one defines its output as an inline
 * markdown template containing `{placeholder}` fields, and nothing anywhere stops that template being
 * written to disk verbatim.
 *
 * That is the same defect class as the `/design` finding where a user-stories document containing no
 * user stories satisfied the blocking gate — except here there is no gate at all, so it is strictly
 * worse. `artifacts/output/02-research/empathy-map.md` can ship as the template with
 * `{direct quotes}` and `{pain point}` in it, and no one reading it can tell.
 *
 * THE SECOND, DEEPER DEFECT. These four artifacts make claims about people. An empathy map asserts
 * what a user SAYS, THINKS and FEELS; a journey map asserts an emotional arc; a JTBD canvas asserts
 * what a user is trying to accomplish; a root-cause analysis asserts a causal chain. None of them
 * requires a pointer to a single real source. A document of entirely invented but plausible content
 * satisfies every structural rule in the template, because there is nothing in the template that
 * distinguishes research from a plausible story.
 *
 * So every canvas must now declare its `Evidence basis:` and, when that basis is a hypothesis, say
 * so. That one field is the difference between an artefact that reports what was learned and one
 * that dresses a guess up as a finding.
 *
 * SCOPE, deliberately narrow. `/brainstorming` is NOT served here: it already carries a Decision Gate
 * (GO/RESHAPE/NO-GO) and contract tests. This gate checks structure and evidence declaration, not
 * whether the analysis is any good — that is a human judgement, and the gate says so rather than
 * pretending otherwise.
 *
 * Exit 0 = conformant. Exit 1 = failures. Exit 2 = usage or IO error (fail-closed, never silent).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// --- shared vocabulary ------------------------------------------------------------------------

/** Placeholder shapes from the four templates: {x}, {{x}}, <x>, [x], TBD, TODO, N/A, ... */
const PLACEHOLDER_RE =
  /\{\{?[a-z][^}]*\}?\}|\[[a-z][^\]]{2,}\]|<[a-z][a-z _-]{2,}>|\b(?:TBD|TODO|FIXME|XXX|N\/?A)\b/i;

/** Evidence bases a canvas may declare. `hypothesis` is the honest one when nobody was asked. */
const EVIDENCE_BASES = [
  'interviewed',
  'observed',
  'analytics',
  'support-tickets',
  'survey',
  'hypothesis',
];
const EVIDENCE_LINE_RE = /^\s*(?:[-*]\s*)?\*\*Evidence basis:?\*\*:?\s*(.+)$/im;

/** Quote material, so a "Says" quadrant cannot be satisfied by a paraphrase alone. */
const QUOTED_RE = /[""“][^""“”]{8,}[""”]|\[[^\]]*https?:\/\/[^\]]*\]|https?:\/\/\S+/;

/** A sentence asserting a cause someone can act on and test. */
const TESTABLE_RE =
  /\b(because|caused by|due to|driven by|results? from|leads? to|root cause)\b/i;

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  } else {
    console.error(`✗ discovery_canvas_check: ${msg}`);
  }
  process.exit(2);
}

function readIf(p) {
  try {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  } catch (e) {
    return null;
  }
}

// --- helpers ----------------------------------------------------------------------------------

/** Every unfilled placeholder, with line numbers. Never just a count — a reviewer needs the line. */
function placeholders(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    const m = line.match(PLACEHOLDER_RE);
    if (m) out.push({ line: i + 1, token: m[0], context: line.trim().slice(0, 90) });
  });
  return out;
}

/**
 * Data rows of every markdown table in a section — headers and separators removed.
 *
 * Structural, not by keyword. The earlier version filtered headers with a list of literal words
 * (`#`, `Stage`, `When `), which meant a header reading anything else was counted as DATA: the jtbd
 * canvas reported "6 job statements carry no Type" from a document containing three, because the
 * header row and the Priority Matrix were being read as jobs. A row is a header because a separator
 * follows it, and that is the only reliable signal.
 */
function tableRows(sectionText) {
  const lines = String(sectionText).split('\n').filter((l) => /^\s*\|/.test(l));
  const isSep = (l) => /^\s*\|[\s:|-]+\|?\s*$/.test(l);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (isSep(lines[i])) { i += 1; continue; }
    if (i + 1 < lines.length && isSep(lines[i + 1])) { i += 2; continue; } // header + separator
    if (lines[i].replace(/[|\s]/g, '') !== '') out.push(lines[i]);
    i += 1;
  }
  return out;
}

/** Non-empty cells of a markdown table row, so a half-filled row is detectable. */
function cells(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
}

/**
 * The body of the first heading whose text matches `headingRe`, up to the next heading of the same or
 * higher level.
 *
 * Written as a line scan, and it PREFERS A SECTION HEADING OVER THE DOCUMENT TITLE. Asking for
 * "Root Cause" first matched the H1 "# Root Cause Analysis — checkout abandonment", whose body is the
 * entire document — so the check was reading the whole file instead of the section, and a root cause
 * that stated no cause at all passed. A title is not a section.
 *
 * The first version of this function was a single regex whose lookahead never matched, so it returned
 * null for every input and every section check reported "missing". A gate whose section lookup never
 * matches is a gate that rejects everything, which is how a real defect hides behind a loud one.
 */
function section(text, headingRe) {
  const lines = String(text).split('\n');
  const re = new RegExp(`^(\\s*)(#{1,6})\\s*${headingRe}`, 'i');
  const at = (i) => {
    const level = lines[i].match(re)[2].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const h = lines[j].match(/^(\s*)(#{1,6})\s/);
      if (h && h[2].length <= level) break;
      body.push(lines[j]);
    }
    return body.join('\n');
  };

  let best = -1;
  let bestLevel = 99;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const level = m[2].length;
    if (level >= 2 && level < bestLevel) { best = i; bestLevel = level; }
  }
  if (best !== -1) return at(best);
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return at(i); // only a level-1 title matched
  }
  return null;
}

function words(s) {
  return String(s || '')
    .replace(/[`*_>#|]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** The `Evidence basis:` declaration, or null. */
function evidenceBasis(text) {
  const m = text.match(EVIDENCE_LINE_RE);
  if (!m) return null;
  const raw = m[1].trim().toLowerCase();
  const found = EVIDENCE_BASES.find((b) => raw.includes(b));
  return found ? { basis: found, raw: m[1].trim() } : { basis: null, raw: m[1].trim() };
}

// --- per-kind checks --------------------------------------------------------------------------

const CHECKS = {
  'root-cause': (text) => {
    const failures = [];

    // The stopping rule in SKILL.md is "a root cause that, if fixed, would prevent recurrence". That
    // is a judgement with no test, and the classic 5-Whys failure is stopping at "a human was
    // careless" — which reads like a root cause and is not one. Require the chain to name a cause
    // and require the document to say how it would be confirmed.
    const chain = section(text, '(5\\s*Whys|Whys Chain)');
    if (!chain) {
      failures.push('No `## 5 Whys Chain` section. The chain is the analysis; without it this is an assertion.');
      return failures;
    }
    const levels = (chain.match(/^\s*\d+\.\s*\*{0,2}Why\?/gim) || []).length;
    if (levels < 3) {
      failures.push(
        `The 5 Whys chain has ${levels} level(s). SKILL.md sets a floor of 3 — a single "why" is ` +
        'an opinion, and two is a coincidence.'
      );
    }
    if (!TESTABLE_RE.test(section(text, 'Root Cause') || '')) {
      failures.push(
        'The `## Root Cause` section never states a cause. It needs a causal claim ("because", ' +
        '"caused by", "driven by") — a symptom restated at greater depth is not a root cause, and a ' +
        'chain that ends at "someone was careless" has stopped early.'
      );
    }
    const validation = section(text, '(Validation|Confirms?|Test(ing)? the (root )?cause|Evidence)');
    if (!validation || words(validation).length < 5) {
      failures.push(
        'No validation section. A root cause that cannot be checked is a belief. State how you would ' +
        'know it is the cause — the observation that would confirm it, or the experiment that would.'
      );
    }
    return failures;
  },

  'empathy-map': (text) => {
    const failures = [];
    const canvas = section(text, '(Empathy Canvas|Canvas)');
    if (!canvas) {
      failures.push('No `## Empathy Canvas` section. The four quadrants are the artifact.');
      return failures;
    }
    // All four quadrants must be populated. An empty "Thinks" quadrant is the most common real gap:
    // it is the hardest to fill honestly, so it is the one that gets skipped.
    for (const q of ['Says', 'Thinks', 'Does', 'Feels']) {
      if (!new RegExp(`\\b${q}\\b`, 'i').test(canvas)) {
        failures.push(`The empathy canvas has no ${q} quadrant. All four are required.`);
      }
    }
    const says = section(text, 'Says');
    const saysText = says || canvas;
    if (!QUOTED_RE.test(saysText)) {
      failures.push(
        'The `Says` quadrant contains no quoted material and no source link. Says is what the user ' +
        'verbalized — if there was no interview, say so and declare the basis as a hypothesis rather ' +
        'than writing a plausible paraphrase and presenting it as something a person said.'
      );
    }
    if (words(section(text, 'Pains')).length < 5) {
      failures.push('The `## Pains` section is empty. A map with no pains describes a product nobody has.');
    }
    if (words(section(text, 'Gains')).length < 5) {
      failures.push('The `## Gains` section is empty. Without gains this is a complaints list.');
    }
    return failures;
  },

  'journey-map': (text) => {
    const failures = [];
    const stages = section(text, '(Journey Stages|Stages)');
    if (!stages) {
      failures.push('No `## Journey Stages` section.');
      return failures;
    }
    const rows = tableRows(stages);
    if (rows.length < 3) {
      failures.push(
        `The journey has ${rows.length} stage(s). A journey map with fewer than 3 stages is a ` +
        'funnel diagram, and it hides the middle — where most friction actually lives.'
      );
    }
    // Every stage row must fill every column. A row with an empty Friction or Opportunity cell is
    // the most common way these get padded, and it makes the table look complete while saying nothing.
    for (const row of rows) {
      const c = cells(row);
      // Word characters, not length: `'😐'.length === 2` because of the surrogate pair, so a length
      // test read an emoji-only Emotion cell as substantive. The template invites exactly that
      // (`😃/😐/😟 {why}`) — an emotion with no reason attached is padding, and padding reads as
      // coverage.
      const empties = c.filter((x) => !/[A-Za-z0-9]{2,}/.test(x));
      if (empties.length) {
        failures.push(
          `Journey stage "${c[0] || '(unnamed)'}" has ${empties.length} empty column(s). Every stage ` +
          'needs a touchpoint, an action, an emotion, a friction and an opportunity — an empty cell is ' +
          'padding, and padding reads as coverage.'
        );
        break;
      }
    }
    if (!section(text, '(Emotional Arc)')) {
      failures.push('No `## Emotional Arc` section. Per-stage rows are not an arc — the arc is the shape across them.');
    }
    // The summary is a bold paragraph, not a heading, so reading the Emotional Arc section returned
    // the whole table and the word count never dropped — an arc with no summary passed. Require the
    // marker, then require it to say something.
    const arc = text.match(/^\s*\**\s*Arc summary:?\**\s*:?\s*(.+)$/im);
    if (!arc || words(arc[1]).length < 8) {
      failures.push(
        'The emotional arc has no summary sentence naming where it peaks, where it bottoms out, and ' +
        'the single stage that flips it. Per-stage rows are data; the shape across them is the finding.'
      );
    }
    if (words(section(text, '(Key Friction Points|Friction)')).length < 5) {
      failures.push('No `## Key Friction Points`. A journey map with no friction is a brochure.');
    }
    return failures;
  },

  'jtbd': (text) => {
    const failures = [];
    const jobs = section(text, '(Job Stories|Jobs to be Done)');
    if (!jobs) {
      failures.push('No `## Job Stories` section.');
      return failures;
    }
    const rows = tableRows(jobs).filter((r) => cells(r).length >= 3);
    if (rows.length < 1) {
      failures.push('The canvas contains no job statement. A JTBD canvas with zero jobs is an empty page.');
      return failures;
    }
    // All three clauses must be present and substantive. "When I use the product, I want it to work,
    // so I can be happy" satisfies the template and carries no information.
    for (const row of rows) {
      const c = cells(row);
      // Columns are [#, When, I want to, So I can, Type]. c[0] is the row NUMBER — checking it for
      // substance made every job look trivial, because '1' is one word. Caught by a conformant
      // fixture failing, which is the only reason a test fixture is worth writing honestly.
      const [when, want, so] = [c[1] || '', c[2] || '', c[3] || ''];
      if (words(when).length < 2 || words(want).length < 2 || words(so).length < 2) {
        failures.push(
          `Job ${c[4] || '(untyped)'} has an empty or trivial clause. A job statement needs a real ` +
          'context, a real functional action, and a real motivation — "whenever, to work, to be happy" ' +
          'fits the template and says nothing.'
        );
        break;
      }
    }
    const hmw = section(text, '(How Might We|HMW)');
    if (!hmw || tableRows(hmw).length < 1) {
      failures.push('No `## How Might We Opportunities` rows. A job with no opportunity attached is not yet actionable.');
    }
    // Every job must be typed. Functional/Emotional/Social is the distinction that stops a canvas
    // collapsing into a list of feature requests.
    const untyped = tableRows(jobs).filter((r) => {
      const c = cells(r);
      return !/functional|emotional|social/i.test(c[c.length - 1] || '');
    });
    if (untyped.length) {
      failures.push(
        `${untyped.length} job statement(s) carry no Type (Functional/Emotional/Social). Without the ` +
        'distinction the canvas collapses into a feature list.'
      );
    }
    return failures;
  },
};

// --- shared checks applied to every kind -------------------------------------------------------

function sharedChecks(text, kind) {
  const failures = [];

  const ph = placeholders(text);
  if (ph.length) {
    const sample = ph
      .slice(0, 4)
      .map((p) => `line ${p.line} ${p.token}`)
      .join('; ');
    failures.push(
      `${ph.length} unfilled template placeholder(s) remain (${sample}${ph.length > 4 ? '; …' : ''}). ` +
      'This document still contains the template. Replace each with real content, or delete the field — ' +
      'an artifact carrying its own instructions is not an artifact.'
    );
  }

  const ev = evidenceBasis(text);
  if (!ev) {
    failures.push(
      'No `**Evidence basis:**` declaration. Say where this came from — ' +
      `${EVIDENCE_BASES.join(' / ')}. A canvas that does not declare its basis cannot be read as ` +
      'research, and nothing downstream can tell your finding from your guess.'
    );
  } else if (!ev.basis) {
    failures.push(
      `**Evidence basis:** "${ev.raw}" is not one of: ${EVIDENCE_BASES.join(', ')}.`
    );
  } else if (ev.basis === 'hypothesis') {
    // A hypothesis is a legitimate basis. It becomes a problem only when it is not labelled as one
    // at the point of use — so require the word where the content is, not just in the header.
    const body = text.replace(EVIDENCE_LINE_RE, '');
    if (!/\bhypothes\w*|\bnot (?:yet )?validated\b|\bto validate\b|\bno (?:human )?(?:data|interviews?)\b/i.test(body)) {
      failures.push(
        'Evidence basis is `hypothesis`, but nothing in the body says so. Label the unvalidated ' +
        'content where it appears — a hypothesis announced only in a header reads as a finding three ' +
        'paragraphs later.'
      );
    }
  }

  if (!/^\s*\*\*Date:?\*\*/im.test(text)) {
    failures.push('No `**Date:**` field. A canvas with no date cannot be aged or superseded.');
  }

  return failures;
}

// --- main -------------------------------------------------------------------------------------

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

const USAGE = `Usage: node .agents/scripts/discovery_canvas_check.js check --kind <kind> --file <path> [--json]

  --kind   root-cause | empathy-map | journey-map | jtbd

Checks a discovery canvas for unfilled template placeholders, minimum structural
substance, and an honest \`**Evidence basis:**\` declaration.

Exit 0 = conformant · Exit 1 = failures · Exit 2 = usage/IO error (fail-closed).

This gate checks FORM and EVIDENCE DECLARATION. It cannot tell you whether the
analysis is correct — that is a human judgement, and a green result here is not a
research finding.`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.kind && !args.file)) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    failClosed(`unknown command "${cmd}" (expected "check")`, args.json);
  }
  if (!CHECKS[args.kind]) {
    failClosed(
      `unknown --kind "${args.kind}" (expected one of: ${Object.keys(CHECKS).join(', ')})`,
      args.json
    );
  }
  if (!args.file) failClosed('--file is required', args.json);

  const file = path.resolve(process.cwd(), args.file);
  const text = readIf(file);
  if (text === null) {
    failClosed(`cannot read ${args.file} — a missing canvas is a missing deliverable, never a pass`, args.json);
  }
  if (!String(text).trim()) {
    failClosed(`${args.file} is empty — an empty canvas is a failure, not a pass`, args.json);
  }

  const failures = [...sharedChecks(text, args.kind), ...CHECKS[args.kind](text)];

  const report = {
    kind: args.kind,
    file: path.relative(process.cwd(), file),
    ok: failures.length === 0,
    exit: failures.length ? 1 : 0,
    failures,
    note:
      'Form and evidence declaration only. A green result is not a research finding, and it says ' +
      'nothing about whether the analysis is correct.',
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else if (report.ok) {
    console.log(`✓ ${args.kind}: form and evidence declaration conformant — ${report.file}`);
    console.log('  This is not a research finding. Nothing here says the analysis is correct.');
  } else {
    const plural = failures.length === 1 ? '' : 's';
    console.error(`✗ ${args.kind}: ${failures.length} issue${plural} — ${report.file}`);
    for (const f of failures) console.error(`  - ${f}`);
  }
  process.exit(report.exit);
}

main();
