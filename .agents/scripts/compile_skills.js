#!/usr/bin/env node
/**
 * compile_skills.js — Crawls all SKILL.md files under .agents/skills/
 * and compiles a compact JSON catalog used by the help-me skill.
 * Extracts: name, description, prerequisites, outputs, key_agents
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const OUTPUT_FILE = path.join(SKILLS_DIR, 'help-me', 'skills-catalog.json');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: content };

  const yamlStr = match[1];
  const body = content.substring(match[0].length).trim();
  const data = {};
  let currentKey = null;
  let currentArray = null;

  for (const line of yamlStr.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('-') && currentArray) {
      currentArray.push(trimmed.substring(1).trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }

    // Accumulate multi-line block scalar content
    if (currentKey && typeof data[currentKey] === 'string' && data[currentKey] === '' && line[0] === ' ') {
      let suffix = trimmed;
      if (suffix) data[currentKey] += suffix + '\n';
      else data[currentKey] += '\n';
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      if (val === '|' || val === '>' || val === '|-' || val === '>-') {
        // YAML literal/folded block scalar — skip the marker, value is empty until next key
        currentKey = key;
        currentArray = null;
        data[key] = '';
      } else if (val === '') {
        currentKey = key;
        currentArray = [];
        data[key] = currentArray;
      } else {
        currentKey = key;
        currentArray = null;
        data[key] = val.replace(/^['"]|['"]$/g, '');
      }
    }
  }

  return { data, body };
}

function stripFencedBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, '');
}

function extractOutputs(text) {
  const outputs = new Set();
  const pattern = /(?:artifacts\/output\/|artifacts\/memory\/)[a-zA-Z0-9_.\/-]+/g;
  let m;
  const stripped = stripFencedBlocks(text);
  while ((m = pattern.exec(stripped)) !== null) {
    outputs.add(m[0].replace(/[).,*]+$/, ''));
  }
  return Array.from(outputs);
}

function extractKeyAgents(text) {
  const agents = new Set();
  const ignored = new Set(['memory-controller']);
  const pattern = /@([a-zA-Z0-9_-]+)/g;
  let m;
  const stripped = stripFencedBlocks(text);
  while ((m = pattern.exec(stripped)) !== null) {
    if (!ignored.has(m[1])) agents.add(`@${m[1]}`);
  }
  return Array.from(agents);
}

function extractPrerequisites(text) {
  const prereqs = [];
  const match = text.match(/## Prerequisites\s*\r?\n([\s\S]*?)(?:\r?\n##|\r?\n---|$)/i);
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const t = line.trim();
      if ((t.startsWith('-') || t.startsWith('*')) && !t.toLowerCase().includes('none')) {
        const item = t.substring(1).trim().replace(/[\[\]`]/g, '');
        if (item) prereqs.push(item);
      }
    }
  }
  return prereqs;
}


// ============================== R0.2 DELEGATION LINT ==============================
// 02m R0.2 (rebuilt 2026-08-25, owner-adjusted scope): the @reader/@writer/
// @executor personas were REMOVED from the engine — any live reference is a
// dead handle that silently no-ops on every harness. Fail-closed: violations
// block catalog compilation.
const BANNED_DELEGATION_HANDLES = ['@reader', '@writer', '@executor'];

function lintDelegationReferences(skillsDir) {
  const violations = [];
  const bannedRe = new RegExp('@(?:' + BANNED_DELEGATION_HANDLES.map((h) => h.slice(1)).join('|') + ')\\b');
  const scanFile = (filePath, rel) => {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      // NOTE: no allowlist needed — '@technical-writer' cannot match the
      // @-anchored pattern, and a mixed-line escape hatch would suppress
      // genuine violations sharing a line with the string.
      const hit = lines[i].match(bannedRe);
      if (hit) {
        violations.push(`${rel}:${i + 1}: ${hit[0]}`);
      }
    }
  };
  for (const item of fs.readdirSync(skillsDir).sort()) {
    const skillDir = path.join(skillsDir, item);
    if (!fs.statSync(skillDir).isDirectory()) continue;
    const skillFile = path.join(skillDir, 'SKILL.md');
    if (fs.existsSync(skillFile)) scanFile(skillFile, `.agents/skills/${item}/SKILL.md`);
    const stepsDir = path.join(skillDir, 'steps');
    if (fs.existsSync(stepsDir)) {
      for (const step of fs.readdirSync(stepsDir).sort()) {
        if (step.endsWith('.md')) scanFile(path.join(stepsDir, step), `.agents/skills/${item}/steps/${step}`);
      }
    }
  }
  return violations;
}

function compileSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const catalog = [];

  for (const item of fs.readdirSync(SKILLS_DIR).sort()) {
    const skillPath = path.join(SKILLS_DIR, item);
    if (!fs.statSync(skillPath).isDirectory()) continue;

    const skillFile = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    try {
      const content = fs.readFileSync(skillFile, 'utf8');
      const { data, body } = parseFrontmatter(content);
      catalog.push({
        name: data.name || item,
        description: data.description || '',
        prerequisites: extractPrerequisites(body),
        outputs: extractOutputs(body),
        key_agents: extractKeyAgents(body),
      });
    } catch (e) {
      console.error(`Error parsing ${item}: ${e.message}`);
    }
  }

  const violations = lintDelegationReferences(SKILLS_DIR);
  if (violations.length > 0) {
    console.error(`✗ delegation lint: ${violations.length} dead-handle reference(s):`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`✓ Compiled ${catalog.length} skills → ${OUTPUT_FILE}`);
  console.log(`✓ delegation lint: zero removed-persona handles (@reader/@writer/@executor)`);
}

if (require.main === module) compileSkills();
module.exports = { compileSkills };
