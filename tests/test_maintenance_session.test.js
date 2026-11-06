'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const SOURCE = path.resolve(__dirname, '..', '.agents', 'scripts', 'maintenance_session.js');
const STATE_SOURCE = path.resolve(__dirname, '..', '.agents', 'scripts', 'maintenance_state.js');
const SCRIPTS_SOURCE = path.resolve(__dirname, '..', '.agents', 'scripts');
const REAL_REPO_ROOT = fs.realpathSync(path.resolve(__dirname, '..'));
const POSIX_PERMISSION_CHECKS_SUPPORTED = process.platform !== 'win32' &&
  typeof process.getuid === 'function';

function fixture() {
  const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-session-test-')));
  const repoRoot = path.join(tempRoot, 'repo');
  const script = path.join(repoRoot, '.agents', 'scripts', 'maintenance_session.js');
  const stateScript = path.join(repoRoot, '.agents', 'scripts', 'maintenance_state.js');
  const stateRoot = path.join(tempRoot, 'state');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.mkdirSync(stateRoot);
  fs.copyFileSync(SOURCE, script);
  fs.copyFileSync(STATE_SOURCE, stateScript);
  // The maintenance state store reuses the product memory pipeline's secret
  // scrubbing, so the temporary checkout carries the module it imports and
  // the library modules that module pulls in.
  fs.copyFileSync(
    path.join(SCRIPTS_SOURCE, 'memory_write.js'),
    path.join(repoRoot, '.agents', 'scripts', 'memory_write.js'),
  );
  fs.cpSync(path.join(SCRIPTS_SOURCE, 'lib'), path.join(repoRoot, '.agents', 'scripts', 'lib'), {
    recursive: true,
  });
  fs.writeFileSync(path.join(repoRoot, 'fixture.txt'), 'temporary repository\n');
  fs.writeFileSync(path.join(stateRoot, 'fixture.txt'), 'temporary state\n');
  // The state root is the trust anchor of the lane: it must be owner-only, so
  // the fixture creates it with owner-only mode from the start.
  fs.chmodSync(stateRoot, 0o700);
  return { tempRoot, repoRoot, script, stateScript, stateRoot };
}

function cleanup(f) {
  fs.rmSync(f.tempRoot, { recursive: true, force: true });
}

function captureOpenFlags(targetPath, callback) {
  const target = path.resolve(targetPath);
  const originalOpenSync = fs.openSync;
  let flags;
  fs.openSync = function (...args) {
    if (typeof args[0] === 'string' && path.resolve(args[0]) === target) {
      flags = args[1];
    }
    return originalOpenSync.apply(this, args);
  };
  try {
    return { value: callback(), flags };
  } finally {
    fs.openSync = originalOpenSync;
  }
}

function snapshotTree(root) {
  const entries = [];
  function visit(file, relative = '') {
    const stat = fs.lstatSync(file);
    const mode = stat.mode & 0o7777;
    if (stat.isSymbolicLink()) {
      entries.push({ relative, type: 'symlink', target: fs.readlinkSync(file) });
    } else if (stat.isDirectory()) {
      entries.push({ relative, type: 'directory', mode });
      for (const name of fs.readdirSync(file).sort()) {
        visit(path.join(file, name), path.join(relative, name));
      }
    } else if (stat.isFile()) {
      entries.push({ relative, type: 'file', mode, contents: fs.readFileSync(file).toString('base64') });
    } else {
      entries.push({ relative, type: 'other', mode });
    }
  }
  visit(root);
  return entries;
}

function argsFor(f, agent = 'developer') {
  return ['--scope', 'maintenance', '--agent', agent, '--repo-root', f.repoRoot,
    '--state-root', f.stateRoot];
}

function maintenanceStateArgsFor(f, runId = 'maintenance-state-test-run') {
  return ['--scope', 'maintenance', '--repo-root', f.repoRoot,
    '--state-root', f.stateRoot, '--run-id', runId];
}

function identityFor(f, {
  runId = 'maintenance-test-run',
  sessionId = 'maintenance-test-session',
  agent = 'developer',
  stateRoot = f.stateRoot,
} = {}) {
  return {
    scope: 'maintenance',
    agent,
    repoRoot: fs.realpathSync(f.repoRoot),
    stateRoot: fs.realpathSync(stateRoot),
    runId,
    sessionId,
  };
}

function maintenanceState(f) {
  return require(f.stateScript);
}

function planIdentity(overrides = {}) {
  return {
    planId: 'plan-01',
    planRevision: '1',
    planHash: 'hash-01',
    ...overrides,
  };
}

function appendPlanRevisionChain(f, runId, revisions) {
  const developer = identityFor(f, { runId, sessionId: 'developer-session-01', agent: 'developer' });
  const reviewer = identityFor(f, { runId, sessionId: 'reviewer-session-01', agent: 'code-reviewer' });
  const state = maintenanceState(f);
  const drafts = revisions.map((details) => state.appendMaintenanceRunEvent(developer, {
    type: 'plan_drafted',
    details,
  }));
  return { developer, reviewer, state, drafts };
}

function run(f, args, options = {}) {
  const before = snapshotTree(f.tempRoot);
  const nodeArgs = options.preload ? ['--require', options.preload] : [];
  const result = spawnSync(process.execPath, [...nodeArgs, f.script, ...args], {
    cwd: f.tempRoot,
    encoding: 'utf8',
    env: options.env ? { ...process.env, ...options.env } : process.env,
  });
  result.snapshotBefore = before;
  if (result.status !== 0) {
    assert.deepEqual(snapshotTree(f.tempRoot), before, 'failed entrypoint must not write to the temporary repo or state root');
  }
  return result;
}

function runState(f, args, options = {}) {
  const before = snapshotTree(f.tempRoot);
  const nodeArgs = options.preload ? ['--require', options.preload] : [];
  const result = spawnSync(process.execPath, [...nodeArgs, f.stateScript, ...args], {
    cwd: f.tempRoot,
    encoding: 'utf8',
    env: options.env ? { ...process.env, ...options.env } : process.env,
  });
  result.snapshotBefore = before;
  if (result.status !== 0) {
    assert.deepEqual(snapshotTree(f.tempRoot), before, 'failed maintenance state CLI must not write to the temporary repo or state root');
  }
  return result;
}

function runNodeProcess(args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status, signal) => resolve({ status, signal, stdout, stderr }));
  });
}

function readRunEvents(f, runId) {
  const eventsDirectory = path.join(f.stateRoot, 'runs', runId, 'events');
  return fs.readdirSync(eventsDirectory).sort().map((name) => ({
    file: name,
    record: JSON.parse(fs.readFileSync(path.join(eventsDirectory, name), 'utf8')),
  }));
}

function appendOrderedLifecycle(f) {
  const runId = 'lifecycle-ordering-run';
  const developer = identityFor(f, { runId, sessionId: 'developer-session-01', agent: 'developer' });
  const reviewer = identityFor(f, { runId, sessionId: 'reviewer-session-01', agent: 'code-reviewer' });
  const state = maintenanceState(f);
  state.startMaintenanceSession(developer);
  state.startMaintenanceSession(reviewer);

  const plan = planIdentity();
  const draft = state.appendMaintenanceRunEvent(developer, { type: 'plan_drafted', details: plan });
  const approval = state.appendMaintenanceRunEvent(reviewer, {
    type: 'plan_approved',
    details: { ...plan, draftEventId: draft.eventId, evidenceRef: 'review-record://plan-01' },
  });
  const start = state.appendMaintenanceRunEvent(developer, {
    type: 'execution_started',
    details: { ...plan, approvalEventId: approval.eventId },
  });
  const verification = state.appendMaintenanceRunEvent(reviewer, {
    type: 'verification',
    details: {
      ...plan,
      startEventId: start.eventId,
      check: 'targeted-test',
      result: 'passed',
      evidenceRef: 'test-report://targeted-test',
    },
  });
  const completion = state.appendMaintenanceRunEvent(developer, {
    type: 'execution_completed',
    details: {
      ...plan,
      startEventId: start.eventId,
      verificationEventId: verification.eventId,
    },
  });

  return {
    identity: developer,
    state,
    events: { draft, approval, start, verification, completion },
  };
}

function setRunEventTimestamp(f, event, at) {
  const eventPath = path.join(f.stateRoot, 'runs', event.runId, 'events', `${event.eventId}.json`);
  const record = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  record.at = at;
  fs.writeFileSync(eventPath, `${JSON.stringify(record, null, 2)}\n`);
}

function assertOnlySessionRecordChanges(f, before, sessionId) {
  const allowed = new Set([
    path.relative(f.tempRoot, path.join(f.stateRoot, 'sessions')),
    path.relative(f.tempRoot, path.join(f.stateRoot, 'sessions', sessionId)),
    path.relative(f.tempRoot, path.join(f.stateRoot, 'sessions', sessionId, 'session.json')),
  ]);
  const after = snapshotTree(f.tempRoot);
  const withoutAllowed = (snapshot) => snapshot.filter((entry) => !allowed.has(entry.relative));
  assert.deepEqual(
    withoutAllowed(after),
    withoutAllowed(before),
    'only the external maintenance session directory and record may change',
  );
  return after;
}

function assertExactSessionTree(f, sessionIds) {
  const ids = Array.isArray(sessionIds) ? sessionIds : [sessionIds];
  const sessionsDirectory = path.join(f.stateRoot, 'sessions');
  assert.deepEqual(fs.readdirSync(f.stateRoot).sort(), ['fixture.txt', 'sessions']);
  assert.deepEqual(fs.readdirSync(sessionsDirectory).sort(), [...ids].sort());
  for (const sessionId of ids) {
    assert.deepEqual(fs.readdirSync(path.join(sessionsDirectory, sessionId)).sort(), ['session.json']);
  }
}

function readSessionRecord(f, sessionId) {
  return JSON.parse(fs.readFileSync(
    path.join(f.stateRoot, 'sessions', sessionId, 'session.json'),
    'utf8',
  ));
}

function assertRejected(f, args, message) {
  const result = run(f, args);
  assert.equal(result.status, 2, `expected validation failure (stderr: ${result.stderr})`);
  assert.match(result.stderr, message);
}

function assertStateRejected(f, args, message, options = {}) {
  const result = runState(f, args, options);
  assert.equal(result.status, 2, `expected validation failure (stderr: ${result.stderr})`);
  assert.match(result.stderr, message);
}

function createFilesystemGuard(f) {
  const guardPath = path.join(f.tempRoot, 'maintenance-fs-guard.cjs');
  const source = [
    "'use strict';",
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    "const childProcess = require('node:child_process');",
    "const { fileURLToPath } = require('node:url');",
    'const protectedRoots = JSON.parse(process.env.MAINTENANCE_PROTECTED_ROOTS).map((root) => path.resolve(root));',
    'const allowedArtifactRoots = JSON.parse(process.env.MAINTENANCE_ALLOWED_ARTIFACT_ROOTS || "[]").map((root) => path.resolve(root));',
    'const originalRealpathSync = fs.realpathSync.native || fs.realpathSync;',
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
    'function block(operation) {',
    "  process.stderr.write('MAINTENANCE_FS_GUARD_BLOCKED:' + operation + '\\n');",
    "  const error = new Error('Blocked protected product path or child-process launch');",
    "  error.code = 'EACCES';",
    '  throw error;',
    '}',
    'function checkPath(value, operation) {',
    "  let valuePath;",
    "  if (typeof value === 'string') valuePath = value;",
    '  else if (Buffer.isBuffer(value)) valuePath = value.toString();',
    '  else if (value instanceof URL) valuePath = fileURLToPath(value);',
    '  else return;',
    '  const candidate = path.resolve(valuePath);',
    '  const isAllowedLexically = allowedArtifactRoots.some((root) => isWithin(root, candidate));',
    '  if (isProtected(candidate)) block(operation);',
    '  const resolvedCandidate = resolveCandidate(candidate);',
    '  if (isProtected(resolvedCandidate)) block(operation);',
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
    "for (const method of ['exec', 'execFile', 'execFileSync', 'execSync', 'fork', 'spawn', 'spawnSync']) {",
    '  if (typeof childProcess[method] !== "function") continue;',
    '  childProcess[method] = function () { block("childProcess:" + method); };',
    '}',
    'if (childProcess.promises) {',
    "  for (const method of ['exec', 'execFile', 'spawn']) {",
    '    if (typeof childProcess.promises[method] === "function") {',
    '      childProcess.promises[method] = function () { return Promise.reject(Object.assign(new Error("Blocked child-process launch"), { code: "EACCES" })); };',
    '    }',
    '  }',
    '}',
  ].join('\n');
  fs.writeFileSync(guardPath, source);
  return guardPath;
}

