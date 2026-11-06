'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE = path.resolve(__dirname, '..', '.agents', 'scripts', 'maintenance_plan_check.js');
const STATE_SOURCE = path.resolve(__dirname, '..', '.agents', 'scripts', 'maintenance_state.js');
const SCRIPTS_SOURCE = path.resolve(__dirname, '..', '.agents', 'scripts');
const RUN_ID = 'maintenance-plan-check-run';
const PLAN_ID = 'MP-T008';
const PLAN_REVISION = '1';
const AUTHORIZATION_RECORD = 'Repository-owner execution authorization';
const PLAN_DIGEST_FIELD = /^([ \t]*\|[ \t]*`?planDigest`?[ \t]*\|[ \t]*)([^|\r\n]*?)([ \t]*\|[^\r\n]*)$/m;
// The authorization row carries a digest-shaped placeholder so the plan stays
// self-consistent while the fixture computes the real digest.
const AUTH_DIGEST_PLACEHOLDER = `sha256:${'0'.repeat(64)}`;
// Marks an identity field the fixture must leave out of the plan entirely.
const OMIT_FIELD = Symbol('omit-field');

function copyScriptFixture(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const name of ['maintenance_plan_check.js', 'maintenance_state.js', 'memory_write.js']) {
    fs.copyFileSync(path.join(SCRIPTS_SOURCE, name), path.join(targetDir, name));
  }
  fs.cpSync(path.join(SCRIPTS_SOURCE, 'lib'), path.join(targetDir, 'lib'), { recursive: true });
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function canonicalPlanBytes(source) {
  return source.replace(PLAN_DIGEST_FIELD, (_line, prefix, _value, suffix) => `${prefix}[DIGEST OMITTED]${suffix}`);
}

function canonicalPlanBytesWithAuthorizationBinding(source) {
  const line = source.split(/\r?\n/).find((candidate) => {
    const trimmed = candidate.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
    const first = trimmed.slice(1, -1).split('|')[0].trim().replace(/^`(.*)`$/s, '$1').trim();
    return first === AUTHORIZATION_RECORD;
  });
  if (!line) return canonicalPlanBytes(source);
  return canonicalPlanBytes(source.replace(line, line.replace(/sha256:[a-f0-9]{64}/g, '[DIGEST OMITTED]')));
}

function boundPlanDigest(source) {
  return sha256Text(canonicalPlanBytesWithAuthorizationBinding(source));
}

// Recomputes a plan digest the way the documented rule does, so a test can
// edit a plan body and give it a self-consistent digest of its own.
function recomputeDocumentedDigest(source) {
  const digest = sha256Text(canonicalPlanBytes(source));
  return source.replace(PLAN_DIGEST_FIELD, (_line, prefix, _value, suffix) => `${prefix}sha256:${digest}${suffix}`);
}

function planDigestHex(f, planPath = f.planPath) {
  const match = /\| `planDigest` \| sha256:([a-f0-9]{64}) \|/.exec(fs.readFileSync(planPath, 'utf8'));
  return match ? match[1] : null;
}

function fixture() {
  const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-plan-check-test-')));
  const repoRoot = path.join(tempRoot, 'repo');
  const scriptsDir = path.join(repoRoot, '.agents', 'scripts');
  const stateRoot = path.join(tempRoot, 'state');
  const artifactRoot = path.join(repoRoot, 'artifacts', 'output', 'maintenance', RUN_ID);
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(stateRoot, { mode: 0o700 });
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'tests'), { recursive: true });
  // The fixture plan cites these two files, so they must exist in the
  // temporary repository: a citation that resolves nowhere now fails closed.
  fs.writeFileSync(path.join(repoRoot, 'tests', 'test_gate.test.js'), "test('gate', () => {});\n");
  fs.writeFileSync(path.join(artifactRoot, 'maintenance-brief.md'), '# Maintenance brief\n\nFR-001 bounded claim.\n');
  const script = path.join(scriptsDir, 'maintenance_plan_check.js');
  const stateScript = path.join(scriptsDir, 'maintenance_state.js');
  copyScriptFixture(scriptsDir);

  // The plan is bound to the repository's real HEAD, so the fixture is a Git
  // work tree with exactly one committed revision.
  git(repoRoot, ['init', '--quiet']);
  git(repoRoot, ['config', 'user.email', 'maintenance@example.test']);
  git(repoRoot, ['config', 'user.name', 'Maintenance Test']);
  git(repoRoot, ['config', 'commit.gpgsign', 'false']);
  git(repoRoot, ['config', 'core.autocrlf', 'false']);
  git(repoRoot, ['config', 'core.fileMode', 'true']);
  git(repoRoot, ['add', '--all']);
  git(repoRoot, ['commit', '--quiet', '-m', 'fixture base']);

  return {
    tempRoot,
    repoRoot: fs.realpathSync(repoRoot),
    stateRoot: fs.realpathSync(stateRoot),
    artifactRoot,
    script,
    stateScript,
    planPath: path.join(artifactRoot, `maintenance-plan-${PLAN_ID}-r${PLAN_REVISION}.md`),
    head: git(repoRoot, ['rev-parse', 'HEAD']).trim(),
    branch: git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']).trim(),
  };
}

function cleanup(f) {
  fs.rmSync(f.tempRoot, { recursive: true, force: true });
}

function snapshotTree(root) {
  const entries = [];
  function visit(file, relative = '') {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) {
      entries.push({ relative, type: 'symlink', target: fs.readlinkSync(file) });
    } else if (stat.isDirectory()) {
      entries.push({ relative, type: 'directory' });
      for (const name of fs.readdirSync(file).sort()) visit(path.join(file, name), path.join(relative, name));
    } else if (stat.isFile()) {
      entries.push({ relative, type: 'file', contents: fs.readFileSync(file).toString('base64') });
    } else {
      entries.push({ relative, type: 'other' });
    }
  }
  visit(root);
  return entries;
}

function decisions() {
  return [
    ['B1', 'Choose whether publication is blocked by all known findings or only new findings.', 'all known findings / new findings only'],
    ['O-4', 'Record a human disposition for each required baseline-history entry.', 'per-entry owner disposition'],
    ['B10', 'Choose retain, reshape, or remove for the named skill family.', 'retain / reshape / remove'],
    ['credential-residual', 'Decide whether the measured residual miss is acceptable.', 'accept / reject'],
  ];
}

function taskRow(task) {
  return `| \`${task.id}\` | ${task.work} | ${task.firstAction} | ${task.done} | ${task.status} | ${task.owner} | ${task.decisionOwner} | ${task.requirements} | ${task.source} | ${task.verification} | ${task.depends} | ${task.parallel || '—'} |`;
}

function defaultTask(overrides = {}) {
  return {
    id: 'T001',
    work: 'Add one bounded behavior check — 2h',
    firstAction: 'Read the named maintenance input row',
    done: 'Retain a passing targeted behavior-test result',
    status: '[BLOCKED]',
    owner: 'developer',
    decisionOwner: 'Repository owner',
    requirements: 'FR-001, US-001, AC-U1',
    source: 'maintenance-brief.md#fr-001',
    verification: 'CODE: test file: tests/test_gate.test.js; test name: rejects a conditional result; command: node --test tests/test_gate.test.js; revert proof: the behavior test fails when the fix is reverted',
    depends: 'B1',
    parallel: '—',
    ...overrides,
  };
}

