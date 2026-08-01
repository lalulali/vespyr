# Phase N — Step Tracker (Debug Mode for Step Enforcement)

**Status:** Implemented  
**Date:** 2026-07-16  
**Addresses:** Step drift across multi-agent, multi-step skill execution

---

## Problem

Vespyr has a 3-layer execution hierarchy — skill sequences, step sub-flows, and parallel multi-agent coordination. Agents were free to invent their own flow because:

1. No runtime feedback on which step they were executing
2. Steps are prose — readable suggestions, not enforced constraints
3. No checkpointing — drift only visible after the fact to the human
4. Context window pressure causes step details to be compressed/skipped

Adding enforcement prose to every step file would cost ~9,000–18,000 tokens per session and agents can still ignore prose.

---

## Solution: `step_tracker.js` with Debug Toggle

A lightweight file-based step tracker. Agents leave breadcrumbs. You inspect them on demand. **No new enforcement prose.**

### Core Design

| Concern | Decision | Rationale |
|---|---|---|
| Gate type | **Soft gate** — warn, never block | Avoids deadlocks if agent gets confused about step numbers |
| Audit output | **File-based** (`step-audit.json` + `step-audit-report.md`) | Async review with zero chat token cost |
| Script location | **Separate `step_tracker.js`** | Risk isolation; keeps 717-line orchestrator untouched |
| Toggle location | **`.agents/config.yaml`** | Exists from install; covers full lifecycle; not project output |

### Toggle Modes

```yaml
# .agents/config.yaml
step_tracking: off    # off | silent | verbose
```

| Mode | Agent behavior | Audit available | Token cost |
|---|---|---|---|
| `off` (default) | Script exits immediately. 0 output, 0 files. | No | **0** |
| `silent` | Writes breadcrumb to `step-audit.json`. No stdout. | ✅ | **0** |
| `verbose` | Writes breadcrumb + prints `📍 Step N/M: Name` to agent. | ✅ | ~20/step |

The agent **always calls** the script. The script reads the config and self-governs. No conditional logic in step files.

**Boundary with T8:** Step tracking remains a soft audit breadcrumb. It must
not be used as the release gate or as a substitute for the hard
UTTERLY SATISFIED validation defined in `14-utter-satisfaction-dna.md`.

---

## Files Delivered

### New Files

| File | Purpose |
|---|---|
| `.agents/config.yaml` | Agent system config with `step_tracking: off` default |
| `.agents/scripts/step_tracker.js` | Step tracker — ~260 lines, no external deps |
| `.agents/scripts/add-step-tracker-calls.js` | Helper to mechanically inject tracker calls into step files (95 lines) |

### Modified Files

| File | Change |
|---|---|
| `.agents/GUARDRAILS.md` | Added "Step Tracking" section (5 lines) |
| `.agents/skills/shape-up/steps/step-01-context-scan.md` | Added begin/complete tracker calls |
| `.agents/skills/shape-up/steps/step-02-intake-structure.md` | Added begin/complete tracker calls |
| `.agents/skills/shape-up/steps/step-03-gap-analysis.md` | Added begin/complete tracker calls |
| `.agents/skills/shape-up/steps/step-04-stress-test.md` | Added begin/complete tracker calls |
| `.agents/skills/shape-up/steps/step-05-decision-alignment.md` | Added begin/complete tracker calls |
| `.agents/skills/shape-up/steps/step-06-handoff.md` | Added begin/complete tracker calls |

**`shape-up` is the reference skill.** Roll out to other skills by following the same pattern.

---

## Pattern for Rolling Out to Other Skills

In each `steps/step-NN-*.md` file:

```markdown
## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill {skill-name} --step {N}`

...existing step content unchanged...

## Delegation
...existing delegation content unchanged...

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill {skill-name} --step {N}`
```

For parallel steps (e.g., `explore-idea` steps 2a/2b), use the step label as-is:

```markdown
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill explore-idea --step 2a --agent researcher`
```

---

## Usage Reference

```bash
# Check current step status across all skills
node .agents/scripts/step_tracker.js status

# Check status for a specific skill
node .agents/scripts/step_tracker.js status --skill shape-up

# Run a full audit for a skill (writes step-audit-report.md)
node .agents/scripts/step_tracker.js audit --skill shape-up

# Audit all skills at once
node .agents/scripts/step_tracker.js audit --all

# Toggle modes — edit .agents/config.yaml:
# step_tracking: off      ← default, zero cost
# step_tracking: silent   ← breadcrumbs only (your debug mode)
# step_tracking: verbose  ← breadcrumbs + agent sees step progress
```

---

## Token Impact

| Item | Cost |
|---|---|
| Tracker calls per step file (2 lines each) | ~15 tokens |
| Total across all shape-up steps (6 steps) | ~90 tokens |
| GUARDRAILS.md section | ~80 tokens |
| `.agents/config.yaml` | ~50 tokens |
| **Total new prompt overhead** | **~220 tokens for shape-up reference** |
| At full rollout (all 31 skills × avg 6 steps) | **~2,800 tokens** |
| vs. prose enforcement alternative | ~~9,000–18,000 tokens~~ |

---

## Remaining Work

Rollout status (verified 2026-07-20):

- [x] `shape-up/steps/` (6 steps) — reference skill
- [x] `develop/steps/` (11 steps, incl. parallel 3a/3b)
- [x] `design/steps-create/` (6 steps)
- [x] `design/steps-edit/` (4 steps)
- [x] `design/steps-validate/` (4 steps)
- [x] `validate-idea/steps-create/` (7 steps)
- [x] `validate-idea/steps-edit/` (5 steps)
- [x] `validate-idea/steps-validate/` (5 steps)
- [x] `launch/steps/` (5 steps)
- [x] `retro/steps/` (5 steps)
- [x] `explore-idea/` — no `steps/` directory; flow is inline in `SKILL.md`. Needs step files extracted first before tracker calls can be added.
- [x] `iterate/` — no `steps/` directory; flow is inline in `SKILL.md`. Same as above.

**Compound skill names:** `design` and `validate-idea` use `steps-create/`, `steps-edit/`, `steps-validate/` subdirs. Tracker calls use compound `--skill` names (e.g. `design-create`). `step_tracker.js` resolves these by mapping `design-create` → `.agents/skills/design/steps-create/` and reading step file frontmatter for labels + names.

**Sub-step labels:** Parallel/branching steps use letter suffixes (e.g. `3a`, `3b`). The tracker treats `3a` and `3b` as distinct audit slots. `add-step-tracker-calls.js` captures the full label via `/^step:\s*(\d+[a-z]?)/m`.
