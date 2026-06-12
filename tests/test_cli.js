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

describe('Test 2: transpileCopilotYAML()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should transpile a single agent to YAML', () => {
    const agentsDir = path.join(tmpDir, 'agents');
    const outputDir = path.join(tmpDir, 'output');
    fs.mkdirSync(agentsDir);
    fs.writeFileSync(path.join(agentsDir, 'founder.md'), '---\ndescription: "Validates ideas"\n---\n# Founder Body');

    transpileCopilotYAML(agentsDir, outputDir);

    const yml = fs.readFileSync(path.join(outputDir, 'founder.yml'), 'utf8');
    assert.ok(yml.includes('name: founder'));
    assert.ok(yml.includes('description: "Validates ideas"'));
    assert.ok(yml.includes('instructions: |'));
    assert.ok(yml.includes('  # Founder Body'));
  });

  it('should transpile 21 agents', () => {
    const agentsDir = path.join(tmpDir, 'agents');
    const outputDir = path.join(tmpDir, 'output');
    fs.mkdirSync(agentsDir);

    for (let i = 0; i < 21; i++) {
      fs.writeFileSync(path.join(agentsDir, `agent${i}.md`), `---\ndescription: "Agent ${i}"\n---\nBody ${i}`);
    }

    transpileCopilotYAML(agentsDir, outputDir);

    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.yml'));
    assert.strictEqual(files.length, 21);
  });

  it('should handle agent with no description', () => {
    const agentsDir = path.join(tmpDir, 'agents');
    const outputDir = path.join(tmpDir, 'output');
    fs.mkdirSync(agentsDir);
    fs.writeFileSync(path.join(agentsDir, 'agent.md'), '---\nname: test\n---\nBody');

    transpileCopilotYAML(agentsDir, outputDir);

    const yml = fs.readFileSync(path.join(outputDir, 'agent.yml'), 'utf8');
    assert.ok(yml.includes('description: ""'));
  });

  it('should escape quotes in description', () => {
    const agentsDir = path.join(tmpDir, 'agents');
    const outputDir = path.join(tmpDir, 'output');
    fs.mkdirSync(agentsDir);
    fs.writeFileSync(path.join(agentsDir, 'agent.md'), '---\ndescription: She said "hello"\n---\nBody');

    transpileCopilotYAML(agentsDir, outputDir);

    const yml = fs.readFileSync(path.join(outputDir, 'agent.yml'), 'utf8');
    assert.ok(yml.includes('description: "She said \\"hello\\""'));
  });
});

