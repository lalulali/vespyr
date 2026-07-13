# Spec Law — 8 Rules

These rules govern every spec kernel. Violations are fixed before handoff. No exceptions.

1. **Every capability has `intent` + `success`.** A capability without a success criterion is a wish, not a spec.

2. **≥1 non-goal.** If you can't articulate what you're NOT doing, you haven't scoped the work.

3. **Constraints explain why.** A constraint without a rationale is an arbitrary rule. "Why" makes it negotiable.

4. **Success signal is measurable.** "Users are happy" is not measurable. "NPS ≥ 40 by Q3" is.

5. **Capability IDs are stable.** CAP-1, CAP-2, … Once assigned, IDs never change. Subsequent artifacts reference these IDs.

6. **No "TODO" in committed kernel.** The kernel is the contract. TODOs belong in companion files, not the kernel.

7. **Companions have content-typed names.** `glossary.md`, `user-journey.md`, `acceptance-criteria.md` — not `misc.md` or `notes.md`.

8. **Self-validate sweep runs before handoff.** After writing the kernel, run the 8-rule check. Violations are fixed before handoff.
