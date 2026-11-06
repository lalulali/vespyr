#!/usr/bin/env node
/**
 * launch_readiness_check.js — the pre-launch gate.
 *
 * WHY THIS EXISTS
 * `/launch` shipped no mechanical gate at all, and its Done-when was four prose bullets. Its
 * readiness checklist said "Security review completed" and "Performance benchmarks within
 * thresholds" — neither falsifiable, neither with an exit code.
 *
 * Two separate problems were found by measurement:
 *
 * 1. **`security-scan.js` was invoked by zero skills.** It is a real scanner with a documented
 *    exit-code contract (0 clean / 1 findings / 2 tool failure, fail-closed) and
 *    `security/audit-spec.json` defines 11 rules including `INJ-SECRET`. Nothing in the pipeline
 *    called it. A secret scanner that nobody runs is indistinguishable from no scanner, and a
 *    hardcoded credential is not a launch-checklist item — it is an incident.
 *
 * 2. **The prerequisites were prose.** "qa-signoff.md exists with GO/CONDITIONAL" is literally a
 *    mechanical check and nothing performed it. `/launch` halts on a missing sign-off; whether
 *    it is present is decided by whoever is reading.
 *
 * WHAT IT CHECKS
 *   - the four prerequisites are present, with the team gate complete and the sign-off readable
 *   - `qa-signoff.md` carries a bracketed GO or CONDITIONAL verdict, and any CONDITIONAL names
 *     conditions with an owner and a date
 *   - `release-readiness.md` records a completed UTTERLY SATISFIED team gate — every active
 *     reviewer SATISFIED, every CHANGES REQUESTED or BLOCKED resolved
 *   - `security-scan.js` exits 0 when a spec is available; a scanner failure (exit 2) is never
 *     read as clean
 *
 * SECURITY-SCAN AND THE `--spec` FLAG
 * The scanner needs its rule table (`--spec`), and the canonical location is `security/audit-spec.json`.
 * `--require-scan` is therefore only meaningful together with a resolvable spec. This gate does NOT
 * guess: without `--require-scan` the scan is reported but not enforced, and without a spec it says
 * so rather than inventing a pass. That is deliberate — a gate that silently skipped the one check
 * it exists for would be the exact defect this file was written to close.
 *
 * ABSENCE IS CONTEXT-DEPENDENT, the same rule as every other gate in this repo. By default a
 * missing readiness record is a skip (exit 0), which is correct for callers where launching is not
 * in scope. Under `--require-readiness` — which `/launch` step 01 must pass — absence is a failure.
 *
 * Usage:
 *   node .agents/scripts/launch_readiness_check.js check [--root DIR] [--spec PATH]
 *     [--require-readiness] [--require-scan] [--scan-allowlist P] [--json]
 *
 * Exit 0 = conformant or skipped. Exit 1 = failure. Exit 2 = usage/IO error.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULTS = {
  readiness: 'artifacts/output/06-launch/release-readiness.md',
  goNoGo: 'artifacts/output/06-launch/go-nogo-decision.md',
  signoff: 'artifacts/output/05-execution/quality/qa-signoff.md',
  scan: 'security/audit-spec.json',
};

const SCAN = path.join(__dirname, 'security-scan.js');
const CANVAS_CHECK = path.join(__dirname, 'discovery_canvas_check.js');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--require-readiness') args.requireReadiness = true;
    else if (a === '--require-scan') args.requireScan = true;
    else if (a === '--root') args.root = argv[++i];
    else if (a === '--spec') args.spec = argv[++i];
    // A release gate that cannot reach the scanner's reviewed-allowlist forces the gate to fail on
    // findings a human has already read and accepted, or — worse — pressures a maintainer into
    // deleting reviewed fixtures to get green. The flag is explicit on purpose: omitting it scans
    // unfiltered, which is fail-closed (more findings, never fewer).
    else if (a === '--scan-allowlist') args.scanAllowlist = argv[++i];
    else args._.push(a);
  }
  return args;
}

const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

/**
 * Return the DECLARED VERDICT, normalised — or null when none is stated.
 *
 * F-2 (blind /launch run 2026-10-08): this returned a BOOLEAN. It asked "is a verdict present",
 * never "which verdict". Measured: a `go-nogo-decision.md` reading `**Verdict:** NO-GO` — with the
 * sentence "We are not shipping" underneath it — satisfied the gate exactly as GO does, and the
 * gate printed `verdict: PASS, ok: true, failures: 0`. PASS and GO are different signals and the
 * gate was conflating them: the gate's own PASS meant "no rule was broken", while the release's
 * NO-GO meant "a human decided not to ship". A gate that reports PASS over a recorded NO-GO is
 * worse than no gate, because it is trusted.
 */

/**
 * A declared verdict, not a word that happens to appear.
 *
 * Requires an explicit field or the bracketed machine form. This exists because the previous
 * check was `\b(GO|NO-GO|CONDITIONAL)\b` over the whole file, which a `# Go/No-Go` heading
 * satisfied on its own.
 */
  /**
   * Every decision token in the record, in file order.
   *
   * A6 (blind run 16, @code-reviewer): the verdict was read from the FIRST decision line anywhere
   * in the document, so a genuine `**Decision:** NO-GO` in the Decision section was ignored because
   * an earlier line — a history bullet, a quoted fragment — already said GO. Measured: four
   * fixtures including a realistic history-plus-section record shipped over their own recorded
   * NO-GO, while the gate's own message says it "cannot ship a release its own decision record
   * declines to ship". Pre-existing at HEAD, unrecorded.
   *
   * The rule is now any-NO-GO-wins ACROSS THE DECLARED VERDICT FIELDS: if the document carries more
   * than one `**Verdict:**` / `**Decision:**` / `**Recommendation:**` line, a NO-GO in ANY of them
   * wins, whatever else the others say. That also flips the unedited option menu
   * (`**Decision:** GO / NO-GO / CONDITIONAL GO`) from fail-open — it read as GO — to fail-closed,
   * which is what an undecided menu should do.
   *
   * LIMIT, stated rather than hidden. The gate reads declared decisions. A NO-GO written in prose
   * outside a verdict field — "this release remains a NO-GO until the vendor closes the incident" —
   * is NOT read, because a launch record legitimately discusses the history of its own decisions.
   * The earlier version of this comment claimed "a record that says NO-GO anywhere is a NO-GO", which
   * was not what the code did. The comment is now the code.
   */
function declaredVerdictDetail(text) {
    const t = String(text || '');
    const tokens = [];
    // F-D (panel, 2026-10-22, twice). The verdict reader has to satisfy two things at once:
    //
    // (1) ANY separator between NO and GO is a separator — a space (any number of them), a
    //     hyphen, an en dash, an em dash, a non-breaking hyphen. The token pattern used to accept
    //     exactly one separator character, so `**Verdict:** NO GO` read as GO, and so did `NO  GO`,
    //     `NO - GO`, `NO\u2013GO`, `NO\u2014GO` and `NO\u2011GO`. Measured on the candidate: every one
    //     of them returned PASS with zero failures.
    //
    // (2) The base commit's STRICTNESS must not be lost: the token has to be the thing that
    //     FOLLOWS the label. The base matched the token right after `**Verdict:**` and returned NO
    //     VERDICT when it was not there. A loose scan of the whole line lost that, so
    //     `**Verdict:** not a GO` read as GO. Measured on the candidate: PASS with zero failures.
    //
    // So: each declared field is read STRICTLY for the token immediately after the label, and the
    // loose scan over the same line contributes only a NO-GO or a CONDITIONAL — never a GO. A GO
    // that is not the declared token is not a declaration.
    const NO_GO = 'NO[\\s\\-\u2013\u2014\u2011]+GO';
    const strictToken = (line) => {
      // A trailing boundary too: `**Decision:** GOING` is not a GO. The leading edge was already
      // strict (the token must FOLLOW the label); the trailing edge was not.
      const m = line.match(new RegExp(':\\*\\*\\s*`?\\[?(GO|' + NO_GO + '|CONDITIONAL(?:\\s+GO)?)(?![A-Za-z0-9])\\]?`?', 'i'));
      if (!m) return null;
      const u = m[1].toUpperCase();
      return new RegExp('^' + NO_GO + '$', 'i').test(u) ? 'NO-GO'
        : (/^CONDITIONAL/.test(u) ? 'CONDITIONAL' : 'GO');
    };
    for (const m of t.match(/\*\*(?:Verdict|Decision|Recommendation):\*\*[^\n]*/gi) || []) {
      const declared = strictToken(m);
      if (declared) tokens.push(declared);
      // A NO-GO or a CONDITIONAL anywhere on the line still wins (A6: any-NO-GO-wins).
      for (const v of m.match(new RegExp('\\b(?:' + NO_GO + '|CONDITIONAL(?:\\s+GO)?)\\b', 'gi')) || []) {
        tokens.push(/^NO/i.test(v.toUpperCase()) ? 'NO-GO' : 'CONDITIONAL');
      }
    }
    for (const m of t.match(/VERDICT:\s*\[(GO|NO-GO|CONDITIONAL)\]/gi) || []) {
      tokens.push(m.match(/GO|NO-GO|CONDITIONAL/i)[0].toUpperCase());
    }
    if (!tokens.length) return { verdict: null, conflict: false };
    const holds = tokens.filter((v) => v === 'NO-GO' || v === 'CONDITIONAL');
    if (holds.length) return { verdict: holds[0], conflict: tokens.includes('GO') };
    return { verdict: 'GO', conflict: false };
  }