function graphFor(tasks) {
  const edges = [];
  for (const task of tasks) {
    for (const dependency of task.depends.split(/[\s,;]+/).filter(Boolean)) {
      if (dependency === '—' || dependency === '-') continue;
      if (decisions().some(([id]) => id === dependency)) {
        edges.push(`D_${dependency}["${dependency} [OPEN]"] -. blocks .-> ${task.id}["${task.id}"]`);
      } else {
        edges.push(`${dependency}["${dependency}"] --> ${task.id}["${task.id}"]`);
      }
    }
  }
  return ['```mermaid', 'flowchart LR', ...edges, '```'].join('\n');
}

function pendingAuthorizationRow() {
  return `| ${AUTHORIZATION_RECORD} | PENDING | Repository owner | No tasks authorized in this draft | PENDING — ${RUN_ID} / ${PLAN_ID} / ${PLAN_REVISION} / bind digest at authorization | OPEN | not recorded |`;
}

function recordedAuthorizationRow(decisionId, evidenceRef, status = 'AUTHORIZED') {
  return `| ${AUTHORIZATION_RECORD} | ${status} | Repository owner | ${decisionId} — owner ruling for the ${decisionId} blocker | ${RUN_ID} / ${PLAN_ID} / ${PLAN_REVISION} / ${AUTH_DIGEST_PLACEHOLDER} | ${evidenceRef} | recorded-claim / not-cryptographically-verified |`;
}

function decisionRowsWith(decisionId, { status, evidence }) {
  return decisions().map(([id, question, options]) => {
    if (id !== decisionId) {
      return `| \`${id}\` | ${question} | ${options} | [OPEN] | Repository owner | Work requiring the owner ruling remains blocked | OPEN — no disposition recorded |`;
    }
    return `| \`${id}\` | ${question} | ${options} | ${status} | Repository owner | Work requiring the owner ruling remains blocked | ${evidence} |`;
  });
}

function recordDispositionClaim(f, decisionId, disposition, evidenceRef, sessionId) {
  const identity = {
    scope: 'maintenance', repoRoot: f.repoRoot, stateRoot: f.stateRoot, runId: RUN_ID,
  };
  if (sessionId) {
    identity.agent = 'developer';
    identity.sessionId = sessionId;
  }
  require(f.stateScript).appendMaintenanceRunEvent(identity, {
    type: 'owner_decision_disposition',
    details: { actorType: 'human', decisionId, disposition, evidenceRef },
  });
}

// Records a plan draft and the repository-owner approval of that draft. The
// approval is recorded in its own session unless the caller asks for the same
// one, because authoring and approving must be separated on the record.
function recordPlanDraft(f, planHash, sessionId = 'session-draft') {
  const state = require(f.stateScript);
  return state.appendMaintenanceRunEvent({
    scope: 'maintenance', repoRoot: f.repoRoot, stateRoot: f.stateRoot, runId: RUN_ID,
    agent: 'developer', sessionId,
  }, {
    type: 'plan_drafted',
    details: { planId: PLAN_ID, planRevision: PLAN_REVISION, planHash },
  });
}

function recordPlanApproval(f, planHash, draftSessionId = 'session-draft', approvalSessionId = 'session-approval') {
  const state = require(f.stateScript);
  const base = {
    scope: 'maintenance', repoRoot: f.repoRoot, stateRoot: f.stateRoot, runId: RUN_ID,
  };
  const planRecord = { planId: PLAN_ID, planRevision: PLAN_REVISION, planHash };
  const draft = state.appendMaintenanceRunEvent(
    { ...base, agent: 'developer', sessionId: draftSessionId },
    { type: 'plan_drafted', details: planRecord },
  );
  state.appendMaintenanceRunEvent(
    { ...base, agent: 'reviewer', sessionId: approvalSessionId },
    {
      type: 'plan_approved',
      details: { ...planRecord, draftEventId: draft.eventId, evidenceRef: 'owner-approval-claim://plan' },
    },
  );
  return draft;
}

function renderPlan(f, {
  tasks = [defaultTask()],
  graph,
  decisionRows,
  planStatus = 'DRAFT',
  identity: identityOverride,
  baseRevision = f.head,
  dirtyManifest = { schema: 'dirty-manifest-v1', files: [] },
  references,
  evidence = 'maintenance-brief.md#fr-001',
  testReference = 'tests/test_gate.test.js — rejects a conditional result',
  authorizationRow = pendingAuthorizationRow(),
} = {}) {
  const rows = decisionRows || decisions().map(([id, question, options]) =>
    `| \`${id}\` | ${question} | ${options} | [OPEN] | Repository owner | Work requiring the owner ruling remains blocked | OPEN — no disposition recorded |`,
  );
  const graphBlock = graph || graphFor(tasks);
  const identity = identityOverride ||
    `repoRoot=${f.repoRoot}; worktreePath=${f.repoRoot}; worktreeId=temp-worktree-001; branch=${f.branch}; HEAD=${f.head}; status=clean`;
  const manifestRow = dirtyManifest === OMIT_FIELD
    ? ''
    : `| \`dirtyManifest\` | \`${JSON.stringify(dirtyManifest)}\` |\n`;
  const sourceCell = references ? references.join(', ') : 'maintenance-brief.md#fr-001';
  const content = `# Maintenance Plan — Checker fixture

This plan checks one bounded behavior without executing the change.

## Record identity

| Field | Value |
|---|---|
| \`runId\` | \`${RUN_ID}\` |
| \`planId\` | \`${PLAN_ID}\` |
| \`planRevision\` | \`${PLAN_REVISION}\` |
| \`planDigest\` | sha256:__DIGEST__ |
| \`baseRevision\` | ${baseRevision} |
| \`workingTreeIdentity\` | ${identity} |
${manifestRow}| \`externalStateRoot\` | ${f.stateRoot} |
| \`repoArtifactRoot\` | artifacts/output/maintenance/${RUN_ID}/ |
| \`createdAt\` | 2026-10-20T00:00:00.000Z |
| \`author\` | developer |
| \`recordStatus\` | ${planStatus} |

**Digest rule:** compute SHA-256 over the exact plan bytes after replacing the \`planDigest\` field value with the literal \`[DIGEST OMITTED]\`. Record this canonicalization rule with the digest. Any other content change requires a new revision and digest.

## Scope

- **In scope:** Check the task record's mechanical form.
- **Out of scope:** Execute changes or claim gate-green.
- **Assumptions:** The maintenance inputs are the source of scope.
- **Constraints:** Use only the run-specific maintenance artifact root.
- **Execution boundary:** This artifact is a proposal only; execution needs separate repository-owner authorization.

## Findings

| Finding ID | Claim and provenance | Current status | Owner | Decision owner | Exact source link(s) | Test/verification reference(s) | Evidence reference(s) | Revision covered | Blocked by |
|---|---|---|---|---|---|---|---|---|---|
| F001 | Inherited claim from the maintenance brief | [OPEN] | developer | Repository owner | ${sourceCell} | ${testReference} | ${evidence} | ${baseRevision} | B1; T001 |

## Owner decisions — blockers, not estimated tasks

| Decision ID | Exact question | Options shown without selection | Status | Decision owner | Dependent task/work or gate | Owner evidence |
|---|---|---|---|---|---|---|
${rows.join('\n')}

## Task list

| Task ID | Work item and estimate (1–4h) | First action | Done evidence | Status | Owner | Decision owner | Requirement/story/AC IDs | Exact source link(s) | Revert-proof test or manual evidence | Depends on | Parallel with |
|---|---|---|---|---|---|---|---|---|---|---|---|
${tasks.map(taskRow).join('\n')}

## Dependency graph

${graphBlock}

## Technical review and repository-owner execution authorization

| Record | Status | Required reviewer/owner | Scope / task IDs | Exact plan revision and digest | Evidence reference | Claim status |
|---|---|---|---|---|---|---|
| Technical plan review | PENDING | @tech-lead | Scope, sources, estimates, verification, dependency graph | PENDING — ${RUN_ID} / ${PLAN_ID} / ${PLAN_REVISION} / bind digest at review | OPEN | not recorded |
${authorizationRow === null ? '' : authorizationRow}
`;
  const digest = boundPlanDigest(content);
  return content
    .replace('sha256:__DIGEST__', `sha256:${digest}`)
    .replace(AUTH_DIGEST_PLACEHOLDER, `sha256:${digest}`);
}

