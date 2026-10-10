---
step: 1
name: Readiness Check
prerequisites: []
output_contract:
  citations: not-required
---

# Step 1 — Readiness Check

Verify all pre-launch gates have passed. Any red item blocks launch.

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill launch --step 1`
## Agent invocation
`@product-manager` assesses launch readiness across all dimensions:

### The readiness gate — run this first

```bash
node .agents/scripts/launch_readiness_check.js check --root . --require-readiness --require-scan \
  --scan-allowlist security/reviewed-allowlist.json --json
```

**BLIND /LAUNCH RUN 7, @security-engineer seat (P0): the command above used to omit
`--scan-allowlist`, and with it omitted the gate can never pass on a repository that has a reviewed
allowlist.** Measured on the same tree, same everything, one flag apart:

| Invocation | Result |
|---|---|
| as previously documented | `verdict: FAIL`, 28 findings — the 28 reviewed false positives read as live findings |
| with `--scan-allowlist` | `verdict: PASS`, 28 suppressions, all reviewed |

A gate whose documented invocation cannot go green is a gate that gets worked around, which is why
this security leg had never actually run against this tree. Always pass the flag when the repo has a
reviewed allowlist — and note that **omitting it is fail-closed** (an unfiltered scan finds *more*,
never fewer), so this is a documentation defect that makes the honest path look broken.

`/launch` had **no mechanical gate at all** until now, and two of its checklist items were
unfalsifiable. This gate exists to make them falsifiable:

- `qa-signoff.md` is present and carries a bracketed `GO`/`CONDITIONAL` verdict, with every
  CONDITIONAL condition carrying an owner and a date.
- `release-readiness.md` contains a complete UTTERLY SATISFIED team gate: every active reviewer
  `SATISFIED`, every `CHANGES REQUESTED`/`BLOCKED` resolved, every `NOT ACTIVATED` carrying a
  specific out-of-scope reason.
- `go-nogo-decision.md` exists and states a verdict.
- **`security-scan.js` is clean.** It was invoked by zero skills before this — a real scanner
  with 11 rules including `INJ-SECRET`, and nothing in the pipeline called it. A hardcoded
  credential is not a checklist row; it is an incident.

**A scanner failure is never a pass.** Exit 2 is fail-closed, and the gate reports it as a
failure rather than as "no findings". Absence of a rule table is reported, never assumed clean.

### What the scan covers — read this before reading a green

The scan answers one question: **does the code we are shipping contain a live vulnerability?** It
is not a whole-repository audit. The rule table declares the scope at `scope` in
`security/audit-spec.json`, and the scanner prints the excluded trees on every run so you never
have to remember them:

- `product_roots` / `root_files` — the shipped surface, which is what gets scanned.
- `excluded_trees` — historical output (`artifacts/**`), evaluation scratch (`sandbox/**`), the
  scanner's own adversarial fixtures (`evals/security/corpus/**`, `held_out/**`), and the file
  that *defines* the detection patterns. Each carries a written reason in the spec.

**A green here is a scoped green.** If you are reading `ok: true` as "the repository passed
security review", you have misread it. Two fields exist so you cannot:

- `scan.scope` — what was scanned and what was dropped, with counts.
- `verdict` — `PASS` / `FAIL` / `SKIPPED`. `ok: true` on a `SKIPPED` run means *launch is not in
  scope*, not *launch passed*. Branch on `verdict`, never on `ok` alone.

### Findings a human already reviewed

`--scan-allowlist <path>` points the gate at a reviewed allowlist. Use it when the repo has one:

```bash
node .agents/scripts/launch_readiness_check.js check --root . --require-readiness --require-scan \
  --scan-allowlist security/reviewed-allowlist.json --json
```

Two rules, both enforced:

- **Omitting it is fail-closed.** No allowlist means an unfiltered scan and therefore *more*
  findings, never fewer.
- **A named-but-missing allowlist fails the gate.** It does not degrade into "no allowlist".

An allowlist entry is a claim that someone read what it suppresses — it is not a way to make a
gate green. Never add a glob to silence a finding you have not read. If a finding is a real
defect, fix the defect.

**Checklist — every item must pass:**
- All acceptance criteria from user stories are met
- Code review passed with no blocking issues
- QA validated all acceptance criteria pass (`@qa-engineer`)
- PM signed off on feature completeness
- UTTERLY SATISFIED team gate is complete: every active, relevant agent is `SATISFIED` with evidence; `NOT ACTIVATED` rows have a specific out-of-scope reason
- **`security-scan.js check` exits 0** against `security/audit-spec.json` — not "security review
  completed", which cannot be checked by anyone reading this file
- Security review completed with **no open Critical/High finding**, and the findings report is
  filed at `artifacts/output/05-execution/quality/findings-report.md` (`@security-engineer`)
- Performance benchmarks within thresholds (if applicable — see `@performance-engineer`)
- **Every route in the release has an auth test, or is explicitly documented as public**
  (`@security-engineer`) — an unchecked route is an assumed-public route
- **Error tracking is live and its alert path has been exercised once** (`@devops-engineer`).
  An alert path never tested is an alert path that does not work
- Documentation is updated (`@technical-writer`)
- Migration scripts tested and rollback plan exists
- Feature flags configured (if rolling out incrementally)
- Monitoring and alerting configured (`@devops-engineer`)
- Cloud/token cost within budget — over-budget launches need `@devops-engineer` (FinOps owner) arbitration (if applicable)
- AI features: model card present at `artifacts/output/04-architecture/model-approved-for-production.md` with shadow evidence, drift thresholds, and a rehearsed rollback (`@ml-ai-ops` serves it; pipeline notes live in `artifacts/output/ml-ai-ops/`)

**Any red item blocks launch.** Document yellow items as known risks with mitigation plans.

#### What this checklist deliberately does NOT carry

A pre-launch list arrived as nineteen undifferentiated tasks. Sixteen of them are **not launch
work**, and putting them here converts *we built it* into *someone hopefully checked it at the
end* — the weakest possible guarantee for a security item.

**Gates belong in phase 5**, where the code exists and a finding is still cheap to fix. A secret
still hardcoded at launch is not a red checkbox; it is an incident.

Routing for all nineteen — including the four that had **no owner anywhere in the engine** (dead
code, meta tags + share images, sitemap, error tracking, onboarding emails) — is in
`.agents/references/launch-preflight-routing.md`. Read it when something on that list comes up
here. An unowned task reaches nobody, and nobody does not report itself.

Privacy policy is **not** this skill's job: `legal-safety-audit` is a separate skill that
generates the legal document set. Do not duplicate it here.

## Go/No-Go decision
`@product-manager` makes the launch call:
- Review readiness checklist
- Assess known risks and their mitigations
- Confirm target release date and time
- Define rollback criteria (what triggers a rollback, who decides)
- Confirm stakeholder notification plan

**Gate:** PM must confirm GO. If NO-GO, document the blocking issue and resolve before retrying. Both `@product-manager` and `@tech-lead` must agree.
The PM must not confirm GO while any active agent is `CHANGES REQUESTED` or `BLOCKED`, or while the UTTERLY SATISFIED team gate is incomplete.

## Outputs
- `artifacts/output/06-launch/release-readiness.md` — use template `.agents/templates/launch/release-readiness-template.md`
- `artifacts/output/06-launch/go-nogo-decision.md` — use template `.agents/templates/launch/go-nogo-decision-template.md`

## Memory closeout
- `@memory-controller session-write` — record step 1 readiness check results and GO/NO-GO decision.

## Delegation
- **Memory:** @memory-controller for session-write

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill launch --step 1`
