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
const SPEC = path.join(ROOT, 'artifacts', 'docs', 'strategy', 'development-plan', 'security', 'audit-spec.json');

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
  const out = execFileSync('node', [path.join(SCRIPTS_DIR, 'memory_filter.js'), '--agent', 'developer', '--task', 'authentication'], { cwd: ROOT, encoding: 'utf8' });
  const parsed = JSON.parse(out);
  if (!Array.isArray(parsed.results) || parsed.results.length === 0) {
    throw new Error('Memory filter returned empty results');
  }
  const sample = parsed.results[0];
  if (!sample.t3_block || !sample.t3_block.includes('<!-- T3-DATA:')) {
    throw new Error('T3 delimiter block missing from memory result');
  }
});

// 6. CLI Commands: vespyr manifest and vespyr verify
runTest('CLI Signed-Manifest Generation & Verification (bin/cli.js verify)', () => {
  execFileSync('node', [CLI, 'manifest'], { cwd: ROOT, encoding: 'utf8' });
  execFileSync('node', [CLI, 'verify'], { cwd: ROOT, encoding: 'utf8' });
});

// 7. Held-Out Evaluation Dataset
runTest('Held-Out Recall Evaluation (eval/security/held_out/)', () => {
  const heldOutPos = path.join(ROOT, 'eval', 'security', 'held_out', 'positive');
  const heldOutNeg = path.join(ROOT, 'eval', 'security', 'held_out', 'negative');
  
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

console.log(`\n========================================`);
console.log(`Security Test Suite: ${passCount} Passed, ${failCount} Failed`);
console.log(`========================================\n`);

process.exit(failCount === 0 ? 0 : 1);
