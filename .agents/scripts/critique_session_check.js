#!/usr/bin/env node
/**
 * critique_session_check.js — the gate for /elicitation's Sharpening Ledger.
 *
 * WHY THIS EXISTS. The skill carried a "Done when — checked mechanically" section naming this
 * script, and **the script did not exist.** `grep -c critique_session_check` returned 0 in the repo,
 * the install copy was ahead documenting it, and `git log --all` showed it had never been committed.
 * A documented gate with no implementation is worse than no gate: a reader trusts a check that was
 * never run.
 *
 * WHY GRILL-ME LEFT IT (owner ruling 2026-10-15). The script began as the shared gate for both
 * skills. Three things were checked before deleting the grill-me branch: it was never committed
 * (`git log --all` on this path is empty), nothing invoked it, and nothing in the repo read a
 * grill-me record. The owner had also returned the skill to the original's thinking-tool framing —
 * stateless, no record — which left the check with nothing to produce.
 *
 * Honest scoping: that last point is a CONSEQUENCE of the redesign, not independent evidence. An
 * earlier draft of this comment cited it as the reason, which overshot — at the previous committed
 * revision the skill DID emit a ledger, so the gate was not unproducible then. The branch was
 * already dead on the first three grounds; the redesign removed any reason to revive it.
 * Elicitation's branch remains, because its record is real and its skill still names this gate.
 *
 * WHAT IS CHECKED is coverage and disclosure — never quality. The limits are printed as notes on a
 * green run rather than pretended into the gate.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');


/** elicitation's closed outcome vocabulary. */
const OUTCOMES = ['applied', 'discarded', 'refined'];

/** elicitation's closed skip taxonomy — parity with brainstorming's SPC skips. */
const SKIP_REASONS = ['user-explicit-override', 'no-applicable-method', 'time-boxed'];

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  } else {
    console.error(`✗ critique_session_check: ${msg}`);
  }
  process.exit(2);
}

