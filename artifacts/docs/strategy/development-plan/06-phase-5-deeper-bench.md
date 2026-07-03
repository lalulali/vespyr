# Phase 5 — Deeper Bench (Post-v2.1 Enrichment)

> **Release:** v2.2
> **Effort:** ~84h
> **Calendar:** Weeks 9-14
> **Themes:** T1 (Agent depth), T2 (Skill atomicity)
> **Goal:** Enrich the 21-persona bench to 43 personas and the 24-skill library to 42 skills. Add 3 new opt-in squads. Fill the gaps between v1.7's engineering core and broader product-team needs.

## What changed from the original

| Item | Original | This file | Why |
|---|---|---|---|
| T1 personas count | 14 (ROADMAP) / 18 (enrichment plan) | **14** | Canonical count. Game personas moved to T2; critic personas deferred. |
| T1 skills count | 13 (ROADMAP) / 14 (enrichment plan) | **14** (incl. llm-wiki) | Canonical count. |
| T2 personas count | 5 (5-deeper-bench) / 6 (enrichment plan) | **7** | Added @finance-analyst (was inconsistently listed). Game personas confirmed T2. |
| T2 skills count | 4 (5-deeper-bench) / 6 (enrichment plan) | **4** | Canonical count: game-design-doc, narrative-design, playtest-plan, domain-research. |
| Critic consortium (4 personas + skill + infrastructure) | T1 (v2.1) | **Deferred to v2.3+** | 600 lines of spec with no consumers. Ship 1 critic first; add others if used. |
| Game personas tier | T1 (enrichment plan) / T2 (ROADMAP) | **T2** | Need a game project to validate against. |
| @devrel | T2 (enrichment plan) | **Deferred to v3.0** | Was listed but marked out-of-scope. Make it explicit. |
| Phase 5 authority | "NOT in master roadmap" (5-deeper-bench) | **Canonical** (this file) | No more disclaiming own authority. |

## Canonical counts (must match README.md §7)

| Tier | New personas | New skills | New squads | Ships in |
|---|---|---|---|---|
| T1 | 14 | 14 (incl. llm-wiki) | 3 (growth, data-platform, migration) | v2.1 (alongside Phase 2-4) |
| T2 | 7 | 4 | 0 | v2.2 |
| T3 | 1 | 0 | 0 | v2.2 |
| **Total new** | **22** | **18** | **3** | |
| **Grand total** | **43** | **42** | **10** | |

### Deferred to v2.3+ (critic consortium)

| Item | Count |
|---|---|
| Critic personas (@research-critic, @code-critic, @ux-critic, @doc-critic) | 4 |
| /critic-review skill | 1 |
| Multi-agent patterns reference | 1 |
| Domain rubrics (research, user-research, ux, code, docs) | 5 |

---

## Tier 1 — Deeper Bench (ships with v2.1, ~60h)

### T1 Personas (14)

For each: create agent file (v2 frontmatter, IDENTITY block, channeled mentor, icon), wire into squad(s), add to `agent-contracts.md`, add to `glossary.md` if new terminology.

