#!/usr/bin/env node
/**
 * witness.js — Memory Integrity Checker for Vespyr
 *
 * Validates the structure of files under artifacts/memory/ against the memory
 * conventions in memory-controller.md:
 *   - Entry files: `### [DOMAIN] title [date: YYYY-MM-DD] [agent: @name]`
 *     headers with a `**Status:**` line per entry; every section non-empty
 *   - Session summaries: latest.md has `## Last Session`; history.md entries
 *     are `## [YYYY-MM-DD] Agent: @name` with a `- Worked on:` line
 *   - Archive: index.ndjson lines each parse as one JSON object
 *
 * Reports per-file PASS/FAIL and exits non-zero if any file fails.
 *
 * Usage:
 *   node witness.js check [--dir artifacts/memory]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = path.join('artifacts', 'memory');

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
  for (const section of sections) {
    const bodyText = section.body.replace(/^#{2,3}\s.*$/m, '').trim();
    if (!bodyText) {
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

  const agentNotes = path.join(dir, 'agent-notes');
  if (fs.existsSync(agentNotes)) {
    for (const f of fs.readdirSync(agentNotes)) {
      if (f.endsWith('.md')) files.push({ rel: 'agent-notes/' + f, path: path.join(agentNotes, f), kind: 'entry' });
    }
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
      if (fs.statSync(p).isDirectory()) {
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

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage:
  node witness.js check [--dir artifacts/memory]

Checks every memory file (core, agent-notes, session-summaries, archive) against
the memory-entry conventions. Exits non-zero if any file fails.`);
    process.exit(0);
  }

  // `check` is the default subcommand; `--dir` overrides the memory directory.
  let dir = DEFAULT_DIR;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir') dir = args[i + 1];
  }

  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  process.exit(runCheck(dir));
}

main();
