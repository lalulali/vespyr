#!/usr/bin/env node
/**
 * worktree.js — Parallel-session worktrees (02o.7–02o.9)
 *
 * Owner option (b), 2026-08-28: when a second window opens on a busy tree,
 * automatically create a git worktree and print the exact command to start
 * there. Worktrees isolate CODE (collisions become git merges); memory and
 * lock state stay SHARED via symlinks to the primary checkout, so the 02o
 * safety net (memory.lock, write ledger, collision detector) keeps working
 * across worktrees by construction.
 *
 * Usage:
 *   node .agents/scripts/worktree.js create <name> [--path <dir>]
 *   node .agents/scripts/worktree.js list
 *   node .agents/scripts/worktree.js remove <name> [--force]
 *
 * Shared-state wiring (post-create):
 *   <wt>/.agents/state       → primary .agents/state       (memory.lock, ledger, collision state)
 *   <wt>/artifacts/memory    → primary artifacts/memory    (the swarm brain)
 *   <wt>/artifacts/telemetry → primary artifacts/telemetry (drift history, eval telemetry — ADR-006)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

function git(args, cwd) {
  return execFileSync('git', args, { cwd: cwd || process.cwd(), encoding: 'utf8' }).trim();
}

function gitOk(args, cwd) {
  try { git(args, cwd); return true; } catch { return false; }
}

/** Main-checkout root (shared anchor). Inside a linked worktree, resolves to the primary tree. */
function mainRoot() {
  const common = path.resolve(git(['rev-parse', '--git-common-dir']));
  return path.dirname(common);
}

function inLinkedWorktree() {
  try {
    const common = path.resolve(git(['rev-parse', '--git-common-dir']));
    const dir = path.resolve(git(['rev-parse', '--git-dir']));
    return common !== dir;
  } catch {
    return false;
  }
}

function sanitizeName(name) {
  const n = String(name || '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  if (!n || n === '.' || n === '..') throw new Error('invalid worktree name');
  return n;
}

function defaultPath(name) {
  const base = path.basename(mainRoot());
  return path.join(path.dirname(mainRoot()), `${base}-wt-${name}`);
}

/** Placeholder files a fresh checkout may legitimately carry inside a shared dir
 *  (tracked in the primary tree; replaced by the shared-state symlink). */
const PLACEHOLDER_ENTRIES = new Set(['.npmignore', '.gitkeep']);

/** Create dir → symlink, replacing an existing EMPTY or placeholder-only real dir.
 *  Real content → throw (record-integrity preserved; see harness-defects-2026-09-10.md D1). */
function linkShared(target, linkPath) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  let st = null;
  try { st = fs.lstatSync(linkPath); } catch { /* absent */ }
  if (st && st.isSymbolicLink()) return; // already wired
  if (st && st.isDirectory()) {
    const leftover = fs.readdirSync(linkPath);
    const real = leftover.filter((entry) => !PLACEHOLDER_ENTRIES.has(entry));
    if (real.length > 0) {
      throw new Error(`refusing to replace non-empty ${linkPath} — resolve manually`);
    }
    for (const entry of leftover) fs.unlinkSync(path.join(linkPath, entry));
    fs.rmdirSync(linkPath);
  } else if (st) {
    throw new Error(`refusing to replace non-directory ${linkPath}`);
  }
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(target, linkPath, type);
}

function create(name, opts = {}) {
  const n = sanitizeName(name);
  if (!gitOk(['rev-parse', '--is-inside-work-tree'])) {
    throw new Error('not a git repository — worktrees require git');
  }
  const root = mainRoot();
  const wtPath = path.resolve(opts.path || defaultPath(n));
  if (fs.existsSync(wtPath) && fs.readdirSync(wtPath).length > 0) {
    throw new Error(`target path not empty: ${wtPath}`);
  }
  const branch = opts.branch || `wt/${n}`;
  const hasCommit = gitOk(['rev-parse', '--verify', 'HEAD'], root);
  if (!hasCommit) throw new Error('repository has no commits — commit once before creating worktrees');
  git(['worktree', 'add', wtPath, '-b', branch], root);

  try {
    // Shared anchors must exist before linking (symlinks into absent dirs
    // would break lock acquisition in the worktree).
    fs.mkdirSync(path.join(root, '.agents', 'state'), { recursive: true });
    fs.mkdirSync(path.join(root, 'artifacts', 'memory'), { recursive: true });
    fs.mkdirSync(path.join(root, 'artifacts', 'telemetry'), { recursive: true });

    // Shared state + memory + telemetry: locks, ledger, swarm brain and drift
    // history live in the PRIMARY checkout. Without this wiring, two worktrees
    // would lock independently and the 02o safety net would silently split in two.
    // Telemetry (artifacts/telemetry) is shared so drift history stays consistent
    // across worktrees after 02k-E relocation (ADR-006).
    const stateLink = path.join(wtPath, '.agents', 'state');
    const memLink = path.join(wtPath, 'artifacts', 'memory');
    const telLink = path.join(wtPath, 'artifacts', 'telemetry');
    linkShared(path.join(root, '.agents', 'state'), stateLink);
    linkShared(path.join(root, 'artifacts', 'memory'), memLink);
    linkShared(path.join(root, 'artifacts', 'telemetry'), telLink);

    return { name: n, path: wtPath, branch, stateLink, memLink };
  } catch (e) {
    // Transactional (harness-defects-2026-09-10.md D1): a failed wiring must
    // never leave a half-created worktree (checkout + branch) behind.
    try { git(['worktree', 'remove', '--force', wtPath], root); } catch { /* best effort */ }
    try {
      if (fs.existsSync(wtPath)) {
        fs.rmSync(wtPath, { recursive: true, force: true });
        git(['worktree', 'prune'], root);
      }
    } catch { /* best effort */ }
    try { git(['branch', '-D', branch], root); } catch { /* best effort */ }
    throw e;
  }
}

