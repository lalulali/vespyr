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
/** A scenario word that stands in for having a scenario. */
const VACUOUS_SCENARIO_RE = /^\s*(?:general|various|all|any|whenever|normal|usual|everyday|typical|ongoing|daily(?: use)?|regular use|use of (?:the )?(?:product|tool|app|platform)|anything|something|somewhere|normal use|\w+ time)\s*\.?\s*$/i;

/** Severity, frequency, or priority - anything that makes one pain outrank another. */
// An HONEST "unknown" counts as a mark. It has to: on a hypothesis canvas the author frequently does
// not know how severe a pain is, and a check that accepts only high/medium/low would force them to
// invent a number to get a green result. That is the F-13 defect — a gate that rewards fabrication —
// rebuilt one rule later. Accepting `unknown` keeps the check asking the right question ("have you
// ranked this at all?") instead of one that cannot be answered honestly yet.
// NB: `TBD` is deliberately NOT in this list. The placeholder detector in this same file treats a
// bare `TBD` as an unfilled template field, so accepting it here would make the gate contradict
// itself — one rule would pass the document and the other would reject it, with no way for an author
// to satisfy both. The other tokens carry the same meaning and collide with nothing.
// Phrase-based rather than an enumerated word list: people write "severity unknown", "not yet
// ranked", "unrated", "we do not know yet" and all of them are the same honest answer. An
// enumerated list would reject the phrasing nobody thought of when it was written, and the cheapest
// response to that is to invent a severity — which is the failure this rule exists to prevent.
const UNKNOWN_SEVERITY_RE =
  /\b(?:unknown|unclear|unsure|un(?:validated|rated|known|quantified)|not (?:yet )?(?:known|ranked|validated|measured|determined|established))\b/i;
const SEVERITY_RE = new RegExp(
  '\\b(?:high|medium|low|critical|severe|blocker|blocking|p1|p2|p3|frequent(?:ly)?|occasional(?:ly)?|' +
  'rare(?:ly)?|top \\d+|\\d+\\s*(?:of|out of)\\s*\\d+|\\d+\\s*%|majority|most|nearly all)\\b|' +
  UNKNOWN_SEVERITY_RE.source.slice(2),
  'i'
);

const QUOTED_RE = /[""“][^""“”]{8,}[""”]|\[[^\]]*https?:\/\/[^\]]*\]|https?:\/\/\S+/;

/**
 * A sentence asserting a cause someone can act on and test.
 *
 * FOUND BY BLIND RUN 7, 2026-10-10 (Architect seat, confirmed by the orchestrator). The first
 * version matched four keywords: `because`, `caused by`, `due to`, `driven by`. Two failures, both
 * measured against real text:
 *
 *   "The export fails because someone was careless."                 -> ACCEPTED. Blame, passed.
 *   "The export worker never emits the completion event, so the      -> REJECTED. A real cause,
 *    client cannot distinguish success from failure."                   refused for using `so`.
 *
 * A keyword list is a proxy for "states a cause", and this proxy failed BOTH directions at once:
 * it let blame through and it rejected perfectly good causation. `so`, `which means`, `leading to`,
 * `therefore` and friends are causal connectives that engineers write every day.
 */
const TESTABLE_RE =
  /\b(?:because|caused by|due to|driven by|results? from|results? in|leads? to|leading to|so that|so the|which means|meaning that|therefore|hence|as a result|that is why|which is why|root cause)\b/i;

/**
 * The opposite check, added for the same run. SKILL.md already says a chain ending at "someone was
 * careless" has stopped early — but nothing enforced it, because blame phrased with `because`
 * satisfied the keyword list above. A rule stated in prose and checked by nothing is a rule the
 * cheapest path ignores.
 */
const BLAME_RE =
  /\b(?:someone was careless|was careless|were careless|not careful|wasn'?t careful|human error|negligence|did not pay attention|didn'?t pay attention|lack of attention|an oversight by|lack of ownership|nobody was)\b/i;

const { items } = require('./lib/list_items');

