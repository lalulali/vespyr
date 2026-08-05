#!/usr/bin/env node
/**
 * spec_check.js — Validates all SKILL.md files under .agents/skills/
 * against the agentskills.io Agent Skills specification.
 *
 * Rules enforced (fail = exit 1):
 *   - Frontmatter delimiters present; body non-empty
 *   - Top-level keys limited to name, description, license, compatibility, metadata, allowed-tools
 *   - name == parent dir name, ^[a-z0-9]+(-[a-z0-9]+)*$, <= 64 chars
 *   - description 1-1024 chars, non-empty, single-line (no block scalars, no unquoted ': ')
 *   - compatibility 1-500 chars when present, single-line
 *   - allowed-tools is a space-separated string (YAML list form rejected)
 *   - metadata values are strings (nested maps/lists/block scalars rejected)
 *
 * Warnings (exit 0): SKILL.md body > 500 lines; description < 40 chars.
 *
 * Zero dependencies, node-18 compatible, zero side effects (no file writes).
 * Uses an indent-aware scanner — NOT compile_skills.js's parser, which promotes
 * nested metadata keys to top level.
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BLOCK_SCALARS = new Set(['|', '>', '|-', '>-', '|+', '>+']);
const SCALAR_KEYS = ['description', 'compatibility', 'license', 'allowed-tools'];

function stripQuotes(val) {
  if (val.length >= 2) {
    const first = val[0];
    const last = val[val.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return val.slice(1, -1);
    }
  }
  return val;
}

function isQuoted(val) {
  if (val.length < 2) return false;
  const first = val[0];
  const last = val[val.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'");
}

/**
 * Parse frontmatter with indentation awareness.
 * Returns { data, errors, body, bodyLineCount }.
 */
function parseFrontmatter(content) {
  const errors = [];
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { errors: ['frontmatter delimiters (---) missing'], data: {}, body: content };

  const yamlStr = match[1];
  const body = content.substring(match[0].length);
  const bodyLines = body.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const data = {};
  const lines = yamlStr.split(/\r?\n/);
  let metadataOpen = false;
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    if (/^\s*$/.test(raw) || /^\s*#/.test(raw)) {
      i++;
      continue;
    }

    const trimmed = raw.trim();
    const isIndented = /^[ \t]/.test(raw);

    if (metadataOpen) {
      if (!isIndented) {
        metadataOpen = false; // fall through to top-level handling below
      } else {
        if (trimmed.startsWith('-')) {
          errors.push('metadata contains a list item (values must be strings)');
          i++;
          continue;
        }
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) {
          errors.push(`metadata entry is not "key: value" — "${trimmed}"`);
          i++;
          continue;
        }
        const mKey = trimmed.substring(0, colonIdx).trim();
        let mVal = trimmed.substring(colonIdx + 1).trim();
        if (!mVal) {
          errors.push(`metadata.${mKey} has no value (nested maps rejected; values must be strings)`);
          i++;
          continue;
        }
        if (BLOCK_SCALARS.has(mVal)) {
          errors.push(`metadata.${mKey} uses a block scalar (values must be single-line strings)`);
          i++;
          continue;
        }
        if (!isQuoted(mVal) && mVal.includes(': ')) {
          errors.push(`metadata.${mKey} contains unquoted ": " — quote the value`);
        }
        if (!data.metadata) data.metadata = {};
        data.metadata[mKey] = stripQuotes(mVal);
        i++;
        continue;
      }
    }

    // Top-level line
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      errors.push(`unparseable frontmatter line "${trimmed}"`);
      i++;
      continue;
    }
    const key = trimmed.substring(0, colonIdx).trim();
    let val = trimmed.substring(colonIdx + 1).trim();

    if (key === 'metadata') {
      if (val && !BLOCK_SCALARS.has(val)) {
        errors.push('metadata must be a block of nested key/value entries');
      } else {
        metadataOpen = true;
      }
      i++;
      continue;
    }

    if (!val) {
      // Empty value: detect YAML list continuation
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^[ \t]/.test(lines[j]) && lines[j].trim().startsWith('-')) {
        items.push(lines[j].trim());
        j++;
      }
      if (items.length > 0) {
        if (key === 'allowed-tools') {
          errors.push('allowed-tools uses YAML list form — must be a space-separated string');
        } else if (key === 'name' || key === 'description' || key === 'license' || key === 'compatibility') {
          errors.push(`${key} uses a multiline block — single-line value required`);
        }
        data[key] = items;
        i = j;
        continue;
      }
      if (key === 'allowed-tools') {
        errors.push('allowed-tools must be a non-empty space-separated string');
      } else if (key === 'name') {
        errors.push('name is empty');
      } else if (key === 'description') {
        errors.push('description is empty');
      } else if (key === 'compatibility') {
        errors.push('compatibility is empty (omit the key if not needed)');
      }
      data[key] = '';
      i++;
      continue;
    }

    if (BLOCK_SCALARS.has(val)) {
      errors.push(`${key} uses a block scalar (| or >) — single-line value required`);
      data[key] = '';
      i++;
      continue;
    }

    if (SCALAR_KEYS.includes(key) && !isQuoted(val) && val.includes(': ')) {
      errors.push(`${key} contains unquoted ": " — quote the value (YAML syntax bomb)`);
    }

    data[key] = stripQuotes(val);
    i++;
  }

  // allowed top-level keys
  for (const key of Object.keys(data)) {
    if (key !== 'allowed-tools' && !ALLOWED_KEYS.has(key)) {
      errors.push(`non-standard top-level key "${key}" — move into metadata: or remove`);
    }
  }

  return { data, errors, body, bodyLineCount: bodyLines.length };
}

