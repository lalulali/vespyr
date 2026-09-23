const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { ADAPTERS, REGISTRY, HARNESS_OPTIONS, getAdapter } = require('../bin/lib/harnesses/index.js');
const { handleConflict, createLinkOrCopy } = require('../bin/lib/link-utils.js');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-harness-'));
}

function cleanTempDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function silentCtx(targetDir, extra = {}) {
  return {
    targetDir,
    agentsTarget: path.join(targetDir, '.agents'),
    method: 'symlink',
    dryRun: false,
    log: () => {},
    logDry: () => {},
    logWarn: () => {},
    handleConflict,
    createLinkOrCopy,
    ...extra,
  };
}

describe('Harness registry: Codex is intentionally NOT an adapter', () => {
  // Current Codex natively reads root AGENTS.md
  // and $REPO_ROOT/.agents/skills; `.codex/` is legacy. Zero emission required
  // => nothing to install => no selectable option. See bin/lib/harnesses/index.js.
  it('codex must not appear as a harness option or registry entry', () => {
    assert.strictEqual(getAdapter('codex'), null, 'codex adapter must not exist');
    assert.strictEqual(
      HARNESS_OPTIONS.some((o) => o.id === 'codex'),
      false,
      'codex must not be selectable in the wizard'
    );
  });
});

describe('GitHub Copilot GENERATE-TARGET (.github emission)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', '.keep'), '');
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('emits .github/copilot-instructions.md and links .github/skills -> .agents/skills', () => {
    const github = getAdapter('github');
    github.install(silentCtx(tmpDir));

    const instructionsPath = path.join(tmpDir, '.github', 'copilot-instructions.md');
    assert.strictEqual(fs.existsSync(instructionsPath), true);
    const content = fs.readFileSync(instructionsPath, 'utf8');
    assert.ok(content.includes('AGENTS.md'), 'stub must point at root AGENTS.md');

    const skillsPath = path.join(tmpDir, '.github', 'skills');
    const stat = fs.lstatSync(skillsPath);
    assert.strictEqual(stat.isSymbolicLink(), true, '.github/skills must be a symlink');
    assert.strictEqual(
      fs.realpathSync(skillsPath),
      fs.realpathSync(path.join(tmpDir, '.agents', 'skills'))
    );
  });

  it('does not clobber a pre-existing copilot-instructions.md', () => {
    const github = getAdapter('github');
    const instructionsPath = path.join(tmpDir, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(instructionsPath), { recursive: true });
    fs.writeFileSync(instructionsPath, 'my own instructions');

    github.install(silentCtx(tmpDir));

    assert.strictEqual(fs.readFileSync(instructionsPath, 'utf8'), 'my own instructions');
  });

  it('uninstall removes generated artifacts but preserves user-authored skills', () => {
    const github = getAdapter('github');
    github.install(silentCtx(tmpDir));

    // User drops a real (non-symlink) skill into .github/skills
    const userSkill = path.join(tmpDir, '.github', 'skills', 'my-own-skill');
    fs.rmSync(path.join(tmpDir, '.github', 'skills'), { recursive: true, force: true });
    fs.mkdirSync(userSkill, { recursive: true });
    fs.writeFileSync(path.join(userSkill, 'SKILL.md'), 'user skill');
    // Re-link is not needed; uninstall must keep the real dir intact
    fs.writeFileSync(path.join(tmpDir, '.github', 'copilot-instructions.md'), '<!-- Vespyr-managed -->\n');

    github.uninstall({
      targetDir: tmpDir,
      isGlobal: false,
      agentsSrc: path.join(tmpDir, '.agents'),
      removeDirIfEmpty: (d) => {
        try {
          if (fs.readdirSync(d).length === 0) fs.rmdirSync(d);
        } catch (e) {}
      },
    });

    assert.strictEqual(fs.existsSync(userSkill), true, 'user-authored skills survive uninstall');
    assert.strictEqual(
      fs.existsSync(path.join(tmpDir, '.github', 'copilot-instructions.md')),
      false,
      'generated stub is removed'
    );
  });

  it('uninstall preserves a pre-existing copilot-instructions.md without the Vespyr marker', () => {
    const github = getAdapter('github');
    github.install(silentCtx(tmpDir));

    const instructionsPath = path.join(tmpDir, '.github', 'copilot-instructions.md');
    fs.writeFileSync(instructionsPath, 'my own instructions');

    github.uninstall({
      targetDir: tmpDir,
      isGlobal: false,
      agentsSrc: path.join(tmpDir, '.agents'),
      removeDirIfEmpty: (d) => {
        try {
          if (fs.readdirSync(d).length === 0) fs.rmdirSync(d);
        } catch (e) {}
      },
    });

    assert.strictEqual(fs.readFileSync(instructionsPath, 'utf8'), 'my own instructions');
  });

  it('uninstall removes a dangling skills link (performUninstall cleans .agents/ first)', () => {
    const github = getAdapter('github');
    github.install(silentCtx(tmpDir));

    // Simulate performUninstall ordering: .agents/ cleaned before harness sweep,
    // leaving .github/skills dangling.
    fs.rmSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true, force: true });
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.github', 'skills')), false,
      'precondition: link must be dangling for this test');

    github.uninstall({
      targetDir: tmpDir,
      isGlobal: false,
      agentsSrc: path.join(tmpDir, '.agents'),
      removeDirIfEmpty: (d) => {
        try {
          if (fs.readdirSync(d).length === 0) fs.rmdirSync(d);
        } catch (e) {}
      },
    });

    assert.strictEqual(
      fs.existsSync(path.join(tmpDir, '.github')),
      false,
      'dangling link must be swept so .github can be removed'
    );
  });
});

