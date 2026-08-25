const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  parseFlags,
  parseFrontmatter,
  detectState,
  createLinkOrCopy,
  transpileCopilotYAML,
  transpileCursorMDC,
  scaffoldArtifacts,
  bootstrapRootDocs,
  writeVersionFile,
  getInstalledVersion,
  handleConflict,
  performUninstall,
  surgicallyCleanupAgentsDir,
  removeDirIfEmpty,
  getExistingUserNickname,
  updateUserNickname,
  uninstallHarnesses,
  performReconfigure,
  performUpdate,
  installGitHook,
  ASCII_ART,
  VERSION,
} = require('../bin/cli.js');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-test-'));
}

function cleanTempDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('Test 1: parseFrontmatter()', () => {
  it('should parse valid frontmatter', () => {
    const input = '---\nname: founder\ndescription: Tests ideas\n---\n# Body';
    const result = parseFrontmatter(input);
    assert.strictEqual(result.data.name, 'founder');
    assert.strictEqual(result.data.description, 'Tests ideas');
    assert.strictEqual(result.body, '# Body');
  });

  it('should handle no frontmatter', () => {
    const input = '# Just a heading';
    const result = parseFrontmatter(input);
    assert.deepStrictEqual(result.data, {});
    assert.strictEqual(result.body, '# Just a heading');
  });

  it('should handle empty frontmatter', () => {
    const input = '---\n\n---\n# Body';
    const result = parseFrontmatter(input);
    assert.deepStrictEqual(result.data, {});
    assert.strictEqual(result.body, '# Body');
  });

  it('should handle frontmatter with comments', () => {
    const input = '---\nname: editor\n# comment\ntype: subagent\n---\nBody';
    const result = parseFrontmatter(input);
    assert.strictEqual(result.data.name, 'editor');
    assert.strictEqual(result.data.type, 'subagent');
    assert.strictEqual(result.body, 'Body');
  });

  it('should handle CRLF line endings', () => {
    const input = '---\r\nname: founder\r\ndescription: Tests ideas\r\n---\r\n# Body';
    const result = parseFrontmatter(input);
    assert.strictEqual(result.data.name, 'founder');
    assert.strictEqual(result.data.description, 'Tests ideas');
    assert.strictEqual(result.body, '# Body');
  });

  it('should handle missing closing ---', () => {
    const input = '---\nname: test\nBody';
    const result = parseFrontmatter(input);
    assert.deepStrictEqual(result.data, {});
    assert.strictEqual(result.body, '---\nname: test\nBody');
  });
});

describe('Test 4: createLinkOrCopy()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should create directory symlink on macOS/Linux', { skip: process.platform === 'win32' ? 'POSIX symlink fixture setup (named limitation, 02h §10 WS-C)' : false }, () => {
    // Named limitation (02h §10 WS-C): fixture setup requires POSIX symlink semantics;
    // on Windows runners this test is intentionally absent (see swarm-tests matrix).

    const source = path.join(tmpDir, 'source');
    const link = path.join(tmpDir, 'link');
    fs.mkdirSync(source);

    createLinkOrCopy(source, link, 'dir', 'symlink');

    const stat = fs.lstatSync(link);
    assert.ok(stat.isSymbolicLink());
    assert.strictEqual(fs.readlinkSync(link), source);
  });

  it('should create file symlink on macOS/Linux', { skip: process.platform === 'win32' ? 'POSIX symlink fixture setup (named limitation, 02h §10 WS-C)' : false }, () => {
    // Named limitation (02h §10 WS-C): fixture setup requires POSIX symlink semantics;
    // on Windows runners this test is intentionally absent (see swarm-tests matrix).

    const source = path.join(tmpDir, 'source.txt');
    const link = path.join(tmpDir, 'link.txt');
    fs.writeFileSync(source, 'hello');

    createLinkOrCopy(source, link, 'file', 'symlink');

    const stat = fs.lstatSync(link);
    assert.ok(stat.isSymbolicLink());
  });

  it('should skip if symlink already exists with same target', { skip: process.platform === 'win32' ? 'POSIX symlink fixture setup (named limitation, 02h §10 WS-C)' : false }, () => {
    // Named limitation (02h §10 WS-C): fixture setup requires POSIX symlink semantics;
    // on Windows runners this test is intentionally absent (see swarm-tests matrix).

    const source = path.join(tmpDir, 'source');
    const link = path.join(tmpDir, 'link');
    fs.mkdirSync(source);
    fs.symlinkSync(source, link, 'dir');

    assert.doesNotThrow(() => {
      createLinkOrCopy(source, link, 'dir', 'symlink');
    });
  });

  it('should copy directory when method is copy', () => {
    const source = path.join(tmpDir, 'source');
    const dest = path.join(tmpDir, 'dest');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'file.txt'), 'content');

    createLinkOrCopy(source, dest, 'dir', 'copy');

    assert.ok(fs.existsSync(path.join(dest, 'file.txt')));
    assert.strictEqual(fs.readFileSync(path.join(dest, 'file.txt'), 'utf8'), 'content');
  });

  it('should copy file when method is copy', () => {
    const source = path.join(tmpDir, 'source.txt');
    const dest = path.join(tmpDir, 'dest.txt');
    fs.writeFileSync(source, 'content');

    createLinkOrCopy(source, dest, 'file', 'copy');

    assert.ok(fs.existsSync(dest));
    assert.strictEqual(fs.readFileSync(dest, 'utf8'), 'content');
  });

  it('should resolve relative target paths relative to destination parent directory when copying', () => {
    const source = path.join(tmpDir, 'source');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'file.txt'), 'relative copy test');

    const destParent = path.join(tmpDir, 'parent');
    fs.mkdirSync(destParent);

    const relativeTarget = path.relative(destParent, source);
    const dest = path.join(destParent, 'dest');

    createLinkOrCopy(relativeTarget, dest, 'dir', 'copy');

    assert.ok(fs.existsSync(path.join(dest, 'file.txt')));
    assert.strictEqual(fs.readFileSync(path.join(dest, 'file.txt'), 'utf8'), 'relative copy test');
  });

  it('should fall back to directory copy when symlink fails with EPERM', () => {
    const source = path.join(tmpDir, 'source-dir');
    const link = path.join(tmpDir, 'fallback-link-dir');
    fs.mkdirSync(source);
    fs.writeFileSync(path.join(source, 'nested.txt'), 'nested content');

    const origSymlinkSync = fs.symlinkSync;
    try {
      fs.symlinkSync = () => {
        const err = new Error('operation not permitted');
        err.code = 'EPERM';
        throw err;
      };

      createLinkOrCopy(source, link, 'dir', 'symlink');

      assert.ok(fs.existsSync(link));
      assert.ok(fs.existsSync(path.join(link, 'nested.txt')));
      assert.strictEqual(fs.readFileSync(path.join(link, 'nested.txt'), 'utf8'), 'nested content');
    } finally {
      fs.symlinkSync = origSymlinkSync;
    }
  });

  it('should fall back to file copy when symlink fails with EPERM', () => {
    const source = path.join(tmpDir, 'source-file.txt');
    const link = path.join(tmpDir, 'fallback-link-file.txt');
    fs.writeFileSync(source, 'file content');

    const origSymlinkSync = fs.symlinkSync;
    try {
      fs.symlinkSync = () => {
        const err = new Error('operation not permitted');
        err.code = 'EPERM';
        throw err;
      };

      createLinkOrCopy(source, link, 'file', 'symlink');

      assert.ok(fs.existsSync(link));
      assert.strictEqual(fs.readFileSync(link, 'utf8'), 'file content');
    } finally {
      fs.symlinkSync = origSymlinkSync;
    }
  });
});

