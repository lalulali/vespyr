#!/usr/bin/env node
/**
 * brainstorming_session_check.js — mechanical gate for /brainstorming.
 *
 * WHY THIS EXISTS. `/brainstorming` is one of the more mature skills in this repo — it has a real
 * Decision Gate, a two-surface rule, mandatory routing, a 60-method catalog and a tested
 * `match_methods.js`. Everything it declares is declared in prose, and `grep -c _check.js` over its
 * files returns zero: **nothing checks any of it.** The session artifact it names is written from a
 * paragraph of instructions with no template.
 * Three of its own rules are the shape this repo has been repairing all session:
 *
 *   1. **The anti-sycophancy gate is self-certified.** Step 3 says: "if every generated idea is
 *      positive or agreeable — zero tension, zero risk, zero objection…" — that is a judgement the
 *      agent makes about its own output, in the same field it fills in. It is also mechanically
 *      detectable from the session record: either the record contains a tension, a risk, an open
 *      question or an objection, or it does not. Gating it on the RECORD rather than the agent's word
 *      is the whole point, and it is the same repair F-13 demanded for `discovery_canvas_check.js`.
 *
 *   2. **The Decision Gate's machine record is unchecked.** Step 4 defines a closed verdict
 *      vocabulary — `[GO]`, `[RESHAPE]`, `[NO-GO]` — and nothing verifies the artifact carries one,
 *      or that it is from that set. A session with a missing or misspelled verdict reads as delivered.
 *
 *   3. **Routing can contradict the verdict it came from.** Step 4b is emphatic: "The gate verdict
 *      locks FIRST — route from the locked verdict, never reshape the verdict to earn a panel." That
 *      is a consistency property between two fields in one document, and it is checkable: a record
 *      with verdict `[NO-GO]` and a route of "roundtable" contradicts the skill's own rule that
 *      `[NO-GO]` gets "archive + ledger. No build or follow-up routing".
 *
 * What is checked: the artifact exists, carries a Date and no unfilled placeholders; it states the
 * sharpened topic; it names a method that actually exists in `methods.csv`; it carries a valid
 * bracketed verdict from the declared set; the machine record carries the bracketed token (the
 * two-surface rule); the record carries at least one tension, risk, open question or objection (the
 * anti-sycophancy gate); and the recorded route is consistent with the recorded verdict.
 *
 * What is NOT checked: whether the ideas are any good, whether the method was applied correctly,
 * whether the verdict is right, or whether the session was worth having. Those need a human.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/** The declared verdict vocabulary, from Step 4. A closed set — nothing here is a judgement. */
const VERDICTS = ['GO', 'RESHAPE', 'NO-GO'];

/** Routes Step 4b permits for each verdict. `null` means "no routing permitted at all". */
const ROUTES_FOR = {
  GO: ['roundtable', 'grill-me'],
  RESHAPE: ['roundtable', 'grill-me'],
  'NO-GO': [],
};

/**
 * Tension vocabulary, for the anti-sycophancy gate.
 *
 * Deliberately broad and phrase-based rather than an enumerated list. An enumerated list of risk
 * words has failed repeatedly in this repo — it rejects the honest phrasing nobody thought of, and
 * the cheapest response to a rejection is to change how you say it rather than to have the idea.
 * These are the shapes a real session produces when something went wrong or is unresolved.
 */
/**
 * Tension vocabulary — BROADENED AFTER BLIND RUN 12 (@qa-engineer seat).
 *
 * The old list was ~40 regex-shaped tokens and matched **1 of 20** honest tension sentences.
 * Measured rejects: "Nobody has confirmed what happens", "We argued for forty minutes", "Every other
 * market is untested", "Nobody owns the fixture", "It may be worse there". All are ordinary English
 * describing real uncertainty, and the gate called them sycophantic.
 *
 * The lesson of this whole session applies: an ENUMERATED list rejects the honest phrasing nobody
 * thought of, and the cheapest response to a rejection is to change how you say it. So this is now
 * phrase-based on what tension actually IS — an unowned thing, an untested thing, an unconfirmed
 * thing, a disagreement, an open loop, a limit, or a hedge that admits the author does not know.
 * `does not`, `no one`, `nobody`, `untested`, `unconfirmed`, `argued`, `disagree`, `open` all signal
 * it, and none of them require the author to have used the word "risk".
 */
