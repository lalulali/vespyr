#!/usr/bin/env node
/**
 * compile_skills.js — Crawls all SKILL.md files under .opencode/skills/
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

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (val === '') {
        currentKey = key;
        currentArray = [];
        data[key] = currentArray;
      } else {
        currentKey = key;
        currentArray = null;
        data[key] = val;
      }
    }
  }

  return { data, body };
}

function extractOutputs(text) {
  const outputs = new Set();
  const pattern = /(?:artifacts\/output\/|artifacts\/memory\/)[a-zA-Z0-9_.\/-]+/g;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    outputs.add(m[0].replace(/[).,*]+$/, ''));
  }
  return Array.from(outputs);
}

function extractKeyAgents(text) {
  const agents = new Set();
  const ignored = new Set(['writer', 'reader', 'executor', 'memory-controller', 'orchestrator']);
  const pattern = /@([a-zA-Z0-9_-]+)/g;
  let m;
  while ((m = pattern.exec(text)) !== null) {
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

function compileSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const catalog = [];

  for (const item of fs.readdirSync(SKILLS_DIR)) {
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

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`✓ Compiled ${catalog.length} skills → ${OUTPUT_FILE}`);
}

if (require.main === module) compileSkills();
module.exports = { compileSkills };
