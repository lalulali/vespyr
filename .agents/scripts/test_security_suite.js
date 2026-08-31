#!/usr/bin/env node
/**
 * test_security_suite.js — End-to-End Security & Integrity Test Suite (02f F1.54, F1.53)
 *
 * Runs all security gates, fault-injection assertions, permission validators,
 * P8 ingestion matrix checks, T3 memory loaders, CLI integrity verification,
 * and adversarial mutation evals.
 *
 * Exit codes:
 *   0 = All security tests & gates passed
 *   1 = One or more test suites failed
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPTS_DIR = path.join(ROOT, '.agents', 'scripts');
const CLI = path.join(ROOT, 'bin', 'cli.js');
const SPEC = path.join(ROOT, 'security', 'audit-spec.json');

const SUITES = [];
let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  process.stdout.write(`• Testing: ${name}... `);
  try {
    fn();
    console.log('PASS');
    passCount++;
  } catch (e) {
    console.log('FAIL');
    console.error(`  Error: ${e.message}`);
    if (e.stdout) console.error(`  Stdout: ${e.stdout}`);
    if (e.stderr) console.error(`  Stderr: ${e.stderr}`);
    failCount++;
  }
}

// 1. Corpus Invariants
runTest('Red-Team Corpus Invariants (check_corpus_invariants.js)', () => {
  execFileSync('node', [path.join(SCRIPTS_DIR, 'check_corpus_invariants.js')], { cwd: ROOT, encoding: 'utf8' });
});

// 2. Fault Injection Contracts (FAULT-1..FAULT-4 -> exit 2)
runTest('Fault-Injection Contract: FAULT-1 (Unparseable Spec -> Exit 2)', () => {
  try {
    execFileSync('node', [path.join(SCRIPTS_DIR, 'security-scan.js'), '--dir', ROOT, '--spec', 'nonexistent-spec.json'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    throw new Error('Expected exit 2, got 0');
  } catch (e) {
    if (e.status !== 2) throw new Error(`Expected exit code 2, got ${e.status}`);
  }
});

runTest('Fault-Injection Contract: FAULT-1 Explicit Fault Flag (Exit 2)', () => {
  try {
    execFileSync('node', [path.join(SCRIPTS_DIR, 'security-scan.js'), '--fault-inject', 'FAULT-1'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    throw new Error('Expected exit 2, got 0');
  } catch (e) {
    if (e.status !== 2) throw new Error(`Expected exit code 2, got ${e.status}`);
  }
});

runTest('Fault-Injection Contract: FAULT-2 Explicit Fault Flag (Exit 2)', () => {
  try {
    execFileSync('node', [path.join(SCRIPTS_DIR, 'security-scan.js'), '--fault-inject', 'FAULT-2'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    throw new Error('Expected exit 2, got 0');
  } catch (e) {
    if (e.status !== 2) throw new Error(`Expected exit code 2, got ${e.status}`);
  }
});

runTest('Fault-Injection Contract: FAULT-3 Explicit Fault Flag (Exit 2)', () => {
  try {
    execFileSync('node', [path.join(SCRIPTS_DIR, 'security-scan.js'), '--fault-inject', 'FAULT-3'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    throw new Error('Expected exit 2, got 0');
  } catch (e) {
    if (e.status !== 2) throw new Error(`Expected exit code 2, got ${e.status}`);
  }
});

runTest('Fault-Injection Contract: FAULT-4 Explicit Fault Flag (Exit 2)', () => {
  try {
    execFileSync('node', [path.join(SCRIPTS_DIR, 'security-scan.js'), '--fault-inject', 'FAULT-4'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    throw new Error('Expected exit 2, got 0');
  } catch (e) {
    if (e.status !== 2) throw new Error(`Expected exit code 2, got ${e.status}`);
  }
});

// N-16 regression guard (Victor, post-fix audit): an unreadable FILE (not just
// subtree) must fail closed — never silently skip and report clean.
// N-17 (Nina, resolved): POSIX uses chmod 000; Windows maps that to READONLY
// (file stays readable), so read access is denied via icacls instead. If
// icacls is unavailable the test skips EXPLICITLY — a silent skip would be a
// false pass.
runTest('Fail-Closed Walker: chmod-000 file -> Exit 2', () => {
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-f7-file-'));
  const payload = path.join(tmp, 'payload.js');
  try {
    fs.writeFileSync(payload, 'eval(atob("Zm9v"))\n', 'utf8');
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      try {
        // Deny Everyone read via ACL; remove inheritance so the deny sticks.
        execSync(`icacls "${payload}" /inheritance:r /deny *S-1-1-0:(R)`, { stdio: 'pipe' });
      } catch (e) {
        console.log('SKIP (win32: icacls denial unavailable — N-17 fallback)');
        passCount++;
        return;
      }
    } else {
      fs.chmodSync(payload, 0o000);
    }
    try {
      execFileSync('node', [path.join(SCRIPTS_DIR, 'security-scan.js'), '--dir', tmp, '--spec', SPEC], { encoding: 'utf8', stdio: 'pipe' });
      throw new Error('unreadable-file scan expected exit 2, got 0 (silent skip!)');
    } catch (e) {
      if (e.status !== 2) throw new Error(`expected exit 2, got ${e.status}`);
    }
  } finally {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`icacls "${payload}" /reset`, { stdio: 'pipe' });
      } else {
        fs.chmodSync(payload, 0o644);
      }
    } catch (e) { /* best-effort cleanup */ }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 3. Frontmatter & Permission Whitelist
