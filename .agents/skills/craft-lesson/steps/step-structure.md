---
step: structure
name: Master Knowledge Map Creation (Phase 3)
prerequisites:
  - Phase 2a (research) or Phase 2b (synthesis) approved by user
delegation:
  reads: "@shifu (pedagogical strategy & cognitive structuring)"
  writes: "@writer (artifacts/output/teaching/knowledge-map.md)"
  runs: none
output_contract:
  citations: not-required
---

# Step Structure — Master Knowledge Map Creation (Phase 3)

## Goal

Synthesize extracted concepts into a single authoritative **Master Knowledge Map** saved to `artifacts/output/teaching/knowledge-map.md`. Tag all objectives with Bloom's Taxonomy levels, sequence modules strictly by dependency, and define core takeaway anchors ("If Nothing Else, Remember This").

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step structure`

### 1. Tag Objectives with Bloom's Taxonomy

`@shifu` formats every learning objective using explicit Bloom's Taxonomy tags:
- `[REMEMBER]`: Recall facts, terms, basic concepts, and definitions.
- `[UNDERSTAND]`: Explain ideas, summarize principles, or translate concepts.
- `[APPLY]`: Execute procedures, solve problems, or run code in new situations.
- `[ANALYZE]`: Deconstruct architectures, compare trade-offs, and trace failures.
- `[EVALUATE]`: Assess solutions, defend choices, and critique design decisions.
- `[CREATE]`: Formulate original designs, architectures, or syntheses.

### 2. Dependency Sequencing & Chunking

Sequence modules into 3–5 logical sections to maintain cognitive load bounds:
- **Module 1: Foundations & Prerequisites**: Core definitions and first principles.
- **Module 2–3: Core Mechanics & Operations**: Step-by-step mechanisms, workflows, and implementations.
- **Module 4–5: Advanced Patterns & Trade-offs**: Edge cases, performance tuning, and architectural evaluation.

### 3. Takeaway Anchor Definition ("If Nothing Else, Remember This")

For each module section, define 1 concise core takeaway sentence representing the single most critical insight a learner must retain.

### 4. Write Master Knowledge Map File

Delegate file creation to **`@writer` (Quill)**:
- **Path**: `artifacts/output/teaching/knowledge-map.md`

#### Knowledge Map Schema Standard
```markdown
# Master Knowledge Map: {Topic Name}

## Overview & Audience Profile Matrix
- **Audience Scope:** {Internal (Roles & Familiarity) | External (Target Group & Background)}
- **Baseline Explanation Style:** {Beginner | Intermediate | Expert}
- **Format Audience Matrix:**
  - `handbook`: {Target Audience & Depth, e.g. Junior/Mid Engineers - Intermediate}
  - `cheatsheet`: {Target Audience & Depth, e.g. Architects & On-call Leads - Expert}
  - `presentation`: {Target Audience & Deck Style, e.g. C-Suite - Executive Briefing / Course Learners - EdTech Masterclass}
  - `syllabus`: {Target Audience & Depth, e.g. Course Instructors / Managers}
- **Prerequisite Requirements:** {List}

## Module Breakdown

### Module 1: {Module Title}
- **Module Objective:** {Bloom Tag} {Objective description}
- **Sub-Concepts:**
  1. {Sub-concept 1}: {Bloom Tag} {Description}
  2. {Sub-concept 2}: {Bloom Tag} {Description}
- **If Nothing Else, Remember This:** {Single anchor sentence}

### Module 2: {Module Title}
...
```

### 5. User Sign-Off Gate

Present Knowledge Map summary to user and request approval before generating formats in Phase 4:
> *"Master Knowledge Map generated at `artifacts/output/teaching/knowledge-map.md`. Approve map to proceed with format generation? [Approve / Modify]"*

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step structure`

## Delegation Summary
- **Reads:** `@shifu` for pedagogical strategy and Bloom's taxonomy tagging.
- **Writes:** `@writer` for `artifacts/output/teaching/knowledge-map.md`.
- **Runs:** none.
