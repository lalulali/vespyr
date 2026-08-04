---
step: review
name: Self-Review & Quality Certification (Phase 5)
prerequisites:
  - Format deliverables generated in Phase 4
delegation:
  reads: "@shifu (pedagogical quality audit & style verification)"
  writes: "@writer (delivery summary)"
  runs: none
output_contract:
  citations: not-required
---

# Step Review — Self-Review & Quality Certification (Phase 5)

## Goal

Perform a comprehensive quality audit across all generated educational formats. Verify explanation style consistency, audit jargon definitions, confirm takeaway anchors, and secure user final sign-off.

## Workflow

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill craft-lesson --step review`

### 1. Execute 3-Vector Quality Audit

`@shifu` inspects all produced files in `artifacts/output/teaching/`:

- **Vector 1: Style Fidelity Audit**
  - Verify content across all formats strictly matches the target style (`Beginner`, `Intermediate`, or `Expert`).
  - *Beginner Check*: Zero unparsed jargon, real-world analogies present.
  - *Expert Check*: Dense domain precision, edge cases and trade-offs explicitly detailed.

- **Vector 2: Jargon & Definition Audit**
  - Verify every technical term or domain acronym is defined upon first appearance.
  - Confirm inline citations `[N]` are correctly formatted where required.

- **Vector 3: Format & Takeaway Rule Audit**
  - Confirm `handbook.md` is a detailed, narrative textbook with full conceptual depth (not a condensed cheatsheet) and contains mandatory `> [!IMPORTANT]` "If Nothing Else, Remember This" callouts.
  - **Handbook depth gate:** Verify `handbook.md` meets the concrete bar — ≥ 3,000 words total (or ≥ 1,200 per core chapter), ≥ 80% continuous prose, and every chapter has a first-principles explanation + worked example + Mermaid diagram + active-recall exercises + takeaway callout. If it reads like a quick reference, flag it as a FAIL and send it back to be expanded — do not certify a condensed handbook.
  - Confirm `cheatsheet.md` maintains high data-ink density without unnecessary prose.
  - Confirm `presentation.md` adheres to 1 key idea per slide.

### 2. User Final Delivery Gate

Present the final completion report to the user with direct clickable links to all generated artifacts:

```markdown
### 🎓 Educational Content Suite Generated Successfully!

**Subject:** {Topic / Draft Title}
**Explanation Style:** {Beginner | Intermediate | Expert}

#### Generated Deliverables:
- 🗺️ **Master Knowledge Map**: [knowledge-map.md](file:///Users/christianhadianto/Documents/TechSmith/vespyr/artifacts/output/teaching/knowledge-map.md)
- 📋 **Course Syllabus**: [syllabus.md](file:///Users/christianhadianto/Documents/TechSmith/vespyr/artifacts/output/teaching/syllabus.md)
- 📚 **Student Handbook**: [handbook.md](file:///Users/christianhadianto/Documents/TechSmith/vespyr/artifacts/output/teaching/handbook.md)
- ⚡ **Quick Reference Cheatsheet**: [cheatsheet.md](file:///Users/christianhadianto/Documents/TechSmith/vespyr/artifacts/output/teaching/cheatsheet.md)
- 🎙️ **Presentation Outline**: [presentation.md](file:///Users/christianhadianto/Documents/TechSmith/vespyr/artifacts/output/teaching/presentation.md)
- 📦 **Online Class Package**: [class/](file:///Users/christianhadianto/Documents/TechSmith/vespyr/artifacts/output/teaching/class/)
- 🎬 **Video Script**: [video-script.md](file:///Users/christianhadianto/Documents/TechSmith/vespyr/artifacts/output/teaching/video-script.md)

*Quality certification complete. All artifacts derive from a unified Master Knowledge Map.*
```

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill craft-lesson --step review`

## Delegation Summary
- **Reads:** `@shifu` for quality and pedagogical audit.
- **Writes:** `@writer` for final delivery report if persisted.
- **Runs:** none.