test('accepts a sibling external state root and creates only its maintenance session record', () => {
  const f = fixture();
  try {
    const result = run(f, argsFor(f));
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.scope, 'maintenance');
    assert.equal(output.agent, 'developer');
    assert.equal(output.repoRoot, fs.realpathSync(f.repoRoot));
    assert.equal(output.stateRoot, fs.realpathSync(f.stateRoot));
    assert.match(output.runId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.match(output.sessionId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.notEqual(output.sessionId, output.runId);
    assert.equal(output.sessionRecordPath, path.join(output.stateRoot, 'sessions', output.sessionId, 'session.json'));
    assert.equal(output.artifactRoot, path.join(output.repoRoot, 'artifacts', 'output', 'maintenance', output.runId));
    assert.equal(fs.existsSync(output.artifactRoot), false, 'startup must not create the artifact subtree');

    assertOnlySessionRecordChanges(f, result.snapshotBefore, output.sessionId);
    assertExactSessionTree(f, output.sessionId);
    const record = readSessionRecord(f, output.sessionId);
    assert.deepEqual(Object.keys(record).sort(), [
      'agent', 'events', 'runId', 'scope', 'sessionId', 'startedAt', 'status', 'updatedAt',
    ]);
    assert.equal(record.scope, 'maintenance');
    assert.equal(record.agent, 'developer');
    assert.equal(record.runId, output.runId);
    assert.equal(record.sessionId, output.sessionId);
    assert.equal(record.status, 'started');
    assert.match(record.startedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.equal(record.updatedAt, record.startedAt);
    assert.deepEqual(record.events, [{ type: 'started', at: record.startedAt }]);
    if (POSIX_PERMISSION_CHECKS_SUPPORTED) {
      const sessionsDirectory = path.join(output.stateRoot, 'sessions');
      const sessionDirectory = path.dirname(output.sessionRecordPath);
      assert.equal(fs.statSync(sessionsDirectory).mode & 0o077, 0);
      assert.equal(fs.statSync(sessionDirectory).mode & 0o077, 0);
      assert.equal(fs.statSync(output.sessionRecordPath).mode & 0o077, 0);
    }
  } finally {
    cleanup(f);
  }
});

test('supports missing UID and O_NOFOLLOW capabilities without weakening path or no-overwrite checks', () => {
  const f = fixture();
  try {
    // Only platform capabilities are injected; lstat, realpath, containment, and
    // exclusive file creation still use real filesystem paths under this temp root.
    const portableCapabilities = {
      posixPermissions: false,
      uid: undefined,
      noFollowFlag: undefined,
    };
    const canonicalStateRoot = fs.realpathSync(f.stateRoot);
    const identity = (sessionId, stateRoot = canonicalStateRoot) => ({
      scope: 'maintenance',
      agent: 'developer',
      repoRoot: fs.realpathSync(f.repoRoot),
      runId: 'portable-run',
      sessionId,
      stateRoot,
    });

    const portableRecordPath = path.join(canonicalStateRoot, 'sessions', 'portable-session', 'session.json');
    const beforePortable = snapshotTree(f.tempRoot);
    const portable = captureOpenFlags(portableRecordPath, () => maintenanceState(f).startMaintenanceSession(
      identity('portable-session'),
      portableCapabilities,
    ));
    assert.equal(portable.value, portableRecordPath);
    assert.equal(portable.flags & fs.constants.O_CREAT, fs.constants.O_CREAT);
    assert.equal(portable.flags & fs.constants.O_EXCL, fs.constants.O_EXCL);
    if (typeof fs.constants.O_NOFOLLOW === 'number') {
      assert.equal(portable.flags & fs.constants.O_NOFOLLOW, 0);
    }
    assertOnlySessionRecordChanges(f, beforePortable, 'portable-session');

    const nativeRecordPath = path.join(canonicalStateRoot, 'sessions', 'native-session', 'session.json');
    const beforeNative = snapshotTree(f.tempRoot);
    const native = captureOpenFlags(nativeRecordPath, () => maintenanceState(f).startMaintenanceSession(identity('native-session')));
    assert.equal(native.value, nativeRecordPath);
    assert.equal(native.flags & fs.constants.O_CREAT, fs.constants.O_CREAT);
    assert.equal(native.flags & fs.constants.O_EXCL, fs.constants.O_EXCL);
    if (typeof fs.constants.O_NOFOLLOW === 'number') {
      assert.equal(native.flags & fs.constants.O_NOFOLLOW, fs.constants.O_NOFOLLOW);
    }
    assertOnlySessionRecordChanges(f, beforeNative, 'native-session');
    assertExactSessionTree(f, ['native-session', 'portable-session']);

    const existingRecord = fs.readFileSync(portableRecordPath, 'utf8');
    const beforeDuplicate = snapshotTree(f.tempRoot);
    assert.throws(
      () => maintenanceState(f).startMaintenanceSession(identity('portable-session'), portableCapabilities),
      /Session ID already exists/,
    );
    assert.deepEqual(snapshotTree(f.tempRoot), beforeDuplicate);
    assert.equal(fs.readFileSync(portableRecordPath, 'utf8'), existingRecord);

    const outsideSession = path.join(f.tempRoot, 'outside-session');
    fs.mkdirSync(outsideSession);
    const outsideSentinel = path.join(outsideSession, 'sentinel.txt');
    fs.writeFileSync(outsideSentinel, 'unchanged\n');
    const sessionsDirectory = path.join(canonicalStateRoot, 'sessions');
    const symlinkSessionId = 'linked-session';
    fs.symlinkSync(
      outsideSession,
      path.join(sessionsDirectory, symlinkSessionId),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const beforeSymlink = snapshotTree(f.tempRoot);
    assert.throws(
      () => maintenanceState(f).startMaintenanceSession(identity(symlinkSessionId), portableCapabilities),
      /session directory must be a non-symlink directory/,
    );
    assert.deepEqual(snapshotTree(f.tempRoot), beforeSymlink);
    assert.equal(fs.readFileSync(outsideSentinel, 'utf8'), 'unchanged\n');

    const fileSessionId = 'file-collision';
    const fileCollision = path.join(sessionsDirectory, fileSessionId);
    fs.writeFileSync(fileCollision, 'unchanged file\n');
    const beforeFileCollision = snapshotTree(f.tempRoot);
    assert.throws(
      () => maintenanceState(f).startMaintenanceSession(identity(fileSessionId), portableCapabilities),
      /session directory must be a non-symlink directory/,
    );
    assert.deepEqual(snapshotTree(f.tempRoot), beforeFileCollision);
    assert.equal(fs.readFileSync(fileCollision, 'utf8'), 'unchanged file\n');

    const stateRootLink = path.join(f.tempRoot, 'state-root-link');
    fs.symlinkSync(f.stateRoot, stateRootLink, process.platform === 'win32' ? 'junction' : 'dir');
    const beforeRootLink = snapshotTree(f.tempRoot);
    assert.throws(
      () => maintenanceState(f).startMaintenanceSession(identity('linked-root-session', stateRootLink), portableCapabilities),
      /canonical non-symlink directory/,
    );
    assert.deepEqual(snapshotTree(f.tempRoot), beforeRootLink);
    assert.throws(
      () => maintenanceState(f).startMaintenanceSession(identity('../escaped-session'), portableCapabilities),
      /Validated maintenance session identity is required/,
    );
  } finally {
    cleanup(f);
  }
});

test('allows agents in one run to create separate immutable session records', () => {
  const f = fixture();
  try {
    const runId = 'maintenance_01-safe';
    const first = run(f, [...argsFor(f, 'developer'), '--run-id', runId]);
    assert.equal(first.status, 0, first.stderr);
    const firstOutput = JSON.parse(first.stdout);
    assert.equal(firstOutput.runId, runId);
    assertOnlySessionRecordChanges(f, first.snapshotBefore, firstOutput.sessionId);
    assertExactSessionTree(f, firstOutput.sessionId);
    const firstRecord = readSessionRecord(f, firstOutput.sessionId);

    const second = run(f, [...argsFor(f, 'qa-engineer'), '--run-id', runId]);
    assert.equal(second.status, 0, second.stderr);
    const secondOutput = JSON.parse(second.stdout);
    assert.equal(secondOutput.runId, runId);
    assert.notEqual(secondOutput.sessionId, firstOutput.sessionId);
    assert.equal(secondOutput.sessionRecordPath, path.join(secondOutput.stateRoot, 'sessions', secondOutput.sessionId, 'session.json'));
    assertOnlySessionRecordChanges(f, second.snapshotBefore, secondOutput.sessionId);
    assertExactSessionTree(f, [firstOutput.sessionId, secondOutput.sessionId]);

    assert.equal(firstRecord.agent, 'developer');
    assert.equal(firstRecord.runId, runId);
    assert.equal(firstRecord.sessionId, firstOutput.sessionId);
    const secondRecord = readSessionRecord(f, secondOutput.sessionId);
    assert.equal(secondRecord.agent, 'qa-engineer');
    assert.equal(secondRecord.runId, runId);
    assert.equal(secondRecord.sessionId, secondOutput.sessionId);
    assert.deepEqual(readSessionRecord(f, firstOutput.sessionId), firstRecord);
  } finally {
    cleanup(f);
  }
});

test('refuses to reuse a session ID without changing its immutable record', () => {
  const f = fixture();
  try {
    const runId = 'maintenance_01-safe';
    const sessionId = 'developer-session-01';
    const args = [...argsFor(f), '--run-id', runId, '--session-id', sessionId];
    const first = run(f, args);
    assert.equal(first.status, 0, first.stderr);
    assertOnlySessionRecordChanges(f, first.snapshotBefore, sessionId);
    assertExactSessionTree(f, sessionId);
    const originalRecord = readSessionRecord(f, sessionId);

    const second = run(f, args);
    assert.equal(second.status, 2, second.stderr);
    assert.match(second.stderr, /Session ID already exists/);
    assert.deepEqual(readSessionRecord(f, sessionId), originalRecord);
    assertExactSessionTree(f, sessionId);
  } finally {
    cleanup(f);
  }
});

test('reduces an ordered lifecycle to recorded claims without implying external gate validation', () => {
  const f = fixture();
  try {
    const runId = 'lifecycle-run-01';
    const developer = identityFor(f, { runId, sessionId: 'developer-session-01', agent: 'developer' });
    const reviewer = identityFor(f, { runId, sessionId: 'reviewer-session-01', agent: 'code-reviewer' });
    maintenanceState(f).startMaintenanceSession(developer);
    maintenanceState(f).startMaintenanceSession(reviewer);
    const developerRecord = readSessionRecord(f, developer.sessionId);
    const reviewerRecord = readSessionRecord(f, reviewer.sessionId);

    const state = maintenanceState(f);
    const plan = planIdentity();
    const draft = state.appendMaintenanceRunEvent(developer, { type: 'plan_drafted', details: plan });
    const approvalEvidenceRef = 'review-record://plan-01';
    const approval = state.appendMaintenanceRunEvent(reviewer, {
      type: 'plan_approved',
      details: { ...plan, draftEventId: draft.eventId, evidenceRef: approvalEvidenceRef },
    });
    const start = state.appendMaintenanceRunEvent(developer, {
      type: 'execution_started',
      details: { ...plan, approvalEventId: approval.eventId },
    });
    const taskDisposition = state.appendMaintenanceRunEvent(developer, {
      type: 'task_disposition',
      details: { taskId: 'T002', disposition: 'fixed' },
    });
    const verification = state.appendMaintenanceRunEvent(reviewer, {
      type: 'verification',
      details: {
        ...plan,
        startEventId: start.eventId,
        check: 'targeted-test',
        result: 'passed',
        evidenceRef: 'test-report://targeted-test',
      },
    });
    const panelSeatDisposition = state.appendMaintenanceRunEvent(reviewer, {
      type: 'panel_seat_disposition',
      details: { seat: 'code-reviewer', disposition: 'satisfied' },
    });
    const completion = state.appendMaintenanceRunEvent(developer, {
      type: 'execution_completed',
      details: {
        ...plan,
        startEventId: start.eventId,
        verificationEventId: verification.eventId,
      },
    });
    const records = [draft, approval, start, taskDisposition, verification, panelSeatDisposition, completion];
    assert.equal(new Set(records.map((record) => record.eventId)).size, records.length);

    const eventsDirectory = path.join(f.stateRoot, 'runs', runId, 'events');
    const saved = readRunEvents(f, runId);
    assert.equal(saved.length, records.length);
    assert.ok(saved.every(({ file, record }) => file === `${record.eventId}.json`));
    assert.ok(saved.every(({ record }) => record.runId === runId));
    assert.deepEqual(new Set(saved.map(({ record }) => record.type)), new Set([
      'plan_drafted', 'plan_approved', 'execution_started', 'execution_completed',
      'task_disposition', 'verification', 'panel_seat_disposition',
    ]));
    assert.ok(saved.every(({ file }) => path.dirname(path.join(eventsDirectory, file)) === eventsDirectory));

    const status = maintenanceState(f).readMaintenanceRunStatus(developer);
    assert.equal(status.runId, runId);
    assert.equal(status.status, 'completion-recorded');
    assert.equal(status.planStatus, 'approval-recorded');
    assert.equal(status.executionStatus, 'completion-recorded');
    assert.equal(status.eventCount, records.length);
    assert.deepEqual(status.lifecycleIssues, []);
    assert.equal(status.gateGreen, undefined);
    assert.deepEqual(status.planApprovalEvidence, [{
      eventId: approval.eventId,
      at: approval.at,
      evidenceRef: approvalEvidenceRef,
      claimStatus: 'recorded-claim',
      validation: 'not-cryptographically-verified',
    }]);
    assert.equal(status.completionEvidence[0].eventId, completion.eventId);
    assert.equal(status.completionEvidence[0].validation, 'not-externally-validated');
    assert.deepEqual(status.ownerDecisions.map(({ decisionId, status: decisionStatus }) => ({
      decisionId,
      status: decisionStatus,
    })), [
      { decisionId: 'B1', status: 'open' },
      { decisionId: 'O-4', status: 'open' },
      { decisionId: 'B10', status: 'open' },
      { decisionId: 'credential-residual', status: 'open' },
    ]);
    assert.deepEqual(status.taskDispositions[0].details, { taskId: 'T002', disposition: 'fixed' });
    assert.equal(status.verifications[0].details.check, 'targeted-test');
    assert.equal(status.verifications[0].details.result, 'passed');
    assert.deepEqual(status.panelSeatDispositions[0].details, { seat: 'code-reviewer', disposition: 'satisfied' });
    assert.deepEqual(readSessionRecord(f, developer.sessionId), developerRecord);
    assert.deepEqual(readSessionRecord(f, reviewer.sessionId), reviewerRecord);

    const beforeInvalidEvent = snapshotTree(f.tempRoot);
    assert.throws(
      () => maintenanceState(f).appendMaintenanceRunEvent(developer, { type: 'arbitrary_event', details: {} }),
      /Unsupported maintenance run event type/,
    );
    assert.deepEqual(snapshotTree(f.tempRoot), beforeInvalidEvent);
  } finally {
    cleanup(f);
  }
});

test('append timestamps advance past referenced events when the clock has not advanced', () => {
  const f = fixture();
  try {
    const originalDateNow = Date.now;
    let lifecycle;
    try {
      Date.now = () => Date.parse('2026-10-19T00:00:00.000Z');
      lifecycle = appendOrderedLifecycle(f);
    } finally {
      Date.now = originalDateNow;
    }

    const { events, identity, state } = lifecycle;
    for (const [prerequisite, dependent] of [
      [events.draft, events.approval],
      [events.approval, events.start],
      [events.start, events.verification],
      [events.start, events.completion],
      [events.verification, events.completion],
    ]) {
      assert.ok(Date.parse(prerequisite.at) < Date.parse(dependent.at));
    }

    const status = state.readMaintenanceRunStatus(identity);
    assert.equal(status.status, 'completion-recorded');
    assert.equal(status.planStatus, 'approval-recorded');
    assert.equal(status.executionStatus, 'completion-recorded');
    assert.equal(status.gateGreen, undefined);
  } finally {
    cleanup(f);
  }
});

const lifecycleReferences = [
  { dependent: 'approval', prerequisite: 'draft' },
  { dependent: 'start', prerequisite: 'approval' },
  { dependent: 'verification', prerequisite: 'start' },
  { dependent: 'completion', prerequisite: 'start' },
  { dependent: 'completion', prerequisite: 'verification' },
];

for (const ordering of ['equal', 'later']) {
  test(`rejects lifecycle references to ${ordering}-timestamp events`, () => {
    for (const { dependent, prerequisite } of lifecycleReferences) {
      const f = fixture();
      try {
        const { events, identity, state } = appendOrderedLifecycle(f);
        const dependentEvent = events[dependent];
        const prerequisiteEvent = events[prerequisite];
        const prerequisiteAt = ordering === 'equal'
          ? dependentEvent.at
          : new Date(Date.parse(dependentEvent.at) + 1).toISOString();
        setRunEventTimestamp(f, prerequisiteEvent, prerequisiteAt);

        const status = state.readMaintenanceRunStatus(identity);
        const context = `${dependent} referencing ${ordering} ${prerequisite}`;
        assert.equal(status.status, 'invalid', context);
        assert.equal(status.executionStatus, 'invalid', context);
        assert.ok(status.lifecycleIssues.some((issue) => issue.eventId === dependentEvent.eventId), context);
        assert.notEqual(status.status, 'completion-recorded', context);
        assert.notEqual(status.executionStatus, 'completion-recorded', context);
        if (dependent === 'approval') assert.notEqual(status.planStatus, 'approval-recorded', context);
        assert.equal(status.gateGreen, undefined);
        assert.equal(status.planApprovalEvidence[0].claimStatus, 'recorded-claim');
        assert.equal(status.completionEvidence[0].claimStatus, 'completion-recorded');
      } finally {
        cleanup(f);
      }
    }
  });
}

test('a lone plan approval is reduced as invalid, not approved', () => {
  const f = fixture();
  try {
    const identity = identityFor(f, { runId: 'lone-approval-run' });
    const state = maintenanceState(f);
    state.appendMaintenanceRunEvent(identity, {
      type: 'plan_approved',
      details: {
        ...planIdentity(),
        draftEventId: 'missing-draft-event',
        evidenceRef: 'review-record://orphaned-plan',
      },
    });

    const status = state.readMaintenanceRunStatus(identity);
    assert.equal(status.status, 'invalid');
    assert.equal(status.planStatus, 'invalid');
    assert.equal(status.executionStatus, 'not_started');
    assert.equal(status.eventCount, 1);
    assert.ok(status.lifecycleIssues.some((issue) => /valid plan_drafted event/.test(issue.message)));
  } finally {
    cleanup(f);
  }
});

test('a lone execution completion is reduced as invalid, not completed', () => {
  const f = fixture();
  try {
    const identity = identityFor(f, { runId: 'lone-completion-run' });
    const state = maintenanceState(f);
    state.appendMaintenanceRunEvent(identity, {
      type: 'execution_completed',
      details: {
        ...planIdentity(),
        startEventId: 'missing-start-event',
        verificationEventId: 'missing-verification-event',
      },
    });

    const status = state.readMaintenanceRunStatus(identity);
    assert.equal(status.status, 'invalid');
    assert.equal(status.planStatus, 'not_drafted');
    assert.equal(status.executionStatus, 'invalid');
    assert.equal(status.completionEvidence[0].claimStatus, 'completion-recorded');
    assert.equal(status.completionEvidence[0].validation, 'not-externally-validated');
  } finally {
    cleanup(f);
  }
});

test('a plan approval with a mismatched draft hash is reduced as invalid', () => {
  const f = fixture();
  try {
    const identity = identityFor(f, { runId: 'mismatched-approval-run' });
    const state = maintenanceState(f);
    const draft = state.appendMaintenanceRunEvent(identity, {
      type: 'plan_drafted',
      details: planIdentity({ planHash: 'hash-a' }),
    });
    state.appendMaintenanceRunEvent(identity, {
      type: 'plan_approved',
      details: {
        ...planIdentity({ planHash: 'hash-b' }),
        draftEventId: draft.eventId,
        evidenceRef: 'review-record://mismatched-plan',
      },
    });

    const status = state.readMaintenanceRunStatus(identity);
    assert.equal(status.status, 'invalid');
    assert.equal(status.planStatus, 'invalid');
    assert.ok(status.lifecycleIssues.some((issue) => /different plan ID, revision, or hash/.test(issue.message)));
  } finally {
    cleanup(f);
  }
});

test('reduces a plan revision chain cleanly and identifies the current revision', () => {
  const f = fixture();
  try {
    const runId = 'revision-chain-run';
    const revisionOne = planIdentity({ planRevision: '1', planHash: 'hash-r1' });
    const revisionTwo = planIdentity({ planRevision: '2', planHash: 'hash-r2' });
    const { developer, reviewer, state, drafts } = appendPlanRevisionChain(
      f,
      runId,
      [revisionOne, revisionTwo],
    );
    const approval = state.appendMaintenanceRunEvent(reviewer, {
      type: 'plan_approved',
      details: {
        ...revisionTwo,
        draftEventId: drafts[1].eventId,
        evidenceRef: 'review-record://plan-01-r2',
      },
    });

    const status = state.readMaintenanceRunStatus(developer);
    assert.deepEqual(status.lifecycleIssues, [], 'a revision chain is not a lifecycle issue');
    assert.equal(status.status, 'approval-recorded');
    assert.equal(status.planStatus, 'approval-recorded');
    assert.equal(status.executionStatus, 'not_started');
    assert.equal(status.currentPlanRevision.planRevision, '2');
    assert.equal(status.currentPlanRevision.planHash, 'hash-r2');
    assert.equal(status.currentPlanRevision.approvalRecorded, true);
    assert.equal(status.currentPlanRevision.status, 'approved');
    assert.equal(status.approvedPlanRevision.planRevision, '2');
    assert.equal(status.approvedPlanRevision.planHash, 'hash-r2');
    assert.equal(status.approvedPlanRevision.superseded, false);
    assert.deepEqual(status.supersededPlanRevisions, ['1']);
    assert.deepEqual(status.planRevisions.map((revision) => ({
      planRevision: revision.planRevision,
      planHash: revision.planHash,
      approvalRecorded: revision.approvalRecorded,
      superseded: revision.superseded,
      status: revision.status,
    })), [
      {
        planRevision: '1',
        planHash: 'hash-r1',
        approvalRecorded: false,
        superseded: true,
        status: 'superseded',
      },
      {
        planRevision: '2',
        planHash: 'hash-r2',
        approvalRecorded: true,
        superseded: false,
        status: 'approved',
      },
    ]);
    assert.deepEqual(status.planRevisions[0].draftEventIds, [drafts[0].eventId]);
    assert.deepEqual(status.planRevisions[1].draftEventIds, [drafts[1].eventId]);
    assert.deepEqual(status.planRevisions[1].approvalEventIds, [approval.eventId]);
  } finally {
    cleanup(f);
  }
});

test('an approval of an older revision does not approve the newest revision', () => {
  const f = fixture();
  try {
    const runId = 'stale-approval-run';
    const revisionOne = planIdentity({ planRevision: '1', planHash: 'hash-r1' });
    const revisionTwo = planIdentity({ planRevision: '2', planHash: 'hash-r2' });
    const { developer, reviewer, state, drafts } = appendPlanRevisionChain(
      f,
      runId,
      [revisionOne, revisionTwo],
    );
    const approval = state.appendMaintenanceRunEvent(reviewer, {
      type: 'plan_approved',
      details: {
        ...revisionOne,
        draftEventId: drafts[0].eventId,
        evidenceRef: 'review-record://plan-01-r1',
      },
    });

    const status = state.readMaintenanceRunStatus(developer);
    assert.deepEqual(status.lifecycleIssues, [], 'a revision chain is not a lifecycle issue');
    assert.equal(status.planStatus, 'drafted', 'the newest revision has no recorded approval');
    assert.equal(status.status, 'not_started');
    assert.equal(status.currentPlanRevision.planRevision, '2');
    assert.equal(status.currentPlanRevision.approvalRecorded, false);
    assert.equal(status.currentPlanRevision.status, 'drafted');
    assert.equal(status.approvedPlanRevision.planRevision, '1');
    assert.equal(status.approvedPlanRevision.superseded, true);
    assert.equal(status.approvedPlanRevision.status, 'superseded');
    assert.deepEqual(status.supersededPlanRevisions, ['1']);
    assert.equal(status.planRevisions[1].approvalRecorded, false);
    assert.deepEqual(status.planRevisions[1].approvalEventIds, []);
    // The stale approval stays a recorded claim and is never promoted.
    assert.equal(status.planApprovalEvidence.length, 1);
    assert.equal(status.planApprovalEvidence[0].eventId, approval.eventId);
    assert.equal(status.planApprovalEvidence[0].claimStatus, 'recorded-claim');
    assert.equal(status.planApprovalEvidence[0].validation, 'not-cryptographically-verified');
  } finally {
    cleanup(f);
  }
});

test('treats two drafts for the same plan ID and revision with different hashes as a conflict', () => {
  const f = fixture();
  try {
    const runId = 'revision-hash-conflict-run';
    const { developer, state } = appendPlanRevisionChain(f, runId, [
      planIdentity({ planRevision: '2', planHash: 'hash-a' }),
      planIdentity({ planRevision: '2', planHash: 'hash-b' }),
    ]);

    const status = state.readMaintenanceRunStatus(developer);
    assert.equal(status.status, 'invalid');
    assert.equal(status.planStatus, 'invalid');
    assert.equal(status.executionStatus, 'not_started');
    assert.ok(status.lifecycleIssues.some((issue) =>
      /same plan ID and revision with different plan hashes/.test(issue.message)));
    assert.equal(status.planRevisions.length, 1);
    assert.equal(status.planRevisions[0].status, 'conflicted');
    assert.deepEqual(status.planRevisions[0].planHashes, ['hash-a', 'hash-b']);
  } finally {
    cleanup(f);
  }
});

test('treats drafts for two different plan IDs as a conflict', () => {
  const f = fixture();
  try {
    const runId = 'plan-id-conflict-run';
    const { developer, state } = appendPlanRevisionChain(f, runId, [
      planIdentity({ planId: 'plan-01', planRevision: '1', planHash: 'hash-01' }),
      planIdentity({ planId: 'plan-02', planRevision: '1', planHash: 'hash-02' }),
    ]);

    const status = state.readMaintenanceRunStatus(developer);
    assert.equal(status.status, 'invalid');
    assert.equal(status.planStatus, 'invalid');
    assert.ok(status.lifecycleIssues.some((issue) => /more than one plan ID/.test(issue.message)));
    assert.equal(status.currentPlanRevision, null);
    assert.equal(status.approvedPlanRevision, null);
  } finally {
    cleanup(f);
  }
});

test('an approval that references an unknown draft still fails closed inside a revision chain', () => {
  const f = fixture();
  try {
    const runId = 'unknown-draft-chain-run';
    const revisionTwo = planIdentity({ planRevision: '2', planHash: 'hash-r2' });
    const { developer, reviewer, state } = appendPlanRevisionChain(f, runId, [
      planIdentity({ planRevision: '1', planHash: 'hash-r1' }),
      revisionTwo,
    ]);
    state.appendMaintenanceRunEvent(reviewer, {
      type: 'plan_approved',
      details: {
        ...revisionTwo,
        draftEventId: 'missing-draft-event',
        evidenceRef: 'review-record://plan-01-r2',
      },
    });

    const status = state.readMaintenanceRunStatus(developer);
    assert.equal(status.status, 'invalid');
    assert.equal(status.planStatus, 'invalid');
    assert.ok(status.lifecycleIssues.some((issue) => /valid plan_drafted event/.test(issue.message)));
    assert.equal(status.currentPlanRevision.planRevision, '2');
    assert.equal(status.currentPlanRevision.approvalRecorded, false);
    assert.equal(status.approvedPlanRevision, null);
  } finally {
    cleanup(f);
  }
});

test('reports the plan status and the four owner decisions as open for a valid revision chain', () => {
  const f = fixture();
  try {
    const runId = 'revision-chain-owner-decisions-run';
    const revisionTwo = planIdentity({ planRevision: '2', planHash: 'hash-r2' });
    const { developer, reviewer, state, drafts } = appendPlanRevisionChain(f, runId, [
      planIdentity({ planRevision: '1', planHash: 'hash-r1' }),
      revisionTwo,
    ]);
    state.appendMaintenanceRunEvent(reviewer, {
      type: 'plan_approved',
      details: {
        ...revisionTwo,
        draftEventId: drafts[1].eventId,
        evidenceRef: 'review-record://plan-01-r2',
      },
    });

    const status = state.readMaintenanceRunStatus(developer);
    assert.equal(status.planStatus, 'approval-recorded');
    assert.deepEqual(status.ownerDecisions.map(({ decisionId, status: decisionStatus }) => ({
      decisionId,
      status: decisionStatus,
    })), [
      { decisionId: 'B1', status: 'open' },
      { decisionId: 'O-4', status: 'open' },
      { decisionId: 'B10', status: 'open' },
      { decisionId: 'credential-residual', status: 'open' },
    ]);
  } finally {
    cleanup(f);
  }
});

test('a revision chain approval never becomes an authenticated approval', () => {
  const f = fixture();
  try {
    const runId = 'revision-chain-authentication-run';
    const revisionTwo = planIdentity({ planRevision: '2', planHash: 'hash-r2' });
    const { developer, reviewer, state, drafts } = appendPlanRevisionChain(f, runId, [
      planIdentity({ planRevision: '1', planHash: 'hash-r1' }),
      revisionTwo,
    ]);
    state.appendMaintenanceRunEvent(reviewer, {
      type: 'plan_approved',
      details: {
        ...revisionTwo,
        draftEventId: drafts[1].eventId,
        evidenceRef: 'review-record://plan-01-r2',
      },
    });

    const status = state.readMaintenanceRunStatus(developer);
    for (const field of [
      'gateGreen',
      'ownerApproved',
      'approved',
      'authorized',
      'authenticated',
      'executionAuthorized',
    ]) {
      assert.equal(Object.hasOwn(status, field), false, `${field} must not be inferred from recorded events`);
      assert.equal(Object.hasOwn(status.currentPlanRevision, field), false);
      assert.equal(Object.hasOwn(status.approvedPlanRevision, field), false);
      for (const revision of status.planRevisions) {
        assert.equal(Object.hasOwn(revision, field), false);
      }
    }
    assert.equal(status.planApprovalEvidence[0].claimStatus, 'recorded-claim');
    assert.equal(status.planApprovalEvidence[0].validation, 'not-cryptographically-verified');
    assert.equal(status.currentPlanRevision.approvalRecorded, true);
  } finally {
    cleanup(f);
  }
});

test('completion without a recorded passing verification is reduced as invalid', () => {
  const f = fixture();
  try {
    const runId = 'missing-verification-run';
    const developer = identityFor(f, { runId, sessionId: 'developer-session-01', agent: 'developer' });
    const reviewer = identityFor(f, { runId, sessionId: 'reviewer-session-01', agent: 'code-reviewer' });
    const state = maintenanceState(f);
    const plan = planIdentity();
    const draft = state.appendMaintenanceRunEvent(developer, { type: 'plan_drafted', details: plan });
    const approval = state.appendMaintenanceRunEvent(reviewer, {
      type: 'plan_approved',
      details: { ...plan, draftEventId: draft.eventId, evidenceRef: 'review-record://plan-01' },
    });
    const start = state.appendMaintenanceRunEvent(developer, {
      type: 'execution_started',
      details: { ...plan, approvalEventId: approval.eventId },
    });
    state.appendMaintenanceRunEvent(developer, {
      type: 'execution_completed',
      details: {
        ...plan,
        startEventId: start.eventId,
        verificationEventId: 'missing-verification-event',
      },
    });

    const status = state.readMaintenanceRunStatus(developer);
    assert.equal(status.status, 'invalid');
    assert.equal(status.planStatus, 'approval-recorded');
    assert.equal(status.executionStatus, 'invalid');
    assert.ok(status.lifecycleIssues.some((issue) => /valid verification event/.test(issue.message)));
  } finally {
    cleanup(f);
  }
});

test('human-typed owner disposition remains an unverified claim without closing the decision or approving the run', () => {
  const f = fixture();
  try {
    const identity = identityFor(f, { runId: 'owner-decisions-run' });
    const state = maintenanceState(f);
    state.appendMaintenanceRunEvent(identity, {
      type: 'task_disposition',
      details: { taskId: 'B1', disposition: 'accepted' },
    });
    let status = state.readMaintenanceRunStatus(identity);
    assert.deepEqual(status.ownerDecisions.map(({ decisionId, status: decisionStatus }) => ({
      decisionId,
      status: decisionStatus,
    })), [
      { decisionId: 'B1', status: 'open' },
      { decisionId: 'O-4', status: 'open' },
      { decisionId: 'B10', status: 'open' },
      { decisionId: 'credential-residual', status: 'open' },
    ]);

    state.appendMaintenanceRunEvent(identity, {
      type: 'owner_decision_disposition',
      details: {
        actorType: 'human',
        decisionId: 'B1',
        disposition: 'accepted',
        evidenceRef: 'owner-decision-record://B1',
      },
    });
    status = state.readMaintenanceRunStatus(identity);
    const ownerDecision = status.ownerDecisions[0];
    assert.equal(ownerDecision.decisionId, 'B1');
    assert.equal(ownerDecision.status, 'disposition-claim-recorded');
    assert.equal(ownerDecision.disposition, 'accepted');
    assert.equal(ownerDecision.evidenceRef, 'owner-decision-record://B1');
    assert.ok(ownerDecision.eventId);
    assert.equal(ownerDecision.actorTypeClaim, 'human');
    assert.equal(Object.hasOwn(ownerDecision, 'actorType'), false);
    assert.equal(ownerDecision.claimStatus, 'not-independently-verified');
    assert.equal(status.status, 'not_started');
    assert.equal(status.planStatus, 'not_drafted');
    assert.equal(status.executionStatus, 'not_started');
    for (const field of ['ownerApproved', 'accepted', 'gateGreen']) {
      assert.equal(Object.hasOwn(status, field), false);
      assert.equal(Object.hasOwn(ownerDecision, field), false);
    }
    assert.deepEqual(status.ownerDecisions.slice(1).map(({ decisionId, status: decisionStatus }) => ({
      decisionId,
      status: decisionStatus,
    })), [
      { decisionId: 'O-4', status: 'open' },
      { decisionId: 'B10', status: 'open' },
      { decisionId: 'credential-residual', status: 'open' },
    ]);
  } finally {
    cleanup(f);
  }
});

test('concurrent run-event appends from separate sessions do not overwrite or lose events', async () => {
  const f = fixture();
  try {
    const runId = 'concurrent-run-01';
    const identities = [
      identityFor(f, { runId, sessionId: 'developer-session-02', agent: 'developer' }),
      identityFor(f, { runId, sessionId: 'reviewer-session-02', agent: 'code-reviewer' }),
    ];
    for (const identity of identities) maintenanceState(f).startMaintenanceSession(identity);
    const sessionRecords = identities.map((identity) => readSessionRecord(f, identity.sessionId));
    const source = [
      "const { appendMaintenanceRunEvent } = require(process.env.MAINTENANCE_STATE_MODULE);",
      'const identity = JSON.parse(process.env.MAINTENANCE_EVENT_IDENTITY);',
      'const count = Number(process.env.MAINTENANCE_EVENT_COUNT);',
      'for (let index = 0; index < count; index += 1) {',
      "  appendMaintenanceRunEvent(identity, { type: 'task_disposition', details: { taskId: identity.agent + '-' + index, disposition: 'completed' } });",
      '}',
    ].join('\n');
    const eventCountPerWriter = 12;
    const writers = identities.map((identity) => runNodeProcess(['-e', source], {
      ...process.env,
      MAINTENANCE_STATE_MODULE: f.stateScript,
      MAINTENANCE_EVENT_IDENTITY: JSON.stringify(identity),
      MAINTENANCE_EVENT_COUNT: String(eventCountPerWriter),
    }));
    const results = await Promise.all(writers);
    for (const result of results) assert.equal(result.status, 0, result.stderr);

    const events = readRunEvents(f, runId);
    assert.equal(events.length, eventCountPerWriter * identities.length);
    assert.equal(new Set(events.map(({ record }) => record.eventId)).size, events.length);
    assert.deepEqual(
      new Set(events.map(({ record }) => record.agent)),
      new Set(['developer', 'code-reviewer']),
    );
    assert.equal(maintenanceState(f).readMaintenanceRunStatus(identities[0]).eventCount, events.length);
    identities.forEach((identity, index) => {
      assert.deepEqual(readSessionRecord(f, identity.sessionId), sessionRecords[index]);
    });
  } finally {
    cleanup(f);
  }
});

test('rejects missing required flags and unsupported scope', () => {
  const f = fixture();
  try {
    const base = argsFor(f);
    for (const flag of ['--scope', '--agent', '--repo-root', '--state-root']) {
      const args = base.filter((arg, index) => arg !== flag && base[index - 1] !== flag);
      assertRejected(f, args, /Missing required argument/);
    }
    const missingValue = base.filter((arg, index) => arg !== '--scope' && base[index - 1] !== '--scope');
    assertRejected(f, [...missingValue, '--scope'], /Missing value for --scope/);
    const unsupported = argsFor(f);
    unsupported[1] = 'product';
    assertRejected(f, unsupported, /Unsupported scope/);
  } finally {
    cleanup(f);
  }
});

test('rejects missing and relative state roots', () => {
  const f = fixture();
  try {
    assertRejected(f, argsFor(f).filter((arg, index, all) => arg !== '--state-root' && all[index - 1] !== '--state-root'), /Missing required argument/);
    const relative = argsFor(f);
    relative[relative.indexOf('--state-root') + 1] = 'state';
    assertRejected(f, relative, /--state-root must be absolute/);
  } finally {
    cleanup(f);
  }
});

test('rejects a state root inside the temporary repository', () => {
  const f = fixture();
  try {
    const inside = path.join(f.repoRoot, 'state');
    fs.mkdirSync(inside);
    const args = argsFor(f);
    args[args.indexOf('--state-root') + 1] = inside;
    assertRejected(f, args, /must be disjoint/);
  } finally {
    cleanup(f);
  }
});

test('session helper independently rejects overlapping roots before writing', () => {
  const f = fixture();
  try {
    const inside = path.join(f.repoRoot, 'state');
    fs.mkdirSync(inside);
    fs.chmodSync(inside, 0o700);
    const beforeInside = snapshotTree(f.tempRoot);
    assert.throws(
      () => maintenanceState(f).startMaintenanceSession(identityFor(f, { stateRoot: inside })),
      /External state root must be disjoint from repository root/,
    );
    const invalidIdentity = identityFor(f, { stateRoot: inside, runId: 'overlap-run' });
    assert.throws(
      () => maintenanceState(f).appendMaintenanceRunEvent(invalidIdentity, { type: 'plan_drafted', details: {} }),
      /External state root must be disjoint from repository root/,
    );
    assert.throws(
      () => maintenanceState(f).readMaintenanceRunStatus(invalidIdentity),
      /External state root must be disjoint from repository root/,
    );
    assert.throws(
      () => maintenanceState(f).getMaintenanceArtifactRoot(invalidIdentity),
      /External state root must be disjoint from repository root/,
    );
    assert.throws(
      () => maintenanceState(f).assertMaintenanceArtifactPath(invalidIdentity, path.join(f.repoRoot, 'artifacts', 'output', 'maintenance', 'overlap-run', 'plan.md')),
      /External state root must be disjoint from repository root/,
    );
    assert.deepEqual(snapshotTree(f.tempRoot), beforeInside);

    const beforeParent = snapshotTree(f.tempRoot);
    assert.throws(
      () => maintenanceState(f).startMaintenanceSession(identityFor(f, { stateRoot: f.tempRoot })),
      /External state root must be disjoint from repository root/,
    );
    assert.deepEqual(snapshotTree(f.tempRoot), beforeParent);

    const impostorRepo = path.join(f.tempRoot, 'impostor-repo');
    fs.mkdirSync(impostorRepo);
    const mismatchedRoots = identityFor(f, { runId: 'mismatched-repo' });
    mismatchedRoots.repoRoot = fs.realpathSync(impostorRepo);
    const beforeMismatchedRoots = snapshotTree(f.tempRoot);
    assert.throws(
      () => maintenanceState(f).startMaintenanceSession(mismatchedRoots),
      /Repository root must resolve to this maintenance helper repository/,
    );
    assert.deepEqual(snapshotTree(f.tempRoot), beforeMismatchedRoots);
  } finally {
    cleanup(f);
  }
});

test('artifact helper allows only the exact maintenance run subtree without creating it', () => {
  const f = fixture();
  try {
    const identity = identityFor(f, { runId: 'artifact-run-01' });
    const artifactRoot = maintenanceState(f).getMaintenanceArtifactRoot(identity);
    const planPath = path.join(artifactRoot, 'plan.md');
    assert.equal(artifactRoot, path.join(f.repoRoot, 'artifacts', 'output', 'maintenance', identity.runId));
    assert.equal(maintenanceState(f).assertMaintenanceArtifactPath(identity, planPath), planPath);
    assert.equal(fs.existsSync(artifactRoot), false, 'path validation must not create artifact directories');

    for (const rejectedPath of [
      path.join(f.repoRoot, 'artifacts', 'output', 'unrelated', 'plan.md'),
      path.join(f.repoRoot, 'artifacts', 'output', 'pipeline-state.json'),
      path.join(f.repoRoot, 'artifacts', 'output', 'sprint-status.yaml'),
      path.join(f.repoRoot, 'artifacts', 'output', 'maintenance-sibling', identity.runId, 'plan.md'),
      path.join(f.repoRoot, 'artifacts', 'output', 'maintenance', `${identity.runId}-sibling`, 'plan.md'),
      path.join(f.repoRoot, 'artifacts', 'memory', 'project-context.md'),
      path.join(f.repoRoot, '.agents', 'state', 'sessions', 'session.json'),
      path.join(f.stateRoot, 'runs', identity.runId, 'events', 'event.json'),
    ]) {
      assert.throws(
        () => maintenanceState(f).assertMaintenanceArtifactPath(identity, rejectedPath),
        /must stay under this maintenance run artifact root/,
      );
    }

    const traversalPath = `${artifactRoot}${path.sep}..${path.sep}other-run${path.sep}plan.md`;
    assert.throws(
      () => maintenanceState(f).assertMaintenanceArtifactPath(identity, traversalPath),
      /must not contain traversal components/,
    );
    assert.throws(() => maintenanceState(f).assertMaintenanceArtifactPath(identity, 'artifacts/output/plan.md'), /must be absolute/);

    const maintenanceDirectory = path.dirname(artifactRoot);
    const outside = path.join(f.tempRoot, 'outside-artifacts');
    fs.mkdirSync(maintenanceDirectory, { recursive: true });
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, artifactRoot, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(
      () => maintenanceState(f).assertMaintenanceArtifactPath(identity, planPath),
      /must not contain symlinked components/,
    );
  } finally {
    cleanup(f);
  }
});

test('rejects traversal that resolves to a state root inside the repository', () => {
  const f = fixture();
  try {
    const nested = path.join(f.repoRoot, 'nested');
    const inside = path.join(f.repoRoot, 'state');
    fs.mkdirSync(nested);
    fs.mkdirSync(inside);
    fs.chmodSync(inside, 0o700);
    const args = argsFor(f);
    args[args.indexOf('--state-root') + 1] = [nested, '..', 'state'].join(path.sep);
    assertRejected(f, args, /must be disjoint/);
  } finally {
    cleanup(f);
  }
});

test('rejects a state root that is a parent of the temporary repository', () => {
  const f = fixture();
  try {
    const args = argsFor(f);
    args[args.indexOf('--state-root') + 1] = f.tempRoot;
    assertRejected(f, args, /must be disjoint/);
  } finally {
    cleanup(f);
  }
});

test('requires an existing external state root and the exact repository root', () => {
  const f = fixture();
  try {
    const missingState = argsFor(f);
    missingState[missingState.indexOf('--state-root') + 1] = path.join(f.tempRoot, 'missing-state');
    assertRejected(f, missingState, /must exist and resolve to a directory/);

    const relativeRepo = argsFor(f);
    relativeRepo[relativeRepo.indexOf('--repo-root') + 1] = 'repo';
    assertRejected(f, relativeRepo, /--repo-root must be absolute/);

    const wrongRepo = argsFor(f);
    wrongRepo[wrongRepo.indexOf('--repo-root') + 1] = f.stateRoot;
    assertRejected(f, wrongRepo, /--repo-root must resolve to this repository/);
  } finally {
    cleanup(f);
  }
});

test('rejects a state-root symlink even when it targets another external directory', () => {
  const f = fixture();
  try {
    const outsideState = path.join(f.tempRoot, 'outside-state');
    const link = path.join(f.tempRoot, 'state-link');
    fs.mkdirSync(outsideState);
    fs.symlinkSync(outsideState, link, process.platform === 'win32' ? 'junction' : 'dir');
    const args = argsFor(f);
    args[args.indexOf('--state-root') + 1] = link;
    assertRejected(f, args, /must resolve to a non-symlink directory/);
  } finally {
    cleanup(f);
  }
});

test('rejects unsafe IDs and accepts safe supplied run and session IDs', () => {
  const f = fixture();
  try {
    const unsafe = [...argsFor(f), '--run-id', '../../escape'];
    assertRejected(f, unsafe, /--run-id must be/);
    const unsafeSession = [...argsFor(f), '--session-id', '../../escape'];
    assertRejected(f, unsafeSession, /--session-id must be/);
    const runId = 'maintenance_01-safe';
    const sessionId = 'developer-session-01';
    const safe = [...argsFor(f), '--run-id', runId, '--session-id', sessionId];
    const result = run(f, safe);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).runId, runId);
    assert.equal(JSON.parse(result.stdout).sessionId, sessionId);
    assertOnlySessionRecordChanges(f, result.snapshotBefore, sessionId);
    assertExactSessionTree(f, sessionId);
  } finally {
    cleanup(f);
  }
});

test('rejects matching run and session IDs at CLI and helper boundaries before writing', () => {
  const f = fixture();
  try {
    const sharedId = 'shared-maintenance-id';
    const cliBefore = snapshotTree(f.tempRoot);
    const cliResult = run(f, [...argsFor(f), '--run-id', sharedId, '--session-id', sharedId]);
    assert.equal(cliResult.status, 2, cliResult.stderr);
    assert.match(cliResult.stderr, /--run-id and --session-id must be different/);
    assert.deepEqual(snapshotTree(f.tempRoot), cliBefore);

    const helperBefore = snapshotTree(f.tempRoot);
    assert.throws(
      () => maintenanceState(f).startMaintenanceSession(identityFor(f, {
        runId: sharedId,
        sessionId: sharedId,
      })),
      /Maintenance run ID and session ID must be different/,
    );
    assert.deepEqual(snapshotTree(f.tempRoot), helperBefore);
  } finally {
    cleanup(f);
  }
});

test('rejects symlinked sessions and session directories without writing through them', () => {
  const sessionsFixture = fixture();
  try {
    const outside = path.join(sessionsFixture.tempRoot, 'outside-sessions');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'sentinel.txt'), 'unchanged\n');
    fs.symlinkSync(outside, path.join(sessionsFixture.stateRoot, 'sessions'), process.platform === 'win32' ? 'junction' : 'dir');
    const before = snapshotTree(sessionsFixture.tempRoot);
    const result = run(sessionsFixture, [...argsFor(sessionsFixture), '--session-id', 'safe-session']);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /sessions directory must be a non-symlink directory/);
    assert.deepEqual(snapshotTree(sessionsFixture.tempRoot), before);
  } finally {
    cleanup(sessionsFixture);
  }

  const sessionFixture = fixture();
  try {
    const sessionId = 'safe-session';
    const sessionsDirectory = path.join(sessionFixture.stateRoot, 'sessions');
    const outside = path.join(sessionFixture.tempRoot, 'outside-session');
    fs.mkdirSync(sessionsDirectory);
    fs.chmodSync(sessionsDirectory, 0o700);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'sentinel.txt'), 'unchanged\n');
    fs.symlinkSync(outside, path.join(sessionsDirectory, sessionId), process.platform === 'win32' ? 'junction' : 'dir');
    const before = snapshotTree(sessionFixture.tempRoot);
    const result = run(sessionFixture, [...argsFor(sessionFixture), '--session-id', sessionId]);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /session directory must be a non-symlink directory/);
    assert.deepEqual(snapshotTree(sessionFixture.tempRoot), before);
  } finally {
    cleanup(sessionFixture);
  }
});

