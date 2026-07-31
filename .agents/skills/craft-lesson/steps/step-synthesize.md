---
step: synthesize
name: Draft & Transcript Synthesis (Phase 2b)
prerequisites:
  - Input mode selected as Draft/Transcript (Mode 2)
  - Raw draft, lecture notes, or video transcript provided
delegation:
  reads: "@reader (draft reading & context extraction)"
  writes: "@writer (synthesis summary)"
  runs: none
output_contract:
  citations: required
---

# Step Synthesize — Draft & Transcript Synthesis (Phase 2b)

## Goal

Extract, deconstruct, and structure existing unstructured material (draft notes, transcripts, internal documentation) into clean pedagogical units. Identify logical gaps, missing prerequisites, and term inconsistencies.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step synthesize`

### 1. Read & Deconstruct Raw Material

Delegate file reading to **`@reader` (Page)** to parse the input file or pasted text:
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

Wait for user confirmation before proceeding to Phase 3 (`step-structure.md`).

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step synthesize`

## Delegation Summary
- **Reads:** `@reader` (Page) for parsing large draft files and raw transcripts.
- **Writes:** `@writer` (Quill) for writing synthesis summary if needed.
- **Runs:** none.
