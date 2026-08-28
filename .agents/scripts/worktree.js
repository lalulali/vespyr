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
 *   <wt>/.agents/state   → primary .agents/state   (memory.lock, ledger, collision state)
 *   <wt>/artifacts/memory → primary artifacts/memory (the swarm brain)
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

/** Create dir → symlink, replacing an existing EMPTY real dir. Non-empty → throw. */
function linkShared(target, linkPath) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  let st = null;
  try { st = fs.lstatSync(linkPath); } catch { /* absent */ }
  if (st && st.isSymbolicLink()) return; // already wired
  if (st && st.isDirectory()) {
    const leftover = fs.readdirSync(linkPath);
    if (leftover.length > 0) {
      throw new Error(`refusing to replace non-empty ${linkPath} — resolve manually`);
    }
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

  // Shared anchors must exist before linking (symlinks into absent dirs
  // would break lock acquisition in the worktree).
  fs.mkdirSync(path.join(root, '.agents', 'state'), { recursive: true });
  fs.mkdirSync(path.join(root, 'artifacts', 'memory'), { recursive: true });

  // Shared state + memory: locks, ledger and the swarm brain live in the
  // PRIMARY checkout. Without this wiring, two worktrees would lock
  // independently and the 02o safety net would silently split in two.
  const stateLink = path.join(wtPath, '.agents', 'state');
  const memLink = path.join(wtPath, 'artifacts', 'memory');
  linkShared(path.join(root, '.agents', 'state'), stateLink);
  linkShared(path.join(root, 'artifacts', 'memory'), memLink);

  return { name: n, path: wtPath, branch, stateLink, memLink };
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

/**
 * 02o.8 — busy-tree detection: recent memory writes from a DIFFERENT
 * window session inside the window. Reads the shared ledger (cwd resolves
 * through the state symlink inside worktrees).
 */
function detectBusyTree(windowMin = 5) {
  const ledgerPath = path.join(process.cwd(), '.agents', 'state', 'memory-write-ledger.jsonl');
  let mine = null;
  try { mine = require('./lib/session.js').resolveSessionId(); } catch { mine = null; }
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
  const last = foreign[foreign.length - 1];
  return {
    sessions: [...new Set(foreign.map(e => e.session_id))],
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

module.exports = { create, list, remove, detectBusyTree, autoOffer, inLinkedWorktree, mainRoot, sanitizeName, linkShared };

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
      remove(args[1], { force, path: undefined });
      console.log(`✓ worktree removed: ${args[1]}`);
    } else {
      console.log('Usage: node worktree.js <create <name> [--path dir] | list | remove <name> [--force]>');
      process.exit(1);
    }
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