test('fails closed on malformed existing session records', () => {
  const f = fixture();
  try {
    const sessionId = 'malformed-session';
    const sessionDirectory = path.join(f.stateRoot, 'sessions', sessionId);
    fs.mkdirSync(sessionDirectory, { recursive: true });
    fs.chmodSync(path.join(f.stateRoot, 'sessions'), 0o700);
    fs.chmodSync(sessionDirectory, 0o700);
    fs.writeFileSync(path.join(sessionDirectory, 'session.json'), '{not valid json');
    const before = snapshotTree(f.tempRoot);
    const result = run(f, [...argsFor(f), '--run-id', 'malformed-run', '--session-id', sessionId]);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /Session ID already exists/);
    assert.deepEqual(snapshotTree(f.tempRoot), before);
  } finally {
    cleanup(f);
  }
});

test('rejects non-directory collisions in sessions and session paths', () => {
  const sessionsFixture = fixture();
  try {
    fs.writeFileSync(path.join(sessionsFixture.stateRoot, 'sessions'), 'not a directory');
    const before = snapshotTree(sessionsFixture.tempRoot);
    const result = run(sessionsFixture, [...argsFor(sessionsFixture), '--session-id', 'safe-session']);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /sessions directory must be a non-symlink directory/);
    assert.deepEqual(snapshotTree(sessionsFixture.tempRoot), before);
  } finally {
    cleanup(sessionsFixture);
  }

  const sessionFixture = fixture();
  try {
    const sessionId = 'safe-session';
    const sessionsDirectory = path.join(sessionFixture.stateRoot, 'sessions');
    fs.mkdirSync(sessionsDirectory);
    fs.chmodSync(sessionsDirectory, 0o700);
    fs.writeFileSync(path.join(sessionsDirectory, sessionId), 'not a directory');
    const before = snapshotTree(sessionFixture.tempRoot);
    const result = run(sessionFixture, [...argsFor(sessionFixture), '--session-id', sessionId]);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /session directory must be a non-symlink directory/);
    assert.deepEqual(snapshotTree(sessionFixture.tempRoot), before);
  } finally {
    cleanup(sessionFixture);
  }
});