function writePlan(f, options) {
  fs.writeFileSync(f.planPath, renderPlan(f, options));
}

function check(f, planPath = f.planPath) {
  const before = snapshotTree(f.tempRoot);
  const result = spawnSync(process.execPath, [
    f.script,
    'check',
    '--scope', 'maintenance',
    '--repo-root', f.repoRoot,
    '--state-root', f.stateRoot,
    '--run-id', RUN_ID,
    '--plan', planPath,
    '--json',
  ], { cwd: f.tempRoot, encoding: 'utf8' });
  assert.deepEqual(snapshotTree(f.tempRoot), before, 'plan check must not write to the temporary repo or state root');
  assert.equal(result.stderr, '', result.stderr);
  return { ...result, output: JSON.parse(result.stdout) };
}

test('accepts a valid draft with open decisions and blocked work without authorizing execution', () => {
  const f = fixture();
  try {
    writePlan(f);
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
    assert.equal(result.output.planStatus, 'draft');
    assert.equal(result.output.executionAuthorized, false);
    assert.equal(Object.hasOwn(result.output, 'gateGreen'), false);
    assert.deepEqual(result.output.issues, []);
  } finally {
    cleanup(f);
  }
});

test('fails closed for a malformed plan digest', () => {
  const f = fixture();
  try {
    writePlan(f);
    fs.writeFileSync(f.planPath, fs.readFileSync(f.planPath, 'utf8').replace(/sha256:[a-f0-9]{64}/, `sha256:${'0'.repeat(64)}`));
    const result = check(f);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.ok(result.output.issues.some((issue) => issue.code === 'PLAN_DIGEST_MISMATCH'));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('fails closed when the plan file is missing', () => {
  const f = fixture();
  try {
    const result = check(f);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.equal(result.output.planStatus, 'invalid');
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('rejects a plan path outside the exact run artifact root', () => {
  const f = fixture();
  try {
    const escaped = path.join(f.repoRoot, 'artifacts', 'output', 'maintenance', 'other-run', 'plan.md');
    fs.mkdirSync(path.dirname(escaped), { recursive: true });
    fs.writeFileSync(escaped, 'unchanged');
    const result = check(f, escaped);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.ok(result.output.issues.some((issue) => /maintenance run artifact root/.test(issue.message)));
  } finally {
    cleanup(f);
  }
});

test('rejects duplicate task IDs', () => {
  const f = fixture();
  try {
    const task = defaultTask();
    writePlan(f, { tasks: [task, { ...task, work: 'Repeat a bounded behavior check — 1h' }] });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DUPLICATE_TASK_ID'));
  } finally {
    cleanup(f);
  }
});

test('rejects a task estimate outside the 1–4 hour range', () => {
  const f = fixture();
  try {
    writePlan(f, { tasks: [defaultTask({ work: 'Add one bounded behavior check — 5h' })] });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'INVALID_ESTIMATE'));
  } finally {
    cleanup(f);
  }
});

test('rejects a code task without a revert-proof description', () => {
  const f = fixture();
  try {
    const verification = 'CODE: test file: tests/test_gate.test.js; test name: rejects a conditional result; command: node --test tests/test_gate.test.js';
    writePlan(f, { tasks: [defaultTask({ verification })] });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'MISSING_REVERT_PROOF'));
  } finally {
    cleanup(f);
  }
});

test('rejects a dependency graph that disagrees with the task table', () => {
  const f = fixture();
  try {
    writePlan(f, {
      graph: [
        '```mermaid',
        'flowchart LR',
        'D_O-4["O-4 [OPEN]"] -. blocks .-> T001["T001"]',
        '```',
      ].join('\n'),
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DEPENDENCY_GRAPH_MISMATCH'));
  } finally {
    cleanup(f);
  }
});

test('rejects missing task references and dependency cycles', () => {
  const missing = fixture();
  try {
    writePlan(missing, { tasks: [defaultTask({ depends: 'T999' })] });
    const result = check(missing);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'UNKNOWN_REFERENCE'));
  } finally {
    cleanup(missing);
  }

  const cyclic = fixture();
  try {
    const tasks = [
      defaultTask({ id: 'T001', status: '[PLANNED]', depends: 'T002' }),
      defaultTask({ id: 'T002', status: '[PLANNED]', depends: 'T001' }),
    ];
    writePlan(cyclic, { tasks });
    const result = check(cyclic);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DEPENDENCY_CYCLE'));
  } finally {
    cleanup(cyclic);
  }
});

test('rejects a task marked ready while its owner decision dependency is open', () => {
  const f = fixture();
  try {
    writePlan(f, { tasks: [defaultTask({ status: '[READY]' })] });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'OPEN_DECISION_TASK_EXECUTABLE'));
  } finally {
    cleanup(f);
  }
});

test('a claim-only plan approval never promotes a draft or authorizes execution', () => {
  const f = fixture();
  try {
    writePlan(f);
    recordPlanApproval(f, planDigestHex(f));

    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
    assert.equal(result.output.planStatus, 'draft');
    assert.equal(result.output.executionAuthorized, false);
    assert.equal(Object.hasOwn(result.output, 'gateGreen'), false);
  } finally {
    cleanup(f);
  }
});

test('does not accept a closed owner decision without a matching evidence-backed state claim', () => {
  const f = fixture();
  try {
    const rows = decisions().map(([id, question, options]) => {
      const status = id === 'B1' ? 'all known findings' : '[OPEN]';
      const evidence = id === 'B1' ? 'owner-decision-record://B1' : 'OPEN — no disposition recorded';
      return `| \`${id}\` | ${question} | ${options} | ${status} | Repository owner | Work requiring the owner ruling remains blocked | ${evidence} |`;
    });
    writePlan(f, { decisionRows: rows });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'UNSUPPORTED_DECISION_STATUS'));
  } finally {
    cleanup(f);
  }
});

test('a matching owner-disposition claim is recorded but remains non-authoritative', () => {
  const f = fixture();
  try {
    const evidenceRef = 'owner-decision-record://B1';
    const rows = decisions().map(([id, question, options]) => {
      const status = id === 'B1' ? 'all known findings' : '[OPEN]';
      const evidence = id === 'B1' ? evidenceRef : 'OPEN — no disposition recorded';
      return `| \`${id}\` | ${question} | ${options} | ${status} | Repository owner | Work requiring the owner ruling remains blocked | ${evidence} |`;
    });
    writePlan(f, { decisionRows: rows });
    recordDispositionClaim(f, 'B1', 'all known findings', evidenceRef);

    const result = check(f);
    // The claim is recorded, but the plan carries no repository-owner
    // execution authorization, so the decision stays blocking and the missing
    // artifact is named.
    assert.equal(result.status, 2, JSON.stringify(result.output));
    assert.ok(result.output.issues.some((issue) => issue.code === 'INCOMPLETE_DECISION_RESOLUTION'));
    assert.equal(result.output.executionAuthorized, false);
    assert.equal(Object.hasOwn(result.output, 'gateGreen'), false);
  } finally {
    cleanup(f);
  }
});

