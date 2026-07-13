---
step: 1
name: Session Setup
mode: create
delegation: { reads: "@reader", writes: "@writer", runs: "@executor" }
output_contract.citations: not-required
---

# Step 1 — Session Setup

Initialize the validation session. Load project context and determine the user's mode and maturity.

## Goal
Establish the validation environment: load memory, check for prior artifacts, and identify the user's context (startup/company/personal) and product maturity (greenfield/brownfield).

## Process
1. `@memory-controller load founder [idea validation]` — seed project context. If memory files don't exist yet (new project), proceed without context.
2. Check `artifacts/output/` for prior validation briefs or design docs.
3. Ask: **What's your context?** (startup / company / personal)
4. Ask: **Is this greenfield or brownfield?** (new thing / improving existing thing)

## Context modes
| Mode | You are | Evidence bar |
|---|---|---|
| **Startup** | Founder, indie hacker | High — need behavioral demand evidence |
| **Company** | PM at work, intrapreneur | Medium — need stakeholder pull and business case |
| **Personal** | Builder, learner, hobbyist | Low — clarity and excitement matter more than evidence |

## Product maturity routing
- **Greenfield** (no existing product) → full diagnostic, all questions relevant
- **Brownfield** (existing product/feature) → skip Q1 demand evidence, focus on Q2 status quo, Q4 wedge, Q5 observation

## Output
Context mode and maturity stored for use in subsequent steps.

## Delegation
- Reads: @reader (brief files, research artifacts)
- Writes: @writer (validation outputs)
- Direct: founder reasoning is direct (no delegation needed for Socratic questioning)