test('rejects a group-writable state root', { skip: !POSIX_PERMISSION_CHECKS_SUPPORTED }, () => {
  const f = fixture();
  try {
    const mode = fs.statSync(f.stateRoot).mode & 0o777;
    fs.chmodSync(f.stateRoot, mode | 0o020);
    const before = snapshotTree(f.tempRoot);
    const result = run(f, [...argsFor(f), '--session-id', 'permission-check']);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /must not be group- or world-writable/);
    assert.deepEqual(snapshotTree(f.tempRoot), before);
  } finally {
    cleanup(f);
  }
});

test('rejects a group-writable existing sessions directory', { skip: !POSIX_PERMISSION_CHECKS_SUPPORTED }, () => {
  const f = fixture();
  try {
    const sessionsDirectory = path.join(f.stateRoot, 'sessions');
    fs.mkdirSync(sessionsDirectory);
    const mode = fs.statSync(sessionsDirectory).mode & 0o777;
    fs.chmodSync(sessionsDirectory, mode | 0o020);
    const before = snapshotTree(f.tempRoot);
    const result = run(f, [...argsFor(f), '--session-id', 'permission-check']);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /sessions directory must not be group- or world-writable/);
    assert.deepEqual(snapshotTree(f.tempRoot), before);
  } finally {
    cleanup(f);
  }
});

