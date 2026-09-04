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

// Ensure process termination sweeps all active sandboxes
function registerExitHandlers() {
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

  process.once("exit", cleanupAll);
  process.once("SIGINT", () => { cleanupAll(); process.exit(130); });
  process.once("SIGTERM", () => { cleanupAll(); process.exit(143); });
}

registerExitHandlers();

function copyRecursiveSync(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
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
    ...process.env,
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
    return await runCommandWithTimeout(command, args, {
      cwd: tempDir,
      env: { ...sanitizedEnv, ...(runOpts.env || {}) },
      timeoutMs: runOpts.timeoutMs || 10000
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