function declaredVerdict(text) {
    return declaredVerdictDetail(text).verdict;
  }

/**
 * BLIND /LAUNCH RUN 7 (2026-10-10), @code-reviewer seat — the gate this run exists to certify.
 *
 * An EMPTY evidence cell was already caught. A placeholder was not:
 *
 *   | @security-engineer | `SATISFIED` |  x   |  -> PASS
 *   | @security-engineer | `SATISFIED` |  ... |  -> PASS
 *   | @security-engineer | `SATISFIED` |  n/a |  -> PASS
 *
 * `x`, `n/a`, `yes`, `-` and `...` are all truthy strings, so the `!r.evidence` test passed them.
 * That is the same class of defect as F-5, where the bare word `reason` satisfied a reason check:
 * a check that accepts any non-empty value is not checking anything, and the gate whose whole job is
 * to say "somebody actually looked" could be satisfied by a punctuation mark.
 *
 * Note the precise claim: empty WAS caught, placeholders were NOT. The seat's broader framing that
 * an empty cell passed does not reproduce, and this records both what is true and what is not.
 *
 * MINIMUM: ONE substantive word of four or more characters that is not a function word and not an
 * absence word, and not a bare non-answer. Short
 * real evidence ("scan clean", "rollback rehearsed") still passes — this rejects emptiness dressed
 * as content, not concision.
 */
