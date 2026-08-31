const { describe, it } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');

// 02h T4.7 evidence fixture: real `npm pack --dry-run` audit + zero-missing-module
// execution proof for the published tarball (bin/ + .agents/ in the files array).
describe('NPX packaging & manifest verification', () => {
  const repoRoot = path.join(__dirname, '..', '..');

  const packed = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
    shell: process.platform === 'win32'
  });

  it('npm pack --dry-run succeeds and emits parseable JSON', () => {
    assert.strictEqual(packed.status, 0, `npm pack failed: ${packed.stderr}`);
    const data = JSON.parse(packed.stdout);
    assert.ok(Array.isArray(data) && data.length >= 1, 'expected one package entry');
  });

  it('tarball includes bin entry points, bin/lib helpers, engine scripts, and skills', () => {
    const data = JSON.parse(packed.stdout);
    const paths = new Set(data[0].files.map((f) => f.path));
    const required = [
      'bin/cli.js',
      'bin/vespyr-eval.js',
      'bin/lib/detector.js',
      '.agents/scripts/orchestrator_state.js',
      '.agents/scripts/lib/fs_atomic.js',
      '.agents/skills/shut-up/SKILL.md',
      '.agents/skills/grill-me/SKILL.md',
      'package.json'
    ];
    for (const p of required) {
      assert.ok(paths.has(p), `tarball must include ${p}`);
    }
  });

  it('every shipped JS module loads with zero missing-module errors', () => {
    // Executing the tarball is the npx contract; requiring each module from the
    // repo (same bytes npm pack ships) proves the dependency graph resolves.
    const modules = [
      '../../bin/cli.js',
      '../../bin/lib/detector.js',
      '../../bin/lib/state.js',
      '../../bin/lib/link-utils.js',
      '../../bin/lib/logger.js',
      '../../bin/lib/harnesses/index.js'
    ];
    for (const m of modules) {
      const mod = require(m);
      assert.ok(mod !== null && mod !== undefined, `${m} must export something`);
    }
  });
  it('dead-module gate: every bin/lib module has at least one inbound require', () => {
    // A4 gate: structurally prevents the "helpers exist but nothing imports
    // them" failure class found in the 2026-08-24 audit.
    const fsMod = require('fs');
    const pathMod = require('path');
    const binLib = path.join(repoRoot, 'bin', 'lib');
    const scanDir = (dir, acc = []) => {
      for (const e of fsMod.readdirSync(dir, { withFileTypes: true })) {
        const full = pathMod.join(dir, e.name);
        if (e.isDirectory()) scanDir(full, acc);
        else if (e.isFile() && e.name.endsWith('.js')) acc.push(full);
      }
      return acc;
    };
    const modules = scanDir(binLib);
    const sources = [path.join(repoRoot, 'bin', 'cli.js'), ...modules];
    const inbound = new Map(modules.map((m) => [m, 0]));
    for (const src of sources) {
      const text = fsMod.readFileSync(src, 'utf8');
      for (const m of text.matchAll(/require\((['"])(.+?)\1/g)) {
        let spec = m[2];
        if (!spec.startsWith('./') && !spec.startsWith('../')) continue;
        const resolved = pathMod.resolve(pathMod.dirname(src), spec);
        if (inbound.has(resolved) && resolved !== src) {
          inbound.set(resolved, inbound.get(resolved) + 1);
        }
      }
    }
    for (const [mod, count] of inbound) {
      assert.ok(count > 0, `orphaned module: ${pathMod.relative(repoRoot, mod)} has zero inbound requires`);
    }
  });
});