describe('Test 11: handleConflict()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should delete symbolic link if method is copy', () => {
    const linkPath = path.join(tmpDir, 'test-link');
    const targetPath = path.join(tmpDir, 'target');
    fs.mkdirSync(targetPath);
    fs.symlinkSync(targetPath, linkPath, 'dir');

    // Make sure link exists as symlink
    assert.ok(fs.lstatSync(linkPath).isSymbolicLink());

    handleConflict(linkPath, 'test-link', tmpDir, 'copy');

    // Should no longer exist (since it was deleted)
    assert.throws(() => {
      fs.lstatSync(linkPath);
    }, /ENOENT/);
  });

  it('should keep symbolic link if method is symlink and points to .agents', () => {
    const linkPath = path.join(tmpDir, 'test-link');
    fs.symlinkSync('.agents', linkPath, 'dir');

    handleConflict(linkPath, 'test-link', tmpDir, 'symlink');

    // Should still exist and point to .agents
    const stat = fs.lstatSync(linkPath);
    assert.ok(stat.isSymbolicLink());
    assert.strictEqual(fs.readlinkSync(linkPath), '.agents');
  });

  it('should delete symbolic link if method is symlink but points to wrong target', () => {
    const linkPath = path.join(tmpDir, 'test-link');
    fs.symlinkSync('wrong-target', linkPath, 'dir');

    handleConflict(linkPath, 'test-link', tmpDir, 'symlink');

    // Should be deleted
    assert.throws(() => {
      fs.lstatSync(linkPath);
    }, /ENOENT/);
  });

  it('should backup real directory or file if method is symlink', () => {
    const dirPath = path.join(tmpDir, 'real-dir');
    fs.mkdirSync(dirPath);
    fs.writeFileSync(path.join(dirPath, 'file.txt'), 'data');

    handleConflict(dirPath, 'real-dir', tmpDir, 'symlink');

    // Original directory should no longer exist at original path
    assert.throws(() => {
      fs.lstatSync(dirPath);
    }, /ENOENT/);

    // Backup directory should exist
    const files = fs.readdirSync(tmpDir);
    const backupDir = files.find(f => f.startsWith('real-dir.backup.'));
    assert.ok(backupDir);
    assert.ok(fs.existsSync(path.join(tmpDir, backupDir, 'file.txt')));
  });

  it('should NOT backup real directory if method is copy (enrich instead)', () => {
    const dirPath = path.join(tmpDir, 'real-dir');
    fs.mkdirSync(dirPath);
    fs.writeFileSync(path.join(dirPath, 'file.txt'), 'data');

    handleConflict(dirPath, 'real-dir', tmpDir, 'copy');

    // Original directory should still exist
    assert.ok(fs.existsSync(dirPath));
    assert.ok(fs.existsSync(path.join(dirPath, 'file.txt')));
  });
});