function list() {
  return git(['worktree', 'list']).split('\n').map(l => l.trim()).filter(Boolean);
}

function remove(name, opts = {}) {
  const n = sanitizeName(name);
  const root = mainRoot();
  const args = ['worktree', 'remove', defaultPath(n)];
  if (opts.force) args.push('--force');
  if (!gitOk(args, root)) {
    // fall back: maybe created under a custom --path
    git(['worktree', 'remove', path.resolve(opts.path || `./${n}`)], root);
  }
  try { git(['branch', '-D', `wt/${n}`], root); } catch { /* branch may be merged or absent */ }
  return true;
}

/** True when the worktree has changes beyond the three shared-state symlinks
 *  (auto worktrees always look "dirty" to git because the tracked placeholder
 *  dirs are replaced by symlinks). */
function hasRealChanges(wtPath) {
  let out = '';
  try { out = git(['status', '--porcelain', '--untracked-files=all'], wtPath); } catch { return true; }
  const shared = ['.agents/state', 'artifacts/memory', 'artifacts/telemetry'];
  return out.split('\n').filter(Boolean).some((line) => {
    // Porcelain v1 is `XY PATH`; the whole-output trim eats the leading space of
    // the first line, so strip the status prefix robustly (not via fixed slice).
    const p = line.replace(/^\s*[A-Z?!]{1,2}\s+/, '').replace(/^"|"$/g, '');
    return !shared.some((s) => p === s || p.startsWith(s + '/'));
  });
}

/** Remove clean auto-offered worktrees (branch `wt/auto-*`) — used by `npm run worktree:clean`.
 *  Dirty auto worktrees are skipped, never destroyed. */
function clean() {
  const root = mainRoot();
  let out = '';
  try { out = git(['worktree', 'list', '--porcelain'], root); } catch { return { removed: [], skipped: [] }; }
  const removed = [];
  const skipped = [];
  for (const block of out.split('\n\n').map((b) => b.trim()).filter(Boolean)) {
    const lines = block.split('\n');
    const wtPath = (lines.find((l) => l.startsWith('worktree ')) || '').slice('worktree '.length).trim();
    const branch = (lines.find((l) => l.startsWith('branch ')) || '').slice('branch '.length).trim();
    if (!branch.includes('refs/heads/wt/auto-')) continue;
    const name = branch.replace('refs/heads/', '');
    if (hasRealChanges(wtPath)) {
      skipped.push({ name, path: wtPath, reason: `dirty — remove manually (worktree.js remove ${name.replace('wt/', '')} --force)` });
      continue;
    }
    try {
      git(['worktree', 'remove', '--force', wtPath], root);
      try { git(['branch', '-D', name], root); } catch { /* best effort */ }
      removed.push({ name, path: wtPath });
    } catch {
      skipped.push({ name, path: wtPath, reason: 'remove failed — resolve manually' });
    }
  }
  return { removed, skipped };
}

/**
 * 02q post-execution hardening (2026-09-10, D1): busy-tree detection — recent
 * memory writes from a DIFFERENT window session inside the window. Reads the
 * shared ledger (cwd resolves through the state symlink inside worktrees).
 *
 * Harness caveat: harnesses that spawn a fresh shell per tool call mint a new
 * `w-<ppid-hash>` id for every write (observed 2026-09-10: three ids for one
 * operator window), so a single window's own writes read as foreign. Rule
 * choice: require >= 2 DISTINCT foreign session ids in the window before
 * firing — suppresses the single-write self-trigger; multi-write self-churn
 * can still fire and now yields a valid shared worktree (creation is
 * transactional), never residue. See harness-defects-2026-09-10.md D1.
 */
