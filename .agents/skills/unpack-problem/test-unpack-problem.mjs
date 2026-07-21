#!/usr/bin/env node
// Test harness for /unpack-problem skill (F1.30) — verifies tri-modal router, step files, and cross-skill wiring
// Usage: node .agents/skills/unpack-problem/test-unpack-problem.mjs
//
// Verifies:
//   1. SKILL.md has tri-modal router (guided, automated, combination) (F1.30.1)
//   2. 4 step files exist with correct content (F1.30.2)
//   3. problem-brief.md template exists (F1.30.3)
//   4. problem-space-brief.md wired into validate-idea, shape-up, AND explore-idea prerequisites (F1.30.4)
//   5. AGENTS.md lists /unpack-problem (F1.30.5)
//   6. Step-02 explicitly references the 6 standalone design thinking sub-skills (F1.31 integration)
//   7. Primary personas declared (@product-manager, @user-researcher)
//   8. Harness adherence block present

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const SKILLS = join(ROOT, '.agents', 'skills');
const TEMPLATES = join(ROOT, '.agents', 'templates');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, label) {
  if (condition) { passed++; results.push(`  PASS: ${label}`); }
  else { failed++; results.push(`  FAIL: ${label}`); }
}

function assertIncludes(haystack, needle, label) {
  const cond = typeof haystack === 'string' && haystack.includes(needle);
  assert(cond, `${label} (expected: "${needle}")`);
}

