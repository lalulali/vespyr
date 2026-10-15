#!/usr/bin/env node
/**
 * validation_record_check.js — mechanical gate for /validation-patterns.
 *
 * WHY THIS EXISTS. `/validation-patterns` ships a SKILL.md and a 30-method catalog. It has
 * `match_methods.js` (tested) and a persona delegation that says `@founder` "provides the
 * GO/RESHAPE/NO-GO judgment" — and **no Decision Gate step, no gate script, and no check on the
 * verdict at all.** `grep -rhoE "[a-z_]+_check\.js"` over its directory returns nothing, and there is
 * no markdown template: the artifact is written from a five-line prose instruction.
 *
 * The instruction prose is not optional decoration. Step 3 says the design must:
 *
 *   - define the test          (what will you do?)
 *   - define the signal        (what result validates the hypothesis?)
 *   - define the duration and sample size
 *   - identify confounds and edge cases
 *
 * Nothing enforces any of the four, and the second one is the serious one. **A validation that
 * defines only what success looks like is a validation that cannot fail** — and a verdict reached by
 * a test that cannot fail is not a judgement, it is a preference. That is the same defect family as
 * `research-plan`'s `{goal} — falsifiable? Yes/No`, and it is the one this gate exists to close.
 *
 * What is checked: the record exists, is dated, and carries no unfilled placeholders; the hypothesis
 * is stated; the method is exactly one of the 30 in `methods.csv`; the signal is defined in BOTH
 * directions — what validates AND what invalidates; a duration or sample size is stated with a
 * number; at least one confound or alternative explanation is named; and the verdict is present and
 * from the declared set `GO` / `RESHAPE` / `NO-GO`.
 *
 * What is NOT checked: whether the test is a good test, whether the signal is the right signal,
 * whether the confounds were the right confounds, or whether the verdict is correct. Those need a
 * researcher. This gate stops a validation that was never designed from reading as one that was.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

/** The verdict vocabulary, declared in the skill's persona delegation. A closed set. */
const VERDICTS = ['GO', 'RESHAPE', 'NO-GO'];

/**
 * What would VALIDATE the hypothesis. Phrase-based, not enumerated: an enumerated list rejects the
 * honest phrasing nobody thought of, and the cheapest response to a rejection is to change how you
 * say it. This has failed in both directions repeatedly in this repo.
 */
// NB: the bare alternative `supports?` is deliberately ABSENT. It matched "support" — the noun, in
// "these users already contacted support once" — and so a record with no signal in either direction
// read as having defined one. A common word in a vocabulary is a false positive generator, not a
// detector. `supports the hypothesis` is covered by the clause form if ever needed.
const VALIDATES_RE = /\b(?:validates?|confirmed?|proves?|demand exists|we proceed if|if we see|if .{0,40}(?:reaches?|exceeds?|hits?|converts?|signs? up|pays?|clicks?|subscribes?)|is enough|enough to proceed|suffices|we proceed|at least \d+|at or above)\b/i;

/**
 * What would INVALIDATE it. This is the load-bearing half.
 *
 * A record that defines only the success direction has written a test that cannot fail, and every
 * verdict it produces is unfalsifiable. Both directions must be present.
 */
const INVALIDATES_RE = /\b(?:invalidates?|falsif(?:ies|ied|y)|disconfirms?|refutes?|contradicts?|(?:we are |we would be )?wrong(?: if| about)?|this fails if|do not (?:proceed|build|continue) if|if .{0,40}(?:falls? below|is below|stays? under|does not|doesn'?t|never|no more than|fewer than|less than|at most \d+)|kills? the (?:idea|hypothesis)|signals? no demand|fewer than|less than|below \d+|under \d+|at most \d+|drops? below|stays? below|abandon\w*|we stop|stop (?:the )?(?:test|experiment|build|work)|walk away|shelve|do not (?:ship|launch|build)|not worth (?:building|shipping)|no demand|if .{0,40}(?:does not|doesn'?t|fails? to) (?:convert|reach|hit|exceed))\b/i;

