#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { writeFileSync: atomicWriteFileSync } = require('./lib/fs_atomic.js');

const { findWorkspaceRoot } = require('./lib/workspace');
const ROOT = findWorkspaceRoot(__dirname);
const CANONICAL_PATH = path.join(ROOT, '.agents', 'templates', 'system', 'AGENTS.md.canonical');
const FALLBACK_CANONICAL = path.join(ROOT, '.agents', 'templates', 'system', 'agent.md.canonical');
const CANONICAL = fs.existsSync(CANONICAL_PATH) ? CANONICAL_PATH : FALLBACK_CANONICAL;

const TARGETS = [
  { file: 'AGENTS.md', dotfolder: '.agents/' },
  { file: 'agent.md',  dotfolder: '.agents/' },
  { file: 'CLAUDE.md', dotfolder: '.claude/' },
  { file: path.join('.kiro', 'steering', 'vespyr-steering.md'), dotfolder: '.kiro/', optional: true },
];

const CANONICAL_SECTIONS = [
  'Core Behavioral Guidelines',
  'Shared Memory',
  'Core Agent Personas',
  'Workflows (Skills)',
  'Guardrails',
];

function validate(filePath, content) {
  if (!content || content.trim().length === 0) {
    console.error(`FAIL: ${filePath} is empty`);
    return false;
  }
  for (const section of CANONICAL_SECTIONS) {
    if (!content.includes(section)) {
      console.error(`FAIL: ${filePath} missing canonical section "${section}"`);
      return false;
    }
  }
  return true;
}

function generate(canonical, dotfolder) {
  if (dotfolder === '.agents/') return canonical;
  return canonical.replace(/\.agents\//g, dotfolder);
}

function main() {
  if (!fs.existsSync(CANONICAL)) {
    console.error(`Canonical file not found: ${CANONICAL}`);
    process.exit(1);
  }

  const canonical = fs.readFileSync(CANONICAL, 'utf-8');
  let allPassed = true;

  for (const target of TARGETS) {
    const outPath = path.join(ROOT, target.file);
    const dirPath = path.dirname(outPath);

    if (target.optional && !fs.existsSync(dirPath)) {
      continue;
    }

    if (fs.existsSync(outPath) && fs.lstatSync(outPath).isSymbolicLink()) {
      fs.unlinkSync(outPath);
    }

    const content = generate(canonical, target.dotfolder);
    if (!validate(outPath, content)) {
      allPassed = false;
      continue;
    }

    atomicWriteFileSync(outPath, content);
    console.log(`OK: ${path.relative(ROOT, outPath)} (dotfolder: ${target.dotfolder})`);
  }

  if (!allPassed) process.exit(1);
  console.log('\nAll entry points synced successfully.');
}

main();
