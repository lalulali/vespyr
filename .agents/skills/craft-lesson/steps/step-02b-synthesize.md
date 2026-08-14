---
step: 2b
name: Draft & Transcript Synthesis (Phase 2b)
prerequisites:
  - Input mode selected as Draft/Transcript (Mode 2)
  - Raw draft, lecture notes, or video transcript provided
output_contract:
  citations: required
---

# Step Synthesize — Draft & Transcript Synthesis (Phase 2b)

## Goal

Extract, deconstruct, and structure existing unstructured material (draft notes, transcripts, internal documentation) into clean pedagogical units. Identify logical gaps, missing prerequisites, and term inconsistencies.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step synthesize`

### 1. Read & Deconstruct Raw Material

Read the input file or pasted text to parse it:
- **Core Theme Extraction**: Identify the central objective and key narrative arc.
- **Atomic Concept Decomposition**: Break raw text down into distinct, self-contained educational topics.
- **Terminology Normalization**: Audit for ambiguous, inconsistent, or undefined internal jargon.

### 2. Gap Identification & Scaffolding Check

`@shifu` audits the extracted concepts against cognitive load principles:
- **Prerequisite Gaps**: Flag concepts used in the draft without prior explanation.
- **Logical Leaps**: Identify leaps in reasoning that require bridge explanations or visual aids.
- **Missing Examples**: Highlight abstract claims that lack concrete illustrations or code snippets.

### 3. User Approval Gate

Present the synthesis analysis and gap report to the user:
```markdown
### Draft Synthesis Report: {Draft Source}
- **Extracted Core Concepts:** 1. {Concept 1}, 2. {Concept 2}, 3. {Concept 3}
- **Identified Prerequisites:** {Prerequisites}
- **Detected Gaps & Proposed Scaffolding:**
  - *Gap*: {Description} $\rightarrow$ *Fix*: {Proposed bridge explanation}
- **Normalizing Terms:** {e.g. standardizing "actor" vs "node"}

*Approve synthesis and proceed to Phase 3 (Master Knowledge Map)? [Yes / Modify]*
```

## Memory closeout
- `@memory-controller session-write` — record synthesis phase progress.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step synthesize`