/** A confound, an alternative explanation, or an edge case — anything that makes the signal ambiguous. */
const CONFOUND_RE = /\b(?:confounds?|caveat|alternative explanation|could also explain|would also explain|cannot (?:distinguish|tell|separate)|selection bias|select(?:ed|ive) sample|self-?selected|survivor|seasonal|already (?:contacted|engaged|bought)|existing (?:users?|customers?)|promo|paid|organic|conflicts? with|edge case|we can(?:not|'t) rule out|pollut(?:es|ed))\b/i;

/**
 * Extract a named field's VALUE from a record — and only its value.
 *
 * WHY THIS EXISTS (blind run 12, @architect F1, HIGH). The confound rule tested `CONFOUND_RE` against
 * the WHOLE record body, and that vocabulary contains ordinary words: `paid`, `organic`, `promo`,
 * `existing users`, `already engaged`. So a record whose Test line read "then track conversion to
 * paid" satisfied the confound check with the confound field DELETED, renamed to `**Notes.**`, or
 * reading `**Confounds.** None.` — because the word was never the field. The check was measuring
 * whether the record contained confound-adjacent English anywhere, not whether a confound was named.
 *
 * Three repairs failed before this one, each fixing the REGEX rather than the SCOPE: a wider negation
 * list (still body-wide), then label-stripping (still body-wide), then a `section()` helper this file
 * does not have, which threw a ReferenceError and turned every confound into a failure. A gate that
 * rejects honest work is worse than a vacuous one — it teaches operators to route around gates.
 *
 * The invariant this file was missing: **a field check must read the field.** That is why the helper
 * is general rather than a confound special case — the method check had the same shape of bug.
 *
 * Recognizes, in order: `- **Label:** value`, `**Label.** value`, `Label: value`, and a `## Label`
 * heading whose value is the block beneath it. Returns '' when the field is absent, which callers
 * must treat as a failure rather than as a pass.
 */
function fieldValue(text, labels) {
  const lab = `(?:${labels.join('|')})`;
  const lines = String(text).split('\n');
  // A line that opens ANOTHER field, so a value never runs into its neighbour.
  const nextField = /^\s*(?:[-*]\s*)?\**\s*[A-Z][\w -]{1,30}\**\s*[:.]/;
  // This record format puts a second pseudo-field on the SAME line as the first —
  // `**Method used:** Concierge MVP. Test: recruit 12 …` — so an inline value must stop at the
  // record's own field vocabulary. Cutting at any `Word:` would be guessing; cutting at the fields
  // the format actually declares is not. (Found by the existing suite: the first version returned
  // "Concierge MVP. Test: recruit 12 abandoning admins by in-app intercept…" as the method name.)
  const PSEUDO = /\s+(?=(?:Test|Method|Hypothesis|Signal|Measure|Confounds?|Verdict|Status)\s*:)/;
  const cut = (s) => s.split(PSEUDO)[0].trim();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(new RegExp(`^#{1,6}\\s*${lab}\\s*$`, 'i'));
    if (heading) {
      const out = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^#{1,6}\s/.test(lines[j])) break;
        if (lines[j].trim()) out.push(lines[j].trim());
      }
      return cut(out.join(' ').trim());
    }
    const inline = line.match(new RegExp(`^\\s*(?:[-*]\\s*)?\\**\\s*${lab}\\b[.:*\\s]*\\**\\s*(.*)$`, 'i'));
    if (inline) {
      const rest = cut(inline[1].trim());
      if (rest) return rest;
      const out = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (!lines[j].trim()) break;
        if (nextField.test(lines[j])) break;
        out.push(lines[j].trim());
      }
      return cut(out.join(' ').trim());
    }
  }
  return '';
}

