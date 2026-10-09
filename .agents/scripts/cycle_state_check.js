#!/usr/bin/env node
/**
 * cycle_state_check.js — the loop-closure gate for /retro and /iterate.
 *
 * WHY THIS EXISTS. Two skills state a limit and neither could check it.
 *
 * `/iterate` states "maximum 5 iteration cycles before a mandatory retro" in FOUR places across two
 * skills (its own SKILL.md twice, its step-06, and /retro's SKILL.md) — and there was no counter, no
 * state file, and nothing that read a number. Stating a limit four times does not make it
 * enforceable; it only makes it memorable, and a memorable limit is not a limit. `/retro` by contrast
 * got this right: `retro-state.md` carries `stepsCompleted`, `cycle`, and `status`, and the step
 * loader genuinely reads it. So one of the two had a mechanism and the other had prose, and the one
 * with prose was the one with a limit.
 *
 * What is checkable:
 *
 *   - a retro is complete only when stepsCompleted is [1,2,3,4,5] AND the digest exists and is real
 *   - an iteration state file exists and its counter agrees with its own cycle table
 *   - a SIXTH cycle cannot start until `lastRetroCycle` is recorded
 *   - a counted cycle has a result — "counted" and "measured" are not the same
 *
 * What is NOT checkable: whether a retro was any good, whether five cycles was the right number, or
 * whether the hypotheses were sound. Those need a human who was there.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MAX_CYCLES = 5;
const RETRO_STEPS = [1, 2, 3, 4, 5];

/** Frontmatter key/value pairs, plus the body. Tolerates missing or unterminated frontmatter. */
function splitDoc(text) {
  const t = String(text || '');
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { front: {}, body: t };
  const front = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) front[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { front, body: t.slice(m[0].length) };
}

function words(s) {
  return String(s || '')
    .replace(/[`*_>#|[\]()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  } else {
    console.error(`✗ cycle_state_check: ${msg}`);
  }
  process.exit(2);
}

function readIf(p) {
  try {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  } catch {
    return null;
  }
}

// --- retro -------------------------------------------------------------------------------------

function checkRetro(statePath, digestPath) {
  const failures = [];
  const raw = readIf(statePath);
  if (raw === null) {
    return {
      kind: 'retro',
      ok: false,
      exit: 1,
      failures: [
        `${statePath} is absent. /retro reads stepsCompleted from it to decide which step to load — ` +
        'without it the step loader has nothing to read and the loop has no memory of where it was.',
      ],
    };
  }
  const { front, body } = splitDoc(raw);

  // The frontmatter value keeps its brackets, so `[1, 2, 3, 4, 5]` split on commas yields
  // `['[1','2','3','4','5]']` and the outer two fail Number() — which silently reduced a COMPLETE
  // retro to `[2, 3, 4]` and failed every valid one. Strip the brackets before parsing.
  const rawCompleted = String(
    front.stepsCompleted !== undefined ? front.stepsCompleted
      : (body.match(/stepsCompleted:\s*\[([^\]]*)\]/) || [])[1] || ''
  ).replace(/[\[\]]/g, '');
  const completed = rawCompleted
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number);
  const valid = completed.filter((n) => Number.isFinite(n));

  if (!valid.length) {
    failures.push(
      'retro-state.md declares no completed steps. The step loader computes the next step as the ' +
      'first one NOT in stepsCompleted — an empty list means it always loads step 1.'
    );
  } else if (valid.length < RETRO_STEPS.length) {
    failures.push(
      `stepsCompleted is [${valid.join(', ')}] — ${RETRO_STEPS.length - valid.length} of 5 steps ` +
      'remain. A retro is not complete until all five have run.'
    );
  } else {
    const missing = RETRO_STEPS.filter((n) => !valid.includes(n));
    if (missing.length) {
      failures.push(
        `stepsCompleted [${valid.join(', ')}] is missing step(s) ${missing.join(', ')}. The loader ` +
        'walks to the first missing step, so a gap means the digest claims more than ran.'
      );
    }
  }

  if (front.status && /in-progress/i.test(front.status) && valid.length >= RETRO_STEPS.length) {
    failures.push(
      `status is "${front.status}" but all five steps are recorded complete. Pick one — a record ` +
      'that says both things at once cannot be used to decide whether the retro is done.'
    );
  }

  const digest = readIf(digestPath);
  if (digest === null) {
    failures.push(
      `retro-digest.md is absent. It is the retro\'s only durable output — without it the five ` +
      'steps produced process and left no record behind.'
    );
  } else {
    const n = words(digest).length;
    if (n < 60) {
      failures.push(
        `retro-digest.md has ${n} words. Five steps of hot-path scanning, pattern scanning and ` +
        'instinct scanning cannot be honestly summarised in fewer.'
      );
    }
  }

  return { kind: 'retro', ok: failures.length === 0, exit: failures.length ? 1 : 0, failures };
}

