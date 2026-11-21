#!/usr/bin/env node
/**
 * memory_check.js — Memory Structure Checker + artifact witness (Vespyr F2.16).
 *
 * Two independent jobs, one script (the old name `witness.js` was retired 2026-09-30):
 *
 * 1. STRUCTURE (`check`, the default): validates files under artifacts/memory/
 *    against memory-controller.md conventions — entry headers, `**Status:**`
 *    lines, session summaries, and archive index.ndjson. Preserves the original
 *    `[PASS]/[FAIL]` + `Summary:` output contract used by /retro and CI.
 *
 * 2. WITNESS (`sign`, `verify`, `list`, and the witness section of `check`):
 *    SHA-256 fingerprints in `.agents/state/witness.json` — gitignored,
 *    machine-local. Covers memory files AND release evidence (qa-report.md,
 *    utter-satisfaction.json) so validate_satisfaction.js rule 9 has a source.
 *    A witness is a history, not a lock: the first integrity warning on a file
 *    is informational; the second occurrence on the same file blocks (exit 1).
 *    Re-signing resets that file's occurrence counter.
 *
 * Usage:
 *   node memory_check.js check [--dir artifacts/memory] [--root DIR]
 *   node memory_check.js sign <file> [<file> ...] [--root DIR]
 *   node memory_check.js verify <file> [<file> ...] [--root DIR]
 *   node memory_check.js list [--root DIR]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DIR = path.join('artifacts', 'memory');
const WITNESS_REL = path.join('.agents', 'state', 'witness.json');
const DEFAULT_ARTIFACTS = [
  'artifacts/memory/project-context.md',
  'artifacts/memory/active-decisions.md',
  'artifacts/memory/lessons-learned.md',
  'artifacts/memory/patterns-and-conventions.md',
  'artifacts/memory/blockers-and-risks.md',
  'artifacts/output/05-execution/quality/qa-report.md',
  'artifacts/output/05-execution/quality/qa-signoff.md',
  'artifacts/output/06-launch/utter-satisfaction.json',
];

function checkEntryFile(filePath, relName) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { pass: false, detail: 'unreadable: ' + e.message };
  }

  const errors = [];
  const lines = content.split('\n');
  const sections = [];
  let current = null;
  let currentLines = [];

  const flush = () => {
    if (current) {
      current.body = currentLines.join('\n');
      sections.push(current);
    }
    current = null;
    currentLines = [];
  };

  for (const line of lines) {
    if (/^#{2,3}\s/.test(line)) {
      flush();
      current = { header: line.replace(/^#{2,3}\s+/, '').trim(), level: line.startsWith('### ') ? 3 : 2 };
      currentLines = [line];
    } else if (current) {
      currentLines.push(line);
    }
  }
  flush();

  let entryCount = 0;
  for (let idx = 0; idx < sections.length; idx++) {
    const section = sections[idx];
    const bodyText = section.body.replace(/^#{2,3}\s.*$/m, '').trim();
    if (!bodyText) {
      // Level-2 category headers followed by level-3 sub-entries are valid
      const nextSection = sections[idx + 1];
      if (section.level === 2 && nextSection && nextSection.level === 3) {
        continue;
      }
      errors.push(`empty section: "${section.header}"`);
      continue;
    }
    if (section.level === 3 && section.header.startsWith('[')) {
      entryCount++;
      if (!/\[date:\s*\d{4}-\d{2}-\d{2}\]/.test(section.header)) {
        errors.push(`entry missing [date: YYYY-MM-DD] tag: "${section.header}"`);
      }
      if (!/\[agent:\s*@?[A-Za-z0-9_-]+\]/.test(section.header)) {
        errors.push(`entry missing [agent: @name] tag: "${section.header}"`);
      }
      if (!/\*\*Status:\*\*\s+\S+/.test(section.body)) {
        errors.push(`entry missing **Status:** line: "${section.header}"`);
      }
    }
  }

  return errors.length > 0
    ? { pass: false, detail: errors.join('; ') }
    : { pass: true, detail: `${entryCount} entry(ies), ${sections.length} section(s)` };
}

function checkSessionFile(filePath, relName) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { pass: false, detail: 'unreadable: ' + e.message };
  }

  if (path.basename(relName) === 'latest.md') {
    return content.includes('## Last Session')
      ? { pass: true, detail: 'has ## Last Session' }
      : { pass: false, detail: 'missing "## Last Session" section' };
  }

  const errors = [];
  let checked = 0;
  for (const raw of content.split(/^##\s+/m).filter(s => s.trim())) {
    const head = raw.split('\n')[0].trim();
    if (!/\[\d{4}-\d{2}-\d{2}\]\s+Agent:\s*@+[A-Za-z0-9_-]+/.test(head)) continue;
    checked++;
    if (!/^- Worked on:/m.test(raw)) {
      errors.push(`session entry missing "- Worked on:": "${head}"`);
    }
  }

  return errors.length > 0
    ? { pass: false, detail: errors.join('; ') }
    : { pass: true, detail: `${checked} session entr(ies)` };
}

function checkArchiveIndex(filePath) {
  if (!fs.existsSync(filePath)) {
    return { pass: true, detail: 'no index.ndjson yet' };
  }
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { pass: false, detail: 'unreadable: ' + e.message };
  }

  const errors = [];
  let entries = 0;
  for (const line of content.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        errors.push('line is not a JSON object: ' + s.substring(0, 60));
      } else if (obj.id) {
        entries++;
      }
    } catch (e) {
      errors.push('corrupt JSON line: ' + s.substring(0, 60));
    }
  }

  return errors.length > 0
    ? { pass: false, detail: errors.join('; ') }
    : { pass: true, detail: `${entries} entr(ies)` };
}

function collectFiles(dir) {
  const files = [];
  const core = ['active-decisions.md', 'lessons-learned.md', 'patterns-and-conventions.md', 'blockers-and-risks.md', 'project-context.md', 'teaching-style.md'];
  for (const name of core) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) files.push({ rel: name, path: p, kind: 'entry' });
  }

  const sessions = path.join(dir, 'session-summaries');
  if (fs.existsSync(sessions)) {
    for (const f of fs.readdirSync(sessions)) {
      if (f.endsWith('.md')) files.push({ rel: 'session-summaries/' + f, path: path.join(sessions, f), kind: 'session' });
    }
  }

  const archive = path.join(dir, 'archive');
  if (fs.existsSync(archive)) {
    const ndjson = path.join(archive, 'index.ndjson');
    if (fs.existsSync(ndjson)) files.push({ rel: 'archive/index.ndjson', path: ndjson, kind: 'archive' });
    for (const f of fs.readdirSync(archive)) {
      const p = path.join(archive, f);
      if (f.endsWith('.md')) {
        files.push({ rel: 'archive/' + f, path: p, kind: 'entry' });
      } else if (fs.statSync(p).isDirectory()) {
        for (const sf of fs.readdirSync(p)) {
          if (sf.endsWith('.md')) files.push({ rel: 'archive/' + f + '/' + sf, path: path.join(p, sf), kind: 'entry' });
        }
      }
    }
  }

  return files;
}

function runCheck(dir) {
  const files = collectFiles(dir);
  const results = [];

  for (const file of files) {
    const res = file.kind === 'entry'
      ? checkEntryFile(file.path, file.rel)
      : file.kind === 'session'
        ? checkSessionFile(file.path, file.rel)
        : checkArchiveIndex(file.path);
    results.push({ file: file.rel, ...res });
  }

  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.file} — ${r.detail}`);
  }

  const failed = results.filter(r => !r.pass).length;
  console.log(`Summary: ${results.length} file(s) checked, ${results.length - failed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Witness registry (F2.16) — gitignored, machine-local, SHA-256 fingerprints.
// ---------------------------------------------------------------------------

function witnessPath(root) {
  return path.join(root, WITNESS_REL);
}

function loadWitness(root) {
  const file = witnessPath(root);
  if (!fs.existsSync(file)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch (e) {
    console.error(`[WITNESS-CORRUPT] ${file}: ${e.message}`);
    return null; // fail closed — do not silently treat an unreadable registry as empty
  }
}

function saveWitness(root, registry) {
  const file = witnessPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(registry, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, file);
}

function normalizeRel(root, input) {
  const abs = path.isAbsolute(input) ? input : path.resolve(root, input);
  return path.relative(root, abs).split(path.sep).join('/');
}

function hashFile(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs, 'utf8')).digest('hex');
}

function signFiles(root, inputs) {
  const registry = loadWitness(root);
  if (registry === null) return 2;
  let signed = 0;
  for (const input of inputs) {
    const rel = normalizeRel(root, input);
    const abs = path.resolve(root, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      console.error(`[MISSING] ${rel} — nothing to sign`);
      continue;
    }
    registry[rel] = {
      sha256: hashFile(abs),
      mtime: fs.statSync(abs).mtimeMs,
      signedAt: new Date().toISOString(),
      warnings: 0, // re-signing resets the occurrence counter (F2.17)
    };
    console.log(`[SIGNED] ${rel} (${registry[rel].sha256.slice(0, 8)}...)`);
    signed++;
  }
  if (signed > 0) saveWitness(root, registry);
  return signed === inputs.length ? 0 : 1;
}

/** Verify one signed path. Mutates the entry's warning counter; caller persists. */
function verifyOne(root, registry, rel) {
  const entry = registry[rel];
  if (!entry) {
    console.log(`[UNSIGNED] ${rel}`);
    return { ok: true, unsigned: true, warning: false, blocked: false };
  }
  const abs = path.resolve(root, rel);
  if (!fs.existsSync(abs)) {
    console.log(`[INTEGRITY-BLOCK] ${rel} — signed file no longer exists`);
    return { ok: false, unsigned: false, warning: false, blocked: true, missing: true };
  }
  const current = hashFile(abs);
  if (current === entry.sha256) {
    console.log(`[OK] ${rel}`);
    return { ok: true, unsigned: false, warning: false, blocked: false };
  }

  const n = Number(entry.warnings || 0) + 1;
  entry.warnings = n;
  if (n >= 2) {
    console.log(`[INTEGRITY-BLOCK] ${rel} — modification #${n} since signing (was ${String(entry.sha256).slice(0, 8)}, now ${current.slice(0, 8)}). Review the change and re-sign.`);
    return { ok: false, unsigned: false, warning: false, blocked: true };
  }
  console.log(`[INTEGRITY-WARNING] ${rel} — first modification since signing (informational; a second occurrence blocks).`);
  return { ok: false, unsigned: false, warning: true, blocked: false };
}

