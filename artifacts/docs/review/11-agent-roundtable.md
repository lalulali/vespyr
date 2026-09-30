# Round-Table Transcript — Agent Capability & Teamwork Cross-Review (Track C / 02u)

**Date:** 2026-09-30 · **Mode:** native (19 seats, each a real context-isolated subagent) · **Host:** @round-table
**Topic:** verify every capability claim against the registry/evidence and every handoff against disk; verdict per agent; propose concrete improvements.
**Roster deviation (logged):** fixed 4-group roster per owner directive ("all agents"), not the topic-router default; `@memory-controller` not seated (`resolve_agents.js` marks `reasoningParticipant: false`) — `@technical-writer` verified its registry row instead.
**Brief:** `artifacts/docs/review/11-roundtable-brief.md` · **Evidence base:** `artifacts/docs/review/10-agent-capability-audit.md`, `.agents/references/agent-contracts.md`, `evals/suites/agents/*.json`, `tests/agent-capability-contract.test.js`

```roundtable-coverage
panel: @architect,@tech-lead,@developer,@code-reviewer,@qa-engineer,@devops-engineer,@security-engineer,@performance-engineer,@ml-ai-engineer,@ml-ai-ops,@founder,@product-manager,@product-designer,@researcher,@user-researcher,@ux-researcher,@data-analyst,@technical-writer,@shifu
challenges:
- @qa-engineer -> @architect: four AI capabilities have no runnable artifact and no checkable AI invariants in arch review
- @architect -> @tech-lead: kanban custody conflict between the persona claim and the /kanban skill's PM ownership
- @tech-lead -> @developer: test-writing is asserted but not exercised — only 1 of 10 DEV benchmarks executes code
- @developer -> @code-reviewer: security-audit overclaims deep audit and its cited wiring path is dead
- @code-reviewer -> @qa-engineer: release-certification path conflict
- @ml-ai-ops -> @devops-engineer: finops has no receiving process
- @devops-engineer -> @security-engineer: registry overclaims
- @security-engineer -> @performance-engineer: engine telemetry is not app latency
- @performance-engineer -> @ml-ai-engineer: content-free wiring
- @ml-ai-engineer -> @ml-ai-ops: drift-monitoring substring collision
- @user-researcher -> @founder: labels and arbitration unwired
- @founder -> @product-manager: five AI-PM capabilities are wired only by a plan doc that calls them reasoning-only
- @product-manager -> @product-designer: microcopy AI branch has no home
- @product-designer -> @researcher: technology-trends zero wiring
- @researcher -> @user-researcher: step-02c forces fabrication
- @shifu -> @ux-researcher: journey-mapping is unexercisable — the cited template has no journey section and the skill delegates elsewhere
- @ux-researcher -> @data-analyst: labels consumer-invisible
- @data-analyst -> @technical-writer: diataxis wiring overstated
- @technical-writer -> @shifu: contract row omits 3 capabilities
```

## Round 1 — Positions (per group)

### Group 1 — Engineering core

**@architect** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: system-design/adr-writing/api-contracts/data-modeling CONFIRMED (step-02-architecture, adr-template, orchestrator gate). Four AI capabilities PARTIAL — persona prose only (`architect.md:250-284`); no skill step/template implements AI-ADRs; registry wiring points at non-AI paths. Output ADR paths have no consumers. CHALLENGE @tech-lead (CONFIRMED): Kanban custody conflict — `tech-lead.md:280` claims all board updates while `/kanban` SKILL:9 + contract assign kanban to PM; column vocabulary diverges (`Backlog` vs `To Do`). CHANGES: AI-ADR sub-step; resolve Kanban split; rename column.

**@tech-lead** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: task-breakdown/estimation/execution-planning CONFIRMED (plan skill, template, benchmarks); dependency-management contract-miss (row omits label). CHALLENGE @developer (PARTIAL): test-writing asserted, not exercised — 9/10 DEV benchmarks keyword-graded; DEV-10 asserts "unit tests passing" without running tests; only DEV-01 executes. CHANGES: harden DEV-10 with materialize+runTestCommand; add dependency-management to row; bind per-capability wiring in the gate.

