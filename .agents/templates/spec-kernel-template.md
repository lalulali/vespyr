---
purpose: Spec kernel reference — points agents to the canonical template for the 5-field spec kernel (Why / Capabilities / Constraints / Non-goals / Success signal).
template_file: .agents/templates/product/SPEC.md
governed_by: .agents/templates/spec-law.md
---

# Spec Kernel Template

The spec kernel is the minimum viable specification every agent reads before starting work. It distills the full PRD into 5 fields. A capability without a success criterion is a wish, not a spec.

**Canonical template file:** `.agents/templates/product/SPEC.md`

**Format:**

```markdown
# {Feature Name} — Spec Kernel

## 1. Why
{1 paragraph: why are we building this? What problem does it solve? Who is the user?}

## 2. Capabilities
1. **CAP-1: {capability name}**
   - intent: {what this capability must do}
   - success: {how we know it works}
2. **CAP-2: {capability name}**
   - intent: {what this capability must do}
   - success: {how we know it works}

## 3. Constraints
1. {constraint} — why: {why this constraint exists}

## 4. Non-goals
- We are NOT doing {X}.

## 5. Success signal
{measurable criterion} by {by-when date}.
```

**Where agent should find spec kernels produced by prior phases:**
- `artifacts/output/03-strategy/SPEC.md` or `artifacts/output/03-strategy/requirements.md`
- If neither exists, run `/design` to produce one

**Related:** See `.agents/templates/spec-law.md` for the 8 rules governing spec kernels.
