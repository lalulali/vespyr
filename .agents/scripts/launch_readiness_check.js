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
 * Read the UTTERLY SATISFIED team gate out of a readiness record.
 * Returns null when no table is present, so callers can distinguish "no gate" from "gate failed".
 */

/**
 * A declared verdict, not a word that happens to appear.
 *
 * Requires an explicit field or the bracketed machine form. This exists because the previous
 * check was `\b(GO|NO-GO|CONDITIONAL)\b` over the whole file, which a `# Go/No-Go` heading
 * satisfied on its own.
 */
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
function declaredVerdict(text) {
  const field = String(text || '').match(
    /\*\*(?:Verdict|Decision|Recommendation):\*\*\s*`?\[?(GO|NO-GO|CONDITIONAL)\]?`?/i);
  if (field) return field[1].toUpperCase();
  const bracketed = String(text || '').match(/VERDICT:\s*\[(GO|NO-GO|CONDITIONAL)\]/i);
  if (bracketed) return bracketed[1].toUpperCase();
  return null;
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
 * MINIMUM: two tokens, eight characters, at least one real word, and not a bare non-answer. Short
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
  const tokens = clean.split(' ').filter(Boolean);
  const hasRealWord = tokens.some((t) => /[a-z0-9]{4,}/i.test(t));
  if (!hasRealWord) return 'no substantive word ("' + clean.slice(0, 40) + '")';
  if (clean.length < 8) return 'too short to check ("' + clean + '")';
  return null;
}

function teamGateRows(text) {
  const rows = [];
  for (const line of String(text || '').split('\n')) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim().replace(/^`|`$/g, ''));
    if (cells.length < 2) continue;
    const stateCell = cells.find((c) => /SATISFIED|CHANGES REQUESTED|BLOCKED|NOT ACTIVATED/i.test(c));
    if (!stateCell) continue;
    const state = stateCell.toUpperCase();
    const agent = cells.find((c) => c.startsWith('@') || /^\S+$/.test(c)) || cells[0];
    // F-4: capture the REMAINING cells. Previously only the agent and the disposition were read, so
    // the Evidence column was invisible to this gate and a row could be flipped to SATISFIED while
    // its own evidence kept saying the work was outstanding.
    const evidence = cells
      .filter((c) => c !== stateCell && c !== agent)
      .join(' ')
      .trim();
    rows.push({ agent: agent.replace(/^\|\s*/, ''), state, evidence });
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
const CONTRADICTION_TOKENS = /\b(pending|outstanding|unresolved|incomplete|todo|tbd|awaiting|blocked|changes requested|not done|not complete|not yet|follow-?up|remediation)\b|\bstill\s+(open|pending|outstanding|blocked|broken|missing)\b|\bremains?\s+(open|pending|outstanding|blocked|to be|to do)\b|\bwork\s+remains?\b/i;
const NEGATOR_NEAR = /\b(no|not|never|zero|none|nothing|without|nil)\b/i;
const RESOLUTION_WORDS = /\b(resolved|fixed|closed|complete|completed|done|shipped|landed|verified|retested|green|passed|passing|cleared)\b/i;

/**
 * Is there a rollback plan with actual content in the go/no-go record?
 *
 * Requires a rollback heading AND at least a few words beneath it. The word count matters: a
 * heading called "Rollback" followed by "TBD" satisfies a heading check while providing nothing,
 * which is the same token-versus-substance problem as F-5.
 */
function rollbackPlanPresent(text) {
  const t = String(text || '');
  const m = t.match(/^#{1,4}\s*.*rollback.*$/im);
  if (!m) return false;
  const rest = t.slice(m.index + m[0].length);
  // Stop at the next heading of the same or higher level: the plan is the section's body.
  const nextHeading = rest.search(/^#{1,4}\s+/m);
  const body = (nextHeading === -1 ? rest : rest.slice(0, nextHeading))
    .replace(/^\s*[-*+]?\s*\|?\s*/gm, ' ')
    .replace(/[`*_#>|-]/g, ' ')
    .trim();
  return body.split(/\s+/).filter(Boolean).length >= 4;
}

function evidenceContradicts(evidence) {
  const e = String(evidence || '').trim();
  if (!e) return null; // handled separately: empty evidence is its own failure
  const m = e.match(CONTRADICTION_TOKENS);
  if (!m) return null;
  if (RESOLUTION_WORDS.test(e)) return null;
  // Negation can sit on either side of the token: "no outstanding issues", "no issues still open",
  // and "still open: none" are all positive claims. A window either side covers the ways these
  // records are actually written; a token with no negator anywhere near it is a contradiction.
  const before = e.slice(Math.max(0, m.index - 28), m.index);
  const after = e.slice(m.index + m[0].length, m.index + m[0].length + 14);
  if (NEGATOR_NEAR.test(before)) return null;
  if (NEGATOR_NEAR.test(after)) return null;
  return m[0];
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
    const m = signoff.match(/VERDICT:\s*\[([A-Za-z-]+)\]/) || signoff.match(/\[(GO|CONDITIONAL|NO-GO)\]/i);
    const verdict = m ? m[1].toUpperCase() : null;
    if (!verdict) {
      failures.push('qa-signoff.md carries no bracketed verdict — the bracketed form is the machine-readable one.');
    } else if (verdict === 'NO-GO') {
      failures.push('qa-signoff.md verdict is [NO-GO] — a NO-GO cannot launch.');
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
    for (const r of rows.filter((x) => x.state === 'SATISFIED')) {
      const why = evidenceTooThin(r.evidence);
      if (why) {
        failures.push(
          `Team gate row "${r.agent}" is SATISFIED with ${why}. A disposition nobody can check is ` +
            'an assertion, not a sign-off — and this gate is the only thing that ever reads it.'
        );
      }
      const contradiction = evidenceContradicts(r.evidence);
      if (contradiction) {
        failures.push(
          `Team gate row "${r.agent}" is SATISFIED while its own evidence says "${contradiction}" ` +
            `("${r.evidence}"). A record that contradicts itself is not a sign-off. Either finish the ` +
            'work, or change the disposition to match what the evidence actually says.'
        );
      }
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
    for (const r of notActivated) {
      const line = String(text).split('\n').find((l) => l.includes(r.agent)) || '';
      const reason = r.evidence || '';
      // F-5 (blind /launch run 2026-10-08): the accepted pattern included the bare word `reason`,
      // so an evidence cell containing exactly `reason` satisfied it and the gate returned PASS. A
      // check that rewards a token rather than a reason is not a check. The token is gone; a
      // substantive explanation is now required.
      const SPECIFIC = /out.of.scope|not applicable|n\/a because|does not apply|no (work|surface|change)/i;
      const words = reason.replace(/[`*_]/g, '').trim().split(/\s+/).filter(Boolean);
      if (!SPECIFIC.test(reason) || words.length < 4) {
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
  } else if (goNoGoVerdict !== 'GO') {
    // F-2: a recorded NO-GO is not a formatting problem, it is a human decision not to ship. The
    // gate reporting PASS over one means the gate's verdict and the release's verdict are different
    // signals and only one of them is being read.
    failures.push(
      `go-nogo-decision.md records **${goNoGoVerdict}**, not GO. A recorded decision to hold is a ` +
        'hard NO-GO on deployment — the gate cannot ship a release its own decision record declines ' +
        'to ship. Flip the record only when the decision itself genuinely changes.'
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
    info.rules = j.findings;
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
      `The scan reported 0 findings but SUPPRESSED ${sup.length} via the reviewed allowlist ` +
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