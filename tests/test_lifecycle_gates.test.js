/**
 * tests/test_lifecycle_gates.test.js — gates for /incident, /retro, /iterate, /legal-safety-audit.
 *
 * Four skills audited together because they share one defect shape: a contract stated in prose that
 * nothing could falsify.
 *
 *   /incident              step-less. An incident directory could hold a triage record and nothing
 *                           else, and nothing noticed. "Every incident must produce at least one
 *                           prevention action item" was a sentence. The SEV1 SLA promised a
 *                           15-minute response with nothing that reads a clock.
 *   /retro                 HAD the mechanism — retro-state.md with stepsCompleted, read by the step
 *                           loader — but nothing verified the loop CLOSED. 3 of 5 steps, or all 5
 *                           with a three-word digest, satisfied every written rule.
 *   /iterate               stated a 5-cycle limit in FOUR places across two skills, with no counter,
 *                           no state file, and nothing reading a number.
 *   /legal-safety-audit    six guardrails, 20 checks, and an applicability gate — almost none
 *                           falsifiable. G6 "never skip silently" was a promise: run 2 checks, skip
 *                           18 without a word, and every written rule is satisfied.
 *
 * Every test below was paired with a revert of the fix, and every revert fails a named test.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const INCIDENT = path.join(REPO, '.agents/scripts/incident_record_check.js');
const LSA = path.join(REPO, '.agents/scripts/legal_safety_audit_check.js');
const CYCLE = path.join(REPO, '.agents/scripts/cycle_state_check.js');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-'));
}
function write(root, rel, body) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
}
function run(script, args, cwd) {
  const r = spawnSync('node', [script, 'check', ...args, '--json'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    cwd: cwd || REPO,
  });
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { /* fail-closed also prints JSON */ }
  return { code: r.status, json: j, out: `${r.stdout || ''}${r.stderr || ''}` };
}
const has = (r, re) => r.json.failures && r.json.failures.some((f) => re.test(f));

// ---------------------------------------------------------------------------------------------
// /incident
// ---------------------------------------------------------------------------------------------

const GOOD_INCIDENT = {
  'triage.md': '# Triage INC-001\n\n**Severity:** SEV2\n\nCheckout returned 500s for 12% of EU traffic starting 14:01Z. Incident commander: @product-manager. Responders: @developer, @devops-engineer.\n',
  'mitigation.md': '# Mitigation INC-001\n\nDeploy 41 rolled back at 14:02Z, nine minutes after the alert fired. Error rate returned to baseline within 90 seconds. Stakeholder update posted at 14:06Z. Logs and traces preserved before rollback.\n',
  'rca.md': '# RCA INC-001\n\n## Timeline\n14:01Z shipped, 14:02Z alert, 14:03Z restored.\n\n## 5 Whys\n1. Why 500s? The checkout handler threw on a null currency code.\n2. Why null? Deploy 41 added a currency lookup returning null for unlisted codes.\n3. Why unlisted codes? No validation before the lookup.\n4. Why no validation? No test covers an unlisted currency.\n5. Why no test? Currency handling shipped without a data-driven fixture.\n\n## Detection gap\nNo currency-specific counter.\n',
  'remediation.md': '# Remediation INC-001\n\nDeploy 42 validates currency against the allowlist and returns 422 rather than throwing. Regression test added for an unlisted code. Canary stage inserted before full rollout.\n',
  'post-incident-review.md': '# Post-Incident Review INC-001\n\n## What happened\nDeploy 41 shipped at 14:01Z and threw on unlisted currency codes. Twelve minutes of EU checkout impact.\n\n## What went well\nThe alert fired within a minute and the rollback was rehearsed.\n\n## What could be improved\nNo canary stage, so all traffic received the fault.\n\n## Action items\n| # | Action | Owner | Due |\n|---|---|---|---|\n| 1 | Add a canary stage at 5% | @devops-engineer | 2026-10-23 |\n| 2 | Currency fixture for every edge | @developer | 2026-10-20 |\n',
};

function incidentDir(overrides) {
  const root = tmp();
  for (const [f, b] of Object.entries(GOOD_INCIDENT)) {
    if (overrides && f in overrides) {
      if (overrides[f] !== null) write(root, `INC-001/${f}`, overrides[f]);
    } else {
      write(root, `INC-001/${f}`, b);
    }
  }
  return root;
}

