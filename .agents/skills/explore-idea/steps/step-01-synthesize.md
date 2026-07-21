---
step: 1
name: Synthesize
prerequisites:
  - idea concept provided by user or from upstream skill
delegation:
  reads: "@reader (validation brief, shaped brief, or problem-space brief if they exist; per delegation-policy.md multi-file)"
  writes: "@writer (idea-brief.md; per delegation-policy.md output file)"
  runs: none
  direct_justified: []
output_contract:
  citations: not-required
---

# Step 1 — Synthesize

Synthesize the concept into a structured brief. Skip this step if a validation brief, shaped brief, or problem-space brief already exists (Paths A, C, D).

## Workflow

### 1a. Grill-me offer (Path B only)

Before synthesizing, ask the user:
> "Would you like me to grill you on this concept first before I produce the idea brief?"

- **"grill me"** → load `grill-me` skill first; return here after the interview is complete.
- **"proceed"** or no preference → continue below.

### 1b. Load context

Delegate to `@memory-controller`:
```
load founder [product exploration — synthesize concept]
```

### 1c. Synthesize via @founder

Invoke `@founder` to produce the structured brief:
- Synthesize into a clear, one-sentence concept
- Stress-test with Golden Circle (WHY / HOW / WHAT)
- Generate alternatives using SCAMPER, Crazy 8s, analogies
- Converge to ONE strongest direction with rationale
- Define the value proposition and target user
- Identify fatal assumptions for researchers to validate
- Decide which optional agents to summon

### 1d. Output

Delegate to `@writer` for `artifacts/output/01-discovery/idea-brief.md`.

### 1e. Gate check

Before proceeding to Phase 2, verify:
- [ ] Brief contains a one-sentence summary
- [ ] At least 3 assumptions are identified with assigned researchers
- [ ] Optional agent decisions are documented

## Delegation
- **Reads:** @reader for existing briefs (validation, shaped, problem-space)
- **Writes:** @writer for idea-brief.md
- **Runs:** none