function detectBusyTree(windowMin = 5, opts = {}) {
  const ledgerPath = opts.ledgerPath || path.join(process.cwd(), '.agents', 'state', 'memory-write-ledger.jsonl');
  let mine = null;
  try { mine = opts.mine !== undefined ? opts.mine : require('./lib/session.js').resolveSessionId(); } catch { mine = null; }
  let entries = [];
  try {
    entries = fs.readFileSync(ledgerPath, 'utf8').split('\n').filter(l => l.trim())
      .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return null; }
  const now = Date.now();
  const foreign = entries.filter(e =>
    e.ts && e.session_id && e.session_id !== mine &&
    now - Date.parse(e.ts) <= windowMin * 60 * 1000);
  if (foreign.length === 0) return null;
  const sessions = [...new Set(foreign.map(e => e.session_id))];
  if (sessions.length < 2) return null;
  const last = foreign[foreign.length - 1];
  return {
    sessions,
    lastWriteMinAgo: Math.max(0, Math.round((now - Date.parse(last.ts)) / 60000))
  };
}

/**
 * 02o.8 — owner option (b): auto-create + print the exact next command.
 * Offer-once per window per busy episode (marker file), VESPYR_AUTO_WORKTREE=0
 * downgrades to advisory-only.
 */
function autoOffer({ agent } = {}) {
  const busy = detectBusyTree(5);
  if (!busy || inLinkedWorktree()) return null;

  const marker = path.join(process.cwd(), '.agents', 'state', `wt-offered-${require('./lib/session.js').resolveSessionId()}.json`);
  const already = fs.existsSync(marker);

  console.error(`⚠️  Parallel session detected on this tree — sessions ${busy.sessions.join(', ')} wrote memory ${busy.lastWriteMinAgo} min ago.`);

  if (process.env.VESPYR_AUTO_WORKTREE === '0') {
    console.error('   Advisory only (VESPYR_AUTO_WORKTREE=0). Serialize the windows or run: node .agents/scripts/worktree.js create <name>');
    return null;
  }
  if (already) {
    console.error('   Worktree already offered for this window — see .agents/state/. Serialize or switch, or set VESPYR_AUTO_WORKTREE=0.');
    return null;
  }

  try {
    const stamp = new Date();
    const pad = x => String(x).padStart(2, '0');
    const base = `auto-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}`;
    let wt = null, n = base, i = 2;
    while (!wt) {
      try { wt = create(n, { agent }); } catch (e) {
        if (!String(e.message).includes('not empty') && !String(e.message).includes('already exists')) throw e;
        n = `${base}-${i++}`;
        if (i > 20) throw e;
      }
    }
    fs.writeFileSync(marker, JSON.stringify({ worktree: wt.path, at: new Date().toISOString() }, null, 2));
    console.error(`✅ Worktree ready for this session (code isolated, memory + locks shared):`);
    console.error(`   cd ${wt.path}`);
    console.error(`   …then start your agent session there. Merge with: git merge wt/${wt.name}`);
    return wt;
  } catch (e) {
    console.error(`   Auto-create failed (${e.message}). Advisory only: serialize the windows or run: node .agents/scripts/worktree.js create <name>`);
    return null;
  }
}

module.exports = { create, list, remove, clean, detectBusyTree, autoOffer, inLinkedWorktree, mainRoot, sanitizeName, linkShared };

if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  try {
    if (cmd === 'create') {
      const name = args[1];
      const pathIdx = args.indexOf('--path');
      const wt = create(name, { path: pathIdx > -1 ? args[pathIdx + 1] : undefined });
      console.log(JSON.stringify({ success: true, ...wt }, null, 2));
      console.log(`\nReady. cd ${wt.path} — then start your agent session there.`);
    } else if (cmd === 'list') {
      console.log(list().join('\n'));
    } else if (cmd === 'remove') {
      const force = args.includes('--force');
      const rPathIdx = args.indexOf('--path');
      remove(args[1], { force, path: rPathIdx > -1 ? args[rPathIdx + 1] : undefined });
      console.log(`✓ worktree removed: ${args[1]}`);
    } else if (cmd === 'clean') {
      const result = clean();
      console.log(JSON.stringify({ success: true, ...result }, null, 2));
    } else {
      console.log('Usage: node worktree.js <create <name> [--path dir] | list | remove <name> [--force] | clean>');
      process.exit(1);
    }
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