- [ ] **T1.1** `@brainstormer` (Carson) — divergent ideation coach; channels Alex Osborn + Keith Johnstone. Permissions: read + question only. Default squad: none (invoked by @founder/@product-manager on demand). Complements @founder (convergent). Effort: ~1 day.
- [ ] **T1.2** `@innovation-strategist` (Victor) — disruptive innovation oracle; channels Christensen + Kim/Mauborgne. Answers: is this incremental, sustaining, or disruptive? Permissions: read + question. Effort: ~1 day.
- [ ] **T1.3** `@problem-solver` (Quinn) — master problem solver; channels Altshuller (TRIZ) + Meadows (systems thinking). 5-step root-cause analysis. Permissions: read + question. Effort: ~1.5 days.
- [ ] **T1.4** `@storyteller` (Sophia) — master storyteller; channels McKee + Campbell. Produces drafts in 3 lengths (tweet/paragraph/long-form). Has "no-AI-tells" override that loads `humanize` skill. Permissions: read + question (outputs via @writer). Effort: ~1.5 days.
- [ ] **T1.5** `@presentation-master` (Caravaggio) — visual communication; channels Duarte + Saul Bass. 3-second rule on every slide. Never writes full slide content — outlines only. Permissions: read + question. Effort: ~1.5 days.
- [ ] **T1.6** `@growth-marketer` (Maya) — marketing & growth; channels Dunford + Ellis + Shah. Owns launch plan, channel strategy, messaging matrix. AARRR framework. ICE scoring. Permissions: read + question. Default squad: `growth` (new, opt-in). Effort: ~2 days.
- [ ] **T1.7** `@seo-specialist` (Clio) — SEO strategist; channels Fishkin + Solis. Audit: robots.txt, sitemap, schema.org, canonical, hreflang, Core Web Vitals. Permissions: read + bash (site crawls). Default squad: `growth`. Effort: ~1 day.
- [ ] **T1.8** `@database-engineer` (Cassandra) — DB specialist; channels Stonebraker + Winand. Schema design, index strategy, query plans, migration safety. OLTP vs OLAP. Permissions: read + bash (EXPLAIN ANALYZE). Effort: ~2 days.
- [ ] **T1.9** `@api-designer` (Mercury) — API surface review; channels Kin Lane + API Stylebook. REST/GraphQL/RPC/event-driven. Postel's Law with discipline. Public vs internal API distinction. Permissions: read + bash (OpenAPI linters). Effort: ~2 days.
- [ ] **T1.10** `@ml-ops` (Atlas) — ML production systems; channels Huyen Chip + Mohandas. Training pipelines, feature stores, model registry, drift detection, rollback. **Distinct from @ml-engineer (Kai)** who owns model development. Shadow-mode-first rule. Permissions: read + bash. Effort: ~3 days.
  - **Handoff rule:** @ml-engineer writes `artifacts/output/architecture/model-approved-for-production.md` (model card, eval results, SLA targets). @ml-ops reads it and owns deployment. Artifact is the contract — no direct inter-agent call.
- [ ] **T1.11** `@accessibility-architect` (Atlas-A11y) — WCAG 2.2 AA; channels Watson + de Vries. POUR principles. Screen reader testing (VoiceOver, NVDA, JAWS). No a11y overlay tools. Permissions: read + bash (axe-core, Pa11y). Default squad: `ship`. Effort: ~2 days.
- [ ] **T1.12** `@migration-engineer` (Hermes) — migrations; channels Brandur Leach + Charity Majors. Expand-migrate-contract pattern. 6-step checklist. Permissions: read + bash. Effort: ~3 days.
- [ ] **T1.13** `@customer-success` (Iris-CS) — CSM; channels Lincoln Murphy + Nick Mehta. Activation vs adoption vs expansion. Permissions: read + question. Default squad: `growth`. Effort: ~1.5 days.
- [ ] **T1.14** `@support-engineer` (Aegis) — support lead; channels Robert Rose + Intercom playbook. Owns FAQ, troubleshooting guides, known-issues log. Reads every ticket, extracts patterns. Permissions: read + bash (issue trackers). Default squad: `growth`. Effort: ~1.5 days.

### T1 Skills (14)

For each: create folder + SKILL.md (bootloader) + steps/ (when multi-step). Add to orchestrator if it gates a phase. Document in skills.md. Test with a real example.

