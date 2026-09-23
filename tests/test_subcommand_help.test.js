const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { spawnSync } = require("child_process");

const CLI_PATH = path.join(__dirname, "..", "bin", "cli.js");

function runCli(...args) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: "utf8" });
}

test("vespyr --help displays global help with lang command listed", () => {
  const res = runCli("--help");
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.includes("Usage: npx vespyr [command] [options]"));
  assert.ok(res.stdout.includes("lang                 Manage the artifact output language"));
});

test("vespyr init --help displays dedicated init help", () => {
  const res = runCli("init", "--help");
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.includes("vespyr init — Fresh install into target workspace"));
  assert.ok(res.stdout.includes("--language-artifacts <lang>"));
  assert.ok(res.stdout.includes("--project-name <name>"));
});

test("vespyr update --help displays dedicated update help", () => {
  const res = runCli("update", "--help");
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.includes("vespyr update — Update an existing Vespyr installation"));
  assert.ok(res.stdout.includes("--dry-run"));
});

test("vespyr verify --help displays dedicated verify help", () => {
  const res = runCli("verify", "--help");
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.includes("vespyr verify — Check file integrity against pinned manifest"));
  assert.ok(res.stdout.includes("Exit codes:"));
});

test("vespyr audit --help displays dedicated audit help", () => {
  const res = runCli("audit", "--help");
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.includes("vespyr audit — Run supply-chain security and content integrity scan"));
  assert.ok(res.stdout.includes("--spec <path>"));
});

test("vespyr manifest --help displays dedicated manifest help", () => {
  const res = runCli("manifest", "--help");
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.includes("vespyr manifest — Generate or regenerate workspace checksums manifest"));
});

test("vespyr uninstall --help displays dedicated uninstall help", () => {
  const res = runCli("uninstall", "--help");
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.includes("vespyr uninstall — Remove Vespyr core files safely"));
});

test("vespyr reconfigure --help displays dedicated reconfigure help", () => {
  const res = runCli("reconfigure", "--help");
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.includes("vespyr reconfigure — Reconfigure harness integrations and settings"));
});

test("vespyr lang --help displays dedicated lang help", () => {
  const res = runCli("lang", "--help");
  assert.strictEqual(res.status, 0);
  assert.ok(res.stdout.includes("Vespyr Multi-Agent Engine — Language Configuration CLI"));
  assert.ok(res.stdout.includes("vespyr lang set <language>               Set the artifact output language"));
  assert.ok(res.stdout.includes("vespyr lang list"));
});

test("vespyr config get language and config set language.artifacts", () => {
  const resGet = runCli("config", "get", "language");
  assert.strictEqual(resGet.status, 0);
  assert.ok(resGet.stdout.includes("Vespyr Language Settings"));

  const resHelp = runCli("config", "--help");
  assert.strictEqual(resHelp.status, 0);
  assert.ok(resHelp.stdout.includes("vespyr config — Configuration management"));
});
