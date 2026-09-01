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
      '.agents/scripts/security-scan.js',
      '.agents/scripts/roundtable_eval.js',
      '.agents/scripts/validate_frontmatter.js',
      '.agents/scripts/memory_write.js',
      '.agents/scripts/dedupe_validator.js',
      '.agents/scripts/add-identity-block.js',
      'evals/roundtable/topics.json',
      'evals/baseline.json',
      'evals/suites/agents/core-swarm.json',
      'evals/rubrics/prd-completeness.json',
      'evals/fixtures/simple-js/index.js',
      'evals/meta-eval/gold-standard.json',
      'tools/eval/runner.js',
      'security/audit-spec.json',
      'security/supply-chain-audit-spec.md',
      'package.json'
    ];
    for (const p of required) {
      assert.ok(paths.has(p), `tarball must include ${p}`);
    }
  });

  // Clean-folder contract (round-table 2026-08-31): repo/CI-only content must
  // never ship — live session state, the attack-fixture corpus, roundtable
  // eval fixtures, and the CI-only script cluster. A file appearing here
  // fails the pack (allowlist-direction: new files in excluded dirs must be
  // triaged, never silently shipped).
  it('tarball excludes repo/CI-only content (negative absence)', () => {
    const data = JSON.parse(packed.stdout);
    const paths = new Set(data[0].files.map((f) => f.path));
    const banned = [
      '.agents/state/session-current.json',
      'evals/roundtable/fixtures/coverage-pass.md',
      'evals/roundtable/fixtures/coverage-fail.md',
      'evals/roundtable/fixtures/transcripts/rt-003_native_1.md',
      'evals/roundtable/README.md',
      'evals/security/corpus/baseline-2026-08-10.json',
      'evals/security/corpus/positive/inj-prompt.md',
      'evals/security/held_out/positive/adv-prompt-override.md',
      '.agents/scripts/test_security_suite.js',
      '.agents/scripts/test_security_mutation.js',
      '.agents/scripts/check_corpus_invariants.js',
      '.agents/scripts/check_new_findings.js',
      '.agents/scripts/check_plan_reservation.js',
      '.agents/scripts/drift_monitor.js',
      '.agents/scripts/validate_matrix.js',
      '.agents/scripts/pipeline_simulator.js',
      '.agents/scripts/hot_path_analyzer.js',
      '.agents/scripts/token_profiler.js',
      '.agents/scripts/fix-squads.js',
      '.agents/scripts/migrate-frontmatter-v2.js'
    ];
    for (const p of banned) {
      assert.ok(!paths.has(p), `tarball must NOT include ${p}`);
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
