#!/usr/bin/env node
/**
 * Memory Consolidation Migration Engine — Epic 02i
 *
 * Idempotently migrates legacy agent-notes into patterns-and-conventions.md,
 * purges ghost directories (agent-notes/, pending-questions/, session-checkpoints/),
 * removes obsolete agent-notes-template.md, and asserts memory token budgets.
 *
 * Zero-loss guarantee (Task 3.4/A1, 2026-08-25): sections of ANY ATX level
 * (#..######) plus pre-header preamble are captured; exact-duplicate sections
 * dedupe, divergent duplicates migrate as "(variant N)"; before any purge the
 * output is diffed line-by-line against every input and migration ABORTS with
 * exit 1 if a single non-blank line would be lost. Purge never runs on
 * partial capture.
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

const PATTERNS_BUDGET_TOKENS = 500; // spec 02i §2.2 Tier 2 budget

function nonEmptyLines(content) {
  return content.split('\n').map(l => l.trim()).filter(l => l !== '');
}

/**
 * Lossless sectioning: captures pre-header preamble AND headers of ANY level
 * (# through ######). A "section" is (header, lines[]); blank-only tails are
 * dropped by the caller's zero-loss gate being whitespace-insensitive.
 */
function parseSections(content) {
  const sections = [];
  let current = null;
  for (const line of content.split('\n')) {
    if (/^#{1,6} /.test(line)) {
      if (current && current.lines.some(l => l.trim() !== '')) sections.push(current);
      current = { header: line.trim(), lines: [line] };
    } else {
      if (!current) current = { header: '(preamble)', lines: [] };
      current.lines.push(line);
    }
  }
  if (current && current.lines.some(l => l.trim() !== '')) sections.push(current);
  return sections;
}

/**
 * Merges source sections into target sections with union semantics:
 * - identical header AND identical body -> duplicate (skipped)
 * - same header, different body -> migrated under "<header> (variant N)"
 * so output content is the UNION of inputs (zero loss by construction).
 */
function mergeSections(targetSections, sourceSections, sourceLabel) {
  let migrated = 0;
  let skipped = 0;
  const byHeader = new Map();
  for (const s of targetSections) {
    const list = byHeader.get(s.header) || [];
    list.push(s);
    byHeader.set(s.header, list);
  }
  for (const src of sourceSections) {
    const bodyKey = JSON.stringify(src.lines.map(l => l.trimEnd()));
    const existingList = byHeader.get(src.header) || [];
    const identical = existingList.some(
      e => JSON.stringify(e.lines.map(l => l.trimEnd())) === bodyKey
    );
    if (identical) {
      skipped++;
      continue;
    }
    let header = src.header;
    if (existingList.length > 0) {
      // Divergent duplicate: preserve BOTH bodies under a variant header.
      let n = existingList.length + 1;
      do {
        header = `${src.header} (variant ${n} from ${sourceLabel})`;
        n++;
      } while (byHeader.has(header));
    }
    const section = { header, lines: [header, ...src.lines.slice(1)] };
    targetSections.push(section);
    const list = byHeader.get(src.header) || [];
    list.push(section);
    byHeader.set(src.header, list);
    migrated++;
  }
  return { migrated, skipped };
}

function renderSections(sections) {
  return sections
    .map(s => s.lines.join('\n').trim())
    .filter(b => b !== '')
    .join('\n\n---\n\n');
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
    under_budget: true,
    loss_check: 'not-run'
  };

  const patternsContent = fs.existsSync(PATTERNS_FILE)
    ? fs.readFileSync(PATTERNS_FILE, 'utf8')
    : '# Patterns and Conventions\n\n';

  const targetSections = parseSections(patternsContent);

  // 1. Collect source files from agent-notes/
  const sources = [];
  if (fs.existsSync(AGENT_NOTES_DIR)) {
    for (const f of fs.readdirSync(AGENT_NOTES_DIR).filter(f => f.endsWith('.md'))) {
      const p = path.join(AGENT_NOTES_DIR, f);
      sources.push({ label: f.replace(/\.md$/, ''), path: p, content: fs.readFileSync(p, 'utf8') });
    }
  }

  // 2. Union-merge all sources into target sections
  let merged = { migrated: 0, skipped: 0 };
  for (const src of sources) {
    const r = mergeSections(targetSections, parseSections(src.content), src.label);
    merged.migrated += r.migrated;
    merged.skipped += r.skipped;
  }
  result.migrated_entries = merged.migrated;
  result.skipped_duplicates = merged.skipped;

  // 3. Render candidate output and run the ZERO-LOSS GATE before any write.
  let updatedPatterns = patternsContent;
  if (merged.migrated > 0) {
    const renderedBody = renderSections(targetSections);
    // Preserve the original title line if present (it lives inside
    // targetSections already) — never emit a duplicated H1.
    const hasTitle = /^# Patterns and Conventions\s*$/m.test(patternsContent);
    updatedPatterns = hasTitle ? renderedBody + '\n' : '# Patterns and Conventions\n\n' + renderedBody + '\n';

    const outSet = new Set(nonEmptyLines(updatedPatterns));
    const lost = [];
    for (const src of sources) {
      for (const line of nonEmptyLines(src.content)) {
        if (!outSet.has(line)) lost.push({ file: path.basename(src.path), line });
      }
    }
    result.loss_check = lost.length === 0 ? 'pass' : `FAIL (${lost.length} lines lost)`;
    if (lost.length > 0) {
      // Zero-loss gate: abort BEFORE any write or purge.
      const err = new Error(`ZERO_LOSS_GATE: migration would lose ${lost.length} line(s)` +
        ` — first 5: ${JSON.stringify(lost.slice(0, 5))}`);
      err.result = { ...result, purged_directories: [], purged_templates: [] };
      throw err;
    }

    if (!dryRun) {
      atomicWriteFileSync(PATTERNS_FILE, updatedPatterns, 'utf8');
    }
  } else {
    result.loss_check = 'pass (nothing to migrate)';
  }

  // 4. Purge ghost directories — ONLY reachable when the gate passed.
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

  // 5. Remove agent-notes-template.md if present
  if (fs.existsSync(TEMPLATE_FILE)) {
    if (!dryRun) {
      fs.unlinkSync(TEMPLATE_FILE);
    }
    result.purged_templates.push('templates/memory/agent-notes-template.md');
  }

  // 6. Update manifest.json if tracked
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
  result.under_budget = result.tokens <= PATTERNS_BUDGET_TOKENS;

  return result;
}

module.exports = { migrateMemory };

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  try {
    const res = migrateMemory({ dryRun });
    console.log(JSON.stringify({ success: true, ...res }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({
      success: false,
      error: err.message,
      ...(err.result ? { partial_result: err.result } : {})
    }, null, 2));
    process.exit(1);
  }
}
