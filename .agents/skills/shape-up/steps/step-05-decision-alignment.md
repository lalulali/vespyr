---
step: 5
name: Decision Alignment
prerequisites:
  - step-04 completed
output_contract:
  citations: not-required
---

# Step 5 — Decision Alignment

Resolve open questions and lock decisions. Every gap and stress-test finding becomes either a resolved decision or an explicit deferral.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill shape-up --step 5`

### Present the open items
Compile from steps 3 and 4:
- Blocker-severity gaps from gap analysis
- Should-fix gaps from gap analysis
- Weaknesses surfaced by stress-test
- Open questions accumulated throughout

### For each open item
1. **Propose a resolution** with reasoning.
2. **Ask the user:** "Do you agree, want to counter, or want to defer this?"
3. Record the outcome:
   - **Resolved** → decision + rationale + who decided
   - **Deferred** → reason for deferral + what would unblock it + where it's tracked
   - **Contradicted** → flag as needing further discussion

### Decision log format
For each resolved decision, append to `artifacts/memory/active-decisions.md`:
```markdown
### [DECISION-{N}] {short title}
- **Context:** {what prompted this decision}
- **Decision:** {what was decided}
- **Rationale:** {why}
- **Alternatives considered:** {what was rejected and why}
- **Decided by:** user + @founder (shape-up step 5)
- **Date:** {date}
```

### Deferral handling
Deferred items are NOT silent omissions. Each gets: 
(a) what's deferred, 
(b) why (info missing / not v1-blocking / needs research), 
(c) what would unblock it (specific action or information needed), 
(d) where it's tracked (open questions in the shaped brief).

## Halt condition
If 3+ blocker-severity items are deferred without a clear unblock path, pause and ask:
> "We have [N] unresolved blockers. Should we continue shaping, or do you need to step back and run `/validate-idea` or `/explore-idea` first?"

## Memory closeout
- `@memory-controller write active-decisions.md` — persist resolved decisions.
- `@memory-controller session-write` — record step 5 decision alignment progress.

## Delegation
- **Memory:** @memory-controller for active-decisions and session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill shape-up --step 5`