test('does not import product session, orchestrator, worktree, or step-tracking helpers', () => {
  const source = [SOURCE, STATE_SOURCE].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /session_start\.js|session-start|orchestrator_state\.js|worktree\.js|step[_-]tracker/i);
});

test('rejects unknown and duplicate flags', () => {
  const f = fixture();
  try {
    assertRejected(f, [...argsFor(f), '--unexpected', 'value'], /Unknown argument/);
    assertRejected(f, [...argsFor(f), '--scope', 'maintenance'], /Duplicate argument: --scope/);
  } finally {
    cleanup(f);
  }
});

test('filesystem preload guard blocks real and temporary product roots and permits only one explicit run subtree', () => {
  const f = fixture();
  try {
    const productOutputDirectory = path.join(f.repoRoot, 'artifacts', 'output');
    const productMemoryDirectory = path.join(f.repoRoot, 'artifacts', 'memory');
    const productAgentStateDirectory = path.join(f.repoRoot, '.agents', 'state');
    const productStateFiles = [
      { file: path.join(productOutputDirectory, 'pipeline-state.json'), contents: '{"pipeline":"untouched"}\n' },
      { file: path.join(productOutputDirectory, 'sprint-status.yaml'), contents: 'status: untouched\n' },
      { file: path.join(productMemoryDirectory, 'project-context.md'), contents: 'context untouched\n' },
      { file: path.join(productMemoryDirectory, 'active-decisions.md'), contents: 'decisions untouched\n' },
      { file: path.join(productMemoryDirectory, 'lessons-learned.md'), contents: 'lessons untouched\n' },
      { file: path.join(productAgentStateDirectory, 'sentinel.json'), contents: '{"state":"untouched"}\n' },
    ];
    for (const stateFile of productStateFiles) {
      fs.mkdirSync(path.dirname(stateFile.file), { recursive: true });
      fs.writeFileSync(stateFile.file, stateFile.contents);
    }
    const guardPath = createFilesystemGuard(f);
    const protectedRoots = [
      productOutputDirectory,
      productMemoryDirectory,
      productAgentStateDirectory,
      path.join(REAL_REPO_ROOT, 'artifacts', 'output'),
      path.join(REAL_REPO_ROOT, 'artifacts', 'memory'),
      path.join(REAL_REPO_ROOT, '.agents', 'state'),
    ];
    const env = {
      MAINTENANCE_PROTECTED_ROOTS: JSON.stringify(protectedRoots),
      MAINTENANCE_ALLOWED_ARTIFACT_ROOTS: JSON.stringify([]),
      MAINTENANCE_ALLOWED_FILE: path.join(f.repoRoot, 'fixture.txt'),
    };

    const realCheckoutPipelinePath = path.join(REAL_REPO_ROOT, 'artifacts', 'output', 'pipeline-state.json');
    const blockedRealRead = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').readFileSync(process.env.MAINTENANCE_PROBE_PATH, 'utf8')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env, MAINTENANCE_PROBE_PATH: realCheckoutPipelinePath },
    });
    assert.notEqual(blockedRealRead.status, 0, 'real-checkout probe must fail before opening the protected path');
    assert.match(blockedRealRead.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:readFileSync/);

    const temporaryPipelinePath = productStateFiles[0].file;
    const blockedTemporaryRead = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').readFileSync(process.env.MAINTENANCE_PROBE_PATH, 'utf8')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env, MAINTENANCE_PROBE_PATH: temporaryPipelinePath },
    });
    assert.notEqual(blockedTemporaryRead.status, 0);
    assert.match(blockedTemporaryRead.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:readFileSync/);

    const blockedWrite = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').writeFileSync(process.env.MAINTENANCE_PROBE_PATH, 'overwritten')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env, MAINTENANCE_PROBE_PATH: productStateFiles[1].file },
    });
    assert.notEqual(blockedWrite.status, 0);
    assert.match(blockedWrite.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:writeFileSync/);
    assert.equal(fs.readFileSync(temporaryPipelinePath, 'utf8'), productStateFiles[0].contents);
    assert.equal(fs.readFileSync(productStateFiles[1].file, 'utf8'), productStateFiles[1].contents);

    const blockedRealWrite = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').writeFileSync(process.env.MAINTENANCE_PROBE_PATH, 'must-not-write')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: { ...process.env, ...env, MAINTENANCE_PROBE_PATH: realCheckoutPipelinePath },
    });
    assert.notEqual(blockedRealWrite.status, 0);
    assert.match(blockedRealWrite.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:writeFileSync/);

    const blockedChildLaunch = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:child_process').spawnSync(process.execPath, ['-e', 'process.exit(0)'])",
    ], { cwd: f.tempRoot, encoding: 'utf8', env: { ...process.env, ...env } });
    assert.notEqual(blockedChildLaunch.status, 0);
    assert.match(blockedChildLaunch.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:childProcess:spawnSync/);

    const allowedProbe = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "process.stdout.write(require('node:fs').readFileSync(process.env.MAINTENANCE_ALLOWED_FILE, 'utf8'))",
    ], { cwd: f.tempRoot, encoding: 'utf8', env: { ...process.env, ...env } });
    assert.equal(allowedProbe.status, 0, allowedProbe.stderr);
    assert.equal(allowedProbe.stdout, 'temporary repository\n');

    const artifactIdentity = identityFor(f, { runId: 'guarded-run' });
    const artifactRoot = maintenanceState(f).getMaintenanceArtifactRoot(artifactIdentity);
    const allowedArtifact = path.join(artifactRoot, 'plan.md');
    fs.mkdirSync(artifactRoot, { recursive: true });
    fs.writeFileSync(allowedArtifact, 'temporary maintenance artifact\n');
    assert.equal(maintenanceState(f).assertMaintenanceArtifactPath(artifactIdentity, allowedArtifact), allowedArtifact);
    const allowedArtifactProbe = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "process.stdout.write(require('node:fs').readFileSync(process.env.MAINTENANCE_PROBE_PATH, 'utf8'))",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...env,
        MAINTENANCE_ALLOWED_ARTIFACT_ROOTS: JSON.stringify([artifactRoot]),
        MAINTENANCE_PROBE_PATH: allowedArtifact,
      },
    });
    assert.equal(allowedArtifactProbe.status, 0, allowedArtifactProbe.stderr);
    assert.equal(allowedArtifactProbe.stdout, 'temporary maintenance artifact\n');

    const linkedMemoryDirectory = path.join(artifactRoot, 'linked-memory');
    const linkedMemorySentinel = path.join(linkedMemoryDirectory, path.basename(productStateFiles[2].file));
    fs.symlinkSync(productMemoryDirectory, linkedMemoryDirectory, process.platform === 'win32' ? 'junction' : 'dir');
    const blockedSymlinkRead = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').readFileSync(process.env.MAINTENANCE_PROBE_PATH, 'utf8')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...env,
        MAINTENANCE_ALLOWED_ARTIFACT_ROOTS: JSON.stringify([artifactRoot]),
        MAINTENANCE_PROBE_PATH: linkedMemorySentinel,
      },
    });
    assert.notEqual(blockedSymlinkRead.status, 0);
    assert.match(blockedSymlinkRead.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:readFileSync/);

    const blockedSymlinkWrite = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').writeFileSync(process.env.MAINTENANCE_PROBE_PATH, 'overwritten')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...env,
        MAINTENANCE_ALLOWED_ARTIFACT_ROOTS: JSON.stringify([artifactRoot]),
        MAINTENANCE_PROBE_PATH: linkedMemorySentinel,
      },
    });
    assert.notEqual(blockedSymlinkWrite.status, 0);
    assert.match(blockedSymlinkWrite.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:writeFileSync/);
    assert.equal(fs.readFileSync(productStateFiles[2].file, 'utf8'), productStateFiles[2].contents);

    for (const rejectedPath of [
      path.join(productOutputDirectory, 'maintenance', 'some-other-run', 'plan.md'),
      path.join(productOutputDirectory, 'maintenance', 'guarded-run-sibling', 'plan.md'),
      productStateFiles[0].file,
      productStateFiles[1].file,
      productStateFiles[2].file,
      productStateFiles[5].file,
      realCheckoutPipelinePath,
      path.join(REAL_REPO_ROOT, 'artifacts', 'memory', 'project-context.md'),
      path.join(REAL_REPO_ROOT, '.agents', 'state', 'sentinel.json'),
    ]) {
      const blocked = spawnSync(process.execPath, [
        '--require', guardPath,
        '-e', "require('node:fs').readFileSync(process.env.MAINTENANCE_PROBE_PATH, 'utf8')",
      ], {
        cwd: f.tempRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          ...env,
          MAINTENANCE_ALLOWED_ARTIFACT_ROOTS: JSON.stringify([artifactRoot]),
          MAINTENANCE_PROBE_PATH: rejectedPath,
        },
      });
      assert.notEqual(blocked.status, 0, `guard unexpectedly allowed ${rejectedPath}`);
      assert.match(blocked.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:readFileSync/);
    }

    for (const stateFile of productStateFiles) {
      assert.equal(fs.readFileSync(stateFile.file, 'utf8'), stateFile.contents);
    }
    const result = run(f, [...argsFor(f), '--run-id', 'guarded-run-startup', '--session-id', 'guarded-session'], {
      preload: guardPath,
      env,
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.runId, 'guarded-run-startup');
    assert.equal(output.sessionId, 'guarded-session');
    assert.equal(fs.existsSync(output.artifactRoot), false, 'startup must not materialize its returned path');
    assertOnlySessionRecordChanges(f, result.snapshotBefore, output.sessionId);
    for (const stateFile of productStateFiles) {
      assert.equal(fs.readFileSync(stateFile.file, 'utf8'), stateFile.contents);
    }
  } finally {
    cleanup(f);
  }
});