**@developer** — `[VERDICT: CONFIRMED]` · `SATISFACTION: CHANGES REQUESTED`
OWN: code-generation/test-writing/refactoring/motion-implementation backed (dev-loop §6.2, developer-guidelines TDD, DEV-01 executable; audit DOC-ONLY = string-match false negative). CHALLENGE @code-reviewer (FALSIFIED): `security-audit` overclaims — contract disavows deep audit; cited step-07 wiring contains zero code-reviewer mentions; `pattern-analysis` legacy-only. CHANGES: add core-swarm suite to developer wiring; rename security-audit→security-triage + drop pattern-analysis; drop dead wiring path.

**@code-reviewer** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: code-review CONFIRMED (review skill + gates); security-audit PARTIAL (triage, not audit); pattern-analysis PARTIAL (legacy-only). CHALLENGE @qa-engineer (FALSIFIED): release-certification path — `qa-engineer.md:313` declares `05-execution/quality/release-readiness.md`; live artifact is `06-launch/release-readiness.md`; `qa-report.md` vs `test-report.md` drift; 10% vs 15% token-inflation contradiction. CHANGES: QA path fix; QA threshold fix; own rename/drop.

**@qa-engineer** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: test pipeline + ai-eval-harness CONFIRMED (baseline.js exit-2 gate, negative-control tests); ai-regression-monitoring PARTIAL (no pinned baseline; CI diffs no real run); adversarial-testing PARTIAL (datasets exist, not in wiring); release-certification PARTIAL (path conflict). CHALLENGE @architect (FALSIFIED-as-wired): AI capabilities have no runnable artifact; AI feature clears arch-review with none of the AI invariants checkable. HANDOFFS BROKEN: release-readiness dual paths; QA report naming; baseline→CI. CHANGES: path + threshold fixes; AI-ADR block or drop labels.

### Group 2 — Platform & trust

**@devops-engineer** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: deployment CONFIRMED; ci-cd/monitoring/infrastructure PARTIAL (no build/deploy stage, launch monitoring assigned to others, zero IaC); finops ORPHAN (zero cost wiring). CHALLENGE @security-engineer (PARTIAL): registry overclaims — threat-modeling/vulnerability-scanning legacy-only, security-review doc-only, ai-app-security orphan; threat-model.md/dependency-scan.md have zero consumers. HANDOFFS BROKEN: secrets/network, deployment runbook, monitoring artifacts. CHANGES: per-capability wiring gate; finops artifact; security wire-or-drop.

**@security-engineer** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: vulnerability-scanning + supply-chain-audit CONFIRMED (scanner exit contract, CI gate, held-out recall); ai-application-security CONFIRMED (INJ-PROMPT/TOOL/ROLE/TEMPLATE rules, held-out fixtures, AGENT-SECURITY-02) — audit ORPHAN is stale; security-review CONFIRMED (step-07 auto-invoke); threat-modeling PARTIAL (persona-only, no template/consumer). CHALLENGE @performance-engineer (PARTIAL): wiring paths are engine token telemetry, not app latency; no load harness; labels legacy-only. CHANGES: registry row additions; threat-model template or retire; perf labels wire-or-drop.

**@performance-engineer** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: profiling/optimization real but engine-internal only; latency-analysis/load-testing unverified (no product path, no harness). CHALLENGE @ml-ai-engineer (FALSIFIED): `tier-comparison.json` wiring contains zero Kai benchmarks (all developer) — content-free. HANDOFFS BROKEN: perf report dual canonical paths; `telemetry_surface.js` dead ref. CHANGES: replace wiring with a real ML suite; per-capability wiring assertion; drop load-testing/latency-analysis or wire a harness.

**@ml-ai-engineer** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: eval-harness-design/model-evaluation partially backed (benchmarks + baseline tool); rag/fine-tune/ml-integration benchmark-only; context-window-engineering one prose mention. CHALLENGE @ml-ai-ops (FALSIFIED): drift-monitoring is a substring collision; model card template lacks rollback/rehearsal — Atlas's precondition unmet. CHANGES: per-capability wiring (remove tier-comparison); model-card rollback section; wire or drop context-window-engineering.

