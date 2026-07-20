---
step: 3
name: Revise
mode: edit
prerequisites:
  - step-02 completed
delegation:
  reads: "direct (brief sections in context)"
  writes: "direct (targeted edits < 50 lines to single file; per delegation-policy.md < 50 lines)"
  runs: none
  direct_justified: ["small targeted edits to single file < 50 lines"]
output_contract:
  citations: not-required
---

# Step 3 — Revise

Revise the weak sections identified in the gap scan.

## Goal
Strengthen yellow and red sections by asking targeted follow-up questions. Don't rewrite — refine.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill validate-idea-edit --step 3`
For each red/yellow section, `@founder` asks one targeted question:

- **Problem is vague** → "You said [problem]. Can you describe one specific instance where this caused real pain? What happened and what was the cost?"
- **No demand evidence** → "Has anyone paid for something similar? Or built their own workaround? What's the strongest signal you have that this isn't just interesting?"
- **User is a category** → "Can you name one real person who'd be your first user? What's their role and what keeps them up at night?"
- **Verdict reasoning is thin** → "What's the one piece of evidence that most strongly supports your verdict? What's the weakest part of your case?"

## Iteration limit
Max 3 rounds of revision per section. If a section can't be strengthened after 3 rounds, note it in the brief as "unresolved" and move on.

## Guard
Never introduce new content that wasn't prompted by the user's edit target. The revision scope is bounded by what the user asked to change. If the gap scan reveals issues in sections the user didn't flag, note them but don't revise unless the user agrees.

## Output
Revised brief sections, integrated into the existing document.

## Delegation
- **Reads:** direct — brief sections already in context
- **Writes:** direct — targeted edits < 50 lines to single file

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill validate-idea-edit --step 3`