describe('Test 5: detectState()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should detect fresh project', () => {
    assert.strictEqual(detectState(tmpDir), 'fresh');
  });

  it('should detect already installed', () => {
    fs.mkdirSync(path.join(tmpDir, '.agents'));
    fs.writeFileSync(path.join(tmpDir, '.agents', '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));
    assert.strictEqual(detectState(tmpDir), 'installed');
  });

  it('should detect migration needed', () => {
    fs.mkdirSync(path.join(tmpDir, '.opencode'));
    assert.strictEqual(detectState(tmpDir), 'migrate');
  });

  it('should prioritize installed over migrate', () => {
    fs.mkdirSync(path.join(tmpDir, '.opencode'));
    fs.mkdirSync(path.join(tmpDir, '.agents'));
    fs.writeFileSync(path.join(tmpDir, '.agents', '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));
    assert.strictEqual(detectState(tmpDir), 'installed');
  });

  it('should detect repair if .agents folder exists but has no .vespyr-version file', () => {
    fs.mkdirSync(path.join(tmpDir, '.agents'));
    assert.strictEqual(detectState(tmpDir), 'repair');
  });
});

describe('Test 6: getInstalledVersion() / writeVersionFile()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents'));
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should write version file', () => {
    writeVersionFile(tmpDir);
    const versionPath = path.join(tmpDir, '.agents', '.vespyr-version');
    assert.ok(fs.existsSync(versionPath));
    const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    assert.strictEqual(data.version, VERSION);
    assert.ok(data.installed);
  });

  it('should return null on fresh install', () => {
    assert.strictEqual(getInstalledVersion(tmpDir), null);
  });

  it('should return version after write', () => {
    writeVersionFile(tmpDir);
    assert.strictEqual(getInstalledVersion(tmpDir), VERSION);
  });

  it('should return null for malformed JSON', () => {
    const versionPath = path.join(tmpDir, '.agents', '.vespyr-version');
    fs.writeFileSync(versionPath, 'not json');
    assert.strictEqual(getInstalledVersion(tmpDir), null);
  });
});

describe('Test 7: scaffoldArtifacts()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents', 'agents'), { recursive: true });
    for (let i = 0; i < 21; i++) {
      fs.writeFileSync(path.join(tmpDir, '.agents', 'agents', `agent${i}.md`), 'test');
    }
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should create full directory tree on first run', () => {
    scaffoldArtifacts(tmpDir, 'test-project');

    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'output')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'memory')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'telemetry')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'directions')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'input', 'data')));
  });

  it('should write project-context.md with project name', () => {
    scaffoldArtifacts(tmpDir, 'test-project');

    const ctx = fs.readFileSync(path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'), 'utf8');
    assert.ok(ctx.includes(`Project: test-project`));
    assert.ok(ctx.includes('Stack: None'));
    assert.ok(ctx.includes('Phase: validation'));
  });

  it('should not overwrite existing artifacts', () => {
    fs.mkdirSync(path.join(tmpDir, 'artifacts'));
    fs.writeFileSync(path.join(tmpDir, 'artifacts', 'existing.txt'), 'keep');

    scaffoldArtifacts(tmpDir, 'test-project');

    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'existing.txt')));
  });

  it('should create consolidated memory directory layout (archive, session-summaries) and omit ghost folders', () => {
    scaffoldArtifacts(tmpDir, 'test-project');

    const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
    assert.ok(fs.existsSync(path.join(memoryDir, 'archive')));
    assert.ok(fs.existsSync(path.join(memoryDir, 'session-summaries')));
    assert.ok(!fs.existsSync(path.join(memoryDir, 'pending-questions')));
    assert.ok(!fs.existsSync(path.join(memoryDir, 'agent-notes')));
  });

  it('should seed 5 memory markdown files with machine state fence', () => {
    scaffoldArtifacts(tmpDir, 'test-project');

    const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
    assert.ok(fs.existsSync(path.join(memoryDir, 'project-context.md')));
    assert.ok(fs.existsSync(path.join(memoryDir, 'active-decisions.md')));
    assert.ok(fs.existsSync(path.join(memoryDir, 'patterns-and-conventions.md')));
    assert.ok(fs.existsSync(path.join(memoryDir, 'lessons-learned.md')));
    assert.ok(fs.existsSync(path.join(memoryDir, 'blockers-and-risks.md')));

    const ctx = fs.readFileSync(path.join(memoryDir, 'project-context.md'), 'utf8');
    assert.ok(ctx.includes('<!-- BEGIN MACHINE STATE -->'));
    assert.ok(ctx.includes('<!-- END MACHINE STATE -->'));
    assert.ok(ctx.includes('Engine Version: 2.0.7'));
  });
});