- [ ] **T1.15** `/brainstorming` — divergent ideation workshop; primary @brainstormer. Output: 5+ concepts (1 outlandish) in `00-discovery/brainstorm-output.md`. Uses 6-8 techniques from `brain-methods.csv`. ~1 day.
- [ ] **T1.16** `/pr-faq` (Working Backwards) — Amazon methodology; primary @product-manager. Output: internal press release + customer FAQ + internal FAQ + success criteria. Hard rule: wishy-washy = rejected. ~1 day.
- [ ] **T1.17** `/epics-and-stories` — decompose PRD; primary @product-manager. Output: epics (1-3 months), stories (1-3 days each), ACs (Given/When/Then), stable IDs (US-NNN). ~1.5 days.
- [ ] **T1.18** `/market-research` — TAM/SAM/SOM + GTM; primary @growth-marketer + @researcher + @user-researcher. Output: market-sizing.md with ICP, GTM motion, beachhead segment. ~2 days.
- [ ] **T1.19** `/storytelling` — narrative artifacts; primary @storyteller. Always pairs with `humanize` skill. Output: 3 drafts (tweet/paragraph/long-form) + McKee value-charge review. ~1 day.
- [ ] **T1.20** `/presentation` — pitch/deck architecture; primary @presentation-master. Output: slide-by-slide outline + visual brief + 3-second-rule audit. ~1 day.
- [ ] **T1.21** `/design-thinking` — empathy-first discovery; primary @user-researcher + @ux-researcher. Output: empathy maps, JTBD, "how might we" questions, prototype ideas. ~1.5 days.
- [ ] **T1.22** `/accessibility-audit` — WCAG 2.2 AA; primary @accessibility-architect. Output: violations by POUR principle, assistive-tech test results, P0/P1/P2 remediation list. ~1.5 days.
- [ ] **T1.23** `/cost-analysis` (FinOps) — cloud cost; primary @devops-engineer + @architect. Output: per-service breakdown, top 5 cost drivers, scaling projections (1x/10x/100x), "what to cut first." ~2 days.
- [ ] **T1.24** `/api-design` — API surface review; primary @api-designer. Output: style assessment, contract completeness, breaking-change risk, public-vs-internal classification. ~1.5 days.
- [ ] **T1.25** `/database-migration` — schema/data migrations; primary @database-engineer + @migration-engineer. Output: inventory, expand-migrate-contract plan, dual-write strategy, backfill script, read-switch runbook, rollback. ~2 days.
- [ ] **T1.26** `/migrate-stack` — framework/language/cloud migrations; primary @migration-engineer + @architect. Output: dependency inventory, parity assessment, strangler-fig plan, rollback, "what to keep" decision. ~2 days.
- [ ] **T1.27** `/correct-course` — mid-flight pivot; primary @founder leads, @product-manager for PRD update, @architect for technical impact, @tech-lead for plan update. Output: what changed, blast-radius, cascade (PRD→spec→stories→plan→code), re-validation checklist. ~1.5 days.
- [ ] **T1.28** `/llm-wiki` — LLM-wiki knowledge base generation; primary @technical-writer. Adopted from lewislulu/llm-wiki-skill with improvements: strict citation/footnote policy (every assertion traces to source), link integrity verification (no broken links — output as plain text if target doesn't exist). Output: `artifacts/output/09-wiki/` pages with validated cross-links. ~1.5 days.

### T1 Squad Updates

- [ ] **T1.29** Create `growth` squad (opt-in): @growth-marketer, @seo-specialist, @customer-success, @support-engineer, @data-analyst, @technical-writer
- [ ] **T1.30** Create `data-platform` squad (opt-in): @database-engineer, @ml-engineer, @ml-ops, @data-analyst, @architect, @migration-engineer
- [ ] **T1.31** Create `migration` squad (opt-in): @migration-engineer, @architect, @developer, @database-engineer, @qa-engineer, @technical-writer
- [ ] **T1.32** Update existing squads: `startup` adds @brainstormer; `build` adds @database-engineer + @api-designer; `ship` adds @accessibility-architect

### T1 Done when

- [ ] All 14 T1 personas have v2 frontmatter, IDENTITY block, channeled mentor, icon, charter
- [ ] All 14 T1 skills are folder + SKILL.md + steps/ (or tri-modal), integrated with orchestrator
- [ ] The 3 new squads (`growth`, `data-platform`, `migration`) are opt-in via `install-modules`
- [ ] `brainstormer ↔ founder` pairing documented in AGENTS.md (divergent vs convergent)
- [ ] `humanize` skill invoked by default by every external-facing persona (@storyteller, @presentation-master, @growth-marketer, @seo-specialist)
- [ ] @ml-ops ↔ @ml-engineer handoff rule is artifact-based (model-approved-for-production.md), not direct call
- [ ] No persona duplicates an existing persona's charter (pre-release @architect review)
- [ ] Persona gating: each T1 persona clears Gate A (3+ community requests) OR Gate B (≥200 lines with depth)

---

## Tier 2 — Game Studio + Brand (ships in v2.2, ~18h)

### T2 Personas (7)

- [ ] **T2.1** `@narrative-engineer` (Homer) — story & world architect; channels Crawford + Hennig. Narrative arcs, character systems, world lore. Story vs narrative distinction. Default squad: `game-studio`. ~2 days.
- [ ] **T2.2** `@game-designer` (Samus Shepard) — game designer; channels Miyamoto + Sid Meier. Owns GDD, core loop, player fantasy. Hard rule: every mechanic serves the fantasy. Default squad: `game-studio`. ~2 days.
- [ ] **T2.3** `@game-developer` (Link Freeman) — game developer; channels Muratori + Yoshida. Engine-aware (Unity/Unreal/Godot). Mirrors @developer charter with engine-specific additions. Permissions: bash + edit. Default squad: `game-studio`. ~3 days.
- [ ] **T2.4** `@level-designer` (Braid) — level/encounter designer; channels Romero + Naughty Dog. "Teach through play" principle. Default squad: `game-studio`. ~1.5 days.
- [ ] **T2.5** `@brand-voice-curator` (Echo) — brand voice consistency; channels various brand strategists. Default squad: `growth`. ~1 day.
- [ ] **T2.6** `@content-engineer` (Quill+) — content production; channels editorial + SEO combined. Default squad: `growth`. ~1.5 days.
- [ ] **T2.7** `@finance-analyst` (Ledger) — finance & billing ops; channels ECC `finance-billing-ops`. Default squad: none (opt-in). ~1 day.

### T2 Skills (4)

- [ ] **T2.8** `/game-design-doc` — GDD authoring; primary @game-designer + @narrative-engineer. Output: player fantasy, core loop, meta loop, mechanics, progression, art/audio direction, monetization. ~2 days.
- [ ] **T2.9** `/narrative-design` — narrative design; primary @narrative-engineer. ~2 days.
- [ ] **T2.10** `/playtest-plan` — playtesting methodology; primary @game-designer + @ux-researcher. Output: participant criteria, scenario script, observation grid, success metrics. ~1.5 days.
- [ ] **T2.11** `/domain-research` — deep market & industry research; primary @researcher + @user-researcher + @innovation-strategist. Output: domain overview, regulatory landscape, tech shifts, economic forces, key players, white space. ~2 days.

### T2 Squad Updates

- [ ] **T2.12** Update `game-studio` squad: add @game-designer, @game-developer, @narrative-engineer, @level-designer (was missing these personas)
- [ ] **T2.13** `growth` squad adds @brand-voice-curator + @content-engineer

### T2 Done when

- [ ] All 7 T2 personas have full charters (same criteria as T1)
- [ ] All 4 T2 skills are folder + step files
- [ ] `game-studio` squad fully populated
- [ ] **Ship-block:** a working game project (even a prototype) exercises every game persona and skill. If none found, game personas defer to a separate minor release.

---

## Tier 3 — Back Office (ships in v2.2, ~5h)

### T3 Personas (1)

- [ ] **T3.1** `@legal-counsel` (Justitia) — privacy-focused legal review; read-only, flags issues. Jurisdiction-agnostic; flags GDPR/CCPA/HIPAA-relevant patterns. Never drafts legal text. Opt-in; not in any default squad. Ships in a separate minor release so it can be reviewed by an actual lawyer. ~1 week (including lawyer review).

### T3 Done when

- [ ] @legal-counsel has v2 frontmatter, read-only permissions, charter
- [ ] Persona reviewed by an actual lawyer before shipping
- [ ] Ships as opt-in only

---

## Cross-cutting updates

- [ ] **T5.60** `validate_frontmatter.js` updates: persona count ≤ 50 (sanity alarm); no duplicate charter descriptions; channeled mentor count ≤ 2
- [ ] **T5.61** `test_catalog_parity.js` updates with new persona/skill/squad counts (43/42/10)
- [ ] **T5.62** `agent-contracts.md` updates with 22 new personas' owns/doesn't-own
- [ ] **T5.63** `skills.md` quick-reference updates with 18 new skills
- [ ] **T5.64** `AGENTS.md` updates agent count from 21 → 43
- [ ] **T5.65** `ROADMAP.md` updates with v2.2 entry

---

## Phase 5 Done when

- [ ] 22 new personas all have v2 frontmatter, IDENTITY block, channeled mentor, icon, charter
- [ ] 18 new skills all folder + step files
- [ ] 3 new opt-in squads work via `install-modules`
- [ ] `humanize` invoked by default by every external-facing persona
- [ ] No persona duplicates an existing persona's charter
- [ ] `validate_frontmatter.js` exits 0 on all 43 personas
- [ ] `test_catalog_parity.js` exits 0 with new counts (43/42/10)
- [ `brainstormer ↔ founder` pairing documented
- [ ] @ml-ops ↔ @ml-engineer handoff is artifact-based
- [ ] @legal-counsel reviewed by a lawyer and shipped as opt-in

## Risks

- **Persona overlap discovered post-release.** Pre-release @architect review against existing 21. "No overlap" rule is a hard gate.
- **Channeled mentors become a crutch.** Hard rule: max 2 per persona. Reject 3+.
- **"21 was already too many" criticism.** Frame as "21 core + 22 opt-in." New personas never in `startup` or `build` by default.
- **Game-studio squad can't find a real project.** T2 ship-block: a working game project exercises every game persona. If none found, defer to separate minor release.
- **New personas all want `read + bash`, breaking the reasoning/I/O split.** Hard rule: any persona with `bash` is "thinking + execution" (developer-tier). Every bash command goes through `@executor`. The split is preserved.
- **humanize skill too long (565 lines) to be default for many personas.** Cache patterns as `humanize-checklist.md`, invoked by all external-facing personas.
