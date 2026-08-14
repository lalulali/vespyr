---
step: 3
name: Gap Analysis
prerequisites:
  - step-02 completed
output_contract:
  citations: required
---

# Step 3 — Gap Analysis

Systematic gap detection on the structured draft. Find what's missing, weak, or assumed without evidence.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill shape-up --step 3`

### Completeness check
Verify the structured draft covers all required elements:
- [ ] **Who** — target user is specific (role + context, not a category)
- [ ] **What** — proposed solution is concrete (not "a platform that...")
- [ ] **Why** — problem statement cites observable pain (behavior, not interest)
- [ ] **How** — at least a high-level approach or key technical bet
- [ ] **What-not** — at least 1 explicit non-goal or scope exclusion

Flag any missing element as a blocker-severity gap.

### Assumption audit
For each assumption in the structured draft:
1. Classify: **verified** (evidence exists), **plausible** (reasonable but unproven), **unverified** (no evidence)
2. If `hasResearch`: cross-reference against research findings
   - Did market analysis confirm market size, competitive analysis validate positioning, and user research confirm persona/pain point? Flag any contradiction.
3. Rate risk: what happens if this assumption is wrong?

### Dependency scan
- What does this plan depend on that doesn't exist yet? (APIs, data sources, team capabilities, partnerships)
- Are any dependencies blocking v1, or can they be worked around?

### Scope creep detector
- Count the capabilities listed. If > 5 for a v1, flag as potential scope creep.
- Ask: **"Which ONE capability, if it worked perfectly, would make this worth building?"**
- If the user can't answer, the scope is too diffuse.

## Gap severity levels

| Severity | Meaning | Action |
|---|---|---|
| **Blocker** | Can't proceed to design without resolving | Must resolve in step 5 |
| **Should-fix** | Design will be weaker without this | Resolve or explicitly defer with rationale |
| **Nice-to-know** | Would improve the brief but not blocking | Log as open question |

## Memory closeout
- `@memory-controller session-write` — record step 3 gap analysis progress and identified gaps.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill shape-up --step 3`
