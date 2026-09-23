/**
 * Language Localization Resolver & Alias Registry for Vespyr
 *
 * Normalizes user input variations and aliases into canonical ISO 639-1 / BCP 47 codes.
 * Supports fuzzy matching for typos, graceful fallback to 'en', and rich display tables.
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED_LANGUAGES = [
  {
    code: 'auto',
    name: 'Auto / Follow Chat',
    nativeName: 'Dynamic',
    aliases: ['auto', 'follow', 'follow-chat', 'same', 'dynamic', 'match']
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    aliases: ['en', 'eng', 'english', 'inggris']
  },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    aliases: ['id', 'ind', 'indo', 'indonesia', 'indonesian', 'bahasa']
  },
  {
    code: 'zh-Hans',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    aliases: ['zh', 'cn', 'zh-cn', 'zh-hans', 'chinese', 'mandarin', 'china', 'simplified', 'zh-s']
  },
  {
    code: 'zh-Hant',
    name: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    aliases: ['tw', 'hk', 'zh-tw', 'zh-hk', 'zh-hant', 'traditional', 'traditional-chinese', 'traditional chinese', 'zh-t', 'taiwan']
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    aliases: ['ja', 'jp', 'japanese', 'japan', 'jepang']
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    aliases: ['ko', 'kr', 'korean', 'korea']
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    aliases: ['es', 'spanish', 'spain', 'spanyol']
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    aliases: ['pt', 'portuguese', 'portugues', 'brazil', 'brasil', 'portugal']
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    aliases: ['hi', 'hindi', 'india', 'indian']
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    aliases: ['de', 'ger', 'german', 'germany', 'jerman']
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    aliases: ['fr', 'french', 'france', 'prancis']
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    aliases: ['ru', 'russian', 'russia']
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    aliases: ['ar', 'arabic']
  }
];

function levenshtein(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1));
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;
  for (let j = 0; j <= bn; ++j) matrix[j][0] = j;
  for (let j = 1; j <= bn; ++j) {
    for (let i = 1; i <= an; ++i) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

function findSuggestion(input) {
  const clean = String(input || '').trim().toLowerCase();
  if (!clean) return null;

  let best = null;
  let minDistance = Infinity;

  for (const lang of SUPPORTED_LANGUAGES) {
    const candidates = [lang.code.toLowerCase(), ...lang.aliases];
    for (const cand of candidates) {
      const dist = levenshtein(clean, cand);
      const threshold = cand.length > 4 ? 3 : 2;
      if (dist <= threshold && dist < minDistance) {
        minDistance = dist;
        best = lang;
      }
    }
  }

  return best;
}

function formatWarningBlock(input, suggestion, fallbackLang = 'en') {
  const supportedList = SUPPORTED_LANGUAGES.map((l) => l.code).join(', ');
  let block = `⚠️  Warning: Unrecognized language input '${input}'.\n`;
  block += `    Supported languages : ${supportedList}\n`;
  if (suggestion) {
    block += `    Suggestion          : Did you mean '${suggestion.code}' (${suggestion.name})?\n`;
  }
  block += `    Fallback Action     : Defaulting target setting to '${fallbackLang}' (English).\n`;
  return block;
}

function formatCommandTip() {
  return `💡  To change your language, run:\n    vespyr lang set <code|alias>    (e.g., vespyr lang set id  OR  vespyr lang set mandarin)`;
}

function normalizeLanguage(input, fallbackCode = 'en') {
  const clean = String(input || '').trim().toLowerCase();
  
  if (clean) {
    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang.code.toLowerCase() === clean || lang.aliases.includes(clean)) {
        return {
          code: lang.code,
          name: lang.name,
          nativeName: lang.nativeName,
          isFallback: false,
          originalInput: input
        };
      }
    }
  }

  // Not found in supported registry -> fallback to fallbackCode (default: 'en')
  const fallbackLang = SUPPORTED_LANGUAGES.find((l) => l.code === fallbackCode) || SUPPORTED_LANGUAGES[1];
  const suggestion = findSuggestion(input);
  const warningBlock = formatWarningBlock(input, suggestion, fallbackLang.code);
  const commandTip = formatCommandTip();

  return {
    code: fallbackLang.code,
    name: fallbackLang.name,
    nativeName: fallbackLang.nativeName,
    isFallback: true,
    originalInput: input,
    suggestion: suggestion ? { code: suggestion.code, name: suggestion.name } : null,
    warningBlock,
    commandTip
  };
}

function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.map((l) => ({ ...l }));
}

function isValidLanguage(input) {
  const res = normalizeLanguage(input);
  return !res.isFallback;
}

function getLanguageDisplay(code) {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === String(code || '').trim().toLowerCase());
  if (found) {
    return `${found.name} (${found.code})`;
  }
  return String(code || 'unknown');
}

// ---------------------------------------------------------------------------
// Single source of truth for reading/writing config.yaml scalars.
// DNA 9 Rule 4: language configuration resolves through THIS module — every
// caller (CLI, session_start, installer) imports readConfig/writeConfigLanguage
// instead of hand-rolling its own regex grammar. One grammar, no drift.
// ---------------------------------------------------------------------------

// Strip surrounding single/double quotes and inline `# comments` from a raw
// scalar so `chat: "zh-Hans"` and `chat: id   # note` both resolve cleanly.
function cleanScalar(raw) {
  if (raw === undefined || raw === null) return undefined;
  let v = String(raw).trim();
  // drop an inline comment that is not inside quotes
  if (!/^['"]/.test(v)) {
    const hash = v.indexOf('#');
    if (hash !== -1) v = v.slice(0, hash).trim();
  }
  // strip matching surrounding quotes
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v.length ? v : undefined;
}

function matchScalar(content, key) {
  // `key:` possibly indented, value up to end of line (quotes/comments handled by cleanScalar)
  const re = new RegExp(`^[ \\t]*${key}:[ \\t]*(.*)$`, 'm');
  const m = content.match(re);
  return m ? cleanScalar(m[1]) : undefined;
}

/**
 * Read config.yaml language + step_tracking scalars, normalizing the
 * artifacts language through the canonical registry. Chat language is NOT a
 * config key — agents always mirror the user's language in conversation
 * (DNA 9 Rule 1), so only the artifacts (documents/code/commits) language is
 * persisted. Returns resolution metadata so callers can fail loudly on an
 * unrecognized on-disk value instead of silently shipping the wrong language.
 */