describe('Test 8: bootstrapRootDocs()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents', 'templates', 'system'), { recursive: true });

    fs.writeFileSync(path.join(tmpDir, '.agents', 'templates', 'system', 'AGENTS.md.canonical'),
      '# {Project Name} — Vespyr\n\nPath: .agents/agents/\n');
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should create AGENTS.md and agent.md on first run', () => {
    bootstrapRootDocs(tmpDir, 'test-project', []);

    assert.ok(fs.existsSync(path.join(tmpDir, 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'agent.md')));
  });

  it('should create CLAUDE.md when claude harness selected', () => {
    bootstrapRootDocs(tmpDir, 'test-project', ['claude']);

    assert.ok(fs.existsSync(path.join(tmpDir, 'CLAUDE.md')));
    const claude = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    assert.ok(claude.includes('.claude/agents/'));
  });

  it('should not overwrite existing files', () => {
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), 'existing');

    bootstrapRootDocs(tmpDir, 'test-project', []);

    assert.strictEqual(fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf8'), 'existing');
  });

  it('should contain .agents/ references in AGENTS.md', () => {
    bootstrapRootDocs(tmpDir, 'test-project', []);

    const agents = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf8');
    assert.ok(agents.includes('.agents/'));
    assert.ok(!agents.includes('.opencode/'));
  });

  it('should replace {Project Name} in AGENTS.md', () => {
    bootstrapRootDocs(tmpDir, 'my-app', []);

    const agents = fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf8');
    assert.ok(agents.includes('my-app'));
  });
});

describe('Test 9: asciiArtSpacing()', () => {
  it('should have correct leading spaces on line 1', () => {
    const lines = ASCII_ART.split('\n');
    assert.strictEqual(lines[0], '');
    assert.ok(lines[1].startsWith(' __  __'));
    assert.strictEqual(lines[1].indexOf('__'), 1);
  });

  it('should have correct leading spaces on line 8', () => {
    const lines = ASCII_ART.split('\n');
    const line8 = lines[8];
    const match = line8.match(/^( *)\\ \\_\\/);
    assert.ok(match, `Line 8 should start with spaces before \\ \\_\\, got: "${line8}"`);
    assert.strictEqual(match[1].length, 28);
  });

  it('should have correct leading spaces on line 9', () => {
    const lines = ASCII_ART.split('\n');
    const line9 = lines[9];
    const match = line9.match(/^( *)\\\/_\//);
    assert.ok(match, `Line 9 should start with spaces before \\/_\\/, got: "${line9}"`);
    assert.strictEqual(match[1].length, 29);
  });

  it('should contain no tab characters', () => {
    assert.ok(!ASCII_ART.includes('\t'));
  });
});

describe('Test 10: parseFlags()', () => {
  it('should handle no flags', () => {
    const result = parseFlags(['node', 'cli.js']);
    assert.deepStrictEqual(result, {
      dryRun: false,
      yes: false,
      target: null,
      harnesses: [],
      version: false,
      help: false,
      syncDocs: false,
      installGitHook: false,
      verify: false,
      audit: false,
      manifest: false,
      json: false,
      spec: null,
      command: null,
      projectName: null,
      userNickname: null,
      stack: null,
    });
  });

  it('should handle --dry-run', () => {
    const result = parseFlags(['node', 'cli.js', '--dry-run']);
    assert.strictEqual(result.dryRun, true);
  });

  it('should handle --yes / -y', () => {
    const result = parseFlags(['node', 'cli.js', '-y']);
    assert.strictEqual(result.yes, true);
  });

  it('should handle --target', () => {
    const result = parseFlags(['node', 'cli.js', '--target', '/tmp/proj']);
    assert.strictEqual(result.target, '/tmp/proj');
  });

  it('should handle --harness', () => {
    const result = parseFlags(['node', 'cli.js', '--harness', 'opencode,claude']);
    assert.deepStrictEqual(result.harnesses, ['opencode', 'claude']);
  });

  it('should handle --version / -v', () => {
    const result = parseFlags(['node', 'cli.js', '-v']);
    assert.strictEqual(result.version, true);
  });

  it('should handle --help / -h', () => {
    const result = parseFlags(['node', 'cli.js', '--help']);
    assert.strictEqual(result.help, true);
  });

  it('should handle --sync-docs', () => {
    const result = parseFlags(['node', 'cli.js', '--sync-docs']);
    assert.strictEqual(result.syncDocs, true);
  });

  it('should handle --install-git-hook', () => {
    const result = parseFlags(['node', 'cli.js', '--install-git-hook']);
    assert.strictEqual(result.installGitHook, true);
  });

  it('should handle combined flags', () => {
    const result = parseFlags(['node', 'cli.js', '--dry-run', '--yes', '--target', './here']);
    assert.strictEqual(result.dryRun, true);
    assert.strictEqual(result.yes, true);
    assert.strictEqual(result.target, './here');
  });
});

describe('Test 10b: installGitHook()', () => {
  it('should install post-push hook when .git exists', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
    const ok = installGitHook(dir);
    assert.strictEqual(ok, true);
    const hook = fs.readFileSync(path.join(dir, '.git', 'hooks', 'post-push'), 'utf8');
    assert.ok(hook.includes('orchestrator_state.js sync-context'));
    cleanTempDir(dir);
  });

  it('should return false and skip when no .git directory', () => {
    const dir = makeTempDir();
    const ok = installGitHook(dir);
    assert.strictEqual(ok, false);
    assert.ok(!fs.existsSync(path.join(dir, '.git', 'hooks', 'post-push')));
    cleanTempDir(dir);
  });

  it('should not overwrite an existing non-Vespyr post-push hook', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.git', 'hooks', 'post-push'), '#!/bin/sh\necho custom\n', { mode: 0o755 });
    const ok = installGitHook(dir);
    assert.strictEqual(ok, false);
    const hook = fs.readFileSync(path.join(dir, '.git', 'hooks', 'post-push'), 'utf8');
    assert.ok(hook.includes('custom'));
    assert.ok(!hook.includes('orchestrator_state.js'));
    cleanTempDir(dir);
  });
});