const DISPOSITION = 'all known findings';
const CLAIM_EVIDENCE = 'owner-decision-record://B1';
const CLAIM_EVIDENCE_B10 = 'owner-decision-record://B10';
const AUTHORIZATION_EVIDENCE = 'owner-authorization://B1';

test('fails closed when the plan is bound to a revision that is not the current one', () => {
  const f = fixture();
  try {
    const stale = 'b'.repeat(40);
    writePlan(f, {
      baseRevision: stale,
      identity: `repoRoot=${f.repoRoot}; worktreePath=${f.repoRoot}; worktreeId=temp-worktree-001; branch=${f.branch}; HEAD=${stale}; status=clean`,
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.equal(result.output.executionAuthorized, false);
    const issue = result.output.issues.find((entry) => entry.code === 'BASE_REVISION_MISMATCH');
    assert.ok(issue, JSON.stringify(result.output.issues));
    assert.match(issue.message, /bound to a revision that is not the current one/);
    assert.ok(issue.message.includes(f.head));
    // The plan is internally consistent, so only the repository binding fails.
    assert.ok(!result.output.issues.some((entry) => entry.code === 'INVALID_WORKTREE_IDENTITY'));
  } finally {
    cleanup(f);
  }
});

test('accepts a plan bound to the current repository HEAD', () => {
  const f = fixture();
  try {
    writePlan(f);
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
    assert.ok(!result.output.issues.some((issue) => issue.code === 'BASE_REVISION_MISMATCH'));
    assert.ok(!result.output.issues.some((issue) => issue.code === 'BASE_REVISION_UNVERIFIABLE'));
  } finally {
    cleanup(f);
  }
});

test('resolves an owner decision when the plan authorization, the plan decision row, and the recorded claim all exist', () => {
  const f = fixture();
  try {
    writePlan(f, {
      decisionRows: decisionRowsWith('B1', { status: DISPOSITION, evidence: CLAIM_EVIDENCE }),
      authorizationRow: recordedAuthorizationRow('B1', AUTHORIZATION_EVIDENCE),
      tasks: [defaultTask({ status: '[READY]' })],
    });
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE);

    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
    assert.deepEqual(result.output.issues, []);
    assert.equal(result.output.executionAuthorized, false);
    assert.equal(Object.hasOwn(result.output, 'gateGreen'), false);
    // The decision no longer blocks dependent work.
    assert.ok(!result.output.issues.some((issue) => issue.code === 'OPEN_DECISION_TASK_EXECUTABLE'));
  } finally {
    cleanup(f);
  }
});

test('keeps an owner decision blocking and names the missing plan authorization artifact', () => {
  const f = fixture();
  try {
    writePlan(f, {
      decisionRows: decisionRowsWith('B1', { status: DISPOSITION, evidence: CLAIM_EVIDENCE }),
      tasks: [defaultTask({ status: '[READY]' })],
    });
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE);

    const result = check(f);
    assert.equal(result.status, 2);
    const issue = result.output.issues.find((entry) => entry.code === 'INCOMPLETE_DECISION_RESOLUTION');
    assert.ok(issue, JSON.stringify(result.output.issues));
    assert.match(issue.message, /Repository-owner execution authorization/);
    assert.match(issue.message, /pending status/);
    // The decision is still a blocking dependency.
    assert.ok(result.output.issues.some((entry) => entry.code === 'OPEN_DECISION_TASK_EXECUTABLE'));
  } finally {
    cleanup(f);
  }
});

test('keeps an owner decision blocking and names the missing plan decision row', () => {
  const f = fixture();
  try {
    writePlan(f, {
      decisionRows: decisionRowsWith('B1', {
        status: '[OPEN]',
        evidence: `${CLAIM_EVIDENCE} — recorded claim, the plan row is not updated yet`,
      }),
      authorizationRow: recordedAuthorizationRow('B1', AUTHORIZATION_EVIDENCE),
      tasks: [defaultTask({ status: '[READY]' })],
    });
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE);

    const result = check(f);
    assert.equal(result.status, 2);
    const issue = result.output.issues.find((entry) => entry.code === 'INCOMPLETE_DECISION_RESOLUTION');
    assert.ok(issue, JSON.stringify(result.output.issues));
    assert.match(issue.message, /decision row for B1 still records \[OPEN\]/);
    assert.ok(result.output.issues.some((entry) => entry.code === 'OPEN_DECISION_TASK_EXECUTABLE'));
  } finally {
    cleanup(f);
  }
});

test('keeps an owner decision blocking and names the missing recorded disposition claim', () => {
  const f = fixture();
  try {
    writePlan(f, {
      decisionRows: decisionRowsWith('B1', { status: DISPOSITION, evidence: CLAIM_EVIDENCE }),
      authorizationRow: recordedAuthorizationRow('B1', AUTHORIZATION_EVIDENCE),
      tasks: [defaultTask({ status: '[READY]' })],
    });
    // External state holds no recorded disposition claim for B1.

    const result = check(f);
    assert.equal(result.status, 2);
    const issue = result.output.issues.find((entry) => entry.code === 'INCOMPLETE_DECISION_RESOLUTION');
    assert.ok(issue, JSON.stringify(result.output.issues));
    assert.match(issue.message, /no recorded disposition claim for B1/);
    assert.ok(result.output.issues.some((entry) => entry.code === 'OPEN_DECISION_TASK_EXECUTABLE'));
  } finally {
    cleanup(f);
  }
});

