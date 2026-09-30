const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Ported from .agents/skills/unpack-problem/test-unpack-problem.mjs, which was
// deleted in 02s (T012) as an "orphan" because nothing referenced it. It was
// green on removal (103/103) and was the only enforcement of the contracts
// below, so it now lives in the one wired test convention (tests/**/*.test.js,
// discovered by tests/run-all.js, executed by `npm test`, CI, and the
// pre-commit hook).
//
// Scope honesty: this fixture verifies the STRUCTURAL CONTRACT of
// /unpack-problem on disk — the tri-modal router, the 4 step files, the
// problem-brief template, and the cross-skill handoff wiring. It does NOT
// verify live analysis behavior of an LLM session.

const ROOT = path.join(__dirname, '..', '..');
const SKILLS = path.join(ROOT, '.agents', 'skills');
const TEMPLATES = path.join(ROOT, '.agents', 'templates');

// Assert existence first (clear failure), then return contents.
function readExisting(fullPath, label) {
  assert.ok(fs.existsSync(fullPath), `${label}: ${path.relative(ROOT, fullPath)} must exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function mustInclude(content, needle, label) {
  assert.ok(
    typeof content === 'string' && content.includes(needle),
    `${label} (expected: "${needle}")`
  );
}

describe('/unpack-problem tri-modal router, step files, and cross-skill wiring', () => {
  // ── F1.30.1 — SKILL.md with tri-modal router ─────────────────────
  it('F1.30.1 — declares the tri-modal router, personas, and handoff routing', () => {
    const skillMd = readExisting(
      path.join(SKILLS, 'unpack-problem', 'SKILL.md'),
      'unpack-problem router'
    );

    mustInclude(skillMd, 'Guided mode', 'Declares Guided mode');
    mustInclude(skillMd, 'Automated mode', 'Declares Automated mode');
    mustInclude(skillMd, 'Combination mode', 'Declares Combination mode');
    mustInclude(skillMd, 'Combination mode (default)', 'Combination is the default mode');
    mustInclude(skillMd, '@product-manager', 'Delegates to @product-manager');
    mustInclude(skillMd, '@user-researcher', 'Delegates to @user-researcher');
    mustInclude(skillMd, 'Primary personas', 'Has Primary personas section');
    mustInclude(skillMd, 'Harness adherence', 'Has harness adherence block');
    mustInclude(skillMd, 'non-negotiable', 'Harness adherence marked non-negotiable');
    mustInclude(skillMd, 'zero-solution framing', 'Enforces zero-solution framing');

    mustInclude(skillMd, 'step-01-problem-intake.md', 'Routes to step-01');
    mustInclude(skillMd, 'step-02-analysis-execution.md', 'Routes to step-02');
    mustInclude(skillMd, 'step-03-synthesis-ideation.md', 'Routes to step-03');
    mustInclude(skillMd, 'step-04-brief-generation.md', 'Routes to step-04');
    mustInclude(skillMd, 'problem-space-brief.md', 'Outputs problem-space-brief.md');

    mustInclude(skillMd, 'Handoff routing', 'Has handoff routing section');
    mustInclude(skillMd, '/validate-idea', 'Handoff routes to /validate-idea');
    mustInclude(skillMd, '/shape-up', 'Handoff routes to /shape-up');
    mustInclude(skillMd, '/explore-idea', 'Handoff routes to /explore-idea');
  });

  // ── F1.30.2 — 4 step files ───────────────────────────────────────
  it('F1.30.2 — the 4 step files carry their required sections and output contracts', () => {
    const step01 = readExisting(
      path.join(SKILLS, 'unpack-problem', 'steps', 'step-01-problem-intake.md'),
      'intake step'
    );
    mustInclude(step01, 'Problem Intake', 'Step 01 titled Problem Intake');
    mustInclude(step01, 'zero-solution framing', 'Step 01 enforces zero-solution framing');
    mustInclude(step01, 'Symptom', 'Step 01 collects symptom');
    mustInclude(step01, 'Context', 'Step 01 collects context');
    mustInclude(step01, 'Impact', 'Step 01 collects impact');
    mustInclude(step01, 'workaround', 'Step 01 collects current workaround');
    mustInclude(step01, 'park solutions', 'Step 01 redirects solution proposals');
    mustInclude(step01, 'output_contract:', 'Step 01 has output_contract frontmatter');

    const step02 = readExisting(
      path.join(SKILLS, 'unpack-problem', 'steps', 'step-02-analysis-execution.md'),
      'analysis step'
    );
    mustInclude(step02, 'Analysis Execution', 'Step 02 titled Analysis Execution');
    mustInclude(step02, 'Guided mode', 'Step 02 has Guided mode');
    mustInclude(step02, 'Automated mode', 'Step 02 has Automated mode');
    mustInclude(step02, 'Combination mode', 'Step 02 has Combination mode');
    mustInclude(step02, '[AUTO-DRAFT', 'Step 02 labels automated drafts');
    mustInclude(step02, 'output_contract:', 'Step 02 has output_contract frontmatter');

    const step03 = readExisting(
      path.join(SKILLS, 'unpack-problem', 'steps', 'step-03-synthesis-ideation.md'),
      'synthesis step'
    );
    mustInclude(step03, 'Synthesis & Ideation', 'Step 03 titled Synthesis & Ideation');
    mustInclude(step03, 'solution spaces', 'Step 03 maps to solution spaces');
    mustInclude(step03, 'Fix the root cause', 'Step 03 considers fixing root cause');
    mustInclude(step03, 'Mitigate the symptom', 'Step 03 considers mitigating symptom');
    mustInclude(step03, 'Remove the need', 'Step 03 considers removing the need');
    mustInclude(step03, 'testable hypothesis', 'Step 03 requires testable hypotheses');
    mustInclude(step03, 'confidence level', 'Step 03 assigns confidence levels');
    mustInclude(step03, 'output_contract:', 'Step 03 has output_contract frontmatter');

    const step04 = readExisting(
      path.join(SKILLS, 'unpack-problem', 'steps', 'step-04-brief-generation.md'),
      'brief generation step'
    );
    mustInclude(step04, 'Brief Generation', 'Step 04 titled Brief Generation');
    mustInclude(step04, 'problem-space-brief.md', 'Step 04 produces problem-space-brief.md');
    mustInclude(step04, 'problem-brief.md', 'Step 04 references the template');
    mustInclude(step04, 'session-write', 'Step 04 does memory closeout');
    mustInclude(step04, 'orchestrator_state.js complete', 'Step 04 runs state completion');
    mustInclude(step04, 'Handoff', 'Step 04 has handoff section');
    mustInclude(step04, 'output_contract:', 'Step 04 has output_contract frontmatter');
  });

  // ── F1.31 integration — step-02 names the 6 sub-skills ──────────
  it('F1.31 — step-02 delegates to the 6 design-thinking sub-skills by name', () => {
    const step02 = fs.readFileSync(
      path.join(SKILLS, 'unpack-problem', 'steps', 'step-02-analysis-execution.md'),
      'utf8'
    );

    mustInclude(step02, '/root-cause', 'Step 02 invokes /root-cause sub-skill');
    mustInclude(step02, '/empathy-map', 'Step 02 invokes /empathy-map sub-skill');
    mustInclude(step02, '/journey-map', 'Step 02 invokes /journey-map sub-skill');
    mustInclude(step02, '/jtbd', 'Step 02 invokes /jtbd sub-skill');
    mustInclude(step02, '/research-plan', 'Step 02 optionally invokes /research-plan');
    mustInclude(step02, 'Sub-skill delegation', 'Step 02 has sub-skill delegation section');
    mustInclude(step02, 'sub-skill', 'Step 02 references sub-skills');
  });

  // ── F1.30.3 — Template exists ────────────────────────────────────
  it('F1.30.3 — the problem-brief template carries the full Problem Space Brief shape', () => {
    const template = readExisting(
      path.join(TEMPLATES, 'discovery', 'problem-brief.md'),
      'problem-brief template'
    );

    mustInclude(template, 'Problem Space Brief', 'Template titled Problem Space Brief');
    mustInclude(template, 'Problem Statement', 'Template has Problem Statement section');
    mustInclude(template, 'Root Cause', 'Template has Root Cause section');
    mustInclude(template, 'Affected Users', 'Template has Affected Users section');
    mustInclude(template, 'Current Journey', 'Template has Current Journey section');
    mustInclude(template, 'Jobs-to-be-Done', 'Template has JTBD section');
    mustInclude(template, 'Selected Solution Concept', 'Template has Solution Concept section');
    mustInclude(template, 'Supporting Artifacts', 'Template has Supporting Artifacts section');
    mustInclude(template, 'Next Step', 'Template has Next Step section');
    mustInclude(template, '/validate-idea', 'Template wires to /validate-idea');
    mustInclude(template, '/shape-up', 'Template wires to /shape-up');
    mustInclude(template, '/explore-idea', 'Template wires to /explore-idea');
  });

  // ── F1.30.4 — wired into validate-idea, shape-up, AND explore-idea ──
  it('F1.30.4 — problem-space-brief.md is wired into validate-idea, shape-up, and explore-idea', () => {
    const validateIdea = readExisting(
      path.join(SKILLS, 'validate-idea', 'SKILL.md'),
      'validate-idea router'
    );
    mustInclude(validateIdea, 'problem-space-brief.md', 'validate-idea recognizes problem-space-brief.md');
    mustInclude(validateIdea, 'Problem-first entry', 'validate-idea has Problem-first entry path');
    mustInclude(validateIdea, '/unpack-problem', 'validate-idea references /unpack-problem');

    const shapeUp = readExisting(
      path.join(SKILLS, 'shape-up', 'SKILL.md'),
      'shape-up router'
    );
    mustInclude(shapeUp, 'problem-space-brief.md', 'shape-up recognizes problem-space-brief.md');
    mustInclude(shapeUp, 'Problem brief exists', 'shape-up has Problem brief context detection');
    mustInclude(shapeUp, 'unpack-problem', 'shape-up references unpack-problem flow');

    const exploreIdea = readExisting(
      path.join(SKILLS, 'explore-idea', 'SKILL.md'),
      'explore-idea router'
    );
    mustInclude(exploreIdea, 'problem-space-brief.md', 'explore-idea recognizes problem-space-brief.md');
    mustInclude(exploreIdea, 'Path D', 'explore-idea has Path D for problem-first entry');
    mustInclude(exploreIdea, 'unpack-problem', 'explore-idea references /unpack-problem');
  });

  // ── F1.30.5 — AGENTS.md registration ─────────────────────────────
  it('F1.30.5 — AGENTS.md registers /unpack-problem and all 6 design-thinking skills', () => {
    const agentsMd = readExisting(path.join(ROOT, 'AGENTS.md'), 'AGENTS.md');

    mustInclude(agentsMd, '/unpack-problem', 'AGENTS.md lists /unpack-problem');
    mustInclude(agentsMd, 'Problem-first exploration', 'AGENTS.md describes /unpack-problem correctly');

    mustInclude(agentsMd, '/root-cause', 'AGENTS.md lists /root-cause');
    mustInclude(agentsMd, '/research-plan', 'AGENTS.md lists /research-plan');
    mustInclude(agentsMd, '/empathy-map', 'AGENTS.md lists /empathy-map');
    mustInclude(agentsMd, '/journey-map', 'AGENTS.md lists /journey-map');
    mustInclude(agentsMd, '/jtbd', 'AGENTS.md lists /jtbd');
    mustInclude(agentsMd, '/discovery-report', 'AGENTS.md lists /discovery-report');
  });

  // ── help-me skills-catalog.json contains new skills ──────────────
  it('help-me catalog registers the full design-thinking skill set', () => {
    const catalog = readExisting(
      path.join(SKILLS, 'help-me', 'skills-catalog.json'),
      'help-me catalog'
    );

    mustInclude(catalog, 'unpack-problem', 'Catalog includes unpack-problem');
    mustInclude(catalog, 'root-cause', 'Catalog includes root-cause');
    mustInclude(catalog, 'research-plan', 'Catalog includes research-plan');
    mustInclude(catalog, 'empathy-map', 'Catalog includes empathy-map');
    mustInclude(catalog, 'journey-map', 'Catalog includes journey-map');
    mustInclude(catalog, 'jtbd', 'Catalog includes jtbd');
    mustInclude(catalog, 'discovery-report', 'Catalog includes discovery-report');
  });
});