/** Body of a heading matching `headingRe`, up to the next same-or-higher heading. */
function section(text, headingRe) {
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

function words(s) {
  return String(s == null ? '' : s).replace(/[`*_>|]/g, ' ').trim().split(/\s+/).filter(Boolean);
}


// ---------------------------------------------------------------------------------------------
// elicitation
// ---------------------------------------------------------------------------------------------

function checkElicitation(text) {
  const failures = [];
  const notes = [];

  // ---- the Sharpening Ledger: present and exactly five lines ---------------------------------
  const ledger = section(text, 'Sharpening Ledger') || '';
  if (!ledger.trim()) {
    failures.push(
      'No `## Sharpening Ledger`. The skill requires it as the session\'s communicable record — ' +
      'exactly five lines: original → sharpened, methods with outcomes, what changed, coverage ' +
      'count, residual open questions.'
    );
  } else {
    const lines = ledger.split('\n')
      .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '').trim())
      .filter(Boolean)
      .filter((l) => !/^#/.test(l));
    if (lines.length !== 5) {
      failures.push(
        `The Sharpening Ledger has ${lines.length} line(s); the skill requires exactly five. ` +
        'A ledger with the wrong number of lines is one nobody can read back.'
      );
    }
  }

  // ---- coverage count ------------------------------------------------------------------------
  const cov = String(text).match(/(\d+)\s*\/\s*(\d+)\s*points?/i);
  if (!cov) {
    failures.push(
      'No `{covered}/{total} points` count. The skill requires every enumerated point to end ' +
      '`covered` / `unexamined (disclosed)` / `deferred (owner + reason)` / `out-of-scope ("boundary")`, ' +
      'and the count is how a reader sees whether that happened.'
    );
  } else if (Number(cov[1]) > Number(cov[2])) {
    failures.push(`The coverage count reads ${cov[0]} — more covered than total.`);
  }

  // ---- outcome markers -----------------------------------------------------------------------
  const markers = [...String(text).matchAll(/\[ELICITATION:\s*([^\]]+)\]/gi)].map((m) => m[1].trim());
  if (!markers.length) {
    failures.push(
      'No `[ELICITATION: …]` outcome marker. The skill calls this CRITICAL: every method execution ' +
      `ends with one, naming an outcome from ${OUTCOMES.join(' | ')}. A marker the scorer cannot ` +
      'parse is a method that ran invisibly.'
    );
  }
  for (const raw of markers) {
    const m = raw.match(/^(.+?)\s*(?:->|→|—|–|-)\s*(applied|discarded|refined)\b(.*)$/i);
    if (!m) {
      const bare = /^(applied|discarded|refined)$/i.test(raw);
      failures.push(
        bare
          ? `The outcome marker "${raw}" names no method — a bare outcome is not a marker.`
          : `Cannot parse the outcome marker "[ELICITATION: ${raw.slice(0, 60)}]". The closed set is ` +
            `${OUTCOMES.join(' | ')}.`
      );
      continue;
    }
    const outcome = m[2].toLowerCase();
    const tail = m[3].trim();
    if (outcome === 'discarded') {
      const hasReason = /(user-rejected|superseded-by-[a-z][\w-]*)/i.test(tail);
      const hasBoundary = /out-of-scope\s*[—–-]\s*["“][^"”]{3,}["”]/i.test(tail);
      if (!hasReason && !hasBoundary) {
        failures.push(
          `"${m[1].trim()}" is \`discarded\` with no reason and no payload. The skill is explicit: ` +
          '"A bare `discarded` is not allowed." Use `user-rejected`, `superseded-by-<method>`, or ' +
          '`out-of-scope — "<quoted boundary>"`.'
        );
      }
    }
  }

  // ---- skips ---------------------------------------------------------------------------------
  for (const m of String(text).matchAll(/\[ELICITATION-SKIPPED:\s*([^\]]+)\]/gi)) {
    const body = m[1].trim();
    if (!SKIP_REASONS.some((r) => body.includes(r))) {
      failures.push(
        `"[ELICITATION-SKIPPED: ${body.slice(0, 60)}]" names no reason from the closed taxonomy ` +
        `${SKIP_REASONS.join(' / ')}. Parity rule: elicitation skips meet the same bar as ` +
        'brainstorming SPC skips — closed taxonomy, logged, counted.'
      );
    }
  }

  notes.push(
    'NOT CHECKED: whether the methods were applied well, whether the critique improved the artifact, ' +
    'and whether a skip reason is honest. Those need a human who was in the room.'
  );

  return { failures, notes };
}

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

const USAGE = `Usage: node .agents/scripts/critique_session_check.js check \\
  --kind elicitation --file <session.md> [--json]

grill-me:    NOT GATED. Owner ruling 2026-10-15: the skill is a thinking tool and writes nothing, so
             there is no record to check. Nothing consumes one — verified before removing the branch.
elicitation: a five-line Sharpening Ledger; a {covered}/{total} coverage count; outcome markers from
             applied|discarded|refined; discards carrying a reason and payload; skips from the
             closed taxonomy.

Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file || !args.kind) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') failClosed(`unknown command "${cmd}" (expected "check")`, args.json);
  if (args.kind !== 'elicitation') {
    failClosed(`unknown --kind "${args.kind}" (expected elicitation)`, args.json);
  }

  const file = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(file)) {
    failClosed(`cannot read ${args.file} — a missing session record is a missing deliverable, never a pass`, args.json);
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) failClosed(`${args.file} is empty — an empty session is a failure, not a pass`, args.json);

  const { failures, notes } = checkElicitation(text);
  const result = {
    kind: args.kind,
    ok: failures.length === 0,
    exit: failures.length ? 1 : 0,
    failures,
    notes,
    note:
      'Coverage and disclosure only. This does not judge whether the interrogation was any good — a ' +
      'session that asks eight shallow questions and dispositions all eight honestly passes, and should.',
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.ok) {
    console.log(`✓ ${args.kind}: coverage and disclosure conformant — ${args.file}`);
    for (const n of notes) console.log(`  ! ${n}`);
  } else {
    const plural = failures.length === 1 ? '' : 's';
    console.error(`✗ ${args.kind}: ${failures.length} issue${plural} — ${args.file}`);
    for (const f of failures) console.error(`  - ${f}`);
    for (const n of notes) console.error(`  ! ${n}`);
  }
  process.exit(result.exit);
}

main();
