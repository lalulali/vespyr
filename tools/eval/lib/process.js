/**
 * Process Tree & Execution Manager for vespyr-eval
 * Enforces strict timeouts (default: 10s) and process-tree termination
 * to prevent deadlocks or zombie workers (INV-SANDBOX-1).
 */

const { spawn } = require("child_process");

/**
 * Binaries a benchmark JSON file is allowed to request via `executionCommand`
 * / `runTestCommand`. Benchmark suites are data, not code: an unvalidated
 * command string is remote code execution by suite author. Override with
 * `VESPYR_EVAL_ALLOW_COMMANDS="mybin,otherbin"` (comma-separated additions)
 * or bypass entirely with `VESPYR_EVAL_ALLOW_ALL_COMMANDS=1` (explicit intent).
 */
const BASE_ALLOWED_COMMANDS = new Set([
  "node", "npm", "npx", "python3", "python", "pytest", "jest", "mocha",
  "vitest", "tsc", "eslint", "git", "ls", "cat", "echo", "pwd", "which",
  "deno", "bun", "go", "cargo", "make"
]);

function allowedCommands() {
  const extra = String(process.env.VESPYR_EVAL_ALLOW_COMMANDS || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  return new Set([...BASE_ALLOWED_COMMANDS, ...extra]);
}

// Shell metacharacters that must never appear in a benchmark-supplied command:
// they only function under a shell, which the harness never spawns.
const SHELL_METACHAR = /[|&;`$><\n\r]/;

function validateBenchmarkCommand(cmd) {
  if (process.env.VESPYR_EVAL_ALLOW_ALL_COMMANDS === "1") return;
  const raw = String(cmd || "");
  if (SHELL_METACHAR.test(raw)) {
    throw new Error(
      `Benchmark command rejected (shell metacharacter): ${JSON.stringify(raw.slice(0, 120))}. ` +
      `Benchmark JSON may not use pipes/redirects/substitution; set VESPYR_EVAL_ALLOW_ALL_COMMANDS=1 to override.`
    );
  }
  const parts = splitCommand(raw);
  const bin = parts.length ? parts[0].split("/").pop() : "";
  if (!bin || !allowedCommands().has(bin)) {
    throw new Error(
      `Benchmark command rejected (not allowlisted): ${JSON.stringify(String(bin).slice(0, 80))}. ` +
      `Allowlist: ${[...allowedCommands()].sort().join(", ")}. ` +
      `Extend via VESPYR_EVAL_ALLOW_COMMANDS or VESPYR_EVAL_ALLOW_ALL_COMMANDS=1.`
    );
  }
}

/**
 * Quote-aware command splitter: `run "quoted arg" plain` → ["run", "quoted arg", "plain"].
 * The naive split(" ") broke quoted args and paths with spaces.
 */
function splitCommand(cmd) {
  const parts = [];
  let cur = "";
  let quote = null;
  for (const ch of String(cmd)) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (cur) { parts.push(cur); cur = ""; }
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);
  return parts.length ? parts : [String(cmd)];
}

function runCommandWithTimeout(command, args, options = {}) {
  return new Promise((resolve) => {
    // Nullish coalescing: an explicit timeoutMs of 0 means "no patience" is
    // nonsense for spawn — but it must NOT silently become 10s either. 0 is
    // clamped to a 1ms floor so the intent (fail fast) is honored visibly.
    const timeoutMs = options.timeoutMs ?? 10000;
    const effectiveTimeout = timeoutMs <= 0 ? 1 : timeoutMs;
    const cwd = options.cwd || process.cwd();
    // Default inherit (undefined): spawn inherits the parent env without us
    // copying the whole host environment by hand. Explicit env (e.g. the
    // sandbox allowlist) is used verbatim when provided.
    const env = options.env === undefined ? undefined : options.env;
    // Unbounded stdout/stderr concat is an OOM vector on hostile output.
    // Default 1 MiB per stream; excess is truncated and flagged.
    const maxOutputBytes = options.maxOutputBytes ?? 1024 * 1024;

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
    }, effectiveTimeout);

    let truncated = false;
    const append = (current, chunk) => {
      if (truncated) return current;
      const next = current + chunk.toString();
      if (next.length > maxOutputBytes) {
        truncated = true;
        return next.slice(0, maxOutputBytes);
      }
      return next;
    };

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout = append(stdout, chunk);
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr = append(stderr, chunk);
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
        timedOut,
        truncated
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
  runCommandWithTimeout,
  splitCommand,
  validateBenchmarkCommand
};
