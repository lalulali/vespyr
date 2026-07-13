---
purpose: Agent-facing capability contract — the minimum every agent reads before starting work. Distills the full PRD into 5 fields: Why, Capabilities, Constraints, Non-goals, Success signal. A capability without a success criterion is a wish, not a spec.
audience: @architect, @developer, @tech-lead, @qa-engineer
paired_with: prd-template.md (full stakeholder PRD for humans)
---

# {Feature Name} — Spec Kernel

## 1. Why
{why are we building this? What problem does it solve? Who is the user?}

## 2. Capabilities
1. **CAP-1: {capability name}**
   - intent: {what this capability must do}
   - success: {how we know it works}
2. **CAP-2: {capability name}**
   - intent: {what this capability must do}
   - success: {how we know it works}

## 3. Constraints
1. {constraint} — why: {why this constraint exists}
2. {constraint} — why: {why this constraint exists}

## 4. Non-goals
- We are NOT doing {X}.
- We are NOT doing {Y}.

## 5. Success signal
{measurable criterion} by {by-when date}.
