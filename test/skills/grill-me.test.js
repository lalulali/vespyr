const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../../.agents/scripts/lib/frontmatter.js');

// Scope honesty (02h T3.4 evidence regime): this fixture verifies the
// STRUCTURAL CONTRACT of /grill-me on disk — the eight universal moves,
// disposition-ledger coverage machinery, Step-0 framing requirement, and
// decision-log schema. It does NOT verify live interrogation behavior of an
// LLM session; that belongs to the eval suite (evals/suites/invariants/grill-me-spcp.json).
describe('/grill-me universal interrogation frame fixtures', () => {
  const skillPath = path.join(__dirname, '..', '..', '.agents', 'skills', 'grill-me', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf8');

  it('has valid frontmatter with name and broadened description', () => {
    const parsed = parseFrontmatter(content);
    assert.ok(parsed.hasFrontmatter, 'SKILL.md must carry frontmatter');
    assert.strictEqual(parsed.frontmatter.name, 'grill-me');
    assert.match(parsed.frontmatter.description, /ANY plan|any plan/i, 'description must claim domain-general scope');
  });

  it('states the operating model and Step-0 framing requirement', () => {
    assert.ok(content.includes('rigid about coverage, flexible about conversation'), 'operating model must be stated');
    assert.ok(content.includes('### Step 0: Subject framing'), 'Step 0 subject framing must exist');
    assert.ok(content.includes('ground-truth material'), 'ground-truth exploration must precede questioning');
    assert.ok(content.includes('What worries you most'), 'interview opens on the user\'s hottest concern');
  });

  it('defines all eight universal moves by name', () => {
    const moves = [
      'Premise & Purpose',
      'Mechanism & Structure',
      'State & Consistency',
      'Consequences & Second-Order Effects',
      'Adversarial & Exposure',
      'Failure & Recovery',
      'Cost & Sustainability',
      'Reduction & Scope Lock'
    ];
    for (const move of moves) {
      assert.ok(content.includes(`**${move}**`), `Missing universal move: ${move}`);
    }
    // Superseded engineering-instance names must not linger as branch titles.
    for (const stale of ['**Security & secrets**', '**Data mutations & invariants**', '**Blast radius & side effects**']) {
      assert.ok(!content.includes(stale), `Superseded branch title still present: ${stale}`);
    }
  });

  it('enforces the disposition ledger as the coverage contract', () => {
    assert.ok(content.includes('Disposition ledger'), 'disposition ledger section must exist');
    assert.ok(/\*\*EXAMINED\b/.test(content), 'EXAMINED state must be defined');
    assert.ok(/\*\*SKIPPED — reason\*\*/.test(content) || content.includes('**SKIPPED — reason**'), 'SKIPPED-with-reason state must be defined');
    assert.ok(content.includes('No third state exists'), 'silent-skip prohibition must be explicit');
  });

  it('carries a non-software worked instantiation (domain-generality proof)', () => {
    assert.ok(content.includes('training program'), 'non-software worked example required');
    assert.ok(content.includes('skills gap'), 'instantiation must be concrete, not abstract');
  });

  it('defines a decision-log entry schema with Decision/Rationale/Status fields', () => {
    assert.ok(content.includes('### Step 3: Decision log'), 'Decision log step must exist');
    assert.ok(/\*\*Decision:\*\*/.test(content), 'Schema must include Decision field');
    assert.ok(/\*\*Rationale:\*\*/.test(content), 'Schema must include Rationale field');
    assert.ok(/\*\*Status:\*\*/.test(content), 'Schema must include Status field');
    assert.ok(content.includes('artifacts/memory/active-decisions.md'), 'Running log target must be declared');
  });

  it('defines the summary handoff artifact and downstream routing', () => {
    assert.ok(content.includes('grill-me-decisions.md'), 'Summary handoff artifact must be named');
    assert.ok(content.includes('Handoff recommendation'), 'Summary must carry a handoff recommendation');
  });

  it('sample decision-log entries conform to the documented schema', () => {
    // Parse every fenced schema example in the skill and assert field presence,
    // so the doc cannot drift from its own contract unnoticed.
    const blocks = [...content.matchAll(/```(?:\w*\n)([\s\S]*?)```/g)].map((m) => m[1]);
    const schemaBlocks = blocks.filter((b) => b.includes('**Decision:**') && b.includes('**Status:**'));
    assert.ok(schemaBlocks.length >= 1, 'At least one decision-log schema example must exist');
    for (const block of schemaBlocks) {
      assert.ok(block.includes('**Rationale:**'), 'Schema example missing Rationale field');
      assert.ok(/AD-(?:\d{4}-\d{2}-\d{2}|YYYY-MM-DD)/.test(block), 'Schema example missing AD date header');
    }
  });
});