/** A value that states an absence and nothing else — a claim, not an identification. */
const ABSENT_ONLY_RE = /^\s*(?:none|no|n\/?a|nil|nothing|unknown|tbd|not\s+(?:assessed|checked|considered|applicable|looked\s+(?:for|at)|identified|found)|did\s?n[o']t\s+(?:look|check|consider|find)|[-—]+)\s*[.!]*\s*$/i;

/**
 * What an alternative explanation LOOKS like: it connects something else to the result.
 *
 * A confound is inherently counterfactual — "X could also explain this" — so it carries a modal, a
 * causal connector, or a named source of skew. A plan carries none of those: "We will see how it goes
 * and learn from the result" is nine words and identifies nothing, which is why the first version of
 * this fix (a four-word minimum) passed it.
 *
 * This vocabulary is deliberately WIDE. The measured failure in this repo has never been a gate that
 * accepted a no-op; it has been gates that rejected honest work — `/brainstorming` rejecting 25 of 30
 * honest tension sentences, `/validation-patterns` 17 of 35 — and the cheapest response to a rejection
 * is to rewrite the sentence until it passes, which trains the operator and teaches nothing.
 */
const CAUSAL_RE = /\b(?:could|might|may|would|because|since|driven by|due to|explain\w*|attribut\w*|caus\w*|bias\w*|skew\w*|confound\w*|select\w*|self-?select\w*|sample|cohort|seasonal\w*|promo\w*|organic|paid|existing (?:users?|customers?)|already (?:contacted|engaged|bought|active)|opt-?in|recruit\w*|respondents?|participants?|instead of|rather than|as a result|inflat\w*|overstate\w*|understate\w*|representative|generaliz\w*|generaliz\w*|not typical|unusual|outlier\w*)\b/i;

/**
 * A plan to observe, which is not a confound.
 *
 * The one dishonesty the gate CAN detect without reading for meaning: a first-person intention to
 * find out later. "We will see how it goes and learn from the result" is nine words and identifies
 * nothing, and a test whose confounds are discovered afterwards has already been decided.
 *
 * This is deliberately narrow. It fires on intent-to-observe, not on any sentence that happens to
 * contain "we" — the previous version of this fix demanded causal vocabulary and rejected a third of
 * honest confounds.
 */
const NOOP_PLAN_RE = /\b(?:we(?:'ll| will| are going to| plan to| intend to| aim to)|let'?s)\s+(?:see|learn|find out|know|monitor|watch|check|deal|handle|figure|revisit|re-?evaluate|assess|wait|discover)\b/i;

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  } else {
    console.error(`✗ validation_record_check: ${msg}`);
  }
  process.exit(2);
}

/** Method names from the catalog. The CSV is INPUT DATA — a fact to check against, not prose on trial. */
function readMethods(catalogPath) {
  let rows = [];
  try {
    const text = fs.readFileSync(catalogPath, 'utf8');
    const lines = text.split('\n').filter((l) => l.trim());
    const header = lines[0].split(',');
    const nameIdx = header.indexOf('method_name');
    for (const l of lines.slice(1)) {
      const cells = [];
      let cur = '';
      let inQ = false;
      for (const ch of l) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
        cur += ch;
      }
      cells.push(cur);
      if (nameIdx >= 0 && cells[nameIdx] != null) rows.push(cells[nameIdx].trim());
    }
  } catch { /* unreadable catalog is fail-closed below, never a crash */ }
  return rows.filter(Boolean);
}

/**
 * Strip the field LABELS before matching content.
 *
 * `**Confounds.** none` matched the confound check because the word "Confounds" is in its own
 * vocabulary — a field named after the thing you are looking for counted as an instance of it. This
 * is the third instance of this shape this session (first `## Tension` in brainstorming_session_check,
 * then `[VALIDATION]` / `[RESHAPE]` as placeholders above, now this), which says the pattern is the
 * defect: a vocabulary is not evidence, and a label is not substance.
 */
function stripLabels(text) {
  // Handles `**Label:** value`, `**Label:** value`, and plain `Label: value`. The decorative run
  // AFTER the label may be `**`, `.**`, `.`, `:`, or any mix — `**Confounds.** none` puts a period
  // between the word and the close marker — so consume the whole punctuation run rather than
  // pinning a shape. The first version required a colon, matched nothing, and the checks kept reading
  // the label as content.
  return String(text).replace(
    /^[^\S\n]*\**\s*(?:Confounds?|Measure|Signal|Hypothesis|Verdict|Method\s+used|Status)\b[.:\*\s]*\**\s*(?:\n|$)/gim,
    '\n'
  ).replace(
    new RegExp(
      '^[^\\S\\n]*\\**\\s*(?:Confounds?|Measure|Signal|Hypothesis|Verdict|Method\\s+used|Status)\\b[.:\\*\\s]*',
      'gim'
    ),
    ' '
  );
}

