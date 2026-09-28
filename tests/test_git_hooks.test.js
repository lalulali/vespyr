'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents', 'scripts', 'setup_git_hooks.js');

function scratchRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hooks-test-'));
  spawnSync('git', ['init', tmp], { stdio: 'ignore' });
  return tmp;
}

// Run the installer against an explicit --root so the assertions observe the
// scratch repo, not the live repo (the previous test hit ROOT/.git and passed
// regardless of installer behavior — no possible RED).
function runInstaller(root) {
  return spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
}

test('setup_git_hooks: installs executable pre-commit hook in the TARGET repo', () => {
  const tmp = scratchRepo();
  try {
    const hookPath = path.join(tmp, '.git', 'hooks', 'pre-commit');
    assert.ok(!fs.existsSync(hookPath), 'precondition: scratch repo has no pre-commit hook');

    const res = runInstaller(tmp);
    assert.equal(res.status, 0, `installer should exit 0 (stderr: ${res.stderr})`);
    assert.ok(fs.existsSync(hookPath), 'pre-commit hook must be created in the target repo');

    const content = fs.readFileSync(hookPath, 'utf8');
    assert.match(content, /vespyr-managed pre-commit hook/, 'hook must carry the vespyr marker');
    assert.match(content, /npm test/, 'pre-commit hook must execute npm test');
    assert.match(content, /exit \$RESULT/, 'pre-commit hook must propagate exit status');
    assert.match(content, /--no-verify/, 'hook must document the emergency bypass, not force it');

    if (process.platform !== 'win32') {
      assert.ok(fs.statSync(hookPath).mode & 0o111, 'pre-commit hook must be executable');
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('setup_git_hooks: backs up a foreign pre-existing hook (never silently clobbers)', () => {
  const tmp = scratchRepo();
  try {
    const hookPath = path.join(tmp, '.git', 'hooks', 'pre-commit');
    const backupPath = `${hookPath}.vespyr-backup`;
    const foreign = '#!/bin/sh\n# my secret-scan hook\ndetect-secrets-hook\n';
    fs.writeFileSync(hookPath, foreign, { mode: 0o755 });

    const res = runInstaller(tmp);
    assert.equal(res.status, 0, 'installer should exit 0');
    assert.ok(fs.existsSync(backupPath), 'foreign hook must be backed up');
    assert.equal(fs.readFileSync(backupPath, 'utf8'), foreign, 'backup must preserve the original content verbatim');
    assert.match(fs.readFileSync(hookPath, 'utf8'), /vespyr-managed/, 'new hook is the vespyr hook');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('setup_git_hooks: a vespyr-managed hook is replaced in place without a redundant backup', () => {
  const tmp = scratchRepo();
  try {
    const hookPath = path.join(tmp, '.git', 'hooks', 'pre-commit');
    const backupPath = `${hookPath}.vespyr-backup`;

    // First install, then re-install — the second run must not create a backup
    // (the existing hook is already ours).
    assert.equal(runInstaller(tmp).status, 0);
    assert.equal(runInstaller(tmp).status, 0);
    assert.ok(!fs.existsSync(backupPath), 'no backup should be created when replacing a vespyr-managed hook');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('setup_git_hooks: no-op (exit 0) when the target is not a git repo', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hooks-nogit-'));
  try {
    const res = runInstaller(tmp);
    assert.equal(res.status, 0, 'installer must not fail when there is no .git');
    assert.ok(!fs.existsSync(path.join(tmp, '.git', 'hooks', 'pre-commit')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
