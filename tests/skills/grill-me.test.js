const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../../.agents/scripts/lib/frontmatter.js');

// Scope honesty (02h T3.4 evidence regime): this fixture verifies the STRUCTURAL CONTRACT of
// /grill-me on disk. Since the owner rulings of 2026-10-14/15 that contract is the THINKING TOOL:
// the stance, the forget-list, the three boundaries, and statelessness. The audit machinery —
// eight-move ledger, decision-log schema, point closure, gate — was deleted, not moved, because no
// caller consumed a grill-me record. Several tests below assert that ABSENCE deliberately: a future
// edit that re-inlines the machinery should fail here rather than silently re-bloat the skill.
//
// It does NOT verify live interrogation behavior of an LLM session; that belongs to the eval suite
// (evals/suites/invariants/grill-me-spcp.json).
describe('/grill-me Socratic stress-test fixtures', () => {
  const skillPath = path.join(__dirname, '..', '..', '.agents', 'skills', 'grill-me', 'SKILL.md');
  // Normalize CRLF (windows-latest checkouts) so fence-parsing regexes see LF.
  const content = fs.readFileSync(skillPath, 'utf8').replace(/\r\n/g, '\n');

  it('has valid frontmatter with name and broadened description', () => {
    const parsed = parseFrontmatter(content);
    assert.ok(parsed.hasFrontmatter, 'SKILL.md must carry frontmatter');
    assert.strictEqual(parsed.frontmatter.name, 'grill-me');
    assert.match(parsed.frontmatter.description, /ANY plan|any plan/i, 'description must claim domain-general scope');
  });

  it('states the stance — the mechanism, not a checklist', () => {
    // The owner's framing: a good conversation and thinking tool. The mechanism of insight is
    // relentless follow-up; the question list is only a coverage memory-aid.
    assert.match(content, /Do not accept the first answer/i, 'the stance must be stated as the mechanism');
    assert.match(content, /holds?\b.*or\b.*breaks?/i, 'the thread must be followed until it holds or breaks');
    assert.match(content, /recommended answer with reasoning/i, 'the interviewer must give something to push against');
    assert.match(content, /blast radius, not by remaining curiosity/i, 'depth must be set by stakes');
  });

  it('is stateless and portable', () => {
    assert.match(content, /It is stateless/i, 'the stateless rule must be stated');
    assert.match(content, /writes no files/i, 'the no-writes promise must be explicit');
    assert.match(content, /no repo/i, 'portability must be explicit — it does not need a Vespyr checkout');
    assert.match(content, /not assume the subject is software/i, 'domain-generality must be explicit');
  });

  it('carries the questions an interviewer forgets, each with one probe', () => {
    const questions = [
      'What must stay true?',
      'What else moves?',
      'Who attacks it?',
      'How does it fail?',
      'What does it cost at 100x?',
      'What can we cut?',
      'What does done mean?',
    ];
    for (const q of questions) assert.ok(content.includes(`**${q}**`), `Missing forget-list question: ${q}`);
    // The list must declare its own incompleteness — otherwise it reads as a completeness claim,
    // which is the defect the previous eight-move framing carried.
    assert.match(content, /not complete and is not meant to be/i, 'the list must declare it is not exhaustive');
    assert.match(content, /name it and drill it with the same rigor/i, 'the escape hatch must be explicit');
  });

  it('instantiates the questions for a non-software subject', () => {
    // Restored 2026-10-15 (owner ruling). The skill claims domain-generality; every probe in the
    // table is software ("untrusted input", "crash mid-operation", "retry"). Without a worked
    // instantiation it asserted a property its own examples contradicted.
    assert.match(content, /training program/, 'a non-software worked example is required');
    assert.match(content, /not software, to show the questions travel/i,
      'the example must say WHY it is not software');
    // Strengthened 2026-10-15: the old assertions anchored only rows 1 and 7, so a paragraph that
    // answered two of the seven questions would have passed a test claiming to prove domain-generality.
    const idx = content.indexOf('**Worked instantiation');
    assert.ok(idx > 0, 'a worked instantiation block must exist');
    const example = content.slice(idx);
    for (const q of [
      'What must stay true?', 'What else moves?', 'Who attacks it?', 'How does it fail?',
      'What does it cost at 100x?', 'What can we cut?', 'What does done mean?',
    ]) assert.ok(example.includes(q), `the worked example must instantiate: ${q}`);
  });

  it('requires a contradiction scan before closing', () => {
    // Restored 2026-10-15 (owner ruling). The old Step 4 asked whether a later answer undercut an
    // earlier one; the rewrite reduced it to "later rounds build on earlier answers", which is a
    // soft signal rather than an instruction.
    // Strengthened 2026-10-15: three loose phrases never checked the TIMING the test name promises.
    // This pins the scan to the closing moment, inside one paragraph.
    assert.match(content, /Before you close, read it back\.[\s\S]{0,500}?Surface them and make them resolve/,
      'the scan must be instructed at the closing moment and mandate action');
    assert.match(content, /cannot both be true/i, 'the consequence of not resolving must be stated');
  });

  it('carries the three boundaries', () => {
    for (const [label, re] of [
      ['ungrillable questions', /[Uu]ngrillable/],
      ['count rounds, not questions', /Count rounds, not questions/i],
      ['passivity', /[Pp]assivity/],
      ['the dumb zone', /dumb zone/i],
    ]) assert.ok(re.test(content), `${label} must be present`);
    assert.match(content, /stop grilling/i, 'the ungrillable boundary must say to stop, not to rephrase');
  });

  it('keeps the anti-patterns that enforce the stance', () => {
    assert.match(content, /Reciting the questions in fixed order/i, 'the list must not be used as a script');
    assert.match(content, /Grilling without ground truth/i, 'ground truth must be required');
    assert.match(content, /Softening a probe/i, 'the DNA must apply double here');
  });

  it('requires ground truth before questioning', () => {
    assert.match(content, /ground-truth material/, 'ground-truth exploration must precede questioning');
    assert.match(content, /opinions trading punches/, 'the failure mode without material must be named');
  });

  it('no longer inlines the deleted audit machinery', () => {
    // Asserting the ABSENCE deliberately. The owner deleted the eight-move ledger, the decision-log
    // schema, point closure, and the gate; a future edit that re-inlines them should fail here.
    for (const [label, re] of [
      ['the eight-move table', /\*\*Premise & Purpose\*\*/],
      ['the disposition ledger', /Disposition ledger/i],
      ['the decision-log schema', /\*\*Decision:\*\*/],
      ['a memory artifact target', /artifacts\/memory\//],
      ['a summary artifact', /grill-me-decisions\.md/],
      ['the point-coverage canon', /point-coverage\.md/],
      ['a gate reference', /critique_session_check/],
      ['a coverage-machinery reference', /coverage-machinery\.md/],
    ]) assert.ok(!re.test(content), `${label} must not be inlined — it was deleted, not moved`);
  });

  it('does not name an artifact it does not write', () => {
    assert.match(content, /hand the caller your findings and stop/i,
      'an indirect invocation must hand back findings, not a file');
    assert.match(content, /caller owns its own artifact/i, 'ownership of any record must be the caller\'s');
  });
});
