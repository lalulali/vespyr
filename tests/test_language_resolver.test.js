const test = require("node:test");
const assert = require("node:assert");
const {
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  getSupportedLanguages,
  isValidLanguage,
  getLanguageDisplay,
  formatWarningBlock,
  formatCommandTip,
  findSuggestion
} = require("../.agents/scripts/lib/language_resolver");

test("SUPPORTED_LANGUAGES covers exactly the 14 curated languages", () => {
  assert.strictEqual(SUPPORTED_LANGUAGES.length, 14);
  const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
  assert.deepStrictEqual(
    codes,
    ['auto', 'en', 'id', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt', 'hi', 'de', 'fr', 'ru', 'ar']
  );
});

test("Exact canonical codes are resolved directly without fallback", () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const res = normalizeLanguage(lang.code);
    assert.strictEqual(res.code, lang.code);
    assert.strictEqual(res.isFallback, false);
    assert.strictEqual(isValidLanguage(lang.code), true);
  }
});

test("English aliases map to 'en'", () => {
  const inputs = ['en', 'eng', 'english', 'inggris', ' ENGLISH ', 'Eng'];
  for (const input of inputs) {
    const res = normalizeLanguage(input);
    assert.strictEqual(res.code, 'en', `Failed on input: ${input}`);
    assert.strictEqual(res.isFallback, false);
  }
});

test("Indonesian aliases map to 'id'", () => {
  const inputs = ['id', 'ind', 'indo', 'indonesia', 'indonesian', 'bahasa', ' INDONESIA '];
  for (const input of inputs) {
    const res = normalizeLanguage(input);
    assert.strictEqual(res.code, 'id', `Failed on input: ${input}`);
    assert.strictEqual(res.isFallback, false);
  }
});

test("Chinese (Simplified) aliases map to 'zh-Hans'", () => {
  const inputs = ['zh', 'cn', 'zh-cn', 'zh-hans', 'chinese', 'mandarin', 'china', 'simplified', 'zh-s'];
  for (const input of inputs) {
    const res = normalizeLanguage(input);
    assert.strictEqual(res.code, 'zh-Hans', `Failed on input: ${input}`);
    assert.strictEqual(res.isFallback, false);
  }
});

test("Chinese (Traditional) aliases map to 'zh-Hant'", () => {
  const inputs = ['tw', 'hk', 'zh-tw', 'zh-hk', 'zh-hant', 'traditional', 'traditional-chinese', 'taiwan', 'zh-t'];
  for (const input of inputs) {
    const res = normalizeLanguage(input);
    assert.strictEqual(res.code, 'zh-Hant', `Failed on input: ${input}`);
    assert.strictEqual(res.isFallback, false);
  }
});

test("Hindi & India aliases map to 'hi'", () => {
  const inputs = ['hi', 'hindi', 'india', 'indian', ' India '];
  for (const input of inputs) {
    const res = normalizeLanguage(input);
    assert.strictEqual(res.code, 'hi', `Failed on input: ${input}`);
    assert.strictEqual(res.isFallback, false);
  }
});

test("Portuguese & Brazil aliases map to 'pt'", () => {
  const inputs = ['pt', 'portuguese', 'portugues', 'brazil', 'brasil', 'portugal'];
  for (const input of inputs) {
    const res = normalizeLanguage(input);
    assert.strictEqual(res.code, 'pt', `Failed on input: ${input}`);
    assert.strictEqual(res.isFallback, false);
  }
});

test("Auto / Follow Chat aliases map to 'auto'", () => {
  const inputs = ['auto', 'follow', 'follow-chat', 'same', 'dynamic', 'match'];
  for (const input of inputs) {
    const res = normalizeLanguage(input);
    assert.strictEqual(res.code, 'auto', `Failed on input: ${input}`);
    assert.strictEqual(res.isFallback, false);
  }
});

