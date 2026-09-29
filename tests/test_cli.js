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
  scaffoldArtifacts,
  backupExistingArtifactsDir,
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
  removeStaleManifestFiles,
  cleanupDeprecatedCoreFiles,
  DEPRECATED_CORE_FILES,
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
    fs.mkdirSync(path.join(tmpDir, '.agents'), { recursive: true });
    fs.symlinkSync('.agents', linkPath, 'dir');

    handleConflict(linkPath, 'test-link', tmpDir, 'symlink');

    // Should still exist and point to .agents
    const stat = fs.lstatSync(linkPath);
    assert.ok(stat.isSymbolicLink());
    assert.strictEqual(fs.readlinkSync(linkPath), '.agents');
  });

  it('should repair a dangling .agents-shaped symlink so reinstall can recreate it', () => {
    const linkPath = path.join(tmpDir, 'dangling-link');
    fs.symlinkSync('.agents', linkPath, 'dir');
    assert.strictEqual(fs.existsSync(linkPath), false, 'precondition: link must be dangling');

    handleConflict(linkPath, 'dangling-link', tmpDir, 'symlink');

    assert.throws(() => {
      fs.lstatSync(linkPath);
    }, /ENOENT/);
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

  it('should detect repair if .agents folder has Vespyr content but no .vespyr-version file', () => {
    fs.mkdirSync(path.join(tmpDir, '.agents'));
    fs.writeFileSync(path.join(tmpDir, '.agents', 'GUARDRAILS.md'), 'core guardrails');
    assert.strictEqual(detectState(tmpDir), 'repair');
  });
});