describe('Test 3: transpileCursorMDC()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanTempDir(tmpDir);
  });

  it('should transpile a single agent to MDC', () => {
    const agentsDir = path.join(tmpDir, 'agents');
    const outputDir = path.join(tmpDir, 'output');
    fs.mkdirSync(agentsDir);
    fs.writeFileSync(path.join(agentsDir, 'founder.md'), '---\ndescription: "Validates ideas"\n---\n# Founder Body');

    transpileCursorMDC(agentsDir, outputDir);

    const mdc = fs.readFileSync(path.join(outputDir, 'founder.mdc'), 'utf8');
    assert.ok(mdc.includes('---'));
    assert.ok(mdc.includes('description: "Validates ideas"'));
    assert.ok(mdc.includes('globs: "*"'));
    assert.ok(mdc.includes('alwaysApply: false'));
    assert.ok(mdc.includes('# Founder Body'));
  });

  it('should transpile 21 agents', () => {
    const agentsDir = path.join(tmpDir, 'agents');
    const outputDir = path.join(tmpDir, 'output');
    fs.mkdirSync(agentsDir);

    for (let i = 0; i < 21; i++) {
      fs.writeFileSync(path.join(agentsDir, `agent${i}.md`), `---\ndescription: "Agent ${i}"\n---\nBody ${i}`);
    }

    transpileCursorMDC(agentsDir, outputDir);

    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.mdc'));
    assert.strictEqual(files.length, 21);
  });

  it('should skip missing source files', () => {
    const agentsDir = path.join(tmpDir, 'agents');
    const outputDir = path.join(tmpDir, 'output');
    fs.mkdirSync(agentsDir);

    transpileCursorMDC(agentsDir, outputDir);

    assert.ok(!fs.existsSync(path.join(outputDir, '404.mdc')));
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

  it('should create directory symlink on macOS/Linux', () => {
    if (process.platform === 'win32') return;

    const source = path.join(tmpDir, 'source');
    const link = path.join(tmpDir, 'link');
    fs.mkdirSync(source);

    createLinkOrCopy(source, link, 'dir', 'symlink');

    const stat = fs.lstatSync(link);
    assert.ok(stat.isSymbolicLink());
    assert.strictEqual(fs.readlinkSync(link), source);
  });

  it('should create file symlink on macOS/Linux', () => {
    if (process.platform === 'win32') return;

    const source = path.join(tmpDir, 'source.txt');
    const link = path.join(tmpDir, 'link.txt');
    fs.writeFileSync(source, 'hello');

    createLinkOrCopy(source, link, 'file', 'symlink');

    const stat = fs.lstatSync(link);
    assert.ok(stat.isSymbolicLink());
  });

  it('should skip if symlink already exists with same target', () => {
    if (process.platform === 'win32') return;

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
    assert.strictEqual(detectState(tmpDir), 'installed');
  });

  it('should detect migration needed', () => {
    fs.mkdirSync(path.join(tmpDir, '.opencode'));
    assert.strictEqual(detectState(tmpDir), 'migrate');
  });

  it('should prioritize installed over migrate', () => {
    fs.mkdirSync(path.join(tmpDir, '.opencode'));
    fs.mkdirSync(path.join(tmpDir, '.agents'));
    assert.strictEqual(detectState(tmpDir), 'installed');
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

    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'output', '00-discovery')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'output', '01-research')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'memory')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'telemetry')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'directions')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'input', 'data')));
  });

  it('should write project-context.md with project name', () => {
    scaffoldArtifacts(tmpDir, 'test-project');

    const ctx = fs.readFileSync(path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'), 'utf8');
    assert.ok(ctx.includes('Project Name**: test-project'));
    assert.ok(ctx.includes('Stack**: None (Starting from scratch)'));
    assert.ok(ctx.includes('Squad**: full-team'));
    assert.ok(ctx.includes('Operation Mode**: semi-autonomous'));
  });

  it('should not overwrite existing artifacts', () => {
    fs.mkdirSync(path.join(tmpDir, 'artifacts'));
    fs.writeFileSync(path.join(tmpDir, 'artifacts', 'existing.txt'), 'keep');

    scaffoldArtifacts(tmpDir, 'test-project');

    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts', 'existing.txt')));
  });

  it('should create per-agent pending-questions subdirectories', () => {
    scaffoldArtifacts(tmpDir, 'test-project');

    const pendingDir = path.join(tmpDir, 'artifacts', 'memory', 'pending-questions');
    assert.ok(fs.existsSync(pendingDir));
    const dirs = fs.readdirSync(pendingDir);
    assert.strictEqual(dirs.length, 21);
  });

  it('should seed 5 memory markdown files', () => {
    scaffoldArtifacts(tmpDir, 'test-project');

    const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
    assert.ok(fs.existsSync(path.join(memoryDir, 'project-context.md')));
    assert.ok(fs.existsSync(path.join(memoryDir, 'active-decisions.md')));
    assert.ok(fs.existsSync(path.join(memoryDir, 'patterns-and-conventions.md')));
    assert.ok(fs.existsSync(path.join(memoryDir, 'lessons-learned.md')));
    assert.ok(fs.existsSync(path.join(memoryDir, 'blockers-and-risks.md')));
  });
});

describe('Test 8: bootstrapRootDocs()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, '.agents', 'commands'), { recursive: true });

    fs.writeFileSync(path.join(tmpDir, '.agents', 'commands', 'scaffold-agents.md'),
      '# {Project Name} — Vespyr\n\nPath: .agents/agents/\n');
    fs.writeFileSync(path.join(tmpDir, '.agents', 'commands', 'scaffold-agent.md'),
      '# Vespyr\n\nPath: .agents/agents/\n');
    fs.writeFileSync(path.join(tmpDir, '.agents', 'commands', 'scaffold-claude.md'),
      '# CLAUDE.md — Vespyr\n\nPath: .claude/agents/\n');
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
    assert.ok(lines[0].startsWith('  __  __'));
    assert.strictEqual(lines[0].indexOf('__'), 2);
  });

  it('should have correct leading spaces on line 8', () => {
    const lines = ASCII_ART.split('\n');
    const line8 = lines[7];
    const match = line8.match(/^( *)\\ \\_\\/);
    assert.ok(match, `Line 8 should start with spaces before \\ \\_\\, got: "${line8}"`);
    assert.strictEqual(match[1].length, 29);
  });

  it('should have correct leading spaces on line 9', () => {
    const lines = ASCII_ART.split('\n');
    const line9 = lines[8];
    const match = line9.match(/^( *)\\\/_\//);
    assert.ok(match, `Line 9 should start with spaces before \\/_\\/, got: "${line9}"`);
    assert.strictEqual(match[1].length, 30);
  });

  it('should contain no tab characters', () => {
    assert.ok(!ASCII_ART.includes('\t'));
  });
});

describe('Test 10: parseFlags()', () => {
  it('should handle no flags', () => {
    const result = parseFlags(['node', 'cli.js']);
    assert.deepStrictEqual(result, {
      dryRun: false, yes: false, target: null, harnesses: [], version: false, help: false,
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

  it('should handle combined flags', () => {
    const result = parseFlags(['node', 'cli.js', '--dry-run', '--yes', '--target', './here']);
    assert.strictEqual(result.dryRun, true);
    assert.strictEqual(result.yes, true);
    assert.strictEqual(result.target, './here');
  });
});