**@ml-ai-ops** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: registry↔frontmatter 7/7 match and gate passes, but wiring decorative (tier-comparison is developer-only); 6/7 doc-only; no production artifact. CHALLENGE @devops-engineer (PARTIAL): finops ownership has no receiving process. HANDOFFS: ml-ai-engineer→ops OK (template); ops→qa BROKEN; ops→devops PARTIAL. CHANGES: finops artifact; ml-ops-runbook with drift thresholds + rollback rehearsal; launch-readiness AI input.

### Group 3 — Product & discovery

**@founder** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: verdict-gate behavior real and adversarially benchmarked; labels themselves legacy-only; decision-making KEEP = mechanical false positive. CHALLENGE @product-manager (PARTIAL): AI caps wired only via a plan doc that says reasoning-only; "PRD §9" token economics points at Timeline & Phases. HANDOFFS: brief → researcher/PM/designer OK; `03-strategy/updates.md` orphan. CHANGES: capability block in validate-idea skill; fix PRD §9 or template; stop citing 02d as wiring.

**@product-manager** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: PRD/stories/backlog CONFIRMED; five AI caps plan-doc/persona-only; real template gap (no token/latency/eval-rubric fields; §9 mismatch). CHALLENGE @product-designer (PARTIAL): microcopy AI branch has no disk home; persona:306 unilateral spec-coverage vs :241/:378; AC-ML* vs AC-AI* prefix split. HANDOFFS: requirements/stories/SPEC/kanban OK; story→spec trace unenforced. CHANGES: designer AI-state strings; escalation wording; unify AC prefix + PRD budget fields.

**@product-designer** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: design-system/ui-design/ux-specification CONFIRMED; motion-design CONFIRMED; microcopy PARTIAL (template-level home exists; label unwired); wireframing PARTIAL (no artifact anywhere). CHALLENGE @researcher (PARTIAL): technology-trends zero wiring; gate loophole. HANDOFFS: competitive-analysis OK; journey-maps.md no consumer BROKEN; spec/design → dev OK. CHANGES: researcher wire/cut trends; drop or wire wireframing; add journey-maps input to design skill.

**@researcher** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: market-analysis/competitor-research/motion-market-research CONFIRMED (steps + guide); technology-trends PARTIAL (no deliverable). CHALLENGE @user-researcher (PARTIAL): /explore-idea step-02c forces personas with no human data; benchmark rewards fabrication with no labeling assertion. CHANGES: trends deliverable or delete; gate step-02c with HYPOTHESIS-ONLY; extend benchmark.

**@user-researcher** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: interview-preparation/persona-mapping PARTIAL (functional, labels unwired); jobs-to-be-done PARTIAL (jtbd skill delegates to PM — false citation); user-interviews FALSIFIED (contradicts own boundary); research-synthesis FALSIFIED (no named step). CHALLENGE @founder (PARTIAL): labels legacy-only; arbitration duty unwired. CHANGES: drop user-interviews; fix jtbd delegation; founder arbitration wire-or-delete.

### Group 4 — Experience & meta

**@ux-researcher** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: usability-evaluation CONFIRMED; motion-usability-research CONFIRMED; usability-test-preparation PARTIAL (persona-only); journey-mapping/interaction-design FALSIFIED as hers (journey-map skill delegates to user-researcher; interaction-design legacy-only). CHALLENGE @data-analyst (PARTIAL): 4/9 labels consumer-invisible; benchmarks cover few capabilities. HANDOFFS: ux-report → design/PM OK; prd-template path has stray `/ux/`; test-kit/signoff artifacts zero consumers. CHANGES: drop journey/interaction labels; wire test kit; fix prd path.