describe('Test 12: removeDirIfEmpty()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should remove a directory if completely empty', () => {
    const emptySub = path.join(tmpDir, 'empty-sub');
    fs.mkdirSync(emptySub);
    removeDirIfEmpty(emptySub);
    assert.strictEqual(fs.existsSync(emptySub), false);
  });

  it('should remove a directory if it only contains .DS_Store', () => {
    const dsStoreSub = path.join(tmpDir, 'ds-store-sub');
    fs.mkdirSync(dsStoreSub);
    fs.writeFileSync(path.join(dsStoreSub, '.DS_Store'), 'some binary data');
    removeDirIfEmpty(dsStoreSub);
    assert.strictEqual(fs.existsSync(dsStoreSub), false);
  });

  it('should NOT remove a directory if it contains other files', () => {
    const nonOptionSub = path.join(tmpDir, 'non-empty-sub');
    fs.mkdirSync(nonOptionSub);
    fs.writeFileSync(path.join(nonOptionSub, 'custom-file.txt'), 'keep me');
    removeDirIfEmpty(nonOptionSub);
    assert.strictEqual(fs.existsSync(nonOptionSub), true);
    assert.strictEqual(fs.readFileSync(path.join(nonOptionSub, 'custom-file.txt'), 'utf8'), 'keep me');
  });
});

describe('Test 13: surgicallyCleanupAgentsDir()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should remove core files but preserve custom files and skills', () => {
    const targetAgents = path.join(tmpDir, '.agents');
    fs.mkdirSync(targetAgents);
    fs.mkdirSync(path.join(targetAgents, 'agents'));
    fs.mkdirSync(path.join(targetAgents, 'skills'));
    fs.mkdirSync(path.join(targetAgents, 'commands'));

    // Create a core agent, a core skill, a core folder, and some core files
    fs.writeFileSync(path.join(targetAgents, 'agents', 'founder.md'), 'core agent');
    fs.mkdirSync(path.join(targetAgents, 'skills', 'validate-idea'));
    fs.writeFileSync(path.join(targetAgents, 'skills', 'validate-idea', 'SKILL.md'), 'core skill');
    fs.writeFileSync(path.join(targetAgents, 'GUARDRAILS.md'), 'core guardrails');
    fs.writeFileSync(path.join(targetAgents, '.vespyr-version'), 'version info');

    // Create custom files/skills
    fs.writeFileSync(path.join(targetAgents, 'agents', 'custom-agent.md'), 'my custom agent');
    fs.mkdirSync(path.join(targetAgents, 'skills', 'my-custom-skill'));
    fs.writeFileSync(path.join(targetAgents, 'skills', 'my-custom-skill', 'SKILL.md'), 'custom skill');
    fs.writeFileSync(path.join(targetAgents, 'custom-file.txt'), 'custom text');

    surgicallyCleanupAgentsDir(targetAgents);

    // Core files should be deleted
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'agents', 'founder.md')), false);
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'skills', 'validate-idea')), false);
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'GUARDRAILS.md')), false);
    assert.strictEqual(fs.existsSync(path.join(targetAgents, '.vespyr-version')), false);
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'commands')), false);

    // Custom files/skills should be preserved
    assert.strictEqual(fs.existsSync(targetAgents), true);
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'agents', 'custom-agent.md')), true);
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'skills', 'my-custom-skill')), true);
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'custom-file.txt')), true);
  });
});

