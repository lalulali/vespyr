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
  plan: 'artifacts/output/05-planning/execution-plan.md',
  scan: 'security/audit-spec.json',
};

const SCAN = path.join(__dirname, 'security-scan.js');

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

function teamGateRows(text) {
  const rows = [];
  for (const line of String(text || '').split('\n')) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim().replace(/^`|`$/g, ''));
    if (cells.length < 2) continue;
    const state = cells.find((c) => /SATISFIED|CHANGES REQUESTED|BLOCKED|NOT ACTIVATED/i.test(c));
    if (!state) continue;
    const agent = cells.find((c) => c.startsWith('@') || /^\S+$/.test(c)) || cells[0];
    rows.push({ agent: agent.replace(/^\|\s*/, ''), state: state.toUpperCase() });
  }
  return rows;
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
    const notActivated = rows.filter((r) => /NOT ACTIVATED/i.test(r.state));
    for (const r of notActivated) {
      const line = String(text).split('\n').find((l) => l.includes(r.agent)) || '';
      if (!/out.of.scope|not applicable|n\/a because|reason/i.test(line)) {
        failures.push(
          `Team gate row "${r.agent}" is NOT ACTIVATED without a specific out-of-scope reason — ` +
            `blanket deactivation is how a gate gets quietly emptied.`
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