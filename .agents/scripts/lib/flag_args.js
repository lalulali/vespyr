/**
 * lib/flag_args.js — the one argument parser.
 *
 * WHY THIS FILE EXISTS. Nine command parsers across three scripts used `i += 2`, assuming every flag
 * carries a value. That silently consumes the argument after any flag the loop does not recognise.
 *
 * Measured twice, both times producing a silent wrong answer rather than an error:
 *
 *   orchestrator_state.js complete --dry-run --agent x
 *     -> lost `--agent`, printed "Missing --agent", and RAN THE LIVE PATH anyway, writing to five
 *        files including shared memory.
 *   swarm_telemetry.js summary --bogus --days 3
 *     -> lost `--days 3`, silently fell back to the 7-day default, and printed a confident summary
 *        of the wrong window. 11 events instead of 2, exit 0, nothing printed to suggest a problem.
 *
 * That second shape is the dangerous one: a flag that is silently ignored does not look like a bug,
 * it looks like a result.
 *
 * Every command now walks by ONE and consumes a value only for a flag declared to take one. Unknown
 * flags are REPORTED rather than swallowing their neighbour, and a value flag with no value is a
 * usage error. Nothing here decides what a flag MEANS; it only decides which token belongs to which
 * flag.
 */

'use strict';

/** Flags that take no value. Everything not listed in valueFlags and appearing here is unknown. */
const COMMON_BOOLEAN_FLAGS = ['--help', '-h', '--json', '--dry-run', '--check-memory', '--force', '--silent'];

function parseFlagArgs(argv, valueFlags, booleanFlags, label) {
  const values = new Set(valueFlags || []);
  const bools = new Set([...(booleanFlags || []), ...COMMON_BOOLEAN_FLAGS]);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--') && !bools.has(a)) continue; // positional: these commands are flag-only
    const key = a.replace(/^--/, '');
    if (bools.has(a)) { out[key] = true; continue; }
    if (values.has(a)) {
      const v = argv[i + 1];
      if (v === undefined) {
        console.error(`Missing value for ${a}`);
        process.exit(2);
      }
      out[key] = v;
      i += 1;
      continue;
    }
    console.error(`Unknown flag for '${label || 'command'}': ${a} (ignored)`);
  }
  return out;
}

/** Convenience for the very common "one optional numeric flag with a default" shape. */
function numericFlag(argv, flag, fallback, label) {
  const raw = parseFlagArgs(argv, [flag], [], label)[flag.replace(/^--/, '')];
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    console.error(`Missing value for ${flag}`);
    process.exit(2);
  }
  return n;
}

module.exports = { parseFlagArgs, numericFlag, COMMON_BOOLEAN_FLAGS };