test('a claim-only disposition with no authorization row in the plan still blocks', () => {
  const f = fixture();
  try {
    writePlan(f, {
      decisionRows: decisionRowsWith('B1', { status: DISPOSITION, evidence: CLAIM_EVIDENCE }),
      authorizationRow: null,
      tasks: [defaultTask({ status: '[READY]' })],
    });
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE);

    const result = check(f);
    assert.equal(result.status, 2);
    const issue = result.output.issues.find((entry) => entry.code === 'INCOMPLETE_DECISION_RESOLUTION');
    assert.ok(issue, JSON.stringify(result.output.issues));
    assert.match(issue.message, /must carry exactly one "Repository-owner execution authorization" row/);
    assert.ok(result.output.issues.some((entry) => entry.code === 'OPEN_DECISION_TASK_EXECUTABLE'));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('an authorization row that claims authentication never unblocks an owner decision', () => {
  const f = fixture();
  try {
    const authenticatedRow = `| ${AUTHORIZATION_RECORD} | AUTHORIZED | Repository owner | B1 — owner ruling for the B1 blocker | ${RUN_ID} / ${PLAN_ID} / ${PLAN_REVISION} / ${AUTH_DIGEST_PLACEHOLDER} | ${AUTHORIZATION_EVIDENCE} | authenticated owner approval |`;
    writePlan(f, {
      decisionRows: decisionRowsWith('B1', { status: DISPOSITION, evidence: CLAIM_EVIDENCE }),
      authorizationRow: authenticatedRow,
      tasks: [defaultTask({ status: '[READY]' })],
    });
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE);

    const result = check(f);
    assert.equal(result.status, 2);
    const issue = result.output.issues.find((entry) => entry.code === 'INCOMPLETE_DECISION_RESOLUTION');
    assert.ok(issue, JSON.stringify(result.output.issues));
    assert.match(issue.message, /never an authenticated approval/);
    assert.ok(result.output.issues.some((entry) => entry.code === 'OPEN_DECISION_TASK_EXECUTABLE'));
  } finally {
    cleanup(f);
  }
});

function git(repoRoot, args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' },
  });
  if (result.error) throw new Error(result.error.message);
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function gitFixture() {
  const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-plan-check-git-')));
  const repoRoot = path.join(tempRoot, 'repo');
  const scriptsDir = path.join(repoRoot, '.agents', 'scripts');
  const stateRoot = path.join(tempRoot, 'state');
  const artifactRoot = path.join(repoRoot, 'artifacts', 'output', 'maintenance', RUN_ID);
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(stateRoot, { mode: 0o700 });
  fs.mkdirSync(artifactRoot, { recursive: true });
  const script = path.join(scriptsDir, 'maintenance_plan_check.js');
  const stateScript = path.join(scriptsDir, 'maintenance_state.js');
  copyScriptFixture(scriptsDir);

  git(repoRoot, ['init', '--quiet']);
  git(repoRoot, ['config', 'user.email', 'maintenance@example.test']);
  git(repoRoot, ['config', 'user.name', 'Maintenance Test']);
  git(repoRoot, ['config', 'commit.gpgsign', 'false']);
  git(repoRoot, ['config', 'core.autocrlf', 'false']);
  git(repoRoot, ['config', 'core.fileMode', 'true']);
  fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'src', 'nested'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'src', 'app.js'), 'export const value = 1;\n');
  fs.writeFileSync(path.join(repoRoot, 'src', 'nested', 'child.js'), 'export const child = 1;\n');
  fs.writeFileSync(path.join(repoRoot, 'tests', 'app.test.js'), "test('value', () => {});\n");
  git(repoRoot, ['add', '--all']);
  git(repoRoot, ['commit', '--quiet', '-m', 'base']);

  return {
    tempRoot,
    repoRoot: fs.realpathSync(repoRoot),
    stateRoot: fs.realpathSync(stateRoot),
    artifactRoot,
    script,
    stateScript,
    planPath: path.join(artifactRoot, `maintenance-plan-${PLAN_ID}-r${PLAN_REVISION}.md`),
    head: git(repoRoot, ['rev-parse', 'HEAD']).trim(),
    branch: git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']).trim(),
  };
}

function gitIdentity(f, status) {
  return `repoRoot=${f.repoRoot}; worktreePath=${f.repoRoot}; worktreeId=git-worktree-001; branch=${f.branch}; HEAD=${f.head}; status=${status}`;
}

function gitTask(overrides = {}) {
  return defaultTask({
    source: 'src/app.js',
    verification: 'CODE: test file: tests/app.test.js; test name: rejects a conditional result; command: node --test tests/app.test.js; revert proof: the behavior test fails when the fix is reverted',
    ...overrides,
  });
}

function manifestCommand(f, planPath = f.planPath) {
  const before = snapshotTree(f.tempRoot);
  const result = spawnSync(process.execPath, [
    f.script,
    'manifest',
    '--scope', 'maintenance',
    '--repo-root', f.repoRoot,
    '--state-root', f.stateRoot,
    '--run-id', RUN_ID,
    '--plan', planPath,
    '--json',
  ], { cwd: f.tempRoot, encoding: 'utf8' });
  assert.deepEqual(snapshotTree(f.tempRoot), before, 'the manifest command must not write to the temporary repo or state root');
  assert.equal(result.stderr, '', result.stderr);
  return { ...result, output: JSON.parse(result.stdout) };
}

function writeGitPlan(f, {
  status = 'dirty',
  manifest,
  references = ['src/app.js', 'tests/app.test.js'],
  tasks = [gitTask()],
  evidence = 'src/app.js',
  testReference = 'tests/app.test.js — rejects a conditional result',
} = {}) {
  writePlan(f, {
    identity: gitIdentity(f, status),
    baseRevision: f.head,
    dirtyManifest: manifest,
    references,
    evidence,
    tasks,
    testReference,
  });
}

test('accepts a clean worktree that declares an empty dirty manifest', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, { status: 'clean', manifest: { schema: 'dirty-manifest-v1', files: [] } });
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
    assert.equal(result.output.planStatus, 'draft');
    assert.equal(result.output.executionAuthorized, false);
    assert.equal(Object.hasOwn(result.output, 'gateGreen'), false);
  } finally {
    cleanup(f);
  }
});

test('accepts an exact dirty manifest for a modified relevant file', () => {
  const f = gitFixture();
  try {
    const content = 'export const value = 2;\n';
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), content);
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [{
          status: 'modified', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text(content),
        }],
      },
    });
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
    assert.deepEqual(result.output.issues, []);
  } finally {
    cleanup(f);
  }
});

test('accepts an exact dirty manifest for a staged relevant file', () => {
  const f = gitFixture();
  try {
    const content = 'export const value = 3;\n';
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), content);
    git(f.repoRoot, ['add', 'src/app.js']);
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [{
          status: 'staged', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text(content),
        }],
      },
    });
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
  } finally {
    cleanup(f);
  }
});

test('accepts an exact dirty manifest for an unstaged deletion', () => {
  const f = gitFixture();
  try {
    fs.rmSync(path.join(f.repoRoot, 'src', 'app.js'));
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [{ status: 'deleted', path: 'src/app.js', kind: 'file', mode: null, contentSha256: null }],
      },
    });
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
  } finally {
    cleanup(f);
  }
});

test('accepts an exact dirty manifest for an untracked relevant file', () => {
  const f = gitFixture();
  try {
    const content = 'export const extra = 1;\n';
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'new.js'), content);
    writeGitPlan(f, {
      references: ['src/app.js', 'tests/app.test.js', 'src/new.js'],
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [{
          status: 'untracked', path: 'src/new.js', kind: 'file', mode: '100644', contentSha256: sha256Text(content),
        }],
      },
    });
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
  } finally {
    cleanup(f);
  }
});

test('keeps the staged snapshot and the working-tree snapshot of one path as separate rows', () => {
  const f = gitFixture();
  try {
    const stagedContent = 'export const value = 4;\n';
    const workingContent = 'export const value = 5;\n';
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), stagedContent);
    git(f.repoRoot, ['add', 'src/app.js']);
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), workingContent);
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [
          { status: 'modified', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text(workingContent) },
          { status: 'staged', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text(stagedContent) },
        ],
      },
    });
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
  } finally {
    cleanup(f);
  }
});

test('sorts computed manifest entries by normalized path and then status', () => {
  const f = gitFixture();
  try {
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), 'export const value = 6;\n');
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'new.js'), 'export const extra = 2;\n');
    fs.writeFileSync(path.join(f.repoRoot, 'tests', 'app.test.js'), "test('value', () => assert.ok(true));\n");
    writeGitPlan(f, { references: ['src/app.js', 'tests/app.test.js', 'src/new.js'] });
    const result = manifestCommand(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.deepEqual(result.output.manifest.files.map((entry) => `${entry.path}:${entry.status}`), [
      'src/app.js:modified',
      'src/new.js:untracked',
      'tests/app.test.js:modified',
    ]);
    assert.deepEqual(result.output.relevantPaths, ['src/app.js', 'src/new.js', 'tests/app.test.js']);
  } finally {
    cleanup(f);
  }
});

