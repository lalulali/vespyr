---
step: 2b
name: Competitor Analysis
prerequisites:
  - step-01 completed (or validation/shaped/problem-space brief exists)
output_contract:
  citations: required
---

# Step 2b — Competitor Analysis

Map the competitive landscape. Runs in parallel with step 2a.

## Workflow

### 2b.1 Load input

Read the validation brief (or idea brief).

### 2b.2 Research — @researcher

Invoke `@researcher competitive` to map the landscape:
- Direct and indirect competitors
- Competitive comparison matrix
- White-space opportunities
- Pricing and positioning

**Context adaptation:**
- **Startup mode:** Full competitive landscape
- **Company mode:** Internal alternatives — what existing tools, teams, or vendors solve this partially? Build vs. buy analysis.
- **Personal mode:** What open source or free tools exist? What's different about your approach?

### 2b.3 Output

Write `artifacts/output/02-research/competitive-analysis.md`.

## Memory closeout
- `@memory-controller session-write` — record step 2b competitor analysis findings.

## Delegation
- **Memory:** @memory-controller for session-write


