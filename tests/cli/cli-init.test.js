const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const CLI = path.join(__dirname, "..", "..", "bin", "cli.js");

describe("Tier 0 Deterministic Init Test Suite (TL-INIT-04 / T0-INIT-01..04)", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-init-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it("T0-INIT-01: Greenfield Idempotency — exact machine block formatting and safe re-run", () => {
    execFileSync(process.execPath, [CLI, "init", "--target", tmpDir, "--harness", "opencode", "--yes"], { stdio: "pipe" });

    const contextPath = path.join(tmpDir, "artifacts", "memory", "project-context.md");
    assert.ok(fs.existsSync(contextPath), "artifacts/memory/project-context.md must exist");

    const content1 = fs.readFileSync(contextPath, "utf8");
    assert.ok(content1.includes("<!-- BEGIN MACHINE STATE -->"), "Must contain BEGIN MACHINE STATE");
    assert.ok(content1.includes("<!-- END MACHINE STATE -->"), "Must contain END MACHINE STATE");
    assert.ok(content1.includes("## [CORE]"), "Must contain ## [CORE]");
    assert.ok(content1.includes("## [IDENTITY]"), "Must contain ## [IDENTITY]");

    execFileSync(process.execPath, [CLI, "init", "--target", tmpDir, "--yes"], { stdio: "pipe" });

    assert.ok(fs.existsSync(contextPath), "project-context.md must survive re-init");
    const content2 = fs.readFileSync(contextPath, "utf8");
    assert.ok(content2.includes("<!-- BEGIN MACHINE STATE -->"));
    assert.ok(content2.includes("<!-- END MACHINE STATE -->"));
  });

  it("T0-INIT-02: Brownfield Stack Detection & Dotfolder Isolation", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "my-brownfield-app", dependencies: { express: "^4.18.2" } }, null, 2)
    );

    execFileSync(process.execPath, [CLI, "init", "--target", tmpDir, "--harness", "opencode", "--yes"], { stdio: "pipe" });

    const contextPath = path.join(tmpDir, "artifacts", "memory", "project-context.md");
    const content = fs.readFileSync(contextPath, "utf8");

    assert.ok(
      content.includes("Stack: JavaScript") || content.includes("Stack: Node.js"),
      "Must detect JavaScript/Node.js stack from root package.json"
    );

    assert.strictEqual(
      content.includes("@actions/core"),
      false,
      "Internal .agents dependencies must never leak into user project context"
    );
  });

  it("T0-INIT-03: Multi-Harness Scaffolding Parity — zero dead references to commands/ or /init", () => {
    execFileSync(
      process.execPath,
      [CLI, "init", "--target", tmpDir, "--harness", "opencode,claude,kiro", "--yes"],
      { stdio: "pipe" }
    );

    assert.ok(fs.existsSync(path.join(tmpDir, ".claude")), "Claude harness folder must exist");
    assert.ok(fs.existsSync(path.join(tmpDir, ".kiro")), "Kiro harness folder must exist");
    assert.ok(
      fs.existsSync(path.join(tmpDir, ".kiro", "agents", "founder.json")),
      "Kiro custom agents must be transpiled from .agents/agents as .json"
    );

    assert.strictEqual(
      fs.existsSync(path.join(tmpDir, ".agents", "commands")),
      false,
      ".agents/commands/ directory must not exist in scaffolding"
    );
  });

  it("T0-INIT-05: Kiro-only install must not emit a CLAUDE.md for an absent harness", () => {
    execFileSync(process.execPath, [CLI, "init", "--target", tmpDir, "--harness", "kiro", "--yes"], { stdio: "pipe" });

    assert.strictEqual(
      fs.existsSync(path.join(tmpDir, "CLAUDE.md")),
      false,
      "CLAUDE.md rewrites .agents/ -> .claude/; with Claude unselected it points at nothing"
    );
    assert.ok(fs.existsSync(path.join(tmpDir, "AGENTS.md")), "harness-agnostic docs must still be emitted");
  });

  it("T0-INIT-07: update backs up a user-authored steering file before replacing it", () => {
    execFileSync(process.execPath, [CLI, "init", "--target", tmpDir, "--harness", "kiro", "--yes"], { stdio: "pipe" });

    // Replace the adapter-managed link with a real file the owner wrote.
    const steering = path.join(tmpDir, ".kiro", "steering", "vespyr-steering.md");
    fs.rmSync(steering);
    fs.writeFileSync(steering, "# MY OWN STEERING DOC\n");

    execFileSync(process.execPath, [CLI, "update", "--target", tmpDir, "--yes"], { stdio: "pipe" });

    assert.strictEqual(
      fs.lstatSync(steering).isSymbolicLink(),
      true,
      "adapter must re-own the steering path"
    );

    const bakSteering = path.join(tmpDir, ".kiro", ".bak", "steering");
    const backups = fs.existsSync(bakSteering) ? fs.readdirSync(bakSteering) : [];
    assert.strictEqual(backups.length, 1, "user-authored steering file must be backed up exactly once");
    assert.match(backups[0], /^vespyr-steering\.md\.backup\.\d+$/);
    assert.strictEqual(
      fs.readFileSync(path.join(bakSteering, backups[0]), "utf8"),
      "# MY OWN STEERING DOC\n",
      "backup must preserve the owner's content verbatim"
    );
  });

  it("T0-INIT-06: Kiro update leaves no backup litter inside .kiro", () => {
    execFileSync(process.execPath, [CLI, "init", "--target", tmpDir, "--harness", "kiro", "--yes"], { stdio: "pipe" });
    execFileSync(process.execPath, [CLI, "update", "--target", tmpDir, "--yes"], { stdio: "pipe" });

    const steering = path.join(tmpDir, ".kiro", "steering", "vespyr-steering.md");
    assert.strictEqual(
      fs.lstatSync(steering).isSymbolicLink(),
      true,
      "update must not rewrite the adapter-managed steering link into a real file"
    );

    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return entry.name.includes(".backup.") ? [full] : [];
      });
    assert.deepStrictEqual(walk(path.join(tmpDir, ".kiro")), [], "no backup files may accumulate in .kiro");
    assert.strictEqual(
      fs.existsSync(path.join(tmpDir, ".kiro", ".bak")),
      false,
      "a clean update must not create a .bak folder at all"
    );
  });

  it("T0-INIT-04: Cross-Platform Canary Preservation on update/init", () => {
    execFileSync(process.execPath, [CLI, "init", "--target", tmpDir, "--harness", "opencode", "--yes"], { stdio: "pipe" });

    const contextPath = path.join(tmpDir, "artifacts", "memory", "project-context.md");
    // Assembled at runtime, and QUOTED. The quoting is the point: INJ-SECRET's keyword branch
    // requires a quoted value, so an unquoted canary never matched the rule AT ALL. With the quotes
    // the rule matches, and then the greedy strip ate CANARY- / SAFE- / GUARD- and the remainder
    // fell below the entropy threshold — so both causes are real, and the order matters.
    //
      // With the quotes, the canary tests what it was written to test. The old greedy strip ate
      // CANARY- / SAFE- / GUARD- (three letter+separator groups), leaving "998877" — six characters.
      // The regex still matched the RAW value; what failed was the ENTROPY gate, because the
      // stripped remainder measured 1.585 against a threshold of 2.6. The bounded strip leaves the
      // whole value, whose maximum 8-char window measures 3.000, so the finding is there to be found.
    const canaryToken = ['CANARY', 'SAFE', 'GUARD', '998877'].join('-');
    fs.appendFileSync(contextPath, "\n\n## [USER CANARY]\nToken: \"" + canaryToken + "\"\n");

    execFileSync(process.execPath, [CLI, "update", "--target", tmpDir, "--yes"], { stdio: "pipe" });

    const updatedContent = fs.readFileSync(contextPath, "utf8");
    // PIN THE QUOTING. Without the quotes INJ-SECRET's keyword branch never matches the value at
    // all, so the canary was invisible and the CHANGELOG's claim that it "had been silently eaten
    // by the old greedy strip and is now measurable" was false. Un-quoting it must change what the
    // scanner reports, and this asserts that it does.
    const scanDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-canary-"));
    try {
      fs.mkdirSync(path.join(scanDir, "tests"), { recursive: true });
      fs.copyFileSync(contextPath, path.join(scanDir, "tests", "canary.md"));
      let stdout = "";
      try {
        stdout = execFileSync(process.execPath, [
          path.join(__dirname, "..", "..", ".agents", "scripts", "security-scan.js"),
          "--dir", scanDir, "--spec", path.join(__dirname, "..", "..", "security", "audit-spec.json"), "--json",
        ], { encoding: "utf8" });
      } catch (e) {
        // The scanner exits 1 when it finds something — which is what this asserts.
        stdout = e.stdout || "";
      }
      const report = JSON.parse(stdout || "{}");
      assert.ok(
        (report.findings || []).some((f) => f.rule === "INJ-SECRET"),
        `the quoted canary must be reported by the scanner: ${JSON.stringify(report.findings || [])}`,
      );
    } finally {
      fs.rmSync(scanDir, { recursive: true, force: true });
    }
    assert.ok(
      updatedContent.includes(canaryToken),
      "User canary section must be preserved across vespyr update"
    );
  });
});