test('rejects a dirty relevant path that the manifest omits', () => {
  const f = gitFixture();
  try {
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), 'export const value = 7;\n');
    writeGitPlan(f, { manifest: { schema: 'dirty-manifest-v1', files: [] } });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DIRTY_MANIFEST_ENTRY_MISSING'));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('rejects a manifest entry for a relevant path that is not changed', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [{
          status: 'modified', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text('export const value = 1;\n'),
        }],
      },
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DIRTY_MANIFEST_ENTRY_EXTRA'));
  } finally {
    cleanup(f);
  }
});

test('rejects a manifest entry for a path outside the relevant-path set', () => {
  const f = gitFixture();
  try {
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), 'export const value = 8;\n');
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [
          {
            status: 'modified', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text('export const value = 8;\n'),
          },
          {
            status: 'modified', path: 'vendor/unrelated.js', kind: 'file', mode: '100644', contentSha256: sha256Text('export const unrelated = 1;\n'),
          },
        ],
      },
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DIRTY_MANIFEST_ENTRY_EXTRA'));
  } finally {
    cleanup(f);
  }
});

test('rejects a manifest entry whose status does not match the computed status', () => {
  const f = gitFixture();
  try {
    const content = 'export const value = 9;\n';
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), content);
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [{
          status: 'staged', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text(content),
        }],
      },
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DIRTY_MANIFEST_MISMATCH'));
  } finally {
    cleanup(f);
  }
});

test('rejects a manifest entry whose mode does not match the computed mode', () => {
  const f = gitFixture();
  try {
    const content = 'export const value = 10;\n';
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), content);
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [{
          status: 'modified', path: 'src/app.js', kind: 'file', mode: '100755', contentSha256: sha256Text(content),
        }],
      },
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DIRTY_MANIFEST_MISMATCH'));
  } finally {
    cleanup(f);
  }
});

test('rejects a manifest entry whose content hash does not match the computed bytes', () => {
  const f = gitFixture();
  try {
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), 'export const value = 11;\n');
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [{
          status: 'modified', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text('export const value = 12;\n'),
        }],
      },
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DIRTY_MANIFEST_MISMATCH'));
  } finally {
    cleanup(f);
  }
});

test('rejects a dirty worktree that declares no manifest', () => {
  const f = gitFixture();
  try {
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), 'export const value = 13;\n');
    writeGitPlan(f, { manifest: OMIT_FIELD });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'MISSING_DIRTY_MANIFEST'));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('rejects a clean claim that hides a dirty relevant file', () => {
  const f = gitFixture();
  try {
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), 'export const value = 14;\n');
    writeGitPlan(f, { status: 'clean', manifest: { schema: 'dirty-manifest-v1', files: [] } });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'WORKTREE_IDENTITY_CONTRADICTION'));
  } finally {
    cleanup(f);
  }
});

test('fails closed on a symlinked relevant path', () => {
  const f = gitFixture();
  try {
    fs.symlinkSync('app.js', path.join(f.repoRoot, 'src', 'link.js'));
    writeGitPlan(f, { references: ['src/app.js', 'tests/app.test.js', 'src/link.js'] });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'UNSUPPORTED_PATH_KIND'));
  } finally {
    cleanup(f);
  }
});

test('fails closed on a submodule relevant path', () => {
  const f = gitFixture();
  try {
    git(f.repoRoot, ['update-index', '--add', '--cacheinfo', `160000,${f.head},vendor/sub`]);
    writeGitPlan(f, { references: ['src/app.js', 'tests/app.test.js', 'vendor/sub'] });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'UNSUPPORTED_PATH_KIND'));
  } finally {
    cleanup(f);
  }
});

test('rejects a forbidden product-state reference before any relevant file is read', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, {
      references: ['src/app.js', 'tests/app.test.js', 'artifacts/memory/project-context.md'],
      manifest: { schema: 'dirty-manifest-v1', files: [] },
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'FORBIDDEN_RELEVANT_PATH'));
  } finally {
    cleanup(f);
  }
});

test('rejects a malformed dirty manifest instead of skipping the comparison', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, { manifest: { schema: 'dirty-manifest-v2', files: [] } });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'INVALID_DIRTY_MANIFEST'));
  } finally {
    cleanup(f);
  }
});

test('fails closed when the plan cites a file that resolves nowhere', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, { testReference: 'tests/missing-behavior.test.js — rejects a conditional result' });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.equal(result.output.planStatus, 'invalid');
    assert.ok(result.output.issues.some((issue) =>
      issue.code === 'UNRESOLVABLE_RELEVANT_PATH' &&
      issue.message.includes('tests/missing-behavior.test.js')));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('the manifest command reports an unresolvable citation instead of dropping it', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, { testReference: 'tests/missing-behavior.test.js — rejects a conditional result' });
    const result = manifestCommand(f);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.ok(result.output.issues.some((issue) => issue.code === 'UNRESOLVABLE_RELEVANT_PATH'));
    assert.ok(!result.output.relevantPaths.includes('tests/missing-behavior.test.js'));
  } finally {
    cleanup(f);
  }
});

test('does not treat prose abbreviations or placeholder fragments as file citations', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, {
      status: 'clean',
      manifest: { schema: 'dirty-manifest-v1', files: [] },
      evidence: 'src/app.js — see e.g. the revision note under <runId>/notes.md',
    });
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.valid, true);
    assert.deepEqual(result.output.issues, []);
  } finally {
    cleanup(f);
  }
});

test('rejects a dirty manifest whose entries are not sorted', () => {
  const f = gitFixture();
  try {
    const content = 'export const value = 15;\n';
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), content);
    fs.writeFileSync(path.join(f.repoRoot, 'tests', 'app.test.js'), "test('value', () => {});\n");
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [
          {
            status: 'modified', path: 'tests/app.test.js', kind: 'file', mode: '100644', contentSha256: sha256Text("test('value', () => {});\n"),
          },
          {
            status: 'modified', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text(content),
          },
        ],
      },
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'INVALID_DIRTY_MANIFEST'));
  } finally {
    cleanup(f);
  }
});

test('leaves the repository, the git index, and the state root untouched while checking a dirty manifest', () => {
  const f = gitFixture();
  try {
    const content = 'export const value = 16;\n';
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), content);
    writeGitPlan(f, {
      manifest: {
        schema: 'dirty-manifest-v1',
        files: [{
          status: 'modified', path: 'src/app.js', kind: 'file', mode: '100644', contentSha256: sha256Text(content),
        }],
      },
    });
    const indexBefore = fs.readFileSync(path.join(f.repoRoot, '.git', 'index'));
    const treeBefore = snapshotTree(f.tempRoot);
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.deepEqual(snapshotTree(f.tempRoot), treeBefore);
    assert.deepEqual(fs.readFileSync(path.join(f.repoRoot, '.git', 'index')), indexBefore);
  } finally {
    cleanup(f);
  }
});

// --- Regression tests for the reviewed defects -------------------------------