describe('Registry hygiene', () => {
  it('every registered adapter exposes detectPaths; active adapters also install', () => {
    for (const [id, adapter] of Object.entries(REGISTRY)) {
      assert.strictEqual(typeof adapter.detectPaths, 'function', `${id}.detectPaths`);
    }
    for (const adapter of ADAPTERS) {
      assert.strictEqual(typeof adapter.install, 'function', `${adapter.id}.install`);
    }
  });
});

describe('Dangling symlink removal on uninstall across harnesses', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', '.keep'), '');
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('opencode uninstall unlinks .opencode when link is dangling', () => {
    const opencode = getAdapter('opencode');
    opencode.install(silentCtx(tmpDir));

    // Remove target .agents to make .opencode a dangling symlink
    fs.rmSync(path.join(tmpDir, '.agents'), { recursive: true, force: true });
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.opencode')), false);
    assert.strictEqual(fs.lstatSync(path.join(tmpDir, '.opencode')).isSymbolicLink(), true);

    opencode.uninstall({
      targetDir: tmpDir,
      isGlobal: false,
      surgicallyCleanupAgentsDir: () => {},
    });

    assert.throws(
      () => fs.lstatSync(path.join(tmpDir, '.opencode')),
      /ENOENT/,
      '.opencode dangling symlink must be unlinked'
    );
  });

  it('claude uninstall unlinks .claude when link is dangling', () => {
    const claude = getAdapter('claude');
    claude.install(silentCtx(tmpDir));

    // Remove target .agents to make .claude a dangling symlink
    fs.rmSync(path.join(tmpDir, '.agents'), { recursive: true, force: true });
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.claude')), false);
    assert.strictEqual(fs.lstatSync(path.join(tmpDir, '.claude')).isSymbolicLink(), true);

    claude.uninstall({
      targetDir: tmpDir,
      isGlobal: false,
      surgicallyCleanupAgentsDir: () => {},
    });

    assert.throws(
      () => fs.lstatSync(path.join(tmpDir, '.claude')),
      /ENOENT/,
      '.claude dangling symlink must be unlinked'
    );
  });

  it('kiro uninstall unlinks .kiro/skills when link is dangling', () => {
    const kiro = getAdapter('kiro');
    kiro.install(silentCtx(tmpDir));

    // Remove target .agents/skills to make .kiro/skills dangling
    fs.rmSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true, force: true });
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.kiro', 'skills')), false);
    assert.strictEqual(fs.lstatSync(path.join(tmpDir, '.kiro', 'skills')).isSymbolicLink(), true);

    kiro.uninstall({
      targetDir: tmpDir,
      isGlobal: false,
      agentsSrc: path.join(tmpDir, '.agents'),
      removeDirIfEmpty: (d) => {
        try {
          if (fs.readdirSync(d).length === 0) fs.rmdirSync(d);
        } catch (e) {}
      },
    });

    assert.throws(
      () => fs.lstatSync(path.join(tmpDir, '.kiro', 'skills')),
      /ENOENT/,
      '.kiro/skills dangling symlink must be unlinked'
    );
  });
});
