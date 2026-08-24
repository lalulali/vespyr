const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../../.agents/scripts/lib/frontmatter.js');

describe('Dialectic /round-table Protocol Fixtures', () => {
  const roundTablePath = path.join(__dirname, '..', '..', '.agents', 'skills', 'round-table', 'SKILL.md');

  it('SKILL.md contains 4-Phase Dialectic State Machine definition', () => {
    const content = fs.readFileSync(roundTablePath, 'utf8');
    assert.ok(content.includes('Phase 1: Position Stating (Scatter'), 'Must contain Phase 1 Scatter');
    assert.ok(content.includes('Phase 2: Targeted Pairwise Cross-Examination (Exchange & Attack)'), 'Must contain Phase 2 Cross-Exam');
    assert.ok(content.includes('Phase 3: Defense & Justified Concession (Rebuttal)'), 'Must contain Phase 3 Rebuttal');
    assert.ok(content.includes('Phase 4: Synthesis Gate & Irreconcilable Trade-Off Escalation'), 'Must contain Phase 4 Synthesis/ADR Gate');
  });

  it('enforces Decision/Review Gate selection, Zero-Blueprint-on-KILL + Zero-Consumption-on-FALSIFIED, and Prompt Sanitization', () => {
    const content = fs.readFileSync(roundTablePath, 'utf8');
    assert.ok(content.includes('**Decision Gate — proposals, ideas, designs under stress-test:** `[PASS]` / `[PIVOT]` / `[KILL]`'), 'Must specify Decision Gate verdicts');
    assert.ok(content.includes('**Review Gate — claims about existing state (implementation reports, records, checkboxes):** `[CONFIRMED]` / `[PARTIAL]` / `[FALSIFIED]`'), 'Must specify Review Gate verdicts');
    assert.ok(content.includes('Zero-Blueprint-on-KILL / Zero-Consumption-on-FALSIFIED'), 'Must specify both companion invariants');
    assert.ok(content.includes('Prompt Sanitization Rule'), 'Must specify Prompt Sanitization');
  });

  it('enforces Mandatory Visible Dialogue Stream and Functional Sycophancy prohibition', () => {
    const content = fs.readFileSync(roundTablePath, 'utf8');
    assert.ok(content.includes('Mandatory Visible Dialogue Stream'), 'Must specify Mandatory Visible Dialogue Stream');
    assert.ok(content.includes('Prohibition of Functional Sycophancy ("Preach Then Comply")'), 'Must ban functional sycophancy');
  });

  it('enforces Sycophantic Premature Convergence (SPC) Gate in rules', () => {
    const content = fs.readFileSync(roundTablePath, 'utf8');
    assert.ok(content.includes('Sycophantic Premature Convergence (SPC) Gate'), 'Must specify SPC Gate');
    assert.ok(content.includes('Concession Justification Requirement'), 'Must require empirical concession justification');
  });

  it('declares pairwise critique and concession machinery as enforcement requirements', () => {
    // Scope honesty: enforcement behavior runs at orchestrator runtime with
    // live subagents; a static fixture cannot "simulate" it without being
    // unfalsifiable. The mechanical contract is that the protocol text
    // mandates Phase-2 critique before synthesis and evidence-backed
    // concessions.
    const content = fs.readFileSync(roundTablePath, 'utf8');
    assert.ok(content.includes('Phase 2: Targeted Pairwise Cross-Examination'), 'pairwise attack phase mandated');
    assert.ok(content.includes('[CONCESSION: reason]'), 'concession format pinned');
    assert.ok(content.includes('Maximum 2 exchange rounds'), 'bounded iterations pinned');
  });

  it('enforces Multi-Turn Dialectic Continuity and Zero User Deference', () => {
    const content = fs.readFileSync(roundTablePath, 'utf8');
    assert.ok(content.includes('Multi-Turn Dialectic Continuity (Conversation Chaining)'), 'Must specify Multi-Turn Dialectic Continuity');
    assert.ok(content.includes('Zero User Deference & Anti-Flattery'), 'Must specify Zero User Deference');
    assert.ok(content.includes('Roundtable Mode Stays Permanently Active'), 'Must enforce permanent active mode across turns');
  });
});
