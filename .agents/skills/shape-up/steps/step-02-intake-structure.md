---
step: 2
name: Intake & Structure
prerequisites:
  - step-01 completed
delegation:
  reads: "direct (user input + optional brief/research < 200 lines each; per delegation-policy.md < 3 files < 500 lines)"
  writes: none
  runs: none
  direct_justified: ["founder synthesis is pure reasoning; input docs are typically < 200 lines"]
output_contract:
  citations: not-required
---

# Step 2 — Intake & Structure

Parse the user's raw input into a structured format — a document, notes, a verbal pitch, a URL, or a conversation summary.

## Goal
Produce a structured draft that captures the idea's core elements in a consistent form, regardless of input format.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill shape-up --step 2`

### If nothing exists (fresh entry)
1. Ask: **"Describe your idea. Any format works — a paragraph, bullet points, a doc, or just talk me through it."**
2. Listen for: problem, proposed solution, target user, scope, constraints, assumptions, open questions.
3. Synthesize into structured draft (see format below).
4. Present: **"Here's how I've structured your idea. What's wrong, missing, or overstated?"**

### If prior artifacts exist
Load and incorporate based on what step-01 detected:

| Context | Load | Focus |
|---|---|---|
| `hasIdeaBrief` | `00-discovery/idea-brief.md` | Refine existing framing |
| `hasValidation` | `00-discovery/validation-brief.md` | Incorporate premises + verdict |
| `hasResearch` | `01-research/{market,competitive,user-personas}-analysis.md` | Map findings → assumption status |
| `isReshape` | `00-discovery/shaped-brief.md` (+ research if present) | Revise with new evidence |

For each:
1. Extract relevant signals (premises, findings, validated/invalidated assumptions).
2. Ask: **"Your [artifact] established [X]. What's changed, refined, or new since?"**
3. Incorporate updates into the structured draft. If `hasResearch`: map each finding to assumption status (verified / plausible / unverified).

## Halt condition
If after 2 probing questions the problem and solution are still indiscernible:
> "I can't structure this yet — the core isn't clear enough. Try `/validate-idea` to stress-test the concept, or share more detail."

## Structured draft format
The draft is internal (not yet the final artifact). It captures:
- **Problem statement:** 1-2 sentences. What pain exists?
- **Proposed solution:** 1-2 sentences. What are we building?
- **Target user:** Who specifically? (Name a role, not a category.)
- **Key assumptions:** Numbered list. Each marked as verified / plausible / unverified.
- **Scope boundaries:** What's in v1? What's explicitly out?
- **Constraints:** Technical, budget, timeline, team, regulatory.
- **Open questions:** What do we not know yet?

## Output
Structured draft presented to user for confirmation before proceeding to gap analysis.

## Delegation
- **Reads:** direct — user input + optional brief/research (< 200 lines each)
- **Writes:** none (draft is in-conversation, not yet written to file)
- **Memory:** @memory-controller note — log structured-draft synthesis for resume continuity
- **Direct:** @founder synthesis is pure reasoning

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill shape-up --step 2`