function verifyFiles(root, inputs) {
  const registry = loadWitness(root);
  if (registry === null) return 2;
  let failed = 0, touched = false;
  for (const input of inputs) {
    const rel = normalizeRel(root, input);
    const before = registry[rel] ? registry[rel].warnings : undefined;
    const r = verifyOne(root, registry, rel);
    if (registry[rel] && registry[rel].warnings !== before) touched = true;
    if (r.blocked) failed++;
  }
  if (touched) saveWitness(root, registry);
  return failed > 0 ? 1 : 0;
}

function runWitnessCheck(root) {
  const registry = loadWitness(root);
  if (registry === null) return 2;
  let ok = 0, warnings = 0, unsigned = 0, blocked = 0, missing = 0, touched = false;

  for (const rel of Object.keys(registry)) {
    const before = registry[rel] ? registry[rel].warnings : undefined;
    const r = verifyOne(root, registry, rel);
    if (registry[rel] && registry[rel].warnings !== before) touched = true;
    if (r.blocked) blocked++;
    else if (r.warning) warnings++;
    else if (r.unsigned) unsigned++;
    else if (r.missing) missing++;
    else if (r.ok) ok++;
  }
  for (const rel of DEFAULT_ARTIFACTS) {
    if (!registry[rel] && fs.existsSync(path.resolve(root, rel))) {
      console.log(`[UNSIGNED] ${rel}`);
      unsigned++;
    }
  }
  if (touched) saveWitness(root, registry);
  console.log(`Witness: ${ok} OK, ${warnings} warning(s), ${unsigned} unsigned, ${missing} missing, ${blocked} blocking`);
  return blocked > 0 ? 1 : 0;
}