// --- iterate ------------------------------------------------------------------------------------

function checkIterate(statePath, rootDir) {
  const failures = [];
  const raw = readIf(statePath);
  if (raw === null) {
    return {
      kind: 'iterate',
      ok: false,
      exit: 1,
      failures: [
        `${statePath} is absent. The skill states a 5-cycle limit in four places and nothing counted ` +
        `the cycles — copy templates/iteration-state.md and increment it, or the limit is a sentence.`,
      ],
    };
  }
  const { front, body } = splitDoc(raw);

  const cycles = Number(front.cyclesCompleted);
  if (!Number.isFinite(cycles)) {
    failures.push(
      'iteration-state.md has no numeric `cyclesCompleted`. The limit cannot be checked against a ' +
      'value nobody maintains.'
    );
  } else if (cycles < 0 || !Number.isInteger(cycles)) {
    failures.push(`cyclesCompleted is "${front.cyclesCompleted}" — expected a non-negative integer.`);
  }

  // The counter must agree with the table beneath it. A counter that can drift from its own history
  // is a counter nobody can audit.
  const rows = body
    .split('\n')
    .filter((l) => /^\s*\|/.test(l))
    .filter((l) => !/^\s*\|[\s:|-]+\|?\s*$/.test(l))
    .filter((l) => !/\|\s*cycle\s*\|/i.test(l))
    .filter((l) => /\d{4}-\d{2}-\d{2}/.test(l));

  if (Number.isFinite(cycles) && rows.length !== cycles) {
    failures.push(
      `cyclesCompleted is ${cycles} but the cycle table records ${rows.length} row(s). A counter ` +
      'that disagrees with its own history is one nobody can audit — and the row count is the part ' +
      'a human can actually check.'
    );
  }

  // A counted cycle must have a recorded result. Counting attempts is how a limit stops limiting.
  for (const r of rows) {
    // Any cell carrying a verdict, not a fixed column index. Indexing by position picked the
    // Artifact column and reported every well-formed cycle as unrecorded — the same off-by-one that
    // made the jtbd gate call every job trivial because it read the row NUMBER as the When clause.
    // A table's columns move; a row's meaning does not.
    const cells = r.split('|').slice(1, -1).map((c) => c.trim());
    const result = cells.find((c) => /^(?:result\s*)?:?\s*(positive|neutral|negative)\b/i.test(c)) || '';
    if (!result) {
      failures.push(
        `A recorded cycle has no positive/neutral/negative result (row: ${r.trim().slice(0, 60)}). The ` +
        'skill\'s own Step 6 gate branches on exactly that signal; an unrecorded cycle is a cycle ' +
        'that proves nothing and must not count toward the limit.'
      );
      break;
    }
  }

  if (Number.isFinite(cycles) && cycles >= MAX_CYCLES) {
    const lastRetro = String(front.lastRetroCycle || '').trim();
    if (!lastRetro || lastRetro === '""') {
      failures.push(
        `${cycles} iteration cycles have been consumed and no retro is recorded. The skill makes ` +
        '`retro` MANDATORY at 5 — not optional, and not deferrable. Set `lastRetroCycle` once it ' +
        'has run. This check exists because that limit was stated four times and enforced zero times.'
      );
    }
    if (cycles > MAX_CYCLES) {
      failures.push(
        `cyclesCompleted is ${cycles}, past the ${MAX_CYCLES}-cycle limit. ` +
        (front.lastRetroCycle
          ? 'A retro is recorded, but work continued past the limit anyway — either the limit does ' +
            'not apply to this feature, or it was not honoured.'
          : 'No retro is recorded.')
      );
    }
  }

  // If a results artifact exists for a counted cycle, it must actually carry a measurement.
  if (Number.isFinite(cycles) && cycles > 0) {
    const results = path.resolve(rootDir, 'artifacts/output/07-iteration/iteration-results.md');
    if (!fs.existsSync(results)) {
      warnings(failures, results);
    } else {
      const body2 = readIf(results) || '';
      if (!/\bbefore\b/i.test(body2) || !/\bafter\b/i.test(body2)) {
        failures.push(
          'iteration-results.md records no before/after measurement. The skill\'s Done-when states ' +
          '"the hypothesis has a recorded before/after measurement — an unmeasured iteration is not ' +
          'shipped, it is guessed". Counting an unmeasured cycle toward the limit is worse than not ' +
          'counting it, because it looks like progress.'
        );
      }
    }
  }

  return { kind: 'iterate', ok: failures.length === 0, exit: failures.length ? 1 : 0, failures };
}

