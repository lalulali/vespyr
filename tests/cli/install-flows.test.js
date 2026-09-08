const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Installer flow smoothness: uninstall / reconfigure / repair dispatch across
// all five states (fresh, installed, repair, foreign, migrate).
const CLI = path.join(__dirname, '..', '..', 'bin', 'cli.js');

function runCli(args, targetDir) {
  try {
    const out = execFileSync(process.execPath, [CLI, ...args, '--target', targetDir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout: out, stderr: '' };
  } catch (e) {
    return {
      status: e.status,
      stdout: e.stdout ? e.stdout.toString() : '',
      stderr: e.stderr ? e.stderr.toString() : '',
    };
  }
}

describe('Installer flows: uninstall / reconfigure / repair smoothness', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-flows-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('uninstall --yes on a fresh dir is a no-op exit 0', () => {
    const r = runCli(['uninstall', '--yes'], tmpDir);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('Nothing to uninstall'));
  });

  it('uninstall --yes on a foreign dir exits 2 and preserves content', () => {
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agents', 'skills', 'keep.md'), 'foreign content');

    const r = runCli(['uninstall', '--yes'], tmpDir);
    assert.strictEqual(r.status, 2, r.stderr);
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, '.agents', 'skills', 'keep.md'), 'utf8'),
      'foreign content',
    );
  });

  it('reconfigure --yes on a fresh dir exits 2', () => {
    const r = runCli(['reconfigure', '--yes'], tmpDir);
    assert.strictEqual(r.status, 2, r.stderr);
  });

  it('reconfigure --yes keeps harnesses when --harness is omitted', () => {
    const init = runCli(['init', '--yes', '--harness', 'opencode,claude'], tmpDir);
    assert.strictEqual(init.status, 0, init.stderr);
    assert.ok(fs.existsSync(path.join(tmpDir, '.opencode')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude')));

    const r = runCli(['reconfigure', '--yes'], tmpDir);
    assert.strictEqual(r.status, 0, r.stderr + r.stdout);
    assert.ok(fs.existsSync(path.join(tmpDir, '.opencode')), 'opencode must survive');
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude')), 'claude must survive');
  });

  it('full cycle: init --yes then uninstall --yes removes core, preserves custom', () => {
    const init = runCli(['init', '--yes', '--harness', 'opencode'], tmpDir);
    assert.strictEqual(init.status, 0, init.stderr);
    fs.writeFileSync(path.join(tmpDir, '.agents', 'my-keep.md'), 'custom');

    const r = runCli(['uninstall', '--yes'], tmpDir);
    assert.strictEqual(r.status, 0, r.stderr + r.stdout);
    assert.ok(!fs.existsSync(path.join(tmpDir, '.opencode')), 'harness link removed');
    assert.ok(!fs.existsSync(path.join(tmpDir, '.agents', 'GUARDRAILS.md')), 'core file removed');
    assert.strictEqual(
      fs.readFileSync(path.join(tmpDir, '.agents', 'my-keep.md'), 'utf8'),
      'custom',
    );
    assert.ok(fs.existsSync(path.join(tmpDir, 'artifacts')), 'artifacts preserved');
  });

  it('repair state auto-heals on a bare run', () => {
    fs.mkdirSync(path.join(tmpDir, '.agents'));
    fs.writeFileSync(path.join(tmpDir, '.agents', 'GUARDRAILS.md'), 'partial install');

    const r = runCli(['--yes'], tmpDir);
    assert.strictEqual(r.status, 0, r.stderr + r.stdout);
    const version = JSON.parse(fs.readFileSync(path.join(tmpDir, '.agents', '.vespyr-version'), 'utf8'));
    assert.ok(version.version, 'version marker rewritten');
  });
});
