/**
 * Ephemeral Sandbox Manager for vespyr-eval (WS-1 Task 1.2)
 * Provides hermetic workspace isolation (fs.mkdtemp), mock memory injection,
 * sanitized env variables, and guaranteed teardown (INV-SANDBOX-1, INV-SANDBOX-2, INV-MOD-2).
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { runCommandWithTimeout } = require("./lib/process");
const { scaffoldArtifacts } = require("../../bin/cli");

const activeSandboxes = new Set();

// Idempotent: importing this module from many test files must not stack
// duplicate SIGINT/SIGTERM listeners, and a library must not hijack the
// host runner's shutdown. Signal handlers clean up but never call
// process.exit themselves: when the host has its own signal handling we get
// out of the way; when it does not, we re-raise the default disposition by
// re-signaling self after removing our listener.
let exitHandlersRegistered = false;

// Ensure process termination sweeps all active sandboxes
function registerExitHandlers() {
  if (exitHandlersRegistered) return;
  exitHandlersRegistered = true;
  const cleanupAll = () => {
    for (const dir of activeSandboxes) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      } catch (e) {
        // ignore during exit
      }
    }
    activeSandboxes.clear();
  };

  const makeResignal = (sig) => {
    const handler = () => {
      cleanupAll();
      // Out of the host's way: exactly one listener (ours) means nobody else
      // handles this signal, so restore default disposition and re-raise.
      if (process.listenerCount(sig) <= 1) {
        process.removeListener(sig, handler);
        try { process.kill(process.pid, sig); } catch (e) { /* ignore */ }
      }
      // Otherwise a host handler exists — return and let it decide.
    };
    return handler;
  };

  process.once("exit", cleanupAll);
  process.once("SIGINT", makeResignal("SIGINT"));
  process.once("SIGTERM", makeResignal("SIGTERM"));
}

registerExitHandlers();

// Copy budget: a hostile or gigantic fixture must not fill the disk or loop
// forever on symlink cycles.
const COPY_LIMITS = {
  maxFiles: 1000,
  maxBytes: 10 * 1024 * 1024,
  maxFileBytes: 1024 * 1024,
  maxDepth: 20
};

function copyRecursiveSync(src, dest, state = { files: 0, bytes: 0 }, depth = 0) {
  if (depth > COPY_LIMITS.maxDepth) {
    throw new Error(`Fixture copy rejected: depth exceeds ${COPY_LIMITS.maxDepth} at ${src}`);
  }
  // lstat, never stat: symlinks are refused, not followed. Following them
  // would let a fixture read arbitrary host files into the sandbox (and
  // symlink cycles would recurse until the disk filled).
  const stats = fs.lstatSync(src);
  if (stats.isSymbolicLink()) {
    throw new Error(`Fixture copy rejected: symlink not allowed at ${src}`);
  }
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child), state, depth + 1);
    }
  } else {
    if (stats.size > COPY_LIMITS.maxFileBytes) {
      throw new Error(`Fixture copy rejected: file exceeds 1 MiB at ${src}`);
    }
    state.files += 1;
    state.bytes += stats.size;
    if (state.files > COPY_LIMITS.maxFiles || state.bytes > COPY_LIMITS.maxBytes) {
      throw new Error(`Fixture copy rejected: budget exceeded (${COPY_LIMITS.maxFiles} files / 10 MiB) at ${src}`);
    }
    fs.copyFileSync(src, dest);
  }
}

/**
 * Host environment allowlist for sandboxes. The old `{...process.env}` copied
 * every secret (API keys, tokens) into every sandbox and let per-run
 * overrides replace workspace keys. Only inert locale/path/tooling keys pass;
 * provider credentials never enter the sandbox (adapters run in the host).
 */
const ALLOWED_ENV_KEYS = new Set([
  "PATH", "PATHEXT", "HOME", "USER", "LOGNAME", "SHELL",
  "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "LC_CTYPE", "LANGUAGE", "TZ",
  "SYSTEMROOT", "SYSTEMDRIVE", "COMSPEC", "NUMBER_OF_PROCESSORS", "OS",
  "NODE_ENV", "CI", "TERM", "TERMINFO", "COLORTERM", "NO_COLOR"
]);

// Workspace identity keys: authoritative from createSandbox, never
// overridable by per-run env.
const PROTECTED_ENV_KEYS = new Set(["VESPYR_WORKSPACE", "VESPYR_EVAL_SANDBOX"]);

function buildSandboxEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (ALLOWED_ENV_KEYS.has(k)) env[k] = v;
  }
  return env;
}

/**
 * Creates an isolated ephemeral sandbox for a benchmark run.
 * @param {Object} options
 * @param {string} [options.fixturePath] - Absolute or relative path to fixture template
 * @param {string} [options.prefix] - Prefix for temp directory name
 * @returns {Object} Sandbox context
 */
function createSandbox(options = {}) {
  const prefix = options.prefix || "vespyr-eval-";
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  activeSandboxes.add(tempDir);

  // If fixture provided, copy contents into tempDir
  if (options.fixturePath && fs.existsSync(options.fixturePath)) {
    copyRecursiveSync(options.fixturePath, tempDir);
  }

  // Scaffolding mock memory layer using canonical installer scaffoldArtifacts (DRY Task TL-INIT-02)
  scaffoldArtifacts(tempDir, "vespyr-eval-sandbox", "EvalTester", "JavaScript");
  const memoryDir = path.join(tempDir, "artifacts", "memory");

  const mockDecisions = `# Active Decisions
### [DECISION] Initial sandbox decision [date: 2026-08-18] [agent: @vespyr-eval]
Sandbox environment active.
**Status:** active
`;
  fs.writeFileSync(path.join(memoryDir, "active-decisions.md"), mockDecisions);

  const sanitizedEnv = {
    ...buildSandboxEnv(),
    VESPYR_WORKSPACE: tempDir,
    VESPYR_EVAL_SANDBOX: "1",
    NODE_ENV: "test"
  };

  const cleanup = () => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      activeSandboxes.delete(tempDir);
    } catch (err) {
      // ignore
    }
  };

  const runCommand = async (command, args = [], runOpts = {}) => {
    // Per-run env may only ADD allowlisted keys; workspace identity keys are
    // authoritative and cannot be overridden back out of the sandbox.
    const extra = {};
    for (const [k, v] of Object.entries(runOpts.env || {})) {
      if (PROTECTED_ENV_KEYS.has(k)) continue;
      if (ALLOWED_ENV_KEYS.has(k) || k.startsWith("VESPYR_")) extra[k] = v;
    }
    return await runCommandWithTimeout(command, args, {
      cwd: tempDir,
      env: { ...sanitizedEnv, ...extra },
      timeoutMs: runOpts.timeoutMs ?? 10000,
      maxOutputBytes: runOpts.maxOutputBytes
    });
  };

  return {
    dir: tempDir,
    env: sanitizedEnv,
    cleanup,
    runCommand
  };
}

module.exports = {
  createSandbox,
  activeSandboxes
};