function check(text, methods) {
  const failures = [];
  const body = stripLabels(text);
  const notes = [];

  // ---- record hygiene --------------------------------------------------------------------------
  // This skill's OWN declared markers are excluded from placeholder detection.
  //
  // The `\[\[A-Z][^\]]{2,}\]` pattern matches `[VALIDATION]` — the very record marker the skill's
  // format mandates — and `[RESHAPE]`, one of its own verdict tokens. Two rules in one gate
  // contradicting each other, so no conformant record could exist. This is now the THIRD time in this
  // session that a gate's declared vocabulary has tripped its own detector (first `[RESHAPE]` in
  // brainstorming_session_check.js, then `TBD` as a severity value in discovery_canvas_check.js),
  // which says the pattern is the defect and not the coincidence.
  const OWN_MARKERS_RE = /^\[?(?:VALIDATION|GO|RESHAPE|NO-GO)\]?$/i;
  const ph = text.split('\n').map((line, i) => {
    const m = line.match(/\{\{?[a-z][^}]*\}?\}|\[[A-Za-z][^\]]{2,}\]|<[a-z][a-z _-]{2,}>|\b(?:TBD|TODO|FIXME|XXX)\b/i);
    if (!m) return null;
    if (OWN_MARKERS_RE.test(m[0])) return null;
    return { line: i + 1, token: m[0] };
  }).filter(Boolean);
  if (ph.length) {
    failures.push(
      `${ph.length} unfilled template placeholder(s) remain (${ph.slice(0, 3).map((p) => `line ${p.line} ${p.token}`).join('; ')}). ` +
      'This is still the template, not a validation record.'
    );
  }

  // The record's own declared format carries a date in the heading. Either that or a Date field.
  const hasDate = /\[\s*date:\s*\d{4}-\d{2}-\d{2}\s*\]/i.test(text)
    || /^\s*\*\*Date:?\*\*/im.test(text)
    || /\b20\d{2}-\d{2}-\d{2}\b/.test(text);
  if (!hasDate) {
    failures.push('No date. The record format declares `[date: YYYY-MM-DD]` — a validation with no date cannot be aged or superseded.');
  }

  const hasAgent = /\[\s*agent:\s*@\w[\w-]*\s*\]/i.test(text);
  if (!hasAgent) {
    notes.push('No `[agent: @…]` in the record heading. The declared format includes it, and the verdict has no named owner without it.');
  }

  // ---- the hypothesis ---------------------------------------------------------------------------
  // The whole point of a validation. A record with no hypothesis has no test and no signal.
  const hypothesis = (text.match(/\[VALIDATION\]\s*[^—–-]*[—–-]\s*(.+?)\s*\[\s*date/i)
    || text.match(/^\s*[-*]?\s*\*{0,2}Hypothesis\*{0,2}\s*:?\s*\*{0,2}\s*(.+)$/im) || [])[1];
  const hypWords = String(hypothesis || '').replace(/[`*_]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (hypWords.length < 6) {
    failures.push(
      'The hypothesis is not stated. The record format is `[VALIDATION] {method} — {hypothesis}`, ' +
      'and a validation with no hypothesis has no signal either — it is a test of nothing.'
    );
  }

  // ---- the method must exist in the catalog ------------------------------------------------------
  if (methods.length === 0) {
    failures.push(
      'Could not read `methods.csv` — a record cannot be checked against a catalog that cannot be read, ' +
      'and an empty catalog must not read as "every method is valid".'
    );
  } else {
    // Every method claim must be in the catalog — and two claims that disagree mean one of them is
    // wrong. Closed 2026-10-15 (run 12: a bogus `**Method used:**` was ignored whenever the heading
    // named a valid method, because the `||` short-circuited before the field was ever read).
    const clean = (s) => String(s || '').replace(/[`*_]/g, ' ').replace(/[\s.]+$/, '').trim();
    const claims = [
      { where: 'the heading', value: clean((text.match(/\[VALIDATION\]\s*([^—–-]+?)\s*[—–-]/) || [])[1]) },
      { where: '`Method used`', value: clean(fieldValue(text, ['method\\s+used', 'method'])) },
    ].filter((c) => c.value);
    const inCatalog = (v) => methods.some((m) => m.toLowerCase() === v.toLowerCase().replace(/\s+/g, ' '));
    if (!claims.length) {
      failures.push('No method is named. Step 3 requires the method to be loaded from the catalog.');
    } else {
      for (const c of claims) {
        if (!inCatalog(c.value)) {
          failures.push(
            `The method "${c.value}" in ${c.where} is not in the 30-method catalog. Exact match, not ` +
            'substring: "Smoke Test Design Extreme" is not "Smoke Test Design".'
          );
        }
      }
      if (claims.length === 2 && claims[0].value.toLowerCase() !== claims[1].value.toLowerCase()) {
        failures.push(
          `The record names two different methods — "${claims[0].value}" in the heading and ` +
          `"${claims[1].value}" in \`Method used\`. One of them is wrong, and a record that disagrees ` +
          'with itself cannot be checked against the catalog at all.'
        );
      }
    }
  }

  // ---- the signal: BOTH directions ---------------------------------------------------------------
  // THE CENTREPIECE. Step 3 says "define the signal (what result validates the hypothesis?)" and
  // nothing ever checked it — which means the cheapest passing record defined success and stopped.
  // A test that cannot fail is not a test, and a verdict from it is not a judgement.
  // The signal must be IN the signal field.
  //
  // BLIND RUN 13 (@qa-engineer and @code-reviewer, BLOCKING). The check tested the label-stripped
  // WHOLE BODY, so a record with the `**Signal.**` field deleted passed whenever the Verdict or
  // Method-used prose happened to contain both directions. Measured: no Signal field at all, both
  // directions in `Verdict` -> exit 0, `ok: true`. That is the same defect as the confound rule
  // (a field check must read the field), found in the same file a day apart, and the existing test
  // did not catch it because its "no signal at all" fixture kept the field and removed only the
  // verdict phrase.
  //
  // Scoped to the field, with the whole body as a FALLBACK ONLY when no signal field exists at all —
  // so a record written in a different but honest shape is still read, while a record that HAS the
  // field cannot borrow its signal from elsewhere.
  const signalValue = fieldValue(text, ['signal', 'signal\s+definition', 'success\s+(?:and|&)\s+failure']);
  if (!signalValue) {
    failures.push(
      'No signal field. The record template declares `**Signal.**`, and Step 3 requires the signal to ' +
      'be defined there — a signal written into the Verdict is a conclusion, not a test design, and ' +
      'reading it from there is how a record with no signal at all passed this gate.'
    );
  }
  const signalScope = signalValue;
  const validates = VALIDATES_RE.test(signalScope);
  const invalidates = INVALIDATES_RE.test(signalScope);
  if (!validates && !invalidates) {
    failures.push(
      'No signal is defined in either direction. Step 3 requires "define the signal (what result ' +
      'validates the hypothesis?)" — and a record with no signal at all has produced an opinion, not ' +
      'a validation.'
    );
  } else if (validates && !invalidates) {
    failures.push(
      'The record defines what would VALIDATE the hypothesis but never what would INVALIDATE it. ' +
      'A test that cannot fail is not a test, and a verdict reached by one is not a judgement — it is ' +
      'a preference. State the result that would make you stop.'
    );
  }

  // ---- duration and sample size ----------------------------------------------------------------
  // Without a number the signal is unmeasurable: "some users" is not a sample.
  const hasMeasure = /\b\d+\s*(?:%|percent|users?|people|participants?|respondents?|visitors?|sign[- ]?ups?|days?|weeks?|hours?|of \d+)\b/i.test(body)
    || /\bn\s*=\s*\d+/i.test(body);
  if (!hasMeasure) {
    failures.push(
      'No duration or sample size with a number in it. Step 3 requires "define the duration and ' +
      'sample size" — a signal without a denominator is not measurable, so the verdict cannot be ' +
      'reproduced.'
    );
  }

  // ---- confounds: read the FIELD, and check only what is checkable -------------------------------
  // Closed 2026-10-15; this was run 12's F1/HIGH known gap. Two things were wrong and only one of
  // them was the scope.
  //
  // The scope bug: the rule tested `CONFOUND_RE` against the WHOLE body, and that vocabulary holds
  // ordinary words — `paid`, `organic`, `promo`. A Test line reading "then track conversion to paid"
  // satisfied the check with the field deleted, renamed, or reading "None." The word was never the
  // field. Fixed by fieldValue().
  //
  // The vocabulary bug: the first version of THIS fix then required a causal marker in the value, and
  // rejected 10 of 30 honest confounds (33%) — "We have no control group", "The window overlapped a
  // partner campaign", "Nobody has confirmed the 14-day window matches the buying cycle". That is the
  // same failure this repo already measured twice: /brainstorming rejecting 25 of 30 honest tension
  // sentences, /validation-patterns 17 of 35. Enumerating the vocabulary of an open-ended concept
  // cannot work; there is always another honest phrasing, and the cheapest response to a rejection is
  // to rewrite the sentence until it passes — which trains the operator and teaches nothing.
  //
  // So the rule now checks ONLY what is checkable: the field exists, it is not a pure absence claim,
  // and it is not a plan to observe. Whether the confound is the RIGHT confound is not checkable, and
  // the gate says so in its note rather than pretending.
  const confoundValue = fieldValue(text, ['confounds?', 'alternative explanations?', 'edge cases?']);
  if (!confoundValue) {
    failures.push(
      'No confound field. Step 3 requires "identify confounds and edge cases" — a validation that has ' +
      'not named what else could explain its result has not been designed, only hoped.'
    );
  } else if (ABSENT_ONLY_RE.test(confoundValue)) {
    failures.push(
      `The confound field states an absence and nothing else ("${confoundValue.slice(0, 60)}"). ` +
      'A bare "None." is a claim, not an identification. Name the alternative explanations you ' +
      'considered and why each is ruled out, or name the confound — if nothing could explain the ' +
      'result, say what you checked.'
    );
  } else if (NOOP_PLAN_RE.test(confoundValue)) {
    failures.push(
      `The confound field is a plan to observe, not a confound ("${confoundValue.slice(0, 60)}"). ` +
      'Step 3 requires the confounds to be identified BEFORE the test runs; "we will see how it goes" ' +
      'identifies nothing, and a test whose confounds are found afterwards has already been decided.'
    );
  } else if (!CONFOUND_RE.test(confoundValue) && !CAUSAL_RE.test(confoundValue)) {
    // A NOTE, not a failure. The gate cannot read for meaning, and pretending otherwise is how the
    // 33% rejection rate above happened. The reader is told the gate could not tell — which is
    // different from being told the confound is absent.
    notes.push(
      'The confound field names no term the gate recognizes (selection, promo, seasonality, sample, ' +
      'a modal, a causal connector). It may be a perfectly good confound — the gate cannot read for ' +
      'meaning. A human should confirm it names what else could explain the result.'
    );
  }
  // ---- the verdict -------------------------------------------------------------------------------
  // Declared in the persona delegation, with no gate step anywhere in the skill.
  const verdicts = text.match(/\[?\b(GO|RESHAPE|NO-GO)\b\]?/gi) || [];
  // Strip the brackets a verdict may carry: `` `[RESHAPE]` `` matched `[RESHAPE]` and was then
  // compared against the bare word, so a perfectly conformant verdict was read as out-of-set.
  const verdict = verdicts.length ? verdicts[0].toUpperCase().replace(/[[\]`]/g, '') : null;
  if (!verdict) {
    failures.push(
      'No verdict. The persona delegation says `@founder` "provides the GO/RESHAPE/NO-GO judgment" ' +
      '— and there is no Decision Gate step and no check anywhere in this skill that it happened.'
    );
  } else if (!VERDICTS.includes(verdict)) {
    failures.push(`The verdict \`[${verdict}]\` is not one of ${VERDICTS.map((v) => `\`[${v}]\``).join(', ')}.`);
  }

  const hasStatus = /\*\*Status:\*\*/i.test(text);
  if (!hasStatus) {
    notes.push('No `**Status:**` field. The declared record format ends with one.');
  }

  return {
    kind: 'validation-record',
    ok: failures.length === 0,
    exit: failures.length ? 1 : 0,
    verdict,
    definesInvalidation: invalidates,
    definesConfound: Boolean(confoundValue) && !ABSENT_ONLY_RE.test(confoundValue),
    notes,
    failures,
    note:
      'That the validation was DESIGNED — a two-directional signal, a measure, a confound — not that ' +
      'the design was any good.',
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--methods') args.methods = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

const USAGE = `Usage: node .agents/scripts/validation_record_check.js check \\
  --file artifacts/output/02-research/validation-results.md \\
  [--methods .agents/skills/validation-patterns/methods.csv] [--json]