describe('Test 5b: detectState() foreign .agents vs repair classification', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should detect fresh when .agents is empty', () => {
    fs.mkdirSync(path.join(tmpDir, '.agents'));
    assert.strictEqual(detectState(tmpDir), 'fresh');
  });

  it('should detect foreign when .agents holds only third-party content', () => {
    // The reported scenario: a skill from another tool owns .agents/.
    // Generic names (agents/, skills/) must NOT count as Vespyr fingerprints.
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills', 'my-skill'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', 'my-skill', 'SKILL.md'), 'third-party skill');
    fs.mkdirSync(path.join(tmpDir, '.agents', 'agents'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'agents', 'custom.md'), 'third-party agent');
    assert.strictEqual(detectState(tmpDir), 'foreign');
  });

  it('should still detect repair when Vespyr fingerprints are present', () => {
    const { isVespyrAgentsDir } = require('../bin/cli.js');
    const cases = [
      ['.vespyr-manifest.json', '[]'],
      ['manifest.json', '{"files":{}}'],
      ['GUARDRAILS.md', 'guardrails'],
      ['templates/system/x.md', 'template'],
      ['scripts/orchestrator_state.js', 'orchestrator'],
    ];
    for (const [rel, content] of cases) {
      const dir = makeTempDir();
      try {
        const full = path.join(dir, '.agents', rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
        assert.strictEqual(isVespyrAgentsDir(path.join(dir, '.agents')), true, rel);
        assert.strictEqual(detectState(dir), 'repair', rel);
      } finally {
        cleanTempDir(dir);
      }
    }
  });

  it('should back up a foreign .agents/ aside preserving content', () => {
    const { backupExistingAgentsDir } = require('../bin/cli.js');
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', 'keep.md'), 'user content');

    const backupPath = backupExistingAgentsDir(tmpDir);

    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.agents')), false);
    assert.ok(fs.existsSync(backupPath));
    assert.strictEqual(fs.readFileSync(path.join(backupPath, 'skills', 'keep.md'), 'utf8'), 'user content');
  });

  it('should back up foreign .agents and fresh-install on init --yes (reported scenario)', async () => {
    const { performForeignConflict } = require('../bin/cli.js');
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills', 'my-skill'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', 'my-skill', 'SKILL.md'), 'third-party skill');

    await performForeignConflict(tmpDir, { harnesses: [], yes: true });

    const entries = fs.readdirSync(tmpDir);
    const backup = entries.find((f) => f.startsWith('.agents.backup.'));
    assert.ok(backup, 'foreign .agents must be backed up aside');
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, backup, 'skills', 'my-skill', 'SKILL.md'), 'utf8'),
      'third-party skill',
    );
    const version = JSON.parse(fs.readFileSync(path.join(tmpDir, '.agents', '.vespyr-version'), 'utf8'));
    assert.strictEqual(version.version, VERSION);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.agents', 'skills', 'my-skill')), false);
    assert.strictEqual(detectState(tmpDir), 'installed');
  });

  it('should present Merge as 1st option when foreign .agents has skills', async () => {
    const { performForeignConflict } = require('../bin/cli.js');
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills', 'custom-skill'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', 'custom-skill', 'SKILL.md'), 'custom');

    let askedQuestion = null;
    let presentedChoices = null;
    const mockPrompt = async (question, choices) => {
      askedQuestion = question;
      presentedChoices = choices;
      return 2; // Cancel
    };

    // Prevent process.exit from terminating the test runner
    const origExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; throw new Error('EXIT_CALLED'); };

    try {
      await performForeignConflict(tmpDir, {}, mockPrompt);
    } catch (e) {
      if (e.message !== 'EXIT_CALLED') throw e;
    } finally {
      process.exit = origExit;
    }

    assert.ok(presentedChoices);
    assert.ok(presentedChoices[0].startsWith('Merge'));
    assert.ok(presentedChoices[1].startsWith('Fresh install'));
    assert.strictEqual(exitCode, 0);
  });

  it('should present Fresh install as 1st option when foreign .agents has no skills', async () => {
    const { performForeignConflict } = require('../bin/cli.js');
    fs.mkdirSync(path.join(tmpDir, '.agents', 'other'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'other', 'file.txt'), 'other');

    let presentedChoices = null;
    const mockPrompt = async (question, choices) => {
      presentedChoices = choices;
      return 2; // Cancel
    };

    const origExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; throw new Error('EXIT_CALLED'); };

    try {
      await performForeignConflict(tmpDir, {}, mockPrompt);
    } catch (e) {
      if (e.message !== 'EXIT_CALLED') throw e;
    } finally {
      process.exit = origExit;
    }

    assert.ok(presentedChoices);
    assert.ok(presentedChoices[0].startsWith('Fresh install'));
    assert.ok(presentedChoices[1].startsWith('Merge'));
    assert.strictEqual(exitCode, 0);
  });

  it('should initialize artifacts when choosing Merge and artifacts does not exist', async () => {
    const { performForeignConflict } = require('../bin/cli.js');
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills', 'my-skill'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', 'my-skill', 'SKILL.md'), 'custom skill');

    const mockPrompt = async (question, choices) => {
      // Choose Merge (index 0 when skills present)
      return 0;
    };

    await performForeignConflict(tmpDir, { harnesses: [] }, mockPrompt);

    // .agents/ merged
    assert.ok(fs.existsSync(path.join(tmpDir, '.agents', 'skills', 'my-skill', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.agents', '.vespyr-version')));

    // artifacts initialized
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'output')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'memory', 'project-context.md')));
  });

  it('should prompt for artifacts resolution when choosing Merge and artifacts already exists', async () => {
    const { performForeignConflict } = require('../bin/cli.js');
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills', 'my-skill'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', 'my-skill', 'SKILL.md'), 'custom skill');

    // Pre-existing artifacts with custom file and old context
    fs.mkdirSync(path.join(tmpDir, 'artifacts', 'memory'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'), '# Old Context');
    fs.writeFileSync(path.join(tmpDir, 'artifacts', 'my-file.txt'), 'keep me');

    let askedPrompts = [];
    const mockPrompt = async (question, choices) => {
      askedPrompts.push({ question, choices });
      if (question.includes('Existing artifacts/')) {
        // Choose Merge (index 1 in [Replace, Merge, Fresh install])
        const mergeIdx = choices.findIndex((c) => c.startsWith('Merge'));
        return mergeIdx;
      }
      // First prompt: choose Merge
      return 0;
    };

    await performForeignConflict(tmpDir, { harnesses: [] }, mockPrompt);

    assert.strictEqual(askedPrompts.length, 2);
    assert.ok(askedPrompts[1].question.includes('Existing artifacts/'));
    assert.ok(askedPrompts[1].choices.some((c) => c.startsWith('Replace')));
    assert.ok(askedPrompts[1].choices.some((c) => c.startsWith('Merge')));
    assert.ok(askedPrompts[1].choices.some((c) => c.startsWith('Fresh install')));

    // Existing context preserved under merge
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'), 'utf8'),
      '# Old Context',
    );
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, 'artifacts', 'my-file.txt'), 'utf8'),
      'keep me',
    );
    // Missing dirs and files populated
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'output')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'memory', 'active-decisions.md')));
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
    assert.ok(ctx.includes(`Engine Version: ${require("../package.json").version}`));
  });

  it('should back up existing artifacts directory using backupExistingArtifactsDir', () => {
    fs.mkdirSync(path.join(tmpDir, 'artifacts', 'output'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'artifacts', 'output', 'report.md'), 'analysis');

    const backupPath = backupExistingArtifactsDir(tmpDir);

    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'artifacts')), false);
    assert.ok(fs.existsSync(backupPath));
    assert.strictEqual(
      fs.readFileSync(path.join(backupPath, 'output', 'report.md'), 'utf8'),
      'analysis',
    );
  });

  it('should merge missing directories and templates without overwriting existing files', () => {
    fs.mkdirSync(path.join(tmpDir, 'artifacts', 'memory'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'),
      '# Custom Project Context',
    );
    fs.writeFileSync(path.join(tmpDir, 'artifacts', 'custom.txt'), 'custom content');

    scaffoldArtifacts(tmpDir, 'test-project', 'User', null, 'merge');

    // Existing files preserved
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'), 'utf8'),
      '# Custom Project Context',
    );
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, 'artifacts', 'custom.txt'), 'utf8'),
      'custom content',
    );

    // Missing directories and files created
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'output')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'directions')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'memory', 'active-decisions.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'memory', 'lessons-learned.md')));
  });

  it('should replace template files with fresh copies while keeping other user files in replace mode', () => {
    fs.mkdirSync(path.join(tmpDir, 'artifacts', 'memory'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'),
      '# Stale Context',
    );
    fs.writeFileSync(path.join(tmpDir, 'artifacts', 'custom.txt'), 'custom content');

    scaffoldArtifacts(tmpDir, 'fresh-project', 'User', null, 'replace');

    // Template file replaced with fresh copy
    const ctx = fs.readFileSync(path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'), 'utf8');
    assert.ok(ctx.includes('Project: fresh-project'));
    assert.ok(!ctx.includes('# Stale Context'));

    // Non-template user files kept
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, 'artifacts', 'custom.txt'), 'utf8'),
      'custom content',
    );
  });

  it('should back up existing artifacts and create fresh tree in fresh-install mode', () => {
    fs.mkdirSync(path.join(tmpDir, 'artifacts', 'memory'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'),
      '# Old Artifacts',
    );

    scaffoldArtifacts(tmpDir, 'new-project', 'User', null, 'fresh-install');

    // Fresh install in place
    const ctx = fs.readFileSync(path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'), 'utf8');
    assert.ok(ctx.includes('Project: new-project'));

    // Old artifacts backed up
    const entries = fs.readdirSync(tmpDir);
    const backupDir = entries.find((e) => e.startsWith('artifacts.backup.'));
    assert.ok(backupDir, 'artifacts.backup directory must exist');
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, backupDir, 'memory', 'project-context.md'), 'utf8'),
      '# Old Artifacts',
    );
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
      uninstall: false,
      reconfigure: false,
      json: false,
      spec: null,
      command: null,
      projectName: null,
      userNickname: null,
      stack: null,
      languageArtifacts: null,
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

  it('should handle uninstall / reconfigure positionals', () => {
    assert.strictEqual(parseFlags(['node', 'cli.js', 'uninstall']).command, 'uninstall');
    assert.strictEqual(parseFlags(['node', 'cli.js', 'uninstall']).uninstall, true);
    assert.strictEqual(parseFlags(['node', 'cli.js', 'reconfigure']).command, 'reconfigure');
    assert.strictEqual(parseFlags(['node', 'cli.js', 'reconfigure']).reconfigure, true);
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

  it('should handle --language-artifacts', () => {
    const result = parseFlags(['node', 'cli.js', '--language-artifacts', 'id']);
    assert.strictEqual(result.languageArtifacts, 'id');
  });
});

describe('Test 10b: installGitHook()', () => {
  it('should install pre-push hook when .git exists (git has no post-push)', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
    const ok = installGitHook(dir);
    assert.strictEqual(ok, true);
    const hook = fs.readFileSync(path.join(dir, '.git', 'hooks', 'pre-push'), 'utf8');
    assert.ok(hook.includes('orchestrator_state.js sync-context'));
    assert.ok(!fs.existsSync(path.join(dir, '.git', 'hooks', 'post-push')), 'legacy post-push must not be created');
    cleanTempDir(dir);
  });

  it('should migrate a legacy Vespyr post-push hook to pre-push', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.git', 'hooks', 'post-push'), '#!/bin/sh\n# Vespyr: refresh\nnode .agents/scripts/orchestrator_state.js sync-context >/dev/null 2>&1 || true\n', { mode: 0o755 });
    const ok = installGitHook(dir);
    assert.strictEqual(ok, true);
    assert.ok(!fs.existsSync(path.join(dir, '.git', 'hooks', 'post-push')), 'legacy hook removed');
    assert.ok(fs.existsSync(path.join(dir, '.git', 'hooks', 'pre-push')));
    cleanTempDir(dir);
  });

  it('should return false and skip when no .git directory', () => {
    const dir = makeTempDir();
    const ok = installGitHook(dir);
    assert.strictEqual(ok, false);
    assert.ok(!fs.existsSync(path.join(dir, '.git', 'hooks', 'pre-push')));
    cleanTempDir(dir);
  });

  it('should not overwrite an existing non-Vespyr pre-push hook', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.git', 'hooks', 'pre-push'), '#!/bin/sh\necho custom\n', { mode: 0o755 });
    const ok = installGitHook(dir);
    assert.strictEqual(ok, false);
    const hook = fs.readFileSync(path.join(dir, '.git', 'hooks', 'pre-push'), 'utf8');
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

    // User-added files inside core folders must survive a surgical sweep
    fs.mkdirSync(path.join(targetAgents, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(targetAgents, 'scripts', 'my-helper.js'), 'user helper');
    fs.writeFileSync(path.join(targetAgents, 'scripts', 'orchestrator_state.js'), 'core orchestrator');
    fs.mkdirSync(path.join(targetAgents, 'references'), { recursive: true });
    fs.writeFileSync(path.join(targetAgents, 'references', 'custom.md'), 'user reference');

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

    // Core entries inside core folders are removed, user files survive
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'scripts', 'orchestrator_state.js')), false);
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'scripts', 'my-helper.js')), true);
    assert.strictEqual(fs.existsSync(path.join(targetAgents, 'references', 'custom.md')), true);

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
    fs.writeFileSync(path.join(tmpDir, '.github', 'copilot-instructions.md'), '<!-- Vespyr-managed — removed on uninstall. Canonical source: ./AGENTS.md -->\n');

    // Setup Windsurf workflows directory (copy method) with core skill and custom skill
    const windsurfWorkflowsDir = path.join(tmpDir, '.windsurf', 'workflows');
    fs.mkdirSync(windsurfWorkflowsDir, { recursive: true });
    fs.mkdirSync(path.join(windsurfWorkflowsDir, 'validate-idea'));
    fs.writeFileSync(path.join(windsurfWorkflowsDir, 'validate-idea', 'SKILL.md'), 'core skill');
    fs.mkdirSync(path.join(windsurfWorkflowsDir, 'my-custom-skill'));
    fs.writeFileSync(path.join(windsurfWorkflowsDir, 'my-custom-skill', 'SKILL.md'), 'user skill');
    // Vespyr-managed rules carry the marker/.agents path — safe to sweep.
    fs.writeFileSync(path.join(tmpDir, '.windsurfrules'), '<!-- Vespyr-managed -->\nlink .agents/\n');
    // User-authored rules without the marker must survive uninstall.
    fs.writeFileSync(path.join(tmpDir, '.windsurfrules.user'), 'my own rules');

    // Setup opencode and claude symlinks
    fs.symlinkSync(path.join(tmpDir, '.agents'), path.join(tmpDir, '.opencode'), 'dir');
    fs.symlinkSync(path.join(tmpDir, '.agents'), path.join(tmpDir, '.claude'), 'dir');

    // Run uninstall
    await performUninstall(tmpDir);

    // Core files deleted
    assert.strictEqual(fs.existsSync(path.join(rulesDir, 'founder.mdc')), false);
    assert.strictEqual(fs.existsSync(path.join(githubAgentsDir, 'founder.yml')), false);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.github', 'copilot-instructions.md')), false);
    assert.strictEqual(fs.existsSync(path.join(windsurfWorkflowsDir, 'validate-idea')), false);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.windsurfrules')), false);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.windsurfrules.user')), true, 'user-authored rules without marker survive');
    assert.throws(() => fs.lstatSync(path.join(tmpDir, '.opencode')), /ENOENT/);
    assert.throws(() => fs.lstatSync(path.join(tmpDir, '.claude')), /ENOENT/);

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

