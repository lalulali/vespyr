const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const CLI = path.join(__dirname, "..", "..", "bin", "cli.js");
const PERSONA_COUNT = 20;

/**
 * Live conformance against the real Kiro CLI. This is the only test in the
 * suite that proves Kiro itself accepts what we emit — everything else asserts
 * our own expectations. It skips (never passes) when kiro-cli is absent, so a
 * machine without Kiro reports "unverified", not "green".
 *
 * What it proves:
 *   - every generated agent config passes `kiro-cli agent validate`
 *   - `kiro-cli agent list` discovers every persona in the workspace
 * What it does not prove: behaviour inside the Kiro IDE or a chat session.
 */
function resolveKiroCli() {
  const candidates = [
    process.env.KIRO_CLI,
    path.join(os.homedir(), ".local", "bin", "kiro-cli"),
    "/usr/local/bin/kiro-cli",
    "/opt/homebrew/bin/kiro-cli",
  ];
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate;
    } catch {}
  }
  try {
    const found = execFileSync("sh", ["-c", "command -v kiro-cli"], { encoding: "utf8" }).trim();
    return found || null;
  } catch {
    return null;
  }
}

const KIRO_CLI = resolveKiroCli();
const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, "");

describe(
  "Kiro CLI conformance (live)",
  { skip: KIRO_CLI ? false : "kiro-cli not installed — Kiro acceptance stays unverified" },
  () => {
    let tmpDir;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-kiro-conformance-"));
      execFileSync(process.execPath, [CLI, "init", "--target", tmpDir, "--harness", "kiro", "--yes"], {
        stdio: "pipe",
      });
    });

    after(() => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    });

    it("emits agent configs in a format the CLI discovers", () => {
      const agentsDir = path.join(tmpDir, ".kiro", "agents");
      const files = fs.readdirSync(agentsDir);
      const json = files.filter((f) => f.endsWith(".json"));
      assert.strictEqual(
        json.length,
        PERSONA_COUNT,
        `Kiro CLI discovers .json only; found ${json.length} .json and ${files.filter((f) => f.endsWith(".md")).length} .md`
      );
    });

    it("passes kiro-cli agent validate for every generated persona", () => {
      const agentsDir = path.join(tmpDir, ".kiro", "agents");
      const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".json"));
      assert.ok(files.length > 0, "no agent configs to validate");

      const failures = [];
      for (const file of files) {
        const result = spawnSync(KIRO_CLI, ["agent", "validate", "--path", path.join(agentsDir, file)], {
          encoding: "utf8",
        });
        if (result.status !== 0) {
          const detail = stripAnsi(`${result.stdout || ""}${result.stderr || ""}`).trim();
          failures.push(`${file}: ${detail || `exit ${result.status}`}`);
        }
      }
      assert.deepStrictEqual(failures, [], `kiro-cli rejected:\n${failures.join("\n")}`);
    });

    it("discovers every persona in kiro-cli agent list", () => {
      const result = spawnSync(KIRO_CLI, ["agent", "list"], {
        cwd: tmpDir,
        encoding: "utf8",
      });
      // kiro-cli renders its listing on stderr, not stdout — capture both.
      const listing = stripAnsi(`${result.stdout || ""}${result.stderr || ""}`);
      assert.strictEqual(result.status, 0, `kiro-cli agent list failed:\n${listing}`);
      assert.ok(listing.includes("Workspace:"), `no workspace section in listing:\n${listing}`);
      const sourceDir = path.join(tmpDir, ".agents", "agents");
      const personas = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));
      assert.strictEqual(personas.length, PERSONA_COUNT);

      const missing = personas
        .map((f) => f.slice(0, -3))
        .filter((name) => !new RegExp(`^\\s+${name}\\s+Workspace`, "m").test(listing));

      assert.deepStrictEqual(
        missing,
        [],
        `Kiro CLI did not discover these personas:\n${missing.join(", ")}\n--- listing ---\n${listing}`
      );
    });
  }
);
