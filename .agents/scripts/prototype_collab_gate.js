#!/usr/bin/env node
/**
 * prototype_collab_gate.js — fail-closed validator for the design prototype
 * collaboration record. It validates the record, not the quality of the review.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function clean(value) {
  return String(value || '').replace(/^`|`$/g, '').trim();
}

function field(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^[-*]\\s*\\*\\*${escaped}:\\*\\*\\s*(.+)$`, 'mi'));
  return clean(match ? match[1] : '');
}

function section(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = text.search(new RegExp(`^##\\s+${escaped}\\s*$`, 'mi'));
  if (start < 0) return '';
  const header = text.slice(start).match(/^##[^\n]*\n?/i);
  const bodyStart = start + (header ? header[0].length : 0);
  const rest = text.slice(bodyStart);
  const next = rest.search(/^##\s+/m);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

function normalizePath(root, value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return path.normalize(path.isAbsolute(value) ? value : path.resolve(root, value));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function verify({ root = process.cwd(), recordPath, track, prototypePath, scope = 'handoff' }) {
  const problems = [];
  const record = recordPath ? path.resolve(root, recordPath) : '';
  const expectedTracks = new Set(['static-html', 'nextjs-component']);
  const expectedScopes = new Set(['handoff', 'r1-evidence']);

  if (!recordPath) problems.push('--record is required');
  if (!expectedTracks.has(track)) problems.push('--track must be static-html or nextjs-component');
  if (!prototypePath) problems.push('--prototype is required');
  if (!expectedScopes.has(scope)) problems.push('--scope must be handoff or r1-evidence');
  if (problems.length) return { pass: false, problems, record, track, scope };

  if (!fs.existsSync(record)) {
    problems.push(`collaboration record not found: ${record}`);
    return { pass: false, problems, record, track };
  }

  const text = fs.readFileSync(record, 'utf8');
  const actualTrack = field(text, 'Track');
  const runtime = field(text, 'Runtime');
  const prototype = field(text, 'Prototype');
  const hash = field(text, 'Prototype SHA-256');
  const date = field(text, 'Date');
  const aggregateState = field(text, 'State');
  const reviewScope = field(text, 'Review scope');
  const trackClassification = field(text, 'Track classification');
  const r1Disposition = field(text, 'R1 evidence disposition');
  const implementationHandoff = field(text, 'Implementation handoff');
  const gateResult = field(text, 'Track gate result');
  const accessibility = field(text, 'Accessibility disposition');
  const feasibility = field(text, 'Feasibility disposition');
  const implementation = field(text, 'Implementation mapping') || section(text, 'Implementation mapping');

  if (actualTrack !== track) problems.push(`record track "${actualTrack || 'missing'}" does not match requested track "${track}"`);
  if (track === 'static-html' && !/vanilla\s+html.*tailwind/i.test(runtime)) {
    problems.push('static-html runtime must identify vanilla HTML and Tailwind CDN');
  }
  if (track === 'nextjs-component' && !/next\.js.*react.*tailwind.*shadcn/i.test(runtime)) {
    problems.push('nextjs-component runtime must identify Next.js, React, Tailwind, and shadcn');
  }
  if (!prototype) problems.push('record is missing Prototype');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push('record is missing a YYYY-MM-DD Date');
  // THE TRACK GATE RESULT — and the inversion this replaces.
  //
  // This line used to be a flat `gateResult !== 'PASS'`. Measured by a blind run on an imported
  // prototype that genuinely fails the static-html construction standard: the honest record
  // (Track gate result: FAIL, with four accurate problems quoted) was REJECTED, while a record
  // that wrote `Track gate result: PASS` — with its own Evidence paragraph still documenting
  // `exit 1 / "pass": false / four problems` — PASSED. The gate never re-ran the track gate, so
  // it could not tell a verified pass from a typed one. A gate that rejects honesty and accepts
  // an unsupported claim inverts the incentive it exists to create.
  //
  // The fix separates two claims this line had conflated:
  //   "the prototype passes the construction standard"  — required to HAND OFF
  //   "evidence extraction was authorized anyway"       — the step-01e escape hatch for an
  //                                                        imported prototype that is deficient,
  //                                                        which is the normal case for R1
  //
  // In `r1-evidence` scope a documented FAIL is therefore accepted — but only when the record
  // explicitly authorizes bounded extraction and names the blocking finding. Silence is not a
  // disposition.
  const escapeAuthorized =
    /(?:escape hatch|bounded evidence extraction|authorized to proceed|R1 evidence scope authoriz|extraction (?:is|was) authorized)/i.test(text);
  const namesBlocker = /(?:critical state|missing|absent|incomplete|fails?\b|failure|blocking|PC-\d{2})/i.test(text);

  if (gateResult === 'PASS') {
    // A typed PASS is not evidence. If the record claims the track gate passed, it must carry
    // the command it ran and the exit code it got, so a reviewer can reproduce the claim.
    // The record template carries `Track gate command:` and `Evidence: <exit code>` as SEPARATE
    // fields, so requiring both on one line was a false positive on a correct record — the
    // shipped test fixture has them two lines apart. Check for both, anywhere, not adjacency.
    const hasCommand = /shadcn_gate\.js|track gate command/i.test(text);
    const hasZeroExit = /exit\s*(?:code\s*)?0\b|"pass":\s*true\b/i.test(text);
    const hasEvidence = hasCommand && hasZeroExit;
    if (!hasEvidence) {
      problems.push(
        `track gate result claims PASS but the record carries no runnable evidence — quote the ` +
          `command and its exit 0 (a typed PASS is not a verified PASS; this gate cannot re-run ` +
          `the track gate itself)`
      );
    }
  } else if (scope === 'r1-evidence' && escapeAuthorized && namesBlocker) {
    // Accepted: documented FAIL + explicit authorization + a named blocker. This is the path
    // step-01e describes and which the old rule made unreachable.
  } else {
    problems.push(
      `track gate result must be PASS, got "${gateResult || 'missing'}"` +
        (gateResult === 'FAIL'
          ? ' — a FAIL may be accepted in r1-evidence scope, but only when the record explicitly ' +
            'authorizes bounded evidence extraction under step-01e\'s escape hatch AND names the ' +
            'blocking finding. Say which, or fix the prototype.'
          : '')
    );
  }
  if (scope === 'handoff') {
    if (aggregateState !== 'SATISFIED') problems.push(`handoff scope requires aggregate disposition SATISFIED, got "${aggregateState || 'missing'}"`);
    if (accessibility !== 'SATISFIED') problems.push(`handoff scope requires accessibility disposition SATISFIED, got "${accessibility || 'missing'}"`);
    if (feasibility !== 'SATISFIED') problems.push(`handoff scope requires feasibility disposition SATISFIED, got "${feasibility || 'missing'}"`);
  } else {
    if (reviewScope !== 'r1-evidence') problems.push(`record review scope must be r1-evidence, got "${reviewScope || 'missing'}"`);
    // Same conflation as the gate-result rule above, one field over. `Track classification`
    // describes the PROTOTYPE'S QUALITY; `R1 evidence disposition` describes whether bounded
    // extraction is authorized. An imported prototype with four accurate construction problems
    // is honestly classified `CHANGES REQUESTED` while its evidence disposition is still
    // `SATISFIED` — those are different claims and the gate demanded both be satisfied.
    //
    // The disposition stays mandatory. The classification may be CHANGES REQUESTED when the
    // escape hatch is invoked and a blocker is named, because that is the accurate value.
    const classificationHonest = trackClassification === 'CHANGES REQUESTED' && escapeAuthorized && namesBlocker;
    if (trackClassification !== 'SATISFIED' && !classificationHonest) {
      problems.push(`R1 evidence scope requires track classification SATISFIED, got "${trackClassification || 'missing'}"`);
    }
    if (r1Disposition !== 'SATISFIED') problems.push(`R1 evidence scope requires R1 evidence disposition SATISFIED, got "${r1Disposition || 'missing'}"`);
  }
  if (!implementation) problems.push('record is missing Implementation mapping evidence');

  const reviewerSection = section(text, 'Reviewer sign-off');
  if (!/^\|\s*@product-designer\s*\|\s*`?SATISFIED`?\s*\|/im.test(reviewerSection)) {
    problems.push('@product-designer must have a SATISFIED reviewer row');
  }
  if (!/^\|\s*@tech-lead\s*\|\s*`?SATISFIED`?\s*\|/im.test(reviewerSection)) {
    problems.push('@tech-lead must have a SATISFIED reviewer row');
  }

  const actualPrototype = normalizePath(root, prototype);
  const requestedPrototype = normalizePath(root, prototypePath);
  if (prototype && requestedPrototype && actualPrototype !== requestedPrototype) {
    problems.push(`record prototype "${prototype}" does not match requested prototype "${prototypePath}"`);
  }

  const localPrototype = requestedPrototype && !/^https?:\/\//i.test(requestedPrototype) && fs.existsSync(requestedPrototype);
  if (localPrototype) {
    if (!hash || hash === 'N/A') problems.push('file prototype requires a Prototype SHA-256 value');
    else if (hash !== sha256(requestedPrototype)) problems.push('prototype SHA-256 does not match the reviewed file');
  } else if (hash !== 'N/A (non-file)' && hash !== 'N/A') {
    problems.push('non-file prototype must record Prototype SHA-256 as N/A (non-file)');
  }

  for (const required of ['Track validation', 'Reviewed surface', 'Decisions and open questions', 'Disposition']) {
    if (!section(text, required)) problems.push(`missing required section: ${required}`);
  }

  return {
    pass: problems.length === 0,
    problems,
    record,
    track,
    prototype: prototype || null,
    evidence: {
      scope,
      actualTrack: actualTrack || null,
      runtime: runtime || null,
      reviewScope: reviewScope || null,
      trackClassification: trackClassification || null,
      r1EvidenceDisposition: r1Disposition || null,
      implementationHandoff: implementationHandoff || null,
      reviewerStates: {
        productDesigner: /^\|\s*@product-designer\s*\|\s*`?SATISFIED`?\s*\|/im.test(reviewerSection),
        techLead: /^\|\s*@tech-lead\s*\|\s*`?SATISFIED`?\s*\|/im.test(reviewerSection),
      },
      trackGateResult: gateResult || null,
      prototypeHashChecked: Boolean(localPrototype),
    },
  };
}

function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (sub !== 'verify') {
    console.error('Usage:\n  node prototype_collab_gate.js verify --record FILE --track static-html|nextjs-component --prototype FILE [--scope handoff|r1-evidence] [--root R] [--json]');
    process.exit(2);
  }
  const result = verify({
    root: path.resolve(args.root || process.cwd()),
    recordPath: typeof args.record === 'string' ? args.record : '',
    track: typeof args.track === 'string' ? args.track : '',
    prototypePath: typeof args.prototype === 'string' ? args.prototype : '',
    scope: typeof args.scope === 'string' ? args.scope : 'handoff',
  });
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else if (result.pass) console.log(`prototype_collab_gate verify: PASS — ${result.track} (${result.scope})`);
  else for (const problem of result.problems) console.error(`  ✗ ${problem}`);
  process.exit(result.pass ? 0 : 1);
}

if (require.main === module) main();

module.exports = { verify };
