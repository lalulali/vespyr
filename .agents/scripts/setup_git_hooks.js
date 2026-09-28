#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Root is overridable so the installer is testable against a scratch repo and
// works from a worktree. Precedence: --root arg > VESPYR_HOOK_ROOT env > repo root.
function resolveRoot() {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf('--root');
  if (idx >= 0 && argv[idx + 1]) return path.resolve(argv[idx + 1]);
  if (process.env.VESPYR_HOOK_ROOT) return path.resolve(process.env.VESPYR_HOOK_ROOT);
  return path.resolve(__dirname, '..', '..');
}

// A vespyr-managed hook is identifiable by this marker; only such hooks are
// overwritten silently. A foreign pre-existing hook is preserved (backed up).
const VESPYR_HOOK_MARKER = '# vespyr-managed pre-commit hook';

function resolveHooksDir(root) {
  const gitPath = path.join(root, '.git');
  if (!fs.existsSync(gitPath)) return null;

  const stat = fs.statSync(gitPath);
  if (stat.isDirectory()) {
    return path.join(gitPath, 'hooks');
  }

  // Worktree: .git is a file containing "gitdir: /path/to/.git/worktrees/name"
  try {
    const content = fs.readFileSync(gitPath, 'utf8').trim();
    const match = content.match(/^gitdir:\s*(.+)$/i);
    if (match) {
      // Find the common git directory
      const gitDir = path.resolve(root, match[1]);
      const commonDirFile = path.join(gitDir, 'commondir');
      if (fs.existsSync(commonDirFile)) {
        const commonDir = fs.readFileSync(commonDirFile, 'utf8').trim();
        return path.resolve(gitDir, commonDir, 'hooks');
      }
      return path.join(gitDir, 'hooks');
    }
  } catch {
    return null;
  }
  return null;
}

function installPreCommitHook(root = resolveRoot()) {
  const hooksDir = resolveHooksDir(root);
  if (!hooksDir) {
    // Not a git repository (e.g. tarball install or clean CI container without .git)
    return { installed: false, reason: 'no-git' };
  }

  fs.mkdirSync(hooksDir, { recursive: true });
  const hookFile = path.join(hooksDir, 'pre-commit');

  // SEC-1: never blindly clobber a maintainer's existing hook. If a foreign
  // (non-vespyr) hook is present, back it up before writing ours so a
  // secret-scan / commit-signing / lint-staged hook is never silently lost.
  if (fs.existsSync(hookFile)) {
    let existing = '';
    try { existing = fs.readFileSync(hookFile, 'utf8'); } catch {}
    if (!existing.includes(VESPYR_HOOK_MARKER)) {
      const backup = `${hookFile}.vespyr-backup`;
      if (!fs.existsSync(backup)) {
        fs.copyFileSync(hookFile, backup);
        console.log(`ℹ️  Existing pre-commit hook backed up to ${path.basename(backup)}`);
      } else {
        console.log(`ℹ️  Existing pre-commit hook left in place; backup ${path.basename(backup)} already exists (not overwriting it)`);
      }
    }
  }

  const hookContent = `#!/bin/sh
${VESPYR_HOOK_MARKER}
# Pre-commit hook: Run test suite before committing to ensure commits never break CI.

# Resolve Node/npm path for GUI Git clients (VS Code, Cursor, Antigravity, etc.)
export PATH="$HOME/.local/bin:$HOME/.nvm/current/bin:$HOME/.fnm/current/bin:$HOME/.asdf/shims:$HOME/.volta/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"

if ! command -v npm >/dev/null 2>&1; then
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    . "$HOME/.nvm/nvm.sh" --no-use >/dev/null 2>&1
    nvm use default >/dev/null 2>&1
  fi
fi

# Unset Git hook environment variables so nested Git commands in tests
# (e.g. scratch repo initializations) do not inherit parent GIT_DIR/GIT_INDEX_FILE.
unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE GIT_PREFIX

echo "Running pre-commit check: npm test..."
npm test
RESULT=$?

if [ $RESULT -ne 0 ]; then
  echo ""
  echo "❌ Commit blocked: npm test failed (exit code $RESULT)."
  echo "Fix the failing tests before committing, or use 'git commit --no-verify' to bypass in an emergency."
  exit $RESULT
fi

echo "✅ Pre-commit check passed: all tests green."
exit 0
`;

  fs.writeFileSync(hookFile, hookContent, { mode: 0o755 });
  // Ensure executable permissions on POSIX systems
  try {
    fs.chmodSync(hookFile, 0o755);
  } catch {}

  console.log(`✅ Git pre-commit hook installed (${path.relative(root, hookFile)})`);
  return { installed: true, hookFile };
}

if (require.main === module) installPreCommitHook();

module.exports = { installPreCommitHook, resolveHooksDir, resolveRoot, VESPYR_HOOK_MARKER };
