#!/usr/bin/env node
/**
 * Swarm Test Harness — Automated Regression Tests for Vespyr Infrastructure
 * 
 * Usage:
 *   node test_swarm.js
 *   node test_swarm.js --verbose
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const SCRIPTS = path.join(ROOT, '.opencode', 'scripts');
const FIXTURES = path.join(ROOT, '.opencode', 'tests', 'fixtures');

// Test result tracking
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    process.stdout.write('.');
  } else {
    failed++;
    failures.push(message);
    process.stdout.write('F');
  }
}

function run(cmd, opts = {}) {
  try {
    return {
      stdout: execSync(cmd, { encoding: 'utf8', cwd: ROOT, ...opts }),
      code: 0
    };
  } catch (e) {
    return {
      stdout: e.stdout || '',
      stderr: e.stderr || '',
      code: e.status || 1
    };
  }
}

// Setup fixtures
function setupFixtures() {
  if (!fs.existsSync(FIXTURES)) {
    fs.mkdirSync(FIXTURES, { recursive: true });
  }

  // Create a mock memory file
  const mockMemory = path.join(FIXTURES, 'active-decisions.md');
  fs.writeFileSync(mockMemory, `### [AUTH] Implement JWT authentication flow [date: 2026-05-15] [agent: @architect]
We chose JWT over session cookies for stateless auth.

**Status:** active

### [DB] Add user schema migration [date: 2026-05-16] [agent: @developer]
Added users table with email, password_hash, created_at.

**Status:** active

### [AUTH] Fix login redirect bug [date: 2026-05-17] [agent: @developer]
Login redirect was going to /home instead of /dashboard.

**Status:** resolved
`);

  // Create a mock archive index
  const mockArchive = path.join(FIXTURES, 'archive-index.json');
  fs.writeFileSync(mockArchive, JSON.stringify({
    schema_version: '1.0',
    created: '2026-05-01',
    last_updated: '2026-05-15',
    entries: []
  }, null, 2));

  return { mockMemory, mockArchive };
}

function cleanupFixtures() {
  if (fs.existsSync(FIXTURES)) {
    fs.rmSync(FIXTURES, { recursive: true });
  }
}

// ============== TEST SUITES ==============

function testDedupeValidator(fixtures) {
  console.log('\n\n--- Dedupe Validator Tests ---');

  // Test 1: Exact duplicate
  const r1 = run(`node ${SCRIPTS}/dedupe_validator.js --title "Implement JWT authentication flow" --target ${fixtures.mockMemory}`);
  const j1 = JSON.parse(r1.stdout);
  assert(j1.status === 'duplicate', `Expected duplicate for exact match, got: ${j1.status}`);

  // Test 2: Different topic
  const r2 = run(`node ${SCRIPTS}/dedupe_validator.js --title "Set up Redis caching layer" --target ${fixtures.mockMemory}`);
  const j2 = JSON.parse(r2.stdout);
  assert(j2.status === 'pass', `Expected pass for different topic, got: ${j2.status}`);

  // Test 3: Close variant (possible duplicate)
  const r3 = run(`node ${SCRIPTS}/dedupe_validator.js --title "Implement JWT auth" --target ${fixtures.mockMemory}`);
  const j3 = JSON.parse(r3.stdout);
  assert(j3.status === 'possible_duplicate', `Expected possible_duplicate for close variant, got: ${j3.status}`);

  // Test 4: Paraphrase
  const r4 = run(`node ${SCRIPTS}/dedupe_validator.js --title "Add JSON Web Token auth flow" --target ${fixtures.mockMemory}`);
  const j4 = JSON.parse(r4.stdout);
  assert(j4.status === 'pass', `Expected pass for paraphrase, got: ${j4.status} (score: ${j4.score})`);

  // Test 5: Similar domain different topic
  const r5 = run(`node ${SCRIPTS}/dedupe_validator.js --title "Add OAuth2 login system" --target ${fixtures.mockMemory}`);
  const j5 = JSON.parse(r5.stdout);
  assert(j5.status === 'pass', `Expected pass for similar domain different topic, got: ${j5.status}`);
}

function testArchiveManager(fixtures) {
  console.log('\n\n--- Archive Manager Tests ---');

  // Test 1: Validate empty schema
  const r1 = run(`node ${SCRIPTS}/archive_manager.js validate --file ${fixtures.mockArchive}`);
  const j1 = JSON.parse(r1.stdout);
  assert(j1.valid === true, `Expected valid schema, got: ${j1.error}`);

  // Test 2: Append entry
  const entry = JSON.stringify({
    id: 'TEST-entry-20260519',
    title: 'Test Entry',
    domain: 'TEST',
    keywords: ['test'],
    date: '2026-05-19',
    status: 'resolved',
    summary: 'A test entry.',
    location: 'archive/2026-Q2/test.md#TEST-entry-20260519'
  });
  const r2 = run(`node ${SCRIPTS}/archive_manager.js append --file ${fixtures.mockArchive} --entry '${entry}'`);
  const j2 = JSON.parse(r2.stdout);
  assert(j2.success === true, `Expected successful append, got: ${j2.error}`);
  assert(j2.entries === 1, `Expected 1 entry, got: ${j2.entries}`);

  // Test 3: Duplicate ID rejection
  const r3 = run(`node ${SCRIPTS}/archive_manager.js append --file ${fixtures.mockArchive} --entry '${entry}'`);
  const errOut = r3.stdout || r3.stderr;
  const j3 = JSON.parse(errOut);
  assert(j3.success === false, `Expected duplicate rejection, got success`);
  assert(j3.error && j3.error.includes('Duplicate'), `Expected duplicate error, got: ${j3.error}`);

  // Test 4: Validate after append
  const r4 = run(`node ${SCRIPTS}/archive_manager.js validate --file ${fixtures.mockArchive}`);
  const j4 = JSON.parse(r4.stdout);
  assert(j4.valid === true && j4.entries === 1, `Expected 1 valid entry, got: ${j4.entries}`);
}

function testCompactionGuard(fixtures) {
  console.log('\n\n--- Compaction Guard Tests ---');

  // Test 1: File under threshold
  const r1 = run(`node ${SCRIPTS}/compaction_guard.js --file ${fixtures.mockMemory} --words 1000 --tokens 1500`);
  const j1 = JSON.parse(r1.stdout);
  assert(j1.status === 'OK', `Expected OK for under threshold, got: ${j1.status}`);

  // Test 2: File over threshold
  const r2 = run(`node ${SCRIPTS}/compaction_guard.js --file ${fixtures.mockMemory} --words 10 --tokens 20`);
  const j2 = JSON.parse(r2.stdout);
  assert(j2.status === 'OVER_THRESHOLD', `Expected OVER_THRESHOLD, got: ${j2.status}`);
}

function testTelemetry() {
  console.log('\n\n--- Telemetry Tests ---');

  // Test 1: Record event
  const r1 = run(`node ${SCRIPTS}/swarm_telemetry.js record --type memory_load --data '{"agent":"test","tokens":100}'`);
  assert(r1.stdout.trim() === 'OK', `Expected OK from telemetry record, got: ${r1.stdout}`);

  // Test 2: Generate summary
  const r2 = run(`node ${SCRIPTS}/swarm_telemetry.js summary --days 1`);
  const j2 = JSON.parse(r2.stdout);
  assert(j2.total_events > 0, `Expected events in summary, got: ${j2.total_events}`);
  assert(j2.by_type.memory_load > 0, `Expected memory_load events, got: ${JSON.stringify(j2.by_type)}`);
}

function testGraphs() {
  console.log('\n\n--- Graph Mapper Tests ---');

  // Test 1: Generate codebase graph for scripts directory (shallow)
  const codeFile = path.join(FIXTURES, 'test-code-graph.json');
  const r1 = run(`node ${SCRIPTS}/shallow_graph.js --src .opencode/scripts --out ${codeFile}`);
  const j1 = JSON.parse(r1.stdout);
  assert(j1.success === true, `Expected success, got: ${r1.stdout}`);
  assert(j1.files_scanned > 0, `Expected files scanned, got: ${j1.files_scanned}`);

  // Check codebase graph structure
  const codeGraph = JSON.parse(fs.readFileSync(codeFile, 'utf8'));
  assert(codeGraph.generated_at, `Expected generated_at in graph`);
  assert(Array.isArray(codeGraph.files), `Expected files array`);
  assert(codeGraph.files.length > 0, `Expected at least one file`);
  const firstCode = codeGraph.files[0];
  assert(firstCode.path, `Expected path in file entry`);
  assert(firstCode.language, `Expected language in file entry`);
  assert(Array.isArray(firstCode.exports), `Expected exports array`);
  assert(Array.isArray(firstCode.imports), `Expected imports array`);
  assert(Array.isArray(firstCode.imported_by), `Expected imported_by array`);

  // Test 2: Generate codebase graph incrementally (incremental)
  const r2 = run(`node ${SCRIPTS}/incremental_graph.js --src .opencode/scripts --out ${codeFile}`);
  const j2 = JSON.parse(r2.stdout);
  assert(j2.success === true, `Expected success, got: ${r2.stdout}`);
  assert(j2.scan_mode === 'incremental', `Expected incremental mode, got: ${j2.scan_mode}`);

  // Test 3: Generate document graph (doc_graph)
  const docFile = path.join(FIXTURES, 'test-doc-graph.json');
  const r3 = run(`node ${SCRIPTS}/doc_graph.js --out ${docFile}`);
  const j3 = JSON.parse(r3.stdout);
  assert(j3.success === true, `Expected success, got: ${r3.stdout}`);
  assert(j3.documents_scanned >= 0, `Expected documents scanned field`);

  // Check document graph structure
  const docGraph = JSON.parse(fs.readFileSync(docFile, 'utf8'));
  assert(docGraph.generated_at, `Expected generated_at in graph`);
  assert(Array.isArray(docGraph.nodes), `Expected nodes array`);
  assert(Array.isArray(docGraph.edges), `Expected edges array`);

  if (docGraph.nodes.length > 0) {
    const firstNode = docGraph.nodes[0];
    assert(firstNode.path, `Expected path in doc node`);
    assert(firstNode.type, `Expected type in doc node`);
    assert(firstNode.title, `Expected title in doc node`);
    assert(Array.isArray(firstNode.sections), `Expected sections array`);
    assert(Array.isArray(firstNode.links), `Expected links array`);
    assert(Array.isArray(firstNode.requirements), `Expected requirements array`);
    assert(Array.isArray(firstNode.user_stories), `Expected user_stories array`);
  }
}

function testOrchestratorState() {
  console.log('\n\n--- Orchestrator State Tests ---');

  const stateFile = path.join(FIXTURES, 'pipeline-state.json');
  const outputDir = path.join(FIXTURES, 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  // Override STATE_FILE for testing by creating a wrapper
  const testScript = path.join(FIXTURES, 'test-orchestrator.js');
  const orchestratorSrc = fs.readFileSync(path.join(SCRIPTS, 'orchestrator_state.js'), 'utf8');
  const patched = orchestratorSrc
    .replace(/const STATE_FILE = .*/, `const STATE_FILE = '${stateFile}';`)
    .replace(/const OUTPUT_DIR = .*/, `const OUTPUT_DIR = '${outputDir}';`);
  fs.writeFileSync(testScript, patched);

  // Test 1: Init
  const r1 = run(`node ${testScript} init --name "Test" --type startup`);
  const j1 = JSON.parse(r1.stdout);
  assert(j1.success === true, `Expected init success, got: ${j1.error}`);

  // Test 2: Status
  const r2 = run(`node ${testScript} status`);
  const j2 = JSON.parse(r2.stdout);
  assert(j2.project && j2.project.name === 'Test', `Expected project name Test`);

  // Test 3: Next (should be generate-artifacts)
  const r3 = run(`node ${testScript} next`);
  const j3 = JSON.parse(r3.stdout);
  assert(j3.action === 'generate-artifacts', `Expected generate-artifacts, got: ${j3.action}`);

  // Test 4: Create artifact and complete
  const ideaBrief = path.join(outputDir, '00-discovery', 'idea-brief.md');
  fs.mkdirSync(path.join(outputDir, '00-discovery'), { recursive: true });
  fs.writeFileSync(ideaBrief, '---\n**Version:** 1\n---\nTest brief');

  const r4 = run(`node ${testScript} complete --agent founder --artifact 00-discovery/idea-brief.md --tokens 5000 --duration-ms 10000`);
  const j4 = JSON.parse(r4.stdout);
  assert(j4.success === true, `Expected complete success, got: ${j4.error}`);
  assert(j4.version === 1, `Expected version 1, got: ${j4.version}`);

  // Test 5: File CR
  const r5 = run(`node ${testScript} file-cr --from developer --to product-manager --target user-stories.md --issue "Missing error handling"`);
  const j5 = JSON.parse(r5.stdout);
  assert(j5.success === true, `Expected CR filed, got: ${j5.error}`);
  assert(j5.cr_id === 'CR-001', `Expected CR-001, got: ${j5.cr_id}`);

  // Test 6: Next should be resolve-cr
  const r6 = run(`node ${testScript} next`);
  const j6 = JSON.parse(r6.stdout);
  assert(j6.action === 'resolve-cr', `Expected resolve-cr, got: ${j6.action}`);

  // Test 7: Validate phase
  const r7 = run(`node ${testScript} validate --phase validation`);
  const j7 = JSON.parse(r7.stdout);
  assert(j7.allPresent === true, `Expected validation phase complete`);

  // Test 7b: Validate phase with fallback (validation-brief.md instead of idea-brief.md)
  fs.unlinkSync(ideaBrief);
  const valBrief = path.join(outputDir, '00-discovery', 'validation-brief.md');
  fs.writeFileSync(valBrief, '---\n**Version:** 2\n---\nTest validation brief');

  const r7b = run(`node ${testScript} validate --phase validation`);
  const j7b = JSON.parse(r7b.stdout);
  assert(j7b.allPresent === true, `Expected validation phase complete with fallback`);
  assert(j7b.artifacts[0].name === 'validation-brief.md', `Expected artifact name to match validation-brief.md, got: ${j7b.artifacts[0].name}`);
  assert(j7b.artifacts[0].version === 2, `Expected version 2, got: ${j7b.artifacts[0].version}`);

  // Cleanup
  fs.rmSync(path.join(FIXTURES, 'output'), { recursive: true });
  fs.unlinkSync(stateFile);
  fs.unlinkSync(testScript);
}

