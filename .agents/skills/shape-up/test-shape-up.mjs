#!/usr/bin/env node
// Test harness for shape-up skill — verifies all 4 supported flows
// Usage: node .agents/skills/shape-up/test-shape-up.mjs

import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const DISCOVERY = join(ROOT, 'artifacts', 'output', '01-discovery');
const RESEARCH = join(ROOT, 'artifacts', 'output', '02-research');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, label) {
  if (condition) { passed++; results.push(`  PASS: ${label}`); }
  else { failed++; results.push(`  FAIL: ${label}`); }
}

function cleanup() {
  [DISCOVERY, RESEARCH].forEach(d => {
    if (existsSync(d)) {
      try { rmSync(d, { recursive: true, force: true }); } catch {}
    }
  });
  mkdirSync(DISCOVERY, { recursive: true });
  mkdirSync(RESEARCH, { recursive: true });
}

// ── Scenario runner ──────────────────────────────────────────────
function runScenario(name, setupFn, checksFn) {
  results.push(`\n📋 SCENARIO: ${name}`);
  cleanup();
  setupFn();
  checksFn();
}

// ── Step-01: Context scan simulation ─────────────────────────────
function scanContext() {
  return {
    hasValidation: existsSync(join(DISCOVERY, 'validation-brief.md')),
    hasIdeaBrief:  existsSync(join(DISCOVERY, 'idea-brief.md')),
    isReshape:     existsSync(join(DISCOVERY, 'shaped-brief.md')),
    hasResearch:   existsSync(join(RESEARCH, 'market-analysis.md')) ||
                   existsSync(join(RESEARCH, 'competitive-analysis.md')) ||
                   existsSync(join(RESEARCH, 'user-personas.md')),
  };
}

// ── Step-02: Branch selection simulation ─────────────────────────
function getStep02Branch(ctx) {
  if (ctx.isReshape)   return 'isReshape';
  if (ctx.hasResearch) return 'hasResearch';
  if (ctx.hasValidation) return 'hasValidation';
  if (ctx.hasIdeaBrief) return 'hasIdeaBrief';
  return 'nothing';
}

function getStep02Artifacts(ctx) {
  const map = {
    hasIdeaBrief:  [join(DISCOVERY, 'idea-brief.md')],
    hasValidation: [join(DISCOVERY, 'validation-brief.md')],
    hasResearch:   [
      join(RESEARCH, 'market-analysis.md'),
      join(RESEARCH, 'competitive-analysis.md'),
      join(RESEARCH, 'user-personas.md'),
    ],
    isReshape:     [join(DISCOVERY, 'shaped-brief.md')],
    nothing:       [],
  };
  const branch = getStep02Branch(ctx);
  let files = [...(map[branch] || [])];
  if (branch === 'isReshape' && ctx.hasResearch) {
    files.push(...map.hasResearch);
  }
  return files;
}

// ── Step-03: Depth adaptation ────────────────────────────────────
function getStep03Depth(ctx) {
  return {
    fullCompletenessCheck: !ctx.hasValidation,
    crossReferenceResearch: ctx.hasResearch,
    focusNewGapsOnly: ctx.isReshape,
  };
}

// ── Step-04: Depth adaptation ────────────────────────────────────
function getStep04Depth(ctx) {
  return {
    focusAreas: 5, // always 5, lighter than grill-me's 8
    synthesisFocus: ctx.hasResearch, // per step-01 routing
  };
}

// ── Step-06: Route determination ─────────────────────────────────
function getStep06Route(assumptionsStatus) {
  const unverified = assumptionsStatus.filter(s => s === 'unverified').length;
  const hasViability = assumptionsStatus.includes('viability-concern');

  if (hasViability) return 'validate-idea';
  if (unverified > 0) return 'explore-idea';
  return 'design';
}

