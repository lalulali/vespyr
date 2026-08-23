/**
 * Process Tree & Execution Manager for vespyr-eval
 * Enforces strict timeouts (default: 10s) and process-tree termination
 * to prevent deadlocks or zombie workers (INV-SANDBOX-1).
 */

const { spawn } = require("child_process");

function runCommandWithTimeout(command, args, options = {}) {
  return new Promise((resolve) => {
    const timeoutMs = options.timeoutMs || 10000;
    const cwd = options.cwd || process.cwd();
    const env = options.env || process.env;

    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32"
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform !== "win32" && child.pid) {
          process.kill(-child.pid, "SIGKILL");
        } else {
          child.kill("SIGKILL");
        }
      } catch (e) {
        // Process might already be dead
      }
    }, timeoutMs);

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      resolve({
        code: timedOut ? 124 : (code ?? (signal ? 1 : 0)),
        signal,
        stdout,
        stderr,
        durationMs,
        timedOut
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      resolve({
        code: 1,
        signal: null,
        stdout,
        stderr: err.message,
        durationMs,
        timedOut: false
      });
    });
  });
}

module.exports = {
  runCommandWithTimeout
};
