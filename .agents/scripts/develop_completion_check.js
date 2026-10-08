#!/usr/bin/env node
/**
 * develop_completion_check.js — the terminal gate of `/develop`.
 *
 * WHY THIS EXISTS
 * `/plan` shipped no gate (fixed: `execution_plan_check.js`). `/design` shipped two.
 * `/motion` shipped three. `/develop` — the largest workflow in the engine, and the one
 * everything downstream depends on — shipped **zero**, and its Done-when was three lines of
 * prose, one of which read:
 *
 *     - `qa-signoff.md` exists with GO/CONDITIONAL
 *
 * That is literally a mechanical check, and nothing performed it. Worse, measured across the
 * whole repo: **no step file, no script, and no template produced `qa-signoff.md` at all.**
 * `/launch` halts when it is "missing or is not GO/CONDITIONAL", so the pipeline's own terminal
 * gate was a file with no producer — `/develop` would report completion and `/launch` would
 * then halt on a document nobody had ever been asked to write.
 *
 * WHAT IT CHECKS
 *   - the sign-off exists, and carries a BRACKETED verdict `[GO]`/`[CONDITIONAL]`/`[NO-GO]`
 *   - `[GO]` with unresolved blockers is a contradiction
 *   - `[CONDITIONAL]` requires every condition to carry an owner and a date
 *   - `[NO-GO]` always fails: it is a verdict, not a completion
 *   - every artifact the sign-off cites exists on disk (DNA 5 — a citation to a file that is
 *     not present is a fabrication)
 *   - a coverage report older than the newest source change is stale and fails, because
 *     `qa-engineer.md` requires a refresh before sign-off and nothing enforced it
 *
 * ABSENCE IS CONTEXT-DEPENDENT, the same rule as the motion and plan gates. By default a missing
 * sign-off is a skip (exit 0) — correct for callers where development is not in scope. Under
 * `--require-signoff` — which `/develop` step 10 must pass — absence is a FAILURE, because
 * reaching completion means a sign-off is in scope.
 *
 * Usage:
 *   node .agents/scripts/develop_completion_check.js check [--signoff P] [--code-root DIR]
 *     [--root DIR] [--require-signoff] [--json]
 *
 * Exit 0 = conformant or skipped. Exit 1 = failure (listed). Exit 2 = usage/IO error.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  signoff: 'artifacts/output/05-execution/quality/qa-signoff.md',
  codeRoot: 'src',
};

const VERDICTS = new Set(['GO', 'CONDITIONAL', 'NO-GO']);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--require-signoff') args.requireSignoff = true;
    else if (a === '--signoff') args.signoff = argv[++i];
    else if (a === '--code-root') args.codeRoot = argv[++i];
    else if (a === '--root') args.root = argv[++i];
    else args._.push(a);
  }
  return args;
}

const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

/** The bracketed verdict, which is the machine-readable one. */
function verdictOf(text) {
  const m = text.match(/VERDICT:\s*\[([A-Za-z-]+)\]/);
  if (m) return m[1].toUpperCase();
  // Bare `[GO]` anywhere is accepted as a fallback, but a bare word is not: "we should go"
  // must never be read as a verdict.
  const b = text.match(/\[(GO|CONDITIONAL|NO-GO)\]/i);
  return b ? b[1].toUpperCase() : null;
}

/** Newest mtime under a directory, or null. */
function newestMtime(dir) {
  if (!fs.existsSync(dir)) return null;
  let newest = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        try { newest = Math.max(newest, fs.statSync(p).mtimeMs); } catch { /* ignore */ }
      }
    }
  };
  walk(dir);
  return newest || null;
}