describe('Test 14: performUninstall() surgical project cleanup', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should surgically uninstall from harnesses and delete empty folders recursively', async () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(agentsTarget);
    fs.mkdirSync(path.join(agentsTarget, 'agents'));
    fs.writeFileSync(path.join(agentsTarget, 'agents', 'founder.md'), 'core');
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));

    // Setup Cursor rules directory with core rule and a custom rule
    const rulesDir = path.join(tmpDir, '.cursor', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'founder.mdc'), 'transpiled founder rule');
    fs.writeFileSync(path.join(rulesDir, 'my-own-rule.mdc'), 'user rule');

    // Setup GitHub agents directory with core agent and a custom agent
    const githubAgentsDir = path.join(tmpDir, '.github', 'agents');
    fs.mkdirSync(githubAgentsDir, { recursive: true });
    fs.writeFileSync(path.join(githubAgentsDir, 'founder.yml'), 'transpiled founder agent');
    fs.writeFileSync(path.join(githubAgentsDir, 'my-own-agent.yml'), 'user agent');
    fs.writeFileSync(path.join(tmpDir, '.github', 'copilot-instructions.md'), 'copilot instructions');

    // Setup Windsurf workflows directory (copy method) with core skill and custom skill
    const windsurfWorkflowsDir = path.join(tmpDir, '.windsurf', 'workflows');
    fs.mkdirSync(windsurfWorkflowsDir, { recursive: true });
    fs.mkdirSync(path.join(windsurfWorkflowsDir, 'validate-idea'));
    fs.writeFileSync(path.join(windsurfWorkflowsDir, 'validate-idea', 'SKILL.md'), 'core skill');
    fs.mkdirSync(path.join(windsurfWorkflowsDir, 'my-custom-skill'));
    fs.writeFileSync(path.join(windsurfWorkflowsDir, 'my-custom-skill', 'SKILL.md'), 'user skill');
    fs.writeFileSync(path.join(tmpDir, '.windsurfrules'), 'windsurf rules');

    // Run uninstall
    await performUninstall(tmpDir);

    // Core files deleted
    assert.strictEqual(fs.existsSync(path.join(rulesDir, 'founder.mdc')), false);
    assert.strictEqual(fs.existsSync(path.join(githubAgentsDir, 'founder.yml')), false);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.github', 'copilot-instructions.md')), false);
    assert.strictEqual(fs.existsSync(path.join(windsurfWorkflowsDir, 'validate-idea')), false);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.windsurfrules')), false);

    // Custom files preserved
    assert.strictEqual(fs.existsSync(path.join(rulesDir, 'my-own-rule.mdc')), true);
    assert.strictEqual(fs.existsSync(path.join(githubAgentsDir, 'my-own-agent.yml')), true);
    assert.strictEqual(fs.existsSync(path.join(windsurfWorkflowsDir, 'my-custom-skill')), true);

    // Verify .agents got completely cleaned up since it had no custom files
    assert.strictEqual(fs.existsSync(agentsTarget), false);
  });

  it('should resolve and clean up global paths when version file has global: true', async () => {
    const originalHomedir = os.homedir;
    const mockHome = path.join(tmpDir, 'mock-home');
    fs.mkdirSync(mockHome);
    
    // Override os.homedir
    os.homedir = () => mockHome;

    // Set up a mock global target directory inside the mock home
    const agentsTarget = path.join(mockHome, '.agents');
    fs.mkdirSync(agentsTarget);
    fs.mkdirSync(path.join(agentsTarget, 'agents'));
    fs.writeFileSync(path.join(agentsTarget, 'agents', 'founder.md'), 'core');
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.7.0', global: true }));

    // Set up mock global harnesses
    const globalOpencode = path.join(mockHome, '.opencode');
    fs.mkdirSync(globalOpencode);
    fs.writeFileSync(path.join(globalOpencode, '.vespyr-version'), JSON.stringify({ version: '1.7.0', global: true }));

    // Run uninstall passing the mock target folder
    await performUninstall(mockHome);

    // Restore homedir
    os.homedir = originalHomedir;

    // Verify global harness got cleaned up surgically
    assert.strictEqual(fs.existsSync(globalOpencode), false);
    assert.strictEqual(fs.existsSync(agentsTarget), false);
  });
});

describe('Test 15: Reconfigure Nickname Helpers', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should default to User if project-context.md does not exist', () => {
    const nickname = getExistingUserNickname(tmpDir);
    assert.strictEqual(nickname, 'User');
  });

  it('should parse existing nickname from project-context.md', () => {
    const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(path.join(memoryDir, 'project-context.md'), `# Project Context\n\n## Identity\n- **Project Name**: temp\n- **User Nickname**: Christian\n`);
    
    const nickname = getExistingUserNickname(tmpDir);
    assert.strictEqual(nickname, 'Christian');
  });

  it('should update user nickname in project-context.md', () => {
    const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
    const contextFile = path.join(memoryDir, 'project-context.md');
    fs.writeFileSync(contextFile, `# Project Context\n\n## Identity\n- **Project Name**: temp\n- **User Nickname**: Christian\n`);

    updateUserNickname(tmpDir, 'Sarah');

    const content = fs.readFileSync(contextFile, 'utf8');
    assert.ok(content.includes('- **User Nickname**: Sarah'));
    assert.ok(!content.includes('- **User Nickname**: Christian'));
  });
});