function readFile(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

function checkFileExists(relPath, label) {
  const fullPath = join(SKILLS, relPath);
  assert(existsSync(fullPath), `${label}: ${relPath} exists`);
  return readFile(fullPath);
}

// ── F1.30.1 — SKILL.md with tri-modal router ─────────────────────

results.push('\n📋 SCENARIO: F1.30.1 — tri-modal router (guided/automated/combination)');

const skillMd = checkFileExists('unpack-problem/SKILL.md', 'unpack-problem router');
if (skillMd) {
  assertIncludes(skillMd, 'Guided mode', 'Declares Guided mode');
  assertIncludes(skillMd, 'Automated mode', 'Declares Automated mode');
  assertIncludes(skillMd, 'Combination mode', 'Declares Combination mode');
  assertIncludes(skillMd, 'Combination mode (default)', 'Combination is the default mode');
  assertIncludes(skillMd, '@product-manager', 'Delegates to @product-manager');
  assertIncludes(skillMd, '@user-researcher', 'Delegates to @user-researcher');
  assertIncludes(skillMd, 'Primary personas', 'Has Primary personas section');
  assertIncludes(skillMd, 'Harness adherence', 'Has harness adherence block');
  assertIncludes(skillMd, 'non-negotiable', 'Harness adherence marked non-negotiable');
  assertIncludes(skillMd, 'zero-solution framing', 'Enforces zero-solution framing');
  assertIncludes(skillMd, 'step-01-problem-intake.md', 'Routes to step-01');
  assertIncludes(skillMd, 'step-02-analysis-execution.md', 'Routes to step-02');
  assertIncludes(skillMd, 'step-03-synthesis-ideation.md', 'Routes to step-03');
  assertIncludes(skillMd, 'step-04-brief-generation.md', 'Routes to step-04');
  assertIncludes(skillMd, 'problem-space-brief.md', 'Outputs problem-space-brief.md');
  assertIncludes(skillMd, 'Handoff routing', 'Has handoff routing section');
  assertIncludes(skillMd, '/validate-idea', 'Handoff routes to /validate-idea');
  assertIncludes(skillMd, '/shape-up', 'Handoff routes to /shape-up');
  assertIncludes(skillMd, '/explore-idea', 'Handoff routes to /explore-idea');
}

// ── F1.30.2 — 4 step files ───────────────────────────────────────

results.push('\n📋 SCENARIO: F1.30.2 — 4 step files with correct content');

const step01 = checkFileExists('unpack-problem/steps/step-01-problem-intake.md', 'intake step');
if (step01) {
  assertIncludes(step01, 'Problem Intake', 'Step 01 titled Problem Intake');
  assertIncludes(step01, 'zero-solution framing', 'Step 01 enforces zero-solution framing');
  assertIncludes(step01, 'Symptom', 'Step 01 collects symptom');
  assertIncludes(step01, 'Context', 'Step 01 collects context');
  assertIncludes(step01, 'Impact', 'Step 01 collects impact');
  assertIncludes(step01, 'workaround', 'Step 01 collects current workaround');
  assertIncludes(step01, 'park solutions', 'Step 01 redirects solution proposals');
  assertIncludes(step01, 'delegation:', 'Step 01 has delegation frontmatter');
}

const step02 = checkFileExists('unpack-problem/steps/step-02-analysis-execution.md', 'analysis step');
if (step02) {
  assertIncludes(step02, 'Analysis Execution', 'Step 02 titled Analysis Execution');
  assertIncludes(step02, 'Guided mode', 'Step 02 has Guided mode');
  assertIncludes(step02, 'Automated mode', 'Step 02 has Automated mode');
  assertIncludes(step02, 'Combination mode', 'Step 02 has Combination mode');
  assertIncludes(step02, '[AUTO-DRAFT]', 'Step 02 labels automated drafts');
  assertIncludes(step02, 'delegation:', 'Step 02 has delegation frontmatter');

  // F1.31 integration — must explicitly reference the 6 sub-skills
  results.push('\n📋 SCENARIO: F1.31 integration — step-02 references 6 sub-skills by name');
  assertIncludes(step02, '/root-cause', 'Step 02 invokes /root-cause sub-skill');
  assertIncludes(step02, '/empathy-map', 'Step 02 invokes /empathy-map sub-skill');
  assertIncludes(step02, '/journey-map', 'Step 02 invokes /journey-map sub-skill');
  assertIncludes(step02, '/jtbd', 'Step 02 invokes /jtbd sub-skill');
  assertIncludes(step02, '/research-plan', 'Step 02 optionally invokes /research-plan');
  assertIncludes(step02, 'Sub-skill delegation', 'Step 02 has sub-skill delegation section');
  assertIncludes(step02, 'sub-skill', 'Step 02 references sub-skills');
}

const step03 = checkFileExists('unpack-problem/steps/step-03-synthesis-ideation.md', 'synthesis step');
if (step03) {
  assertIncludes(step03, 'Synthesis & Ideation', 'Step 03 titled Synthesis & Ideation');
  assertIncludes(step03, 'solution spaces', 'Step 03 maps to solution spaces');
  assertIncludes(step03, 'Fix the root cause', 'Step 03 considers fixing root cause');
  assertIncludes(step03, 'Mitigate the symptom', 'Step 03 considers mitigating symptom');
  assertIncludes(step03, 'Remove the need', 'Step 03 considers removing the need');
  assertIncludes(step03, 'testable hypothesis', 'Step 03 requires testable hypotheses');
  assertIncludes(step03, 'confidence level', 'Step 03 assigns confidence levels');
  assertIncludes(step03, 'delegation:', 'Step 03 has delegation frontmatter');
}

const step04 = checkFileExists('unpack-problem/steps/step-04-brief-generation.md', 'brief generation step');
if (step04) {
  assertIncludes(step04, 'Brief Generation', 'Step 04 titled Brief Generation');
  assertIncludes(step04, 'problem-space-brief.md', 'Step 04 produces problem-space-brief.md');
  assertIncludes(step04, 'problem-brief.md', 'Step 04 references the template');
  assertIncludes(step04, 'session-write', 'Step 04 does memory closeout');
  assertIncludes(step04, 'orchestrator_state.js complete', 'Step 04 runs state completion');
  assertIncludes(step04, 'Handoff', 'Step 04 has handoff section');
  assertIncludes(step04, 'delegation:', 'Step 04 has delegation frontmatter');
}

// ── F1.30.3 — Template exists ────────────────────────────────────

results.push('\n📋 SCENARIO: F1.30.3 — problem-brief.md template');

const templatePath = join(TEMPLATES, 'discovery', 'problem-brief.md');
const template = readFile(templatePath);
assert(template !== null, 'templates/discovery/problem-brief.md exists');
if (template) {
  assertIncludes(template, 'Problem Space Brief', 'Template titled Problem Space Brief');
  assertIncludes(template, 'Problem Statement', 'Template has Problem Statement section');
  assertIncludes(template, 'Root Cause', 'Template has Root Cause section');
  assertIncludes(template, 'Affected Users', 'Template has Affected Users section');
  assertIncludes(template, 'Current Journey', 'Template has Current Journey section');
  assertIncludes(template, 'Jobs-to-be-Done', 'Template has JTBD section');
  assertIncludes(template, 'Selected Solution Concept', 'Template has Solution Concept section');
  assertIncludes(template, 'Supporting Artifacts', 'Template has Supporting Artifacts section');
  assertIncludes(template, 'Next Step', 'Template has Next Step section');
  assertIncludes(template, '/validate-idea', 'Template wires to /validate-idea');
  assertIncludes(template, '/shape-up', 'Template wires to /shape-up');
  assertIncludes(template, '/explore-idea', 'Template wires to /explore-idea');
}

// ── F1.30.4 — Wired into validate-idea, shape-up, AND explore-idea ──

results.push('\n📋 SCENARIO: F1.30.4 — cross-skill wiring (validate-idea + shape-up + explore-idea)');

const validateIdea = readFile(join(SKILLS, 'validate-idea', 'SKILL.md'));
assert(validateIdea !== null, 'validate-idea/SKILL.md exists');
if (validateIdea) {
  assertIncludes(validateIdea, 'problem-space-brief.md', 'validate-idea recognizes problem-space-brief.md');
  assertIncludes(validateIdea, 'Problem-first entry', 'validate-idea has Problem-first entry path');
  assertIncludes(validateIdea, '/unpack-problem', 'validate-idea references /unpack-problem');
}

const shapeUp = readFile(join(SKILLS, 'shape-up', 'SKILL.md'));
assert(shapeUp !== null, 'shape-up/SKILL.md exists');
if (shapeUp) {
  assertIncludes(shapeUp, 'problem-space-brief.md', 'shape-up recognizes problem-space-brief.md');
  assertIncludes(shapeUp, 'Problem brief exists', 'shape-up has Problem brief context detection');
  assertIncludes(shapeUp, 'unpack-problem', 'shape-up references unpack-problem flow');
}

const exploreIdea = readFile(join(SKILLS, 'explore-idea', 'SKILL.md'));
assert(exploreIdea !== null, 'explore-idea/SKILL.md exists');
if (exploreIdea) {
  assertIncludes(exploreIdea, 'problem-space-brief.md', 'explore-idea recognizes problem-space-brief.md');
  assertIncludes(exploreIdea, 'Path D', 'explore-idea has Path D for problem-first entry');
  assertIncludes(exploreIdea, 'problem-space-brief.md', 'explore-idea Path D references the brief');
  assertIncludes(exploreIdea, 'unpack-problem', 'explore-idea references /unpack-problem');
}

// ── F1.30.5 — AGENTS.md lists /unpack-problem ────────────────────

results.push('\n📋 SCENARIO: F1.30.5 — AGENTS.md registration');

const agentsMd = readFile(join(ROOT, 'AGENTS.md'));
assert(agentsMd !== null, 'AGENTS.md exists');
if (agentsMd) {
  assertIncludes(agentsMd, '/unpack-problem', 'AGENTS.md lists /unpack-problem');
  assertIncludes(agentsMd, 'Problem-first exploration', 'AGENTS.md describes /unpack-problem correctly');
}

// ── F1.31 integration — all 6 design thinking skills registered ──

results.push('\n📋 SCENARIO: F1.31 integration — all 6 design thinking skills in AGENTS.md');

if (agentsMd) {
  assertIncludes(agentsMd, '/root-cause', 'AGENTS.md lists /root-cause');
  assertIncludes(agentsMd, '/research-plan', 'AGENTS.md lists /research-plan');
  assertIncludes(agentsMd, '/empathy-map', 'AGENTS.md lists /empathy-map');
  assertIncludes(agentsMd, '/journey-map', 'AGENTS.md lists /journey-map');
  assertIncludes(agentsMd, '/jtbd', 'AGENTS.md lists /jtbd');
  assertIncludes(agentsMd, '/discovery-report', 'AGENTS.md lists /discovery-report');
}

// ── help-me skills-catalog.json contains new skills ──────────────

results.push('\n📋 SCENARIO: help-me catalog integration');

const catalog = readFile(join(SKILLS, 'help-me', 'skills-catalog.json'));
assert(catalog !== null, 'skills-catalog.json exists');
if (catalog) {
  assertIncludes(catalog, 'unpack-problem', 'Catalog includes unpack-problem');
  assertIncludes(catalog, 'root-cause', 'Catalog includes root-cause');
  assertIncludes(catalog, 'research-plan', 'Catalog includes research-plan');
  assertIncludes(catalog, 'empathy-map', 'Catalog includes empathy-map');
  assertIncludes(catalog, 'journey-map', 'Catalog includes journey-map');
  assertIncludes(catalog, 'jtbd', 'Catalog includes jtbd');
  assertIncludes(catalog, 'discovery-report', 'Catalog includes discovery-report');
}

// ── Summary ───────────────────────────────────────────────────────

results.push(`\n──────────────────────────────────────────`);
results.push(`✓ Passed: ${passed}`);
results.push(`✗ Failed: ${failed}`);
results.push(`Total assertions: ${passed + failed}`);

console.log(results.join('\n'));

if (failed > 0) {
  console.log('\n❌ /unpack-problem verification FAILED — see FAIL lines above');
  process.exit(1);
} else {
  console.log('\n✅ /unpack-problem verification PASSED — all gates verified');
  process.exit(0);
}