describe('Test 14b: uninstall preserves user-owned files', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should preserve user files inside commands/ (no source dir to compare)', async () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(path.join(agentsTarget, 'commands'), { recursive: true });
    fs.writeFileSync(path.join(agentsTarget, 'commands', 'my-command.md'), 'user command');
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));

    await performUninstall(tmpDir);

    assert.strictEqual(
      fs.readFileSync(path.join(agentsTarget, 'commands', 'my-command.md'), 'utf8'),
      'user command',
    );
  });

  it('should preserve pre-existing root docs without Vespyr markers', async () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(agentsTarget);
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# My own notes\nNothing to do with any engine.\n');
    fs.writeFileSync(path.join(tmpDir, 'agent.md'), '# Vespyr quick ref\nSee .agents/ for details.\n');

    await performUninstall(tmpDir);

    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, 'AGENTS.md'), 'utf8'),
      '# My own notes\nNothing to do with any engine.\n',
    );
    assert.strictEqual(fs.existsSync(path.join(tmpDir, 'agent.md')), false);
    const entries = fs.readdirSync(tmpDir);
    assert.ok(entries.some((f) => f.startsWith('agent.md.uninstall-bak-')), 'managed doc must be backed up');
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

  it('should preserve user commands in .agents when opencode is not selected (surgical sweep)', async () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(agentsTarget);
    fs.mkdirSync(path.join(agentsTarget, 'agents'));
    fs.mkdirSync(path.join(agentsTarget, 'commands'));
    fs.writeFileSync(path.join(agentsTarget, 'agents', 'founder.md'), 'core agent');
    fs.writeFileSync(path.join(agentsTarget, 'commands', 'my-user-command.md'), 'user command — must survive opencode deselect');
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));

    // Setup Claude Code (symlink/directory)
    const claudePath = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudePath);
    fs.writeFileSync(path.join(claudePath, '.vespyr-version'), JSON.stringify({ version: '1.7.0' }));

    // Run reconfigure with only claude (excluding opencode)
    const { performReconfigure } = require('../bin/cli.js');
    await performReconfigure(tmpDir, { harnesses: ['claude'], yes: true });

    // User-authored commands survive; only core-shipped commands are swept.
    // (No core commands ship in this repo, so the folder stays.)
    assert.strictEqual(fs.existsSync(path.join(agentsTarget, 'commands', 'my-user-command.md')), true);
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

    // Verify B1: customized file preserved as .bak-YYYYMMDD with verbatim content in .agents/.bak/
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const bakFile = path.join(agentsTarget, '.bak', `GUARDRAILS.md.bak-${today}`);
    assert.strictEqual(fs.existsSync(bakFile), true, 'customized file must be backed up in .agents/.bak');
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

