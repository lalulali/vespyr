---
step: research
name: Topic Research & Concept Extraction (Phase 2a)
prerequisites:
  - Input mode selected as Topic-Only (Mode 1)
  - Target audience style identified in Phase 1
delegation:
  reads: "@researcher (topic research & literature synthesis)"
  writes: "@writer (raw research summary)"
  runs: none
output_contract:
  citations: required
---

# Step Research — Topic Research & Concept Extraction (Phase 2a)

## Goal

Gather authoritative domain knowledge, mental models, core trade-offs, and practical examples for a topic-only input request. Establish concrete concept boundaries before constructing the Master Knowledge Map.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step research`

### 1. Delegate Research Task

Invoke **`@researcher` (Iris)** to conduct comprehensive research on the target topic:
- **Core Principles & Mental Models**: What are the 3–5 foundational ideas upon which this topic rests?
- **Domain Terminology & Jargon**: What terms must be defined for the specified explanation style (`Beginner`, `Intermediate`, or `Expert`)?
- **Trade-Offs & Edge Cases**: What common misconceptions, anti-patterns, or architectural/practical trade-offs exist?
- **Real-World Scenarios & Examples**: What concrete use cases illustrate these concepts in practice?
- **Authoritative References**: Gather inline citations `[N]` and literature links for verification.

### 2. Concept Boundary Mapping

`@shifu` filters and organizes `@researcher`'s findings into a structured extraction summary:
- **In-Scope Concepts**: Essential topics that directly support the learning objectives.
- **Out-of-Scope Concepts**: Adjacent or hyper-specialized topics deferred to prevent cognitive overload.
- **Prerequisite Map**: Foundational knowledge required before embarking on this topic.

### 3. User Approval Gate

Present the extracted research summary and scope boundaries to the user:
```markdown
### Topic Research Summary: {Topic Name}
- **Target Audience:** {Beginner | Intermediate | Expert}
- **Foundational Concepts Identified:** 1. {Concept A}, 2. {Concept B}, 3. {Concept C}
- **In-Scope Boundary:** {List}
- **Out-of-Scope (Deferred):** {List}

*Proceed to Phase 3 (Master Knowledge Map)? [Yes / Adjust Scope]*
```

Wait for user confirmation before proceeding to Phase 3 (`step-structure.md`).

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step research`

## Delegation Summary
- **Reads:** `@researcher` (Iris) for multi-source literature, technical research, and citations.
- **Writes:** `@writer` (Quill) for temporary research summary if saved.
- **Runs:** none.