/** A missing results file for a counted cycle is a soft note, not a hard failure. */
function warnings(failures, p) {
  failures.push(
    `cyclesCompleted is greater than zero but ${p.replace(/^.*\//, 'artifacts/')} is absent. A cycle ` +
    'counts when its results exist with a measurement — not when it starts.'
  );
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kind') args.kind = argv[++i];
    else if (a === '--state') args.state = argv[++i];
    else if (a === '--digest') args.digest = argv[++i];
    else if (a === '--root') args.root = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

const USAGE = `Usage: node .agents/scripts/cycle_state_check.js check --kind <retro|iterate> [options]

  --kind    retro    --state artifacts/output/09-retro/retro-state.md
                     --digest artifacts/output/09-retro/retro-digest.md
           iterate  --state artifacts/output/07-iteration/iteration-state.md
                     --root   .            (for the results-artifact measurement check)

retro:    all five steps recorded complete, and a digest that is more than a stub.
iterate:  the counter agrees with its own cycle table, every counted cycle carries a result, and a
          sixth cycle cannot start until a retro is recorded.

Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.kind) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') failClosed(`unknown command "${cmd}" (expected "check")`, args.json);
  if (!['retro', 'iterate'].includes(args.kind)) {
    failClosed(`unknown --kind "${args.kind}" (expected retro or iterate)`, args.json);
  }
  if (!args.state) failClosed('--state is required', args.json);

  // --root scopes every other path. Resolving --state against process.cwd() instead made --root a
  // no-op for retro, so the gate read the REAL repo's artifacts while claiming to check a sandbox —
  // which is the worst possible failure mode for a path-taking checker.
  const rootDir = path.resolve(process.cwd(), args.root || '.');
  const statePath = path.resolve(rootDir, args.state);
  let result;
  if (args.kind === 'retro') {
    const digestPath = path.resolve(
      rootDir,
      args.digest || 'artifacts/output/09-retro/retro-digest.md'
    );
    result = checkRetro(statePath, digestPath);
  } else {
    result = checkIterate(statePath, rootDir);
  }

  result.note =
    'Loop closure and the iteration limit only. This does not judge whether the retro was any good ' +
    'or whether five cycles was the right number.';

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.ok) {
    console.log(`✓ ${result.kind}: loop closure conformant — ${args.state}`);
    console.log('  ' + result.note);
  } else {
    const plural = result.failures.length === 1 ? '' : 's';
    console.error(`✗ ${result.kind}: ${result.failures.length} issue${plural} — ${args.state}`);
    for (const f of result.failures) console.error(`  - ${f}`);
  }
  process.exit(result.exit);
}

main();
