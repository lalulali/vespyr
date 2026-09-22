# DoD #11 Defect — `orchestrator_state.js next` claims a qa-signoff refusal it does not implement (2026-09-22 — filed by 02o; NOT fixed)

**Claimed (v2.1 DoD #11, dev-plan `README.md:154`):** "`orchestrator_state.js next` refuses to advance out of `development` without `qa-signoff.md`."

**Falsification (disk evidence, 2026-09-22):** `grep -rn "qa-signoff" .agents/scripts/*.js` → zero matches. `orchestrator_state.js` has no qa-signoff read, no `next` refusal path, and no test asserting the refusal. The claim is record-only: a gate with zero enforcement code. Found during the 02o gate review (amendment B8) and deliberately filed rather than silently rebuilt — building the refusal was outside 02o's capped scope.

**Impact:** advancing out of `development` is not mechanically blocked on QA sign-off; v2.1's DoD #11 cannot be certified from the v2.0 codebase.

**Named test (proposed, not yet written):** `tests/test_orchestrator_qa_signoff_gate.test.js` — assert `orchestrator_state.js next` exits non-zero without `qa-signoff.md` and exits 0 with it. It must fail against today's code (red-on-current reproduces the defect).

**Forward-condition:** enforcement coupling registered on 03-series F2.23–F2.27 (v2.1 enablement). Status: **OPEN** — owner @developer when the 03-series opens; do not claim DoD #11 until the named test is green.

**Cross-references:** 02o plan §1.1 (QA integration) + DoD #4; 02o gate review B8; dev-plan `README.md:154`.