const TENSION_RE = new RegExp(
  '\\b(?:' + [
    // unowned / unattributed
    'no ?one owns?', 'nobody owns?', 'unassigned', 'no owner', 'not owned',
    // untested / unverified / unconfirmed
    'untested', 'unverified', 'unconfirmed', 'unvalidated', 'not tested', 'not verified',
    'not confirmed', 'not validated',
    'no (?:test|tests|data|evidence|answer)', 'unmeasured', 'unmeasured',
    // open loops and unknowns
    'we do not know', "we don't know", 'nobody knows?', 'no one knows?', 'unknown',
    // disagreement and doubt
    'argued', 'disagree', 'objected', 'pushed back', 'challenged', 'conflict',
    'we were wrong', 'might be wrong', 'could be wrong', 'i am not sure', "i'm not sure",
    // limitations and hedges that admit ignorance
      'limited', 'constrain', 'assum\\w*', 'depend(s)? on', 'only if', 'as long as',
      // Broadened 2026-10-15. `concern` and `counter-argument` were absent, and the test
      // asserting they count was passing for the WRONG reason: the document-wide scan matched
      // the word "abandon" in the fixture's own Sharpened-topic line, so `tensions` was never
      // empty and the two unmatched phrases were never exercised. A test that cannot fail on
      // the thing it names is not evidence. Stems, not inflections — `disagree` does not match
      // "disagrees", which the motion gate learned the same week.
      'concern\\w*', 'counter-?argument\\w*', 'objection\\w*', 'tension\\w*', 'worry\\w*', 'doubt\\w*',
      'unclear', 'contradict\\w*', 'questionable', 'disagree\\w*', 'trade-?off\\w*',
      // `ambigu\\w*` was added and removed the same hour: it matched "resolves ambiguity before
      // submit" in an ordinary Key Ideas line. A word common enough to appear in normal prose is a
      // false-positive generator, not a detector — the same reason `supports?` is banned above.
    // risk/tradeoff family, kept for the phrasings that do use the words
    'risk', 'trade[- ]?off', 'downside', 'cost', 'fragile', 'worse', 'breaks?', 'failed?',
    'failure mode', 'may fail', 'could fail', 'might fail', 'unproven', 'unsupported', 'gap',
    'exposes?', 'abandon', 'we were unable', 'did not work', 'did not validate',
    'has not been confirmed', 'has not been tested', 'nobody has', 'no one has', 'still open',
    'open question', 'unresolved', 'undecided', 'no plan', 'not sure', 'uncertain', 'hedge',
  ].join('|') + ')\\b',
  'i'
);

/** Body of the heading matching `headingRe`, up to the next same-or-higher heading. */
function section(text, headingRe) {
  const lines = String(text).split('\n');
  // A heading pattern is interpolated into an anchored regex, so an UNGROUPED alternation silently
  // becomes `^(\s*)(#{1,6})\s*A|B|C` — four alternatives, only the first anchored. A bare `B` then
  // matches anywhere with no group 2, and the `m[2].length` below throws. This is the fifth time this
  // exact trap has fired in this repo; it crashed rather than mis-parsed, which is the only reason it
  // was visible. Callers should pass `(?:A|B)`; this guard makes a mistake loud instead of fatal.
  // Strip balanced groups first: `(A|B)` and `(?:A|B)` are already safe, and only a
  // TOP-LEVEL `|` splits the anchored pattern.
  if (headingRe.replace(/\([^()]*\)/g, '').includes('|')) {
    throw new Error(
      `section(): headingRe "${headingRe}" contains an ungrouped alternation. Wrap it: "(?:A|B)".`
    );
  }
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

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  } else {
    console.error(`✗ brainstorming_session_check: ${msg}`);
  }
  process.exit(2);
}

/**
 * Unfilled template markers.
 *
 * The verdict tokens are EXCLUDED, and failing to exclude them is a real bug this run caught: the
 * `\[[a-z][^\]]{2,}\]` pattern is case-insensitive, so it flagged `[RESHAPE]` — the skill's own
 * declared verdict vocabulary — as an unfilled `{placeholder}`. Two rules in one gate contradicting
 * each other, with no document able to satisfy both. Same class as the `TBD` severity clash in
 * `discovery_canvas_check.js`: a vocabulary the gate itself defines must never trip the gate's own
 * detector.
 */
