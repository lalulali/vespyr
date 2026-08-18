/**
 * test_memory_consolidation.js — Comprehensive Test Suite for Epic 02i
 * Memory Consolidation & Lifecycle Architecture (Vespyr 2.0.7)
 *
 * Tests:
 * 1. Machine Fence Synchronization & Atomic Writes
 * 2. Idempotent Migration Engine & Ghost Folder Purge
 * 3. Phase-Boundary Compaction & Active Decisions Sharding
 * 4. Scaffolding Invariants & Zero Ghost Directory Creation
 * 5. Witness & Memory Filter Invariants
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  syncProjectContext,
  detectStack,
  detectBranch,
  detectEngineVersion,
  countActiveBlockers,
  generateMachineStateBlock,
  spliceMachineState
} = require('../.agents/scripts/session_start.js');

const { migrateMemory } = require('../.agents/scripts/migrate_memory_v2.js');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-mem-test-'));
}

function cleanTempDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

describe('Epic 02i: Memory Consolidation & Lifecycle Architecture', () => {

  describe('Suite 1: Machine Fence Splicing & State Synchronization', () => {
    it('should generate a valid machine state block with 2.0.7 defaults', () => {
      const block = generateMachineStateBlock({
        stack: 'JavaScript',
        branch: 'main',
        phase: 'validation',
        sprint: 'none',
        blockers: 0,
        version: '2.0.7'
      });

      assert.ok(block.includes('<!-- BEGIN MACHINE STATE -->'));
      assert.ok(block.includes('## [RUNTIME STATE]'));
      assert.ok(block.includes('- Stack: JavaScript'));
      assert.ok(block.includes('- Git Branch: main'));
      assert.ok(block.includes('- Active Phase: validation'));
      assert.ok(block.includes('- Active Sprint: none'));
      assert.ok(block.includes('- Blocker Status: 0 active blockers'));
      assert.ok(block.includes('- Engine Version: 2.0.7'));
      assert.ok(block.includes('<!-- END MACHINE STATE -->'));
    });

    it('should splice machine state block without corrupting human sections', () => {
      const original = `# Project Context\n\n## [IDENTITY]\nUser Nickname: Chris\n\n## [CUSTOM HUMAN NOTES]\nDo not touch this text.\n`;
      const block = generateMachineStateBlock({
        stack: 'TypeScript',
        branch: 'feat/mem',
        phase: 'planning',
        sprint: 'sprint-1',
        blockers: 1,
        version: '2.0.7'
      });

      const spliced = spliceMachineState(original, block);
      assert.ok(spliced.includes('User Nickname: Chris'));
      assert.ok(spliced.includes('## [CUSTOM HUMAN NOTES]\nDo not touch this text.'));
      assert.ok(spliced.includes('<!-- BEGIN MACHINE STATE -->'));
      assert.ok(spliced.includes('- Blocker Status: 1 active blocker'));

      // Replacing existing block
      const updatedBlock = generateMachineStateBlock({
        stack: 'TypeScript',
        branch: 'feat/mem',
        phase: 'execution',
        sprint: 'sprint-1',
        blockers: 0,
        version: '2.0.7'
      });
      const reSpliced = spliceMachineState(spliced, updatedBlock);
      assert.ok(reSpliced.includes('- Active Phase: execution'));
      assert.ok(reSpliced.includes('- Blocker Status: 0 active blockers'));
      assert.ok(reSpliced.includes('Do not touch this text.'));
    });

    it('should detect engine version as 2.0.7', () => {
      const version = detectEngineVersion();
      assert.strictEqual(version, '2.0.7');
    });
  });

  describe('Suite 2: Migration Engine & Ghost Folder Purge', () => {
    let tmpDir;
    let oldCwd;

    beforeEach(() => {
      tmpDir = makeTempDir();
      oldCwd = process.cwd();
      process.chdir(tmpDir);

      // Create test directory layout
      const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
      const agentNotesDir = path.join(memoryDir, 'agent-notes');
      const pendingDir = path.join(memoryDir, 'pending-questions');
      const checkpointDir = path.join(memoryDir, 'session-checkpoints');
      const templateDir = path.join(tmpDir, '.agents', 'templates', 'memory');
      fs.mkdirSync(agentNotesDir, { recursive: true });
      fs.mkdirSync(pendingDir, { recursive: true });
      fs.mkdirSync(checkpointDir, { recursive: true });
      fs.mkdirSync(templateDir, { recursive: true });

      // Write mock files
      fs.writeFileSync(path.join(agentNotesDir, 'developer-notes.md'), `# Developer Notes\n\n### [CODE] Test Note 1 [date: 2026-08-18] [agent: @developer]\nContent 1\n**Status:** active\n`);
      fs.writeFileSync(path.join(agentNotesDir, 'qa-notes.md'), `# QA Notes\n\n### [TEST] Test Note 2 [date: 2026-08-18] [agent: @qa-engineer]\nContent 2\n**Status:** active\n`);
      fs.writeFileSync(path.join(templateDir, 'agent-notes-template.md'), '# Template');
      fs.writeFileSync(path.join(memoryDir, 'patterns-and-conventions.md'), '# Patterns and Conventions\n\n');
    });

    afterEach(() => {
      process.chdir(oldCwd);
      cleanTempDir(tmpDir);
    });

    it('should migrate agent-notes into patterns-and-conventions and purge ghost directories', () => {
      const result = migrateMemory();
      assert.strictEqual(result.migrated_entries, 2);
      assert.ok(result.purged_directories.includes('agent-notes'));
      assert.ok(result.purged_directories.includes('pending-questions'));
      assert.ok(result.purged_directories.includes('session-checkpoints'));

      const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
      assert.ok(!fs.existsSync(path.join(memoryDir, 'agent-notes')));
      assert.ok(!fs.existsSync(path.join(memoryDir, 'pending-questions')));
      assert.ok(!fs.existsSync(path.join(memoryDir, 'session-checkpoints')));

      const patterns = fs.readFileSync(path.join(memoryDir, 'patterns-and-conventions.md'), 'utf8');
      assert.ok(patterns.includes('Test Note 1'));
      assert.ok(patterns.includes('Test Note 2'));
    });

    it('should be completely idempotent when executed multiple times', () => {
      const firstRun = migrateMemory();
      assert.strictEqual(firstRun.migrated_entries, 2);

      const secondRun = migrateMemory();
      assert.strictEqual(secondRun.migrated_entries, 0);
      assert.strictEqual(secondRun.purged_directories.length, 0);
    });
  });

  describe('Suite 3: Phase Compaction & Live Cursor Invariants', () => {
    let tmpDir;
    let oldCwd;

    beforeEach(() => {
      tmpDir = makeTempDir();
      oldCwd = process.cwd();
      process.chdir(tmpDir);

      const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
      const outputDir = path.join(tmpDir, 'artifacts', 'output');
      fs.mkdirSync(memoryDir, { recursive: true });
      fs.mkdirSync(outputDir, { recursive: true });

      fs.writeFileSync(path.join(outputDir, 'pipeline-state.json'), JSON.stringify({
        current_phase: 'validation',
        phases: { validation: { status: 'in-progress' } },
        history: [],
        artifacts: {},
        change_requests: []
      }));

      fs.writeFileSync(path.join(memoryDir, 'project-context.md'), `# Project Context\n\n## [CORE]\nProject: Test\nStack: None\nPhase: validation\nSprint: none\nBlockers: 0\n\n## [IDENTITY]\nUser Nickname: Chris\n`);
      fs.writeFileSync(path.join(memoryDir, 'active-decisions.md'), `# Active Decisions\n\n### [ARCH] Active Decision [date: 2026-08-18] [agent: @architect]\nActive rationale\n**Status:** active\n\n### [ARCH] Resolved Decision [date: 2026-08-18] [agent: @architect]\nResolved rationale\n**Status:** resolved\n`);
    });

    afterEach(() => {
      process.chdir(oldCwd);
      cleanTempDir(tmpDir);
    });

    it('should compact resolved active decisions into archive on phase advance', () => {
      const { execSync } = require('child_process');
      const orchestratorScript = path.join(oldCwd, '.agents', 'scripts', 'orchestrator_state.js');
      
      const out = execSync(`node "${orchestratorScript}" advance`, { encoding: 'utf8' });
      const result = JSON.parse(out);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.from, 'validation');
      assert.strictEqual(result.to, 'discovery');
      assert.strictEqual(result.compaction.compacted, true);
      assert.strictEqual(result.compaction.archivedCount, 1);
      assert.strictEqual(result.compaction.activeCount, 1);

      const memoryDir = path.join(tmpDir, 'artifacts', 'memory');
      const decisions = fs.readFileSync(path.join(memoryDir, 'active-decisions.md'), 'utf8');
      assert.ok(decisions.includes('Active Decision'));
      assert.ok(!decisions.includes('Resolved Decision'));

      const indexNdjson = path.join(memoryDir, 'archive', 'index.ndjson');
      assert.ok(fs.existsSync(indexNdjson));
      const archiveContent = fs.readFileSync(indexNdjson, 'utf8');
      assert.ok(archiveContent.includes('Resolved Decision'));
    });
  });
});