test('filesystem preload guard blocks a missing-leaf write through an allowlisted symlink into product memory', () => {
  const f = fixture();
  try {
    const artifactRoot = path.join(f.repoRoot, 'artifacts', 'output', 'maintenance', 'allowlisted-run');
    const productMemoryDirectory = path.join(f.repoRoot, 'artifacts', 'memory');
    const linkedMemoryDirectory = path.join(artifactRoot, 'linked-memory');
    const protectedSentinel = path.join(productMemoryDirectory, 'project-context.md');
    const missingLeaf = path.join(linkedMemoryDirectory, 'new-entry.md');
    fs.mkdirSync(artifactRoot, { recursive: true });
    fs.mkdirSync(productMemoryDirectory, { recursive: true });
    fs.writeFileSync(protectedSentinel, 'context untouched\n');
    fs.symlinkSync(productMemoryDirectory, linkedMemoryDirectory, process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(fs.lstatSync(linkedMemoryDirectory).isSymbolicLink(), true);
    assert.equal(fs.existsSync(missingLeaf), false);

    const protectedTreeBefore = snapshotTree(productMemoryDirectory);
    const guardPath = createFilesystemGuard(f);
    const blockedWrite = spawnSync(process.execPath, [
      '--require', guardPath,
      '-e', "require('node:fs').writeFileSync(process.env.MAINTENANCE_PROBE_PATH, 'must-not-write')",
    ], {
      cwd: f.tempRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        MAINTENANCE_PROTECTED_ROOTS: JSON.stringify([productMemoryDirectory]),
        MAINTENANCE_ALLOWED_ARTIFACT_ROOTS: JSON.stringify([artifactRoot]),
        MAINTENANCE_PROBE_PATH: missingLeaf,
      },
    });

    assert.notEqual(blockedWrite.status, 0, blockedWrite.stderr);
    assert.match(blockedWrite.stderr, /MAINTENANCE_FS_GUARD_BLOCKED:writeFileSync/);
    assert.equal(fs.existsSync(missingLeaf), false, 'guard must block before creating the missing leaf');
    assert.deepEqual(snapshotTree(productMemoryDirectory), protectedTreeBefore, 'protected product-memory tree must remain unchanged');
    assert.equal(fs.readFileSync(protectedSentinel, 'utf8'), 'context untouched\n');
  } finally {
    cleanup(f);
  }
});

