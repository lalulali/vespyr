---
step: 1
name: Problem Intake
prerequisites: none
delegation:
  reads: "direct (user input only)"
  writes: "direct (in-conversation draft, < 50 lines)"
  runs: "@executor (orchestrator_state.js status; per delegation-policy.md all bash)"
  direct_justified: ["user input is conversational, no file reading needed"]
output_contract:
  citations: not-required
---

# Step 1 — Problem Intake

Extract the core problem from the user without letting them jump to solutions. This step enforces zero-solution framing.

Load project context before intake:
```
@memory-controller load product-manager [unpack-problem: {brief description from user}]
```

## Workflow

### 1a. Intake

Ask the user: "What problem are you seeing? Describe the pain point in concrete terms."

Collect:
- **Symptom:** What observable behavior indicates a problem? (e.g., "checkout drop-off at 73%")
- **Context:** When and where does it happen? Who is affected?
- **Impact:** What's the cost? Revenue, retention, support load, user trust?
- **Current workaround:** What do users do instead? (This reveals the real job-to-be-done.)

### 1b. Enforce zero-solution framing

If the user proposes a solution ("we should add a progress bar"), redirect:
> "Let's park solutions for now. What problem would a progress bar solve? What makes you think that's the problem?"

The goal: arrive at a clear, solution-free problem statement.

### 1c. Draft problem statement

Synthesize into: **"{User segment} experiences {symptom} when {context}, which causes {impact}. Today, they {current workaround}."**

Present to the user for confirmation.

### 1d. Mode confirmation

In guided mode: confirm the problem statement before proceeding.
In automated/combination mode: confirm the problem statement, then explain the mode will auto-draft artifacts in step 02.

## Delegation
- **Reads:** none (conversational intake)
- **Writes:** none (draft stays in conversation)
- **Runs:** @executor for orchestrator_state.js status
