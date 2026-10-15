#!/usr/bin/env node
/**
 * discovery_report_check.js — the last ungated link in the discovery chain.
 *
 * WHY THIS EXISTS. `/discovery-report` compiles five discovery artifacts into one report for
 * stakeholders. Four of those five are gated (`discovery_canvas_check.js`) and the fifth
 * (`research-plan.md`) was gated recently. The compiler itself had **zero** gate references.
 *
 * That is the worst place for a gap: it consumes verified inputs and emits an unverified output.
 * A reader of the consolidated report has no assurance that ANY of the underlying artifacts conform
 * — the report launders their status. If a canvas shipped as its own unfilled template, or a
 * research plan asked "would you use this?", the consolidated report would present it as a finding
 * with exactly the same confidence as a canvas that passed every check.
 *
 * So the compiler must carry provenance. It requires:
 *
 *   - every PRESENT gated input to actually PASS its gate, re-verified at compile time rather than
 *     trusted from an earlier run — artifacts change after they are written
 *   - the report to carry a `## Sources` section naming each input, whether it was
 *     machine-verified, and what it scored
 *   - every ABSENT input to be disclosed, not silently dropped
 *   - the usability-data caveat to be present when no usability data exists, because the skill's
 *     own instruction to note it was prose with nothing to check
 *
 * What is NOT checked: whether the synthesis is any good, whether the connections drawn between
 * findings are real, or whether the report is fit to show a stakeholder. A gate cannot verify a
 * narrative. What it CAN do is stop the narrative from implying a verification that never happened.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CANVAS = path.join(__dirname, 'discovery_canvas_check.js');
const PLAN = path.join(__dirname, 'research_plan_check.js');

/**
 * The gated inputs, and the gate each one is verified with.
 *
 * `required: false` means an absent artifact is disclosed rather than failed — a discovery phase
 * legitimately may not have run every method, and requiring all of them would make the skill
 * permanently unsatisfiable. The `qa-signoff.md` deadlock, where `/launch` halted on an artifact
 * nothing produced, is the shape to avoid: a hard requirement with no producer is worse than no
 * requirement.
 */
const INPUTS = [
  { file: 'root-cause-analysis.md', kind: 'root-cause', gate: CANVAS, required: false },
  { file: 'empathy-map.md', kind: 'empathy-map', gate: CANVAS, required: false },
  { file: 'journey-map.md', kind: 'journey-map', gate: CANVAS, required: false },
  { file: 'jtbd-hmw.md', kind: 'jtbd', gate: CANVAS, required: false },
  { file: 'research-plan.md', gate: PLAN, required: false },
  // Declared but produced by no skill in this repo — see the KNOWN GAP note below.
  { file: 'problem-space-brief.md', kind: null, gate: null, required: false },
];

const RESEARCH_DIR = 'artifacts/output/02-research';

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

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  } else {
    console.error(`✗ discovery_report_check: ${msg}`);
  }
  process.exit(2);
}