function listWitness(root) {
  const registry = loadWitness(root);
  if (registry === null) return 2;
  const keys = Object.keys(registry).sort();
  if (keys.length === 0) console.log('Witness registry is empty.');
  for (const rel of keys) {
    const e = registry[rel] || {};
    console.log(`${String(e.sha256 || '').slice(0, 8)}  warnings=${e.warnings || 0}  ${e.signedAt || ''}  ${rel}`);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage:
  node memory_check.js check [--dir artifacts/memory] [--root DIR]
  node memory_check.js sign <file> [<file> ...] [--root DIR]
  node memory_check.js verify <file> [<file> ...] [--root DIR]
  node memory_check.js list [--root DIR]

\`check\` validates memory structure AND verifies the witness registry.
Witness fingerprints live in .agents/state/witness.json (gitignored).
First integrity warning is informational; the second on the same file blocks.`);
    process.exit(0);
  }

  const cmd = args[0] && !args[0].startsWith('--') ? args[0] : 'check';
  let dir = DEFAULT_DIR;
  let root = process.cwd();
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir') dir = args[++i];
    else if (args[i] === '--root') root = path.resolve(args[++i]);
    else if (i > 0 && !args[i].startsWith('--')) files.push(args[i]);
  }

  if (cmd === 'sign' || cmd === 'verify') {
    if (files.length === 0) {
      console.error(`Usage: node memory_check.js ${cmd} <file> [<file> ...] [--root DIR]`);
      process.exit(2);
    }
    process.exit(cmd === 'sign' ? signFiles(root, files) : verifyFiles(root, files));
  }
  if (cmd === 'list') process.exit(listWitness(root));
  if (cmd !== 'check') {
    console.error(`Unknown subcommand: ${cmd}`);
    process.exit(2);
  }

  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }
  const structureCode = runCheck(dir);
  const witnessCode = runWitnessCheck(root);
  process.exit(structureCode !== 0 ? structureCode : witnessCode);
}

if (require.main === module) main();

module.exports = {
  runCheck,
  collectFiles,
  signFiles,
  verifyFiles,
  verifyOne,
  runWitnessCheck,
  listWitness,
  loadWitness,
  saveWitness,
  normalizeRel,
  hashFile,
  witnessPath,
  DEFAULT_DIR,
  DEFAULT_ARTIFACTS,
};
