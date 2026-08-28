'use strict';
/**
 * 02o.7–02o.9 — Parallel-session worktrees.
 *
 * Verifies: create (worktree + branch + shared-state wiring), shared memory
 * writes from inside a worktree land in the primary store (locks shared by
 * construction), busy-tree auto-offer creates exactly one auto worktree,
 * remove cleans up.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawn, spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const CLI = path.join(REPO, 'bin', 'cli.js');
const MW = path.join(REPO, '.agents', 'scripts', 'memory_write.js');
const SESSION_START = path.join(REPO, '.agents', 'scripts', 'session_start.js');

function sh(cmd, args, cwd, opts = {}) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', ...opts });
}

/** Captures BOTH streams (advisories go to stderr by design). */
function sh2(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return (r.stdout || '') + (r.stderr || '');
}

function makeGitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), '02o-wt-'));
  sh('git', ['init', '-q'], dir);
  sh('git', ['config', 'user.email', 'test@vespyr.local'], dir);
  sh('git', ['config', 'user.name', 'test'], dir);
  // Mirror real-repo ignore rules: runtime state + memory are NOT tracked
  fs.writeFileSync(path.join(dir, '.gitignore'), 'artifacts/memory/\nartifacts/output/\nartifacts/telemetry/\n.agents/state/\n');
  fs.writeFileSync(path.join(dir, 'README.md'), 'fixture\n');
  fs.mkdirSync(path.join(dir, '.agents', 'state'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'artifacts', 'memory'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifacts', 'memory', 'project-context.md'),
    '# Project Context\n\n## [CORE]\nProject: fixture\nPhase: validation\nBlockers: 0\n\n## [IDENTITY]\nUser Nickname: T\n');
  sh('git', ['add', '-A'], dir);
  sh('git', ['commit', '-q', '-m', 'init'], dir);
  return dir;
}

function isSharedLink(linkPath, targetDir) {
  const st = fs.lstatSync(linkPath);
  if (!st.isSymbolicLink()) return false;
  return path.resolve(fs.realpathSync(linkPath)) === path.resolve(fs.realpathSync(targetDir));
}

test('02o.7: worktree create — branch, shared state, shared memory', () => {
  const repo = makeGitRepo();
  try {
    const out = sh(process.execPath, [CLI, 'worktree', 'create', 'test-a'], repo);
    assert.match(out, /Ready\./);
    const wtPath = path.join(path.dirname(repo), `${path.basename(repo)}-wt-test-a`);
    assert.ok(fs.existsSync(path.join(wtPath, 'SKILL.md') ) || fs.existsSync(wtPath), 'worktree dir exists');
    assert.ok(isSharedLink(path.join(wtPath, '.agents', 'state'), path.join(repo, '.agents', 'state')),
      '.agents/state shared with primary');
    assert.ok(isSharedLink(path.join(wtPath, 'artifacts', 'memory'), path.join(repo, 'artifacts', 'memory')),
      'artifacts/memory shared with primary');

    // 02o.9: memory write FROM the worktree lands in the shared store
    sh(process.execPath, [MW, '--file', 'active-decisions.md', '--agent', '@test', '--domain', 'CODE',
      '--title', 'written from worktree', '--content', 'shared store proof'], wtPath);
    const mainMem = fs.readFileSync(path.join(repo, 'artifacts', 'memory', 'active-decisions.md'), 'utf8');
    assert.match(mainMem, /written from worktree/, 'worktree write visible in primary memory');

    // remove cleans up
    sh(process.execPath, [CLI, 'worktree', 'remove', 'test-a', '--force'], repo);
    assert.ok(!fs.existsSync(wtPath), 'worktree dir removed');
  } finally {
    try { sh('git', ['worktree', 'prune'], repo); } catch { /* best effort */ }
    fs.rmSync(repo, { recursive: true, force: true });
    for (const d of fs.readdirSync(path.dirname(repo))) {
      if (d.includes('-wt-test-a')) fs.rmSync(path.join(path.dirname(repo), d), { recursive: true, force: true });
    }
  }
});

test('02o.8: busy tree → auto-offer creates exactly one auto worktree', () => {
  const repo = makeGitRepo();
  try {
    // Foreign window wrote memory 1 minute ago
    const ledger = path.join(repo, '.agents', 'state', 'memory-write-ledger.jsonl');
    fs.writeFileSync(ledger, JSON.stringify({
      ts: new Date(Date.now() - 60 * 1000).toISOString(),
      session_id: 'w-ffffffffffff', file: 'active-decisions.md', title: 'foreign'
    }) + '\n');

    let out = '';
    try {
      out = sh2(process.execPath, [SESSION_START, '--agent', 'tester'], repo);
    } catch (e) {
      out = (e.stdout || '') + (e.stderr || '');
    }
    assert.match(out, /Parallel session detected/, 'busy advisory shown');
    assert.match(out, /Worktree ready/, 'auto-created per owner option (b)');

    const autos = sh('git', ['worktree', 'list'], repo).split('\n').filter(l => /-wt-auto-/.test(l));
    assert.strictEqual(autos.length, 1, `exactly one auto worktree, got ${autos.length}`);

    // Second session-start: marker prevents a duplicate offer
    sh2(process.execPath, [SESSION_START, '--agent', 'tester'], repo);
    const autos2 = sh('git', ['worktree', 'list'], repo).split('\n').filter(l => /-wt-auto-/.test(l));
    assert.strictEqual(autos2.length, 1, 'offer-once per window');
  } finally {
    try {
      const list = sh('git', ['worktree', 'list', '--porcelain'], repo);
      for (const line of list.split('\n')) {
        if (line.startsWith('worktree ') && /-wt-auto-/.test(line)) {
          try { sh('git', ['worktree', 'remove', '--force', line.slice('worktree '.length)], repo); } catch { }
        }
      }
    } catch { /* best effort */ }
    fs.rmSync(repo, { recursive: true, force: true });
    for (const d of fs.readdirSync(path.dirname(repo))) {
      if (d.includes('-wt-auto-')) fs.rmSync(path.join(path.dirname(repo), d), { recursive: true, force: true });
    }
  }
});
