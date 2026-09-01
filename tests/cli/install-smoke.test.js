const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Install smoke (round-table 2026-08-31, Grant): the repo-relative
// require() asserts in packaging.test.js prove nothing about the shipped
// file set. Real-tarball failure classes caught ONLY here:
//   (a) files-array/.npmignore omission -> missing file at first require
//   (b) wrong bin path relative to package root
//   (c) missing security-scan.js / audit-spec.json (vespyr audit FAULT-1)
//   (d) engines/node mismatch surfaced at install
//   (e) post-install .agents/ content (state/ leakage, corpus, fixtures)
// Env-gated (RUN_INSTALL_SMOKE=1): packaging file selection is
// platform-invariant, so this runs once per CI (see swarm-tests.yml
// install-smoke job, ubuntu + node 20), not on all 6 matrix legs.
const ENABLED = process.env.RUN_INSTALL_SMOKE === '1';

describe('Install smoke (real tarball -> temp install)', { skip: !ENABLED ? 'set RUN_INSTALL_SMOKE=1 to run (single-leg CI job)' : false }, () => {
  const repoRoot = path.join(__dirname, '..', '..');
  let tmpRoot;
  let pkgDir;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-smoke-'));
    try {
      const pack = spawnSync('npm', ['pack', '--pack-destination', tmpRoot, '--json'], {
        cwd: repoRoot, encoding: 'utf8', timeout: 120000, shell: process.platform === 'win32'
      });
      assert.strictEqual(pack.status, 0, `npm pack failed: ${pack.stderr}`);
      const tarball = path.join(tmpRoot, JSON.parse(pack.stdout)[0].filename);

      const installDir = path.join(tmpRoot, 'app');
      fs.mkdirSync(installDir);
      const inst = spawnSync('npm', ['install', tarball, '--no-audit', '--no-fund', '--no-package-lock', '--loglevel=error'], {
        cwd: installDir, encoding: 'utf8', timeout: 180000, shell: process.platform === 'win32'
      });
      assert.strictEqual(inst.status, 0, `npm install failed: ${inst.stderr}`);

      pkgDir = path.join(installDir, 'node_modules', 'vespyr');
      assert.ok(fs.existsSync(path.join(pkgDir, 'package.json')), 'vespyr package must install');
    } catch (e) {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
      throw e;
    }
  });

  it('bin entry points resolve from the installed package', () => {
    for (const [bin, args] of [['bin/cli.js', ['--version']], ['bin/vespyr-eval.js', ['--help']]]) {
      const r = spawnSync(process.execPath, [path.join(pkgDir, bin), ...args], { encoding: 'utf8', timeout: 60000 });
      assert.strictEqual(r.status, 0, `${bin} crashed: ${r.stderr}`);
    }
  });

  it('vespyr audit runs from the installed package (security-scan.js + audit-spec.json closure)', () => {
    const scratch = path.join(tmpRoot, 'scratch');
    fs.mkdirSync(scratch);
    fs.writeFileSync(path.join(scratch, 'ok.md'), 'benign prose\n');
    const r = spawnSync(process.execPath, [path.join(pkgDir, 'bin', 'cli.js'), 'audit', '--target', scratch, '--json'], {
      encoding: 'utf8', timeout: 60000
    });
    assert.strictEqual(r.status, 0, `audit failed (FAULT-1?): ${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.strictEqual(out.exit, 0, `audit should be clean on scratch dir: ${JSON.stringify(out)}`);
  });

  it('installed .agents/ matches the clean-folder contract', () => {
    const mustHave = ['.agents/scripts/security-scan.js', 'evals/roundtable/topics.json', 'security/audit-spec.json', 'tools/eval/runner.js', 'evals/baseline.json'];
    const mustNot = ['.agents/state/session-current.json', 'evals/security/corpus/baseline-2026-08-10.json', '.agents/scripts/test_security_suite.js', 'evals/roundtable/fixtures/coverage-pass.md', 'evals/roundtable/README.md'];
    for (const p of mustHave) assert.ok(fs.existsSync(path.join(pkgDir, p)), `installed package must have ${p}`);
    for (const p of mustNot) assert.ok(!fs.existsSync(path.join(pkgDir, p)), `installed package must NOT have ${p}`);
  });

  it('vespyr-eval helper modules load from the installed package', () => {
    const { spawnSync } = require('child_process');
    const r = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(pkgDir, 'tools', 'eval', 'baseline.js'))}); console.log('ok')`], { encoding: 'utf8', timeout: 60000 });
    assert.strictEqual(r.status, 0, `tools/eval require chain failed: ${r.stderr}`);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });
});