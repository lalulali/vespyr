#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');
const SQUADS_DIR = path.resolve(__dirname, '..', 'squads');

const KNOWN_SQUADS = (() => {
  try {
    if (fs.existsSync(SQUADS_DIR)) {
      return fs.readdirSync(SQUADS_DIR)
        .filter(f => f.endsWith('.md'))
        .map(f => path.basename(f, '.md'));
    }
  } catch (_) {}
  return ['startup', 'strategy', 'build', 'quality', 'ship', 'iterate', 'full-team'];
})();

const REQUIRED_FIELDS = [
  'name',
  'icon',
  'description',
  'version',
  'human_name',
  'mode',
  'permission',
  'capabilities',
  'default_squad',
  'origin',
  'channeled_mentor',
];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

function validateAgent(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath, '.md');
  const fm = parseFrontmatter(content);

  if (!fm) {
    console.error(`FAIL: ${filename} — no frontmatter found`);
    return false;
  }

  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (!fm.includes(`${field}:`)) {
      errors.push(`missing ${field}`);
    }
  }

  const nameMatch = fm.match(/^name: (.+)$/m);
  if (nameMatch && nameMatch[1] !== filename) {
    errors.push(`name "${nameMatch[1]}" doesn't match filename`);
  }

  const iconMatch = fm.match(/^icon: (.+)$/m);
  if (iconMatch && iconMatch[1].length > 4) {
    errors.push(`icon "${iconMatch[1]}" doesn't look like a single emoji`);
  }

  const squadMatch = fm.match(/^default_squad: (.+)$/m);
  if (squadMatch && !KNOWN_SQUADS.includes(squadMatch[1])) {
    errors.push(`default_squad "${squadMatch[1]}" not in known squads: ${KNOWN_SQUADS.join(', ')}`);
  }

  const originMatch = fm.match(/^origin: (.+)$/m);
  if (originMatch && originMatch[1] !== 'core' && !originMatch[1].startsWith('module:')) {
    errors.push(`origin "${originMatch[1]}" must be "core" or "module:<name>"`);
  }

  const mentorMatch = fm.match(/^channeled_mentor: (.+)$/m);
  if (mentorMatch) {
    const mentors = mentorMatch[1].split('+').map(s => s.trim()).filter(Boolean);
    if (mentors.length < 1 || mentors.length > 2) {
      errors.push(`channeled_mentor must have 1-2 references, got ${mentors.length}`);
    }
    if (mentorMatch[1].trim().length < 3) {
      errors.push(`channeled_mentor value too short`);
    }
  }

  const capsMatch = fm.match(/^capabilities:\n([\s\S]*?)(?=\n\w)/);
  if (capsMatch && !capsMatch[1].includes('-')) {
    errors.push(`capabilities must have at least one entry`);
  }

  const modelMatch = fm.match(/^model: (.+)$/m);
  if (modelMatch && !/^[\w-]+\/[\w.-]+$/.test(modelMatch[1])) {
    errors.push(`model "${modelMatch[1]}" doesn't match provider/model-name format`);
  }

  const versionMatch = fm.match(/^version: (.+)$/m);
  if (versionMatch && !/^\d+\.\d+(\.\d+)?$/.test(versionMatch[1].replace(/['"]/g, ''))) {
    errors.push(`version "${versionMatch[1]}" not valid semver`);
  }

  const descMatch = fm.match(/^description: (.+)$/m);
  if (descMatch && descMatch[1].trim().length < 10) {
    errors.push(`description too short`);
  }

  if (!content.includes('<!-- IDENTITY:')) {
    errors.push(`missing IDENTITY block in body`);
  } else {
    if (!content.includes('## See the Unseen')) {
      errors.push(`missing "See the Unseen" section in IDENTITY block`);
    }
    if (!content.includes('## Persona principles')) {
      errors.push(`missing "Persona principles" section in IDENTITY block`);
    }
    if (!content.includes('## Persona voice')) {
      errors.push(`missing "Persona voice" section in IDENTITY block`);
    }
  }

  if (!content.includes('## Response format')) {
    errors.push(`missing Response format section in body`);
  }

  // Socratic stance check: warn only, not a hard fail
  const REASONING_AGENTS = [
    'architect', 'code-reviewer', 'data-analyst', 'developer',
    'devops-engineer', 'ml-engineer', 'performance-engineer',
    'product-designer', 'product-manager', 'qa-engineer',
    'researcher', 'security-engineer', 'tech-lead',
  ];
  if (REASONING_AGENTS.includes(filename) && !content.includes('## Socratic Stance')) {
    console.warn('WARN: ' + filename + ' — missing Socratic Stance section (recommended, not required)');
  }

  if (errors.length > 0) {
    console.error(`FAIL: ${filename} — ${errors.join('; ')}`);
    return false;
  }

  return true;
}

function main() {
  if (!fs.existsSync(AGENTS_DIR)) {
    console.error(`Agents directory not found: ${AGENTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    console.error('No agent files found.');
    process.exit(1);
  }

  const results = files.map(f => {
    const filePath = path.join(AGENTS_DIR, f);
    return { file: f, valid: validateAgent(filePath) };
  });

  const failed = results.filter(r => !r.valid);
  const passed = results.filter(r => r.valid);

  console.log(`\n${passed.length} passed, ${failed.length} failed out of ${files.length} agents.`);

  if (failed.length > 0) {
    console.error(`\nFailed agents:`);
    for (const r of failed) console.error(`  - ${r.file}`);
    process.exit(1);
  }

  console.log('All agents valid.');
  process.exit(0);
}

main();
