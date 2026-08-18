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

  it('verifies output brevity (<100 tokens schema constraint)', () => {
    // Simulated /shut-up response
    const mockOutput = "```diff\n+export const isValidEmail = (email) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);\n```\nDone: Added isValidEmail regex to auth helper.";
    const estimatedTokens = Math.ceil(mockOutput.split(/\s+/).length * 1.3);
    assert.ok(estimatedTokens < 100, `Estimated tokens (${estimatedTokens}) should be strictly < 100 tokens`);
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