**@data-analyst** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: all 9 labels resolve to verified sections (measurement-plan template, analyze-data skill); ORPHAN verdicts are string-match artifacts; but 3-4 labels lack benchmarks/consumers. CHALLENGE @technical-writer (PARTIAL): diataxis wiring overstated (citation-format irrelevant; step-09 no mode classification). HANDOFFS: measurement-plan → develop BROKEN; → test BROKEN; analytics-insights OK. CHANGES: wire measurement-plan into dev/test; Diátaxis mode requirement in step-09; drop citation-format from her wiring.

**@technical-writer** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: documentation/release-notes CONFIRMED; api-reference PARTIAL (no endpoint template); diataxis PARTIAL (wiring irrelevant). @memory-controller row verification: `[VERDICT: CONFIRMED]` — caps match, all 4 wiring paths exist and enforce validation/archive behavior; audit stamps stale. CHALLENGE @shifu (PARTIAL): contract row omits 3 capabilities. HANDOFFS: step-09 OK; her outputs + runbook zero consumers BROKEN; shifu→her edge BROKEN. CHANGES: repoint diataxis wiring; endpoint template; drop runbook duplicate; shifu row fix.

**@shifu** — `[VERDICT: PARTIAL]` · `SATISFACTION: CHANGES REQUESTED`
OWN: all 4 capabilities CONFIRMED (teach-me/craft-lesson steps + benchmark). CHALLENGE @ux-researcher (PARTIAL): journey-mapping unexercisable; gate loophole. HANDOFFS: teaching outputs dir absent + consumers reference-free BROKEN; launch sign-off OK. CHANGES: contract row names 3 caps; journey-map owner fix; extract usability-test-kit template.

## Round 2 — Defense & Concession (all 19 challenged)

| Agent | Outcome | Amendment |
|---|---|---|
| @architect | CONCESSION (AI invariants uncheckable) | AI-ADR sub-step **+ blocking check in step-03a arch-review** |
| @tech-lead | CONCESSION (kanban overclaim) | Recast as delegate; delete "Backlog seeded"; "Ready"→"To Do" |
| @developer | CONCESSION (DEV-10 non-executing) | New benchmark materializes implementation **and** test file + runTestCommand; replace DEV-10 assert |
| @code-reviewer | CONCESSION (dead wiring) | Rename security-triage; drop step-07 wiring; delete pattern-analysis |
| @qa-engineer | CONCESSION (all three verified) | Merge path+threshold fix; canonicalize `test-report.md` |
| @devops-engineer | CONCESSION (finops ORPHAN) | FinOps artifact must name the blocked-promotion resolver + cost gate in launch readiness |
| @security-engineer | DEFENSE on 4/5; CONCESSION on threat-modeling | Registry gets INJ rules + AGENT-SECURITY-02 (corpus dropped as fixture evidence); retire zero-consumer outputs unless wired |
| @performance-engineer | CONCESSION (all four) | Remove latency-analysis + load-testing outright; keep engine-internal profiling/optimization |
| @ml-ai-engineer | CONCESSION (content-free wiring) | Per-capability wiring map; drop tier-comparison; wire or drop context-window-engineering/ml-integration |
| @ml-ai-ops | CONCESSION (substring collision + no rollback) | Runbook with drift thresholds + rollback rehearsal; model-card Rollback section filed to Kai |
| @founder | DEFENSE (arbitration IS in workflow.md §3.2 + GUARDRAILS:111); CONCESSION (no step/eval/row) | Name Level-3 arbitration in capability block; add scope-dispute benchmark |
| @product-manager | CONCESSION (reasoning-only) | AC-AI block in story template (replacing AC-ML*); budget fields in PRD §13.1; reclassify AI caps until then |
| @product-designer | CONCESSION | AI string slots (low-confidence, inference-failed, citation); cite Content & tone; escalation rule at :306 |
| @researcher | CONCESSION (zero wiring) | Deletion-first for technology-trends unless a consumer needs it; per-capability gate |
| @user-researcher | CONCESSION (own benchmark rewards fabrication) | step-02c hypothesis gate; benchmark fixture + labeling assertion; drop user-interviews; fix jtbd |
| @data-analyst | DEFENSE (funnels + PM collaboration covered); CONCESSION (4 labels bare) | Add AGENT-DATAANALYST-03 (experiments) + -04 (dashboards) |
| @technical-writer | CONCESSION | Drop citation-format wiring; four-mode rule in step-09; mode-separation assertion |
| @shifu | CONCESSION (row stale, work real) | Fix row; mechanically re-grep all 39 CONTRACT-MISS entries |
| @ux-researcher | CONCESSION | Remove journey-mapping + interaction-design labels; also fix owns cell |