test('maintenance state CLI records run events, reports claims, and returns its uncreated artifact root', () => {
  const f = fixture();
  try {
    const runId = 'maintenance-state-cli-run';
    const artifactRoot = path.join(f.repoRoot, 'artifacts', 'output', 'maintenance', runId);
    const guardPath = createFilesystemGuard(f);
    const options = {
      preload: guardPath,
      env: {
        MAINTENANCE_PROTECTED_ROOTS: JSON.stringify([
          path.join(f.repoRoot, 'artifacts', 'output'),
          path.join(f.repoRoot, 'artifacts', 'memory'),
          path.join(f.repoRoot, '.agents', 'state'),
          path.join(REAL_REPO_ROOT, 'artifacts', 'output'),
          path.join(REAL_REPO_ROOT, 'artifacts', 'memory'),
          path.join(REAL_REPO_ROOT, '.agents', 'state'),
        ]),
        MAINTENANCE_ALLOWED_ARTIFACT_ROOTS: JSON.stringify([artifactRoot]),
      },
    };
    const base = maintenanceStateArgsFor(f, runId);
    const repoBefore = snapshotTree(f.repoRoot);
    const append = (type, details) => {
      const result = runState(f, [
        'event', ...base,
        '--type', type,
        '--details-json', JSON.stringify(details),
        '--agent', 'developer',
        '--session-id', 'developer-session-01',
      ], options);
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(result.stdout);
    };

    const plan = planIdentity();
    const draft = append('plan_drafted', plan);
    const approval = append('plan_approved', {
      ...plan,
      draftEventId: draft.eventId,
      evidenceRef: 'review-record://maintenance-state-cli-plan',
    });
    const start = append('execution_started', {
      ...plan,
      approvalEventId: approval.eventId,
    });
    const verification = append('verification', {
      ...plan,
      startEventId: start.eventId,
      check: 'targeted-test',
      result: 'passed',
      evidenceRef: 'test-report://maintenance-state-cli',
    });
    const completion = append('execution_completed', {
      ...plan,
      startEventId: start.eventId,
      verificationEventId: verification.eventId,
    });
    append('owner_decision_disposition', {
      actorType: 'human',
      decisionId: 'B1',
      disposition: 'accepted',
      evidenceRef: 'owner-decision-record://B1',
    });

    const statusResult = runState(f, ['status', ...base], options);
    assert.equal(statusResult.status, 0, statusResult.stderr);
    const status = JSON.parse(statusResult.stdout);
    assert.equal(status.runId, runId);
    assert.equal(status.status, 'completion-recorded');
    assert.equal(status.planStatus, 'approval-recorded');
    assert.equal(status.executionStatus, 'completion-recorded');
    assert.equal(status.eventCount, 6);
    assert.deepEqual(status.lifecycleIssues, []);
    assert.equal(status.planApprovalEvidence[0].eventId, approval.eventId);
    assert.equal(status.planApprovalEvidence[0].claimStatus, 'recorded-claim');
    assert.equal(status.planApprovalEvidence[0].validation, 'not-cryptographically-verified');
    assert.equal(status.completionEvidence[0].eventId, completion.eventId);
    assert.equal(status.completionEvidence[0].claimStatus, 'completion-recorded');
    assert.equal(status.completionEvidence[0].validation, 'not-externally-validated');
    assert.equal(status.ownerDecisions[0].status, 'disposition-claim-recorded');
    assert.equal(status.ownerDecisions[0].actorTypeClaim, 'human');
    assert.equal(status.ownerDecisions[0].claimStatus, 'not-independently-verified');
    for (const field of ['gateGreen', 'ownerApproved', 'approved', 'completed']) {
      assert.equal(Object.hasOwn(status, field), false, `${field} must not be inferred from recorded events`);
    }

    const artifactResult = runState(f, ['artifact-root', ...base], options);
    assert.equal(artifactResult.status, 0, artifactResult.stderr);
    assert.equal(artifactResult.stdout, `${artifactRoot}\n`, 'artifact-root must return only the validated path');
    assert.equal(fs.existsSync(artifactRoot), false, 'artifact-root must not create the run artifact directory');
    assert.deepEqual(snapshotTree(f.repoRoot), repoBefore, 'CLI commands must not read or change product state');
    assert.equal(readRunEvents(f, runId).length, 6);
  } finally {
    cleanup(f);
  }
});

test('maintenance state CLI rejects malformed, duplicate, missing, and unknown arguments without writing', () => {
  const f = fixture();
  try {
    const base = maintenanceStateArgsFor(f, 'maintenance-state-invalid-run');
    const without = (args, flag) => {
      const index = args.indexOf(flag);
      return args.filter((_, itemIndex) => itemIndex !== index && itemIndex !== index + 1);
    };

    for (const flag of ['--scope', '--repo-root', '--state-root', '--run-id']) {
      assertStateRejected(f, ['status', ...without(base, flag)], /Missing required argument/);
    }
    assertStateRejected(f, [], /A command is required/);
    assertStateRejected(f, ['unknown', ...base], /Unknown command/);
    assertStateRejected(f, ['status', ...base, '--unexpected', 'value'], /Unknown argument/);
    assertStateRejected(f, ['status', ...base, '--scope', 'maintenance'], /Duplicate argument: --scope/);
    assertStateRejected(f, ['status', ...base, '--agent', 'developer'], /Unknown argument: --agent/);

    const eventArgs = ['event', ...base, '--type', 'task_disposition', '--details-json', '{}'];
    assertStateRejected(f, ['event', ...without(base, '--run-id'), '--type', 'task_disposition', '--details-json', '{}'], /Missing required argument: --run-id/);
    assertStateRejected(f, ['event', ...base, '--type', 'task_disposition'], /Missing required argument: --details-json/);
    assertStateRejected(f, [...eventArgs, '--type', 'verification'], /Duplicate argument: --type/);
    assertStateRejected(f, ['event', ...base, '--type', 'not-allowlisted', '--details-json', '{}'], /Unsupported maintenance run event type/);
    assertStateRejected(f, ['event', ...base, '--type', 'task_disposition', '--details-json', '{'], /valid JSON/);
    assertStateRejected(f, ['event', ...base, '--type', 'task_disposition', '--details-json', '[]'], /must contain a JSON object/);
    assertStateRejected(f, [...eventArgs, '--agent', 'developer'], /must be supplied together/);
    assertStateRejected(f, ['status', ...maintenanceStateArgsFor(f, '../unsafe')], /--run-id must be/);

    const relativeState = [...base];
    relativeState[relativeState.indexOf('--state-root') + 1] = 'relative-state';
    assertStateRejected(f, ['status', ...relativeState], /External state root must be an absolute canonical path/);
  } finally {
    cleanup(f);
  }
});

