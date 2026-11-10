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

function listBackupsRelative(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).split(path.sep).join('/');
      // A backup entry is reported as itself, never descended into: a backed-up
      // directory (skills) keeps its own name, e.g. skills.backup.<ts>.
      if (entry.name.includes('.backup.')) {
        out.push(rel);
        continue;
      }
      if (entry.isDirectory()) walk(full);
    }
  };
  walk(root);
  return out.sort();
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

describe('Kiro custom agents (.kiro/agents emission)', () => {
  let tmpDir;

  function writePersona(name, body, { write = 'true', edit = 'allow' } = {}) {
    const dir = path.join(tmpDir, '.agents', 'agents');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${name}.md`),
      `---\nname: ${name}\ndescription: Persona ${name}\ntools:\n  write: ${write}\npermission:\n  bash: allow\n  edit: ${edit}\n  read: allow\n---\n\n${body}\n`
    );
  }

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', '.keep'), '');
    fs.mkdirSync(path.join(tmpDir, '.agents', 'templates', 'system'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.agents', 'templates', 'system', 'vespyr-steering.md.canonical'),
      '# steering'
    );
    writePersona('founder', '# @founder\nSee [GUARDRAILS.md](../GUARDRAILS.md).');
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('emits a Kiro-shaped markdown agent per persona, not a symlink', () => {
    getAdapter('kiro').install(silentCtx(tmpDir));

    const emitted = path.join(tmpDir, '.kiro', 'agents', 'founder.md');
    assert.ok(fs.existsSync(emitted), '.kiro/agents/founder.md must exist');
    assert.strictEqual(fs.lstatSync(emitted).isSymbolicLink(), false, 'generated agent must be a real file');

    const content = fs.readFileSync(emitted, 'utf8');
    assert.match(content, /^---\n/);
    assert.match(content, /\nname: founder\n/);
    assert.match(content, /\ntools: \["\*"\]\n/, 'tools must be an array, not a map');
    assert.strictEqual(content.includes('\npermission:\n'), false, 'Vespyr singular permission block must not leak');
    assert.match(content, /# vespyr-generated/, 'generated marker missing');
    assert.ok(content.includes('# @founder'), 'persona body must be carried over');
    assert.ok(
      content.includes('[GUARDRAILS.md](.agents/GUARDRAILS.md)'),
      'persona-relative links must be rewritten to workspace paths'
    );
  });

  it('translates edit: deny / write: false into a Kiro fs_write deny rule', () => {
    writePersona('security-engineer', '# @security-engineer', { write: 'false', edit: 'deny' });

    getAdapter('kiro').install(silentCtx(tmpDir));

    const content = fs.readFileSync(path.join(tmpDir, '.kiro', 'agents', 'security-engineer.md'), 'utf8');
    assert.match(content, /permissions:\n {2}rules:\n {4}- capability: fs_write\n {6}effect: deny\n/);
  });

  it('is idempotent across reinstalls', () => {
    const ctx = silentCtx(tmpDir);
    getAdapter('kiro').install(ctx);
    const first = fs.readFileSync(path.join(tmpDir, '.kiro', 'agents', 'founder.md'), 'utf8');

    getAdapter('kiro').install(ctx);
    const second = fs.readFileSync(path.join(tmpDir, '.kiro', 'agents', 'founder.md'), 'utf8');

    assert.strictEqual(second, first, 'reinstall must not churn generated content');
  });

  it('never overwrites a hand-written Kiro agent that shares a persona name', () => {
    const agentsDir = path.join(tmpDir, '.kiro', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    const userFile = path.join(agentsDir, 'founder.md');
    fs.writeFileSync(userFile, '---\nname: founder\n---\nmy own prompt\n');

    getAdapter('kiro').install(silentCtx(tmpDir));

    assert.strictEqual(fs.readFileSync(userFile, 'utf8'), '---\nname: founder\n---\nmy own prompt\n');
  });

  it('replaces a pre-existing symlinked .kiro/agents without writing through it', {
    skip: process.platform === 'win32',
  }, () => {
    const sourceDir = path.join(tmpDir, '.agents', 'agents');
    const sourceBefore = fs.readFileSync(path.join(sourceDir, 'founder.md'), 'utf8');
    fs.mkdirSync(path.join(tmpDir, '.kiro'), { recursive: true });
    const linkPath = path.join(tmpDir, '.kiro', 'agents');
    fs.symlinkSync(path.join(sourceDir), linkPath, 'dir');

    getAdapter('kiro').install(silentCtx(tmpDir));

    assert.strictEqual(fs.lstatSync(linkPath).isSymbolicLink(), false, 'legacy symlink must be removed');
    assert.strictEqual(
      fs.readFileSync(path.join(sourceDir, 'founder.md'), 'utf8'),
      sourceBefore,
      'source personas must never be rewritten through the link'
    );
    assert.ok(fs.existsSync(path.join(linkPath, 'founder.md')));
  });

  it('uninstall removes generated agents but keeps hand-written ones', () => {
    getAdapter('kiro').install(silentCtx(tmpDir));
    const agentsDir = path.join(tmpDir, '.kiro', 'agents');
    fs.writeFileSync(path.join(agentsDir, 'mine.md'), '---\nname: mine\n---\nmine\n');

    getAdapter('kiro').uninstall({
      targetDir: tmpDir,
      isGlobal: false,
      agentsSrc: path.join(tmpDir, '.agents'),
      removeDirIfEmpty: (d) => {
        try {
          if (fs.readdirSync(d).length === 0) fs.rmdirSync(d);
        } catch (e) {}
      },
    });

    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'founder.md')), false);
    assert.strictEqual(fs.existsSync(path.join(agentsDir, 'mine.md')), true);
  });
});

describe('Kiro conflict backups land in .kiro/.bak', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills', 'demo'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', 'demo', 'SKILL.md'), '# demo');
    fs.mkdirSync(path.join(tmpDir, '.agents', 'templates', 'system'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.agents', 'templates', 'system', 'vespyr-steering.md.canonical'),
      '# canonical steering\n'
    );
    fs.writeFileSync(
      path.join(tmpDir, '.agents', 'agents', 'founder.md'),
      '---\nname: founder\ndescription: d\n---\nbody\n'
    );
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  function backupsIn(dir) {
    try {
      return fs.readdirSync(dir).filter((f) => f.includes('.backup.'));
    } catch {
      return [];
    }
  }

  it('moves pre-existing skills and steering files out of the scanned tree', () => {
    const kiroDir = path.join(tmpDir, '.kiro');
    fs.mkdirSync(path.join(kiroDir, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(kiroDir, 'skills', 'mine.txt'), 'keep me');
    fs.mkdirSync(path.join(kiroDir, 'steering'), { recursive: true });
    fs.writeFileSync(
      path.join(kiroDir, 'steering', 'vespyr-steering.md'),
      '# a steering doc I wrote myself\n'
    );

    getAdapter('kiro').install(silentCtx(tmpDir));

    const bakDir = path.join(kiroDir, '.bak');
    const backups = listBackupsRelative(bakDir);
    assert.ok(
      backups.some((f) => /^skills\.backup\.\d+$/.test(f)),
      `skills backup missing from .kiro/.bak (found: ${backups.join(', ')})`
    );
    assert.ok(
      backups.some((f) => /^steering\/vespyr-steering\.md\.backup\.\d+$/.test(f)),
      `steering backup must mirror its path under .bak (found: ${backups.join(', ')})`
    );

    assert.deepStrictEqual(backupsIn(kiroDir), [], 'no backup may sit loose in .kiro/');
    assert.deepStrictEqual(
      backupsIn(path.join(kiroDir, 'steering')),
      [],
      'no backup may sit in .kiro/steering/ where Kiro scans'
    );
    assert.deepStrictEqual(
      backupsIn(path.join(kiroDir, 'agents')),
      [],
      'no backup may sit in .kiro/agents/ where Kiro scans'
    );
  });

  it('does not back up its own steering output', () => {
    fs.mkdirSync(path.join(tmpDir, '.kiro', 'steering'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.kiro', 'steering', 'vespyr-steering.md'),
      '# canonical steering\n'
    );

    getAdapter('kiro').install(silentCtx(tmpDir));

    assert.strictEqual(
      fs.existsSync(path.join(tmpDir, '.kiro', '.bak')),
      false,
      'identical Vespyr output must be replaced, not backed up'
    );
    assert.strictEqual(
      fs.lstatSync(path.join(tmpDir, '.kiro', 'steering', 'vespyr-steering.md')).isSymbolicLink(),
      true,
      'steering must end up as the adapter-managed link'
    );
  });
});

describe('Kiro legacy backup migration', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', '.keep'), '');
    fs.writeFileSync(
      path.join(tmpDir, '.agents', 'agents', 'founder.md'),
      '---\nname: founder\ndescription: d\n---\nbody\n'
    );
    fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# agents\n');
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('moves pre-upgrade .backup. litter into .kiro/.bak', () => {
    const kiroDir = path.join(tmpDir, '.kiro');
    fs.mkdirSync(path.join(kiroDir, 'steering'), { recursive: true });
    fs.writeFileSync(path.join(kiroDir, 'vespyr-steering.md.backup.1700000000000'), 'old');
    fs.writeFileSync(
      path.join(kiroDir, 'steering', 'vespyr-steering.md.backup.1700000000001'),
      'older'
    );

    getAdapter('kiro').install(silentCtx(tmpDir));

    const bak = listBackupsRelative(path.join(kiroDir, '.bak'));
    assert.deepStrictEqual(bak, [
      'steering/vespyr-steering.md.backup.1700000000001',
      'vespyr-steering.md.backup.1700000000000',
    ]);
    assert.strictEqual(fs.existsSync(path.join(kiroDir, 'vespyr-steering.md.backup.1700000000000')), false);
    assert.strictEqual(
      fs.existsSync(path.join(kiroDir, 'steering', 'vespyr-steering.md.backup.1700000000001')),
      false
    );
  });

  it('migration is idempotent and skips name collisions', () => {
    const kiroDir = path.join(tmpDir, '.kiro');
    fs.mkdirSync(path.join(kiroDir, '.bak'), { recursive: true });
    fs.writeFileSync(path.join(kiroDir, '.bak', 'vespyr-steering.md.backup.1700000000002'), 'first');
    fs.writeFileSync(path.join(kiroDir, 'vespyr-steering.md.backup.1700000000002'), 'second');

    getAdapter('kiro').install(silentCtx(tmpDir));

    const bak = fs.readdirSync(path.join(kiroDir, '.bak')).sort();
    assert.deepStrictEqual(bak, [
      'vespyr-steering.md.backup.1700000000002',
      'vespyr-steering.md.backup.1700000000002-1',
    ]);
    assert.strictEqual(fs.readFileSync(path.join(kiroDir, '.bak', bak[0]), 'utf8'), 'first');
    assert.strictEqual(fs.readFileSync(path.join(kiroDir, '.bak', bak[1]), 'utf8'), 'second');
  });
});

describe('Kiro generated-agent replacement safety', () => {
  let tmpDir;

  function personaPath() {
    return path.join(tmpDir, '.agents', 'agents', 'founder.md');
  }

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', '.keep'), '');
    fs.writeFileSync(
      personaPath(),
      '---\nname: founder\ndescription: first\n---\nfirst body\n'
    );
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('replaces its own stale output without a backup when the persona changes', () => {
    getAdapter('kiro').install(silentCtx(tmpDir));

    fs.writeFileSync(
      personaPath(),
      '---\nname: founder\ndescription: second\n---\nsecond body\n'
    );
    getAdapter('kiro').install(silentCtx(tmpDir));

    const generated = fs.readFileSync(path.join(tmpDir, '.kiro', 'agents', 'founder.md'), 'utf8');
    assert.ok(generated.includes('second body'), 'regenerated body missing');
    assert.strictEqual(
      fs.existsSync(path.join(tmpDir, '.kiro', '.bak')),
      false,
      'untouched generated output must not produce a backup on persona updates'
    );
  });

  it('backs up a generated agent that was edited by hand before overwriting it', () => {
    getAdapter('kiro').install(silentCtx(tmpDir));
    const generatedPath = path.join(tmpDir, '.kiro', 'agents', 'founder.md');
    fs.appendFileSync(generatedPath, '\nmy local edit\n');

    getAdapter('kiro').install(silentCtx(tmpDir));

    const bakDir = path.join(tmpDir, '.kiro', '.bak');
    const backups = listBackupsRelative(bakDir).filter((f) =>
      f.startsWith('agents/founder.md.backup.')
    );
    assert.strictEqual(backups.length, 1, 'edited generated agent must be backed up once');
    assert.ok(
      fs.readFileSync(path.join(bakDir, backups[0]), 'utf8').includes('my local edit'),
      'backup must contain the edited content'
    );
    assert.strictEqual(
      fs.readFileSync(generatedPath, 'utf8').includes('my local edit'),
      false,
      'regenerated file must be clean output'
    );
  });

  it('leaves a hand-written agent untouched and never backs it up', () => {
    const agentsDir = path.join(tmpDir, '.kiro', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    const userFile = path.join(agentsDir, 'founder.md');
    fs.writeFileSync(userFile, '---\nname: founder\n---\nmine\n');

    getAdapter('kiro').install(silentCtx(tmpDir));

    assert.strictEqual(fs.readFileSync(userFile, 'utf8'), '---\nname: founder\n---\nmine\n');
    assert.strictEqual(fs.existsSync(path.join(tmpDir, '.kiro', '.bak')), false);
  });
});
