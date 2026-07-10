#!/usr/bin/env node
// worktree.js — git worktree management for parallel agent isolation
// Usage: node .agents/scripts/worktree.js create <branch>
//        node .agents/scripts/worktree.js list
//        node .agents/scripts/worktree.js clean <branch>
//        node .agents/scripts/worktree.js clean-all

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const WT_DIR = path.join(ROOT, '.agents', 'worktrees');
const STATE = path.join(ROOT, '.agents', 'state', 'loop-state.json');

function loadState() {
  if (!fs.existsSync(STATE)) return { worktrees: [] };
  return JSON.parse(fs.readFileSync(STATE, 'utf8'));
}

function saveState(state) {
  const dir = path.dirname(STATE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
}

function git(args) {
  return execSync('git ' + args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

const cmd = process.argv[2];
const branch = process.argv[3];

if (cmd === 'create') {
  if (!branch) { console.error('Usage: worktree.js create <branch>'); process.exit(1); }
  if (!fs.existsSync(WT_DIR)) fs.mkdirSync(WT_DIR, { recursive: true });
  const wtPath = path.join(WT_DIR, branch);
  if (fs.existsSync(wtPath)) { console.error('[ERROR] worktree already exists: ' + wtPath); process.exit(1); }
  git('worktree add -b "' + branch + '" "' + wtPath + '"');
  const state = loadState();
  state.worktrees = state.worktrees || [];
  state.worktrees.push({ branch, path: wtPath, created_at: new Date().toISOString() });
  saveState(state);
  console.log('[OK] worktree created: ' + wtPath + ' (branch: ' + branch + ')');

} else if (cmd === 'list') {
  const state = loadState();
  const wts = state.worktrees || [];
  if (wts.length === 0) { console.log('No active worktrees.'); process.exit(0); }
  console.log('Branch                 | Path');
  console.log('-----------------------|----');
  for (const wt of wts) {
    console.log(wt.branch.padEnd(22) + ' | ' + wt.path);
  }

} else if (cmd === 'clean') {
  if (!branch) { console.error('Usage: worktree.js clean <branch>'); process.exit(1); }
  const state = loadState();
  const wt = (state.worktrees || []).find(function(w) { return w.branch === branch; });
  if (!wt) { console.error('[ERROR] no worktree for branch: ' + branch); process.exit(1); }
  git('worktree remove "' + wt.path + '" --force');
  git('branch -D "' + branch + '"');
  state.worktrees = state.worktrees.filter(function(w) { return w.branch !== branch; });
  saveState(state);
  console.log('[OK] worktree cleaned: ' + branch);

} else if (cmd === 'clean-all') {
  const state = loadState();
  for (const wt of (state.worktrees || [])) {
    try {
      git('worktree remove "' + wt.path + '" --force');
      git('branch -D "' + wt.branch + '"');
    } catch (e) {
      console.log('[WARN] could not clean ' + wt.branch + ': ' + e.message);
    }
  }
  state.worktrees = [];
  saveState(state);
  console.log('[OK] all worktrees cleaned');

} else {
  console.error('Usage: worktree.js <create|list|clean|clean-all> [branch]');
  process.exit(1);
}