describe('Test 20: Deprecated Core Files Cleanup on Update & Manifest Sync', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should include executor, reader, writer, and ml-engineer in DEPRECATED_CORE_FILES', () => {
    assert.ok(DEPRECATED_CORE_FILES.includes('agents/executor.md'));
    assert.ok(DEPRECATED_CORE_FILES.includes('agents/reader.md'));
    assert.ok(DEPRECATED_CORE_FILES.includes('agents/writer.md'));
    assert.ok(DEPRECATED_CORE_FILES.includes('agents/ml-engineer.md'));
  });

  it('should prune deprecated core agents and create backups even without a manifest', () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    const agentsDir = path.join(agentsTarget, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });

    // Seed deprecated files
    fs.writeFileSync(path.join(agentsDir, 'executor.md'), '# Old Executor');
    fs.writeFileSync(path.join(agentsDir, 'writer.md'), '# Old Writer');

    // Run removeStaleManifestFiles without any manifest.json
    removeStaleManifestFiles(tmpDir);

    // Deprecated files should be removed
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'executor.md')), false);
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'writer.md')), false);

    // Backups should have been created in .bak/agents/
    const bakAgentsDir = path.join(agentsTarget, '.bak', 'agents');
    assert.ok(fs.existsSync(bakAgentsDir), '.bak/agents directory should exist');
    const files = fs.readdirSync(bakAgentsDir);
    assert.ok(files.some(f => f.startsWith('executor.md.bak-')));
    assert.ok(files.some(f => f.startsWith('writer.md.bak-')));
  });

  it('should clean up deprecated agents during performUpdate so frontmatter validation passes', async () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    fs.mkdirSync(path.join(agentsTarget, 'agents'), { recursive: true });
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '1.6.0' }));

    // Put a deprecated agent file in target
    fs.writeFileSync(path.join(agentsTarget, 'agents', 'executor.md'), '# Broken legacy executor');
    fs.writeFileSync(path.join(agentsTarget, 'agents', 'reader.md'), '# Broken legacy reader');

    await performUpdate(tmpDir, { yes: true });

    // Stale agents must be removed
    assert.strictEqual(fs.existsSync(path.join(agentsTarget, 'agents', 'executor.md')), false);
    assert.strictEqual(fs.existsSync(path.join(agentsTarget, 'agents', 'reader.md')), false);

    // Active agents must exist
    assert.strictEqual(fs.existsSync(path.join(agentsTarget, 'agents', 'developer.md')), true);
  });
});