test('rejects a cited path whose parent component is a symlink into the product memory tree', () => {
  const f = gitFixture();
  try {
    const memoryDirectory = path.join(f.repoRoot, 'artifacts', 'memory');
    fs.mkdirSync(memoryDirectory, { recursive: true });
    const secret = 'private product memory\n';
    fs.writeFileSync(path.join(memoryDirectory, 'project-context.md'), secret);
    fs.symlinkSync(path.join('artifacts', 'memory'), path.join(f.repoRoot, 'innocent-link'));

    writeGitPlan(f, {
      references: ['src/app.js', 'tests/app.test.js', 'innocent-link/project-context.md'],
      manifest: { schema: 'dirty-manifest-v1', files: [] },
    });

    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'FORBIDDEN_RELEVANT_PATH'));
    assert.ok(result.output.issues.some((issue) => issue.code === 'SYMLINKED_RELEVANT_PATH'));

    // No content of the forbidden product state may leave the checker.
    const manifestResult = manifestCommand(f);
    assert.equal(manifestResult.status, 2);
    assert.ok(!JSON.stringify(manifestResult.output).includes(sha256Text(secret)));
    assert.ok(!manifestResult.output.relevantPaths.some((entry) => entry.includes('innocent-link')));
  } finally {
    cleanup(f);
  }
});

test('rejects a cited path whose parent component is a symlink into a forbidden output tree', () => {
  const f = gitFixture();
  try {
    fs.mkdirSync(path.join(f.repoRoot, 'artifacts', 'output'), { recursive: true });
    fs.writeFileSync(path.join(f.repoRoot, 'artifacts', 'output', 'pipeline-state.json'), '{"phase":"trial"}\n');
    fs.symlinkSync(path.join('artifacts', 'output'), path.join(f.repoRoot, 'output-link'));

    writeGitPlan(f, {
      references: ['src/app.js', 'tests/app.test.js', 'output-link/pipeline-state.json'],
      manifest: { schema: 'dirty-manifest-v1', files: [] },
    });

    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'FORBIDDEN_RELEVANT_PATH'));
    assert.ok(result.output.issues.some((issue) => issue.code === 'SYMLINKED_RELEVANT_PATH'));
  } finally {
    cleanup(f);
  }
});

test('rejects a cited directory instead of hiding the changed files beneath it', () => {
  const f = gitFixture();
  try {
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'nested', 'child.js'), 'export const child = 2;\n');
    writeGitPlan(f, {
      references: ['src/nested', 'tests/app.test.js'],
      tasks: [gitTask({ source: 'tests/app.test.js' })],
      manifest: { schema: 'dirty-manifest-v1', files: [] },
    });

    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DIRECTORY_RELEVANT_PATH'));
  } finally {
    cleanup(f);
  }
});

test('rejects an approved plan whose body was edited and whose own digest was recomputed', () => {
  const f = fixture();
  try {
    writePlan(f);
    recordPlanApproval(f, planDigestHex(f));

    const edited = fs.readFileSync(f.planPath, 'utf8').replace(
      'This plan checks one bounded behavior without executing the change.',
      'This plan checks one bounded behavior and quietly widens its own scope.',
    );
    fs.writeFileSync(f.planPath, recomputeDocumentedDigest(edited));

    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'PLAN_APPROVAL_DIGEST_MISMATCH'));
    assert.equal(result.output.executionAuthorized, false);
    assert.equal(Object.hasOwn(result.output, 'gateGreen'), false);
  } finally {
    cleanup(f);
  }
});

test('rejects an authorization row that does not bind the plan digest', () => {
  const f = fixture();
  try {
    const unboundRow = `| ${AUTHORIZATION_RECORD} | AUTHORIZED | Repository owner | B1 — owner ruling for the B1 blocker | ${RUN_ID} / ${PLAN_ID} / ${PLAN_REVISION} / bind digest at authorization | ${AUTHORIZATION_EVIDENCE} | recorded-claim / not-cryptographically-verified |`;
    writePlan(f, {
      decisionRows: decisionRowsWith('B1', { status: DISPOSITION, evidence: CLAIM_EVIDENCE }),
      authorizationRow: unboundRow,
      tasks: [defaultTask({ status: '[READY]' })],
    });
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE);

    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'AUTHORIZATION_IDENTITY_MISSING_DIGEST'));
  } finally {
    cleanup(f);
  }
});

test('rejects a ready task that a decision row names but whose Depends on omits', () => {
  const f = fixture();
  try {
    const rows = decisions().map(([id, question, options]) => {
      const dependent = id === 'B1' ? 'T001 waits for this ruling' : 'Work requiring the owner ruling remains blocked';
      return `| \`${id}\` | ${question} | ${options} | [OPEN] | Repository owner | ${dependent} | OPEN — no disposition recorded |`;
    });
    writePlan(f, { decisionRows: rows, tasks: [defaultTask({ status: '[READY]', depends: '—' })] });

    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DECISION_TASK_DEPENDENCY_MISMATCH'));
  } finally {
    cleanup(f);
  }
});

test('rejects a task that depends on an open decision without being marked blocked', () => {
  const f = fixture();
  try {
    writePlan(f, { tasks: [defaultTask({ status: '[PLANNED]' })] });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'OPEN_DECISION_TASK_NOT_BLOCKED'));
  } finally {
    cleanup(f);
  }
});

test('checks every decision in a dependency list instead of only the first one', () => {
  for (const dependencyList of ['B10, B1', 'B1, B10']) {
    const f = fixture();
    try {
      const rows = decisions().map(([id, question, options]) => {
        if (id !== 'B10') {
          return `| \`${id}\` | ${question} | ${options} | [OPEN] | Repository owner | Work requiring the owner ruling remains blocked | OPEN — no disposition recorded |`;
        }
        return `| \`${id}\` | ${question} | ${options} | retain | Repository owner | Work requiring the owner ruling remains blocked | ${CLAIM_EVIDENCE_B10} |`;
      });
      writePlan(f, {
        decisionRows: rows,
        authorizationRow: recordedAuthorizationRow('B10', AUTHORIZATION_EVIDENCE),
        tasks: [defaultTask({ status: '[READY]', depends: dependencyList })],
      });
      recordDispositionClaim(f, 'B10', 'retain', CLAIM_EVIDENCE_B10);

      const result = check(f);
      assert.equal(result.status, 2, `${dependencyList}: ${JSON.stringify(result.output)}`);
      assert.ok(
        result.output.issues.some((issue) => issue.code === 'OPEN_DECISION_TASK_EXECUTABLE'),
        `${dependencyList}: ${JSON.stringify(result.output.issues)}`,
      );
    } finally {
      cleanup(f);
    }
  }
});

test('treats a rejected authorization as no authorization', () => {
  const f = fixture();
  try {
    writePlan(f, {
      decisionRows: decisionRowsWith('B1', { status: DISPOSITION, evidence: CLAIM_EVIDENCE }),
      authorizationRow: recordedAuthorizationRow('B1', AUTHORIZATION_EVIDENCE, 'REJECTED'),
      tasks: [defaultTask({ status: '[READY]' })],
    });
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE);

    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'INVALID_AUTHORIZATION_STATUS'));
    assert.ok(result.output.issues.some((issue) => issue.code === 'INCOMPLETE_DECISION_RESOLUTION'));
    assert.ok(result.output.issues.some((issue) => issue.code === 'OPEN_DECISION_TASK_EXECUTABLE'));
  } finally {
    cleanup(f);
  }
});

test('treats a pending authorization as no authorization', () => {
  const f = fixture();
  try {
    writePlan(f, {
      decisionRows: decisionRowsWith('B1', { status: DISPOSITION, evidence: CLAIM_EVIDENCE }),
      authorizationRow: recordedAuthorizationRow('B1', AUTHORIZATION_EVIDENCE, 'PENDING - awaiting owner'),
      tasks: [defaultTask({ status: '[READY]' })],
    });
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE);

    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'INVALID_AUTHORIZATION_STATUS'));
    assert.ok(result.output.issues.some((issue) => issue.code === 'OPEN_DECISION_TASK_EXECUTABLE'));
  } finally {
    cleanup(f);
  }
});

