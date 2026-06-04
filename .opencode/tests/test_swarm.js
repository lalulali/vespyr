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

function testEnsureGraph() {
  console.log('\n\n--- Ensure Graph Wrapper Tests ---');

  // Use isolated fixture dirs so we don't pollute the real structural dir.
  const codeOut = path.join(FIXTURES, 'ensure-code-graph.json');
  const docOut = path.join(FIXTURES, 'ensure-doc-graph.json');
  fs.rmSync(codeOut, { force: true });
  fs.rmSync(docOut, { force: true });

  // Test 1: First call regenerates (builds from scratch)
  const r1 = run(`node ${SCRIPTS}/ensure_graph.js code --src .opencode/scripts --out ${codeOut}`);
  const j1 = JSON.parse(r1.stdout);
  assert(j1.type === 'code', `Expected type code, got: ${j1.type}`);
  assert(j1.status === 'regenerated', `Expected status regenerated, got: ${j1.status}`);
  assert(j1.regenerated === true, `Expected regenerated true`);
  assert(j1.output === codeOut, `Expected output path, got: ${j1.output}`);

  // Test 2: Second call is fresh (no work, no-op)
  const r2 = run(`node ${SCRIPTS}/ensure_graph.js code --src .opencode/scripts --out ${codeOut}`);
  const j2 = JSON.parse(r2.stdout);
  assert(j2.status === 'fresh', `Expected status fresh, got: ${j2.status}`);
  assert(j2.regenerated === false, `Expected regenerated false`);
  assert(j2.scan_mode === 'none', `Expected scan_mode none, got: ${j2.scan_mode}`);

  // Test 3: Force flag regenerates even when fresh
  const r3 = run(`node ${SCRIPTS}/ensure_graph.js code --src .opencode/scripts --out ${codeOut} --force`);
  const j3 = JSON.parse(r3.stdout);
  assert(j3.status === 'regenerated', `Expected status regenerated on --force, got: ${j3.status}`);

  // Test 4: Source-file modification triggers incremental regen
  // Touch a file under the scanned dir to bump its mtime to "now + 10s"
  // (must be after the current graph mtime, which is "now" of test 3)
  const targetFile = path.join(ROOT, '.opencode', 'scripts', 'orchestrator_state.js');
  const origMtime = fs.statSync(targetFile).mtimeMs;
  const nowMs = Date.now();
  const futureSec = Math.floor((nowMs + 10000) / 1000);
  fs.utimesSync(targetFile, futureSec, futureSec);
  try {
    const r4 = run(`node ${SCRIPTS}/ensure_graph.js code --src .opencode/scripts --out ${codeOut}`);
    const j4 = JSON.parse(r4.stdout);
    assert(j4.status === 'regenerated', `Expected regenerated after source mtime bump, got: ${j4.status}`);
    assert(j4.scan_mode === 'incremental', `Expected incremental scan, got: ${j4.scan_mode}`);
  } finally {
    // Restore original mtime
    fs.utimesSync(targetFile, Math.floor(origMtime / 1000), Math.floor(origMtime / 1000));
  }

  // Test 5: Doc graph wrapper
  const r5 = run(`node ${SCRIPTS}/ensure_graph.js doc --out ${docOut}`);
  const j5 = JSON.parse(r5.stdout);
  assert(j5.type === 'doc', `Expected type doc, got: ${j5.type}`);
  assert(j5.status === 'regenerated', `Expected doc regenerated, got: ${j5.status}`);
  assert(typeof j5.documents_scanned === 'number', `Expected documents_scanned number`);

  // Test 6: Invalid type returns exit 2
  const r6 = run(`node ${SCRIPTS}/ensure_graph.js foo`);
  assert(r6.code !== 0, `Expected non-zero exit for invalid type, got: ${r6.code}`);

  // Test 7: Output files actually exist
  assert(fs.existsSync(codeOut), `Expected code graph at ${codeOut}`);
  assert(fs.existsSync(docOut), `Expected doc graph at ${docOut}`);

  // Test 8: Output files are valid JSON with expected shape
  const codeGraph = JSON.parse(fs.readFileSync(codeOut, 'utf8'));
  assert(Array.isArray(codeGraph.files), `Expected files array in code graph`);
  const docGraph = JSON.parse(fs.readFileSync(docOut, 'utf8'));
  assert(Array.isArray(docGraph.nodes), `Expected nodes array in doc graph`);
  assert(Array.isArray(docGraph.edges), `Expected edges array in doc graph`);

  // Cleanup
  fs.rmSync(codeOut, { force: true });
  fs.rmSync(docOut, { force: true });
}