describe('Test 21: Forward-compatible Dynamic Agent Lifecycle & Cleanup', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('dynamically backs up and prunes retired core agents without requiring hardcoded lists', () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    const agentsDir = path.join(agentsTarget, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });

    // Simulate an agent that was shipped as core in a previous version, but is NOT in current AGENTS_SRC/agents
    // and is NOT in DEPRECATED_CORE_FILES (e.g. hypothetical retired agent 'hypothetical-old-core.md')
    const oldCoreContent = '---\nname: hypothetical-old-core\norigin: core\nversion: "1.0"\n---\n# Old Core\n';
    fs.writeFileSync(path.join(agentsDir, 'hypothetical-old-core.md'), oldCoreContent);

    // Also place a user custom agent (origin: custom)
    const customContent = '---\nname: my-special-agent\norigin: custom\nversion: "1.0"\n---\n# Special Agent\n';
    fs.writeFileSync(path.join(agentsDir, 'my-special-agent.md'), customContent);

    // Also place a plain user notes file (no frontmatter / no origin: core)
    fs.writeFileSync(path.join(agentsDir, 'notes.md'), '# Just some user notes\n');

    // Run cleanup
    cleanupDeprecatedCoreFiles(tmpDir);

    // Retired core agent must be removed from agents/
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'hypothetical-old-core.md')), false);

    // Retired core agent must be backed up in .bak/agents/
    const bakAgentsDir = path.join(agentsTarget, '.bak', 'agents');
    assert.ok(fs.existsSync(bakAgentsDir));
    const bakFiles = fs.readdirSync(bakAgentsDir);
    assert.ok(bakFiles.some(f => f.startsWith('hypothetical-old-core.md.bak-')));

    // User custom agent and plain user files MUST be preserved
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'my-special-agent.md')), true);
    assert.strictEqual(fs.readFileSync(path.join(agentsDir, 'my-special-agent.md'), 'utf8'), customContent);
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'notes.md')), true);
  });

  it('update workflow dynamically handles future renamed or removed core agents', async () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    const agentsDir = path.join(agentsTarget, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsTarget, '.vespyr-version'), JSON.stringify({ version: '2.0.0' }));

    // Retired core agent not in AGENTS_SRC
    fs.writeFileSync(path.join(agentsDir, 'future-retired-agent.md'), '---\nname: future-retired-agent\norigin: core\n---\n# Retired\n');
    // User custom agent
    fs.writeFileSync(path.join(agentsDir, 'custom-helper.md'), '---\nname: custom-helper\norigin: custom\n---\n# Helper\n');

    await performUpdate(tmpDir, { yes: true });

    // Retired agent was pruned
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'future-retired-agent.md')), false);
    // User custom agent preserved
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'custom-helper.md')), true);
    // Shipped core agents installed
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'developer.md')), true);
  });

  it('surgically cleans up retired core agents on uninstall without leaving empty-blocking residue', () => {
    const agentsTarget = path.join(tmpDir, '.agents');
    const agentsDir = path.join(agentsTarget, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });

    // Add current core agent, retired core agent, and custom agent
    fs.writeFileSync(path.join(agentsDir, 'developer.md'), '---\nname: developer\norigin: core\n---\n# Developer\n');
    fs.writeFileSync(path.join(agentsDir, 'old-retired.md'), '---\nname: old-retired\norigin: core\n---\n# Old Retired\n');
    fs.writeFileSync(path.join(agentsDir, 'my-custom.md'), '---\nname: my-custom\norigin: custom\n---\n# Custom\n');

    surgicallyCleanupAgentsDir(agentsTarget);

    // Current and retired core agents deleted
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'developer.md')), false);
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'old-retired.md')), false);
    // Custom agent preserved
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'my-custom.md')), true);
  });
});



