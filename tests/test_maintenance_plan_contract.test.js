'use strict';

/**
 * Contract test for the maintenance plan record.
 *
 * Every plan instance is built from the real template shape
 * (.agents/templates/planning/maintenance-plan-template.md) inside a
 * temporary Git repository with a temporary external state root, then checked
 * with the real maintenance_plan_check.js commands. Nothing here touches the
 * product checkout, product state, or the product pipeline.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(REPO_ROOT, '.agents', 'scripts', 'maintenance_plan_check.js');
const STATE_SOURCE = path.join(REPO_ROOT, '.agents', 'scripts', 'maintenance_state.js');
const TEMPLATE = path.join(REPO_ROOT, '.agents', 'templates', 'planning', 'maintenance-plan-template.md');

const RUN_ID = 'maintenance-plan-contract-run';
const PLAN_ID = 'MP-CONTRACT';
const PLAN_REVISION = '1';
const EM_DASH = '\u2014';
const EN_DASH = '\u2013';

const RUN_ROOT_INPUTS = [
  'maintenance-bootstrap-plan.md',
  'maintenance-brief.md',
  'maintenance-spec.md',
  'maintenance-work-items.md',
  'maintenance-plan-contract.md',
];

// Mirrors the checker's canonicalization rule: the digest covers the exact
// plan bytes with the planDigest cell replaced by the literal marker.
const PLAN_DIGEST_FIELD = /^([ \t]*\|[ \t]*`?planDigest`?[ \t]*\|[ \t]*)([^|\r\n]*?)([ \t]*\|[^\r\n]*)$/m;

function canonicalPlanBytes(source) {
  return source.replace(PLAN_DIGEST_FIELD, (_line, prefix, _value, suffix) => `${prefix}[DIGEST OMITTED]${suffix}`);
}

function computePlanDigest(source) {
  return crypto.createHash('sha256').update(canonicalPlanBytes(source), 'utf8').digest('hex');
}

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

function fixture() {
  const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-plan-contract-')));
  const repoRoot = path.join(tempRoot, 'repo');
  const scriptsDir = path.join(repoRoot, '.agents', 'scripts');
  const stateRoot = path.join(tempRoot, 'state');
  const artifactRoot = path.join(repoRoot, 'artifacts', 'output', 'maintenance', RUN_ID);
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(stateRoot, { mode: 0o700 });
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.copyFileSync(SOURCE, path.join(scriptsDir, 'maintenance_plan_check.js'));
  fs.copyFileSync(STATE_SOURCE, path.join(scriptsDir, 'maintenance_state.js'));

  fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'src', 'app.js'), 'export const value = 1;\n');
  fs.writeFileSync(path.join(repoRoot, 'tests', 'app.test.js'), "test('value', () => {});\n");
  for (const input of RUN_ROOT_INPUTS) {
    fs.writeFileSync(path.join(artifactRoot, input), `# ${input}\n\nFR-001 inherited claim.\n`);
  }

  git(repoRoot, ['init', '--quiet']);
  git(repoRoot, ['config', 'user.email', 'maintenance@example.test']);
  git(repoRoot, ['config', 'user.name', 'Maintenance Test']);
  git(repoRoot, ['config', 'commit.gpgsign', 'false']);
  git(repoRoot, ['config', 'core.autocrlf', 'false']);
  git(repoRoot, ['config', 'core.fileMode', 'true']);
  git(repoRoot, ['add', '--all']);
  git(repoRoot, ['commit', '--quiet', '-m', 'base']);

  return {
    tempRoot,
    repoRoot: fs.realpathSync(repoRoot),
    stateRoot: fs.realpathSync(stateRoot),
    artifactRoot,
    script: path.join(scriptsDir, 'maintenance_plan_check.js'),
    planPath: path.join(artifactRoot, `maintenance-plan-${PLAN_ID}-r${PLAN_REVISION}.md`),
    head: git(repoRoot, ['rev-parse', 'HEAD']).trim(),
    branch: git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']).trim(),
  };
}

function cleanup(f) {
  fs.rmSync(f.tempRoot, { recursive: true, force: true });
}

function ownerDecisionRows() {
  return [
    '| `B1` | Choose whether publication is blocked by all known findings or only new findings. | all known findings / new findings only | `[OPEN]` | Repository owner | Publication policy work stays blocked | OPEN ' + EM_DASH + ' no disposition recorded |',
    '| `O-4` | Record a human disposition for each required baseline-history entry. | per-entry owner disposition | `[OPEN]` | Repository owner | Baseline history stays blocked | OPEN ' + EM_DASH + ' no disposition recorded |',
    '| `B10` | Choose retain, reshape, or remove for the named skill family. | retain / reshape / remove | `[OPEN]` | Repository owner | Skill family work stays blocked | OPEN ' + EM_DASH + ' no disposition recorded |',
    '| `credential-residual` | Decide whether the measured residual miss is acceptable. | accept / reject | `[OPEN]` | Repository owner | Residual acceptance stays blocked | OPEN ' + EM_DASH + ' no disposition recorded |',
  ];
}

function renderPlan(f, {
  planRevision = PLAN_REVISION,
  baseRevision = f.head,
  headRevision = f.head,
  treeStatus = 'clean',
  manifest = { schema: 'dirty-manifest-v1', files: [] },
  findingsSource = 'src/app.js:12',
  findingsTest = 'tests/app.test.js ' + EM_DASH + ' rejects a conditional result',
  findingsEvidence = 'src/app.js:12',
  taskStatus = '[BLOCKED]',
  taskDepends = 'B1',
  createdAt = '2026-10-20T00:00:00.000Z',
  author = 'developer',
  recordStatus = 'DRAFT',
  scopeInScope = 'Verify one bounded behavior check recorded against the run inputs.',
} = {}) {
  const identity = `repoRoot=${f.repoRoot}; worktreePath=${f.repoRoot}; worktreeId=contract-worktree-001;`
    + ` branch=${f.branch}; HEAD=${headRevision}; status=${treeStatus}`;
  const manifestJson = JSON.stringify(manifest);
  const runRootRows = [
    ['Bootstrap plan', 'maintenance-bootstrap-plan.md', 'CAP-01, FR-001', 'checked', 'inherited claims'],
    ['Maintenance brief', 'maintenance-brief.md', 'FR-001, NFR-01', 'checked', 'inherited claims'],
    ['Maintenance spec', 'maintenance-spec.md', 'MS-01, FR-001', 'checked', 'inherited claims'],
    ['Maintenance work items', 'maintenance-work-items.md', 'US-001, AC-U1', 'checked', 'inherited claims'],
    ['Plan contract', 'maintenance-plan-contract.md', 'required fields', 'draft', 'do not infer approval'],
  ].map(([name, runRootPath, ids, result, limits]) =>
    `| ${name} | \`${runRootPath}\` | ${ids} | ${result} | ${limits} |`).join('\n');

  return `# Maintenance Plan ${EM_DASH} Contract fixture

This plan verifies one bounded maintenance behavior without executing any code change.

## Record identity

| Field | Value |
|---|---|
| \`runId\` | \`${RUN_ID}\` |
| \`planId\` | \`${PLAN_ID}\` |
| \`planRevision\` | \`${planRevision}\` |
| \`planDigest\` | sha256:__DIGEST__ |
| \`baseRevision\` | ${baseRevision} |
| \`workingTreeIdentity\` | ${identity} |
| \`dirtyManifest\` | \`${manifestJson}\` |
| \`externalStateRoot\` | ${f.stateRoot} |
| \`repoArtifactRoot\` | artifacts/output/maintenance/${RUN_ID}/ |
| \`createdAt\` | ${createdAt} |
| \`author\` | ${author} |
| \`recordStatus\` | \`${recordStatus}\` |

**Digest rule:** compute SHA-256 over the exact plan bytes after replacing the \`planDigest\` field value with the literal \`[DIGEST OMITTED]\`. Record this canonicalization rule with the digest. Any other content change requires a new revision and digest. The \`dirtyManifest\` field is part of the digested bytes, so finalize the manifest first and then recompute the digest.

**Revision rule:** keep this file immutable after review. Save a changed plan as a new \`maintenance-plan-{planId}-r{revision}.md\` file beneath the same run root; stale review or authorization records do not transfer to the new digest.

## Dirty manifest

\`dirtyManifest\` is the machine-readable form of the working-tree fingerprints. It is one JSON object on a single line in the \`dirtyManifest\` identity field:

\`\`\`json
${JSON.stringify(manifest, null, 2)}
\`\`\`

**Canonicalization rules**

- \`schema\` is exactly \`dirty-manifest-v1\`; \`files\` is an array; every entry carries exactly \`status\`, \`path\`, \`kind\`, \`mode\`, and \`contentSha256\`.
- Entries are sorted by normalized path, then by status.

**Relevant-path set**

- The relevant set comes only from the plan's exact source, test, and input references.
- The plan file itself is excluded, so the manifest never describes its own bytes.

## Scope

- **In scope:** ${scopeInScope}
- **Out of scope:** Execute changes, claim gate-green, or resolve an owner decision.
- **Assumptions:** The run inputs in the reconciliation table are the source of scope.
- **Constraints:** Use only the run-specific maintenance artifact root and the external state root.
- **Execution boundary:** This artifact is a proposal only; execution needs separate repository-owner authorization.

## Inputs and reconciliation

| Input | Run-root path | IDs/local links checked | Result | Limitations / inherited references |
|---|---|---|---|---|
${runRootRows}

**ID and link check:** FR-001, US-001, and AC-U1 are defined in the run inputs and referenced by the single task row.

**Repository source references (read-only):** \`src/app.js:12\` and \`tests/app.test.js:7\` were opened at revision ${headRevision}; no other repository path was opened.

**External/web/inherited references:** NOT REOPENED ${EM_DASH} inherited/unverified.

## Findings

| Finding ID | Claim and provenance | Current status | Owner | Decision owner | Exact source link(s) | Test/verification reference(s) | Evidence reference(s) | Revision covered | Blocked by |
|---|---|---|---|---|---|---|---|---|---|
| F001 | Inherited claim from the maintenance brief | [OPEN] | developer | Repository owner | ${findingsSource} | ${findingsTest} | ${findingsEvidence} | ${headRevision} | B1; T001 |

## Owner decisions ${EM_DASH} blockers, not estimated tasks

| Decision ID | Exact question | Options shown without selection | Status | Decision owner | Dependent task/work or gate | Owner evidence |
|---|---|---|---|---|---|---|
${ownerDecisionRows().join('\n')}

Other owner decisions: none.

## Task list

| Task ID | Work item and estimate (1${EN_DASH}4h) | First action | Done evidence | Status | Owner | Decision owner | Requirement/story/AC IDs | Exact source link(s) | Revert-proof test or manual evidence | Depends on | Parallel with |
|---|---|---|---|---|---|---|---|---|---|---|---|
| \`T001\` | Add one bounded behavior check ${EM_DASH} 2h | Read src/app.js:12 | A passing targeted behavior-test result | ${taskStatus} | developer | Repository owner | FR-001, US-001, AC-U1 | src/app.js:12 | CODE: test file: tests/app.test.js; test name: rejects a conditional result; command: node --test tests/app.test.js; revert proof: the behavior test fails when the fix is reverted | ${taskDepends} | ${EM_DASH} |

## Dependency graph

\`\`\`mermaid
flowchart LR
    D_B1["B1 [OPEN]"] -. blocks .-> T001["T001"]
\`\`\`

## Parallelism

| Parallel group | Tasks | Why independent | Coordination / shared-resource check |
|---|---|---|---|
| ${EM_DASH} | ${EM_DASH} | This draft holds one bounded task | ${EM_DASH} |

No parallel tasks, with reason: this draft holds one bounded task that waits on an open owner decision.

## Risk register

| Risk | Likelihood | Impact | Mitigation | Owner | Trigger/evidence |
|---|---|---|---|---|---|
| Source or test reference is stale | Medium | High | Keep the recorded revision and digest bound to this file | developer | src/app.js:12 |
| An owner decision remains open | High | High | Keep dependent work blocked | Repository owner | B1, O-4, B10, credential-residual |

## Technical review and repository-owner execution authorization

| Record | Status | Required reviewer/owner | Scope / task IDs | Exact plan revision and digest | Evidence reference | Claim status |
|---|---|---|---|---|---|---|
| Technical plan review | PENDING | @tech-lead | Scope, sources, estimates, verification, dependency graph | PENDING ${EM_DASH} ${RUN_ID} / ${PLAN_ID} / ${planRevision} / bind digest at review | OPEN | not recorded |
| Repository-owner execution authorization | PENDING | Repository owner | No tasks authorized in this draft | PENDING ${EM_DASH} ${RUN_ID} / ${PLAN_ID} / ${planRevision} / bind digest at authorization | OPEN | not recorded |

## T008 plan-check prerequisite

- Checker: \`maintenance_plan_check.js\` ${EM_DASH} implemented by T008.
- This record is a test fixture. The check result is asserted by
  tests/test_maintenance_plan_contract.test.js instead of being transcribed here.

## Maintenance state evidence

| Event | Purpose | Evidence reference | Claim status |
|---|---|---|---|
| \`plan_drafted\` | Bind the draft artifact path, plan ID, revision, digest, and \`DRAFT\` status. | external maintenance state event | \`recorded-claim\` |
`;
}

function writePlan(f, options = {}) {
  const content = renderPlan(f, options);
  const digest = computePlanDigest(content);
  fs.writeFileSync(f.planPath, content.replace('sha256:__DIGEST__', `sha256:${digest}`));
  return fs.readFileSync(f.planPath, 'utf8');
}

function runChecker(f, command) {
  const before = snapshotTree(f.tempRoot);
  const result = spawnSync(process.execPath, [
    f.script,
    command,
    '--scope', 'maintenance',
    '--repo-root', f.repoRoot,
    '--state-root', f.stateRoot,
    '--run-id', RUN_ID,
    '--plan', f.planPath,
    '--json',
  ], { cwd: f.tempRoot, encoding: 'utf8' });
  assert.deepEqual(snapshotTree(f.tempRoot), before, 'the plan checker must not write to the temporary repo or state root');
  assert.equal(result.stderr, '', result.stderr);
  return { ...result, output: JSON.parse(result.stdout) };
}

function check(f) {
  return runChecker(f, 'check');
}

function manifestCommand(f) {
  return runChecker(f, 'manifest');
}

function relevantPathsFor(f) {
  return [
    ...RUN_ROOT_INPUTS.map((input) => `artifacts/output/maintenance/${RUN_ID}/${input}`),
    'src/app.js',
    'tests/app.test.js',
  ].sort();
}

test('the built plan carries the real maintenance-plan template shape', () => {
  const f = fixture();
  try {
    const template = fs.readFileSync(TEMPLATE, 'utf8');
    const plan = renderPlan(f, {});
    const headings = (text) => [...text.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
    const templateHeadings = headings(template);
    const planHeadings = headings(plan);
    assert.ok(templateHeadings.length > 0);
    for (const heading of templateHeadings) {
      assert.ok(planHeadings.includes(heading), `the plan must carry the template section: ${heading}`);
    }

    const identityOf = (text) => text.slice(text.indexOf('## Record identity'), text.indexOf('## Dirty manifest'));
    const templateFields = [...identityOf(template).matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((match) => match[1]);
    const planIdentity = identityOf(plan);
    assert.ok(templateFields.length > 0);
    for (const field of templateFields) {
      assert.ok(planIdentity.includes(`\`${field}\``), `the plan must carry the template identity field: ${field}`);
    }
  } finally {
    cleanup(f);
  }
});

test('the check command accepts the manifest-backed plan as a valid DRAFT', () => {
  const f = fixture();
  try {
    writePlan(f, { manifest: { schema: 'dirty-manifest-v1', files: [] } });
    const manifestResult = manifestCommand(f);
    assert.equal(manifestResult.status, 0, JSON.stringify(manifestResult.output));
    assert.equal(manifestResult.output.valid, true, JSON.stringify(manifestResult.output.issues));
    assert.deepEqual(manifestResult.output.relevantPaths, relevantPathsFor(f));
    assert.deepEqual(manifestResult.output.manifest.files, []);

    writePlan(f, { manifest: manifestResult.output.manifest });
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

test('the check fails when the dirty manifest is stale after a relevant file changes', () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), 'export const value = 2;\n');
    writePlan(f, { manifest: { schema: 'dirty-manifest-v1', files: [] }, treeStatus: 'dirty' });
    const manifestResult = manifestCommand(f);
    assert.equal(manifestResult.status, 0, JSON.stringify(manifestResult.output));
    assert.deepEqual(manifestResult.output.manifest.files.map((entry) => `${entry.path}:${entry.status}`), [
      'src/app.js:modified',
    ]);

    writePlan(f, { manifest: manifestResult.output.manifest, treeStatus: 'dirty' });
    assert.equal(check(f).status, 0, 'the recorded manifest must match the working tree it describes');

    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), 'export const value = 3;\n');
    const result = check(f);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DIRTY_MANIFEST_MISMATCH'),
      JSON.stringify(result.output.issues));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('a finding that cites a missing test reference fails the check', () => {
  const f = fixture();
  try {
    writePlan(f, {
      findingsTest: 'tests/missing-behavior.test.js ' + EM_DASH + ' rejects a conditional result',
    });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.equal(result.output.planStatus, 'invalid');
    assert.ok(result.output.issues.some((issue) =>
      issue.code === 'UNRESOLVABLE_RELEVANT_PATH' &&
      issue.message.includes('tests/missing-behavior.test.js')),
    JSON.stringify(result.output.issues));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('a task that depends on an open owner decision cannot be executable', () => {
  const f = fixture();
  try {
    writePlan(f, { taskStatus: '[READY]' });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'OPEN_DECISION_TASK_EXECUTABLE'),
      JSON.stringify(result.output.issues));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('the check fails when the plan bytes change without a new digest', () => {
  const f = fixture();
  try {
    writePlan(f, {});
    const recorded = fs.readFileSync(f.planPath, 'utf8');
    fs.writeFileSync(f.planPath, recorded.replace(
      'This plan verifies one bounded maintenance behavior',
      'This plan verifies a different bounded maintenance behavior',
    ));
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'PLAN_DIGEST_MISMATCH'),
      JSON.stringify(result.output.issues));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('the check fails when the recorded revision drifts from the canonical revision file', () => {
  const f = fixture();
  try {
    writePlan(f, { planRevision: '2' });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'PLAN_PATH_MISMATCH'),
      JSON.stringify(result.output.issues));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('the check fails when the recorded base revision drifts from the recorded HEAD', () => {
  const f = fixture();
  try {
    writePlan(f, { baseRevision: 'b'.repeat(40) });
    const result = check(f);
    assert.equal(result.status, 2);
    assert.ok(result.output.issues.some((issue) => issue.code === 'INVALID_WORKTREE_IDENTITY'),
      JSON.stringify(result.output.issues));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});

test('a post-review source change invalidates the recorded revision', () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.repoRoot, 'src', 'app.js'), 'export const value = 2;\n');
    writePlan(f, { manifest: { schema: 'dirty-manifest-v1', files: [] }, treeStatus: 'dirty' });
    const manifestResult = manifestCommand(f);
    writePlan(f, { manifest: manifestResult.output.manifest, treeStatus: 'dirty' });
    assert.equal(check(f).status, 0, 'the reviewed plan must pass before the post-review change');

    git(f.repoRoot, ['add', '--all']);
    git(f.repoRoot, ['commit', '--quiet', '-m', 'post-review source change']);
    const result = check(f);
    assert.equal(result.status, 2);
    assert.equal(result.output.valid, false);
    assert.ok(result.output.issues.some((issue) => issue.code === 'DIRTY_MANIFEST_ENTRY_EXTRA'),
      JSON.stringify(result.output.issues));
    assert.equal(result.output.executionAuthorized, false);
  } finally {
    cleanup(f);
  }
});
