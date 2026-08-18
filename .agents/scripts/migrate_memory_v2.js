#!/usr/bin/env node
/**
 * Memory Consolidation Migration Engine — Epic 02i (Vespyr 2.0.7)
 *
 * Idempotently migrates legacy agent-notes into patterns-and-conventions.md,
 * purges ghost directories (agent-notes/, pending-questions/, session-checkpoints/),
 * removes obsolete agent-notes-template.md, and asserts memory token budgets.
 *
 * Usage:
 *   node .agents/scripts/migrate_memory_v2.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { writeFileSync: atomicWriteFileSync } = require('./lib/fs_atomic.js');

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function countTokens(str) {
  return Math.round(countWords(str) / 0.75);
}

function parseSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (current) sections.push(current);
      current = {
        header: line.trim(),
        lines: [line]
      };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function migrateMemory({ targetDir = process.cwd(), dryRun = false } = {}) {
  const MEMORY_DIR = path.join(targetDir, 'artifacts', 'memory');
  const AGENT_NOTES_DIR = path.join(MEMORY_DIR, 'agent-notes');
  const PENDING_Q_DIR = path.join(MEMORY_DIR, 'pending-questions');
  const CHECKPOINTS_DIR = path.join(MEMORY_DIR, 'session-checkpoints');
  const PATTERNS_FILE = path.join(MEMORY_DIR, 'patterns-and-conventions.md');
  const TEMPLATE_FILE = path.join(targetDir, '.agents', 'templates', 'memory', 'agent-notes-template.md');
  const MANIFEST_FILE = path.join(targetDir, '.agents', 'manifest.json');

  const result = {
    migrated_entries: 0,
    skipped_duplicates: 0,
    purged_directories: [],
    purged_templates: [],
    tokens: 0,
    under_budget: true
  };

  let patternsContent = fs.existsSync(PATTERNS_FILE) ? fs.readFileSync(PATTERNS_FILE, 'utf8') : '# Patterns and Conventions\n\n';
  const existingHeaders = new Set();
  for (const s of parseSections(patternsContent)) {
    existingHeaders.add(s.header);
  }

  const entriesToAppend = [];

  // 1. Process agent-notes
  if (fs.existsSync(AGENT_NOTES_DIR)) {
    const files = fs.readdirSync(AGENT_NOTES_DIR).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const p = path.join(AGENT_NOTES_DIR, f);
      const content = fs.readFileSync(p, 'utf8');
      const sections = parseSections(content);
      for (const section of sections) {
        if (existingHeaders.has(section.header)) {
          result.skipped_duplicates++;
        } else {
          existingHeaders.add(section.header);
          entriesToAppend.push(section);
          result.migrated_entries++;
        }
      }
    }
  }

  // 2. Append migrated entries into patterns-and-conventions.md
  if (entriesToAppend.length > 0) {
    const formatted = entriesToAppend.map(s => s.lines.join('\n').trim()).join('\n\n---\n\n');
    let updatedPatterns = patternsContent.trimEnd() + '\n\n---\n\n' + formatted + '\n';
    if (!dryRun) {
      atomicWriteFileSync(PATTERNS_FILE, updatedPatterns, 'utf8');
    }
    patternsContent = updatedPatterns;
  }

  // 3. Purge ghost directories
  const dirsToPurge = [
    { name: 'agent-notes', path: AGENT_NOTES_DIR },
    { name: 'pending-questions', path: PENDING_Q_DIR },
    { name: 'session-checkpoints', path: CHECKPOINTS_DIR }
  ];

  for (const item of dirsToPurge) {
    if (fs.existsSync(item.path)) {
      if (!dryRun) {
        fs.rmSync(item.path, { recursive: true, force: true });
      }
      result.purged_directories.push(item.name);
    }
  }

  // 4. Remove agent-notes-template.md if present
  if (fs.existsSync(TEMPLATE_FILE)) {
    if (!dryRun) {
      fs.unlinkSync(TEMPLATE_FILE);
    }
    result.purged_templates.push('templates/memory/agent-notes-template.md');
  }

  // 5. Update manifest.json if tracked
  if (fs.existsSync(MANIFEST_FILE)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
      if (manifest.files && manifest.files['templates/memory/agent-notes-template.md']) {
        if (!dryRun) {
          delete manifest.files['templates/memory/agent-notes-template.md'];
          atomicWriteFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
        }
      }
    } catch {}
  }

  const finalPatterns = fs.existsSync(PATTERNS_FILE) ? fs.readFileSync(PATTERNS_FILE, 'utf8') : '';
  result.tokens = countTokens(finalPatterns);
  result.under_budget = result.tokens <= 1200; // < 1200 tokens total for whole file

  return result;
}

module.exports = { migrateMemory };

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  try {
    const res = migrateMemory({ dryRun });
    console.log(JSON.stringify({ success: true, ...res }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  }
}