runTest('Agent Frontmatter Schema & Permission Whitelist (validate_frontmatter.js)', () => {
  execFileSync('node', [path.join(SCRIPTS_DIR, 'validate_frontmatter.js')], { cwd: ROOT, encoding: 'utf8' });
});

// 4. P8 Ingestion Matrix & Persona Discipline Lines
runTest('P8 Tool-Addition & Ingestion Matrix Gate (validate_matrix.js)', () => {
  execFileSync('node', [path.join(SCRIPTS_DIR, 'validate_matrix.js')], { cwd: ROOT, encoding: 'utf8' });
});

// 5. Memory T3 Loader & Admission Control
runTest('Memory Filter T3 Delimiter & Admission Control (memory_filter.js)', () => {
  // Self-contained fixture: memory_filter resolves artifacts/memory/ under
  // cwd, and the repo's live artifacts/memory is UNTRACKED — a fresh CI
  // checkout has none (run 32825787864: "Memory filter returned empty
  // results"). Seed an isolated workspace instead of depending on it.
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-t3-filter-'));
  const oldCwd = process.cwd();
  try {
    const memDir = path.join(tmp, 'artifacts', 'memory');
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(
      path.join(memDir, 'project-context.md'),
      '# Project Context\n\n## [IDENTITY]\nUser Nickname: Test\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(memDir, 'active-decisions.md'),
      '### [SECURITY] Authentication token handling [date: 2026-08-25] [agent: @security-engineer]\n' +
        'Authentication secrets are scrubbed via scrubSecrets before any memory write; tokens never appear in logs.\n' +
        '**Status:** active\n',
      'utf8'
    );

    process.chdir(tmp);
    const out = execFileSync('node', [path.join(SCRIPTS_DIR, 'memory_filter.js'), '--agent', 'developer', '--task', 'authentication'], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    if (!Array.isArray(parsed.results) || parsed.results.length === 0) {
      throw new Error('Memory filter returned empty results');
    }
    const sample = parsed.results[0];
    if (!sample.t3_block || !sample.t3_block.includes('<!-- T3-DATA:')) {
      throw new Error('T3 delimiter block missing from memory result');
    }
  } finally {
    process.chdir(oldCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 6. CLI Manifest Verification Contract — isolated temp tree, NO tautology.
// (2026-08-23 re-audit: the old test regenerated the repo manifest then
// verified against it — it cannot fail on a tampered tree, and it rewrote
// the committed at-rest baseline as a side effect.)
runTest('CLI Manifest Verification Contract (fail-closed bootstrap, tamper, extra-file)', () => {
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-verify-contract-'));
  try {
    const agentsDir = path.join(tmp, '.agents');
    fs.mkdirSync(agentsDir);
    fs.writeFileSync(path.join(agentsDir, 'a.md'), 'clean content\n', 'utf8');
    fs.mkdirSync(path.join(agentsDir, 'sub'));
    fs.writeFileSync(path.join(agentsDir, 'sub', 'b.md'), 'more clean content\n', 'utf8');

    // Baseline generation is explicit-only (N-12): `manifest` is the sole writer.
    execFileSync('node', [CLI, 'manifest', '--target', tmp], { encoding: 'utf8' });
    if (!fs.existsSync(path.join(agentsDir, 'manifest.json'))) throw new Error('manifest not generated');

    // 6a. Clean verify → exit 0
    execFileSync('node', [CLI, 'verify', '--target', tmp, '--json'], { encoding: 'utf8' });

    // 6b. Missing manifest → exit 2 (FAULT-5, fail-closed bootstrap — never auto-generate)
    const savedManifest = fs.readFileSync(path.join(agentsDir, 'manifest.json'), 'utf8');
    fs.unlinkSync(path.join(agentsDir, 'manifest.json'));
    try {
      execFileSync('node', [CLI, 'verify', '--target', tmp, '--json'], { encoding: 'utf8' });
      throw new Error('missing-manifest verify expected exit 2, got 0 (fail-open bootstrap!)');
    } catch (e) {
      if (e.status !== 2) throw new Error(`missing-manifest expected exit 2, got ${e.status}`);
    }
    if (fs.existsSync(path.join(agentsDir, 'manifest.json'))) {
      throw new Error('FAIL-CLOSED violated: verify wrote a manifest during failed verification');
    }
    fs.writeFileSync(path.join(agentsDir, 'manifest.json'), savedManifest, 'utf8');

    // 6c. Tampered file → exit 1
    fs.appendFileSync(path.join(agentsDir, 'a.md'), 'tampered\n', 'utf8');
    try {
      execFileSync('node', [CLI, 'verify', '--target', tmp, '--json'], { encoding: 'utf8' });
      throw new Error('tampered verify expected exit 1, got 0');
    } catch (e) {
      if (e.status !== 1) throw new Error(`tampered expected exit 1, got ${e.status}`);
    }
    fs.writeFileSync(path.join(agentsDir, 'a.md'), 'clean content\n', 'utf8');

    // 6d. Extra planted file not in manifest → exit 1 (N-14a)
    fs.writeFileSync(path.join(agentsDir, 'planted.md'), 'unlisted payload\n', 'utf8');
    try {
      execFileSync('node', [CLI, 'verify', '--target', tmp, '--json'], { encoding: 'utf8' });
      throw new Error('extra-file verify expected exit 1, got 0');
    } catch (e) {
      if (e.status !== 1) throw new Error(`extra-file expected exit 1, got ${e.status}`);
    }
    fs.unlinkSync(path.join(agentsDir, 'planted.md'));

    // 6e. N-14 scope extension: root-scope file (bin/cli.js) tampering fails
    // verify — the verifier must be able to attest its own binary.
    fs.mkdirSync(path.join(tmp, 'bin'));
    fs.writeFileSync(path.join(tmp, 'bin', 'cli.js'), 'console.log("verifier")\n', 'utf8');
    execFileSync('node', [CLI, 'manifest', '--target', tmp], { encoding: 'utf8' }); // explicit re-baseline includes files_root
    execFileSync('node', [CLI, 'verify', '--target', tmp, '--json'], { encoding: 'utf8' }); // clean state passes
    fs.appendFileSync(path.join(tmp, 'bin', 'cli.js'), '// tampered\n', 'utf8');
    try {
      execFileSync('node', [CLI, 'verify', '--target', tmp, '--json'], { encoding: 'utf8' });
      throw new Error('root-scope tamper expected exit 1, got 0');
    } catch (e) {
      if (e.status !== 1) throw new Error(`root-scope tamper expected exit 1, got ${e.status}`);
    }

    // 6f. Corrupt manifest → exit 2 (FAULT-4 preserved)
    fs.writeFileSync(path.join(agentsDir, 'manifest.json'), '{not json', 'utf8');
    try {
      execFileSync('node', [CLI, 'verify', '--target', tmp, '--json'], { encoding: 'utf8' });
      throw new Error('corrupt-manifest verify expected exit 2, got 0');
    } catch (e) {
      if (e.status !== 2) throw new Error(`corrupt-manifest expected exit 2, got ${e.status}`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 7. Held-Out Evaluation Dataset
runTest('Held-Out Recall Evaluation (evals/security/held_out/)', () => {
  const heldOutPos = path.join(ROOT, 'evals', 'security', 'held_out', 'positive');
  const heldOutNeg = path.join(ROOT, 'evals', 'security', 'held_out', 'negative');
  
  // Positives must exit 1 (findings detected)
  try {
    execFileSync('node', [path.join(SCRIPTS_DIR, 'security-scan.js'), '--dir', heldOutPos, '--spec', SPEC], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    throw new Error('Held-out positive scan expected exit 1, got 0');
  } catch (e) {
    if (e.status !== 1) throw new Error(`Held-out positive expected exit 1, got ${e.status}`);
  }

  // Negatives must exit 0 (clean)
  execFileSync('node', [path.join(SCRIPTS_DIR, 'security-scan.js'), '--dir', heldOutNeg, '--spec', SPEC], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
});

// 8. Adversarial Mutation Evaluation
runTest('Adversarial Mutation Runner (test_security_mutation.js)', () => {
  execFileSync('node', [path.join(SCRIPTS_DIR, 'test_security_mutation.js')], { cwd: ROOT, encoding: 'utf8' });
});

// 9. NEW-FINDINGS-ONLY repo gate (02f DoD #8)
runTest('NEW-FINDINGS-ONLY Gate vs frozen baseline (check_new_findings.js)', () => {
  execFileSync('node', [path.join(SCRIPTS_DIR, 'check_new_findings.js')], { cwd: ROOT, encoding: 'utf8' });
});

console.log(`\n========================================`);
console.log(`Security Test Suite: ${passCount} Passed, ${failCount} Failed`);
console.log(`========================================\n`);

process.exit(failCount === 0 ? 0 : 1);
