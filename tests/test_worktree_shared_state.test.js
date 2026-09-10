/**
 * test_worktree_shared_state.test.js — 2026-09-10 D1 regression fixtures
 * (harness-defects-2026-09-10.md).
 *
 *   D1.1 linkShared: placeholder-only dirs (tracked `.npmignore` in a fresh
 *        checkout) are replaced by the shared-state symlink; real content
 *        still refuses (record-integrity preserved).
 *   D1.2 create(): fully wires the three shared links; on wiring failure it
 *        rolls back — no worktree, no branch residue.
 *   D1.3 detectBusyTree(): fires only on >= 2 distinct foreign session ids in
 *        the window (per-invocation `w-` ids made single self-writes look foreign).
 *   D1.4 clean(): removes idle auto worktrees, never destroys dirty ones.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { create, remove, clean, detectBusyTree, linkShared } = require('../.agents/scripts/worktree.js');

function sandbox(tag = 'd1') {
  return fs.mkdtempSync(path.join(os.tmpdir(), `vespyr-${tag}-`));
}

function gitIn(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/** Temp repo mirroring a vespyr checkout: commits the tracked `.agents/state/.npmignore` placeholder. */
function initRepo() {
  const repo = sandbox('d1-repo');
  gitIn(repo, 'init', '-q');
  gitIn(repo, 'config', 'user.email', 'test@example.com');
  gitIn(repo, 'config', 'user.name', 'vespyr test');
  fs.mkdirSync(path.join(repo, '.agents', 'state'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.agents', 'state', '.npmignore'), 'placeholder\n');
  gitIn(repo, 'add', '-A');
  gitIn(repo, 'commit', '-q', '-m', 'init');
  return repo;
}

function withCwd(dir, fn) {
  const prev = process.cwd();
  try {
    process.chdir(dir);
    return fn();
  } finally {
    process.chdir(prev);
  }
}

describe('D1 — worktree shared-state wiring (2026-09-10)', () => {
  it('D1.1 linkShared tolerates placeholder-only dirs, refuses real content', () => {
    const dir = sandbox();
    try {
      const target = path.join(dir, 'primary-state');
      fs.mkdirSync(target, { recursive: true });

      // Fresh checkout: placeholder-only dir → replaced by symlink.
      const placeholderLink = path.join(dir, 'fresh', '.agents', 'state');
      fs.mkdirSync(placeholderLink, { recursive: true });
      fs.writeFileSync(path.join(placeholderLink, '.npmignore'), 'placeholder\n');
      linkShared(target, placeholderLink);
      assert.ok(fs.lstatSync(placeholderLink).isSymbolicLink(), 'placeholder dir must become a symlink');

      // Absent → symlink created; already-symlinked → no-op (call twice).
      const absentLink = path.join(dir, 'absent', '.agents', 'state');
      linkShared(target, absentLink);
      linkShared(target, absentLink);
      assert.ok(fs.lstatSync(absentLink).isSymbolicLink());

      // Real content → refuse (never destroy unknown files).
      const realLink = path.join(dir, 'real', 'artifacts', 'memory');
      fs.mkdirSync(realLink, { recursive: true });
      fs.writeFileSync(path.join(realLink, 'seed.md'), 'real\n');
      assert.throws(() => linkShared(target, realLink), /refusing to replace non-empty/);

      // Empty dir → replaced.
      const emptyLink = path.join(dir, 'empty', 'x');
      fs.mkdirSync(emptyLink, { recursive: true });
      linkShared(target, emptyLink);
      assert.ok(fs.lstatSync(emptyLink).isSymbolicLink());
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('D1.2 create() wires all shared links and a worktree memory write lands in the primary store', () => {
    const repo = initRepo();
    const wtPath = path.join(path.dirname(repo), `${path.basename(repo)}-wt`);
    try {
      const wt = withCwd(repo, () => create('auto-d1', { path: wtPath }));
      assert.strictEqual(wt.path, wtPath);
      for (const rel of ['.agents/state', 'artifacts/memory', 'artifacts/telemetry']) {
        const link = path.join(wtPath, rel);
        assert.ok(fs.lstatSync(link).isSymbolicLink(), `${rel} must be a symlink`);
        assert.strictEqual(
          fs.realpathSync(link),
          fs.realpathSync(path.join(repo, rel)),
          `${rel} must resolve to the primary checkout`
        );
      }
      const probe = path.join(wtPath, 'artifacts', 'memory', 'd1-probe.md');
      fs.writeFileSync(probe, 'shared\n');
      assert.ok(fs.existsSync(path.join(repo, 'artifacts', 'memory', 'd1-probe.md')), 'worktree memory write must land in primary store');
    } finally {
      withCwd(repo, () => { try { remove('auto-d1', { force: true, path: wtPath }); } catch { /* cleanup */ } });
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(wtPath, { recursive: true, force: true });
    }
  });

  it('D1.2 create() rolls back on wiring failure — no worktree, no branch residue', () => {
    const repo = initRepo();
    const wtPath = path.join(path.dirname(repo), `${path.basename(repo)}-wt-rollback`);
    try {
      // Real tracked content in a shared dir forces a linkShared refusal mid-wiring.
      fs.mkdirSync(path.join(repo, 'artifacts', 'memory'), { recursive: true });
      fs.writeFileSync(path.join(repo, 'artifacts', 'memory', 'seed.md'), 'real\n');
      gitIn(repo, 'add', '-A');
      gitIn(repo, 'commit', '-q', '-m', 'seed');

      assert.throws(() => withCwd(repo, () => create('auto-rollback', { path: wtPath })), /refusing to replace non-empty/);
      assert.ok(!fs.existsSync(wtPath), 'half-created worktree directory must be removed');
      assert.strictEqual(gitIn(repo, 'worktree', 'list').split('\n').length, 1, 'only the primary worktree may remain');
      assert.strictEqual(gitIn(repo, 'branch', '--list', 'wt/auto-rollback'), '', 'rollback must delete the branch');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(wtPath, { recursive: true, force: true });
    }
  });

  it('D1.3 detectBusyTree fires only on >= 2 distinct foreign ids in the window', () => {
    const dir = sandbox();
    try {
      const ledger = path.join(dir, 'ledger.jsonl');
      const iso = (minAgo) => new Date(Date.now() - minAgo * 60000).toISOString();
      const write = (rows) => fs.writeFileSync(ledger, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');

      // One foreign id (however many writes) → no fire (the observed self-trigger).
      write([
        { ts: iso(1), session_id: 'w-a', file: 'x.md', title: 'one' },
        { ts: iso(2), session_id: 'w-a', file: 'x.md', title: 'two' },
      ]);
      assert.strictEqual(detectBusyTree(5, { ledgerPath: ledger, mine: 'w-mine' }), null);

      // Two distinct foreign ids → fire.
      fs.appendFileSync(ledger, JSON.stringify({ ts: iso(1), session_id: 'w-b', file: 'y.md', title: 'other' }) + '\n');
      const busy = detectBusyTree(5, { ledgerPath: ledger, mine: 'w-mine' });
      assert.ok(busy, 'two distinct foreign ids must fire');
      assert.deepStrictEqual(busy.sessions.slice().sort(), ['w-a', 'w-b']);

      // Stale entries outside the window + own writes only → no fire.
      write([
        { ts: iso(60), session_id: 'w-c', file: 'x.md', title: 'old' },
        { ts: iso(61), session_id: 'w-d', file: 'x.md', title: 'old2' },
        { ts: iso(1), session_id: 'w-mine', file: 'z.md', title: 'own' },
      ]);
      assert.strictEqual(detectBusyTree(5, { ledgerPath: ledger, mine: 'w-mine' }), null);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('D1.4 clean() removes idle auto worktrees and skips dirty ones', () => {
    const repo = initRepo();
    const wtPath = path.join(path.dirname(repo), `${path.basename(repo)}-wt-clean`);
    try {
      withCwd(repo, () => create('auto-clean', { path: wtPath }));
      const first = withCwd(repo, () => clean());
      assert.strictEqual(first.removed.length, 1, 'idle auto worktree must be removed');
      assert.strictEqual(first.skipped.length, 0);
      assert.ok(!fs.existsSync(wtPath));

      withCwd(repo, () => create('auto-clean2', { path: wtPath }));
      fs.writeFileSync(path.join(wtPath, 'real-change.js'), '// wip\n');
      const second = withCwd(repo, () => clean());
      assert.strictEqual(second.removed.length, 0, 'dirty auto worktree must not be destroyed');
      assert.strictEqual(second.skipped.length, 1);
    } finally {
      withCwd(repo, () => { try { remove('auto-clean2', { force: true, path: wtPath }); } catch { /* cleanup */ } });
      fs.rmSync(repo, { recursive: true, force: true });
      fs.rmSync(wtPath, { recursive: true, force: true });
    }
  });
});