function testOrchestratorEnsureGraph() {
  console.log('\n\n--- Orchestrator ensure-graph Command Tests ---');

  const stateFile = path.join(FIXTURES, 'pipeline-state.json');
  const outputDir = path.join(FIXTURES, 'output');
  const telemetryDir = path.join(FIXTURES, 'orch-ensure-telemetry');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(telemetryDir, { recursive: true });
  fs.rmSync(stateFile, { force: true });

  // Build a patched orchestrator script with isolated state, output, telemetry
  const testScript = path.join(FIXTURES, 'test-orch-ensure.js');
  const orchestratorSrc = fs.readFileSync(path.join(SCRIPTS, 'orchestrator_state.js'), 'utf8');
  // Override structural graph output to fixture dir so we don't pollute real graph
  const fixtureStructural = path.join(FIXTURES, 'structural');
  fs.rmSync(fixtureStructural, { recursive: true, force: true });
  fs.mkdirSync(fixtureStructural, { recursive: true });
  const ensureGraphPath = path.join(SCRIPTS, 'ensure_graph.js');

  const patched = orchestratorSrc
    .replace(/const STATE_FILE = .*/, `const STATE_FILE = '${stateFile}';`)
    .replace(/const OUTPUT_DIR = .*/, `const OUTPUT_DIR = '${outputDir}';`)
    .replace(/const TELEMETRY_DIR = .*/, `const TELEMETRY_DIR = '${telemetryDir}';`)
    .replace(/require\('\.\/squads'\)/g, `require('${path.join(SCRIPTS, 'squads.js').replace(/\\/g, '\\\\')}')`)
    .replace(/artifacts\\\\\/memory\\\\\/structural/g, fixtureStructural.replace(/\\/g, '\\\\'))
    .replace(/artifacts\/memory\/structural/g, fixtureStructural)
    .replace(/path\.join\(__dirname, 'ensure_graph\.js'\)/g, `'${ensureGraphPath}'`);
  fs.writeFileSync(testScript, patched);

  // Test 1: ensure-graph code runs through orchestrator CLI
  const r1 = run(`node ${testScript} ensure-graph code --src .opencode/scripts`);
  const j1 = JSON.parse(r1.stdout);
  assert(j1.type === 'code', `Expected type code, got: ${j1.type}`);
  assert(['fresh', 'regenerated'].includes(j1.status), `Expected fresh or regenerated, got: ${j1.status}`);

  // Test 2: ensure-graph doc runs through orchestrator CLI
  const r2 = run(`node ${testScript} ensure-graph doc`);
  const j2 = JSON.parse(r2.stdout);
  assert(j2.type === 'doc', `Expected type doc, got: ${j2.type}`);

  // Test 3: init triggers ensure_graph doc (graph should be created)
  const r3 = run(`node ${testScript} init --name "Test" --type startup`);
  const j3 = JSON.parse(r3.stdout);
  assert(j3.success === true, `Expected init success, got: ${j3.error}`);

  // Test 4: complete with developer agent triggers ensure_graph code
  // First create a dummy artifact
  const artifactDir = path.join(outputDir, '04-planning');
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, 'execution-plan.md'), '# Plan\n\n**Version:** 1\nSome content');
  const r4 = run(`node ${testScript} complete --agent developer --artifact 04-planning/execution-plan.md`);
  const j4 = JSON.parse(r4.stdout);
  assert(j4.success === true, `Expected complete success, got: ${j4.error}`);

  // Test 5: graph_status telemetry was recorded
  const telemetryFile = path.join(telemetryDir, `events-${new Date().toISOString().split('T')[0]}.ndjson`);
  if (fs.existsSync(telemetryFile)) {
    const events = fs.readFileSync(telemetryFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    const graphEvents = events.filter(e => e.type === 'graph_status');
    assert(graphEvents.length > 0, `Expected graph_status events in telemetry, got: ${graphEvents.length}`);
  }

  // Test 6: Invalid type returns exit 2
  const r6 = run(`node ${testScript} ensure-graph foo`);
  assert(r6.code === 2, `Expected exit 2 for invalid type, got: ${r6.code}`);

  // Cleanup
  fs.rmSync(stateFile, { force: true });
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.rmSync(telemetryDir, { recursive: true, force: true });
  fs.rmSync(fixtureStructural, { recursive: true, force: true });
  fs.rmSync(testScript, { force: true });
}

