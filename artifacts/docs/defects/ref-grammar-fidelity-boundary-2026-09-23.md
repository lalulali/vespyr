# Boundary Defects — frozen-grammar & fidelity-evidence gaps (2026-09-23 — found by roundtable review; NOT fixed)

Found during the native roundtable implementation review of 02n/02o (`artifacts/evals/roundtable/transcripts/review-implementation-02n-02o_native_1.md`, `[SYNTHESIS: RESHAPE]`). Both defects sit at the same boundary: the plans claim frozen, resolvable evidence refs; two code paths accept unresolvable/escaping ones. Related record: DoD-#11 defect (`dod-11-qa-signoff-refusal-2026-09-22.md`, also OPEN, `orchestrator_state.js next` exits 0 — re-probed live).

---

## D1 — `req_to_impl_check.js resolveRef` enforces no A11 grammar (B1 claim is DECLARED-ONLY)

**Plan claim:** 02o §1.1/§2 (B1) — "evidence refs reuse A11's frozen `path#id` anchors"; 02o §4 — "every ref resolves on disk (100%, structural)".

**Falsification (live probes, 2026-09-23):**
- `resolveRef('/etc/hosts#localhost')` → `ok: true` — absolute path escapes the repo root (spec_parity.js `resolveAnchor` rejects non-repo-relative).
- `resolveRef('AGENTS.md#')` → `ok: true` — empty id resolves (spec_parity requires a real id).
- `..` repo-escape accepted (spec_parity rejects `rel.includes('..')`).
- `grep resolveRef tests/` → 0 hits — zero named tests cover the function; B1's "reuse pinned at 02n's amended-file SHA" names no SHA anywhere, and 02n has 18 touch commits (no single pin commit exists; R-PF4 re-pin never run after 2026-09-23 amendments).

**Impact:** an unresolvable or escaping coverage ref passes the structural gate; the A11 reuse contract is asserted, not enforced.

**Named test (proposed, not yet written):** `tests/test_req_to_impl_ref_grammar.test.js` — must go red against today's code: absolute-path ref rejected; `..` rejected; empty id rejected; all four mirrored against `spec_parity.resolveAnchor` behavior (grammar equivalence = B1's actual claim).

## D2 — `--fidelity` evidence refs are never resolved; PASS output overclaims

**Plan claim:** 02o §4 — evidence resolution 100% structural; honest tiering: gates never claim more than they prove.

**Falsification (live probe, 2026-09-23):** a coverage report whose fidelity-table evidence reads `nonsense-path#nonexistent` → `--fidelity` **exit 0**, printing "implemented with evidence" — evidence is only checked as a non-empty string (req_to_impl_check.js fidelity path), never resolved. Contradicts 02o §4's "every ref resolves on disk" and breaches honest tiering (the output claims evidence the gate never checked). AC-coverage refs ARE resolved (seeded reds at `tests/test_req_to_impl_check.test.js:91–99`) — the fidelity-table refs are the gap.

**Impact:** a missing class can be papered over with a dead path and the gate stays green while claiming implementation evidence.

**Named test (proposed, not yet written):** `tests/test_req_to_impl_fidelity_refs.test.js` — dead evidence ref in the class table → exit 1; overclaiming output text removed or made structural-true.

---

**Statuses (2026-09-23):** **D1 FIXED** — `resolveRef` now delegates to `spec_parity.resolveAnchor` (one grammar implementation for B1: absolute paths, `..`, empty ids all rejected); named test `tests/test_req_to_impl_ref_grammar.test.js` written, green. **D2 FIXED** — `--fidelity` now resolves every evidence reference and requires implemented classes to carry ≥1 resolvable ref; PASS output made structural-true; named test `tests/test_req_to_impl_fidelity_refs.test.js` written, green. Both fixes GO'd in-session by the owner ("fix now", 2026-09-23).

## D3 — report-deletion-after-freeze guard (owner ruled 2026-09-23, option a)

Ruling: the witness rule stands as code — absent report = never-frozen = proceed (mid-flow sessions must not deadlock). Residual hole: after a freeze, `rm parity-report.md` reopens the gate silently (probe: `[OK] witness: absent`, exit 0). Detection seam already exists: 02n.9's scope-lock records artifact hashes — a guard comparing "parity-report.md present at lock time" vs "absent now" blocks without re-creating the mid-flow deadlock.

**Status: OPEN** — owner @developer (small; not bundled with A8 unless the owner says so).

**Cross-references:** 02o plan §1.1 (B1), §4; transcript `review-implementation-02n-02o_native_1.md`.