const VERDICT_TOKEN_RE = /^\[(?:GO|RESHAPE|NO-GO)\)?\]$/i;
// The SPC marker is the skill's OWN declared vocabulary — Step 3 mandates exactly one before the
// Step-4 write. The placeholder pattern is case-insensitive and matched `[SPC: inversion-applied]`,
// so saving the required marker failed the gate that requires it. Blind run 13 (@qa-engineer):
// "adding the skill's exact marker made the checker exit 1 with 'unfilled template placeholder';
// removing the marker made it exit 0." Two rules in one gate contradicting each other, again.
const SPC_MARKER_RE = /^\[SPC:\s*[^\]]+\]$/i;
const PLACEHOLDER_RE = /\{\{?[a-z][^}]*\}?\}|\[[a-z][^\]]{2,}\]|<[a-z][a-z _-]{2,}>|\b(?:TBD|TODO|FIXME|XXX)\b/i;

function placeholders(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    const m = line.match(PLACEHOLDER_RE);
    if (!m) return;
    if (VERDICT_TOKEN_RE.test(m[0]) || SPC_MARKER_RE.test(m[0])) return;
    out.push({ line: i + 1, token: m[0] });
  });
  return out;
}

function words(s) {
  return String(s == null ? '' : s)
    .replace(/[`*_>#|]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Read the method catalog. It is INPUT DATA — a fact to check against, not prose under test. */
function readMethods(catalogPath) {
  let rows = [];
  try {
    const text = fs.readFileSync(catalogPath, 'utf8');
    const lines = text.split('\n').filter((l) => l.trim());
    const header = lines[0].split(',');
    const nameIdx = header.indexOf('method_name');
    for (const l of lines.slice(1)) {
      // Split on commas not inside quotes: descriptions contain commas.
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
  } catch { /* an unreadable catalog is a fail-closed below, not a crash */ }
  return rows.map((s) => s.trim()).filter(Boolean);
}


/**
 * Is this line inside a self-assessment / gate / verdict region?
 *
 * The sycophancy gate exists to catch the agent grading its own output. That grading lives in a
 * section whose whole job is to claim the output is fine — so nothing inside it can be evidence about
 * anything. Line-scan rather than a section extractor, because `\s*$` under the `m` flag matches at
 * the first newline and every lookahead-based extractor in this repo has already returned empty once.
 */
const SELF_ASSESS_HEADING = /^#{1,6}\s*(?:anti[- ]?sycophan|sycohancy|gate|verdict|self[- ]?assessment|meta|note to reviewer|disposition)/i;
function inSelfAssessment(line) {
  const lines = String(line).split('\n');
  let inRegion = false;
  for (const l of lines) {
    const h = l.match(/^(\s*)(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[2].length;
      if (level >= 2 && SELF_ASSESS_HEADING.test(l)) inRegion = true;
      else if (level >= 2 && inRegion) inRegion = false;
      if (level === 1) inRegion = false;
    }
    if (l === line) break;
  }
  return inRegion;
}

/** A claimed ABSENCE of tension, phrased as a declaration rather than a listing. */
const NO_TENSION_RE = /\b(?:no|zero|none|nothing)\s+(?:tension|risk|objection|concern|caveat|downside|trade[- ]?off|friction)s?\b|\b(?:nothing)\s+(?:went wrong|is unresolved|failed|broke|surfaced)\b/i;

/**
 * Does the document declare a SPECIFIC BASIS for finding no tension?
 *
 * The auditable half of the rule. The basis must name an action TAKEN — a pass run, a failure mode
 * constructed, a hat searched — because "we looked and found nothing" can be checked against the
 * method, while "zero tension" can only be believed.
 *
 * FIXED AFTER BLIND RUN 12 (@va-engineer + @architect seats): this used to run ONLY when a line
 * already matched the absence phrase — so the gate's own documented Pass example, "we ran the
 * Eliminate pass and found nothing to remove", FAILED, because it never writes "zero tension" and the
 * basis was therefore never looked for. A gate whose documented pass case fails is a gate nobody can
 * use honestly.
 *
 * The basis is now searched for wherever the session recorded its method, without requiring the
 * author to write the word "tension" first. `ABSENCE_RE` (below) is also no longer scoped to a
 * self-assessment region: the documented Fail row written as an Open Questions item used to exit 0.
 */
/**
 * An action TAKEN, not a noun mentioned. BLIND RUN 12 (@qa-engineer seat): the old pattern included
 * `the \w+ step`, which the incidental prose "the preview step" in a Verdict line satisfied — so a
 * session that did no work at all passed as having looked. A noun plus a generic word is not an
 * action. Every alternative here now requires a VERB of effort.
 */
const BASIS_ACTION_RE = /\b(?:we\s+(?:ran|tried|tested|checked|sought|constructed|attempted|probed|stress[- ]?tested|forced|inverted|divided|rotated|challenged|deliberately|defined|built|wrote)\b|\b(?:ran|tested|probed|constructed|challenged|inverted|divided)\s+the\b|each\s+hat\b|every\s+hat\b|all\s+\d+\s+hats\b|attempted\s+to\b)/i;

function findBasis(text) {
  const lines = String(text).split('\n');
  // The basis is looked for wherever the session recorded what it DID — not only adjacent to an
  // absence phrase, which the sycophant writes and the honest session does not.
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (!BASIS_ACTION_RE.test(lines[i])) continue;
    const window = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3)).join(' ');
    if (BASIS_ACTION_RE.test(window)) hits.push(window.trim());
  }
  if (!hits.length) return null;
  // Substance is required so a bare verb is not a basis — but it is tested PER CANDIDATE, so a
  // document with one rich sentence and one thin one still passes. Testing only the first hit is
  // what rejected honest documents.
  const substantive = (w) => w
    .replace(/[`*_>]/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((x) => x.length >= 4)
    .filter((x) => !/^(?:this|that|zero|none|tension|great|session|ideas?|positive|agreeable|team|everyone|happy|found|looked|nothing|which)$/i.test(x));
  return hits.some((w) => substantive(w).length >= 5) ? hits.find((w) => substantive(w).length >= 5).trim() : null;
}

function check(text, methods) {
  const failures = [];
  const notes = [];

  // ---- template + date ------------------------------------------------------------------------
  const ph = placeholders(text);
  if (ph.length) {
    const sample = ph.slice(0, 4).map((p) => `line ${p.line} ${p.token}`).join('; ');
    failures.push(
      `${ph.length} unfilled template placeholder(s) remain (${sample}${ph.length > 4 ? '; …' : ''}). ` +
      'This document still contains the template — an artifact carrying its own instructions is not an artifact.'
    );
  }
  if (!/^\s*\*\*Date:?\*\*/im.test(text)) {
    failures.push('No `**Date:**`. A session with no date cannot be aged or superseded.');
  }

  // ---- the sharpened topic --------------------------------------------------------------------
  // Step 1 follows `.agents/references/step-0-sharpening.md`, whose first step is to restate the
  // target in one sentence. A session that never states its topic cannot be routed to anything.
  const topic = section(text, '(Sharpened Topic|Topic)') || '';
  const topicField = (String(text).match(/^\s*[-*]?\s*\*{0,2}(?:Sharpened )?Topic\*{0,2}\s*:?\s*\*{0,2}\s*(.+)$/im) || [])[1];
  const topicBody = (topicField !== undefined ? topicField : topic).replace(/^[-*\s]+/, '').trim();
  if (words(topicBody).length < 5) {
    failures.push(
      `The sharpened topic is "${topicBody.slice(0, 50) || '(absent)'}" — too little to brainstorm about. ` +
      'Step 1 requires a restated target; a session with no topic produces ideas about nothing in particular.'
    );
  }

  // ---- the method must exist in the catalog ---------------------------------------------------
  // The catalog is a closed set of 60 named methods. Naming a method that is not in it means either
  // the catalog is wrong or the session claims to have used something it has not.
  if (methods.length === 0) {
    failures.push(
      'Could not read `methods.csv` — a session cannot be checked against a catalog that cannot be read, ' +
      'and an empty catalog must not read as "every method is valid".'
    );
  } else {
    const methodField = (String(text).match(/^\s*[-*]?\s*\*{0,2}Method\*{0,2}\s*:?\s*\*{0,2}\s*(.+)$/im) || [])[1];
    const methodSec = section(text, 'Method') || '';
    const methodRaw = (methodField !== undefined ? methodField : methodSec).replace(/^[-*\s]+/, '').trim();
    const methodsLower = methods.map((m) => m.toLowerCase());
    // EXACT match, not substring. An earlier version used `includes`, so "Six Thinking Hats Plus
    // Deluxe" — a method that does not exist — passed by containing a real method's name. A catalog
    // check that an invented value can satisfy is not a check.
    // Split on co-dispatch separators. Step 3 of the skill MANDATES co-dispatch on trigger, so a
    // legitimately-run session legitimately names several methods — and a single-method assumption
    // fails a real session. Found by dry-running the skill with three co-participants: the gate
    // rejected a conformant multi-method session outright.
    const claimed = String(methodRaw)
      .split(/\s*(?:\+|,|\/|;|\bwith\b|\band\b|\bvia\b)\s*/i)
      .map((m) => m.replace(/\bdispatched as co-participants\b|\bco-dispatched\b|\bprimary\b/gi, ' ').trim())
      .filter(Boolean);
    const unknown = claimed.filter(
      (m) => !methodsLower.some((k) => k === m.toLowerCase() || k === m.toLowerCase().replace(/\s+/g, ' ') === k)
    );
    if (!methodRaw) {
      failures.push('No method is named. Step 3 requires the session to record the method it used.');
    } else if (claimed.length && unknown.length === claimed.length) {
      failures.push(
        `The method "${methodRaw}" is not in the 60-method catalog. A session naming a method that does ` +
        'not exist either invented it or did not run one — and downstream skills cannot reproduce the work.'
      );
    } else if (unknown.length) {
      failures.push(
        `${unknown.length} named method(s) are not in the 60-method catalog: ${unknown.join(', ')}. ` +
        'The others are valid; fix these or drop them.'
      );
    }
  }

  // ---- the Decision Gate machine record -------------------------------------------------------
  // The centre of the artifact. A closed vocabulary, so this is mechanical and cannot over-fit.
  const verdicts = text.match(/\[(GO|RESHAPE|NO-GO)\]/gi) || [];
  const verdict = verdicts.length ? verdicts[0].toUpperCase().replace(/[[\]]/g, '') : null;
  if (!verdict) {
    failures.push(
      'No bracketed verdict in the machine record. Step 4 defines a closed set — ' +
      `\`[GO]\`, \`[RESHAPE]\`, \`[NO-GO]\` — and a session with no verdict is not a gated session, it is ` +
      'a chat log.'
    );
  } else if (!VERDICTS.includes(verdict)) {
    failures.push(`The verdict \`[${verdict}]\` is not one of ${VERDICTS.map((v) => `\`[${v}]\``).join(', ')}.`);
  }

  // Two surfaces, enforced on the ARTIFACT: the machine record must carry the bracket, and the plain
  // sentence must be present too. Step 4: "the machine record — plain sentence, then the bracketed…"
  if (verdict && !/^\s*\*\*(?:Verdict|Gate|Decision)\b/im.test(text) && !/Gate:/im.test(text)) {
    notes.push('The machine record carries no labelled verdict field; the bracket was found loose in prose.');
  }

  // ---- the anti-sycophancy gate, on the RECORD -------------------------------------------------
  // Step 3 asks the agent to judge its own output: "if every generated idea is positive or agreeable
  // — zero tension, zero risk, zero objection…". That is a self-assessment in the same field it fills
  // in, and it is exactly what a sycophantic session produces: all agreeable, all safe, all worthless.
  //
  // Gated on the record instead. A session that generated real ideas contains at least one tension, a
  // risk, an open question or an objection — because that is what a session is FOR.
  // FIXED IMMEDIATELY, and it is the same defect in miniature that this whole session has been
  // repairing: a session whose anti-sycophancy note reads "Zero tension. Zero risk. Zero objection."
  // PASSED, because it quotes the very vocabulary the check counts. A document that declares the
  // absence of the thing you are looking for is telling you it knows what you are looking for.
  //
  // Two guards, both necessary:
  //   1. The self-assessment section is excluded from the count. The gate is about the SUBSTANCE —
  //      the ideas, decisions and open questions — not about what the document says about itself.
  //      A sycophant's answer to "is this sycophantic?" is never evidence either way.
  //   2. A line ASSERTS ABSENCE ("zero tension", "no risk") does not count as the presence of one.
  const ABSENCE_RE = /\b(?:zero|no|none|without any|not any)\s+(?:tension|risk|objection|concern|downside|trade[- ]?off|caveat|gap|friction|unknown|open question)/i;
  const SUBSTANCE_RE = /^#{2,6}\s*(?:Key Ideas|Ideas|Decisions|Open Questions|Surfaced|Findings|Tensions|Risks)/i;
  // ---- tensions: read the SECTION they belong in, not the whole document ------------------------
  // Closed 2026-10-15 (blind run 12, F2 family). The scan tested TENSION_RE against EVERY line of the
  // document, and that vocabulary holds ordinary words — `abandon`, `cost`, `limited`, `gap`. A
  // session about checkout abandonment matched the word "abandon" in its own Sharpened-topic line, so
  // a record with no tension anywhere counted as having one and passed. This is the same defect as
  // validation_record_check.js's confound rule, found the same week: the word was never the field.
  //
  // The template declares `## Open Questions` as where risks, trade-offs and unknowns are recorded, so
  // that is the section this reads. The self-assessment exclusion below stays, and so does the
  // absence exclusion — a heading or a denial is not an instance.
  // The template declares the SHAPE of an Open Questions entry, and shape is checkable:
  //   1. {unresolved question} — **Risk:** {what goes wrong if the assumption is false}
  //   2. **Trade-off:** {what you give up}
  //   3. **Unknown:** {what nobody has checked}
  // So an entry counts if it is a question, or carries one of those three labels, or names a risk in
  // the vocabulary. The vocabulary alone was not enough: measured against 30 honest tension
  // statements it rejected 27%, on gaps like `disagrees` vs `disagree`, `assumes` vs `assume`,
  // `contradict`, `unclear` — and there is always another phrasing. The template's labels are a
  // closed set the author can read, which is what makes them fair to require.
  const LABELLED_TENSION = /\*\*(?:Risk|Trade-?off|Unknown)\b/i;
  // The scan excludes the METADATA BLOCK — everything before the first heading. That is where the
  // false positive lived: a session about checkout abandonment matched the word "abandon" in its
  // own `**Sharpened topic:**` line, so a record with no tension anywhere counted as having one.
  // Sections are NOT restricted to a list of headings: an earlier attempt scoped to `## Open
  // Questions` alone and a test caught it over-fitting, because a real session records risks in
  // whatever shape it happened to. Excluding the header block fixes the false positive without
  // dictating where a tension may be written.
  // Level 2, not level 1: the `# Title` line is a heading too, so starting there left the whole
  // `**Sharpened topic:**` block inside the scan — which is exactly where "abandon" lived.
  const firstHeading = text.search(/^#{2,6}\s/m);
  const tensionScope = firstHeading === -1 ? '' : text.slice(firstHeading);
  const tensions = tensionScope.split('\n').filter((l) => {
    if (!l.trim()) return false;
    if (/^\s*#{1,6}\s/.test(l)) return false;
    if (ABSENCE_RE.test(l)) return false;
    if (inSelfAssessment(l)) return false;
    return TENSION_RE.test(l) || LABELLED_TENSION.test(l) || /\?/.test(l);
  });
  const tensionWords = text.split('\n')
    .flatMap((l) => words(l))
    .filter((w) => /^(?:go|reshape|no-go)$/i.test(w)).length;
  void tensionWords;
  // FIXED AFTER THE RULE IT CREATED. The first version REQUIRED a tension, which meant a session
  // that honestly found none had to write a fabricated "Risk:" to pass — the F-13 defect with the
  // sign flipped. A gate that rewards invention is worse than no gate, whichever direction it
  // invents in.
  //
  // The resolution is the one `discovery_canvas_check.js` already uses for quoted material:
  // quotation is evidence, and evidence is not something a text check can manufacture, so demanding
  // it unconditionally does not raise honesty — it lowers it. What IS checkable is the honesty of the
  // declaration.
  //
  // So: a session may record no tension, but only by declaring WHAT IT LOOKED FOR and did not find.
  //   * "we ran the Eliminate pass deliberately and found nothing to remove" -> auditable effort
  //   * "we constructed the failure mode we could and it does not apply"      -> auditable effort
  //   * "zero tension" / "this is a great session"                            -> unauditable feeling
  //
  // A bare assertion of absence is exactly what the sycophant writes, so it still fails. The
  // distinction is not which way the session leans — it is whether the claim can be checked.
  if (tensions.length === 0) {
    const basis = findBasis(text);
    if (basis) {
      notes.push(
        'No tension recorded, and the session declares a specific basis for that — "' +
        basis.slice(0, 90).replace(/\s+/g, ' ') +
        '". This is allowed because demanding a tension unconditionally would only reward ' +
        'inventing one. The claim is auditable; the judgement is still yours.'
      );
    } else {
      failures.push(
        'The record contains no tension, no risk, no open question and no objection — and no ' +
        'statement of what was looked for and not found, either. Step 3 defines this as the ' +
        'anti-sycophancy case: "if every generated idea is positive or agreeable: zero tension, ' +
        'zero risk, zero objection". A session whose every idea is agreeable has not been run, ' +
        'it has been performed.' +
        '\n\nTwo ways to pass:\n' +
        '  * record a tension — a risk, a trade-off, an open question, an objection, anything ' +
        'you can check; OR\n' +
        '  * declare what you looked for and did not find: "we ran the Eliminate pass and ' +
        'found nothing to remove" is an auditable claim; "zero tension" is not.'
      );
    }
  }

  // ---- routing must be consistent with the verdict --------------------------------------------
  // Step 4b: "The gate verdict locks FIRST — route from the locked verdict, never reshape the verdict
  // to earn a panel." A `[NO-GO]` session that routes to roundtable contradicts it outright.
  if (verdict) {
    const permitted = ROUTES_FOR[verdict] || [];
    const routeField = (String(text).match(/^\s*[-*]?\s*\*{0,2}(?:Route|Routed to|Next)\*{0,2}\s*:?\s*\*{0,2}\s*(.+)$/im) || [])[1];
    const route = (routeField !== undefined ? routeField : '').toLowerCase();
    if (verdict === 'NO-GO' && /round[- ]?table|grill[- ]?me/i.test(route)) {
      failures.push(
        `The verdict is \`[NO-GO]\` but the route is "${route}". Step 4b says \`[NO-GO]\` gets "archive + ` +
        'ledger. No build or follow-up routing" — routing a dead idea to a panel is reshaping the verdict ' +
        'to earn a discussion.'
      );
    }
    // A GO/RESHAPE with NO route at all used to pass, because the check was gated on `route` being
    // truthy. Blind run 13 (@code-reviewer, BLOCKING): "a throwaway GO record with no `**Route:**`
    // field passed the public gate with exit 0". Step 4b makes routing mandatory on GO/RESHAPE, so
    // the absence of the field is the failure, not a reason to skip the check.
    if (verdict !== 'NO-GO' && !route) {
      failures.push(
        `The verdict is \`[${verdict}]\` and there is no \`**Route:**\` field. Step 4b makes routing ` +
        'mandatory on GO and RESHAPE — a gated idea with nowhere to go is a decision nobody acts on.'
      );
    }
    if (verdict !== 'NO-GO' && route && !permitted.some((p) => route.includes(p))) {
      failures.push(
        `The verdict is \`[${verdict}]\` but the route is "${route}", which is not one of the routes Step 4b ` +
        `permits (${permitted.join(' or ')}). If the route was overridden, log it in the declared format: ` +
        '`[ROUTING-OVERRIDE: default -> chosen -- reason]`.'
      );
    }
    // Overrides must be declared, not silent.
    const overrides = text.match(/\[ROUTING-OVERRIDE:[^\]]*\]/gi) || [];
    if (overrides.length) {
      const malformed = overrides.filter((o) => !/default\s*->\s*[^-]+--\s*\S+/.test(o));
      if (malformed.length) {
        failures.push(
          `${malformed.length} routing override(s) are malformed — each must name the default, the chosen ` +
          `route, and a reason: ${malformed.slice(0, 2).map((o) => o.slice(0, 50)).join(' | ')}.`
        );
      }
    }
  }

  // ---- the SPC marker: the skill's own step-completion rule -------------------------------------
  // Step 3 says: "Every session MUST emit exactly one marker line before the Step-4 write" and
  // "A Step-4 write without the marker fails step completion." Nothing checked it. Blind run 13
  // (@architect, @qa-engineer) found the gate passing records with no marker at all while enforcing
  // a prose proxy for tension instead.
  //
  // Exactly one, because the skill says exactly one: two markers means two sessions' worth of
  // claims in one record, and neither is attributable.
  const spcMarkers = (text.match(/^\s*\[SPC:\s*[^\]]+\]\s*$/gim) || []);
  if (spcMarkers.length === 0) {
    failures.push(
      'No `[SPC: …]` marker. Step 3 requires exactly one before the Step-4 write — ' +
      '`[SPC: inversion-applied]`, `[SPC: rosy-absent — <cited bullet>]`, or ' +
      '`[SPC: skipped — <one of the closed taxonomy>]`. A session that records its anti-sycophancy ' +
      'disposition nowhere has not recorded it.'
    );
  } else if (spcMarkers.length > 1) {
    failures.push(
      `${spcMarkers.length} \`[SPC: …]\` markers. Step 3 requires exactly one — two markers are two ` +
      'claims in one record, and neither is attributable to a decision.'
    );
  }

  // ---- the session must record ALL THREE outputs ----------------------------------------------
  // Step 3: "Record outputs (ideas, decisions, open questions)."
  //
  // Two bugs, closed 2026-10-15 (blind run 12, F2 family). The substantive one: the check tested for
  // ANY ONE of the three, so a record carrying only `## Open Questions` satisfied a rule whose own
  // failure message says "ideas, decisions and open questions". The other: `Ideas` was listed as an
  // alternative to `Key Ideas`, so renaming the section away passed.
  //
  // What makes requiring the DECLARED heading legitimate here, rather than the formalism that rejected
  // honest confounds elsewhere in this audit: the skill PRINTS this template, so there is exactly one
  // right answer and the author can look it up. A vocabulary check over open prose has no canonical
  // form, which is why that one had to be narrowed instead of enforced.
  const OUTPUTS = [
    ['Key Ideas', /^#{2,6}\s*Key Ideas\b|\*\*Key Ideas\b/im],
    ['Decisions', /^#{2,6}\s*Decisions\b|\*\*Decisions\b/im],
    ['Open Questions', /^#{2,6}\s*Open Questions\b|\*\*Open Questions\b/im],
  ];
  const missingOutputs = OUTPUTS.filter(([, re]) => !re.test(text)).map(([name]) => name);
  if (missingOutputs.length) {
    failures.push(
      `The record is missing ${missingOutputs.length} of the 3 outputs sections the session template ` +
      `declares: ${missingOutputs.map((n) => `\`## ${n}\``).join(', ')}. Step 3 requires ideas, ` +
      'decisions and open questions to be recorded — without all three the artifact is a partial ' +
      'description of a session, not the session. The template is printed under "Session template".'
    );
  }

  return {
    kind: 'brainstorming-session',
    ok: failures.length === 0,
    exit: failures.length ? 1 : 0,
    verdict,
    tensionsRecorded: tensions.length,
    notes,
    failures,
    note:
      'Form and the anti-sycophancy invariant. This does not judge whether the ideas are any good, ' +
      'whether the method was applied well, or whether the verdict is right.',
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

const USAGE = `Usage: node .agents/scripts/brainstorming_session_check.js check \\
  --file artifacts/output/01-discovery/brainstorming-session.md \\
  [--methods .agents/skills/brainstorming/methods.csv] [--json]

Checks: no unfilled placeholders and a Date; a sharpened topic; a method that EXISTS in the 60-method
catalog; a bracketed verdict from the declared set \`[GO]\` / \`[RESHAPE]\` / \`[NO-GO]\`; the machine
record carries the bracket (the two-surface rule); the record carries at least one tension, risk, open
question or objection (the anti-sycophancy gate, enforced on the record rather than the agent's own
word); the route is consistent with the verdict; and the session records its outputs.

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
    failClosed(`cannot read ${args.file} — a missing session record is a missing deliverable, never a pass`, args.json);
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) failClosed(`${args.file} is empty — an empty session is a failure, not a pass`, args.json);

  const methods = readMethods(
    args.methods
      ? path.resolve(process.cwd(), args.methods)
      : path.join(__dirname, '..', 'skills/brainstorming/methods.csv')
  );

  const result = check(text, methods);
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.ok) {
    console.log(`✓ brainstorming-session: conformant — ${args.file}`);
    console.log('  ' + result.note);
    if (result.notes.length) for (const n of result.notes) console.log(`  ! ${n}`);
  } else {
    const plural = result.failures.length === 1 ? '' : 's';
    console.error(`✗ brainstorming-session: ${result.failures.length} issue${plural} — ${args.file}`);
    for (const f of result.failures) console.error(`  - ${f}`);
  }
  process.exit(result.exit);
}

main();