function readConfig(configPath) {
  const defaults = { step_tracking: 'off', language: { artifacts: 'en' } };
  let content;
  try {
    if (!fs.existsSync(configPath)) return { ...defaults, artifactsFallback: false };
    content = fs.readFileSync(configPath, 'utf8');
  } catch {
    return { ...defaults, artifactsFallback: false };
  }

  const rawArtifacts = matchScalar(content, 'artifacts');
  const stepTracking = matchScalar(content, 'step_tracking') || 'off';

  const artifactsRes = normalizeLanguage(rawArtifacts !== undefined ? rawArtifacts : 'en', 'en');

  return {
    step_tracking: stepTracking,
    language: { artifacts: artifactsRes.code },
    // fallback flag: true when a NON-EMPTY on-disk value failed to resolve
    artifactsFallback: rawArtifacts !== undefined && artifactsRes.isFallback,
    rawArtifacts
  };
}

/**
 * Write the artifacts language scalar into config.yaml, creating the
 * language: block if absent and preserving unrelated content. Chat is not a
 * config key (DNA 9 Rule 1: chat always auto-mirrors), so only `artifacts`
 * is accepted here.
 */
function writeConfigLanguage(configPath, updates) {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let content = '';
  if (fs.existsSync(configPath)) {
    content = fs.readFileSync(configPath, 'utf8');
  } else {
    content = `# Vespyr Agent System Configuration\nstep_tracking: off\n\nlanguage:\n  artifacts: en\n`;
  }

  if (!/^language:\s*$/m.test(content)) {
    content += `${content.endsWith('\n') ? '' : '\n'}\nlanguage:\n  artifacts: en\n`;
  }

  const setScalar = (key, value) => {
    if (value === undefined) return;
    const re = new RegExp(`^[ \\t]*${key}:[ \\t]*.*$`, 'm');
    if (re.test(content)) {
      content = content.replace(re, `  ${key}: ${value}`);
    } else {
      content = content.replace(/^language:\s*$/m, `language:\n  ${key}: ${value}`);
    }
  };

  setScalar('artifacts', updates.artifacts);

  fs.writeFileSync(configPath, content, 'utf8');
  return readConfig(configPath);
}

/**
 * Write the top-level `step_tracking:` scalar into config.yaml, preserving all
 * other content. Kept separate from writeConfigLanguage because step_tracking
 * is a top-level (unindented) key, not part of the nested language: block.
 * No-ops when value is undefined.
 */
function writeConfigStepTracking(configPath, value) {
  if (value === undefined || value === null) return;
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let content = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  const re = /^step_tracking:[ \t]*.*$/m;
  if (re.test(content)) {
    content = content.replace(re, `step_tracking: ${value}`);
  } else {
    // Prepend if missing (keep it at the top like the shipped default).
    content = `step_tracking: ${value}\n${content}`;
  }
  fs.writeFileSync(configPath, content, 'utf8');
}

module.exports = {
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  getSupportedLanguages,
  isValidLanguage,
  getLanguageDisplay,
  formatWarningBlock,
  formatCommandTip,
  findSuggestion,
  cleanScalar,
  readConfig,
  writeConfigLanguage,
  writeConfigStepTracking
};