test('rejects a findings source link that is prose only', () => {
  const f = fixture();
  try {
    writePlan(f, { references: ['the inherited claim from the maintenance brief'] });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'MISSING_PATH_CITATION'));
  } finally {
    cleanup(f);
  }
});

test('requires the dirtyManifest identity field even on a clean tree', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, { status: 'clean', manifest: OMIT_FIELD });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) =>
      issue.code === 'MISSING_IDENTITY' && issue.message.includes('dirtyManifest')));
  } finally {
    cleanup(f);
  }
});

test('rejects an approval recorded in the same session as the plan draft', () => {
  const f = fixture();
  try {
    writePlan(f);
    recordPlanApproval(f, planDigestHex(f), 'session-one', 'session-one');

    const result = check(f);
    assert.equal(result.status, 2);
    const issue = result.output.issues.find((entry) => entry.code === 'SEPARATION_OF_DUTIES_VIOLATION');
    assert.ok(issue, JSON.stringify(result.output.issues));
    assert.match(issue.message, /separation of duties on the recorded claim chain, not identity authentication/);
  } finally {
    cleanup(f);
  }
});

test('rejects an owner decision disposition recorded in the same session as the plan draft', () => {
  const f = fixture();
  try {
    writePlan(f);
    recordPlanDraft(f, planDigestHex(f), 'session-draft');
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE, 'session-draft');

    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'SEPARATION_OF_DUTIES_VIOLATION'));
  } finally {
    cleanup(f);
  }
});

test('accepts an approval and a disposition recorded in sessions other than the draft session', () => {
  const f = fixture();
  try {
    writePlan(f);
    recordPlanApproval(f, planDigestHex(f), 'session-draft', 'session-approval');
    recordDispositionClaim(f, 'B1', DISPOSITION, CLAIM_EVIDENCE, 'session-owner');

    const result = check(f);
    assert.ok(!result.output.issues.some((issue) => issue.code === 'SEPARATION_OF_DUTIES_VIOLATION'),
      JSON.stringify(result.output.issues));
  } finally {
    cleanup(f);
  }
});

test('the manifest command reports the digest the plan already records', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, { manifest: { schema: 'dirty-manifest-v1', files: [] } });
    const result = manifestCommand(f);
    assert.equal(result.output.planDigest, `sha256:${planDigestHex(f)}`);
  } finally {
    cleanup(f);
  }
});

test('the manifest command keeps the digest of a plan that binds its authorization row', () => {
  const f = fixture();
  try {
    writePlan(f, { authorizationRow: recordedAuthorizationRow('B1', AUTHORIZATION_EVIDENCE) });
    const result = manifestCommand(f);
    assert.equal(result.output.planDigest, `sha256:${planDigestHex(f)}`);
  } finally {
    cleanup(f);
  }
});

// --- Regression tests for the dot-tree citation duplication ------------------
//
// A dot-tree citation such as ".agents/scripts/foo.js" used to be read twice:
// once correctly and once with the leading dot dropped, because the file
// reader allowed a leading dot and the directory reader did not. The dotless
// reading names a path that does not exist on disk, so a plan that cited the
// agent tree correctly was reported as citing an unresolvable file. A plan
// author worked around it by writing a closing period after the path, which
// corrupts the citation and must not be needed.

const { extractPathTokens } = require(SOURCE);

// The measured strings, exactly as they were reported.
const DOT_TREE_FILE_CITATION = 'see `.agents/scripts/foo.js:44`';
const DOT_TREE_FILE_PATH = '.agents/scripts/foo.js';
const DOT_TREE_DOC_CITATION = '.agents/TROUBLESHOOTING.md';
const DOT_TREE_DOC_PATH = '.agents/TROUBLESHOOTING.md';
const DOT_TREE_DIRECTORY_CITATION = '.agents/scripts/';
const DOT_TREE_DIRECTORY_PATH = '.agents/scripts';

test('reads a dot-tree file citation as exactly one token with the leading dot intact', () => {
  assert.deepEqual(extractPathTokens(DOT_TREE_FILE_CITATION), [DOT_TREE_FILE_PATH]);
  assert.deepEqual(extractPathTokens(DOT_TREE_DOC_CITATION), [DOT_TREE_DOC_PATH]);
});

test('reads a dot-tree directory citation as exactly one token with the leading dot intact', () => {
  assert.deepEqual(extractPathTokens(DOT_TREE_DIRECTORY_CITATION), [DOT_TREE_DIRECTORY_PATH]);
});

test('reads two different paths written in the same cell as two tokens', () => {
  assert.deepEqual(
    extractPathTokens(`${DOT_TREE_FILE_PATH} and ${DOT_TREE_DOC_PATH}`),
    [DOT_TREE_FILE_PATH, DOT_TREE_DOC_PATH],
  );
  // "app.js" is a strict string suffix of "src/app.js", but it is a different
  // file. Dropping it would let a changed root-level "app.js" escape the
  // dirty manifest, so a suffix is only collapsed when it is the same match
  // read twice, never when it is a separate path written in the same cell.
  assert.deepEqual(
    extractPathTokens('src/app.js and app.js'),
    ['src/app.js', 'app.js'],
  );
});

test('never reads a token that is a strict suffix of another read token', () => {
  for (const text of [DOT_TREE_FILE_CITATION, DOT_TREE_DOC_CITATION, DOT_TREE_DIRECTORY_CITATION]) {
    const tokens = extractPathTokens(text);
    for (const token of tokens) {
      assert.ok(
        !tokens.some((other) => other !== token && other.endsWith(token)),
        `${text} read the dot-stripped duplicate ${token}`,
      );
    }
  }
});

test('keeps prose dotted words, abbreviations, and placeholder fragments out of the token set', () => {
  assert.deepEqual(extractPathTokens('e.g'), ['e.g']);
  assert.deepEqual(extractPathTokens('3.14'), []);
  assert.deepEqual(extractPathTokens('and/or'), ['and/or']);
  assert.deepEqual(extractPathTokens('<runId>/notes.md'), []);
  assert.deepEqual(
    extractPathTokens('src/app.js — see e.g. the revision note under <runId>/notes.md'),
    ['src/app.js', 'e.g'],
  );
});

test('accepts a plan that cites a dot-tree file path without a closing period', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, {
      status: 'clean',
      manifest: { schema: 'dirty-manifest-v1', files: [] },
      references: [`.agents/scripts/maintenance_plan_check.js`, 'tests/app.test.js'],
      testReference: '.agents/scripts/maintenance_plan_check.js — rejects a conditional result',
    });
    const result = check(f);
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.deepEqual(result.output.issues, []);
  } finally {
    cleanup(f);
  }
});

test('names the dot-tree path the author wrote when a cited dot-tree directory is rejected', () => {
  const f = gitFixture();
  try {
    writeGitPlan(f, {
      status: 'clean',
      manifest: { schema: 'dirty-manifest-v1', files: [] },
      references: ['.agents/scripts', 'tests/app.test.js'],
    });
    const result = check(f);
    assert.equal(result.status, 2);
    const issue = result.output.issues.find((entry) => entry.code === 'DIRECTORY_RELEVANT_PATH');
    assert.ok(issue, JSON.stringify(result.output.issues));
    assert.ok(issue.message.includes('.agents/scripts'), issue.message);
    assert.ok(!issue.message.includes('relevant path agents/scripts'), issue.message);
  } finally {
    cleanup(f);
  }
});