function testTelemetryReport() {
  console.log('\n\n--- Telemetry Report Tests ---');

  // Record events with agent/phase
  run(`node ${SCRIPTS}/swarm_telemetry.js record --type agent_invoke --agent founder --phase validation --data '{"tokens":5000,"duration_ms":10000}'`);
  run(`node ${SCRIPTS}/swarm_telemetry.js record --type agent_invoke --agent researcher --phase exploration --data '{"tokens":12000,"duration_ms":20000}'`);

  // Test report
  const r1 = run(`node ${SCRIPTS}/swarm_telemetry.js report --days 1`);
  const j1 = JSON.parse(r1.stdout);
  assert(j1.validation && j1.validation.founder, `Expected validation.founder in report`);
  assert(j1.validation.founder.avg_tokens === 5000, `Expected 5000 avg tokens, got: ${j1.validation.founder.avg_tokens}`);
  assert(j1.exploration && j1.exploration.researcher, `Expected exploration.researcher in report`);
}

// ============== MAIN ==============

function main() {
  const verbose = process.argv.includes('--verbose');

  console.log('Vespyr Swarm Test Harness');
  console.log('=========================\n');

  const fixtures = setupFixtures();

  try {
    testDedupeValidator(fixtures);
    testArchiveManager(fixtures);
    testCompactionGuard(fixtures);
    testTelemetry();
    testGraphs();
    testOrchestratorState();
    testTelemetryReport();
  } finally {
    cleanupFixtures();
  }

  console.log('\n\n=========================');
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  ✗ ${f}`);
    }
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed');
    process.exit(0);
  }
}

main();