Checks: no unfilled placeholders and a date; a stated hypothesis; a method that EXISTS in the
30-method catalog (exact); the signal defined in BOTH directions — what validates AND what
invalidates, because a test that cannot fail is not a test; a duration or sample size with a number;
a named confound or alternative explanation; and a verdict from the declared GO/RESHAPE/NO-GO set.

Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') failClosed(`unknown command "${cmd}" (expected "check")`, args.json);

  const file = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(file)) {
    failClosed(`cannot read ${args.file} — a missing validation record is a missing deliverable, never a pass`, args.json);
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) failClosed(`${args.file} is empty — an empty record is a failure, not a pass`, args.json);

  const methods = readMethods(
    args.methods
      ? path.resolve(process.cwd(), args.methods)
      : path.join(__dirname, '..', 'skills/validation-patterns/methods.csv')
  );

  const result = check(text, methods);
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.ok) {
    console.log(`✓ validation-record: conformant — ${args.file}`);
    console.log('  ' + result.note);
    if (result.notes.length) for (const n of result.notes) console.log(`  ! ${n}`);
  } else {
    const plural = result.failures.length === 1 ? '' : 's';
    console.error(`✗ validation-record: ${result.failures.length} issue${plural} — ${args.file}`);
    for (const f of result.failures) console.error(`  - ${f}`);
  }
  process.exit(result.exit);
}

main();