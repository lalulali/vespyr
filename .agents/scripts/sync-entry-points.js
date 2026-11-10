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
  { file: 'CLAUDE.md', dotfolder: '.claude/', harness: 'claude' },
  { file: path.join('.kiro', 'steering', 'vespyr-steering.md'), dotfolder: '.kiro/', optional: true, preserveLink: true },
];

// Which harnesses the CLI actually installed. Absent flag (direct invocation)
// keeps the historical write-everything behavior.
const harnessFlag = process.argv.slice(2).find((arg) => arg.startsWith('--harnesses='));
const selectedHarnesses = harnessFlag
  ? harnessFlag.slice('--harnesses='.length).split(',').map((h) => h.trim()).filter(Boolean)
  : null;

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
    // Never emit a doc for a harness the user did not install: CLAUDE.md
    // rewrites .agents/ -> .claude/, and with Claude unselected that path
    // does not exist.
    if (selectedHarnesses && target.harness && !selectedHarnesses.includes(target.harness)) {
      continue;
    }

    const outPath = path.join(ROOT, target.file);
    const dirPath = path.dirname(outPath);

    if (target.optional && !fs.existsSync(dirPath)) {
      continue;
    }

    // Adapter-owned paths (Kiro steering) are created by the harness adapter,
    // which also owns conflict handling and backup placement. This script only
    // seeds the file when it is absent; rewriting an existing link into a real
    // file made the adapter treat its own output as foreign and back it up on
    // every update.
    if (target.preserveLink) {
      try {
        fs.lstatSync(outPath);
        continue;
      } catch {
        // absent — fall through and seed it
      }
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
