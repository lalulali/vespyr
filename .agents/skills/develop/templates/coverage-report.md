---
feature: "{feature}"
generated: "<YYYY-MM-DD>"
stories: "{path to user-stories.md}"
---

# Spec Coverage Report — {feature}

Develop-handoff coverage contract (02o). **Phase Boundary Rule:** post-handoff contract shifts append `[DELTA-NN]` in `requirements.md` + `AC-E*` in `user-stories.md` and are swept like any AC row — in-place edits to existing criteria are banned during engineering.

**Grammar:** `{ac_id, evidence_ref[], mechanism, check}` — evidence refs reuse the frozen A11 `path#id` anchor syntax (id = code/test symbol) or `path:line` (weaker; line drift). Deferral rows carry owner + date and are capped with a blocking disposition at qa-signoff.

## AC coverage

| AC id | Evidence refs | Mechanism | Check | Status |
|---|---|---|---|---|
| AC-H1 | `{path}#{symbol}`, `{path}#{symbol}` | {unit test / integration test / code path that covers it} | `{command or probe}` | covered |
| AC-E2 | — | — | — | deferred (owner: @product-manager, YYYY-MM-DD) |

## 10-class fidelity review

Every class is implemented with evidence, or deferred with a reason — `req_to_impl_check.js --fidelity` exits 1 on a missing class.

| Detail class | Status | Evidence / reason |
|---|---|---|
| Screen states (empty/loading/error) | {implemented / deferred: reason} | {refs or reason} |
| Edge cases & validation | {…} | {…} |
| Data fields & types | {…} | {…} |
| Permissions & auth | {…} | {…} |
| Navigation & flows | {…} | {…} |
| Copy & tone | {…} | {…} |
| Telemetry | {…} | {…} |
| Performance notes | {…} | {…} |
| Accessibility | {…} | {…} |
| Platform constraints | {…} | {…} |