function checkSkill(skillDir, report) {
  const dirName = path.basename(skillDir);
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    report.errors.push(`${dirName}: missing SKILL.md`);
    return;
  }

  const content = fs.readFileSync(skillFile, 'utf8');
  const { data, errors, bodyLineCount } = parseFrontmatter(content);
  const violations = errors.map((e) => `${dirName}: ${e}`);
  const warnings = [];

  // name rules
  if (!data.name) {
    violations.push(`${dirName}: name is required`);
  } else {
    if (data.name !== dirName) violations.push(`${dirName}: name "${data.name}" != dir name "${dirName}"`);
    if (!NAME_RE.test(data.name)) violations.push(`${dirName}: name "${data.name}" must match ^[a-z0-9]+(-[a-z0-9]+)*$`);
    if (data.name.length > 64) violations.push(`${dirName}: name exceeds 64 chars`);
  }

  // description rules
  if (data.description === undefined) {
    violations.push(`${dirName}: description is required`);
  } else if (typeof data.description === 'string') {
    const len = data.description.length;
    if (len < 1) violations.push(`${dirName}: description must be non-empty`);
    if (len > 1024) violations.push(`${dirName}: description exceeds 1024 chars (${len})`);
    if (len < 40) warnings.push(`${dirName}: description is short (${len} chars)`);
  }

  // compatibility rules
  if (typeof data.compatibility === 'string' && data.compatibility.length > 0) {
    if (data.compatibility.length > 500) {
      violations.push(`${dirName}: compatibility exceeds 500 chars (${data.compatibility.length})`);
    }
  }

  // metadata rules
  if (data.metadata !== undefined) {
    if (Array.isArray(data.metadata) || typeof data.metadata !== 'object') {
      violations.push(`${dirName}: metadata must be a map of string keys to string values`);
    } else {
      for (const [mKey, mVal] of Object.entries(data.metadata)) {
        if (typeof mVal !== 'string') {
          violations.push(`${dirName}: metadata.${mKey} is not a string value`);
        }
      }
    }
  }

  // body size warning
  if (bodyLineCount > 500) warnings.push(`${dirName}: SKILL.md body is ${bodyLineCount} lines (> 500 recommended)`);

  report.errors.push(...violations);
  report.warnings.push(...warnings);
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }

  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const report = { errors: [], warnings: [] };
  for (const item of fs.readdirSync(SKILLS_DIR).sort()) {
    const skillPath = path.join(SKILLS_DIR, item);
    if (!fs.statSync(skillPath).isDirectory()) continue;
    checkSkill(skillPath, report);
  }

  for (const w of report.warnings) console.log(`  ⚠ ${w}`);
  if (report.errors.length > 0) {
    for (const e of report.errors) console.error(`  ✗ ${e}`);
    console.error(`\n${report.errors.length} violation(s) across ${report.warnings.length} warning(s).`);
    process.exit(1);
  }
  console.log(`✓ All ${fs.readdirSync(SKILLS_DIR).filter((d) => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()).length} skills pass agentskills.io spec checks.`);
  if (report.warnings.length > 0) console.log(`  (${report.warnings.length} warning(s) — see above)`);
}

function runSelfTest() {
  const cases = [
    {
      name: 'grill-me (migrated) passes',
      content: '---\nname: grill-me\ndescription: Runs a 7+1-branch Socratic decision tree that stress-tests requirements one assumption at a time. Use when you want to be grilled.\nmetadata:\n  version: "2.0"\n  last_updated: "2026-07-10"\n---\n\n# Body\n',
      minErrors: 0,
    },
    {
      name: 'nested map under metadata fails',
      content: '---\nname: test\ndescription: A sufficiently long description that passes the length check.\nmetadata:\n  nested:\n    deep: value\n---\n',
      minErrors: 1,
    },
    {
      name: 'list under metadata fails',
      content: '---\nname: test\ndescription: A sufficiently long description that passes the length check.\nmetadata:\n  capabilities:\n    - one\n    - two\n---\n',
      minErrors: 1,
    },
    {
      name: 'block scalar description fails',
      content: '---\nname: test\ndescription: |\n  folded text\n---\n',
      minErrors: 1,
    },
    {
      name: 'allowed-tools list form fails',
      content: '---\nname: test\ndescription: A sufficiently long description that passes the length check.\nallowed-tools:\n  - Read\n  - Write\n---\n',
      minErrors: 1,
    },
    {
      name: 'unquoted colon fails',
      content: '---\nname: test\ndescription: Contains patterns including: a colon sequence and is long enough.\n---\n',
      minErrors: 1,
    },
    {
      name: 'non-standard top-level key fails',
      content: '---\nname: test\ndescription: A sufficiently long description that passes the length check.\nversion: "1.0"\n---\n',
      minErrors: 1,
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const { errors } = parseFrontmatter(c.content);
    const total = errors.length;
    if (total >= c.minErrors) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ✗ ${c.name} — expected >= ${c.minErrors} error(s), got ${total}`);
      failed++;
    }
  }
  console.log(failed === 0 ? 'Self-test passed.' : `Self-test FAILED (${failed} case(s)).`);
  process.exit(failed === 0 ? 0 : 1);
}

if (require.main === module) main();
module.exports = { parseFrontmatter, checkSkill };