describe('Test 16: Reconfiguration harness removal', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should remove deselected harness files when reconfiguring', async () => {
    // Write fake versions and harnesses
    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(agentsTarget);
    fs.mkdirSync(path.join(agentsTarget, 'agents'));
    fs.writeFileSync(path.join(agentsTarget, 'agents', 'founder.md'), 'core agent');
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));

    // Setup opencode (symlink/directory)
    const opencodePath = path.join(tmpDir, '.opencode');
    fs.mkdirSync(opencodePath);
    fs.writeFileSync(path.join(opencodePath, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));

    // Setup Claude Code (symlink/directory)
    const claudePath = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudePath);
    fs.writeFileSync(path.join(claudePath, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));

    // Run reconfigure with only claude (deselecting opencode)
    const { performReconfigure } = require('../bin/cli.js');
    await performReconfigure(tmpDir, { harnesses: ['claude'], yes: true });

    // opencode (deselected) should be surgically removed
    assert.strictEqual(fs.existsSync(opencodePath), false);
    
    // claude (selected) should still exist
    assert.strictEqual(fs.existsSync(claudePath), true);
  });

  it('should remove commands folder from .agents if opencode is not selected', async () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(agentsTarget);
    fs.mkdirSync(path.join(agentsTarget, 'agents'));
    fs.mkdirSync(path.join(agentsTarget, 'commands'));
    fs.writeFileSync(path.join(agentsTarget, 'agents', 'founder.md'), 'core agent');
    fs.writeFileSync(path.join(agentsTarget, 'commands', 'init.md'), 'init command');
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));

    // Setup Claude Code (symlink/directory)
    const claudePath = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudePath);
    fs.writeFileSync(path.join(claudePath, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));

    // Run reconfigure with only claude (excluding opencode)
    const { performReconfigure } = require('../bin/cli.js');
    await performReconfigure(tmpDir, { harnesses: ['claude'], yes: true });

    // commands folder should be removed from .agents
    assert.strictEqual(fs.existsSync(path.join(agentsTarget, 'commands')), false);
  });
});

describe('Test 17: End-to-End Installation, Update, Reconfiguration, and Uninstallation Scenarios', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should run the complete cycle of fresh install, update, reconfigure, and uninstall smoothly', async () => {
    // 1. Setup a fresh project directory structure simulating the source folder
    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(agentsTarget);
    fs.mkdirSync(path.join(agentsTarget, 'agents'));
    fs.mkdirSync(path.join(agentsTarget, 'skills'));
    fs.writeFileSync(path.join(agentsTarget, 'agents', 'founder.md'), '---\ndescription: "core agent"\n---\nfounder prompt');
    fs.writeFileSync(path.join(agentsTarget, 'skills', 'skills.md'), 'core skills');
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.6.0' }));

    // Setup project context
    const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
    const contextFile = path.join(memoryDir, 'project-context.md');
    fs.writeFileSync(contextFile, `# Project Context\n\n## Identity\n- **Project Name**: temp\n- **User Nickname**: Christian\n`);

    // Customize a shipped file BEFORE update so the .bak-YYYYMMDD machinery
    // has something to preserve (02h §10 B3 E2E clause).
    // NOTE: must be a file that still exists in the incoming AGENTS_SRC so
    // the update actually overwrites it (backup-on-overwrite semantics).
    const customizedFile = path.join(agentsTarget, 'GUARDRAILS.md');
    fs.writeFileSync(customizedFile, 'user-customized guardrails content');
    assert.ok(fs.existsSync(path.join(process.cwd(), '.agents', 'GUARDRAILS.md')), 'precondition: GUARDRAILS.md ships in AGENTS_SRC');

    // 2. Run performUpdate to update from v1.6.0 (simulated) to latest version
    const { performUpdate } = require('../bin/cli.js');
    await performUpdate(tmpDir, { yes: true });

    // Verify it updated the version file and kept the files
    const newVersion = JSON.parse(fs.readFileSync(path.join(agentsTarget, '.vespyr-version'), 'utf8'));
    assert.strictEqual(newVersion.version, VERSION);

    // Verify B1: customized file preserved as .bak-YYYYMMDD with verbatim content
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const bakFile = `${customizedFile}.bak-${today}`;
    assert.strictEqual(fs.existsSync(bakFile), true, 'customized file must be backed up as .bak-YYYYMMDD');
    assert.strictEqual(fs.readFileSync(bakFile, 'utf8'), 'user-customized guardrails content');

    // 3. Run performReconfigure to select opencode and claude
    const opencodePath = path.join(tmpDir, '.opencode');
    const claudePath = path.join(tmpDir, '.claude');
    
    // Configure harnesses: ['opencode', 'claude']
    await performReconfigure(tmpDir, { harnesses: ['opencode', 'claude'], yes: true });

    // Verify both are configured
    assert.strictEqual(fs.existsSync(opencodePath), true);
    assert.strictEqual(fs.existsSync(claudePath), true);

    // Add custom files that should never be deleted during uninstallation/reconfigurations
    const rulesDir = path.join(tmpDir, '.cursor', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'founder.mdc'), 'core rule');
    fs.writeFileSync(path.join(rulesDir, 'my-custom-rule.mdc'), 'user rule');
    fs.writeFileSync(path.join(agentsTarget, 'skills', 'my-custom-skill.md'), 'user skill');

    // 4. Reconfigure to deselect opencode (leaving only claude)
    await performReconfigure(tmpDir, { harnesses: ['claude'], yes: true });

    // Verify opencode is surgically removed
    assert.strictEqual(fs.existsSync(opencodePath), false);
    // Verify claude and custom rules/skills remain
    assert.strictEqual(fs.existsSync(claudePath), true);
    assert.strictEqual(fs.existsSync(path.join(rulesDir, 'my-custom-rule.mdc')), true);
    assert.strictEqual(fs.existsSync(path.join(agentsTarget, 'skills', 'my-custom-skill.md')), true);

    // 5. Perform final uninstallation
    await performUninstall(tmpDir);

    // Verify harness files and CLAUDE.md got surgically uninstalled
    assert.strictEqual(fs.existsSync(claudePath), false);
    assert.strictEqual(fs.existsSync(path.join(rulesDir, 'founder.mdc')), false);

    // Verify custom files are preserved
    assert.strictEqual(fs.existsSync(path.join(rulesDir, 'my-custom-rule.mdc')), true);
    assert.strictEqual(fs.existsSync(path.join(agentsTarget, 'skills', 'my-custom-skill.md')), true);
  });
});