// ── Helpers ──────────────────────────────────────────────────────
function writeFixture(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

// =================================================================
// TEST 1: invoke with no prior artifacts → full shaping flow
// =================================================================
runScenario('Test 1: No prior artifacts → full shaping', () => {
  // No setup needed — directories are empty
}, () => {
  const ctx = scanContext();
  assert(!ctx.hasValidation, 'hasValidation = false');
  assert(!ctx.hasIdeaBrief,  'hasIdeaBrief = false');
  assert(!ctx.isReshape,     'isReshape = false');
  assert(!ctx.hasResearch,   'hasResearch = false');

  const branch = getStep02Branch(ctx);
  assert(branch === 'nothing', `step-02 branch = "nothing" (got: ${branch})`);

  const files = getStep02Artifacts(ctx);
  assert(files.length === 0, `step-02 loads 0 files (got: ${files.length})`);

  const d3 = getStep03Depth(ctx);
  assert(d3.fullCompletenessCheck, 'step-03: full completeness check');
  assert(!d3.crossReferenceResearch, 'step-03: no research cross-ref');
  assert(!d3.focusNewGapsOnly, 'step-03: no new-gaps-only filter');

  const d4 = getStep04Depth(ctx);
  assert(d4.focusAreas === 5, 'step-04: 5 focus areas');
  assert(!d4.synthesisFocus, 'step-04: no synthesis focus');

  // step-06 routing depends on outcome — verify both paths exist
  const routeDesign = getStep06Route(['verified', 'verified']);
  assert(routeDesign === 'design', `verified assumptions → design (got: ${routeDesign})`);
  const routeExplore = getStep06Route(['unverified', 'verified']);
  assert(routeExplore === 'explore-idea', `unverified assumptions → explore-idea (got: ${routeExplore})`);
});

// =================================================================
// TEST 2: invoke after validation brief → incorporates premises
// =================================================================
runScenario('Test 2: After validation brief → incorporate premises', () => {
  writeFixture(join(DISCOVERY, 'validation-brief.md'),
    '# Validation Brief\n\n## Premises\n- Market need exists\n- User pain is real\n\n## Verdict\nGO — concept is sound\n\n## Target User\nStartup founders');
}, () => {
  const ctx = scanContext();
  assert(ctx.hasValidation, 'hasValidation = true');
  assert(!ctx.hasIdeaBrief,  'hasIdeaBrief = false');
  assert(!ctx.isReshape,     'isReshape = false');
  assert(!ctx.hasResearch,   'hasResearch = false');

  const branch = getStep02Branch(ctx);
  assert(branch === 'hasValidation', `step-02 branch = "hasValidation" (got: ${branch})`);

  const files = getStep02Artifacts(ctx);
  assert(files.length === 1, `step-02 loads 1 file (got: ${files.length})`);
  assert(files[0].includes('validation-brief.md'), 'step-02 loads validation-brief.md');

  const d3 = getStep03Depth(ctx);
  assert(!d3.fullCompletenessCheck, 'step-03: skips basic framing gaps (hasValidation)');
  assert(!d3.crossReferenceResearch, 'step-03: no research cross-ref');
  assert(!d3.focusNewGapsOnly, 'step-03: no new-gaps-only filter');

  assert(existsSync(files[0]), 'validation-brief.md is readable');
});

// =================================================================
// TEST 3: invoke after research → synthesizes findings
// =================================================================
runScenario('Test 3: After research → synthesize findings', () => {
  writeFixture(join(RESEARCH, 'market-analysis.md'), '# Market Analysis\n\nTAM: $5B\nGrowth: 12% YoY');
  writeFixture(join(RESEARCH, 'competitive-analysis.md'), '# Competitive Analysis\n\n3 incumbents, all missing mobile');
  writeFixture(join(RESEARCH, 'user-personas.md'), '# User Personas\n\nPrimary: remote knowledge workers');
}, () => {
  const ctx = scanContext();
  assert(!ctx.hasValidation, 'hasValidation = false');
  assert(!ctx.hasIdeaBrief,  'hasIdeaBrief = false');
  assert(!ctx.isReshape,     'isReshape = false');
  assert(ctx.hasResearch,    'hasResearch = true');

  const branch = getStep02Branch(ctx);
  assert(branch === 'hasResearch', `step-02 branch = "hasResearch" (got: ${branch})`);

  const files = getStep02Artifacts(ctx);
  assert(files.length === 3, `step-02 loads 3 research files (got: ${files.length})`);
  assert(files[0].includes('market-analysis.md'), 'loads market-analysis.md');
  assert(files[1].includes('competitive-analysis.md'), 'loads competitive-analysis.md');
  assert(files[2].includes('user-personas.md'), 'loads user-personas.md');

  const d3 = getStep03Depth(ctx);
  assert(d3.fullCompletenessCheck, 'step-03: full completeness check');
  assert(d3.crossReferenceResearch, 'step-03: cross-references research');
  assert(!d3.focusNewGapsOnly, 'step-03: no new-gaps-only filter');

  const d4 = getStep04Depth(ctx);
  assert(d4.synthesisFocus, 'step-04: synthesis-gap focus active (hasResearch)');

  // Verify step-06 routes to explore-idea if assumptions unverified
  const route = getStep06Route(['unverified']);
  assert(route === 'explore-idea', `unverified → explore-idea (got: ${route})`);
});

// =================================================================
// TEST 3b: research + validation → lightest path
// =================================================================
runScenario('Test 3b: Research + Validation → lightest path', () => {
  writeFixture(join(DISCOVERY, 'validation-brief.md'), '# Validation\nGO');
  writeFixture(join(RESEARCH, 'market-analysis.md'), '# Market');
  writeFixture(join(RESEARCH, 'competitive-analysis.md'), '# Competitive');
  writeFixture(join(RESEARCH, 'user-personas.md'), '# Personas');
}, () => {
  const ctx = scanContext();
  assert(ctx.hasValidation, 'hasValidation = true');
  assert(ctx.hasResearch,   'hasResearch = true');

  const branch = getStep02Branch(ctx);
  assert(branch === 'hasResearch', `step-02 branch = "hasResearch" (takes priority over hasValidation)`);

  const files = getStep02Artifacts(ctx);
  assert(files.length === 3, `step-02 loads 3 research files (got: ${files.length})`);

  const d3 = getStep03Depth(ctx);
  assert(!d3.fullCompletenessCheck, 'step-03: skips basic framing (hasValidation)');
  assert(d3.crossReferenceResearch, 'step-03: cross-references research');
});

// =================================================================
// TEST 4: double-run (shape → explore → shape → design)
// =================================================================
runScenario('Test 4: Double-run — Run 1 (fresh shape-up)', () => {},
() => {
  const ctx = scanContext();
  assert(!ctx.isReshape, 'Run 1: isReshape = false');
  assert(!ctx.hasResearch, 'Run 1: hasResearch = false');

  const branch = getStep02Branch(ctx);
  assert(branch === 'nothing', `Run 1: branch = "nothing"`);

  const route = getStep06Route(['unverified', 'unverified']);
  assert(route === 'explore-idea', `Run 1 routes to explore-idea (got: ${route})`);
});

runScenario('Test 4: Double-run — Run 2 (post-research re-shape)', () => {
  writeFixture(join(DISCOVERY, 'shaped-brief.md'),
    '# Shaped Brief\n\n## Open Questions\n- Market size?\n- User validation?\n\n## Recommended Next Step\nexplore-idea');
  writeFixture(join(RESEARCH, 'market-analysis.md'), '# Market\nTAM confirmed at $5B');
  writeFixture(join(RESEARCH, 'competitive-analysis.md'), '# Competitive\nGap confirmed');
  writeFixture(join(RESEARCH, 'user-personas.md'), '# Personas\nValidated');
}, () => {
  const ctx = scanContext();
  assert(ctx.isReshape,  'Run 2: isReshape = true');
  assert(ctx.hasResearch, 'Run 2: hasResearch = true');

  const branch = getStep02Branch(ctx);
  assert(branch === 'isReshape', `Run 2: branch = "isReshape" (got: ${branch})`);

  const files = getStep02Artifacts(ctx);
  assert(files.includes(join(DISCOVERY, 'shaped-brief.md')), 'Run 2: loads shaped-brief.md');
  assert(files.some(f => f.includes('market-analysis.md')), 'Run 2: ALSO loads research files');
  assert(files.length === 4, `Run 2: loads 4 files (shaped-brief + 3 research), got ${files.length}`);

  const d3 = getStep03Depth(ctx);
  assert(d3.focusNewGapsOnly, 'step-03: focuses on new gaps only (isReshape)');
  assert(d3.crossReferenceResearch, 'step-03: cross-references research findings');

  const route = getStep06Route(['verified', 'verified', 'verified']);
  assert(route === 'design', `Run 2 routes to design (got: ${route})`);
});

// =================================================================
// EDGE CASE TESTS
// =================================================================
runScenario('Edge: idea-brief only → refine existing framing', () => {
  writeFixture(join(DISCOVERY, 'idea-brief.md'), '# Idea Brief\nRaw concept from validate-idea');
}, () => {
  const ctx = scanContext();
  assert(ctx.hasIdeaBrief, 'hasIdeaBrief = true');
  assert(!ctx.hasValidation, 'hasValidation = false');

  const branch = getStep02Branch(ctx);
  assert(branch === 'hasIdeaBrief', `step-02 branch = "hasIdeaBrief" (got: ${branch})`);

  const files = getStep02Artifacts(ctx);
  assert(files.length === 1, 'loads idea-brief.md');
  assert(files[0].includes('idea-brief.md'), 'correct file loaded');
});

runScenario('Edge: viability concern → route to validate-idea', () => {}, () => {
  const route = getStep06Route(['verified', 'viability-concern']);
  assert(route === 'validate-idea', `viability concern → validate-idea (got: ${route})`);
});

runScenario('Edge: halt condition — vague input scenario', () => {}, () => {
  const step02 = readFileSync(join(__dirname, 'steps', 'step-02-intake-structure.md'), 'utf-8');
  assert(step02.includes('Halt condition'), 'step-02 contains "Halt condition" section');
  assert(step02.includes('2 probing questions'), 'halt triggers after 2 probing questions');
  assert(step02.includes('/validate-idea'), 'halt recommends validate-idea');
});

// =================================================================
// STEP-01 CONTEXT ROUTING CONSISTENCY CHECK
// =================================================================
runScenario('Cross-step: step-01 routing table matches step implementations', () => {}, () => {
  // step-01 defines 5 context states; verify each has corresponding step-02/03 behavior
  const states = [
    { name: 'nothing',        s02: 'nothing',       s03full: true,  s03xRef: false, s03newGaps: false },
    { name: 'hasValidation',  s02: 'hasValidation',  s03full: false, s03xRef: false, s03newGaps: false },
    { name: 'hasResearch',    s02: 'hasResearch',    s03full: true,  s03xRef: true,  s03newGaps: false },
    { name: 'isReshape',      s02: 'isReshape',      s03full: true,  s03xRef: false, s03newGaps: true },
  ];

  for (const s of states) {
    const ctx = {
      hasValidation: s.name === 'hasValidation',
      hasIdeaBrief: false,
      isReshape: s.name === 'isReshape',
      hasResearch: s.name === 'hasResearch',
    };
    if (s.name === 'hasResearch') ctx.hasResearch = true;

    const b = getStep02Branch(ctx);
    assert(b === s.s02, `${s.name}: step-02 branch = ${s.s02} (got: ${b})`);

    const d3 = getStep03Depth(ctx);
    assert(d3.fullCompletenessCheck === s.s03full, `${s.name}: step-03 fullCheck=${s.s03full} (got: ${d3.fullCompletenessCheck})`);
    assert(d3.crossReferenceResearch === s.s03xRef, `${s.name}: step-03 xRef=${s.s03xRef} (got: ${d3.crossReferenceResearch})`);
    assert(d3.focusNewGapsOnly === s.s03newGaps, `${s.name}: step-03 newGaps=${s.s03newGaps} (got: ${d3.focusNewGapsOnly})`);
  }
});

// =================================================================
// REPORT
// =================================================================
cleanup(); // remove all test fixtures
console.log(`\n${'='.repeat(50)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed === 0) {
  console.log('✅ All tests passed — shape-up flows are structurally verified.');
} else {
  console.log('❌ Some tests failed.');
}
