const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { createInstaller } = require("../bin/lib/installer");
const { readConfigYaml } = require("../bin/lib/config_language_cmd");

function setupTestInstaller(tmpDir) {
  const noop = () => {};
  return createInstaller({
    log: noop,
    logDry: noop,
    logWarn: noop,
    logError: noop,
    askChecklist: async () => [],
    askSingleChoice: async () => 0,
    askQuestion: async () => "User",
    detectRepository: () => "https://github.com/test/repo.git",
    detectMethod: () => "copy",
    performSyncDocs: noop,
    getExistingUserNickname: () => "User",
    updateUserNickname: noop,
    writeManifest: noop,
    performGenerateManifest: noop,
    buildSourceManifest: () => ({ files: {} }),
    removeStaleManifestFiles: noop,
    detectInstalledHarnesses: () => [],
    installGitHook: () => true,
    setupSignalHandler: noop,
    teardownSignalHandler: noop,
    printSummary: noop,
    clearScreen: noop,
    printWizardSummary: noop,
    wizardState: {},
    ASCII_ART: "",
    VERSION: "2.0.11",
    AGENTS_SRC: path.join(__dirname, "..", ".agents"),
  });
}

test("performUpdate preserves user language settings in config.yaml", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-update-test-"));
  const agentsDir = path.join(tmpDir, ".agents");
  fs.mkdirSync(agentsDir, { recursive: true });

  // Initial custom config (artifacts-only model)
  const customConfig = `# User Config\nstep_tracking: off\n\nlanguage:\n  artifacts: zh-Hans\n`;
  fs.writeFileSync(path.join(agentsDir, "config.yaml"), customConfig, "utf8");
  fs.writeFileSync(path.join(agentsDir, ".vespyr-version"), JSON.stringify({ version: "2.0.10" }), "utf8");

  const installer = setupTestInstaller(tmpDir);
  await installer.performUpdate(tmpDir, {});

  const cfg = readConfigYaml(path.join(agentsDir, "config.yaml"));
  assert.strictEqual(cfg.language.artifacts, "zh-Hans");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("performUpdate preserves a hand-edited step_tracking value (regression: was reset to shipped default)", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-update-steptrack-"));
  const agentsDir = path.join(tmpDir, ".agents");
  fs.mkdirSync(agentsDir, { recursive: true });

  // User changed ONLY step_tracking (language left at default en).
  const customConfig = `# User Config\nstep_tracking: verbose\n\nlanguage:\n  artifacts: en\n`;
  fs.writeFileSync(path.join(agentsDir, "config.yaml"), customConfig, "utf8");
  fs.writeFileSync(path.join(agentsDir, ".vespyr-version"), JSON.stringify({ version: "2.0.10" }), "utf8");

  const installer = setupTestInstaller(tmpDir);
  await installer.performUpdate(tmpDir, {});

  const cfg = readConfigYaml(path.join(agentsDir, "config.yaml"));
  assert.strictEqual(cfg.step_tracking, "verbose", "hand-edited step_tracking must survive update");
  assert.strictEqual(cfg.language.artifacts, "en");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("performUpdate preserves BOTH step_tracking and language together", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-update-both-"));
  const agentsDir = path.join(tmpDir, ".agents");
  fs.mkdirSync(agentsDir, { recursive: true });

  fs.writeFileSync(path.join(agentsDir, "config.yaml"), `step_tracking: silent\n\nlanguage:\n  artifacts: id\n`, "utf8");
  fs.writeFileSync(path.join(agentsDir, ".vespyr-version"), JSON.stringify({ version: "2.0.10" }), "utf8");

  const installer = setupTestInstaller(tmpDir);
  await installer.performUpdate(tmpDir, {});

  const cfg = readConfigYaml(path.join(agentsDir, "config.yaml"));
  assert.strictEqual(cfg.step_tracking, "silent");
  assert.strictEqual(cfg.language.artifacts, "id");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("performUpdate backs up corrupted config.yaml and restores clean defaults without crashing", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-corrupt-test-"));
  const agentsDir = path.join(tmpDir, ".agents");
  fs.mkdirSync(agentsDir, { recursive: true });

  // Corrupted non-yaml file
  const corruptedContent = `{{{{ INVALID YAML SYNTAX }:::`;
  fs.writeFileSync(path.join(agentsDir, "config.yaml"), corruptedContent, "utf8");
  fs.writeFileSync(path.join(agentsDir, ".vespyr-version"), JSON.stringify({ version: "2.0.10" }), "utf8");

  const installer = setupTestInstaller(tmpDir);
  await installer.performUpdate(tmpDir, {});

  // Clean defaults restored
  const cfg = readConfigYaml(path.join(agentsDir, "config.yaml"));
  assert.strictEqual(cfg.language.artifacts, "en");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("fresh install with --language-artifacts pins the artifact language", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-freshlang-"));
  const installer = setupTestInstaller(tmpDir);

  await installer.performFreshInstall(tmpDir, {
    yes: true,
    harnesses: [],
    languageArtifacts: "id",
  });

  const cfg = readConfigYaml(path.join(tmpDir, ".agents", "config.yaml"));
  assert.strictEqual(cfg.language.artifacts, "id");

  // chat is never written as a config key
  const raw = fs.readFileSync(path.join(tmpDir, ".agents", "config.yaml"), "utf8");
  assert.ok(!/^[ \t]*chat:/m.test(raw), "no chat key");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("interactive wizard language step writes the chosen artifacts language (chat stays auto)", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-wizlang-"));

  // Per-step answers for askSingleChoice, matched by the question text so the
  // test stays robust if unrelated steps are reordered.
  const singleChoiceAnswer = (question) => {
    if (/installation scope/i.test(question)) return 0;   // Project-level
    if (/target directory/i.test(question)) return 0;     // Current dir
    if (/link method/i.test(question)) return 0;          // Symlink
    if (/generated documents/i.test(question)) return 1;  // Bahasa Indonesia (id)
    if (/Proceed with installation/i.test(question)) return 0; // install now
    return 0;
  };

  const noop = () => {};
  const wizardState = {};
  const installer = createInstaller({
    log: noop, logDry: noop, logWarn: noop, logError: noop,
    askChecklist: async () => [],
    askSingleChoice: async (question) => singleChoiceAnswer(question),
    askQuestion: async () => "User",
    detectRepository: () => "https://github.com/test/repo.git",
    detectMethod: () => "symlink",
    performSyncDocs: noop,
    getExistingUserNickname: () => "User",
    updateUserNickname: noop,
    writeManifest: noop,
    performGenerateManifest: noop,
    buildSourceManifest: () => ({ files: {} }),
    removeStaleManifestFiles: noop,
    detectInstalledHarnesses: () => [],
    installGitHook: () => true,
    setupSignalHandler: noop,
    teardownSignalHandler: noop,
    printSummary: noop,
    clearScreen: noop,
    printWizardSummary: noop,
    wizardState,
    ASCII_ART: "",
    VERSION: "2.0.11",
    AGENTS_SRC: path.join(__dirname, "..", ".agents"),
  });

  await installer.performFreshInstall(tmpDir, { yes: false, harnesses: [] });

  const cfg = readConfigYaml(path.join(tmpDir, ".agents", "config.yaml"));
  assert.strictEqual(cfg.language.artifacts, "id");
  assert.strictEqual(wizardState.languageArtifacts, "id");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});


// --- reconfigure language behavior ---

function setupInstalledWorkspace(artifactLang) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-reconf-"));
  const agentsDir = path.join(tmpDir, ".agents");
  const memDir = path.join(tmpDir, "artifacts", "memory");
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(memDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir, "config.yaml"),
    `step_tracking: off\n\nlanguage:\n  artifacts: ${artifactLang}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(agentsDir, ".vespyr-version"),
    JSON.stringify({ version: "2.0.11" }),
    "utf8",
  );
  fs.writeFileSync(
    path.join(memDir, "project-context.md"),
    "# Project Context\n\n<!-- BEGIN MACHINE STATE -->\n## [RUNTIME STATE]\n- Stack: None\n- Artifact Language: en (English — generated documents, specs, code comments, and commit messages)\n<!-- END MACHINE STATE -->\n",
    "utf8",
  );
  return { tmpDir, agentsDir, memDir };
}

test("reconfigure --yes keeps the existing artifact language when --language-artifacts is omitted", async () => {
  const { tmpDir } = setupInstalledWorkspace("id");
  const installer = setupTestInstaller(tmpDir);

  await installer.performReconfigure(tmpDir, { yes: true, harnesses: [] });

  const cfg = readConfigYaml(path.join(tmpDir, ".agents", "config.yaml"));
  assert.strictEqual(cfg.language.artifacts, "id", "language survives reconfigure core-refresh clobber");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("reconfigure --language-artifacts changes the artifact language and live-syncs project-context", async () => {
  const { tmpDir, memDir } = setupInstalledWorkspace("en");
  const installer = setupTestInstaller(tmpDir);

  await installer.performReconfigure(tmpDir, { yes: true, harnesses: [], languageArtifacts: "mandarin" });

  const cfg = readConfigYaml(path.join(tmpDir, ".agents", "config.yaml"));
  assert.strictEqual(cfg.language.artifacts, "zh-Hans", "alias normalized + written");

  const pc = fs.readFileSync(path.join(memDir, "project-context.md"), "utf8");
  assert.ok(/- Artifact Language: zh-Hans —/.test(pc), "project-context live-synced to new language");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("reconfigure preserves a hand-edited step_tracking value (regression: reset to shipped silent)", async () => {
  const { tmpDir } = setupInstalledWorkspace("en");
  // User set step_tracking: off; shipped default is silent.
  fs.writeFileSync(
    path.join(tmpDir, ".agents", "config.yaml"),
    `step_tracking: off\n\nlanguage:\n  artifacts: en\n`,
    "utf8",
  );
  const installer = setupTestInstaller(tmpDir);

  await installer.performReconfigure(tmpDir, { yes: true, harnesses: [] });

  const cfg = readConfigYaml(path.join(tmpDir, ".agents", "config.yaml"));
  assert.strictEqual(cfg.step_tracking, "off", "hand-edited step_tracking must survive reconfigure");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});


test("reconfigure interactive: language prompt cursor defaults to the current language index", async () => {
  const { tmpDir } = setupInstalledWorkspace("id"); // id is index 1 in LANG_CODES
  const noop = () => {};

  let langInitialIndex = null;
  const askSingleChoice = async (question, choices, initialIndex) => {
    if (/generated documents/i.test(question)) {
      langInitialIndex = initialIndex;
      return initialIndex; // keep current
    }
    return 0;
  };

  const installer = createInstaller({
    log: noop, logDry: noop, logWarn: noop, logError: noop,
    askChecklist: async () => [],
    askSingleChoice,
    askQuestion: async () => "User",
    detectRepository: () => "https://github.com/test/repo.git",
    detectMethod: () => "symlink",
    performSyncDocs: noop,
    getExistingUserNickname: () => "User",
    updateUserNickname: noop,
    writeManifest: noop,
    performGenerateManifest: noop,
    buildSourceManifest: () => ({ files: {} }),
    removeStaleManifestFiles: noop,
    detectInstalledHarnesses: () => [],
    installGitHook: () => true,
    setupSignalHandler: noop,
    teardownSignalHandler: noop,
    printSummary: noop,
    clearScreen: noop,
    printWizardSummary: noop,
    wizardState: {},
    ASCII_ART: "",
    VERSION: "2.0.11",
    AGENTS_SRC: path.join(__dirname, "..", ".agents"),
  });

  await installer.performReconfigure(tmpDir, { yes: false, harnesses: [] });

  assert.strictEqual(langInitialIndex, 1, "cursor should start on the current language (id = index 1), not 0");

  const cfg = readConfigYaml(path.join(tmpDir, ".agents", "config.yaml"));
  assert.strictEqual(cfg.language.artifacts, "id", "keeping the highlighted current choice preserves id");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
