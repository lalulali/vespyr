const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const SCRIPT = path.join(__dirname, "..", ".agents", "scripts", "step_tracker.js");

function createIsolatedWorkspace() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-tracker-test-"));
  fs.mkdirSync(path.join(tmpDir, ".agents", "state"), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, "artifacts", "output"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".agents", "config.yaml"), "step_tracking: on\n", "utf8");
  fs.symlinkSync(path.join(__dirname, "..", ".agents", "skills"), path.join(tmpDir, ".agents", "skills"), "dir");
  return tmpDir;
}

function runCliInWorkspace(workspaceDir, args, env = {}) {
  // Clean out any inherited VESPYR_SESSION_ID unless explicitly passed
  const cleanEnv = { ...process.env };
  delete cleanEnv.VESPYR_SESSION_ID;

  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: workspaceDir,
    encoding: "utf8",
    env: { ...cleanEnv, ...env },
  });
}

function runBeginViaForkedProcess(workspaceDir, skill = "develop") {
  const cleanEnv = { ...process.env };
  delete cleanEnv.VESPYR_SESSION_ID;
  const argsJson = JSON.stringify([SCRIPT, "begin", "--skill", skill, "--step", "1"]);
  const wrapper = [
    'const { spawnSync } = require("child_process");',
    `const r = spawnSync(${JSON.stringify(process.execPath)}, ${argsJson}, { encoding: "utf8" });`,
    "if (r.stdout) process.stdout.write(r.stdout);",
    "if (r.stderr) process.stderr.write(r.stderr);",
    "process.exit(r.status === null ? 1 : r.status);",
  ].join("\n");
  return spawnSync(process.execPath, ["-e", wrapper], {
    cwd: workspaceDir,
    encoding: "utf8",
    env: cleanEnv,
  });
}