**Concession lines (machine-readable):**
[CONCESSION: AI invariants uncheckable — arch review can pass an AI feature with no AI-ADR]
[CONCESSION: kanban custody overclaimed — PM owns the board, tech-lead moves cards]
[CONCESSION: test-writing not exercised — DEV-10 asserted tests without running them]
[CONCESSION: security-audit wiring dead — step-07 has zero code-reviewer references]
[CONCESSION: release-certification path and threshold both wrong]
[CONCESSION: finops ORPHAN — no cost wiring or blocked-promotion resolver]
[CONCESSION: threat-modeling persona-only — no template, no consumer]
[CONCESSION: latency-analysis and load-testing unbacked — no product path, no harness]
[CONCESSION: tier-comparison wiring content-free — no Kai benchmarks in that file]
[CONCESSION: drift-monitoring substring collision; model card lacks rollback]
[CONCESSION: arbitration exists in GUARDRAILS but has no step, eval, or registry entry]
[CONCESSION: AI-PM capabilities are reasoning-only until AC-AI and budget fields land]
[CONCESSION: microcopy AI branch has no template home; arbitration rule missing]
[CONCESSION: technology-trends zero wiring — deletion-first unless a consumer needs it]
[CONCESSION: own benchmark rewards fabricated evidence; step-02c needs a hypothesis gate]
[CONCESSION: four labels bare — experiments, dashboards, visualization, insight translation]
[CONCESSION: citation-format wiring irrelevant to Diátaxis; step-09 has no mode rule]
[CONCESSION: contract row omits three capabilities; CONTRACT-MISS sweep required]
[CONCESSION: journey-mapping unexercisable; owns cell contradicts the journey-map skill]

## Systemic findings (independently raised by 8+ agents)

1. **The consistency gate checks path existence, not relevance.** `tests/agent-capability-contract.test.js:78-91` passes if any wiring path per agent exists — decorative wiring, substring collisions, and dead paths all pass. Raised by @tech-lead, @code-reviewer, @qa-engineer, @devops-engineer, @performance-engineer, @ml-ai-engineer, @ml-ai-ops, @founder, @researcher, @user-researcher, @data-analyst, @shifu, @ux-researcher. **Fix: per-capability wiring assertion + content relevance check.**
2. **False citations.** Registry rows cite paths that ground other capabilities (@founder, @ml-ai-engineer/@ml-ai-ops tier-comparison, @technical-writer citation-format, @user-researcher jtbd, @ux-researcher journey).
3. **Artifact path conflicts** (producer vs consumer): QA release-readiness (05 vs 06), qa-report vs test-report, perf report (05 vs 07), prd-template `/ux/` stray path, model card missing rollback, `telemetry_surface.js` dead ref.
4. **One fabricated-evidence path in a skill:** `/explore-idea` step-02c orders personas with no human data — contradicts @user-researcher's boundary and is rewarded by a benchmark.
5. **Threshold contradiction:** qa-engineer >10% vs 15% (baseline.js default 15%).

## Synthesis

**Owner brief.** The panel reviewed all 19 reasoning agents (memory-controller verified separately by Clara) against the capability registry, the audit, and the disk; every agent came back **CHANGES REQUESTED**, and the biggest problem is systemic: the new consistency test lets a capability claim pass as long as *some* path exists, so about a dozen decorative or false wiring claims slipped through — plus four real capability overclaims (perf `load-testing`/`latency-analysis`, ux `journey-mapping`/`interaction-design`, researcher `technology-trends`, user-researcher `user-interviews`), several artifact-path conflicts that would send consumers to files that never exist, and one skill step that orders research agents to fabricate personas with no human data. None of this is catastrophic; all of it is fixable, and the fix list is below. The capability set itself is broadly real — the labels and wiring were the weak layer, exactly as the audit predicted.

