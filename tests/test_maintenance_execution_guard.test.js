'use strict';

/**
 * Filesystem guard for the whole maintenance execution path.
 *
 * The guard is preloaded into every maintenance child process. It denies
 * reads and writes to the real product protected roots by path string,
 * without opening the protected paths, and it blocks child-process launches
 * so no helper can escape the guard.
 *
 * Two narrow, explicit exceptions exist and are covered by the tests below:
 *
 *   1. `stat`/`lstat` on a directory that is an ancestor of the one
 *      allowlisted run subtree. The run's own artifact-path validation stats
 *      those directories; every read, listing, and write stays denied.
 *   2. A child program named in MAINTENANCE_ALLOWED_CHILD_COMMANDS. The plan
 *      checker needs one read-only Git fingerprint; every other program is
 *      blocked.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REAL_REPO_ROOT = fs.realpathSync(path.resolve(__dirname, '..'));
const SCRIPTS_DIR = path.join(REAL_REPO_ROOT, '.agents', 'scripts');
const SESSION_SOURCE = path.join(SCRIPTS_DIR, 'maintenance_session.js');
const STATE_SOURCE = path.join(SCRIPTS_DIR, 'maintenance_state.js');
const CHECK_SOURCE = path.join(SCRIPTS_DIR, 'maintenance_plan_check.js');

const RUN_ID = 'maintenance-guard-run';
const PLAN_ID = 'MP-GUARD';
const SESSION_ID = 'maintenance-guard-session';
const AGENT = 'developer';
const EM_DASH = '\u2014';
const EN_DASH = '\u2013';

const PLAN_DIGEST_FIELD = /^([ \t]*\|[ \t]*`?planDigest`?[ \t]*\|[ \t]*)([^|\r\n]*?)([ \t]*\|[^\r\n]*)$/m;

function computePlanDigest(source) {
  const canonical = source.replace(
    PLAN_DIGEST_FIELD,
    (_line, prefix, _value, suffix) => `${prefix}[DIGEST OMITTED]${suffix}`,
  );
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
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

function treeDiff(before, after) {
  const beforeMap = new Map(before.map((entry) => [entry.relative, entry]));
  const afterMap = new Map(after.map((entry) => [entry.relative, entry]));
  const added = [];
  const changed = [];
  const removed = [];
  for (const [relative, entry] of afterMap) {
    if (!beforeMap.has(relative)) added.push(relative);
    else if (JSON.stringify(beforeMap.get(relative)) !== JSON.stringify(entry)) changed.push(relative);
  }
  for (const relative of beforeMap.keys()) {
    if (!afterMap.has(relative)) removed.push(relative);
  }
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() };
}

function createGuard(f) {
  const guardPath = path.join(f.tempRoot, 'maintenance-fs-guard.cjs');
  const source = [
    "'use strict';",
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    "const childProcess = require('node:child_process');",
    "const { fileURLToPath } = require('node:url');",
    'const protectedRoots = JSON.parse(process.env.MAINTENANCE_PROTECTED_ROOTS).map((root) => path.resolve(root));',
    'const allowedArtifactRoots = JSON.parse(process.env.MAINTENANCE_ALLOWED_ARTIFACT_ROOTS || "[]").map((root) => path.resolve(root));',
    'const allowedChildCommands = new Set(JSON.parse(process.env.MAINTENANCE_ALLOWED_CHILD_COMMANDS || "[]"));',
    'const originalRealpathSync = fs.realpathSync.native || fs.realpathSync;',
    '// Only directory inspection is allowed on an ancestor of an allowlisted run',
    '// subtree, because the run artifact-path validation stats those directories.',
    'const INSPECTION_OPERATIONS = new Set(["lstat", "lstatSync", "stat", "statSync"]);',
    'const pathArguments = {',
    '  access: [0], accessSync: [0], appendFile: [0], appendFileSync: [0],',
    '  chmod: [0], chmodSync: [0], chown: [0], chownSync: [0],',
    '  copyFile: [0, 1], copyFileSync: [0, 1], cp: [0, 1], cpSync: [0, 1],',
    '  createReadStream: [0], createWriteStream: [0], exists: [0], existsSync: [0],',
    '  lchmod: [0], lchmodSync: [0], lchown: [0], lchownSync: [0], link: [0, 1], linkSync: [0, 1],',
    '  glob: [0], globSync: [0], lstat: [0], lstatSync: [0], lutimes: [0], lutimesSync: [0], mkdir: [0], mkdirSync: [0],',
    '  mkdtemp: [0], mkdtempSync: [0], open: [0], openSync: [0], openAsBlob: [0], opendir: [0], opendirSync: [0],',
    '  readFile: [0], readFileSync: [0], readdir: [0], readdirSync: [0], readlink: [0], readlinkSync: [0],',
    '  realpath: [0], realpathSync: [0], rename: [0, 1], renameSync: [0, 1],',
    '  rm: [0], rmSync: [0], rmdir: [0], rmdirSync: [0], stat: [0], statSync: [0], statfs: [0], statfsSync: [0],',
    '  symlink: [0, 1], symlinkSync: [0, 1], truncate: [0], truncateSync: [0],',
    '  unlink: [0], unlinkSync: [0], utimes: [0], utimesSync: [0], watch: [0], watchFile: [0],',
    '  writeFile: [0], writeFileSync: [0],',
    '};',
    'function isWithin(parent, candidate) {',
    '  const relative = path.relative(parent, candidate);',
    "  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));",
    '}',
    'function resolveCandidate(candidate) {',
    '  const missing = [];',
    '  let ancestor = candidate;',
    '  while (true) {',
    '    try {',
    '      return path.resolve(originalRealpathSync(ancestor), ...missing);',
    '    } catch (error) {',
    "      if (!error || (error.code !== 'ENOENT' && error.code !== 'ENOTDIR')) throw error;",
    '      const parent = path.dirname(ancestor);',
    '      if (parent === ancestor) return candidate;',
    '      missing.unshift(path.basename(ancestor));',
    '      ancestor = parent;',
    '    }',
    '  }',
    '}',
    'function isProtected(candidate) {',
    '  return protectedRoots.some((root) => {',
    '    if (!isWithin(root, candidate)) return false;',
    '    const isAllowedDescendant = allowedArtifactRoots.some((allowedRoot) =>',
    '      isWithin(allowedRoot, candidate) && isWithin(root, allowedRoot) && !isWithin(allowedRoot, root));',
    '    return !isAllowedDescendant;',
    '  });',
    '}',
    'function isAllowlistedAncestor(candidate, operation) {',
    '  if (!INSPECTION_OPERATIONS.has(operation)) return false;',
    '  return allowedArtifactRoots.some((allowedRoot) =>',
    '    candidate !== allowedRoot && isWithin(candidate, allowedRoot));',
    '}',
    'function block(operation) {',
    "  process.stderr.write('MAINTENANCE_FS_GUARD_BLOCKED:' + operation + '\\n');",
    "  const error = new Error('Blocked protected product path');",
    "  error.code = 'EACCES';",
    '  throw error;',
    '}',
    'function blockChild(method) {',
    "  process.stderr.write('MAINTENANCE_CHILD_GUARD_BLOCKED:' + method + '\\n');",
    "  const error = new Error('Blocked child-process launch');",
    "  error.code = 'EACCES';",
    '  throw error;',
    '}',
    'function checkPath(value, operation) {',
    '  let valuePath;',
    "  if (typeof value === 'string') valuePath = value;",
    "  else if (Buffer.isBuffer(value)) valuePath = value.toString();",
    '  else if (value instanceof URL) valuePath = fileURLToPath(value);',
    '  else return;',
    '  const candidate = path.resolve(valuePath);',
    '  const isAllowedLexically = allowedArtifactRoots.some((root) => isWithin(root, candidate));',
    '  if (isProtected(candidate) && !isAllowlistedAncestor(candidate, operation)) block(operation);',
    '  const resolvedCandidate = resolveCandidate(candidate);',
    '  if (isProtected(resolvedCandidate) && !isAllowlistedAncestor(resolvedCandidate, operation)) block(operation);',
    '  const isAllowedCanonically = allowedArtifactRoots.some((root) => isWithin(root, resolvedCandidate));',
    '  if (isAllowedLexically && isAllowedCanonically && candidate === resolvedCandidate) return;',
    '  if (isAllowedLexically) block(operation);',
    '}',
    'for (const surface of [fs, fs.promises]) {',
    '  for (const [method, indexes] of Object.entries(pathArguments)) {',
    '    const original = surface[method];',
    "    if (typeof original !== 'function') continue;",
    '    surface[method] = function (...args) {',
    '      try { for (const index of indexes) checkPath(args[index], method); }',
    '      catch (error) { if (surface === fs.promises) return Promise.reject(error); throw error; }',
    '      return original.apply(this, args);',
    '    };',
    '    if (surface === fs && (method === "realpath" || method === "realpathSync") && original.native) {',
    '      const nativeOriginal = original.native;',
    '      surface[method].native = function (...args) { checkPath(args[0], method + ".native"); return nativeOriginal.apply(this, args); };',
    '    }',
    '  }',
    '}',
    'function childProgram(args) {',
    '  const first = args[0];',
    "  if (typeof first === 'string') return path.basename(first);",
    "  if (first && typeof first.path === 'string') return path.basename(first.path);",
    '  return null;',
    '}',
    "for (const method of ['exec', 'execFile', 'execFileSync', 'execSync', 'fork', 'spawn', 'spawnSync']) {",
    '  if (typeof childProcess[method] !== "function") continue;',
    '  const original = childProcess[method];',
    '  childProcess[method] = function (...args) {',
    '    const program = childProgram(args);',
    '    if (!program || !allowedChildCommands.has(program)) blockChild(method);',
    '    return original.apply(this, args);',
    '  };',
    '}',
    'if (childProcess.promises) {',
    "  for (const method of ['exec', 'execFile', 'spawn']) {",
    "    if (typeof childProcess.promises[method] === 'function') {",
    '      childProcess.promises[method] = function () { return Promise.reject(Object.assign(new Error("Blocked child-process launch"), { code: "EACCES" })); };',
    '    }',
    '  }',
    '}',
  ].join('\n');
  fs.writeFileSync(guardPath, source);
  return guardPath;
}

function mirrorFixture() {
  const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-guard-')));
  const repoRoot = path.join(tempRoot, 'mirror');
  const scriptsDir = path.join(repoRoot, '.agents', 'scripts');
  const stateRoot = path.join(tempRoot, 'state');
  const artifactRoot = path.join(repoRoot, 'artifacts', 'output', 'maintenance', RUN_ID);
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(stateRoot, { mode: 0o700 });
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.copyFileSync(SESSION_SOURCE, path.join(scriptsDir, 'maintenance_session.js'));
  fs.copyFileSync(STATE_SOURCE, path.join(scriptsDir, 'maintenance_state.js'));
  fs.copyFileSync(CHECK_SOURCE, path.join(scriptsDir, 'maintenance_plan_check.js'));

  const productFiles = [
    { file: path.join(repoRoot, 'artifacts', 'memory', 'project-context.md'), contents: 'context untouched\n' },
    { file: path.join(repoRoot, 'artifacts', 'memory', 'active-decisions.md'), contents: 'decisions untouched\n' },
    { file: path.join(repoRoot, 'artifacts', 'memory', 'lessons-learned.md'), contents: 'lessons untouched\n' },
    { file: path.join(repoRoot, 'artifacts', 'output', 'pipeline-state.json'), contents: '{"pipeline":"untouched"}\n' },
    { file: path.join(repoRoot, 'artifacts', 'output', 'sprint-status.yaml'), contents: 'status: untouched\n' },
    { file: path.join(repoRoot, '.agents', 'state', 'sentinel.json'), contents: '{"state":"untouched"}\n' },
  ];
  for (const productFile of productFiles) {
    fs.mkdirSync(path.dirname(productFile.file), { recursive: true });
    fs.writeFileSync(productFile.file, productFile.contents);
  }

  fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'src', 'app.js'), 'export const value = 1;\n');
  fs.writeFileSync(path.join(repoRoot, 'tests', 'app.test.js'), "test('value', () => {});\n");

  git(repoRoot, ['init', '--quiet']);
  git(repoRoot, ['config', 'user.email', 'maintenance@example.test']);
  git(repoRoot, ['config', 'user.name', 'Maintenance Test']);
  git(repoRoot, ['config', 'commit.gpgsign', 'false']);
  git(repoRoot, ['config', 'core.autocrlf', 'false']);
  git(repoRoot, ['config', 'core.fileMode', 'true']);
  git(repoRoot, ['add', '--all']);
  git(repoRoot, ['commit', '--quiet', '-m', 'mirror base']);

  return {
    tempRoot,
    repoRoot: fs.realpathSync(repoRoot),
    stateRoot: fs.realpathSync(stateRoot),
    artifactRoot,
    sessionScript: path.join(scriptsDir, 'maintenance_session.js'),
    stateScript: path.join(scriptsDir, 'maintenance_state.js'),
    checkScript: path.join(scriptsDir, 'maintenance_plan_check.js'),
    planPath: path.join(artifactRoot, `maintenance-plan-${PLAN_ID}-r1.md`),
    productFiles,
    head: git(repoRoot, ['rev-parse', 'HEAD']).trim(),
    branch: git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']).trim(),
  };
}

function cleanup(f) {
  fs.rmSync(f.tempRoot, { recursive: true, force: true });
}

function renderGuardPlan(f) {
  const identity = `repoRoot=${f.repoRoot}; worktreePath=${f.repoRoot}; worktreeId=guard-worktree-001;`
    + ` branch=${f.branch}; HEAD=${f.head}; status=dirty`;
  const manifest = { schema: 'dirty-manifest-v1', files: [] };
  return `# Maintenance Plan ${EM_DASH} Guard fixture

This plan verifies one bounded maintenance behavior without executing any code change.

## Record identity

| Field | Value |
|---|---|
| \`runId\` | \`${RUN_ID}\` |
| \`planId\` | \`${PLAN_ID}\` |
| \`planRevision\` | \`1\` |
| \`planDigest\` | sha256:__DIGEST__ |
| \`baseRevision\` | ${f.head} |
| \`workingTreeIdentity\` | ${identity} |
| \`dirtyManifest\` | \`${JSON.stringify(manifest)}\` |
| \`externalStateRoot\` | ${f.stateRoot} |
| \`repoArtifactRoot\` | artifacts/output/maintenance/${RUN_ID}/ |
| \`createdAt\` | 2026-10-20T00:00:00.000Z |
| \`author\` | ${AGENT} |
| \`recordStatus\` | \`DRAFT\` |

**Digest rule:** compute SHA-256 over the exact plan bytes after replacing the \`planDigest\` field value with the literal \`[DIGEST OMITTED]\`.

## Scope

- **In scope:** Verify one bounded behavior check recorded against the run inputs.
- **Out of scope:** Execute changes, claim gate-green, or resolve an owner decision.
- **Assumptions:** The run inputs are the source of scope.
- **Constraints:** Use only the run-specific maintenance artifact root and the external state root.
- **Execution boundary:** This artifact is a proposal only; execution needs separate repository-owner authorization.

## Findings

| Finding ID | Claim and provenance | Current status | Owner | Decision owner | Exact source link(s) | Test/verification reference(s) | Evidence reference(s) | Revision covered | Blocked by |
|---|---|---|---|---|---|---|---|---|---|
| F001 | Inherited claim from the maintenance brief | [OPEN] | developer | Repository owner | src/app.js:12 | tests/app.test.js ${EM_DASH} rejects a conditional result | src/app.js:12 | ${f.head} | B1; T001 |

## Owner decisions ${EM_DASH} blockers, not estimated tasks

| Decision ID | Exact question | Options shown without selection | Status | Decision owner | Dependent task/work or gate | Owner evidence |
|---|---|---|---|---|---|---|
| \`B1\` | Choose whether publication is blocked by all known findings or only new findings. | all known findings / new findings only | \`[OPEN]\` | Repository owner | Publication policy work stays blocked | OPEN ${EM_DASH} no disposition recorded |
| \`O-4\` | Record a human disposition for each required baseline-history entry. | per-entry owner disposition | \`[OPEN]\` | Repository owner | Baseline history stays blocked | OPEN ${EM_DASH} no disposition recorded |
| \`B10\` | Choose retain, reshape, or remove for the named skill family. | retain / reshape / remove | \`[OPEN]\` | Repository owner | Skill family work stays blocked | OPEN ${EM_DASH} no disposition recorded |
| \`credential-residual\` | Decide whether the measured residual miss is acceptable. | accept / reject | \`[OPEN]\` | Repository owner | Residual acceptance stays blocked | OPEN ${EM_DASH} no disposition recorded |

## Task list

| Task ID | Work item and estimate (1${EN_DASH}4h) | First action | Done evidence | Status | Owner | Decision owner | Requirement/story/AC IDs | Exact source link(s) | Revert-proof test or manual evidence | Depends on | Parallel with |
|---|---|---|---|---|---|---|---|---|---|---|---|
| \`T001\` | Add one bounded behavior check ${EM_DASH} 2h | Read src/app.js:12 | A passing targeted behavior-test result | [BLOCKED] | developer | Repository owner | FR-001, US-001, AC-U1 | src/app.js:12 | CODE: test file: tests/app.test.js; test name: rejects a conditional result; command: node --test tests/app.test.js; revert proof: the behavior test fails when the fix is reverted | B1 | ${EM_DASH} |

## Dependency graph

\`\`\`mermaid
flowchart LR
    D_B1["B1 [OPEN]"] -. blocks .-> T001["T001"]
\`\`\`

## Technical review and repository-owner execution authorization

| Record | Status | Required reviewer/owner | Scope / task IDs | Exact plan revision and digest | Evidence reference | Claim status |
|---|---|---|---|---|---|---|
| Technical plan review | PENDING | @tech-lead | Scope, sources, estimates, verification, dependency graph | PENDING ${EM_DASH} ${RUN_ID} / ${PLAN_ID} / 1 / bind digest at review | OPEN | not recorded |
| Repository-owner execution authorization | PENDING | Repository owner | No tasks authorized in this draft | PENDING ${EM_DASH} ${RUN_ID} / ${PLAN_ID} / 1 / bind digest at authorization | OPEN | not recorded |
`;
}

function writeGuardPlan(f) {
  const content = renderGuardPlan(f);
  const digest = computePlanDigest(content);
  fs.writeFileSync(f.planPath, content.replace('sha256:__DIGEST__', `sha256:${digest}`));
}

function guardEnv(f, { allowedChildCommands = ['git'] } = {}) {
  return {
    MAINTENANCE_PROTECTED_ROOTS: JSON.stringify([
      path.join(f.repoRoot, 'artifacts', 'output'),
      path.join(f.repoRoot, 'artifacts', 'memory'),
      path.join(f.repoRoot, '.agents', 'state'),
      path.join(REAL_REPO_ROOT, 'artifacts', 'output'),
      path.join(REAL_REPO_ROOT, 'artifacts', 'memory'),
      path.join(REAL_REPO_ROOT, '.agents', 'state'),
    ]),
    MAINTENANCE_ALLOWED_ARTIFACT_ROOTS: JSON.stringify([f.artifactRoot]),
    MAINTENANCE_ALLOWED_CHILD_COMMANDS: JSON.stringify(allowedChildCommands),
  };
}

function runGuarded(f, guardPath, script, args, env) {
  const result = spawnSync(process.execPath, ['--require', guardPath, script, ...args], {
    cwd: f.tempRoot,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.doesNotMatch(result.stderr, /MAINTENANCE_FS_GUARD_BLOCKED/,
    `the maintenance path attempted a forbidden product access: ${result.stderr}`);
  assert.doesNotMatch(result.stderr, /MAINTENANCE_CHILD_GUARD_BLOCKED/,
    `the maintenance path attempted a forbidden child-process launch: ${result.stderr}`);
  return result;
}

test('the whole maintenance path runs guarded without touching product state', () => {
  const f = mirrorFixture();
  try {
    const guardPath = createGuard(f);
    const env = guardEnv(f);
    const realProductFiles = [
      path.join(REAL_REPO_ROOT, 'artifacts', 'output', 'pipeline-state.json'),
      path.join(REAL_REPO_ROOT, 'artifacts', 'output', 'sprint-status.yaml'),
      path.join(REAL_REPO_ROOT, 'artifacts', 'memory', 'project-context.md'),
      path.join(REAL_REPO_ROOT, 'artifacts', 'memory', 'active-decisions.md'),
      path.join(REAL_REPO_ROOT, 'artifacts', 'memory', 'lessons-learned.md'),
    ];
    // The product tree is gitignored, so it does not exist in a fresh checkout. Reading it
    // unconditionally made this test fail with ENOENT on a clean clone — the suite was not
    // hermetic, and the file's presence depended on working-tree state. A missing file is now
    // recorded as missing, and "still missing" is the same result as "unchanged".
    const readIfPresent = (file) => { try { return fs.readFileSync(file); } catch { return null; } };
    const realProductBefore = new Map(realProductFiles.map((file) => [file, readIfPresent(file)]));
    const realAgentStateBefore = snapshotTree(path.join(REAL_REPO_ROOT, '.agents', 'state'));
    const mirrorBefore = snapshotTree(f.repoRoot);
    const stateBefore = snapshotTree(f.stateRoot);

    writeGuardPlan(f);
    const mirrorBeforeSession = snapshotTree(f.repoRoot);

    const session = runGuarded(f, guardPath, f.sessionScript, [
      '--scope', 'maintenance',
      '--agent', AGENT,
      '--repo-root', f.repoRoot,
      '--state-root', f.stateRoot,
      '--run-id', RUN_ID,
      '--session-id', SESSION_ID,
    ], env);
    assert.equal(session.status, 0, session.stderr);
    const sessionOutput = JSON.parse(session.stdout);
    assert.equal(sessionOutput.scope, 'maintenance');
    assert.equal(sessionOutput.runId, RUN_ID);
    assert.equal(sessionOutput.sessionId, SESSION_ID);
    assert.equal(sessionOutput.artifactRoot, f.artifactRoot);
    assert.deepEqual(snapshotTree(f.repoRoot), mirrorBeforeSession,
      'the maintenance session start must not write into the mirror');

    const event = runGuarded(f, guardPath, f.stateScript, [
      'event',
      '--scope', 'maintenance',
      '--repo-root', f.repoRoot,
      '--state-root', f.stateRoot,
      '--run-id', RUN_ID,
      '--type', 'plan_drafted',
      '--details-json', JSON.stringify({
        planId: PLAN_ID,
        planRevision: '1',
        planHash: computePlanDigest(fs.readFileSync(f.planPath, 'utf8')),
      }),
      '--agent', AGENT,
      '--session-id', SESSION_ID,
    ], env);
    assert.equal(event.status, 0, event.stderr);
    const eventOutput = JSON.parse(event.stdout);
    assert.equal(eventOutput.type, 'plan_drafted');
    assert.equal(eventOutput.runId, RUN_ID);
    assert.equal(eventOutput.sessionId, SESSION_ID);

    const planCheck = runGuarded(f, guardPath, f.checkScript, [
      'check',
      '--scope', 'maintenance',
      '--repo-root', f.repoRoot,
      '--state-root', f.stateRoot,
      '--run-id', RUN_ID,
      '--plan', f.planPath,
      '--json',
    ], env);
    assert.equal(planCheck.status, 0, planCheck.stdout + planCheck.stderr);
    const planOutput = JSON.parse(planCheck.stdout);
    assert.equal(planOutput.valid, true, JSON.stringify(planOutput.issues));
    assert.equal(planOutput.planStatus, 'draft');
    assert.equal(planOutput.executionAuthorized, false);
    assert.equal(Object.hasOwn(planOutput, 'gateGreen'), false);
    assert.deepEqual(planOutput.issues, []);

    const status = runGuarded(f, guardPath, f.stateScript, [
      'status',
      '--scope', 'maintenance',
      '--repo-root', f.repoRoot,
      '--state-root', f.stateRoot,
      '--run-id', RUN_ID,
    ], env);
    assert.equal(status.status, 0, status.stderr);
    const statusOutput = JSON.parse(status.stdout);
    assert.equal(statusOutput.runId, RUN_ID);
    assert.equal(statusOutput.planStatus, 'drafted');
    assert.equal(statusOutput.eventCount, 1);
    assert.deepEqual(statusOutput.lifecycleIssues, []);
    assert.equal(Object.hasOwn(statusOutput, 'gateGreen'), false);

    // The temporary product sentinels are byte-identical afterwards.
    for (const productFile of f.productFiles) {
      assert.equal(fs.readFileSync(productFile.file, 'utf8'), productFile.contents);
    }

    // The real checkout's product protected state is byte-identical too.
    for (const [file, contents] of realProductBefore) {
      // A file that was ABSENT before must still be absent. Reading it unconditionally is what
      // made this test fail with ENOENT on a clean checkout — the product tree is gitignored, so
      // a fresh clone has no `artifacts/output/pipeline-state.json` to read back.
      if (contents === null) {
        assert.equal(fs.existsSync(file), false, `the real product state file appeared: ${file}`);
        continue;
      }
      assert.deepEqual(fs.readFileSync(file), contents, `the real product state file changed: ${file}`);
    }
    assert.deepEqual(snapshotTree(path.join(REAL_REPO_ROOT, '.agents', 'state')), realAgentStateBefore);

    // The guard was live in this environment: the same guard and environment
    // still deny a product read, so the clean run above is not a vacuous pass.
    const blockedProbe = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').readFileSync(process.env.MAINTENANCE_PROBE_PATH, 'utf8')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env, MAINTENANCE_PROBE_PATH: f.productFiles[0].file },
    });
    assert.notEqual(blockedProbe.status, 0, 'the guard must block a product read in this environment');
    assert.match(blockedProbe.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:readFileSync/);
    assert.equal(fs.readFileSync(f.productFiles[0].file, 'utf8'), f.productFiles[0].contents);

    // The only new mirror files are inside the run's maintenance artifact subtree.
    const mirrorDiff = treeDiff(mirrorBefore, snapshotTree(f.repoRoot));
    const allowedPrefix = `artifacts/output/maintenance/${RUN_ID}/`;
    for (const relative of mirrorDiff.added) {
      assert.ok(relative.startsWith(allowedPrefix), `unexpected new mirror file: ${relative}`);
    }
    assert.deepEqual(mirrorDiff.changed, [], 'no existing mirror file may change');
    assert.deepEqual(mirrorDiff.removed, [], 'no existing mirror file may be removed');
    assert.deepEqual(mirrorDiff.added, [`${allowedPrefix}maintenance-plan-${PLAN_ID}-r1.md`]);

    // The only new external-state files are the session record and the run event.
    const stateDiff = treeDiff(stateBefore, snapshotTree(f.stateRoot));
    for (const relative of stateDiff.added) {
      assert.ok(
        relative === 'sessions' || relative.startsWith('sessions/') ||
        relative === 'runs' || relative.startsWith('runs/'),
        `unexpected new external-state entry: ${relative}`,
      );
    }
    assert.deepEqual(stateDiff.changed, []);
    assert.deepEqual(stateDiff.removed, []);
    const stateAfter = snapshotTree(f.stateRoot);
    const addedFiles = stateAfter
      .filter((entry) => entry.type === 'file' && stateDiff.added.includes(entry.relative))
      .map((entry) => entry.relative)
      .sort();
    assert.deepEqual(addedFiles, [
      `runs/${RUN_ID}/events/${eventOutput.eventId}.json`,
      `sessions/${SESSION_ID}/session.json`,
    ]);

    // No shared session, worktree, step-tracking, or product state helper exists
    // in the mirror, so the path could not have called one.
    for (const helper of [
      'session_start.js', 'orchestrator_state.js', 'worktree.js', 'step_tracker.js',
      'memory_write.js', 'memory-controller',
    ]) {
      assert.equal(
        fs.existsSync(path.join(f.repoRoot, '.agents', 'scripts', helper)),
        false,
        `the mirror must not contain the product helper ${helper}`,
      );
    }
    const maintenanceSources = [SESSION_SOURCE, STATE_SOURCE, CHECK_SOURCE]
      .map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    assert.doesNotMatch(
      maintenanceSources,
      /session_start\.js|orchestrator_state\.js|worktree\.js|step[_-]tracker|memory_write\.js/i,
    );
  } finally {
    cleanup(f);
  }
});

test('the guard blocks a deliberate protected product access', () => {
  const f = mirrorFixture();
  try {
    const guardPath = createGuard(f);
    const env = guardEnv(f);

    const blockedRead = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').readFileSync(process.env.MAINTENANCE_PROBE_PATH, 'utf8')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env, MAINTENANCE_PROBE_PATH: f.productFiles[0].file },
    });
    assert.notEqual(blockedRead.status, 0, 'the guard must block the product-memory read');
    assert.match(blockedRead.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:readFileSync/);
    assert.equal(fs.readFileSync(f.productFiles[0].file, 'utf8'), f.productFiles[0].contents);

    const blockedWrite = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').writeFileSync(process.env.MAINTENANCE_PROBE_PATH, 'overwritten')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env, MAINTENANCE_PROBE_PATH: f.productFiles[3].file },
    });
    assert.notEqual(blockedWrite.status, 0, 'the guard must block the product-pipeline write');
    assert.match(blockedWrite.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:writeFileSync/);
    assert.equal(fs.readFileSync(f.productFiles[3].file, 'utf8'), f.productFiles[3].contents);

    const blockedRealCheckoutRead = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').readFileSync(process.env.MAINTENANCE_PROBE_PATH, 'utf8')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...env,
        MAINTENANCE_PROBE_PATH: path.join(REAL_REPO_ROOT, 'artifacts', 'output', 'pipeline-state.json'),
      },
    });
    assert.notEqual(blockedRealCheckoutRead.status, 0, 'the guard must block the real-checkout read');
    assert.match(blockedRealCheckoutRead.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:readFileSync/);

    const blockedListing = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').readdirSync(process.env.MAINTENANCE_PROBE_PATH)",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env, MAINTENANCE_PROBE_PATH: path.join(f.repoRoot, 'artifacts', 'output') },
    });
    assert.notEqual(blockedListing.status, 0, 'the guard must block a listing of the product output tree');
    assert.match(blockedListing.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:readdirSync/);

    const blockedChild = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:child_process').spawnSync(process.execPath, ['-e', 'process.exit(0)'])",
    ], { cwd: f.tempRoot, encoding: 'utf8', env: { ...process.env, ...env } });
    assert.notEqual(blockedChild.status, 0, 'the guard must block a child-process launch');
    assert.match(blockedChild.stderr, /MAINTENANCE_CHILD_GUARD_BLOCKED:spawnSync/);

    const blockedHelperLaunch = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:child_process').spawnSync(process.execPath, ['/tmp/session_start.js'])",
    ], { cwd: f.tempRoot, encoding: 'utf8', env: { ...process.env, ...env } });
    assert.notEqual(blockedHelperLaunch.status, 0, 'the guard must block a product helper launch');
    assert.match(blockedHelperLaunch.stderr, /MAINTENANCE_CHILD_GUARD_BLOCKED:spawnSync/);

    const allowedArtifact = path.join(f.artifactRoot, 'allowed.md');
    fs.writeFileSync(allowedArtifact, 'allowed artifact\n');
    const allowedProbe = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "process.stdout.write(require('node:fs').readFileSync(process.env.MAINTENANCE_PROBE_PATH, 'utf8'))",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env, MAINTENANCE_PROBE_PATH: allowedArtifact },
    });
    assert.equal(allowedProbe.status, 0, allowedProbe.stderr);
    assert.equal(allowedProbe.stdout, 'allowed artifact\n');
  } finally {
    cleanup(f);
  }
});
