/**
 * CLI Language Configuration Command Handler for Vespyr
 *
 * Provides commands for:
 *   vespyr lang                              Show active artifact language
 *   vespyr lang set <language>               Set the artifact output language
 *   vespyr lang list                         List all supported languages & aliases
 *   vespyr lang --help                       Show CLI help menu
 *
 * Chat is NOT configured here — agents always mirror the user's language in
 * conversation (DNA 9 Rule 1). Only the artifact (documents/code/commits)
 * language is persisted. All config reads/writes route through
 * language_resolver.js (readConfig / writeConfigLanguage) — one grammar,
 * quote-safe, no drift.
 */

const path = require('path');
const {
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  getLanguageDisplay,
  readConfig,
  writeConfigLanguage
} = require('../../.agents/scripts/lib/language_resolver');

function getConfigPath(targetDir = process.cwd()) {
  return path.join(targetDir, '.agents', 'config.yaml');
}

// Back-compat shim: callers/tests expect readConfigYaml/updateConfigYamlLanguage.
// Both now delegate to the single resolver grammar (artifacts-only).
function readConfigYaml(configPath) {
  const cfg = readConfig(configPath);
  return {
    step_tracking: cfg.step_tracking,
    language: { artifacts: cfg.language.artifacts }
  };
}

function updateConfigYamlLanguage(configPath, updates) {
  writeConfigLanguage(configPath, { artifacts: updates.artifacts });
  return readConfigYaml(configPath);
}

function printLangHelp() {
  console.log(`Vespyr Multi-Agent Engine — Language Configuration CLI

USAGE:
  vespyr lang                              Show active artifact language
  vespyr lang set <language>               Set the artifact output language
  vespyr lang list                         List all supported languages & aliases
  vespyr lang --help                       Show this help menu

EXAMPLES:
  vespyr lang set id                       Set artifact output to Indonesian (id)
  vespyr lang set mandarin                 Set artifact output to Simplified Chinese (zh-Hans)
  vespyr lang set en                       Set artifact output to English (en)

NOTE:
  This sets the language for GENERATED ARTIFACTS only — PRDs, specs, ADRs,
  code comments, and git commit messages. Conversation always mirrors the
  language you write in; there is no chat-language setting. To get a one-off
  document in another language, just ask for it in that language.

SUPPORTED LANGUAGES:
  en, id, zh-Hans, zh-Hant, ja, ko, es, pt, hi, de, fr, ru, ar
`);
}

function listSupportedLanguages() {
  console.log(`\n========================================================================`);
  console.log(`                VESPYR SUPPORTED LANGUAGE REGISTRY                     `);
  console.log(`========================================================================\n`);

  console.log(`| Canonical Code | Display Name            | Native Name      | Common Aliases`);
  console.log(`| :---           | :---                    | :---             | :---`);
  for (const l of SUPPORTED_LANGUAGES) {
    // 'auto' is a chat concept only; it is not a valid artifact language.
    if (l.code === 'auto') continue;
    const code = l.code.padEnd(14);
    const name = l.name.padEnd(23);
    const native = l.nativeName.padEnd(16);
    const aliases = l.aliases.slice(0, 5).join(', ') + (l.aliases.length > 5 ? '...' : '');
    console.log(`| ${code} | ${name} | ${native} | ${aliases}`);
  }
  console.log(`\n💡 To set the artifact language: vespyr lang set <code|alias> (e.g. vespyr lang set mandarin)\n`);
}

function showLanguageStatus(targetDir = process.cwd()) {
  const configPath = getConfigPath(targetDir);
  const cfg = readConfig(configPath);

  const artifactsDisplay = getLanguageDisplay(cfg.language.artifacts);

  console.log(`\n  \x1b[1mVespyr Language Settings\x1b[0m`);
  console.log(`  \x1b[2m─────────────────────────────────────────────────────────────\x1b[0m`);
  console.log(`  Conversation (chat)           : \x1b[36mmirrors you (auto)\x1b[0m`);
  console.log(`  Document Output   (artifacts) : \x1b[32m${artifactsDisplay}\x1b[0m`);
  console.log(`  \x1b[2m─────────────────────────────────────────────────────────────\x1b[0m`);

  // Loud failure (DNA 4): an unrecognized on-disk value that silently became a
  // fallback must be surfaced, not swallowed.
  if (cfg.artifactsFallback) {
    console.warn(`  \x1b[33m⚠  artifacts value '${cfg.rawArtifacts}' is not a recognized language — falling back to 'en'. Fix it with: vespyr lang set <code>\x1b[0m`);
  }

  console.log(`  Config File: ${path.relative(process.cwd(), configPath) || '.agents/config.yaml'}`);
  console.log(`  Use \`vespyr lang set <language>\` to change the artifact language.\n`);
}

function warnIfFallback(norm) {
  if (norm.isFallback) {
    console.warn(`\n${norm.warningBlock}`);
    console.warn(`${norm.commandTip}\n`);
  }
}

function executeLangCommand(argv, targetDir = process.cwd()) {
  const args = argv.slice(2);
  const configPath = getConfigPath(targetDir);

  // Filter out leading 'lang'
  const subArgs = args[0] === 'lang' ? args.slice(1) : args;

  if (subArgs.length === 0) {
    showLanguageStatus(targetDir);
    return 0;
  }

  const first = subArgs[0];

  if (first === '--help' || first === '-h' || first === 'help') {
    printLangHelp();
    return 0;
  }

  if (first === 'list') {
    listSupportedLanguages();
    return 0;
  }

  if (first === 'get') {
    showLanguageStatus(targetDir);
    return 0;
  }

  if (first === 'set') {
    // Accept both `set <lang>` and the scoped `set artifacts <lang>` (the only
    // scope that exists now — chat is not configurable).
    let rawVal = subArgs[1];
    if (rawVal === 'artifacts' || rawVal === 'output' || rawVal === 'docs') {
      rawVal = subArgs[2];
    } else if (rawVal === 'chat') {
      console.error(`\n[ERROR] There is no chat-language setting. Conversation always mirrors your language.`);
      console.error(`Use 'vespyr lang set <language>' to set the ARTIFACT language, or just ask for a reply in another language.\n`);
      return 1;
    }

    if (!rawVal) {
      console.error(`\n[ERROR] Missing language argument for 'vespyr lang set'.`);
      printLangHelp();
      return 1;
    }

    const norm = normalizeLanguage(rawVal);
    warnIfFallback(norm);
    writeConfigLanguage(configPath, { artifacts: norm.code });
    // Keep the copy agents read (project-context.md machine-state block) in
    // sync the instant the config changes — closes the mid-session staleness
    // window without running the full session-start sync.
    try {
      const { refreshArtifactLanguageLine } = require('../../.agents/scripts/session_start.js');
      const pcPath = path.join(targetDir, 'artifacts', 'memory', 'project-context.md');
      refreshArtifactLanguageLine(pcPath);
    } catch {}
    console.log(`  ✓ Artifact output language updated: artifacts = ${norm.code} (${norm.name})`);
    console.log(`  ℹ  Conversation still mirrors your language automatically.`);
    return 0;
  }

  console.error(`\n[ERROR] Unknown subcommand for 'vespyr lang': ${first}`);
  printLangHelp();
  return 1;
}

module.exports = {
  getConfigPath,
  readConfigYaml,
  updateConfigYamlLanguage,
  printLangHelp,
  listSupportedLanguages,
  showLanguageStatus,
  executeLangCommand
};
