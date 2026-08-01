#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

const SQUAD_FIXES = {
  'product-manager': 'design',
  'product-designer': 'design',
  'data-analyst': 'design',
  architect: 'build',
  'tech-lead': 'build',
  developer: 'build',
  'code-reviewer': 'build',
  'qa-engineer': 'build',
  'devops-engineer': 'build',
  'technical-writer': 'build',
  'ml-ai-engineer': 'build',
  'security-engineer': 'ship',
  'performance-engineer': 'ship',
  researcher: 'research',
  'user-researcher': 'research',
  'ux-researcher': 'research',
  founder: 'startup',
  reader: 'full-team',
  writer: 'full-team',
  executor: 'full-team',
  'memory-controller': 'full-team',
};

for (const [name, squad] of Object.entries(SQUAD_FIXES)) {
  const filePath = path.join(AGENTS_DIR, `${name}.md`);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${name} — file not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const oldSquad = content.match(/^default_squad: (.+)$/m);
  const oldSquadName = oldSquad ? oldSquad[1] : '(missing)';

  content = content.replace(/^default_squad: .+$/m, `default_squad: ${squad}`);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`OK: ${name}: ${oldSquadName} -> ${squad}`);
}

const mlPath = path.join(AGENTS_DIR, 'ml-ai-engineer.md');
let mlContent = fs.readFileSync(mlPath, 'utf-8');
if (!mlContent.includes('version:')) {
  mlContent = mlContent.replace(
    /(model: opencode-go\/claude-sonnet-4\n)/,
    '$1version: "1.0"\nlast_updated: 2026-07-10\n',
  );
  fs.writeFileSync(mlPath, mlContent, 'utf-8');
  console.log('OK: ml-ai-engineer: added missing version field');
} else {
  console.log('SKIP: ml-ai-engineer: already has version');
}
