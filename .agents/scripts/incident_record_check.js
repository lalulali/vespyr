#!/usr/bin/env node
/**
 * incident_record_check.js — mechanical gate for /incident.
 *
 * WHY THIS EXISTS. /incident ships a SKILL.md and nothing else: no step files, no gate, no tests. Its
 * five artifacts are described in prose, and its own stated principle — "close the loop, every
 * incident must produce at least one prevention action item" — is a sentence nobody could falsify.
 *
 * The cost of that is concrete. An incident directory can hold a triage record and nothing else, and
 * nothing anywhere notices. The skill's SEV1 SLA promises a 15-minute response and a 1-hour
 * mitigation; there is no mechanism that reads a clock, so the SLA is decorative. And a post-incident
 * review whose prevention items are all "TODO" satisfies every written rule while closing nothing.
 *
 * What IS checkable:
 *
 *   - the severity is recorded, and it is one of the four the skill defines
 *   - every artifact the skill names for that incident exists and is non-trivial
 *   - a post-incident review exists at all (a SEV1/SEV2 without one is a hard failure)
 *   - the PIR names at least one prevention action item WITH AN OWNER — the close-the-loop invariant
 *   - the PIR does not assign blame to a named person (the blameless principle, G-BLAMELESS)
 *
 * What is NOT checkable: whether the mitigation was fast enough, whether the RCA is correct, whether
 * the severity was honestly classified. Those need a human who was there.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SEVERITIES = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];

/** The five artifacts the skill names, and the ones that must be non-trivial to count as done. */
const ARTIFACTS = [
  { file: 'triage.md', label: 'triage record', minWords: 15 },
  { file: 'mitigation.md', label: 'mitigation record', minWords: 10 },
  { file: 'rca.md', label: 'root-cause analysis', minWords: 25 },
  { file: 'remediation.md', label: 'remediation record', minWords: 15 },
  { file: 'post-incident-review.md', label: 'post-incident review', minWords: 40 },
];

const SEVERITY_RE = /\b(SEV[1-4])\b/i;

/**
 * The body of a heading matching `headingRe`, up to the next same-or-higher heading.
 *
 * A line scan, not a regex. The regex form used a lookahead ending in `\s*$`, which under the `m`
 * flag matches at the first line break, so the capture was always empty and the section always read
 * as missing — a check that reports "absent" for a document that has it, which trains a reader to
 * ignore it. Same trap as `discovery_canvas_check.js` and `spec_parity.js`.
 */
function section(text, headingRe) {
  const lines = String(text).split('\n');
  const re = new RegExp(`^(\\s*)(#{1,6})\\s*${headingRe}`, 'i');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const level = m[2].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const h = lines[j].match(/^(\s*)(#{1,6})\s/);
      if (h && h[2].length <= level) break;
      body.push(lines[j]);
    }
    return body.join('\n');
  }
  return null;
}

/** Words, ignoring markdown furniture. */
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
    console.error(`✗ incident_record_check: ${msg}`);
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

/** Blameless-posture heuristic: a person named as the CAUSE. Restricted to obvious phrasings. */
const BLAME_RE =
  /\b(?:caused by|due to|root cause is|blame|at fault|negligen(?:t|ce)|fault of)\s+(?:the\s+)?(?:developer|engineer|designer|PM|tech ?lead|devops|architect|qa)\b/i;