/** Re-run an input's own gate. Returns { ran, ok, verdict, detail }. */
function verify(input, absPath) {
  if (!input.gate) return { ran: false, ok: null, verdict: 'not-gated', detail: 'no gate exists for this artifact' };
  const args = input.gate === PLAN
    ? ['check', '--file', absPath, '--json']
    : ['check', '--kind', input.kind, '--file', absPath, '--json'];
  const r = spawnSync('node', [input.gate, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* fail-closed also prints JSON */ }
  if (r.status === 2) {
    return { ran: true, ok: false, verdict: 'fail-closed', detail: j.fault || 'gate could not produce a verdict' };
  }
  return {
    ran: true,
    ok: r.status === 0,
    verdict: r.status === 0 ? 'PASS' : 'FAIL',
    detail: r.status === 0
      ? `${(j.totals && j.totals.checks) ? `${j.totals.checks} checks accounted` : 'conformant'}`
      : `${(j.failures || []).length} issue(s): ${String((j.failures || [])[0] || '').slice(0, 110)}`,
  };
}

function check(root, reportPath, jsonMode) {
  const failures = [];
  const sources = [];

  for (const input of INPUTS) {
    const rel = `${RESEARCH_DIR}/${input.file}`;
    const abs = path.resolve(root, rel);
    if (!fs.existsSync(abs)) {
      sources.push({ file: rel, present: false, verdict: 'absent', detail: 'not produced in this phase' });
      continue;
    }
    const v = verify(input, abs);
    sources.push({ file: rel, present: true, ...v });
    if (v.ran && v.ok === false) {
      failures.push(
        `${rel} is present but FAILS its own gate (${input.gate ? path.basename(input.gate) : 'none'} ` +
        `→ ${v.verdict}). ${v.detail} Re-verify inputs at COMPILE time: an artifact can change after ` +
        'it was written, so a green result from an earlier run is not evidence about the file on disk now.'
      );
    }
  }

  const present = sources.filter((s) => s.present);
  if (!present.length) {
    failures.push(
      `No discovery inputs found under ${RESEARCH_DIR}/. A report compiled from nothing is not a ` +
      'synthesis, and this gate cannot tell it from one.'
    );
  }

  // ---- the report must carry provenance ----
  const report = readIf(reportPath);
  if (report === null) {
    return failClosed(`cannot read the report at ${path.relative(root, reportPath)}`, jsonMode);
  }
  const sourcesSec = section(report, 'Sources|Provenance|Inputs') || '';
  if (!sourcesSec.trim()) {
    failures.push(
      'The report has no `## Sources` section. A consolidated report that does not say which ' +
      'inputs it drew on — and whether each was machine-verified — launders their status: an ' +
      'unverified canvas and a verified one read identically downstream.'
    );
  } else {
    for (const s of sources) {
      const base = path.basename(s.file);
      const line = sourcesSec.split('\n').find((l) => l.includes(base));
      if (!line) {
        failures.push(
          `\`${s.file}\` is not listed in the report's Sources section. ` +
          (s.present ? 'It was used and its verification status is unstated.' : 'It is absent and that is undisclosed — a reader cannot tell missing research from research that found nothing.')
        );
        continue;
      }
      if (!/\b(PASS|FAIL|absent|not-gated|not gated)\b/i.test(line)) {
        failures.push(
          `The Sources row for \`${base}\` states no verification verdict. Every input needs a ` +
          'machine-readable status — PASS, FAIL, absent, or not-gated.'
        );
      }
    }
  }

  // ---- the usability caveat, which was prose with nothing to check ----
  // FIXED AFTER BLIND RUN 8-10 (@code-reviewer seat): `## Research Methods Used` and
  // `## Open Questions` are declared inputs the SKILL.md says to NEVER drop — "They are the provenance
  // and the unresolved-questions record; a report without them cannot be challenged, only believed" —
  // and the gate's own Done-when said "It requires:" while omitting them. Measured: a report with a
  // PASSING input, a complete `## Sources` table, and BOTH sections absent exits 0 clean.
  //
  // These two are the report's reviewability. A compiler gate already parses sections, so this is
  // one extractor away, and it is mechanical: the heading is either present or it is not.
  for (const required of ['Research Methods Used', 'Open Questions']) {
    if (!new RegExp(`^#{2,6}\\s*${required}\\s*$`, 'im').test(report)) {
      failures.push(
        `The report has no \`## ${required}\` section. SKILL.md says never to drop it: it is the ` +
        (required === 'Research Methods Used'
          ? 'provenance — where these findings came from. Without it a reader cannot tell which ' +
            'methods produced the synthesis, or challenge any of it.'
          : 'unresolved-questions record. Without it a reader sees a settled conclusion where the ' +
            'researcher saw open questions.') +
        ' A report that cannot be challenged can only be believed.'
      );
    } else if (!String(section(report, required) || '').trim()) {
      failures.push(`The \`## ${required}\` section is empty. A heading with no content under it is not a record.`);
    }
  }

  const hasUsability = sources.some((s) => s.present && /usability/i.test(s.file));
  if (!hasUsability) {
    const caveat = /\busability testing (?:not|has not)\b|\bno usability (?:testing|data)\b|\bUT scores? (?:not|are not)\b/i;
    if (!caveat.test(report)) {
      failures.push(
        'No usability data was compiled, and the report carries no caveat saying so. The skill ' +
        'instructs the author to note this in prose; nothing checked it, so a stakeholder reading ' +
        'the report cannot tell a validated finding from an unvalidated one.'
      );
    }
  }

  return {
    kind: 'discovery-report',
    ok: failures.length === 0,
    exit: failures.length ? 1 : 0,
    inputs: present.length,
    verified: sources.filter((s) => s.verdict === 'PASS').length,
    sources,
    failures,
    knownGap:
      'problem-space-brief.md and usability testing data are declared inputs with NO producer in ' +
      'this repo. They are disclosed rather than required, because a hard requirement with no ' +
      'producer makes the skill permanently unsatisfiable — the qa-signoff.md deadlock. Usability ' +
      'testing in particular is a real capability gap, not a wiring bug.',
    note:
      'Provenance and input conformance only. This cannot verify the synthesis — whether the ' +
      'connections drawn between findings are real, or whether the report is fit to show a ' +
      'stakeholder. It stops the report implying a verification that never happened.',
  };
}

function readIf(p) {
  try {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i];
    else if (a === '--report') args.report = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

const USAGE = `Usage: node .agents/scripts/discovery_report_check.js check --report <report.md> [--root .] [--json]

Re-verifies every discovery input the report consumed, at COMPILE time, and requires the report to
carry a \`## Sources\` section giving each input's machine-readable status.

Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.report) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') failClosed(`unknown command "${cmd}" (expected "check")`, args.json);

  const root = path.resolve(process.cwd(), args.root || '.');
  const reportPath = path.resolve(root, args.report);
  if (!fs.existsSync(reportPath)) {
    failClosed(`cannot read ${args.report} — a missing report is a missing deliverable, never a pass`, args.json);
  }

  const result = check(root, reportPath, args.json);
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.ok) {
    console.log(`✓ discovery-report: ${result.verified}/${result.inputs} present input(s) machine-verified — ${args.report}`);
    console.log('  ' + result.note);
  } else {
    const plural = result.failures.length === 1 ? '' : 's';
    console.error(`✗ discovery-report: ${result.failures.length} issue${plural} — ${args.report}`);
    for (const f of result.failures) console.error(`  - ${f}`);
  }
  process.exit(result.exit);
}

main();