function testOrchestratorState() {
  console.log('\n\n--- Orchestrator State Tests ---');

  const stateFile = path.join(FIXTURES, 'pipeline-state.json');
  const outputDir = path.join(FIXTURES, 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  // Override STATE_FILE for testing by creating a wrapper
  const testScript = path.join(FIXTURES, 'test-orchestrator.js');
  const orchestratorSrc = fs.readFileSync(path.join(SCRIPTS, 'orchestrator_state.js'), 'utf8');
  const telemetryDir = path.join(FIXTURES, 'telemetry');
  fs.mkdirSync(telemetryDir, { recursive: true });
  const patched = orchestratorSrc
    .replace(/const STATE_FILE = .*/, `const STATE_FILE = '${stateFile}';`)
    .replace(/const OUTPUT_DIR = .*/, `const OUTPUT_DIR = '${outputDir}';`)
    .replace(/const TELEMETRY_DIR = .*/, `const TELEMETRY_DIR = '${telemetryDir}';`)
    .replace(/require\('\.\/squads'\)/g, `require('${path.join(SCRIPTS, 'squads.js').replace(/\\/g, '\\\\')}')`);
  fs.writeFileSync(testScript, patched);

  // Test 1: Init
  const r1 = run(`node ${testScript} init --name "Test" --type startup`);
  const j1 = JSON.parse(r1.stdout);
  assert(j1.success === true, `Expected init success, got: ${j1.error}`);

  // Test 1b: Squad build verification
  const rInitSquad = run(`node ${testScript} init --name "BuildProject" --type startup --squad build`);
  const jInitSquad = JSON.parse(rInitSquad.stdout);
  assert(jInitSquad.success === true, `Expected init with build squad success`);
  assert(jInitSquad.squad === 'build', `Expected squad build, got: ${jInitSquad.squad}`);

  const rStatusSquad = run(`node ${testScript} status`);
  const jStatusSquad = JSON.parse(rStatusSquad.stdout);
  assert(jStatusSquad.project.squad === 'build', `Expected squad in project status to be build`);
  assert(jStatusSquad.phases.validation.status === 'complete', `Expected validation phase to be auto-completed/skipped`);
  assert(jStatusSquad.phases.exploration.status === 'complete', `Expected exploration phase to be auto-completed/skipped`);
  assert(jStatusSquad.phases.design.status === 'complete', `Expected design phase to be auto-completed/skipped`);
  assert(jStatusSquad.current_phase === 'development', `Expected start phase for build squad to be development, got: ${jStatusSquad.current_phase}`);

  // Re-initialize standard project for subsequent tests
  const rReInit = run(`node ${testScript} init --name "Test" --type startup`);
  const jReInit = JSON.parse(rReInit.stdout);
  assert(jReInit.success === true, `Re-initialized standard project`);

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
  fs.rmSync(path.join(FIXTURES, 'telemetry'), { recursive: true });
  fs.unlinkSync(stateFile);
  fs.unlinkSync(testScript);
}

function testTelemetryReport() {
  console.log('\n\n--- Telemetry Report Tests ---');

  // Use a clean fixture telemetry dir so prior test runs don't pollute the report.
  const fixtureTelemetryDir = path.join(FIXTURES, 'telemetry-report');
  fs.rmSync(fixtureTelemetryDir, { recursive: true, force: true });
  fs.mkdirSync(fixtureTelemetryDir, { recursive: true });

  // Set the env var so swarm_telemetry.js writes to our isolated dir.
  // swarm_telemetry.js resolves paths from process.cwd(), so we run it from the fixture dir.
  const cwd = process.cwd();
  const isolatedCwd = FIXTURES;
  fs.mkdirSync(isolatedCwd, { recursive: true });

  // Record events with agent/phase (writes to cwd/artifacts/telemetry/...)
  run(`node ${SCRIPTS}/swarm_telemetry.js record --type agent_invoke --agent founder --phase validation --data '{"tokens":5000,"duration_ms":10000}'`, { cwd: isolatedCwd });
  run(`node ${SCRIPTS}/swarm_telemetry.js record --type agent_invoke --agent researcher --phase exploration --data '{"tokens":12000,"duration_ms":20000}'`, { cwd: isolatedCwd });

  // Test report
  const r1 = run(`node ${SCRIPTS}/swarm_telemetry.js report --days 1`, { cwd: isolatedCwd });
  const j1 = JSON.parse(r1.stdout);
  assert(j1.validation && j1.validation.founder, `Expected validation.founder in report`);
  assert(j1.validation.founder.avg_tokens === 5000, `Expected 5000 avg tokens, got: ${j1.validation.founder.avg_tokens}`);
  assert(j1.exploration && j1.exploration.researcher, `Expected exploration.researcher in report`);

  // Cleanup isolated fixtures
  fs.rmSync(isolatedCwd, { recursive: true, force: true });
}

function testWiringAudit() {
  console.log('\n\n--- Wiring Audit Tests ---');

  // Test 1: All 3 previously-broken agents now have tools: field
  for (const agent of ['code-reviewer', 'performance-engineer', 'security-engineer']) {
    const content = fs.readFileSync(path.join(ROOT, '.opencode', 'agents', `${agent}.md`), 'utf8');
    assert(/^tools:\s*$/m.test(content), `Agent ${agent} missing tools: field`);
    assert(/^  write:\s*(true|false)\s*$/m.test(content), `Agent ${agent} missing write: field under tools`);
  }

  // Test 2: ALL 21 agents have permission + tools + mode blocks
  const agentFiles = fs.readdirSync(path.join(ROOT, '.opencode', 'agents'))
    .filter(f => f.endsWith('.md'));
  assert(agentFiles.length === 21, `Expected 21 agents, got ${agentFiles.length}`);
  for (const f of agentFiles) {
    const content = fs.readFileSync(path.join(ROOT, '.opencode', 'agents', f), 'utf8');
    assert(/^permission:/m.test(content), `Agent ${f} missing permission block`);
    assert(/^tools:/m.test(content), `Agent ${f} missing tools block`);
    assert(/^mode:/m.test(content), `Agent ${f} missing mode block`);
  }

  // Test 3: All 10 workflow skills have State Machine Integration section
  const workflowSkills = [
    'validate-idea', 'validate-game-idea',
    'explore-idea', 'explore-game-idea',
    'design', 'develop', 'launch', 'iterate', 'retro', 'incident'
  ];
  for (const skill of workflowSkills) {
    const skillPath = path.join(ROOT, '.opencode', 'skills', skill, 'SKILL.md');
    assert(fs.existsSync(skillPath), `Missing skill file: ${skill}`);
    const content = fs.readFileSync(skillPath, 'utf8');
    assert(/^## State Machine Integration\s*$/m.test(content),
      `Skill ${skill} missing State Machine Integration section`);
    assert(/orchestrator_state\.js status/.test(content),
      `Skill ${skill} missing start-time status check`);
    assert(/orchestrator_state\.js complete/.test(content),
      `Skill ${skill} missing end-time complete call`);
  }

  // Test 4: workflow.md references the state machine
  const workflowDoc = fs.readFileSync(path.join(ROOT, '.opencode', 'workflow.md'), 'utf8');
  assert(/orchestrator_state\.js/.test(workflowDoc),
    'workflow.md missing orchestrator_state.js reference');
  assert(/Pipeline State Machine/.test(workflowDoc),
    'workflow.md missing Pipeline State Machine section');

  // Test 5: Skills catalog mentions all 24 skills and is in sync
  const catalog = JSON.parse(fs.readFileSync(
    path.join(ROOT, '.opencode', 'skills', 'help-me', 'skills-catalog.json'), 'utf8'));
  assert(catalog.length === 24, `Catalog has ${catalog.length} skills, expected 24`);
  for (const skill of workflowSkills) {
    const found = catalog.find(s => s.name === skill);
    assert(found, `Catalog missing skill: ${skill}`);
  }

  // Test 6: All script references in skills map to existing files
  const skillFiles = fs.readdirSync(path.join(ROOT, '.opencode', 'skills'))
    .filter(d => fs.statSync(path.join(ROOT, '.opencode', 'skills', d)).isDirectory());
  for (const dir of skillFiles) {
    const content = fs.readFileSync(
      path.join(ROOT, '.opencode', 'skills', dir, 'SKILL.md'), 'utf8');
    const refs = content.match(/node \.opencode\/scripts\/([a-z_]+\.js)/g) || [];
    for (const ref of refs) {
      const script = ref.replace('node .opencode/scripts/', '');
      const scriptPath = path.join(ROOT, '.opencode', 'scripts', script);
      assert(fs.existsSync(scriptPath),
        `Skill ${dir} references missing script: ${script}`);
    }
  }

  // Test 7: All squad agents exist
  const squadFiles = fs.readdirSync(path.join(ROOT, '.opencode', 'squads'))
    .filter(f => f.endsWith('.md'));
  for (const squad of squadFiles) {
    const content = fs.readFileSync(path.join(ROOT, '.opencode', 'squads', squad), 'utf8');
    const agents = (content.match(/^  - (\S+)$/gm) || []).map(m => m.replace(/^  - /, '').trim());
    for (const agent of agents) {
      assert(fs.existsSync(path.join(ROOT, '.opencode', 'agents', `${agent}.md`)),
        `Squad ${squad} references missing agent: ${agent}`);
    }
  }

  // Test 8: End-to-end — workflow skill's complete call actually fires events
  // (Smoke test using orchestrator's full pipeline)
  const stateFile = path.join(FIXTURES, 'wiring-state.json');
  const outputDir = path.join(FIXTURES, 'wiring-output');
  const telemetryDir = path.join(FIXTURES, 'wiring-telemetry');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(telemetryDir, { recursive: true });
  fs.rmSync(stateFile, { force: true });

  const testScript = path.join(FIXTURES, 'wiring-orch.js');
  const orchestratorSrc = fs.readFileSync(path.join(SCRIPTS, 'orchestrator_state.js'), 'utf8');
  const ensureGraphPath = path.join(SCRIPTS, 'ensure_graph.js');
  // FIX: patch the `__dirname`-based paths to the actual SCRIPTS dir, since
  // the test script lives in FIXTURES and its __dirname would otherwise be wrong.
  const fixtureStructural = path.join(FIXTURES, 'wiring-structural');
  fs.rmSync(fixtureStructural, { recursive: true, force: true });
  fs.mkdirSync(fixtureStructural, { recursive: true });
  const patched = orchestratorSrc
    .replace(/const STATE_FILE = .*/, `const STATE_FILE = '${stateFile}';`)
    .replace(/const OUTPUT_DIR = .*/, `const OUTPUT_DIR = '${outputDir}';`)
    .replace(/const TELEMETRY_DIR = .*/, `const TELEMETRY_DIR = '${telemetryDir}';`)
    .replace(/require\('\.\/squads'\)/g, `require('${path.join(SCRIPTS, 'squads.js').replace(/\\/g, '\\\\')}')`)
    .replace(/artifacts\/memory\/structural/g, fixtureStructural)
    .replace(/path\.join\(__dirname, 'ensure_graph\.js'\)/g, `'${ensureGraphPath}'`)
    .replace(/path\.join\(__dirname, 'swarm_telemetry\.js'\)/g, `'${path.join(SCRIPTS, 'swarm_telemetry.js')}'`);
  fs.writeFileSync(testScript, patched);

  // Test 9: Template wiring — every template must be referenced by at least one
  // skill, agent, or other documentation file.
  const templatesDir = path.join(ROOT, '.opencode', 'templates');
  const templateFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.md'));
  for (const t of templateFiles) {
    const name = t.replace('.md', '');
    const refs = (() => {
      try {
        const out = execSync(
          `grep -rln --include="*.md" --include="*.js" "${name}" ${ROOT} 2>/dev/null | grep -v "/.git/" | grep -v "/templates/" | wc -l`,
          { encoding: 'utf8' }
        );
        return parseInt(out.trim(), 10);
      } catch (e) { return 0; }
    })();
    assert(refs > 0, `Template ${t} has no references (orphan)`);
  }

  // Test 9b: Scaffold templates exist in .opencode/commands/
  const scaffoldDir = path.join(ROOT, '.opencode', 'commands');
  for (const name of ['scaffold-agents.md', 'scaffold-agent.md', 'scaffold-claude.md']) {
    const p = path.join(scaffoldDir, name);
    assert(fs.existsSync(p), `Scaffold template ${name} missing from .opencode/commands/`);
  }

  // Simulate validate-idea → complete flow
  // Run the patched orchestrator from the fixtures dir so swarm_telemetry.js
  // (which uses process.cwd()) writes to fixtures/artifacts/telemetry
  const fixtureCwd = path.join(FIXTURES, 'wiring-cwd');
  fs.rmSync(fixtureCwd, { recursive: true, force: true });
  fs.mkdirSync(fixtureCwd, { recursive: true });

  const r1 = run(`node ${testScript} init --name "WiringTest" --type startup`, { cwd: fixtureCwd });
  assert(JSON.parse(r1.stdout).success, 'init should succeed');

  // Create the validation brief
  const discoveryDir = path.join(outputDir, '00-discovery');
  fs.mkdirSync(discoveryDir, { recursive: true });
  fs.writeFileSync(path.join(discoveryDir, 'validation-brief.md'),
    '# Validation\n\n**Version:** 1\n\nGO verdict.');

  const r2 = run(`node ${testScript} complete --agent founder --artifact 00-discovery/validation-brief.md`, { cwd: fixtureCwd });
  const j2 = JSON.parse(r2.stdout);
  assert(j2.success, 'complete should succeed');
  assert(j2.agent === 'founder', `Expected agent founder, got: ${j2.agent}`);

  // Verify telemetry captured the event
  // swarm_telemetry.js writes to process.cwd()/artifacts/telemetry
  const expectedTelemetryDir = path.join(fixtureCwd, 'artifacts', 'telemetry');
  const todayFile = path.join(expectedTelemetryDir, `events-${new Date().toISOString().split('T')[0]}.ndjson`);
  assert(fs.existsSync(todayFile), `Telemetry file should exist at ${todayFile}`);
  const events = fs.readFileSync(todayFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const founderEvent = events.find(e => e.type === 'agent_invoke' && e.data.agent === 'founder');
  assert(founderEvent, `Expected founder agent_invoke event, found types: ${events.map(e => e.type).join(',')}`);

  // Cleanup fixture cwd
  fs.rmSync(fixtureCwd, { recursive: true, force: true });

  // Cleanup
  fs.rmSync(stateFile, { force: true });
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.rmSync(telemetryDir, { recursive: true, force: true });
  fs.rmSync(fixtureStructural, { recursive: true, force: true });
  fs.rmSync(testScript, { force: true });
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
    testEnsureGraph();
    testOrchestratorEnsureGraph();
    testWiringAudit();
    testTelemetryReport();
  } catch (e) {
    console.log('Test harness error:', e.message);
    console.log(e.stack);
    process.exit(1);
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
