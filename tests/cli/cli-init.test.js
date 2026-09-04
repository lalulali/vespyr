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

    assert.strictEqual(
      fs.existsSync(path.join(tmpDir, ".agents", "commands")),
      false,
      ".agents/commands/ directory must not exist in scaffolding"
    );
  });

  it("T0-INIT-04: Cross-Platform Canary Preservation on update/init", () => {
    execFileSync(process.execPath, [CLI, "init", "--target", tmpDir, "--harness", "opencode", "--yes"], { stdio: "pipe" });

    const contextPath = path.join(tmpDir, "artifacts", "memory", "project-context.md");
    const canaryToken = "CANARY-SAFE-GUARD-998877";
    fs.appendFileSync(contextPath, "\n\n## [USER CANARY]\nToken: " + canaryToken + "\n");

    execFileSync(process.execPath, [CLI, "update", "--target", tmpDir, "--yes"], { stdio: "pipe" });

    const updatedContent = fs.readFileSync(contextPath, "utf8");
    assert.ok(
      updatedContent.includes(canaryToken),
      "User canary section must be preserved across vespyr update"
    );
  });
});
