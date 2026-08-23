/**
 * Ephemeral Sandbox Manager for vespyr-eval (WS-1 Task 1.2)
 * Provides hermetic workspace isolation (fs.mkdtemp), mock memory injection,
 * sanitized env variables, and guaranteed teardown (INV-SANDBOX-1, INV-SANDBOX-2, INV-MOD-2).
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { runCommandWithTimeout } = require("./lib/process");

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

  // Scaffolding mock memory layer so agent executions never mutate host memory
  const memoryDir = path.join(tempDir, "artifacts", "memory");
  const sessionDir = path.join(memoryDir, "session-summaries");
  const outputDir = path.join(tempDir, "artifacts", "output");
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const mockProjectContext = `# Project Context
## [CORE]
Project: vespyr-eval-sandbox
Repository: Not a git repository (sandbox)
Stack: JavaScript
Phase: validation
Sprint: none
Blockers: 0

## [IDENTITY]
User Nickname: EvalTester

<!-- BEGIN MACHINE STATE -->
## [RUNTIME STATE]
- Stack: JavaScript
- Git Branch: none
- Active Phase: validation
- Active Sprint: none
- Blocker Status: 0 active blockers
- Engine Version: 2.0.7
<!-- END MACHINE STATE -->
`;

  const mockDecisions = `# Active Decisions
### [DECISION] Initial sandbox decision [date: 2026-08-18] [agent: @vespyr-eval]
Sandbox environment active.
**Status:** active
`;

  fs.writeFileSync(path.join(memoryDir, "project-context.md"), mockProjectContext);
  fs.writeFileSync(path.join(memoryDir, "active-decisions.md"), mockDecisions);
  fs.writeFileSync(path.join(memoryDir, "patterns-and-conventions.md"), "# Patterns and Conventions\n- Standard pattern\n");
  fs.writeFileSync(path.join(memoryDir, "lessons-learned.md"), "# Lessons Learned\n");

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
