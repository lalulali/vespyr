const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../../.agents/scripts/lib/frontmatter.js');

describe('Skill /shut-up verification fixture', () => {
  const skillPath = path.join(__dirname, '..', '..', '.agents', 'skills', 'shut-up', 'SKILL.md');

  it('SKILL.md must exist and have valid frontmatter', () => {
    assert.strictEqual(fs.existsSync(skillPath), true, 'shut-up SKILL.md should exist');
    const content = fs.readFileSync(skillPath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);
    assert.strictEqual(frontmatter.name, 'shut-up');
    assert.ok(frontmatter.description.includes('One-shot silent execution mode'));
    assert.ok(body.length > 50);
  });

  it('pins the ultra-minimal output rule and schema contract in the skill instructions', () => {
    // Scope honesty: the withdrawn <100-token ceiling (owner amendment
    // 2026-09-01 — quantitative token budgets are unproven Vespyr claims) is
    // NOT pinned here. What IS mechanically verifiable is that the skill
    // pins an explicit ultra-minimal output rule and the allowed-output
    // schema, and that no token ceiling leaked back in.
    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(/ultra-minimal/i.test(content), 'Must pin the ultra-minimal output rule');
    assert.ok(!/\d+\s*(output\s*)?tokens/i.test(content), 'Must not re-assert a numeric token ceiling (withdrawn 2026-09-01)');
    assert.ok(/diff|file tool calls|shell command/i.test(content), 'Schema contract must name allowed output forms');
    assert.ok(!/mockOutput/.test(fs.readFileSync(__filename, 'utf8').split('Scope honesty')[0]), 'no self-referential mocks');
  });

  it('asserts destructive confirmation gate rule is present in instructions', () => {
    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(content.includes('Destructive Safety Gate Exception'), 'Must define destructive confirmation gate');
    assert.ok(content.includes('rm -rf'), 'Must explicitly mention destructive command examples');
  });

  it('asserts zero persistent memory writing rule', () => {
    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(content.includes('MUST NOT write flags or state to `project-context.md` or `active-decisions.md`'));
  });
});