test('/incident: a complete SEV2 record passes', () => {
  const root = incidentDir();
  const r = run(INCIDENT, ['--dir', 'INC-001'], root);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
  assert.strictEqual(r.json.severity, 'SEV2');
  fs.rmSync(root, { recursive: true, force: true });
});

test('/incident: a triage-only incident fails — the state this skill shipped in', () => {
  const root = incidentDir({
    'mitigation.md': null, 'rca.md': null, 'remediation.md': null, 'post-incident-review.md': null,
  });
  const r = run(INCIDENT, ['--dir', 'INC-001'], root);
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /post-incident review is absent/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /SEV2 incident without a post-incident review is a hard failure/),
    'a SEV2 without a PIR must be called a hard failure, not a missing file');
  fs.rmSync(root, { recursive: true, force: true });
});

test('/incident: no recorded severity fails — an unclassified incident has no SLA', () => {
  const root = incidentDir({ 'triage.md': GOOD_INCIDENT['triage.md'].replace('**Severity:** SEV2', '') });
  const r = run(INCIDENT, ['--dir', 'INC-001'], root);
  assert.ok(has(r, /records no severity/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/incident: an action item with no owner and no date fails — the close-the-loop invariant', () => {
  const root = incidentDir({
    'post-incident-review.md': GOOD_INCIDENT['post-incident-review.md']
      .replace('| 1 | Add a canary stage at 5% | @devops-engineer | 2026-10-23 |',
               '| 1 | Add a canary stage at 5% |  |  |'),
  });
  const r = run(INCIDENT, ['--dir', 'INC-001'], root);
  assert.ok(has(r, /action item\(s\) have no owner/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /carry no due date/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/incident: a PIR with no action-items section fails — a review that closes nothing', () => {
  const root = incidentDir({
    'post-incident-review.md': '# PIR\n\n## What happened\nSomething broke and was fixed.\n\n## What went well\nFast response overall.\n\n## What could be improved\nSeveral things, listed nowhere in particular.\n',
  });
  const r = run(INCIDENT, ['--dir', 'INC-001'], root);
  assert.ok(has(r, /no action-items section/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/incident: blaming a named role fails — the blameless principle is the point', () => {
  const root = incidentDir({
    'post-incident-review.md': GOOD_INCIDENT['post-incident-review.md']
      .replace('No canary stage, so all traffic received the fault.',
               'Caused by the devops engineer skipping review, and no canary stage.'),
  });
  const r = run(INCIDENT, ['--dir', 'INC-001'], root);
  assert.ok(has(r, /attributes cause to a named role/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/incident: a stub artifact fails — existing is not the same as recording', () => {
  const root = incidentDir({ 'rca.md': '# RCA\n\nTODO\n' });
  const r = run(INCIDENT, ['--dir', 'INC-001'], root);
  assert.ok(has(r, /stub satisfies/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------
// /legal-safety-audit
// ---------------------------------------------------------------------------------------------

const ALL_20 = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13',
];

function auditReport({ ran = [], skipped = [], flagged = [], regions = true } = {}) {
  const head = regions ? '**Regions:** EU/EEA + UK (GDPR, UK GDPR), US (CCPA/CPRA)\n' : '';
  const table = (ids, reason) =>
    ids.map((c) => `| ${c} | ${reason(c)} |`).join('\n');
  return `# Legal & Safety Audit\n\n**Date:** 2026-10-09\n${head}\n## Ran\n| # | Check | Finding |\n|---|---|---|\n${
    table(ran, (c) => `${c} ran; finding recorded, fix proposed`)
  }\n\n## Skipped (with reason + evidence)\n| # | Check | Reason | Evidence |\n|---|---|---|---|\n${
    table(skipped, (c) => `Not applicable to this app; verified in src and package.json`)
  }\n\n## Flagged for owner decision\n| # | Check | Suspect |\n|---|---|---|\n${
    table(flagged, (c) => `${c} flagged for owner to confirm`)
  }\n`;
}

function draftDoc(name) {
  return `# ${name}\n\n**DRAFT — requires human/lawyer review**\n\nEffective date pending counsel sign-off.\n`;
}

test('/legal-safety-audit: a fully accounted audit passes', () => {
  const root = tmp();
  write(root, 'audit-report.md', auditReport({
    ran: ALL_20.filter((c) => !['A2', 'A5', 'B11'].includes(c)),
    skipped: ['A2', 'A5', 'B11'],
    flagged: [],
  }));
  write(root, 'drafts/privacy-policy.md', draftDoc('Privacy Policy'));
  const r = run(LSA, ['--report', 'audit-report.md', '--drafts', 'drafts'], root);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
  assert.strictEqual(r.json.totals.unaccounted, 0);
  fs.rmSync(root, { recursive: true, force: true });
});

test('/legal-safety-audit: silently dropped checks fail — G6 was a promise, not a property', () => {
  const root = tmp();
  write(root, 'audit-report.md', auditReport({ ran: ['A1', 'B2'], skipped: [], flagged: [] }));
  const r = run(LSA, ['--report', 'audit-report.md'], root);
  assert.strictEqual(r.code, 1);
  assert.ok(has(r, /18 of 20 checks are unaccounted/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/legal-safety-audit: an unstated region fails — G3 forbids a default', () => {
  const root = tmp();
  write(root, 'audit-report.md', auditReport({
    ran: ALL_20, skipped: [], flagged: [], regions: false,
  }));
  const r = run(LSA, ['--report', 'audit-report.md'], root);
  assert.ok(has(r, /does not state the region/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/legal-safety-audit: an unstamped draft fails — G1', () => {
  const root = tmp();
  write(root, 'audit-report.md', auditReport({ ran: ALL_20, skipped: [], flagged: [] }));
  write(root, 'drafts/terms.md', '# Terms of Service\n\nEffective immediately upon use.\n');
  const r = run(LSA, ['--report', 'audit-report.md'], root);
  assert.ok(has(r, /carries no DRAFT/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/legal-safety-audit: a draft marked final fails — a legal draft is never done', () => {
  const root = tmp();
  write(root, 'audit-report.md', auditReport({ ran: ALL_20, skipped: [], flagged: [] }));
  write(root, 'drafts/terms.md',
    '# Terms of Service\n\n**Status: FINAL**\n**DRAFT — requires human/lawyer review**\n\nApproved by counsel.\n');
  const r = run(LSA, ['--report', 'audit-report.md'], root);
  assert.ok(has(r, /marked final\/approved\/done/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/legal-safety-audit: a skip with a bare id and no reason fails', () => {
  const root = tmp();
  // The bare-id row goes INSIDE the main Skipped table. Appending a second `## Skipped` heading made
  // the gate read the first (empty) one, so the check fired on "unaccounted" instead of the reason
  // rule under test.
  const report = auditReport({ ran: ALL_20.filter((c) => c !== 'B11'), skipped: [], flagged: [] })
    .replace('\n\n## Flagged for owner decision', '\n| B11 |\n\n## Flagged for owner decision');
  write(root, 'audit-report.md', report);
  const r = run(LSA, ['--report', 'audit-report.md'], root);
  assert.ok(has(r, /carry no reason/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/legal-safety-audit: a missing report is fail-closed, never a pass', () => {
  const root = tmp();
  const r = spawnSync('node', [LSA, 'check', '--report', 'nope.md', '--json'], { encoding: 'utf8', cwd: root });
  assert.strictEqual(r.status, 2);
  assert.match(r.stdout, /cannot read/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('/legal-safety-audit: a green result says it is not legal advice', () => {
  const root = tmp();
  write(root, 'audit-report.md', auditReport({ ran: ALL_20, skipped: [], flagged: [] }));
  const r = run(LSA, ['--report', 'audit-report.md'], root);
  assert.match(r.out, /not legal advice|does not check/i,
    'a green compliance gate must not read as a legal conclusion');
  fs.rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------
// /retro and /iterate — the loop-closure gate
// ---------------------------------------------------------------------------------------------

function retroState(steps, status) {
  return `---\nstepsCompleted: [${steps.join(', ')}]\ncycle: "payments v2"\nstatus: "${status}"\n---\n\n# Retro State\n`;
}

test('/retro: five steps plus a real digest passes', () => {
  const root = tmp();
  write(root, 'retro-state.md', retroState([1, 2, 3, 4, 5], 'complete'));
  write(root, 'retro-digest.md', '# Retro Digest\n\n' + ('Pattern scan found three estimate misses on migration work. Hot paths: the checkout retry loop was the most-changed file across three cycles and had no dedicated owner. Action: add a migration-specific estimation rule. '.repeat(3)));
  const r = run(CYCLE, ['--kind', 'retro', '--state', 'retro-state.md', '--digest', 'retro-digest.md', '--root', root], root);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
  fs.rmSync(root, { recursive: true, force: true });
});

test('/retro: a mid-flight retro fails — 3 of 5 steps is not a closed loop', () => {
  const root = tmp();
  write(root, 'retro-state.md', retroState([1, 2, 3], 'in-progress'));
  write(root, 'retro-digest.md', '# Retro Digest\n\n' + ('Something happened and we learned a thing about it. '.repeat(4)));
  const r = run(CYCLE, ['--kind', 'retro', '--state', 'retro-state.md', '--digest', 'retro-digest.md', '--root', root], root);
  assert.ok(has(r, /2 of 5 steps remain/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/retro: all five steps with a three-word digest fails — existing is not summarising', () => {
  const root = tmp();
  write(root, 'retro-state.md', retroState([1, 2, 3, 4, 5], 'complete'));
  write(root, 'retro-digest.md', '# Retro Digest\n\nNothing to report.\n');
  const r = run(CYCLE, ['--kind', 'retro', '--state', 'retro-state.md', '--digest', 'retro-digest.md', '--root', root], root);
  assert.ok(has(r, /words/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/retro: a gap in the step list fails — the loader walks to the first missing step', () => {
  const root = tmp();
  write(root, 'retro-state.md', retroState([3, 4, 5], 'complete'));
  write(root, 'retro-digest.md', '# Retro Digest\n\n' + ('Something happened and we learned a thing about it. '.repeat(4)));
  const r = run(CYCLE, ['--kind', 'retro', '--state', 'retro-state.md', '--digest', 'retro-digest.md', '--root', root], root);
  assert.strictEqual(r.code, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

function iterState(cycles, lastRetro) {
  const rows = Array.from({ length: cycles }, (_, i) =>
    `| ${i + 1} | 2026-10-0${i + 1} | hypothesis ${i + 1} | positive | iteration-results.md |`
  ).join('\n');
  return `---\ncyclesCompleted: ${cycles}\nlastRetroCycle: "${lastRetro}"\nstatus: "in-progress"\n---\n\n# Iteration State\n\n## Cycles completed\n\n| Cycle | Date | Hypothesis | Result | Artifact |\n|-------|------|-----------|--------|----------|\n${rows}\n`;
}

test('/iterate: five cycles with no retro recorded fails — the limit, finally enforced', () => {
  const root = tmp();
  write(root, 'artifacts/output/07-iteration/iteration-state.md', iterState(5, ''));
  write(root, 'artifacts/output/07-iteration/iteration-results.md',
    '# Iteration Results\n\nBefore: 12% failures. After: 0.4% failures. Result: positive.\n');
  const r = run(CYCLE, ['--kind', 'iterate', '--state', 'artifacts/output/07-iteration/iteration-state.md', '--root', root], root);
  assert.ok(has(r, /no retro is recorded/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/iterate: five cycles WITH a retro recorded passes', () => {
  const root = tmp();
  write(root, 'artifacts/output/07-iteration/iteration-state.md', iterState(5, '5'));
  write(root, 'artifacts/output/07-iteration/iteration-results.md',
    '# Iteration Results\n\nBefore: 12% failures. After: 0.4% failures. Result: positive.\n');
  const r = run(CYCLE, ['--kind', 'iterate', '--state', 'artifacts/output/07-iteration/iteration-state.md', '--root', root], root);
  assert.strictEqual(r.code, 0, `expected PASS, got: ${JSON.stringify(r.json.failures, null, 2)}`);
  fs.rmSync(root, { recursive: true, force: true });
});

test('/iterate: a counter that disagrees with its own cycle table fails', () => {
  const root = tmp();
  write(root, 'artifacts/output/07-iteration/iteration-state.md', iterState(3, '').replace('cyclesCompleted: 3', 'cyclesCompleted: 4'));
  write(root, 'artifacts/output/07-iteration/iteration-results.md',
    '# Iteration Results\n\nBefore: 12% failures. After: 0.4% failures. Result: positive.\n');
  const r = run(CYCLE, ['--kind', 'iterate', '--state', 'artifacts/output/07-iteration/iteration-state.md', '--root', root], root);
  assert.ok(has(r, /disagrees|disagree/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/iterate: a counted cycle with no recorded result fails — counting attempts stops the limit working', () => {
  const root = tmp();
  const s = iterState(2, '').replace('| positive |', '| |');
  write(root, 'artifacts/output/07-iteration/iteration-state.md', s);
  write(root, 'artifacts/output/07-iteration/iteration-results.md',
    '# Iteration Results\n\nBefore: 12% failures. After: 0.4% failures. Result: positive.\n');
  const r = run(CYCLE, ['--kind', 'iterate', '--state', 'artifacts/output/07-iteration/iteration-state.md', '--root', root], root);
  assert.ok(has(r, /no positive\/neutral\/negative result/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/iterate: results with no before/after measurement fail', () => {
  const root = tmp();
  write(root, 'artifacts/output/07-iteration/iteration-state.md', iterState(1, ''));
  write(root, 'artifacts/output/07-iteration/iteration-results.md',
    '# Iteration Results\n\nWe shipped the retry change. It felt better.\n');
  const r = run(CYCLE, ['--kind', 'iterate', '--state', 'artifacts/output/07-iteration/iteration-state.md', '--root', root], root);
  assert.ok(has(r, /no before\/after measurement/), JSON.stringify(r.json.failures));
  fs.rmSync(root, { recursive: true, force: true });
});

test('/iterate: an absent state file names the template — the limit had no counter at all', () => {
  const root = tmp();
  const r = run(CYCLE, ['--kind', 'iterate', '--state', 'artifacts/output/07-iteration/iteration-state.md', '--root', root], root);
  assert.ok(has(r, /iteration-state\.md is absent/), JSON.stringify(r.json.failures));
  assert.ok(has(r, /in four places|nothing counted/),
    `the failure must say WHY it matters: ${JSON.stringify(r.json.failures)}`);
  fs.rmSync(root, { recursive: true, force: true });
});

test('cycle_state_check: --root scopes --state, so a sandbox check never reads the real repo', () => {
  // Resolving --state against cwd instead made --root a no-op: the gate read the REAL repo's
  // artifacts while claiming to check a sandbox. For a path-taking checker that is the worst
  // possible failure mode.
  const root = tmp();
  write(root, 'a/retro-state.md', retroState([1, 2, 3, 4, 5], 'complete'));
  write(root, 'a/retro-digest.md', '# Retro Digest\n\n' + ('Pattern scan found three estimate misses on migration work, all from sizing migration as feature work. '.repeat(4)));
  // Deliberately run FROM THE REPO with --root pointing at the sandbox — that is the real usage.
  // Passing the sandbox as cwd as well would make cwd-resolution and root-resolution coincide, and
  // the test would pass against the bug. Verified: with --root ignored the gate looks for
  // `<repo>/a/retro-state.md` and fails closed.
  const r = run(CYCLE, ['--kind', 'retro', '--state', 'a/retro-state.md', '--digest', 'a/retro-digest.md', '--root', root], REPO);
  assert.strictEqual(r.code, 0, 'a sandboxed retro must resolve against --root, not the real repo');
  fs.rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------
// wiring
// ---------------------------------------------------------------------------------------------

test('every one of the four skills names its gate in SKILL.md', () => {
  const expected = {
    iterate: 'cycle_state_check.js',
    retro: 'cycle_state_check.js',
    incident: 'incident_record_check.js',
    'legal-safety-audit': 'legal_safety_audit_check.js',
  };
  for (const [skill, gate] of Object.entries(expected)) {
    const src = fs.readFileSync(path.join(REPO, '.agents/skills', skill, 'SKILL.md'), 'utf8');
    assert.ok(src.includes(gate), `/${skill} does not name ${gate} — an undocumented gate is never run`);
  }
});

test('the iterate 5-cycle limit now points at a counter in every place it is stated', () => {
  const files = [
    '.agents/skills/iterate/SKILL.md',
    '.agents/skills/iterate/steps/step-06-decide-next.md',
    '.agents/skills/retro/SKILL.md',
  ];
  for (const f of files) {
    const src = fs.readFileSync(path.join(REPO, f), 'utf8');
    const lines = src.split('\n').filter((l) => /5 iteration cycles|5 cycles|Maximum 5/.test(l));
    for (const l of lines) {
      assert.ok(/cycle_state_check|lastRetroCycle|iteration-state/.test(l),
        `${f} states the 5-cycle limit without pointing at its counter: ${l.trim().slice(0, 80)}`);
    }
  }
});

test('/iterate ships the state template its gate requires', () => {
  const tpl = path.join(REPO, '.agents/skills/iterate/templates/iteration-state.md');
  assert.ok(fs.existsSync(tpl), 'the gate names templates/iteration-state.md; it must exist');
  const src = fs.readFileSync(tpl, 'utf8');
  for (const key of ['cyclesCompleted', 'lastRetroCycle']) {
    assert.ok(src.includes(key), `the template must define ${key}, which the gate reads`);
  }
});