function checkSignoff(text, root) {
  const failures = [];
  const warnings = [];

  const verdict = verdictOf(text);
  if (!verdict) {
    failures.push(
      'qa-signoff.md carries no bracketed verdict. Write `VERDICT: [GO]`, `[CONDITIONAL]` or ' +
        '`[NO-GO]` — the bracketed form is the machine-readable one, and an unbracketed ' +
        'sentence is not a verdict.'
    );
    return { verdict: null, failures, warnings };
  }
  if (!VERDICTS.has(verdict)) {
    failures.push(`qa-signoff.md verdict "[${verdict}]" is not one of [GO], [CONDITIONAL], [NO-GO].`);
    return { verdict, failures, warnings };
  }

  if (verdict === 'NO-GO') {
    failures.push(
      'qa-signoff.md verdict is [NO-GO] — that is a verdict, not a completion. `/develop` cannot ' +
        'finish on a NO-GO; either the findings close and the verdict changes, or the cycle halts.'
    );
  }

  // Cited artifacts must exist. A citation to a file that is not on disk is a fabrication.
  const cited = [...text.matchAll(/`(05-execution\/[A-Za-z0-9_./-]+\.md)`/g)].map((m) => m[1]);
  const unique = [...new Set(cited)];
  for (const rel of unique) {
    if (!fs.existsSync(path.resolve(root, 'artifacts/output', rel))) {
      failures.push(
        `qa-signoff.md cites \`${rel}\`, which does not exist under artifacts/output/. A ` +
          `sign-off citing evidence that is not on disk is uncited, not signed off (DNA 5).`
      );
    }
  }

  // [GO] with named conditions is a contradiction — a condition is a blocker by definition.
  const conditionRows = (() => {
    const sec = text.match(/##\s*Conditions[\s\S]*?(?=^##\s|(?![\s\S]))/im);
    if (!sec) return [];
    return sec[0]
      .split('\n')
      .filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|?\s*$/.test(l))
      .map((l) => l.trim())
      .filter((l) => !/^\|\s*#?\s*\|/.test(l) && !/^\|\s*Condition\b/i.test(l) && !/^\|\s*—/.test(l));
  })();
  if (verdict === 'GO' && conditionRows.length > 0) {
    failures.push(
      `qa-signoff.md verdict is [GO] but the Conditions table names ${conditionRows.length} ` +
        `condition(s). A condition is a blocking finding by definition — the verdict for that ` +
        `state is [CONDITIONAL].`
    );
  }

  if (verdict === 'CONDITIONAL') {
    if (conditionRows.length === 0) {
      failures.push(
        'qa-signoff.md verdict is [CONDITIONAL] with no conditions named. A conditional verdict ' +
          'must say what the conditions are — otherwise it is a [GO] wearing a caveat.'
      );
    } else {
      // Each condition needs an owner and a date.
      const noOwner = conditionRows.filter((r) => !/@[a-z-]+/i.test(r));
      const noDate = conditionRows.filter((r) => !/\d{4}-\d{2}-\d{2}/.test(r));
      if (noOwner.length) {
        failures.push(
          `qa-signoff.md has ${noOwner.length} condition(s) with no named owner. An unowned ` +
            `condition is a wish; name the agent or role who closes it.`
        );
      }
      if (noDate.length) {
        failures.push(
          `qa-signoff.md has ${noDate.length} condition(s) with no date. An undated condition ` +
            `cannot be tracked and will be renewed silently.`
        );
      }
      warnings.push(
        `Verdict is [CONDITIONAL]: ${conditionRows.length} blocking condition(s) carried to launch.`
      );
    }
  }

  if (verdict === 'GO') {
    const open = text.match(/##\s*Open findings carried forward[\s\S]*?(?=^##\s|(?![\s\S]))/im);
    if (open) {
      const rows = open[0]
        .split('\n')
        .filter((l) => /^\s*\|/.test(l))
        .filter((l) => !/^\s*\|[\s:|-]+\|?\s*$/.test(l))
        .filter((l) => !/^\|\s*Finding\b/i.test(l))
        .filter((l) => !/^\|\s*—\s*\|/.test(l));
      if (rows.length > 0) {
        failures.push(
          `qa-signoff.md verdict is [GO] but ${rows.length} open finding(s) are carried forward. ` +
            `Either they are closed, or the verdict is [CONDITIONAL].`
        );
      }
    }
  }

  return { verdict, failures, warnings };
}

/** A coverage report older than the newest source change describes code that no longer exists. */
function checkFreshness(root, args) {
  const failures = [];
  const coverage = path.resolve(root, 'artifacts/output/05-execution/quality/coverage-report.md');
  const codeRoot = path.resolve(root, args.codeRoot || DEFAULTS.codeRoot);
  if (!fs.existsSync(coverage)) return failures;
  const newest = newestMtime(codeRoot);
  if (newest === null) return failures; // no code to compare against — cannot judge, so do not guess
  const report = fs.statSync(coverage).mtimeMs;
  if (newest > report) {
    const days = ((newest - report) / 86400000).toFixed(1);
    failures.push(
      `coverage-report.md is stale by ${days} day(s): source code under ${path.relative(root, codeRoot) || '.'} ` +
        `changed after the report was generated. A stale report describes code that no longer ` +
        `exists — re-run \`req_to_impl_check.js\` and \`--fidelity\` before signing off ` +
        `(qa-engineer.md requires the refresh; nothing enforced it until now).`
    );
  }
  return failures;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    console.error('Usage: node develop_completion_check.js check [--signoff P] [--code-root DIR] [--root R] [--require-signoff] [--json]');
    process.exit(2);
  }

  const root = args.root ? path.resolve(args.root) : process.cwd();
  const signoffPath = path.resolve(root, args.signoff || DEFAULTS.signoff);
  const text = readIf(signoffPath);

  if (text === null) {
    if (args.requireSignoff) {
      const msg =
        `qa-signoff.md is absent at ${signoffPath}, but this gate was invoked with ` +
        `--require-signoff (the /develop step-10 gate). Reaching completion means a sign-off is ` +
        `in scope, so an absent file is a missing deliverable, not an out-of-scope skip. Write it ` +
        `from \`.agents/skills/develop/templates/qa-signoff.md\` and re-run.`;
      if (args.json) {
        console.log(JSON.stringify({ ok: false, skipped: false, required: true, reason: msg, signoff: { path: signoffPath, found: false }, failures: [msg] }, null, 2));
      } else {
        console.error('✗ develop completion check FAILED — required sign-off absent');
        console.error(`  ${msg}`);
      }
      process.exit(1);
    }
    if (args.json) {
      console.log(JSON.stringify({ ok: true, skipped: true, reason: 'qa-signoff.md not present (development completion not in scope)', signoff: { path: signoffPath, found: false } }, null, 2));
    } else {
      console.log('✓ develop completion check skipped — qa-signoff.md not present (completion not in scope)');
    }
    process.exit(0);
  }

  const { verdict, failures: vf, warnings } = checkSignoff(text, root);
  const failures = [...vf, ...checkFreshness(root, args)];
  const ok = failures.length === 0;

  if (args.json) {
    console.log(JSON.stringify({ ok, signoff: { path: signoffPath, found: true, verdict }, failures, warnings }, null, 2));
  } else if (ok) {
    console.log(`✓ develop completion: verdict [${verdict}], cited evidence present, ${warnings.length ? warnings.join(' ') : 'no blocking conditions'}`);
  } else {
    console.error(`✗ develop completion check FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'})`);
    console.error('  The sign-off is the terminal gate; these are the things it must settle before it is one.');
    for (const m of failures) console.error(`  - ${m}`);
  }
  for (const w of warnings) if (!args.json) console.error(`  ! ${w}`);

  process.exit(ok ? 0 : 1);
}

main();