**What's-wrong → why-it-matters → consequence:**
- The gate's path-existence check → it cannot distinguish evidence from decoration → a green test currently proves almost nothing about ~40 of 110 labels.
- Four overclaims and ~20 unwired labels → agents promise work no artifact backs → users invoke capabilities that silently don't exist.
- Path conflicts and one fabrication-rewarding benchmark → consumers read the wrong file; a research agent is incentivized to invent participants.
- The fixes are mechanical (single-file edits, one test upgrade, a handful of templates) — no re-architecture needed.

```roundtable-points
points: P1 [agenda], P2 [agenda], P3 [facet], P4 [facet], P5 [facet]
dispositions:
- P1: covered — all 110 labels audited by owners + challengers; verdicts per agent above; 4 overclaims identified for drop/rename, ~20 for wiring
- P2: covered — every seat checked its edges; 12 broken/conflicting edges catalogued in the fix list
- P3: covered — dispositions decided per label: 2 renamed (done), 4 drops confirmed (perf×2, ux×2), 3 drops pending consumer check (technology-trends, user-interviews, pattern-analysis), rest wired via per-capability map
- P4: covered — 30→60 benchmarks accepted; panel requires execution-backed DEV test-writing benchmark + data-analyst 03/04 + founder dispute + user-researcher labeling benchmarks (Phase 5)
- P5: covered — vacuous default-baseline diff and mock SRSR artifact documented; both need one-line guards (Phase 5)
```

[SYNTHESIS: RESHAPE]

## Consolidated change list (Phase 5 input)

**P0 — systemic gate (fix first):** upgrade `tests/agent-capability-contract.test.js` to a per-capability wiring map: every capability → its own path(s); wiring content must reference the owning agent or capability (kill decorative rows).

**P1 — capability truth (drops/renames):** `performance-engineer`: drop `latency-analysis`, `load-testing`; `ux-researcher`: drop `journey-mapping`, `interaction-design` (+ owns cell); `user-researcher`: drop `user-interviews`; `code-reviewer`: rename `security-audit`→`security-triage`, drop `pattern-analysis`; `researcher`: delete-first `technology-trends`; `ml-ai-engineer`: wire or drop `context-window-engineering`, `ml-integration`; `product-designer`: wire or drop `wireframing`; `security-engineer`: wire or retire `threat-modeling` + zero-consumer outputs; `devops-engineer`: wire `finops-cost-management` to a real artifact.

**P2 — contract rows:** shifu (3 caps), tech-lead (dependency-management), PM (reclassify AI caps reasoning-only until wired), security (INJ rules + SEC-02 wiring), perf, ml-ai rows, ux owns cell, founder arbitration entry.

**P3 — artifact/consumer edges:** QA release-readiness → `06-launch/`; canonicalize `test-report.md`; perf report path; prd-template `/ux/` path; model-card Rollback section; `telemetry_surface.js` ref; journey-maps into design inputs; measurement-plan into develop/test; usability-test-kit into design SKILL; teaching outputs consumers.

**P4 — skill/template edits:** AI-ADR sub-step + arch-review blocking check; step-02c hypothesis gate; step-09 Diátaxis mode rule; jtbd delegation fix; kanban wording/vocabulary; microcopy AI string slots; PRD §13.1 budget fields; AC-AI block; finops reference; ml-ops runbook; threat-model template; usability-test-kit template; API endpoint template.

**P5 — evals:** DEV executable test-writing benchmark; DATAANALYST-03/04; FOUNDER dispute benchmark; USERRESEARCHER labeling benchmark + fixture; designer AI-uncertainty assertion; techwriter mode-separation assertion.

**P6 — harness fixes:** default-baseline vacuous diff guard; mock SRSR documentation/guard; qa 10%→15% threshold text.