test("FC-3: Scope gate fails closed with exit 1 when no lock exists", () => {
  const ws = createIsolatedWorkspace();
  try {
    const res = runCliInWorkspace(ws, ["begin", "--skill", "develop", "--step", "1"]);
    assert.strictEqual(res.status, 1, "Must exit 1 when no lock exists");
    assert.match(res.stderr, /Step 0 Scope Gate bypassed/);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("FC-3: Interactive terminal (no VESPYR_SESSION_ID) binds via windowSessionId", () => {
  const ws = createIsolatedWorkspace();
  try {
    // 1. Lock in interactive shell (uses windowSessionId)
    const lockRes = runCliInWorkspace(ws, ["scope-lock", "--skill", "develop", "--track", "test-track"]);
    assert.strictEqual(lockRes.status, 0, `scope-lock must exit 0, stderr: ${lockRes.stderr}`);

    // 2. Verify audit file was created in isolated workspace
    const auditFile = path.join(ws, "artifacts", "output", "step-audit.json");
    assert.ok(fs.existsSync(auditFile), "step-audit.json must exist in isolated workspace");
    const audit = JSON.parse(fs.readFileSync(auditFile, "utf8"));
    assert.strictEqual(audit.length, 1);
    assert.ok(audit[0].session_id.startsWith("w-"), "Lock must carry window hash in interactive terminal");

    // 3. Begin in same window process tree succeeds
    const beginRes = runCliInWorkspace(ws, ["begin", "--skill", "develop", "--step", "1"]);
    assert.strictEqual(beginRes.status, 0, `begin --step 1 must succeed in same window, stderr: ${beginRes.stderr}`);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("FC-3: Explicit VESPYR_SESSION_ID binds to session and unlocks step 1", () => {
  const ws = createIsolatedWorkspace();
  try {
    const testSession = "test-session-" + Date.now();
    
    // Lock scope under testSession
    const lockRes = runCliInWorkspace(
      ws,
      ["scope-lock", "--skill", "develop", "--track", "test-track"],
      { VESPYR_SESSION_ID: testSession }
    );
    assert.strictEqual(lockRes.status, 0, "scope-lock must exit 0");

    // Verify audit record contains explicit session_id
    const audit = JSON.parse(fs.readFileSync(path.join(ws, "artifacts", "output", "step-audit.json"), "utf8"));
    assert.strictEqual(audit[0].session_id, testSession);

    // Step 1 begin in same session succeeds
    const beginRes = runCliInWorkspace(
      ws,
      ["begin", "--skill", "develop", "--step", "1"],
      { VESPYR_SESSION_ID: testSession }
    );
    assert.strictEqual(beginRes.status, 0, "begin --step 1 must exit 0 in same session");
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("FC-3: Stale historical lock from foreign session does NOT unlock (evergreen bypass eliminated)", () => {
  const ws = createIsolatedWorkspace();
  try {
    const oldEntry = {
      type: "scope_lock",
      skill: "develop",
      track: "old-track",
      session_id: "s-foreign-session-12345",
      agent: "unknown",
      ts: "2026-08-01T00:00:00.000Z"
    };
    fs.writeFileSync(
      path.join(ws, "artifacts", "output", "step-audit.json"),
      JSON.stringify([oldEntry], null, 2),
      "utf8"
    );

    // Attempting to begin under a different active session must fail
    const res = runCliInWorkspace(
      ws,
      ["begin", "--skill", "develop", "--step", "1"],
      { VESPYR_SESSION_ID: "s-active-session-67890" }
    );
    assert.strictEqual(res.status, 1, "Foreign/stale lock must not unlock active session");
    assert.match(res.stderr, /Step 0 Scope Gate bypassed/);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("FC-3: window-bound lock is honored across a forked process (recency fallback)", () => {
  const ws = createIsolatedWorkspace();
  try {
    fs.writeFileSync(
      path.join(ws, ".agents", "state", "session-current.json"),
      JSON.stringify({ session_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", started: new Date().toISOString() }),
      "utf8"
    );

    const lockRes = runCliInWorkspace(ws, ["scope-lock", "--skill", "develop", "--track", "subshell-track"]);
    assert.strictEqual(lockRes.status, 0, `scope-lock must succeed: ${lockRes.stderr}`);

    const audit = JSON.parse(fs.readFileSync(path.join(ws, "artifacts", "output", "step-audit.json"), "utf8"));
    assert.ok(audit[0].session_id.startsWith("w-"), "lock must carry the window hash, not the session-current UUID");

    const beginRes = runBeginViaForkedProcess(ws);
    assert.strictEqual(beginRes.status, 0, `begin from a forked process within the TTL must succeed: ${beginRes.stderr}`);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("FC-3: scope-lock creates the session anchor on a fresh checkout, so the fallback works", () => {
  const ws = createIsolatedWorkspace();
  try {
    const sessionFile = path.join(ws, ".agents", "state", "session-current.json");
    assert.ok(!fs.existsSync(sessionFile), "fixture must start without a session anchor");

    const lockRes = runCliInWorkspace(ws, ["scope-lock", "--skill", "develop", "--track", "fresh-clone"]);
    assert.strictEqual(lockRes.status, 0, `scope-lock must succeed: ${lockRes.stderr}`);
    assert.ok(fs.existsSync(sessionFile), "scope-lock must create the session anchor when missing");

    const beginRes = runBeginViaForkedProcess(ws);
    assert.strictEqual(beginRes.status, 0, `begin from a forked process must succeed after anchor creation: ${beginRes.stderr}`);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("FC-3: forked-process fallback expires after 15 minutes; same-window locks do not", () => {
  const ws = createIsolatedWorkspace();
  try {
    fs.writeFileSync(
      path.join(ws, ".agents", "state", "session-current.json"),
      JSON.stringify({ session_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", started: "2026-08-31T03:22:23.574Z" }),
      "utf8"
    );
    const lockRes = runCliInWorkspace(ws, ["scope-lock", "--skill", "develop", "--track", "expiry-track"]);
    assert.strictEqual(lockRes.status, 0, `scope-lock must succeed: ${lockRes.stderr}`);

    const auditFile = path.join(ws, "artifacts", "output", "step-audit.json");
    const audit = JSON.parse(fs.readFileSync(auditFile, "utf8"));
    audit[0].ts = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    fs.writeFileSync(auditFile, JSON.stringify(audit, null, 2), "utf8");

    const forkedRes = runBeginViaForkedProcess(ws);
    assert.strictEqual(forkedRes.status, 1, "expired lock must not admit a forked process");

    const sameWindowRes = runCliInWorkspace(ws, ["begin", "--skill", "develop", "--step", "1"]);
    assert.strictEqual(sameWindowRes.status, 0, "same-window lock is valid for the window lifetime (window = session identity)");
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("FC-3: hand-authored recent foreign UUID lock is rejected (no producer — fail-closed)", () => {
  const ws = createIsolatedWorkspace();
  try {
    fs.writeFileSync(
      path.join(ws, ".agents", "state", "session-current.json"),
      JSON.stringify({ session_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", started: "2026-08-01T00:00:00.000Z" }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(ws, "artifacts", "output", "step-audit.json"),
      JSON.stringify([{
        type: "scope_lock",
        skill: "develop",
        track: "foreign-track",
        session_id: "ffffffff-1111-2222-3333-444444444444",
        ts: new Date(Date.now() - 60 * 1000).toISOString(),
      }], null, 2),
      "utf8"
    );

    const res = runCliInWorkspace(ws, ["begin", "--skill", "develop", "--step", "1"]);
    assert.strictEqual(res.status, 1, "foreign UUID lock must not unlock even when recent");
    assert.match(res.stderr, /Step 0 Scope Gate bypassed/);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("FC-3: stale lock carrying the session-current UUID is rejected (rule 3 removed)", () => {
  const ws = createIsolatedWorkspace();
  try {
    const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    fs.writeFileSync(
      path.join(ws, ".agents", "state", "session-current.json"),
      JSON.stringify({ session_id: uuid, started: "2026-08-31T03:22:23.574Z" }),
      "utf8"
    );
    fs.writeFileSync(
      path.join(ws, "artifacts", "output", "step-audit.json"),
      JSON.stringify([{
        type: "scope_lock",
        skill: "develop",
        track: "eternal-track",
        session_id: uuid,
        ts: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      }], null, 2),
      "utf8"
    );

    const res = runCliInWorkspace(ws, ["begin", "--skill", "develop", "--step", "1"]);
    assert.strictEqual(res.status, 1, "session-current UUID locks are never honored");
    assert.match(res.stderr, /Step 0 Scope Gate bypassed/);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test("FC-3: mode-variant begin is admitted by a base-skill lock whose track names the mode", () => {
  const ws = createIsolatedWorkspace();
  try {
    const lockRes = runCliInWorkspace(ws, ["scope-lock", "--skill", "design", "--track", "create"]);
    assert.strictEqual(lockRes.status, 0, `scope-lock must succeed: ${lockRes.stderr}`);

    const matching = runCliInWorkspace(ws, ["begin", "--skill", "design-create", "--step", "1"]);
    assert.strictEqual(matching.status, 0, `base lock track 'create' must admit design-create: ${matching.stderr}`);

    const auditFile = path.join(ws, "artifacts", "output", "step-audit.json");
    const audit = JSON.parse(fs.readFileSync(auditFile, "utf8"));
    audit[0].track = "other";
    fs.writeFileSync(auditFile, JSON.stringify(audit, null, 2), "utf8");

    const mismatched = runCliInWorkspace(ws, ["begin", "--skill", "design-create", "--step", "1"]);
    assert.strictEqual(mismatched.status, 1, "base lock with a non-matching track must not admit design-create");
    assert.match(mismatched.stderr, /not mode 'create'/);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