test('scrubs secrets out of maintenance run event details before they are persisted or echoed', () => {
  const f = fixture();
  try {
    const runId = 'secret-scrubbing-run';
    const base = maintenanceStateArgsFor(f, runId);
    // Assembled at runtime: the scanner flags credential shapes in source, and this file must not
    // contain one. The runtime VALUE is unchanged, which is what the scrubber is asserted against.
    const awsSecret = 'AKIA' + 'IOSFODNN7EXAMPLE';
    const githubSecret = `ghp_${'A1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvWxYz'}`;
    const details = {
      taskId: 'T002',
      disposition: 'fixed',
      evidenceRef: `review-record://plan-01 ${awsSecret}`,
      nested: { credential: githubSecret, benign: 'keep-me' },
    };

    const append = runState(f, [
      'event', ...base,
      '--type', 'task_disposition',
      '--details-json', JSON.stringify(details),
      '--agent', 'developer',
      '--session-id', 'developer-session-01',
    ]);
    assert.equal(append.status, 0, append.stderr);

    const eventsDirectory = path.join(f.stateRoot, 'runs', runId, 'events');
    const eventFiles = fs.readdirSync(eventsDirectory).filter((name) => name.endsWith('.json'));
    assert.equal(eventFiles.length, 1);
    const written = fs.readFileSync(path.join(eventsDirectory, eventFiles[0]), 'utf8');

    // The raw secret must never reach the record on disk.
    assert.doesNotMatch(written, new RegExp(awsSecret));
    assert.doesNotMatch(written, new RegExp(githubSecret));
    assert.match(written, /\[REDACTED_SECRET:/);

    // A benign payload is left exactly as it was written.
    const record = JSON.parse(written);
    assert.equal(record.details.taskId, 'T002');
    assert.equal(record.details.disposition, 'fixed');
    assert.equal(record.details.nested.benign, 'keep-me');
    assert.match(record.details.evidenceRef, /review-record:\/\/plan-01/);
    assert.doesNotMatch(record.details.evidenceRef, new RegExp(awsSecret));

    // The CLI echo of the appended record must not carry the secret either.
    assert.doesNotMatch(append.stdout, new RegExp(awsSecret));
    assert.doesNotMatch(append.stdout, new RegExp(githubSecret));

    // Nor may the status echo.
    const statusResult = runState(f, ['status', ...base]);
    assert.equal(statusResult.status, 0, statusResult.stderr);
    assert.doesNotMatch(statusResult.stdout, new RegExp(awsSecret));
    assert.doesNotMatch(statusResult.stdout, new RegExp(githubSecret));
    const status = JSON.parse(statusResult.stdout);
    assert.equal(status.taskDispositions[0].details.taskId, 'T002');
    assert.equal(status.taskDispositions[0].details.nested.benign, 'keep-me');

    // The helper API applies the same control to records it appends directly.
    const identity = identityFor(f, { runId, sessionId: 'developer-session-02', agent: 'developer' });
    const appended = maintenanceState(f).appendMaintenanceRunEvent(identity, {
      type: 'task_disposition',
      details: { taskId: 'T003', disposition: 'fixed', evidenceRef: `note://${awsSecret}` },
    });
    assert.doesNotMatch(JSON.stringify(appended.details), new RegExp(awsSecret));
    assert.equal(appended.details.taskId, 'T003');
  } finally {
    cleanup(f);
  }
});

test('tolerates a stray file in the run events directory and repairs it on request', () => {
  const f = fixture();
  try {
    const runId = 'stray-file-run';
    const base = maintenanceStateArgsFor(f, runId);
    const identity = identityFor(f, { runId, sessionId: 'developer-session-01', agent: 'developer' });
    maintenanceState(f).appendMaintenanceRunEvent(identity, {
      type: 'task_disposition',
      details: { taskId: 'T002', disposition: 'fixed' },
    });

    const eventsDirectory = path.join(f.stateRoot, 'runs', runId, 'events');
    const strayFile = path.join(eventsDirectory, '.DS_Store');
    fs.writeFileSync(strayFile, 'mac metadata\n');

    // A stray file must not break any read path of the run.
    const statusResult = runState(f, ['status', ...base]);
    assert.equal(statusResult.status, 0, statusResult.stderr);
    const status = JSON.parse(statusResult.stdout);
    assert.equal(status.eventCount, 1);
    assert.equal(status.status, 'not_started');
    assert.ok(status.notes.some((note) => note.name === '.DS_Store'),
      'a stray entry must be reported as a non-fatal note');
    assert.ok(!status.lifecycleIssues.some((issue) => /\.DS_Store/.test(issue.message)),
      'a stray entry must never be reported as a lifecycle issue');

    const append = runState(f, [
      'event', ...base,
      '--type', 'task_disposition',
      '--details-json', JSON.stringify({ taskId: 'T003', disposition: 'fixed' }),
      '--agent', 'developer',
      '--session-id', 'developer-session-01',
    ]);
    assert.equal(append.status, 0, append.stderr);

    const artifactRoot = runState(f, ['artifact-root', ...base]);
    assert.equal(artifactRoot.status, 0, artifactRoot.stderr);

    // Repair removes the stray file and reports exactly what it removed.
    const repair = runState(f, ['status', ...base, '--repair']);
    assert.equal(repair.status, 0, repair.stderr);
    const repaired = JSON.parse(repair.stdout);
    assert.equal(repaired.repair.requested, true);
    assert.deepEqual(repaired.repair.removed, ['.DS_Store']);
    assert.deepEqual(repaired.repair.skipped, []);
    assert.equal(fs.existsSync(strayFile), false, 'repair must remove the stray file');
    assert.equal(repaired.eventCount, 2, 'repair must not drop run events');

    const afterRepair = runState(f, ['status', ...base]);
    assert.equal(afterRepair.status, 0, afterRepair.stderr);
    assert.deepEqual(JSON.parse(afterRepair.stdout).notes, []);
    assert.equal(JSON.parse(afterRepair.stdout).repair.requested, false);
  } finally {
    cleanup(f);
  }
});

test('reports a malformed run event record as a lifecycle issue instead of throwing', () => {
  const f = fixture();
  try {
    const runId = 'malformed-event-run';
    const base = maintenanceStateArgsFor(f, runId);
    const identity = identityFor(f, { runId, sessionId: 'developer-session-01', agent: 'developer' });
    const appended = maintenanceState(f).appendMaintenanceRunEvent(identity, {
      type: 'task_disposition',
      details: { taskId: 'T002', disposition: 'fixed' },
    });

    const eventPath = path.join(f.stateRoot, 'runs', runId, 'events', `${appended.eventId}.json`);
    fs.writeFileSync(eventPath, '{ not valid json');
    fs.chmodSync(eventPath, 0o600);

    const statusResult = runState(f, ['status', ...base]);
    assert.equal(statusResult.status, 0, statusResult.stderr);
    const status = JSON.parse(statusResult.stdout);
    assert.equal(status.status, 'invalid');
    assert.ok(status.lifecycleIssues.some((issue) => /malformed/i.test(issue.message)),
      'a malformed record must surface as a lifecycle issue');
    assert.equal(status.eventCount, 0, 'a malformed record must not be counted as a usable event');
    assert.equal(status.gateGreen, undefined);

    // A later append still succeeds: the malformed record does not wedge the run.
    const append = runState(f, [
      'event', ...base,
      '--type', 'task_disposition',
      '--details-json', JSON.stringify({ taskId: 'T003', disposition: 'fixed' }),
      '--agent', 'developer',
      '--session-id', 'developer-session-01',
    ]);
    assert.equal(append.status, 0, append.stderr);
  } finally {
    cleanup(f);
  }
});

test('requires an owner-only state root and rejects a world-writable non-sticky ancestor', { skip: !POSIX_PERMISSION_CHECKS_SUPPORTED }, () => {
  const f = fixture();
  try {
    const runId = 'permission-posture-run';
    const base = maintenanceStateArgsFor(f, runId);

    // Owner-only is accepted.
    fs.chmodSync(f.stateRoot, 0o700);
    const accepted = runState(f, ['status', ...base]);
    assert.equal(accepted.status, 0, accepted.stderr);

    // Group- or world-readable is rejected.
    fs.chmodSync(f.stateRoot, 0o755);
    const readable = runState(f, ['status', ...base]);
    assert.equal(readable.status, 2, readable.stderr);
    assert.match(readable.stderr, /must not grant group or other access/);

    // A world-writable non-sticky ancestor is rejected.
    fs.chmodSync(f.stateRoot, 0o700);
    const looseAncestor = path.join(f.tempRoot, 'loose-ancestor');
    const nestedStateRoot = path.join(looseAncestor, 'state');
    fs.mkdirSync(nestedStateRoot, { recursive: true });
    fs.chmodSync(looseAncestor, 0o777);
    fs.chmodSync(nestedStateRoot, 0o700);
    const nestedIdentity = identityFor(f, { stateRoot: nestedStateRoot, runId });
    assert.throws(
      () => maintenanceState(f).readMaintenanceRunStatus(nestedIdentity),
      /Ancestor directory .* must not be group- or world-writable/,
    );

    // The same ancestor with the sticky bit set is tolerable: another user
    // still cannot rename or replace an entry they do not own.
    fs.chmodSync(looseAncestor, 0o1777);
    const stickyIdentity = identityFor(f, { stateRoot: nestedStateRoot, runId });
    const stickyStatus = maintenanceState(f).readMaintenanceRunStatus(stickyIdentity);
    assert.equal(stickyStatus.runId, runId);
  } finally {
    cleanup(f);
  }
});

test('reports the platform capability posture in the maintenance run status', () => {
  const f = fixture();
  try {
    const runId = 'capability-posture-run';
    const identity = identityFor(f, { runId, sessionId: 'developer-session-01', agent: 'developer' });
    const state = maintenanceState(f);

    const native = state.readMaintenanceRunStatus(identity);
    assert.equal(native.capabilities.platform, process.platform);
    assert.equal(native.capabilities.posixPermissionChecks, POSIX_PERMISSION_CHECKS_SUPPORTED);
    assert.equal(native.capabilities.ownerOnlyDirectoryEnforcement, POSIX_PERMISSION_CHECKS_SUPPORTED);
    assert.equal(native.capabilities.ancestorPermissionChecks, POSIX_PERMISSION_CHECKS_SUPPORTED);
    assert.equal(native.capabilities.posture, POSIX_PERMISSION_CHECKS_SUPPORTED
      ? 'posix-permissions-enforced'
      : 'permissions-not-enforced-platform-limitation');
    assert.ok(native.capabilities.note.length > 0);

    const portable = state.readMaintenanceRunStatus(identity, {
      posixPermissions: false,
      uid: undefined,
      noFollowFlag: undefined,
    });
    assert.equal(portable.capabilities.posixPermissionChecks, false);
    assert.equal(portable.capabilities.ownerOnlyDirectoryEnforcement, false);
    assert.equal(portable.capabilities.ancestorPermissionChecks, false);
    assert.equal(portable.capabilities.posture, 'permissions-not-enforced-platform-limitation');
    assert.notEqual(portable.capabilities.posture, native.capabilities.posture);

    // The posture is a protection report, never an approval or gate claim.
    for (const field of ['gateGreen', 'ownerApproved', 'approved', 'authorized', 'authenticated']) {
      assert.equal(Object.hasOwn(native, field), false, `${field} must not be inferred from the platform posture`);
      assert.equal(Object.hasOwn(portable, field), false, `${field} must not be inferred from the platform posture`);
    }
    assert.equal(Object.hasOwn(native.capabilities, 'gateGreen'), false);
    assert.equal(Object.hasOwn(native.capabilities, 'approved'), false);

    const cliStatus = runState(f, ['status', ...maintenanceStateArgsFor(f, runId)]);
    assert.equal(cliStatus.status, 0, cliStatus.stderr);
    assert.equal(JSON.parse(cliStatus.stdout).capabilities.posture, native.capabilities.posture);
  } finally {
    cleanup(f);
  }
});

test('keeps the maintenance secret scrubber in step with the product memory control', () => {
  const f = fixture();
  try {
    // The maintenance state store cannot import the product memory writer:
    // it is loaded in isolation elsewhere, so its patterns are a mirrored
    // copy. This test is what stops the copy from silently falling behind.
    const product = require(path.join(SCRIPTS_SOURCE, 'memory_write.js'));
    const maintenance = maintenanceState(f);

    assert.deepEqual(
      maintenance.SECRET_PATTERNS.map(({ name, regex }) => ({
        name,
        source: regex.source,
        flags: regex.flags,
      })),
      product.SECRET_PATTERNS.map(({ name, regex }) => ({
        name,
        source: regex.source,
        flags: regex.flags,
      })),
      'the maintenance secret patterns must match the product patterns exactly',
    );
    assert.deepEqual(
      maintenance.INJECTION_PATTERNS.map(({ id, re }) => ({
        id,
        source: re.source,
        flags: re.flags,
      })),
      product.INJECTION_PATTERNS.map(({ id, re }) => ({
        id,
        source: re.source,
        flags: re.flags,
      })),
      'the maintenance injection patterns must match the product patterns exactly',
    );

    // Behavioural parity on a shared corpus: every secret shape the product
    // redacts is redacted the same way by the maintenance store, and benign
    // evidence references are left alone by both.
    const corpus = [
      'AKIA' + 'IOSFODNN7EXAMPLE',
      `ghp_${'A1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvWxYz'}`,
      'sk-' + 'ant-api03-abcdefghijklmnopqrstuvwxyz012345',
      'sk-' + 'proj-abcdefghijklmnopqrstuvwxyz012345',
      'AIza' + 'SyA1234567890abcdefghijklmnopqrstuvw',
      'xoxb-' + '123456789012-abcdefghijkl',
      'sk_' + 'live_abcdefghijklmnop',
      'TOKEN=abcdefghijklmnop',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      'password' + ': ' + '"correct-horse-battery-staple-000"',
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA\n-----END RSA PRIVATE KEY-----',
    ];
    const benign = [
      'review-record://plan-01',
      'test-report://targeted-test',
      'plan-01',
      'hash-01',
      '550e8400-e29b-41d4-a716-446655440000',
      'T002',
      'a3f1c2d4e5b60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011223344556677889900aabbccddeeff',
    ];

    const identity = identityFor(f, { runId: 'scrubber-parity-run', sessionId: 'developer-session-01' });
    const state = maintenanceState(f);
    for (const sample of [...corpus, ...benign]) {
      const appended = state.appendMaintenanceRunEvent(identity, {
        type: 'task_disposition',
        details: { taskId: 'T002', disposition: 'fixed', sample },
      });
      const productScrubbed = product.scrubSecrets(product.sanitizeContent(sample));
      const maintenanceScrubbed = appended.details.sample;
      assert.equal(maintenanceScrubbed, productScrubbed, `scrubbing diverged for: ${sample.slice(0, 24)}`);
    }
  } finally {
    cleanup(f);
  }
});

test('snapshot control detects and then removes an unexpected temporary write', () => {
  const f = fixture();
  const planted = path.join(f.tempRoot, 'unexpected-write.txt');
  try {
    const before = snapshotTree(f.tempRoot);
    fs.writeFileSync(planted, 'deliberately unexpected\n');
    assert.notDeepEqual(snapshotTree(f.tempRoot), before, 'snapshot must notice a planted write');
    fs.rmSync(planted);
    assert.deepEqual(snapshotTree(f.tempRoot), before, 'control write must be cleaned up');
  } finally {
    cleanup(f);
  }
});