function evidenceTooThin(evidence) {
  const clean = String(evidence == null ? '' : evidence)
    .replace(/[`*_>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return 'no evidence';
  if (/^[\W_]+$/.test(clean)) return `only punctuation ("${clean}")`;
  if (/^(?:n\/?a|na|none|nil|null|yes|no|ok|okay|done|tbd|todo|fixme|x+|same|as above|see above|see below|see notes|pass(?:ed)?|green|clean|clean(?:er)?|\?+|-+|—+|_+|=+|\.+)$/i.test(clean)) {
    return `a placeholder, not evidence ("${clean}")`;
  }
  // D1 (run-12 B9, blind run 16 review): a cell that says the check did not APPLY, that nothing
  // was noted, or that nothing was needed is not evidence that a reviewer looked. Measured: an
  // evidence cell reading exactly "not applicable", "nothing here" or "no comment" each satisfied a
  // SATISFIED row. The whole-cell placeholder list above could not catch them, because it only
  // matched a cell that was nothing but the placeholder.
  //
  // So: strip the no-op phrases and the scope filler, and if nothing meaningful remains, the cell
  // said nothing. A cell that records a partial scope ("not applicable to this release") is
  // rejected too, for the same reason — a reviewer who wants to record a partial scope writes a
  // positive evidence cell instead. This is a word-level heuristic, not a proof; it is recorded as a
  // limit rather than claimed as validation.
  const meaningful = clean
    .replace(NO_OP_EVIDENCE, ' ')
    .replace(SCOPE_FILLER, ' ')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    // Four characters, the same floor the real-word test uses below. A three-letter remnant like
    // "run" in "not required to run" is not a finding.
    .filter((w) => saysSomething(w));
  if (!meaningful.length) return `a placeholder, not evidence ("${clean}")`;

  const tokens = clean.split(' ').filter(Boolean);
  const hasRealWord = tokens.some((t) => /[a-z0-9]{4,}/i.test(t));
  if (!hasRealWord) return 'no substantive word ("' + clean.slice(0, 40) + '")';
  if (clean.length < 8) return 'too short to check ("' + clean + '")';
  return null;
}

/**
 * Words that carry no information in an evidence cell or an out-of-scope reason.
 *
 * FUNCTION words are grammar, connectives, pronouns and scope nouns. ABSENCE words are the
 * vocabulary of "nothing was checked" — nothing, none, applicable, no action, no findings,
 * outstanding, review, report, work, and the rest.
 *
 * The rule both checks apply: after the no-op phrases and the scope filler are stripped, at least
 * one word must survive that is neither a function word nor an absence word. "no findings" has
 * none — it names nothing that could be looked at. "no blocking issues found" has "blocking" and
 * "found". "no findings in the billing module" has "billing" and "module". The bar is that the
 * cell names something a reader could check.
 *
 * KNOWN LIMIT, stated rather than hidden. This is a word list, not a proof. A cell naming
 * something in words this list does not know still passes, and a cell naming a real thing whose
 * word happens to sit on the list is rejected even though it was honest. The list is deliberately
 * biased toward rejecting, because the gate's failure mode is a sign-off nobody can check.
 */
const FUNCTION_WORD = /^(?:out|of|the|a|an|in|on|at|to|for|from|by|with|and|or|but|as|if|so|than|then|thus|therefore|hence|however|although|though|because|since|due|given|regarding|concerning|related|owing|otherwise|nevertheless|whereas|whether|unless|until|when|while|whenever|whatever|about|around|is|are|was|were|be|been|being|it|its|this|that|these|those|they|them|their|there|here|we|our|us|you|your|he|his|she|her|do|does|did|has|have|had|will|would|can|could|should|shall|may|might|must|not|never|no|n\/a|none|nothing|anything|something|everything|anyone|anyone|applicable|scope|reason|reasons|already|yet|ever|always|once|per|via|using|used|use|get|gets|got|make|made|take|taken|give|seen|saw|went|come|came|want|wants|like|well|enough|simply|just|only|also|any|some|each|both|all|other|others|such|own|very|much|many|few|more|most|less|least|still|even|else|actually|literally|really|etc|vs|new|old|now)$/i;

const ABSENCE_WORD = /^(?:comment|comments|note|notes|required|needed|action|actions|checked|reviewed|reviewer|reviewers|review|reviews|same|above|below|see|work|works|done|complete|completed|check|checks|performed|conducted|examination|inspections?|observed|observations?|assessed|assessment|assessments|looked|looking|skipped|skip|ignored|omitted|deferred|verification|inspection)$/i;

/**
 * The stricter list, used for a DEACTIVATION REASON.
 *
 * A reason must name WHAT IS OUT OF SCOPE. "out of scope: nothing to report" names nothing, so it is
 * not a reason even though "no findings" IS legitimate evidence. That is the difference between the
 * two bars, and it is deliberate.
 */
const REASON_ABSENCE_WORD = /^(?:comment|comments|note|notes|required|needed|action|actions|checked|reviewed|reviewer|reviewers|same|above|below|see|work|works|done|complete|completed|check|checks|report|reports|reported|mention|mentioned|relevant|matter|matters|finding|findings|issue|issues|problem|problems|outstanding|necessary|visible|evidence)$/i;

/**
 * Does this word say something?
 *
 * TWO BARS, and the difference matters.
 *
 * EVIDENCE asks: did somebody look? A claim that the reviewer found nothing ("0 findings", "no
 * outstanding issues", "nothing outstanding", "scan clean") IS evidence — it is what a reviewer
 * writes when the review found nothing. Blind run 7 pinned "0 findings" as evidence and this has
 * not changed. A claim that nobody looked ("not applicable", "nothing here", "no comment", "none
 * needed") is NOT evidence, because it describes the absence of a review rather than its result.
 *
 * NOTE, because an earlier draft of this comment got it backwards: "no findings" is EVIDENCE, and
 * the words that name a category of work — findings, issues, outstanding, report — are therefore
 * NOT in the absence vocabulary. A cell that says the review found nothing names what the review
 * was about.
 *
 * A REASON asks: what is out of scope? "nothing to report" names nothing, so it is not a reason —
 * even though "no findings" is legitimate evidence. Same words, different question, different bar.
 *
 * KNOWN LIMIT, stated rather than hidden. This is a word list, not a proof. A cell naming
 * something in words these lists do not know still passes, and a cell naming a real thing whose
 * word happens to sit on a list is rejected even though it was honest. The lists are deliberately
 * biased toward rejecting, because the gate's failure mode is a sign-off nobody can check.
 */
function saysSomething(word, absence = ABSENCE_WORD) {
  const w = word.replace(/[^\w/-]/g, '');
  // TWO characters, not four. "no UI in this release" is an honest, checkable out-of-scope reason
  // and the four-character floor rejected it — so a backend-only release could never go green.
  // Single letters and bare digits are still not words.
  return w.length >= 2 && /[a-z]/i.test(w) && !FUNCTION_WORD.test(w) && !absence.test(w);
}

/**
 * Phrases that say nothing was checked. Matched case-insensitively, on word boundaries.
 */
const NO_OP_EVIDENCE = /\b(?:not applicable|n\/?a|none needed|nothing here|no comments?|not reviewed|no review needed|no action|nothing to report|not required|not checked|no note|none)\b/gi;

// The same list without the global flag, for probing. A global regex used with `.test()` advances
// `lastIndex` and returns alternating results on the same string — a classic intermittent-defect
// generator. The global copy is only ever used with `.replace()`, which resets the index itself.
const NO_OP_PROBE = /\b(?:not applicable|n\/?a|none needed|nothing here|no comments?|not reviewed|no review needed|no action|nothing to report|not required|not checked|no note|none)\b/i;

/**
 * Words that name a scope rather than a finding. They are stripped before the no-op test so that
 * "not applicable to this release" does not survive on the word "release".
 */
const SCOPE_FILLER = /\b(?:to|in|for|at|on|this|that|these|those|it|its|here|now|release|build|candidate|version|change|changes|update|updates)\b/gi;

/**
 * What counts as a date in a team-gate row.
 *
 * QA F-QA-2 / @code-reviewer (blind run 14): the shape check was bare `\d{4}-\d{2}-\d{2}`, so
 * `2026-13-99` and `9999-99-99` satisfied it. A row whose date is not a date cannot be aged, which
 * is the only thing the requirement is for. Month 01-12 and day 01-31, and a plausible year.
 * It is still a shape check: `2026-02-31` passes. Recorded as a limit, not claimed as validation.
 */
const DATE_SHAPE = /(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])/;

/**
 * Read the UTTERLY SATISFIED team gate out of a readiness record.
 *
 * Returns an ARRAY of rows — an empty array when no table is present, so callers can distinguish
 * "no gate" from "gate failed". (The docstring here used to say it returns null, which it never
 * did.)
 *
 * Is this heading the team gate heading?
 *
 * Tolerant of spelling and of word order: "## UTTERLY SATISFIED team gate",
 * "### 6.1 Team Gate (UTTERLY SATISFIED)" and "## UTTERLY SATISFIED Team-Gate" all name it. The
 * literal form was a false-diagnosis generator: a record whose heading was reworded was told it
 * contained no team gate table while its table was right there.
 */
function isGateHeading(line) {
  const s = String(line).replace(/[^A-Za-z0-9]+/g, ' ').toUpperCase();
  return s.includes('UTTERLY SATISFIED') && s.includes('TEAM') && s.includes('GATE');
}

function teamGateRows(text) {
  const rows = [];
  // ONLY the table under the team gate heading. The document can hold other tables — the shipped
  // readiness template's §6 has a Status column — and a status token in one of those is not a
  // reviewer disposition. Measured (panel, 2026-10-22): the shipped template, filled in exactly
  // as printed, FAILED the gate with rows named "@product-manager" and "QA".
  //
  // The comment that used to sit here claimed the opposite — that a row mentioning no disposition
  // is skipped "exactly as they always were". They were not: they were never scoped to the table.
  let inGate = false;
  let gateLevel = 6;
  for (const line of String(text || '').split('\n')) {
    if (/^\s*#{1,6}\s/.test(line)) {
      // The gate section ends at the next heading of the SAME OR HIGHER level. Ending it at ANY
      // heading made a `#### Roster` sub-heading between the gate heading and the table read as
      // "no team gate table" — a false diagnosis on a record that had one.
      const level = (line.match(/^\s*(#{1,6})/) || ['', ''])[1].length;
      if (inGate && level <= gateLevel) inGate = false;
      if (isGateHeading(line)) { inGate = true; gateLevel = level; }
      continue;
    }
    if (!inGate) continue;
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim().replace(/^`|`$/g, ''));
    if (cells.length < 2) continue;
    // F5 (panel, 2026-10-22): the disposition cell was found by scanning for a cell CONTAINING a
    // state word, and `state` was set to that WHOLE cell. A DOMAIN column that merely mentions the
    // word hijacked the row: "| @qa-engineer | Sign-off SATISFIED by vendor | `SATISFIED` | refund
    // reconciliation pending |" produced the state "SIGN-OFF SATISFIED BY VENDOR", which matches no
    // filter — so the row skipped the thinness check, the contradiction check AND the blocking
    // check, while still counting for the roster. Measured: that row returned PASS with zero
    // failures. It is pre-existing (identical at the base commit) and it bypassed every fix below.
    //
    // The rule now: the disposition cell must hold EXACTLY one of the four tokens, and it must be
    // the ONLY cell that does. There is no second pass and no fallback — a row whose disposition
    // cannot be pinned to one cell is MALFORMED and fails closed. See the `ambiguous` branch below.
    // A qualifier in brackets is not part of the disposition: "`CHANGES REQUESTED` (not fixed)" is
    // a CHANGES REQUESTED row. Reading it as "some cell that happens to contain the words" let a
    // DOMAIN cell win instead. Measured on the 2026-10-22 candidate: with the exact pass missing a
    // qualified disposition, the row read as SATISFIED, the unresolved CHANGES REQUESTED never
    // reached the blocking filter, and the gate returned PASS with zero failures.
    // ONE normalisation, so the separator question cannot be answered differently in two places.
    //
    // Every run of non-alphanumeric characters is a separator: a space, a hyphen, an en dash, an
    // em dash, a non-breaking hyphen, an UNDERSCORE, a slash, a dot, a semicolon. The earlier
    // versions enumerated a family, and every enumeration was one separator short of the next
    // finding: `CHANGES-REQUESTED` was caught, then `CHANGES_REQUESTED` was not.
    //
    // Measured (panel, 2026-10-22): a 19-reviewer roster plus a row reading `CHANGES_REQUESTED`
    // returned PASS with zero failures — the row matched neither the disposition pattern nor the
    // "mentions a disposition" test, and was skipped entirely.
    const DISPOSITION_PATTERN = /^(?:NOT ACTIVATED|CHANGES REQUESTED|BLOCKED|SATISFIED)$/;
    // TWO readings of the same cell, and the difference is the whole point.
    //
    //   dispositionText  — the QUALIFIER DELETED. This answers "which disposition is this?".
    //   dispositionScan  — the QUALIFIER INTACT.  This answers "what does this row claim?".
    //
    // Reading the qualifier as if it were not there deleted EVIDENCE. Measured 2026-10-22:
    // `| @tech-lead | \`SATISFIED\` (CHANGES REQUESTED) | plan approved |` returned
    // `ok:true, verdict: PASS, failures: 0` on this candidate — and FAILED on the base commit,
    // which read the whole cell. The gate was strictly weaker than the base because of a
    // punctuation character. `SATISFIED` (BLOCKED) and `SATISFIED` (refund reconciliation pending)
    // were the same forgery.
    const dispositionScan = (cell) => cell
      .replace(/[`*]/g, '')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    // The qualifier is stripped FIRST, then the separators collapse. The other order deletes the
    // parentheses before it can find them, and the qualifier becomes part of the token.
    const dispositionText = (cell) => cell
      .replace(/[`*]/g, '')
      .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    // The disposition cell must be UNAMBIGUOUS. If MORE THAN ONE cell is exactly a disposition
    // token, the row does not say which one it meant, and the gate does not guess: the row is
    // MALFORMED and fails closed.
    //
    // Taking the FIRST one was the defect this replaces. Measured (panel, 2026-10-22): the shipped
    // template puts Domain BEFORE State, so a row whose domain column reads exactly `SATISFIED`
    // captured the row, the real `CHANGES REQUESTED` was demoted to evidence, and the unresolved
    // request never reached the blocking filter — the gate returned PASS with zero failures.
    const exact = [];
    for (let i = 0; i < cells.length; i++) {
      const c = dispositionText(cells[i]);
      if (DISPOSITION_PATTERN.test(c)) exact.push({ index: i, state: c });
    }
    let stateIndex = -1;
    let state = '';
    let ambiguous = false;
    if (exact.length === 1) { stateIndex = exact[0].index; state = exact[0].state; }
    else if (exact.length > 1) { ambiguous = true; stateIndex = exact[0].index; state = exact[0].state; }
    let agentIndex = cells.findIndex((c, i) => i !== stateIndex && (c.startsWith('@') || /^\S+$/.test(c)));
    if (agentIndex === -1) agentIndex = 0;
    const agent = cells[agentIndex];
    // A row that mentions NO disposition at all is not a team-gate row — it is the table header,
    // the separator, or a note. Those are skipped, exactly as they always were.
    // The SAME normalisation the pattern above uses, so a row that says CHANGES_REQUESTED is
    // READ as a CHANGES REQUESTED row rather than skipped. A row that mentions a disposition in
    // any other spelling is MALFORMED and fails closed.
    const mentionsDisposition = cells.some((c) =>
      /\b(?:NOT ACTIVATED|CHANGES REQUESTED|BLOCKED|SATISFIED)\b/.test(dispositionScan(c)));
    // The disposition cell's own QUALIFIER is part of the row. `SATISFIED (CHANGES REQUESTED)`
    // names a CHANGES REQUESTED in the same cell that claims SATISFIED, and the row cannot be
    // pinned to one disposition — so it is MALFORMED and fails closed.
    let qualifierNamesDisposition = false;
    if (stateIndex !== -1) {
      const qualifier = dispositionScan(cells[stateIndex])
        .replace(new RegExp(`\\b${state}\\b`, 'i'), ' ');
      qualifierNamesDisposition = /\b(?:NOT ACTIVATED|CHANGES REQUESTED|BLOCKED|SATISFIED)\b/.test(qualifier);
    }
    if (stateIndex === -1 && !mentionsDisposition) continue;
    if (stateIndex === -1 || ambiguous || qualifierNamesDisposition) {
      // No cell in this row IS a disposition, so the disposition cannot be read. The row is
      // MALFORMED and the gate fails it. It does not guess.
      //
      // The guess was the defect. The old fallback took the first cell that CONTAINED a
      // disposition word, so a domain column that mentioned a prior verdict ("Prior verdict
      // SATISFIED") won over the real disposition and an unresolved CHANGES REQUESTED never reached
      // the blocking filter — measured: the gate returned PASS with zero failures. A second guess
      // (the LAST such cell) fails the other way: an evidence cell that mentions a disposition
      // would win over the state.
      //
      // A row whose disposition nobody can read — or whose disposition is ambiguous, because two
      // cells both claim it — is not a sign-off. The protocol asks for exactly one of four tokens
      // in the State column; anything else is a malformed record.
      rows.push({
        agent: agent.replace(/^\|\s*/, ''), state: 'UNREADABLE DISPOSITION', reason: '',
        date: '', evidenceCells: [], malformed: true,
      });
      continue;
    }
    // F-4: capture the REMAINING cells. Previously only the agent and the disposition were read, so
    // the Evidence column was invisible to this gate and a row could be flipped to SATISFIED while
    // its own evidence kept saying the work was outstanding.
    // A1b (@architect HIGH, blind run 14): the reason cell is the one AFTER the disposition. Reading
    // every remaining cell instead meant a row's DOMAIN column supplied the words — measured: sixteen
    // of nineteen personas could be NOT ACTIVATED with an empty reason and the record still passed,
    // because "Test coverage and release certification" is four substantive tokens. The failure even
    // followed the domain text rather than the reason. A gate that supervises roster narrowing must
    // not be satisfiable by narrowing the roster.
    const afterState = cells.slice(stateIndex + 1);
    // A1 (blind run 13): the date is METADATA, not evidence. Left in the evidence string it props up
    // a thin or placeholder cell — measured in tests/test_launch_readiness.test.js D1, where "..."
    // plus a date stopped reading as a placeholder because the 10 date characters alone cleared the
    // thinness floor. Split it out and check each on its own terms.
    // F2 (panel, 2026-10-22): the evidence was the JOIN of every cell after the disposition. The
    // contradiction rule suppresses itself when the cell carries a resolution word ("resolved",
    // "re-verified"), and that suppression was applied to the join — so a resolution word in ANY
    // later cell silenced the contradiction for the whole row. Measured: "| @qa-engineer | Test
    // coverage | SATISFIED | refund reconciliation pending | 2026-10-16, re-verified |" returned PASS.
    // The evidence is now the FIRST cell after the disposition that is not date-shaped, so no later
    // cell can vouch for it.
    const dateMatch = afterState.join(' ').match(DATE_SHAPE);
    const strip = (s) => s.replace(new RegExp(DATE_SHAPE.source, 'g'), ' ').replace(/\s+/g, ' ').trim();
    // A cell is DATE-ONLY when nothing survives the date strip. "readiness reviewed 2026-10-16" is
    // an evidence cell that happens to carry a date; "2026-10-16" is the date column. Testing for a
    // date anywhere in the cell would throw the first away.
    const evidenceCell = afterState.find((c) => strip(c) !== '') || '';
    // D2c (run-12 B9, blind run 16 review): the evidence the CONTRADICTION check reads was still
    // taken from EVERY remaining cell, not from the cell after the disposition.
    //
    // WHAT THIS DOES AND DOES NOT FIX, stated precisely because the first draft of this comment
    // got it wrong. The THINNESS check already read the cell after the disposition (that was A1b),
    // so a domain column could not launder a PLACEHOLDER evidence cell — the shape the B9 finding
    // described. What was still open was the CONTRADICTION path: `evidenceContradicts` suppresses
    // itself when the cell carries a resolution word ("resolved", "verified", "passed"), and that
    // suppression was applied to the joined cell. So a DOMAIN column containing a resolution word
    // silenced the contradiction for the whole row.
    //
    // Measured, with the joined read: `| @qa-engineer | Billing incident resolved by the vendor |
    // SATISFIED | refund reconciliation pending |` produced NO failure at all — the row passed while
    // its own evidence said the reconciliation was pending. With the evidence read from the cell
    // after the disposition, the same row is reported. The evidence is now the cell AFTER the
    // disposition, the same rule the reason uses.
    // ONE field. The cell after the disposition holds the EVIDENCE for a SATISFIED row and the
    // REASON for a NOT ACTIVATED row; `state` decides which. An earlier revision kept two fields
    // (`evidence` and `reason`) holding one value, and the second was never read.
    const reason = strip(evidenceCell);
    rows.push({
      agent: agent.replace(/^\|\s*/, ''), state, reason,
      date: dateMatch ? dateMatch[0] : '',
      // Every post-disposition cell, kept separately. The contradiction check reads them ONE AT A
      // TIME, because it suppresses itself when a cell carries a resolution word ("resolved",
      // "re-verified") — and a resolution word in a NEIGHBOURING cell must not silence a
      // contradiction in this one. Measured (panel, 2026-10-22): "| @qa-engineer | Test coverage |
      // SATISFIED | refund reconciliation pending | 2026-10-16, re-verified |" returned PASS.
      // EVERY cell of the row except the agent and the disposition, checked ONE AT A TIME.
      //
      // The Domain column is before the State column in the shipped template, and a Domain that
      // says "billing reconciliation pending" is a contradiction like any other. Reading only the
      // cells AFTER the disposition dropped it — measured (panel, 2026-10-22): a row reading
      // `| @qa-engineer | billing reconciliation pending | SATISFIED | qa-signoff.md GO |` passed on
      // the candidate and failed on the base commit. One cell at a time, so no cell's resolution
      // word can excuse another cell's contradiction.
      // The index is carried THROUGH the filter. `filter(...).map((c, i) => ...)` gives `map` the
      // FILTERED index, which is not `stateIndex` — so the disposition token was never removed from
      // the disposition cell, and the removal landed on the cell after it. Inert today only because
      // "SATISFIED" is not a contradiction or a resolution word; a future token would mis-scan every
      // row silently.
      evidenceCells: cells
        .map((c, i) => ({ c, i }))
        .filter(({ i }) => i !== agentIndex)
        .map(({ c, i }) => {
          let text = strip(c);
          if (i === stateIndex) {
            // The disposition token itself is not a claim — "BLOCKED" is a disposition, not a
            // contradiction — but the cell's QUALIFIER is, so it joins the scan without the token.
            text = text.replace(new RegExp(`\\b${state}\\b`, 'i'), ' ');
          }
          return text;
        })
        .filter(Boolean),
    });
  }
  return rows;
}

/**
 * Does a SATISFIED row's own evidence contradict its disposition?
 *
 * F-4 (blind /launch run 2026-10-08): measured by flipping @security-engineer to `SATISFIED` while
 * leaving its Evidence cell reading "key rotation pending". The gate returned PASS. A reviewer
 * recorded as satisfied, on evidence that says the thing is pending, is not a judgement call — it
 * is a record that contradicts itself, and a self-contradicting sign-off is not a sign-off.
 *
 * NEGATION AND RESOLUTION. A blunt keyword test would flag correct evidence: "no outstanding
 * issues" is a positive claim that contains "outstanding". So a token only counts when it is NOT
 * preceded by a negator and the cell carries no resolution word.
 *
 * KNOWN LIMIT, stated rather than hidden. This is a word-level heuristic, not a proof. Evidence
 * phrased in a way none of these tokens recognise ("rotation still to happen", "key work remains")
 * will pass. It closes the specific forgery — relabel the disposition, leave the evidence — and it
 * does not pretend to close every way a sign-off can be untrue. The word-level limit is the reason
 * a launch still needs a human who reads the table.
 */
// The multi-word tokens use \s+ because the cell is normalised: "follow-up" and "follow up" are
// the same words once every separator is a space.
const CONTRADICTION_TOKENS = /\b(pending|outstanding|unresolved|incomplete|todo|tbd|awaiting|blocked|changes\s+requested|not\s+done|not\s+complete|not\s+yet|follow\s+up|remediation)\b|\bstill\s+(open|pending|outstanding|blocked|broken|missing)\b|\bremains?\s+(open|pending|outstanding|blocked|to\s+be|to\s+do)\b|\bwork\s+remains?\b/i;
const NEGATOR_NEAR = /\b(no|not|never|zero|none|nothing|without|nil)\b/i;
const RESOLUTION_WORDS = /\b(resolved|fixed|closed|complete|completed|done|shipped|landed|verified|retested|green|passed|passing|cleared)\b/i;

/**
 * Is there a rollback plan with actual content in the go/no-go record?
 *
 * Requires a rollback heading AND at least a few words beneath it. The word count matters: a
 * heading called "Rollback" followed by "TBD" satisfies a heading check while providing nothing,
 * which is the same token-versus-substance problem as F-5.
 */
/**
 * Does the rollback plan name WHO executes it?
 *
 * A1 (blind run 13, @architect HIGH). `rollbackPlanPresent` required a heading and four words of
 * body — measured: a procedure with no responsible person passed. The skill's own text says the
 * rollback check requires "a trigger, an owner, and a time to revert", and the go/no-go template
 * printed the first and third and never the second. A plan nobody owns is a plan nobody runs.
 */
function rollbackOwnerPresent(text) {
    const t = String(text || '');
    const body = rollbackSectionBody(t);
    if (body === null) return false;
    if (!/@[a-z][\w-]*/i.test(body)) return false;
    // A1c (blind run 16, @architect): a mention governed by a negation is not an owner. Measured:
    // "must NOT page @devops-engineer" satisfied the check, so the cheapest way through the gate was
    // a sentence promising NOT to call the person who runs the rollback. A negation is the one
    // mechanically detectable way a mention can fail to be an owner, so the gate fails closed on it
    // \u2014 the failure message says exactly what to write instead. Attribution ("the runbook was
    // written by @x") and idioms like "do not hesitate to page @x" are caught too; that is
    // deliberate. Fail-closed with a remedy beats a guess that cannot see intent.
    // F5/F-D (panel, 2026-10-22): the negator list was short and the window was 48 characters, so
    // several ordinary ways of NOT naming an owner still counted as naming one:
    //   "@devops-engineer should not be paged"   -> PASS (the negation sits AFTER the mention)
    //   "no one should page @x", "avoid paging @x" -> PASS (the negator was not in the list)
    //   "Do not, under any circumstances whatsoever, escalate this to @devops-engineer" -> PASS
    //     (54 characters between the negator and the mention; the window was 48)
    // The check now runs in both directions, over a wider window, and it still fails closed: a
    // mention that cannot be checked as an owner is not an owner.
    const negated = body
      .replace(
        /\b(?:not|never|without|don't|do not|must not|cannot|can't|should not|shouldn't|no need to|no one|nobody|neither|nor|rather than|instead of|avoid(?:ing|s)?|skip(?:ping|s)?|refrain(?:ing|s)? from|omit(?:ting|s)?|no (?:page|paging|call|calling|contact|contacting|notify|notifying|escalate|escalating))\b[^.;\n]{0,80}?\s@[a-z][\w-]*/gi,
        '')
      .replace(
        /@[a-z][\w-]*\s+(?:should|must|is|are|was|were|will|shall|can|could|would)?\s*(?:not|never)\b[^.;\n]{0,40}/gi,
        '');
    return /@[a-z][\w-]*/i.test(negated);
  }

/**
 * The body of the record's rollback section: from the rollback heading to the next heading.
 *
 * ONE extraction, used by both the owner check and the plan check. The two used to extract the
 * section separately, and the copies had already drifted.
 */
function rollbackSectionBody(text) {
  const t = String(text || '');
  const m = t.match(/^#{1,4}\s*.*rollback.*$/im);
  if (!m) return null;
  const rest = t.slice(m.index + m[0].length);
  // Stop at the next heading of the same or higher level: the plan is the section's body.
  const nextHeading = rest.search(/^#{1,4}\s+/m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function rollbackPlanPresent(text) {
  const raw = rollbackSectionBody(text);
  if (raw === null) return false;
  const body = raw
    .replace(/^\s*[-*+]?\s*\|?\s*/gm, ' ')
    .replace(/[`*_#>|-]/g, ' ')
    .trim();
  return body.split(/\s+/).filter(Boolean).length >= 4;
}

/**
 * ONE separator convention, TWO disposition readings.
 *
 * Every path that reads a cell turns every run of non-alphanumeric characters into a space, so the
 * SAME spelling is caught in every column: `CHANGES-REQUESTED`, `CHANGES_REQUESTED`,
 * `CHANGES/REQUESTED`, `not-done`, `not_yet`, `refund_reconciliation_pending` and
 * `refundReconciliationPending` are all read the same way. Measured 2026-10-22:
 * `| @qa-engineer | SATISFIED | CHANGES-REQUESTED by security |` returned PASS with zero
 * failures, while the same spelling in the disposition column was caught. The base gate failed both.
 * This is round six's defect class on the sibling path.
 *
 * Camel case is split too: `refundReconciliationPending` is prose, not a single 28-letter word.
 *
 * The two disposition readings differ only in what they do with the QUALIFIER: `dispositionText`
 * deletes it (to ask "which disposition is this?") and `dispositionScan` keeps it (to ask "what
 * does this row claim?"). The separator convention is shared; the readings are not.
 */
function cellText(cell) {
  return String(cell == null ? '' : cell)
    .replace(/[`*_>|]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The negators that can negate a NOUN standing BEFORE them. A negator AFTER a token usually
 * negates what follows it — "pending items NOT resolved" negates the resolution, not the pending —
 * so the after-window is restricted to the noun negators, which are the ones that can negate the
 * token in front of them ("still open: none").
 */
const AFTER_NEGATOR_NEAR = /\b(?:none|nothing|nil)\b/i;

function evidenceContradicts(evidence) {
  const e = String(evidence || '').trim();
  if (!e) return null; // handled separately: empty evidence is its own failure
  // The resolution-word suppression is per CELL: "rotation pending, now resolved" is ONE claim, and
  // splitting it would leave "pending" standing with its resolution in another clause.
  const resolutions = [...e.matchAll(new RegExp(RESOLUTION_WORDS.source, 'gi'))];
  const negatedResolution = resolutions.some((r) => {
    const before = e.slice(Math.max(0, r.index - 24), r.index);
    if (/\b(?:not|never|no|isn|wasn|aren|without|cannot|can't|nothing|neither|nor)\b/i.test(before)) return true;
    return /(?:^|[^a-z])(?:un|non|dis)[\s-]*$/i.test(before);
  });
  if (!negatedResolution && RESOLUTION_WORDS.test(e)) return null;
  // A sentence boundary or a semicolon separates claims. A comma does NOT: "no outstanding issues,
  // the refund reconciliation is pending" is one cell with a negation governing the FIRST claim and
  // a live contradiction in the second — and the per-token windows below see exactly that, because
  // the negation is far from the second token.
  // A sentence boundary or a semicolon separates claims. A DOT DOES NOT: `cellText` turns a dot into
  // a word separator, so splitting on it first made `work.remains` and `follow.up` pass while
  // `no.outstanding.issues` was rejected — the same character doing two jobs. Measured 2026-10-22.
  for (const rawClause of e.split(/[;\n]/)) {
    const clause = cellText(rawClause);
    if (!clause) continue;
    // EVERY token in the clause is examined. The old code took the FIRST match and let its negation
    // dismiss the whole cell, so "no outstanding issues, the refund reconciliation is pending"
    // passed — the first token was cancelled and the second was never looked at.
    for (const m of clause.matchAll(new RegExp(CONTRADICTION_TOKENS.source, 'gi'))) {
      const before = clause.slice(Math.max(0, m.index - 28), m.index);
      if (NEGATOR_NEAR.test(before)) continue;
      // A negator that belongs to a RESOLUTION word does not cancel the contradiction. "pending
      // items NOT resolved" negates the resolution, not the pending.
      const afterWide = clause.slice(m.index + m[0].length, m.index + m[0].length + 32);
      const after = afterWide.replace(
        new RegExp(`\\b(?:not|never|no|isn|wasn|aren)\\b(?=[^\\n]{0,8}\\b(?:${RESOLUTION_WORDS.source})\\b)`, 'gi'),
        ''
      ).slice(0, 14);
      if (AFTER_NEGATOR_NEAR.test(after)) continue;
      return m[0];
    }
  }
  return null;
}


function checkReadiness(text, root) {
  const failures = [];

  // 1. The QA sign-off. `/launch` halts without it; this decides whether it is there.
  const signoffPath = path.resolve(root, DEFAULTS.signoff);
  const signoff = readIf(signoffPath);
  if (!signoff) {
    failures.push(
      `qa-signoff.md is absent at ${path.relative(root, signoffPath)}. /launch names this as a ` +
        `hard NO-GO, and until now nothing checked it. Write it from ` +
        `\`artifacts/output/05-execution/quality/\` using the develop templates, then re-run.`
    );
  } else {
    // The SAME any-NO-GO-wins rule the go/no-go leg uses. This leg used to read the FIRST
    // bracketed verdict, so a sign-off carrying `VERDICT: [GO]` and later `VERDICT: [NO-GO]`
    // passed the gate with zero failures — while the message two lines below says "a NO-GO cannot
    // launch". Measured 2026-10-22: exit 0, zero failures.
    const signoffVerdicts = [];
    for (const mm of signoff.match(/VERDICT:\s*\[([A-Za-z-]+)\]/gi) || []) signoffVerdicts.push(mm.replace(/^.*\[/, '').replace(/\].*$/, '').toUpperCase());
    for (const mm of signoff.match(/\[(GO|CONDITIONAL|NO-GO)\]/gi) || []) signoffVerdicts.push(mm.slice(1, -1).toUpperCase());
    const holds = signoffVerdicts.filter((v) => v === 'NO-GO' || v === 'CONDITIONAL');
    const verdict = holds.length ? holds[0] : (signoffVerdicts.length ? 'GO' : null);
    if (!verdict) {
      failures.push('qa-signoff.md carries no bracketed verdict — the bracketed form is the machine-readable one.');
    } else if (verdict === 'NO-GO') {
      failures.push('qa-signoff.md verdict is [NO-GO] — a NO-GO cannot launch.'
        + (signoffVerdicts.includes('GO') ? ' The sign-off also carries [GO]; the NO-GO wins.' : ''));
    } else if (verdict === 'CONDITIONAL') {
      const sec = signoff.match(/##\s*Conditions[\s\S]*?(?=^##\s|(?![\s\S]))/im);
      const rows = sec ? sec[0].split('\n').filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|?\s*$/.test(l))
        .filter((l) => !/^\|\s*#?\s*\|/.test(l) && !/^\|\s*Condition\b/i.test(l) && !/^\|\s*—/.test(l)) : [];
      if (rows.length === 0) {
        failures.push('qa-signoff.md verdict is [CONDITIONAL] with no conditions named — that is a [GO] wearing a caveat.');
      } else {
        if (rows.some((r) => !/@[a-z-]+/i.test(r))) {
          failures.push(`qa-signoff.md has ${rows.filter((r) => !/@[a-z-]+/i.test(r)).length} condition(s) with no owner.`);
        }
        // F-9 (blind /launch run 2026-10-08): a row marked `Blocking? Yes` that also carries an
        // owner and a date satisfies the two checks above while the condition is STILL OPEN. Measured:
        // adding an owner and a date to one `Blocking: Yes` row converted the gate to PASS with the
        // defect unresolved. Paperwork is not remediation.
        //
        // The `Blocking?` column existed in the template and in every sign-off the gate had ever
        // checked, and was never read by anything. A column nobody reads cannot constrain anything.
        const blockingRows = rows.filter((r) => /\|\s*yes\s*\|\s*$/i.test(r) || /\bblocking\b[^|]*\|\s*yes/i.test(r));
        if (blockingRows.length) {
          failures.push(
            `qa-signoff.md lists ${blockingRows.length} condition(s) marked Blocking: Yes — a ` +
            'CONDITIONAL verdict carrying a blocking condition is not a GO. The owner and the date ' +
            'make it trackable; they do not make it resolved. Resolve the condition, or change the ' +
            'Blocking? column to No and say why it is no longer blocking.'
          );
        }
        if (rows.some((r) => !/\d{4}-\d{2}-\d{2}/.test(r))) {
          failures.push(`qa-signoff.md has ${rows.filter((r) => !/\d{4}-\d{2}-\d{2}/.test(r)).length} condition(s) with no date.`);
        }
      }
    }
  }

  // 2. The UTTERLY SATISFIED team gate. Every active reviewer satisfied, or specifically out of
  //    scope. An unresolved CHANGES REQUESTED or BLOCKED is a hard NO-GO by the skill's own words.
  const rows = teamGateRows(text);
  if (rows.length === 0) {
    failures.push(
      'release-readiness.md contains no UTTERLY SATISFIED team gate table. The gate is the ' +
        'condition that every active reviewer is satisfied; without the rows there is nothing to ' +
        'verify, and "verified" is not the same as "absent".'
    );
  } else {
    const blocking = rows.filter((r) => /CHANGES REQUESTED|BLOCKED/i.test(r.state));
    if (blocking.length > 0) {
      failures.push(
        `UTTERLY SATISFIED team gate: ${blocking.length} unresolved ` +
          `(${blocking.map((r) => `${r.agent}: ${r.state}`).join('; ')}). An unresolved ` +
          `CHANGES REQUESTED or BLOCKED is a hard NO-GO.`
      );
    }
    // F-4: a SATISFIED row needs evidence, and that evidence must not contradict the disposition.
    //
    // ORDER MATTERS AND THE ORIGINAL ORDER WAS WRONG. Running `evidenceTooThin` first and `continue`-
    // ing made the contradiction check unreachable for exactly the values most likely to be lies: a
    // cell reading `tbd` is thin AND contradicts a claim that the work is finished, but the thin check
    // fired first, `continue` skipped the rest, and the specific lie was reported as generic
    // emptiness. A test asserting that `tbd` is caught as a contradiction went red.
    //
    // Both checks now run and both report. They answer different questions — "is there anything to
    // check?" and "does what is here say the opposite?" — and one being true does not answer the other.
    // A1 (blind run 13, @architect HIGH). The satisfaction protocol requires an "evidence-backed,
    // DATED row", and the template prints a Date column — but nothing read it. Measured: a complete
    // 19-agent, template-shaped roster with every date cell blank returned PASS. A sign-off with no
    // date cannot be aged, cannot be superseded, and cannot be told from one written for a previous
    // release — which is the whole reason the protocol asks for it.
    const undated = rows.filter((r) => r.state === 'SATISFIED' && !r.date);
    if (undated.length) {
      failures.push(
        // QA F-QA-2: the list stopped at four names with no marker, so "5 rows" showed four and a
        // reader had to diff the table for the fifth. Say how many were left out.
        `${undated.length} SATISFIED row(s) carry no date (${undated.slice(0, 4).map((r) => r.agent).join(', ')}` +
        `${undated.length > 4 ? `, and ${undated.length - 4} more` : ''}). ` +
        'The protocol requires a dated row and the template prints a Date column: an undated sign-off ' +
        'cannot be aged or superseded, and reads the same as one written for a previous release. The ' +
        'accepted form is ISO `YYYY-MM-DD` anywhere in the row; `October 16, 2026` and `2026/10/16` ' +
        'are not read as dates, so this also fires for a malformed date, not only an absent one.'
      );
    }
    
    for (const r of rows.filter((x) => x.state === 'SATISFIED')) {
      // The same A1b defect applied here: a SATISFIED row with a BLANK evidence cell passed whenever
      // its domain column carried the words. SKILL.md:41 asks for a row "marked SATISFIED with
      // evidence" — the evidence cell is where that lives.
      const why = evidenceTooThin(r.reason);
      if (why) {
        failures.push(
          `Team gate row "${r.agent}" is SATISFIED with ${why}. A disposition nobody can check is ` +
            'an assertion, not a sign-off — and this gate is the only thing that ever reads it.'
        );
      }
      // Each post-disposition cell is checked on its own. The check suppresses itself when the cell
      // carries a resolution word, so a join would let one cell's "resolved" excuse another's
      // "pending". One cell, one verdict.
      let contradiction = null;
      let contradictingCell = '';
      for (const cell of r.evidenceCells) {
        const c = evidenceContradicts(cell);
        if (c) { contradiction = c; contradictingCell = cell; break; }
      }
      if (contradiction) {
        failures.push(
          `Team gate row "${r.agent}" is SATISFIED while its own evidence says "${contradiction}" ` +
            `("${contradictingCell}"). A record that contradicts itself is not a sign-off. Either finish the ` +
            'work, or change the disposition to match what the evidence actually says.'
        );
      }
    }

    // A row whose Disposition column does not hold one of the four tokens is a malformed record,
    // not a sign-off. The parser no longer guesses which cell meant the disposition.
    const malformed = rows.filter((r) => r.malformed);
    if (malformed.length) {
      failures.push(
        `${malformed.length} team-gate row(s) carry a disposition the gate cannot read or cannot ` +
          `pin to one cell ` +
          `(${malformed.slice(0, 4).map((r) => r.agent).join(', ')}` +
          `${malformed.length > 4 ? `, and ${malformed.length - 4} more` : ''}). The Disposition ` +
          'State column must hold exactly one of ' +
          'SATISFIED, NOT ACTIVATED, CHANGES REQUESTED or BLOCKED, and only one cell of the row ' +
          'may hold one. ' +
          'A row whose disposition nobody can read is not a sign-off, and the gate will not guess ' +
          'which cell was meant.'
      );
    }

    // F-6 (blind /launch run 2026-10-08): a table containing ONE reviewer row returned PASS with
    // zero failures. The gate parsed whatever rows existed and never asked who was MISSING, so the
    // cheapest way to empty a gate was to delete nineteen rows. Deactivating a reviewer is allowed
    // and is recorded; deleting one is not the same act and must not be invisible.
    //
    // BLIND /LAUNCH RUN 7, @code-reviewer seat: the required roster was FIVE personas, so a team gate
    // passed with fourteen of the nineteen the protocol names having no row whatsoever. The gate's own
    // error message states the principle it then breaks — "deleting the row hides the decision instead
    // of recording it" — and fourteen deletions were invisible because only five were missed.
    //
    // The fix is not to assert that all nineteen always matter. It is to require that each of the
    // nineteen appears, either with a disposition or as NOT ACTIVATED with a specific out-of-scope
    // reason (the F-5 path, which already demands a real explanation). A cast that genuinely differs
    // records WHY, and a reader can see twelve deliberate deactivations rather than twelve silences.
    //
    // KNOWN LIMIT, stated rather than hidden: this is the protocol's roster, not a model of whose
    // review this particular release needed. It is a completeness requirement on the RECORD, not a
    // claim that domain review occurred.
    const REQUIRED_REVIEWERS = [
      '@architect', '@code-reviewer', '@data-analyst', '@developer', '@devops-engineer',
      '@founder', '@ml-ai-engineer', '@ml-ai-ops', '@performance-engineer', '@product-designer',
      '@product-manager', '@qa-engineer', '@researcher', '@security-engineer', '@shifu',
      '@tech-lead', '@technical-writer', '@user-researcher', '@ux-researcher',
    ];
    const present = new Set(rows.map((r) => String(r.agent).toLowerCase()));
    const missing = REQUIRED_REVIEWERS.filter((a) => !present.has(a));
    if (missing.length) {
      failures.push(
        `Team gate is missing ${missing.length} required reviewer row(s): ${missing.join(', ')}. ` +
          'A reviewer can be deactivated, but deleting the row hides the decision instead of ' +
          'recording it — mark the row NOT ACTIVATED with a specific out-of-scope reason.'
      );
    }

    const notActivated = rows.filter((r) => /NOT ACTIVATED/i.test(r.state));
    // NOBODY SIGNED OFF, and the count is over the REQUIRED REVIEWERS, not over the parsed rows.
    //
    // The first version of this check compared `notActivated.length` with `rows.length` — "is every
    // ROW deactivated?". One extra row in the gate section that is not a deactivation breaks the
    // equality and the forgery is restored: measured 2026-10-22, a complete roster of nineteen
    // NOT ACTIVATED rows plus a single `| @ghost-reviewer | SATISFIED | ... |` line returned
    // `exit=0, verdict=PASS, failures=0` — zero of nineteen reviewers signed off. A row reading
    // `| Notes | SATISFIED | ... |` did the same. The invariant the message states is "at least one
    // REQUIRED reviewer must record a disposition the gate can check", so that is what the code asks.
    //
    // The shared REASON is not the defect: the shipped template's own deactivation shape is one
    // shared reason across the inactive reviewers, and the repository pins that as a passing record.
    // The handle is compared case-INSENSITIVELY, like the missing-row check above. It was not, and
    // a required reviewer written as `@QA-ENGINEER` counted as PRESENT (so no missing-row failure)
    // but not as having signed off - so a legitimate record was rejected with "none of the 19
    // required reviewers signed off". Fail-closed, but a false rejection of a real release.
    const signedOff = rows.filter((r) =>
      REQUIRED_REVIEWERS.includes(String(r.agent).toLowerCase()) && !/NOT ACTIVATED/i.test(r.state));
    if (rows.length && signedOff.length === 0) {
      failures.push(
        'none of the ' + REQUIRED_REVIEWERS.length + ' required reviewers signed off — every one ' +
          'is NOT ACTIVATED. A complete roster of deactivations is a roster nobody worked: at ' +
          'least one required reviewer must record a disposition the gate can check. (A row that ' +
          'is not one of the required reviewers does not count as that reviewer.)'
      );
    }
    for (const r of notActivated) {
      const reason = r.reason || '';
      // F-5 (blind /launch run 2026-10-08): the accepted pattern included the bare word `reason`,
      // so an evidence cell containing exactly `reason` satisfied it and the gate returned PASS. A
      // check that rewards a token rather than a reason is not a check. The token is gone; a
      // substantive explanation is now required.
      // LIMIT, stated rather than hidden: the reason bar is a word count with a two-character floor
      // (see `saysSomething`). A six-word reason that carries one substantive token and no no-op
      // phrase passes, so a blanket deactivation is caught only when every reviewer is deactivated
      // (see the "nobody signed off" rule above). The full fix for that class is the schema
      // recommendation in the closeout register, not a longer word list.
      const words = reason.replace(/[`*_]/g, '').trim().split(/\s+/).filter(Boolean);
      // FIXED AFTER BLIND /LAUNCH RUN 8: the previous rule was a FINGERPRINT — ≥4 tokens plus one
      // sanctioned phrase. `out of scope: a` and `out of scope: x` satisfied it, i.e. four characters
      // of zero information passed as "a specific out-of-scope reason", while honest 8-token reasons
      // (`no model or prompt surface in this release`) failed for lacking the magic phrase. The exact
      // irony: the sibling fix rejects `x` as evidence while this accepted `out of scope: x` as a
      // reason.
      //
      // The honest version asks what a specific reason actually does: it NAMES WHAT IS OUT OF SCOPE.
      // So require at least two substantive tokens — words that describe a thing — after the stop
      // words that carry no information (`out of scope: a` has none).
      // D1 (run-12 B9, blind run 16 review): "because" is a connective, not a name. Measured: the
      // reason "out of scope: n/a because reasons" passed, because "because" was the single
      // substantive token and the escape hatch accepted it on word count alone. The connectives are
      // now stop words, and the escape hatch is closed when the reason carries a no-op phrase — so a
      // reason padded with fillers cannot pass on length.
      // The vocabulary is FUNCTION_WORD plus REASON_ABSENCE_WORD — a STRICTER list than the
      // evidence path's ABSENCE_WORD. The two bars ask different questions: evidence asks whether
      // somebody looked, a reason asks what is out of scope. So "no findings" is evidence while
      // "nothing to report" is not a reason.
      //
      // Measured (panel, 2026-10-22): "out of scope: nothing to report" and "out of scope: nothing
      // relevant owing to reasons" were both accepted, because the old stop-word list knew
      // "nothing" but not "report" or "relevant".
      const substantive = words.filter((w) => saysSomething(w, REASON_ABSENCE_WORD));
      const carriesNoOp = NO_OP_PROBE.test(reason);
      const namesWhat = substantive.length >= 2 || (substantive.length >= 1 && words.length >= 6 && !carriesNoOp);
      if (words.length < 3 || !namesWhat) {
        failures.push(
          `Team gate row "${r.agent}" is NOT ACTIVATED without a specific out-of-scope reason — ` +
            `blanket deactivation is how a gate gets quietly emptied. Writing the word "reason" is ` +
            `not a reason: say what is out of scope and why (got: "${reason.slice(0, 60)}").`
        );
      }
    }
  }

  // 3. The go/no-go decision must exist and be a decision, not a blank.
  const goNoGo = readIf(path.resolve(root, DEFAULTS.goNoGo));
  const goNoGoVerdict = goNoGo ? declaredVerdict(goNoGo) : null;
  if (!goNoGo) {
    failures.push(`go-nogo-decision.md is absent at ${DEFAULTS.goNoGo}. Readiness without a recorded decision is not a decision.`);
  } else if (!goNoGoVerdict) {
    // A bare word anywhere is not a decision. Measured: a document titled `# Go/No-Go`, whose
    // only content was "still thinking about it", satisfied /\b(GO|NO-GO|CONDITIONAL)\b/ purely
    // from its own heading. A document's title is not its verdict — and a readiness check that
    // reads one as the other will pass a launch that was never decided.
    failures.push(
      'go-nogo-decision.md states no verdict. Record it explicitly — `**Verdict:** GO`, ' +
        '`NO-GO`, or `CONDITIONAL`, or `VERDICT: [GO]` — with the reasoning. A heading that ' +
        'mentions the options is not a decision, and `skipped` must never be read as approval.'
    );
  } else if (!rollbackPlanPresent(goNoGo)) {
    // F-8 (blind /launch run 2026-10-08): SKILL.md:54 names a missing rollback plan as a hard NO-GO
    // and step-01:123 asks for rollback CRITERIA — what triggers one and who executes it. Nothing
    // checked any of it, so a five-line go/no-go with no rollback passed unchanged. A contract stated
    // in prose that no gate can falsify is the defect this whole pass has been removing.
    failures.push(
      'go-nogo-decision.md records no rollback plan. A release that cannot be undone has no ' +
        'failure path — add a `## Rollback` section stating what triggers a rollback, who executes ' +
        'it, and how long it takes. Naming the word is not a plan.'
    );
  } else if (!rollbackOwnerPresent(goNoGo)) {
    // QA F-QA-3 (blind run 14): the owner branch was inserted in front of the plan branch and
    // inherited its body, so a go/no-go that DID record a plan was told it recorded none. Two
    // messages, one of them false. The branches are now ordered plan-then-owner, each with its own.
    failures.push(
      'The rollback plan names no owner. What this gate checks is a rollback heading, a substantive ' +
      'body, and an owner `@handle`; the trigger and the time to revert are asked for by step-01 and ' +
      'are NOT checked here (@architect, blind run 15 — the message used to quote the skill and ' +
      'overstate what it enforces). A plan nobody owns is a plan nobody runs. A mention governed ' +
      'by a negation ("do not page @x") does not count \u2014 if that is the only mention in the ' +
      'section, name the owner directly: `**Rollback owner:** @handle`.'
    );
  } else if (goNoGoVerdict !== 'GO') {
    // F-2: a recorded NO-GO is not a formatting problem, it is a human decision not to ship. The
    // gate reporting PASS over one means the gate's verdict and the release's verdict are different
    // signals and only one of them is being read.
    const dv = declaredVerdictDetail(goNoGo);
    const conflict = dv.conflict
      ? ' The record says GO somewhere else as well — a record carrying both GO and NO-GO is a ' +
        'conflicting record, and a conflicting record is a NO-GO until a human reconciles it.'
      : '';
    failures.push(
      `go-nogo-decision.md records **${goNoGoVerdict}**, not GO. A recorded decision to hold is a ` +
        'hard NO-GO on deployment — the gate cannot ship a release its own decision record declines ' +
        'to ship. Flip the record only when the decision itself genuinely changes.' + conflict
    );
  }

  return failures;
}

function runScan(root, args) {
  const spec = path.resolve(root, args.spec || DEFAULTS.scan);
  const info = { ran: false, code: null, findings: 0, specPath: path.relative(root, spec), reason: null };

  if (!fs.existsSync(spec)) {
    info.reason = `no rule table at ${info.specPath}`;
    return info;
  }
  if (!fs.existsSync(SCAN)) {
    info.reason = `scanner missing at ${path.relative(root, SCAN)}`;
    return info;
  }
  // A named allowlist that cannot be read is fail-closed, never silently skipped. The scanner
  // already exit-2s on an unreadable allowlist; this surfaces the reason in the gate's report.
  const scanArgs = [SCAN, '--dir', root, '--spec', spec, '--json'];
  if (args.scanAllowlist) {
    const ap = path.resolve(root, args.scanAllowlist);
    info.allowlist = path.relative(root, ap);
    if (!fs.existsSync(ap)) {
      info.reason = `scan allowlist named but missing at ${info.allowlist}`;
      return info;
    }
    scanArgs.push('--allowlist-file', ap);
  }
  const res = spawnSync('node', scanArgs, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error) { info.reason = `scanner could not run: ${res.error.message}`; return info; }
  info.ran = true;
  info.code = res.status;
  try {
    const j = JSON.parse(res.stdout || '{}');
    info.findings = Array.isArray(j.findings) ? j.findings.length : 0;
    // F-11: what the allowlist HID. A clean scan that silently suppressed eight findings and a
    // clean scan that found nothing are the same output unless the suppressed set is on the record.
    // Measured (blind /launch run 4): a two-line allowlist naming src/payments.js turned a release
    // carrying a live Stripe credential into a clean scan, and the output looked reviewed because
    // the allowlist PATH was printed — never the findings it suppressed.
    info.suppressed = Array.isArray(j.suppressed) ? j.suppressed : [];
    // The scope travels with the result. A launch gate that prints `ok:true` without saying what
    // it scanned is indistinguishable from one that scanned everything — which is the whole
    // finding that motivated the scope in the first place.
    info.scope = j.scope || { applied: false };
    if (info.scope && info.scope.applied) info.scannedScope = info.scope.product_roots;
  } catch {
    info.reason = `scanner output was not JSON (exit ${res.status})`;
  }
  if (info.code === 2) info.reason = `scanner reported a tool failure (exit 2) — fail-closed, never read as clean`;
  return info;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    console.error('Usage: node launch_readiness_check.js check [--root R] [--spec P] [--scan-allowlist P] [--require-readiness] [--require-scan] [--json]');
    process.exit(2);
  }

  const root = args.root ? path.resolve(args.root) : process.cwd();
  const readinessPath = path.resolve(root, DEFAULTS.readiness);
  const text = readIf(readinessPath);

  const scan = runScan(root, args);

  if (text === null) {
    if (args.requireReadiness) {
      const msg = `release-readiness.md is absent at ${readinessPath}, but this gate was invoked ` +
        `with --require-readiness (the /launch step-01 gate). Reaching the readiness check means a ` +
        `readiness record is in scope, so an absent file is a missing deliverable, not an ` +
        `out-of-scope skip. Write it from the template and re-run.`;
      if (args.json) {
        console.log(JSON.stringify({ ok: false, skipped: false, verdict: 'FAIL', required: true, reason: msg, readiness: { path: readinessPath, found: false }, scan, failures: [msg] }, null, 2));
      } else {
        console.error('✗ launch readiness check FAILED — required readiness record absent');
        console.error(`  ${msg}`);
      }
      process.exit(1);
    }
    if (args.json) {
      console.log(JSON.stringify({ ok: true, skipped: true, verdict: 'SKIPPED', reason: 'release-readiness.md not present (launch not in scope)', readiness: { path: readinessPath, found: false }, scan, failures: [] }, null, 2));
    } else {
      console.log('✓ launch readiness check skipped — release-readiness.md not present (launch not in scope)');
    }
    process.exit(0);
  }

  const failures = checkReadiness(text, root);
  const warnings = [];

  // F-14 (blind /launch run 6, 2026-10-09): /launch never checked the discovery canvases it depends
  // on. An empathy map declaring `Evidence basis: interviewed` with zero quotes and no source
  // material reached launch unnoticed, because the canvas had its own gate and nothing called it.
  //
  // A gate that exists but is never invoked is the `security-scan.js`-invoked-by-zero-skills defect
  // again, one layer up. The launch gate is the last mechanical checkpoint before a release, so it
  // is the right place to notice a research artifact that cannot support the claims built on it.
  //
  // Only canvases that EXIST are checked — an absent one is not a launch failure, because a release
  // may legitimately have no journey map. One that exists and does not conform IS a failure.
  const CANVASES = [
    { kind: 'empathy-map', rel: 'artifacts/output/02-research/empathy-map.md' },
    { kind: 'journey-map', rel: 'artifacts/output/02-research/journey-map.md' },
    { kind: 'jtbd', rel: 'artifacts/output/02-research/jtbd-hmw.md' },
    { kind: 'root-cause', rel: 'artifacts/output/02-research/root-cause-analysis.md' },
  ];
  for (const c of CANVASES) {
    const abs = path.resolve(root, c.rel);
    if (!fs.existsSync(abs)) continue;
    const r = spawnSync('node', [CANVAS_CHECK, 'check', '--kind', c.kind, '--file', abs, '--json'], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    let j = {};
    try { j = JSON.parse(r.stdout || '{}'); } catch { j = {}; }
    if (r.status !== 0) {
      failures.push(
        `${c.rel} does not conform to the ${c.kind} contract, and a release is being built on it: ` +
        `${(j.failures || []).slice(0, 2).join(' ')}` +
        `${(j.failures || []).length > 2 ? ` (+${j.failures.length - 2} more)` : ''} ` +
        'Fix with `discovery_canvas_check.js check --kind ' + c.kind + ' --file ' + c.rel + '`.'
      );
    }
  }

  // F-10 (blind /launch run 2026-10-08): the scan's SCOPE can silently skip code.
  //
  // Measured: this repository's own spec uses `mode: include-list`, whose product_roots list this
  // ENGINE's directories and deliberately omits `src`. Pointed at a product tree, the scan dropped
  // `src/` entirely — and a live Stripe key vanished from the findings, with `warnings: []`. The
  // spec's own mode_note documents this exact failure in prose and answers it with "Do not copy
  // `mode: include-list` into a product repository". Nothing enforced that sentence.
  //
  // An exclusion list fails closed; an inclusion allowlist fails open. The only way to stop relying
  // on a reader's good intentions is to make the failure impossible, so a scope that drops
  // source-shaped files is now a hard failure rather than a documented risk.
  //
  // This repository is unaffected: it drops 0 source files, because artifacts/ and sandbox/ are
  // removed earlier by excluded_trees and never reach the inclusion filter.
  const scanScope = scan.scope || {};
  if ((scan.suppressed || []).length) {
    const sup = scan.suppressed;
    warnings.push(
      `The scan reported ${scan.findings || 0} findings and SUPPRESSED ${sup.length} via the reviewed allowlist ` +
      `(${scan.allowlist || 'no allowlist recorded'}): ` +
      sup.slice(0, 3).map((f) => `${f.rule} ${f.path}${f.line ? ':' + f.line : ''}`).join('; ') +
      (sup.length > 3 ? `; +${sup.length - 3} more` : '') +
      '. A clean scan with suppressed findings is not a clean scan. Each entry is a claim that a ' +
      'human read it — verify that claim.'
    );
  }

  if (scanScope.mode === 'include-list' && (scanScope.dropped_source_files || 0) > 0) {
    failures.push(
      `The scan scope silently dropped ${scanScope.dropped_source_files} source file(s) ` +
      `(e.g. ${(scanScope.dropped_source_sample || []).join(', ')}). An inclusion allowlist skips ` +
      'every directory nobody remembered to list, and a skipped file cannot fail a check. This spec ' +
      'is written for the Vespyr engine; pointed at a product tree it skips the product. Use the ' +
      'default exclude-list scope, or add the tree to product_roots.'
    );
  }

  // The scan. Enforced only with --require-scan AND a resolvable spec, and this gate refuses to
  // convert a scanner failure into a pass.
  if (scan.ran) {
    if (scan.code === 0) {
      // clean
    } else if (scan.code === 1) {
      const f = `security-scan.js reported ${scan.findings} finding(s) against ${scan.specPath} — ` +
        `a finding at launch is a blocker, not a checklist row.`;
      if (args.requireScan) failures.push(f);
      else warnings.push(`${f} (not enforced: pass --require-scan)`);
    } else {
      const f = `security-scan.js could not produce a clean result (exit ${scan.code}${scan.reason ? ` — ${scan.reason}` : ''}). ` +
        `A scanner failure is never read as clean.`;
      // Fail-closed even without the flag: this is not "no findings", it is "no answer".
      failures.push(f);
    }
  } else if (args.requireScan) {
    failures.push(`security scan was required but did not run: ${scan.reason}.`);
  } else {
    warnings.push(`security scan not run: ${scan.reason} (pass --spec or --require-scan to enforce).`);
  }

  const ok = failures.length === 0;

  if (args.json) {
    console.log(JSON.stringify({
      ok,
      // PASS | FAIL | SKIPPED. `ok` alone cannot express "not applicable" — this repo has launch
      // out of scope, and a consumer that read only `ok:true` would record a security sign-off
      // that never happened. `verdict` is the field to branch on.
      verdict: ok ? 'PASS' : 'FAIL',
      readiness: { path: readinessPath, found: true },
      teamGate: teamGateRows(text).length,
      scan,
      failures,
      warnings,
    }, null, 2));
  } else if (ok) {
    console.log(`✓ launch readiness: prerequisites present, team gate satisfied, ${scan.ran ? `scan clean` : 'scan not enforced'}`);
  } else {
    console.error(`✗ launch readiness check FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'})`);
    console.error('  Launch readiness was a prose checklist. These are the items it could not falsify.');
    for (const m of failures) console.error(`  - ${m}`);
  }
  if (!args.json) for (const w of warnings) console.error(`  ! ${w}`);

  process.exit(ok ? 0 : 1);
}

main();