/**
 * Strip a markdown label from a field line, returning the value.
 *
 * `**Segment:** admins` puts the bold markers around the LABEL AND COLON, not around the whole
 * `Segment:` run. A pattern that expects the bold to wrap the whole run consumes `**Segment:` and
 * leaves `** admins` behind, because the first colon ends the label and the closing `**` survives.
 *
 * The trailing `**` then made the value unrecognisable to every check downstream: the vacuous-
 * scenario test was evaluating the string `"** general"` instead of `"general"`, so it never fired
 * and the defect it was written to catch passed silently. A parser bug here does not crash — it
 * quietly stops matching, which is the harder failure to notice.
 *
 * Strip leading decoration first, then the label plus any trailing markers, so all of
 * `**Segment:**`, `**Segment**:`, `**Segment** :` and `- Segment:` yield the bare value.
 */
function fieldValue(line, labelRe) {
  return String(line || '')
    .replace(/^\s+/, '')
    .replace(/^[-*+]\s+/, '')            // bullet, requiring trailing space so a value like
    .replace(/^[#*\s]+/, '')            // "-50% discount" is not mistaken for a list marker
    .replace(new RegExp(`^(?:${labelRe})\\b[\\*:\\s]*`, 'i'), '')
    .replace(/[*\s:]+$/, '')
    .trim();
}

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
    // FOUND BY BLIND RUN 7 (Architect seat, confirmed by the orchestrator). The first version required
    // the literal `\d+. Why?` with optional bold. A chain written in plain question form — `1. Why did
    // the admin not know?` — counted ZERO levels and failed a perfectly good analysis, while the
    // same chain in bold-arrow form passed. The counter was counting a formatting convention, not
    // chain depth.
    const levels = (chain.match(/^\s*\d+[.)]\s*\*{0,2}\s*Why\b/gim) || []).length;
    if (levels < 3) {
      failures.push(
        `The 5 Whys chain has ${levels} level(s). SKILL.md sets a floor of 3 — a single "why" is ` +
        'an opinion, and two is a coincidence.'
      );
    }
    const rootCause = section(text, 'Root Cause') || '';
    if (!TESTABLE_RE.test(rootCause)) {
      failures.push(
        'The `## Root Cause` section never states a cause. It needs a causal claim ("because", ' +
        '"caused by", "driven by") — a symptom restated at greater depth is not a root cause, and a ' +
        'chain that ends at "someone was careless" has stopped early.'
      );
    } else if (BLAME_RE.test(rootCause)) {
      // The keyword above was satisfied; this is the check that used to be missing. Blame is a cause
      // in grammar and not a cause in engineering: nothing downstream can act on "because someone
      // was careless", yet it passed this gate for the whole life of the rule.
      failures.push(
        'The `## Root Cause` section stops at blame. '+ BLAME_RE.exec(rootCause)[0].replace(/^\w/, (c) => c.toLowerCase()) +
        ' names a person, not a mechanism. SKILL.md says a chain ending here "has stopped early" — ' +
        'ask why the mechanism allowed it, and keep going until the answer is something you can change.'
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
    const caveats = [];

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
    // F-13 (blind /launch run 6, 2026-10-09): this requirement was UNCONDITIONAL, and the gate
    // therefore forced fabrication. An honest canvas declaring `Evidence basis: hypothesis` with no
    // interviews failed here — and the cheapest way to pass was to type a quote nobody ever said. The
    // agent running that audit refused and left the canvas red rather than invent a person.
    //
    // A gate that rewards a QUOTE STRING cannot tell a real quote from a typed one. Quotation is
    // evidence, and evidence is not something a text check can manufacture — so demanding it
    // unconditionally does not raise honesty, it lowers it.
    //
    // What is checkable is the HONESTY of the declaration: if nobody was interviewed, the basis must
    // say so, and the body must label the content as unvalidated. That is enforced in sharedChecks.
    // Here, only an INTERVIEWED/OBSERVED basis is required to carry quoted material.
    const ev = evidenceBasis(text);
    const claimsObservation = ev && ['interviewed', 'observed', 'support-tickets', 'survey'].includes(ev.basis);
    if (claimsObservation) {
      const saysText = section(text, 'Says') || canvas;
      if (!QUOTED_RE.test(saysText)) {
        failures.push(
          `The \`Says\` quadrant contains no quoted material and no source link, but the evidence ` +
          `basis is \`${ev.basis}\`. That basis claims someone was asked, so the quadrant must show ` +
          'what they said. If nobody was asked, change the basis to `hypothesis` and label the ' +
          'content as unvalidated — do not write a plausible paraphrase and present it as a quote.'
        );
      }
    }
    // ---- DEFECT: the canvas erases the distinction the skill itself draws ----
    // SKILL.md says "Says - what the user verbalizes? direct quotes" and "Thinks - what does the
    // user NOT say aloud? Inferred from behavior". It then renders all four quadrants as one table
    // with identical formatting, so a quoted sentence and the researcher's imagination of what
    // someone felt are visually and structurally indistinguishable.
    //
    // A map that cannot show which cells are evidence and which are inference is the exact failure
    // the Mom Test warns about: a guess wearing a transcript costume. This does NOT require new
    // content - it requires labelling what the author already knows is an inference.
    const canvasDeclaresInference =
      /^\s*\*\*(?:Inferred quadrants?|Inference|Inferred)\b/im.test(text) ||
      /\binferred\b|\binference\b/i.test(canvas);
    if (!canvasDeclaresInference) {
      failures.push(
        'The canvas never marks which quadrants are INFERENCE. This skill defines Thinks as "what ' +
        'the user does not say aloud - inferred" and Feels as emotional state; both are inferences ' +
        'about internal state, yet the table renders them beside the quoted material in `Says` with ' +
        'identical formatting. A reader cannot tell a person\'s words from your guess about their ' +
        'mind. Add `**Inferred quadrants:** Thinks, Feels` (or mark the cells inline). This asks for ' +
        'a label, not for new content.'
      );
    }

    // ---- DEFECT: "Segment: admins / Scenario: general" is not a persona ----
    //
    // The two checks below run UNCONDITIONALLY rather than inside an `else`. Gating them behind the
    // section-exists test made the section test unproved: disabling `!persona` sent every document
    // down the else branch, where an empty persona fails the segment check anyway, so the revert
    // produced identical output and no test could tell the two paths apart. A revert-proof that
    // cannot discriminate is not a revert-proof.
    const persona = section(text, 'User & Scenario|User and Scenario') || '';
    if (!persona) {
      failures.push('No `## User & Scenario` section. A canvas with no subject describes everybody.');
    }

    const segLine = persona.split('\n').find((l) => /\bsegment\b/i.test(l)) || '';
    const segBody = fieldValue(segLine, 'segment');
    if (words(segBody).length < 4) {
      failures.push(
        `The segment is "${segBody.trim() || '(empty)'}" - too broad to design for. A role name ` +
        'with nothing distinguishing it (size, tool, constraint, tenure) describes a population, not ' +
        'a person, and every downstream decision inherits the vagueness. State enough to tell this ' +
        'user from the neighbouring one.'
      );
    }

    const scnLine = persona.split('\n').find((l) => /\bscenario\b|\bcontext\b/i.test(l)) || '';
    const scnBody = fieldValue(scnLine, 'scenario|context');
    if (!scnBody.trim()) {
      failures.push('No **scenario**. A map without a specific moment is a portrait of nobody.');
    } else if (VACUOUS_SCENARIO_RE.test(scnBody)) {
      failures.push(
        `The scenario is "${scnBody.trim()}" - a stand-in for having one. Name the actual moment: ` +
        'when, doing what, with what at stake. "General" cannot be designed for.'
      );
    }

    // ---- DEFECT: `interviewed 1` was a full segment map ----
    // A low N is a REAL limitation, not a formatting failure - the interviews already happened and no
    // gate can conjure five more. So a missing N is a failure (undeclared) and a low N is a CAVEAT
    // (named limit). Failing on it would push authors to misstate the number, which is strictly worse.
    const evN = ev && ev.basis === 'interviewed' ? (ev.raw.match(/interviewed\s*\(?\s*n\s*=\s*(\d+)|interviewed\s*\(?\s*(\d+)/i) || []).slice(1).find(Boolean) : null;
    if (ev && ev.basis === 'interviewed' && !evN) {
      failures.push(
        'The evidence basis is `interviewed` but states no count. How many people is the whole basis ' +
        'of this map. State it: `interviewed 5`.'
      );
    } else if (evN && parseInt(evN, 10) < 5) {
      caveats.push(
        `This map rests on ${evN} interview${evN === '1' ? '' : 's'}. Below five, it is a description ` +
        'of those people, not of the segment - do not generalise from it without saying so. Recorded as ' +
        'a limit, not a failure: the interviews already happened, and no check can produce more of them.'
      );
    }

    // ---- DEFECT: four pains, no order of importance ----
    // /discovery-report compiles this map, and any design work downstream has to choose what to fix.
    // An unranked list hands that choice to whoever reads it first, silently.
    const painsSec = section(text, 'Pains') || '';
    const painLines = items(painsSec);
    const unranked = painLines.filter((l) => !SEVERITY_RE.test(l));
    if (painLines.length >= 2 && unranked.length === painLines.length) {
      failures.push(
        `${painLines.length} pains and not one carries a severity, frequency, or priority marker. ` +
        'A plain numbered list is document order, not importance - it hands the decision of what to ' +
        'fix first to whoever reads the list first. Mark each pain (high/medium/low, P1/P2, or how ' +
        'many users hit it).'
      );
    } else if (unranked.length) {
      failures.push(
        `${unranked.length} of ${painLines.length} pains carry no severity, frequency, or priority ` +
        `marker: ${unranked.slice(0, 2).map((l) => l.slice(0, 40)).join(' | ')}. Mark them all or the ` +
        'ordering is only half-decided.'
      );
    }

    const unknownSeverity = painLines.filter((l) => UNKNOWN_SEVERITY_RE.test(l) && !/\b(?:high|medium|low|critical|severe|p1|p2|p3)\b/i.test(l));
    if (unknownSeverity.length) {
      caveats.push(
        `${unknownSeverity.length} of ${painLines.length} pains are marked severity unknown. That is ` +
        'honest and it is allowed — but it means this map has not decided what matters most, and ' +
        'anything downstream inherits that indecision. Recorded, not failed: the author may genuinely ' +
        'not know yet.'
      );
    }

    if (words(section(text, 'Pains')).length < 5) {
      failures.push('The `## Pains` section is empty. A map with no pains describes a product nobody has.');
    }
    if (words(section(text, 'Gains')).length < 5) {
      failures.push('The `## Gains` section is empty. Without gains this is a complaints list.');
    }
    return { failures, caveats };
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

  // A kind check may return a bare failure array (the historical shape) or a richer
  // { failures, caveats } when it has true-but-non-blocking limits to name.
  const kindResult = CHECKS[args.kind](text);
  const kindFailures = Array.isArray(kindResult) ? kindResult : kindResult.failures;
  const caveats = Array.isArray(kindResult) ? [] : (kindResult.caveats || []);
  const failures = [...sharedChecks(text, args.kind), ...kindFailures];

  const report = {
    kind: args.kind,
    file: path.relative(process.cwd(), file),
    ok: failures.length === 0,
    exit: failures.length ? 1 : 0,
    failures,
    caveats,
    note:
      'Form and evidence declaration only. A green result is not a research finding, and it says ' +
      'nothing about whether the analysis is correct.',
  };

  if (args.json) {
    // stdout must be pure JSON here. An earlier version printed caveats to stderr unconditionally,
    // which is harmless to a human reading a terminal and corrupting to anything parsing stdout —
    // and the caveats are already IN the JSON payload, so it was duplicating them into the wrong
    // channel rather than surfacing anything new.
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else if (report.ok) {
    console.log(`✓ ${args.kind}: form and evidence declaration conformant — ${report.file}`);
    if (report.caveats.length) {
      const n = report.caveats.length;
      console.log(`  ${n} named limit${n === 1 ? '' : 's'} carried forward (this result is still a pass):`);
      for (const c of report.caveats) console.log(`  ! ${c}`);
    }
    console.log('  This is not a research finding. Nothing here says the analysis is correct.');
  } else {
    const plural = failures.length === 1 ? '' : 's';
    console.error(`✗ ${args.kind}: ${failures.length} issue${plural} — ${report.file}`);
    for (const f of failures) console.error(`  - ${f}`);
    // Caveats print on the RED path too. A caveat shown only on success is a caveat nobody reads
    // while the document is being rewritten — which is exactly when it would be actionable.
    for (const c of report.caveats) console.error(`  ! ${c}`);
  }
  process.exit(report.exit);
}

main();