test("Unrecognized language input triggers safe fallback to 'en'", () => {
  const res = normalizeLanguage('klingon');
  assert.strictEqual(res.code, 'en');
  assert.strictEqual(res.isFallback, true);
  assert.strictEqual(res.originalInput, 'klingon');
  assert.ok(res.warningBlock.includes("Unrecognized language input 'klingon'"));
  assert.ok(res.warningBlock.includes("Defaulting target setting to 'en'"));
  assert.ok(res.commandTip.includes("vespyr lang set"));
  assert.strictEqual(isValidLanguage('klingon'), false);
});

test("Close typo inputs provide fuzzy suggestions in warning block", () => {
  const res = normalizeLanguage('engg');
  assert.strictEqual(res.code, 'en');
  assert.strictEqual(res.isFallback, true);
  assert.ok(res.suggestion, "Expected suggestion for typo 'engg'");
  assert.strictEqual(res.suggestion.code, 'en');
  assert.ok(res.warningBlock.includes("Did you mean 'en' (English)?"));
});

test("getLanguageDisplay returns formatted name and code", () => {
  assert.strictEqual(getLanguageDisplay('en'), 'English (en)');
  assert.strictEqual(getLanguageDisplay('id'), 'Indonesian (id)');
  assert.strictEqual(getLanguageDisplay('zh-Hans'), 'Chinese (Simplified) (zh-Hans)');
  assert.strictEqual(getLanguageDisplay('auto'), 'Auto / Follow Chat (auto)');
  assert.strictEqual(getLanguageDisplay('unknown_code'), 'unknown_code');
});

// --- Shared config reader/writer (DNA 9 Rule 4: one grammar, quote-safe, loud) ---

const fs = require("fs");
const path = require("path");
const os = require("os");
const { cleanScalar, readConfig, writeConfigLanguage } = require("../.agents/scripts/lib/language_resolver");

function tmpConfig(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vespyr-resolver-"));
  const cfg = path.join(dir, ".agents", "config.yaml");
  fs.mkdirSync(path.dirname(cfg), { recursive: true });
  if (body !== undefined) fs.writeFileSync(cfg, body, "utf8");
  return { dir, cfg };
}

test("cleanScalar strips surrounding quotes and inline comments", () => {
  assert.strictEqual(cleanScalar('"zh-Hans"'), 'zh-Hans');
  assert.strictEqual(cleanScalar("'id'"), 'id');
  assert.strictEqual(cleanScalar('id   # my note'), 'id');
  assert.strictEqual(cleanScalar('  auto  '), 'auto');
  assert.strictEqual(cleanScalar(''), undefined);
});

test("readConfig normalizes a quoted on-disk value instead of silently failing", () => {
  // Quoted value used to parse literally ('"zh-Hans"') -> silent fallback to en.
  const { dir, cfg } = tmpConfig(`step_tracking: off\n\nlanguage:\n  artifacts: "zh-Hans"\n`);
  const res = readConfig(cfg);
  assert.strictEqual(res.language.artifacts, 'zh-Hans');
  assert.strictEqual(res.artifactsFallback, false);
  assert.strictEqual(res.language.chat, undefined, 'chat is not a config key');
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readConfig flags an unrecognized artifacts value as a LOUD fallback (DNA 4)", () => {
  const { dir, cfg } = tmpConfig(`language:\n  artifacts: klingon\n`);
  const res = readConfig(cfg);
  assert.strictEqual(res.language.artifacts, 'en');
  assert.strictEqual(res.artifactsFallback, true);
  assert.strictEqual(res.rawArtifacts, 'klingon');
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readConfig returns clean defaults for an absent config (no false fallback flag)", () => {
  const { dir, cfg } = tmpConfig(undefined);
  const res = readConfig(cfg);
  assert.strictEqual(res.language.artifacts, 'en');
  assert.strictEqual(res.artifactsFallback, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("writeConfigLanguage round-trips through the single reader and preserves step_tracking", () => {
  const { dir, cfg } = tmpConfig(`step_tracking: silent\n\nlanguage:\n  artifacts: en\n`);
  writeConfigLanguage(cfg, { artifacts: 'id' });
  const res = readConfig(cfg);
  assert.strictEqual(res.language.artifacts, 'id');
  assert.strictEqual(res.step_tracking, 'silent');
  fs.rmSync(dir, { recursive: true, force: true });
});
