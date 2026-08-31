const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Vespyr Core DNA & Anti-Sycophancy Invariants', () => {
  const rootDir = path.join(__dirname, '..');
  const dnaPath = path.join(rootDir, '.agents', 'references', 'vespyr-dna.md');
  const agentsPath = path.join(rootDir, 'AGENTS.md');
  const agentPath = path.join(rootDir, 'agent.md');
  const claudePath = path.join(rootDir, 'CLAUDE.md');
  const agentsCanonicalPath = path.join(rootDir, '.agents', 'templates', 'system', 'AGENTS.md.canonical');
  const agentCanonicalPath = path.join(rootDir, '.agents', 'templates', 'system', 'agent.md.canonical');

  const filesToCheck = [
    { name: 'vespyr-dna.md', path: dnaPath },
    { name: 'AGENTS.md', path: agentsPath },
    { name: 'agent.md', path: agentPath },
    { name: 'CLAUDE.md', path: claudePath },
    { name: 'AGENTS.md.canonical', path: agentsCanonicalPath },
    { name: 'agent.md.canonical', path: agentCanonicalPath }
  ];

  it('vespyr-dna.md defines the two Verdict Gates, companion invariants, and Functional Sycophancy prohibition', () => {
    const content = fs.readFileSync(dnaPath, 'utf8');
    assert.ok(content.includes('Prohibition of "Functional Sycophancy"'), 'Must define functional sycophancy ban');
    assert.ok(content.includes('### The Mandatory Verdict Gates'), 'Must define the two-gate section');
    assert.ok(content.includes('#### Decision Gate — ideas, proposals, designs, stack selections'), 'Must define Decision Gate scope');
    assert.ok(content.includes('#### Review Gate — claims about existing state'), 'Must define Review Gate scope');
    assert.ok(content.includes('ZERO-BLUEPRINT-ON-KILL INVARIANT'), 'Must define zero blueprint on kill');
    assert.ok(content.includes('ZERO-CONSUMPTION-ON-FALSIFIED INVARIANT'), 'Must define zero consumption on falsified');
    assert.ok(content.includes('Mandatory 3-Question Invariant Test'), 'Must define 3-question invariant test');
  });

  filesToCheck.forEach(({ name, path: filePath }) => {
    it(`${name} contains Core DNA anti-sycophancy, two-gate verdict rules (no stale single-gate wording)`, () => {
      assert.ok(fs.existsSync(filePath), `${name} must exist`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('No Yes-Men in the Swarm'), `${name} must mention No Yes-Men`);
      assert.ok(content.includes('Prohibit Functional Sycophancy') || content.includes('Functional Sycophancy'), `${name} must mention Functional Sycophancy prohibition`);
      // Two-gate contract: Decision Gate for ideas, Review Gate for claims.
      assert.ok(content.includes('Decision Gate'), `${name} must define the Decision Gate`);
      assert.ok(content.includes('Review Gate'), `${name} must define the Review Gate`);
      // Stale single-gate vocabulary must not resurface anywhere.
      assert.ok(!content.includes('Enforce the Verdict Gate (`[KILL]` | `[PIVOT]` | `[PASS]`)'), `${name} still carries the superseded single-gate wording`);
      assert.ok(content.includes('FORBIDDEN') || content.includes('forbidden'), `${name} must mention forbidden blueprints`);
    });
  });
});
