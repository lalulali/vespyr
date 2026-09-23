const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  readConfigYaml,
  updateConfigYamlLanguage,
  executeLangCommand
} = require("../bin/lib/config_language_cmd");

function createTempWorkspace() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-lang-test-"));
  const agentsDir = path.join(tmpDir, ".agents");
  fs.mkdirSync(agentsDir, { recursive: true });
  return tmpDir;
}

test("readConfigYaml returns clean defaults if config.yaml is absent (artifacts only, no chat key)", () => {
  const tmpDir = createTempWorkspace();
  const configPath = path.join(tmpDir, ".agents", "config.yaml");
  const cfg = readConfigYaml(configPath);
  assert.strictEqual(cfg.step_tracking, "off");
  assert.strictEqual(cfg.language.artifacts, "en");
  assert.strictEqual(cfg.language.chat, undefined, "chat must not be a config key");
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("updateConfigYamlLanguage updates artifacts while preserving other sections", () => {
  const tmpDir = createTempWorkspace();
  const configPath = path.join(tmpDir, ".agents", "config.yaml");
  const initialContent = `# Vespyr Config\nstep_tracking: silent\n\nlanguage:\n  artifacts: en\n`;
  fs.writeFileSync(configPath, initialContent, "utf8");

  updateConfigYamlLanguage(configPath, { artifacts: "zh-Hans" });
  let cfg = readConfigYaml(configPath);
  assert.strictEqual(cfg.step_tracking, "silent");
  assert.strictEqual(cfg.language.artifacts, "zh-Hans");

  updateConfigYamlLanguage(configPath, { artifacts: "pt" });
  cfg = readConfigYaml(configPath);
  assert.strictEqual(cfg.language.artifacts, "pt");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("executeLangCommand 'vespyr lang set <lang>' sets the artifact language", () => {
  const tmpDir = createTempWorkspace();
  const configPath = path.join(tmpDir, ".agents", "config.yaml");

  const exitCode = executeLangCommand(["node", "cli.js", "lang", "set", "mandarin"], tmpDir);
  assert.strictEqual(exitCode, 0);

  const cfg = readConfigYaml(configPath);
  assert.strictEqual(cfg.language.artifacts, "zh-Hans");

  // No chat key is ever written.
  const raw = fs.readFileSync(configPath, "utf8");
  assert.ok(!/^[ \t]*chat:/m.test(raw), "config.yaml must not contain a chat: key");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("executeLangCommand 'set artifacts <lang>' scoped form still works", () => {
  const tmpDir = createTempWorkspace();
  const configPath = path.join(tmpDir, ".agents", "config.yaml");

  executeLangCommand(["node", "cli.js", "lang", "set", "artifacts", "id"], tmpDir);
  const cfg = readConfigYaml(configPath);
  assert.strictEqual(cfg.language.artifacts, "id");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("executeLangCommand 'set chat <lang>' is rejected — chat is not configurable", () => {
  const tmpDir = createTempWorkspace();
  const configPath = path.join(tmpDir, ".agents", "config.yaml");

  const exitCode = executeLangCommand(["node", "cli.js", "lang", "set", "chat", "id"], tmpDir);
  assert.strictEqual(exitCode, 1, "set chat must error");

  // config untouched (defaults, no chat key)
  const raw = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  assert.ok(!/^[ \t]*chat:/m.test(raw), "no chat key written");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("executeLangCommand handles unrecognized language by warning and falling back to 'en'", () => {
  const tmpDir = createTempWorkspace();
  const configPath = path.join(tmpDir, ".agents", "config.yaml");

  const exitCode = executeLangCommand(["node", "cli.js", "lang", "set", "dothraki"], tmpDir);
  assert.strictEqual(exitCode, 0);

  const cfg = readConfigYaml(configPath);
  assert.strictEqual(cfg.language.artifacts, "en");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("readConfigYaml reads a quoted on-disk value without silent fallback (regression)", () => {
  const tmpDir = createTempWorkspace();
  const configPath = path.join(tmpDir, ".agents", "config.yaml");
  fs.writeFileSync(configPath, `step_tracking: off\n\nlanguage:\n  artifacts: "id"\n`, "utf8");

  const cfg = readConfigYaml(configPath);
  assert.strictEqual(cfg.language.artifacts, "id"); // was '"id"' -> fallback 'en' before the fix

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("executeLangCommand supports --help and list", () => {
  const tmpDir = createTempWorkspace();

  let code = executeLangCommand(["node", "cli.js", "lang", "--help"], tmpDir);
  assert.strictEqual(code, 0);

  code = executeLangCommand(["node", "cli.js", "lang", "list"], tmpDir);
  assert.strictEqual(code, 0);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
