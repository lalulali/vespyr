# Release Signing & Manifest Freshness (03i) — F1.52 Execution Plan

**Status:** PLANNED (execution-ready; NOT started). Created 2026-08-23 from the 02f post-fix fresh audit residual.
**Decision:** Cryptographic release signing is deferred out of Phase 1 — deliberately. The interim control chain (pinned unsigned manifest → fail-closed verify → NEW-FINDINGS gate → publish-time verify) ships in Phase 1 and detects accidental drift; adversarial tamper detection activates when this plan executes.
**Owner:** @devops-engineer (pipeline) + @security-engineer (audit). Signer design per ADR-002 §4: Sigstore keyless cosign, GPG-in-CI-secrets fallback.

---

## 1. Trigger Gate (non-negotiable)

This plan MUST be executed **before any public distribution event**, whichever comes first:

- [ ] T1 — first npm release promoted to external users (not Chris-local install)
- [ ] T2 — skills.sh / curl-pipe channel opens as a distribution method
- [ ] T3 — any third party is instructed to install Vespyr from a registry

Until T1/T2/T3: no action required; the plan sits here, cost-free.
At T1/T2/T3: this plan becomes a **release blocker** — `publish.yml` must fail closed without a verified signature.

Rationale: an unsigned manifest is indistinguishable from a tampered one only when someone else is trusting it. While the only consumer is the maintainer, deferral carries zero added risk (ADR-002 §2.1.1 interim position).

## 2. Scope

| # | Item | Detail | Est |
|---|---|---|---|
| S1 | Release manifest generation job | CI job regenerates `.agents/manifest.json` (+`files_root`) on tag build; asserts freshness: embedded commit SHA == tag SHA (closes R50 detection fully) | 2h |
| S2 | Keyless signing step | `cosign sign-blob --yes manifest.json > manifest.json.sig` in `publish.yml` (`id-token: write` already present); signature uploaded as release asset alongside manifest | 2h |
| S3 | Consumer verification path | One-command stranger flow documented in README/install guide: download tarball + manifest + sig → `cosign verify-blob` (cert identity pinned to repo+workflow) → then `vespyr verify`. No manual cert wrangling | 3h |
| S4 | Tamper test (the proof) | CI job: sign → flip one byte in `.agents/` → assert BOTH `cosign verify-blob` AND `vespyr verify` FAIL. This test existing-and-green is what makes "signed" claims legal again | 2h |
| S5 | Claim re-enablement | Only after S4 passes: restore "signed" wording across CLI help/README/guides (reverse of the N-13R strip); remove ADR-002 §2.1.1 interim note | 1h |
| S6 | Custody & failure modes | Keyless = no key custody; document fallback GPG custody (location/backup/rotation per ADR-002 §4); define behavior when Sigstore/Rekor unreachable (fail-closed vs degraded-with-warning — decide explicitly, never silently) | 2h |

**Total ≈ 12h.** Dependency order: S1 → S2 → S4 → S3 → S5; S6 parallel.

## 3. Acceptance Criteria (all must hold before the trigger-gate blocker lifts)

1. Tag-triggered CI produces: manifest + detached signature + provenance attestation, all attached to the GitHub release
2. Manifest-freshness assertion green on a clean tag, red on a stale one (S1)
3. **Tamper test red/green both demonstrated** (S4) — the E2E proof that neither the signature nor the hash layer can be fooled
4. A fresh clone (no repo history, no cached trust) completes S3's consumer flow successfully
5. Offline/degraded Sigstore behavior explicitly defined and tested at least once
6. @security-engineer fresh audit of the whole loop recorded in `artifacts/output/05-execution/quality/`

## 4. Out of scope

- Per-file signing (rejected by round table, Axel — aggregate stays)
- Sandbox / runtime content-trust changes (Phase 2 separate workstreams)
- Any change to the scanner corpus/baseline machinery

## 5. Cross-references

- ADR-002 (install-integrity strategy, custody decisions, §2.1.1 interim note)
- 02f §5.2/§12 (signed-manifest requirement, release-pipeline handoff), R49/R50 risk entries
- `fresh-audit-02f-post-fix-2026-08-23.md` §6 (origin of this plan; why untested signing was refused)