function check(dir, jsonMode) {
  const failures = [];

  const triage = readIf(path.join(dir, 'triage.md'));
  const pir = readIf(path.join(dir, 'post-incident-review.md'));

  // ---- Severity recorded and valid. ----
  const sevMatch = (triage || '').match(SEVERITY_RE);
  if (!sevMatch) {
    failures.push(
      'triage.md records no severity. The skill defines SEV1-SEV4 with response and mitigation ' +
      'targets attached to each; an unclassified incident has no SLA, which makes the table decorative.'
    );
  } else if (!SEVERITIES.includes(sevMatch[1].toUpperCase())) {
    failures.push(`triage.md records an unknown severity "${sevMatch[1]}" (expected SEV1-SEV4).`);
  }
  const severity = sevMatch ? sevMatch[1].toUpperCase() : null;

  // ---- Every named artifact exists and is substantial. ----
  for (const a of ARTIFACTS) {
    const body = readIf(path.join(dir, a.file));
    if (body === null) {
      const hard = a.file === 'post-incident-review.md' && severity && ['SEV1', 'SEV2'].includes(severity);
      failures.push(
        `${a.label} is absent (${a.file}).` +
        (hard
          ? ` A ${severity} incident without a post-incident review is a hard failure — that is the ` +
            'artifact the whole skill exists to produce.'
          : ' The skill names it as an output of this incident.')
      );
      continue;
    }
    const n = words(body).length;
    if (n < a.minWords) {
      failures.push(
        `${a.label} (${a.file}) has ${n} words; the shape the skill specifies needs at least ` +
        `${a.minWords}. A stub satisfies "the file exists" while recording nothing.`
      );
    }
  }

  // ---- The close-the-loop invariant: at least one prevention action item WITH AN OWNER. ----
  if (pir !== null) {
    const actionSection = section(pir, 'Action items?|Prevention') || '';
    const rows = actionSection
      .split('\n')
      .filter((l) => /^\s*\|/.test(l))
      .filter((l) => !/^\s*\|[\s:|-]+\|?\s*$/.test(l))
      .filter((l) => !/\|\s*(#|action|item|task)\s*\|/i.test(l));

    if (!actionSection.trim()) {
      failures.push(
        'The post-incident review has no action-items section. The skill states every incident must ' +
        'produce at least one prevention action item — a review that closes with none closes nothing.'
      );
    } else if (!rows.length) {
      failures.push('The action-items section contains no entries.');
    } else {
      const ownerless = rows.filter((r) => !/@[a-z][\w-]*|\b(?:unassigned|tbd|none)\b/i.test(r));
      if (ownerless.length) {
        failures.push(
          `${ownerless.length} action item(s) have no owner. "Add monitoring" with nobody accountable ` +
          'is the most common way an incident review becomes theatre — the item is written, owned by ' +
          'no one, and never done.'
        );
      }
      const undated = rows.filter((r) => !/\d{4}-\d{2}-\d{2}|\bQ[1-4]\b|\bthis week\b|\bnext sprint\b/i.test(r));
      if (undated.length) {
        failures.push(
          `${undated.length} action item(s) carry no due date or sprint. An action item with an owner ` +
          'and no date is a wish.'
        );
      }
    }

    // ---- Blameless posture. ----
    const blame = pir.match(BLAME_RE);
    if (blame) {
      failures.push(
        `The post-incident review attributes cause to a named role ("${blame[0].trim()}"). The skill ` +
        'is explicitly blameless — focus on systems and processes. An incident record naming a person ' +
        'as the cause is also the one artifact people stop reading.'
      );
    }
  }

  return {
    kind: 'incident',
    incident: path.basename(dir),
    severity,
    ok: failures.length === 0,
    exit: failures.length ? 1 : 0,
    failures,
    note:
      'Record completeness and the close-the-loop invariant only. This does not check whether ' +
      'mitigation met the SLA, whether the RCA is correct, or whether the severity was honestly ' +
      'classified — those need someone who was there.',
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') args.dir = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

const USAGE = `Usage: node .agents/scripts/incident_record_check.js check --dir artifacts/output/08-incidents/INC-NNN [--json]

Checks an incident directory for: a recorded SEV1-SEV4 severity, all five named artifacts present and
substantial, a post-incident review (mandatory at SEV1/SEV2), at least one prevention action item with
an owner AND a date, and blameless phrasing.

Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.dir) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') failClosed(`unknown command "${cmd}" (expected "check")`, args.json);

  const dir = path.resolve(process.cwd(), args.dir);
  if (!fs.existsSync(dir)) failClosed(`cannot read ${args.dir} — no such incident directory`, args.json);
  if (!fs.statSync(dir).isDirectory()) failClosed(`${args.dir} is not a directory`, args.json);

  const result = check(dir, args.json);
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.ok) {
    console.log(`✓ incident ${result.incident}: record conformant (${result.severity}) — ${args.dir}`);
    console.log('  ' + result.note);
  } else {
    const plural = result.failures.length === 1 ? '' : 's';
    console.error(`✗ incident ${result.incident}: ${result.failures.length} issue${plural} — ${args.dir}`);
    for (const f of result.failures) console.error(`  - ${f}`);
  }
  process.exit(result.exit);
}

main();