describe('Test 18: Kiro Harness Scaffolding & Migration', { skip: process.platform === 'win32' ? 'fixtures create raw symlinks (named limitation, 02h §10 WS-C skip manifest)' : false }, () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should scaffold .kiro/steering/vespyr-steering.md and .kiro/skills correctly', async () => {
    const { performReconfigure } = require('../bin/cli.js');

    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(path.join(agentsTarget, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: VERSION }));
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# AGENTS Guide');

    await performReconfigure(tmpDir, { harnesses: ['kiro'], yes: true });

    const kiroDir = path.join(tmpDir, '.kiro');
    const steeringAgentsPath = path.join(kiroDir, 'steering', 'vespyr-steering.md');
    const skillsDir = path.join(kiroDir, 'skills');

    assert.ok(fs.existsSync(steeringAgentsPath));
    assert.ok(fs.existsSync(skillsDir));

    if (process.platform !== 'win32') {
      const skillsStat = fs.lstatSync(skillsDir);
      assert.ok(skillsStat.isSymbolicLink());

      const steeringStat = fs.lstatSync(steeringAgentsPath);
      assert.ok(steeringStat.isSymbolicLink());
    }
  });

  it('should clean up legacy .kiro/steering symlink when reconfiguring kiro', async () => {
    const { performReconfigure } = require('../bin/cli.js');

    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(path.join(agentsTarget, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(agentsTarget, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: VERSION }));
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# AGENTS Guide');

    // Create legacy symlink: .kiro/steering -> .agents/agents
    const kiroDir = path.join(tmpDir, '.kiro');
    fs.mkdirSync(kiroDir, { recursive: true });
    const legacySteeringLink = path.join(kiroDir, 'steering');
    fs.symlinkSync(path.join(agentsTarget, 'agents'), legacySteeringLink, 'dir');

    assert.ok(fs.lstatSync(legacySteeringLink).isSymbolicLink());

    // Reconfigure with kiro
    await performReconfigure(tmpDir, { harnesses: ['kiro'], yes: true });

    // .kiro/steering should now be a directory (not a symlink to agents)
    const steeringStat = fs.lstatSync(legacySteeringLink);
    assert.strictEqual(steeringStat.isSymbolicLink(), false);
    assert.ok(steeringStat.isDirectory());
    assert.ok(fs.existsSync(path.join(legacySteeringLink, 'vespyr-steering.md')));
  });

  it('should scaffold both .kiro/steering and .kiro/skills via copy fallback when symlink throws EPERM', async () => {
    const { performReconfigure } = require('../bin/cli.js');

    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(path.join(agentsTarget, 'skills', 'test-skill'), { recursive: true });
    fs.writeFileSync(path.join(agentsTarget, 'skills', 'test-skill', 'SKILL.md'), '# Test Skill');
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: VERSION }));
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# AGENTS Guide');

    const origSymlinkSync = fs.symlinkSync;
    try {
      fs.symlinkSync = () => {
        const err = new Error('operation not permitted');
        err.code = 'EPERM';
        throw err;
      };

      await performReconfigure(tmpDir, { harnesses: ['kiro'], yes: true });

      const kiroDir = path.join(tmpDir, '.kiro');
      const steeringAgentsPath = path.join(kiroDir, 'steering', 'vespyr-steering.md');
      const skillsDir = path.join(kiroDir, 'skills');

      assert.ok(fs.existsSync(steeringAgentsPath), 'steering document must exist');
      assert.ok(fs.existsSync(skillsDir), 'skills directory must exist');
      assert.ok(fs.existsSync(path.join(skillsDir, 'test-skill', 'SKILL.md')), 'copied skill file must exist');
    } finally {
      fs.symlinkSync = origSymlinkSync;
    }
  });
});

describe('Test 19: Root Docs Regeneration on Update', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should recreate AGENTS.md, agent.md, and CLAUDE.md when deleted and updating', async () => {
    const { performUpdate } = require('../bin/cli.js');

    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(path.join(agentsTarget, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(agentsTarget, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(agentsTarget, 'agent.md.canonical'), '# {Project Name} Canonical');
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.6.0' }));

    // Setup Claude harness
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, '.vespyr-version'), JSON.stringify({ version: '1.6.0' }));

    // Ensure root docs do NOT exist
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'AGENTS.md')), false);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'agent.md')), false);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'CLAUDE.md')), false);

    // Run update
    await performUpdate(tmpDir, { yes: true });

    // Root docs should be recreated
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'AGENTS.md')), true);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'agent.md')), true);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'CLAUDE.md')), true);
  });
});


