# Phase 5 — Deeper Bench (Post-v2.0 Enrichment)

> **Status:** Post-v2.0 enrichment. NOT in master roadmap v2.0 F-numbering. Lives in `4. persona-skill-enrichment-plan.md` (file 4) and needs to be merged into a future master roadmap revision (v2.1 or v3.0).
> **Themes:** T1 (Agent depth), T2 (Skill atomicity), T6 (Modularity)
> **Goal:** Enrich the 21-persona bench to ~40 personas and 23-skill library to ~46 skills. Add 3 new opt-in squads (`growth`, `data-platform`, `migration`). Lock the gap between v1.7's "engineering core" and the broader product-team needs.
> **Total effort:** ~60 hours across 3 tiers (T1: 6 weeks, T2: 3 weeks, T3: 1 week)

## Source

This phase is the **complete content** of `4. persona-skill-enrichment-plan.md`. The file has the full per-persona and per-skill specs; this file is the **checklist view**.

## Scope

| Tier | Personas | Skills | Effort | Calendar |
|---|---|---|---|---|
| **T1 — Deeper Bench** | 14 | 13 | ~6 weeks | 1.0 |
| **T2 — Game Studio + Brand** | 5 | 4 | ~3 weeks | 2.0 |
| **T3 — Back Office** | 1 | 0 | ~1 week | 3.0 |
| **Total** | **18 new** | **16 new** | **~10 weeks** | |

After T1+T2+T3, vespyr has:
- **~40 personas** (21 existing + 18 new + 1 deferred = 40)
- **~46 skills** (23 existing + 16 new + ~7 cross-cutting = ~46)
- **10 squads** (7 existing + 3 new opt-in)

---

## Tier 1 — Deeper Bench (6 weeks, ships first)

### New Personas (T1, 14 total)

For each persona, the work is:
1. Create the agent file (v2 frontmatter, IDENTITY block, channeled mentor, icon)
2. Wire into the appropriate squad(s)
3. Add to `agent-contracts.md` (owns/doesn't-own)
4. Add to `.agents/references/glossary.md` if it introduces new terminology

- [ ] 5.1 — `@brainstormer` (Carson) — divergent ideation coach; channels Alex Osborn + Keith Johnstone
- [ ] 5.2 — `@innovation-strategist` (Victor) — disruptive innovation oracle; channels Christensen + Kim/Mauborgne
- [ ] 5.3 — `@problem-solver` (Quinn) — master problem solver; channels Altshuller (TRIZ) + Meadows
- [ ] 5.4 — `@storyteller` (Sophia) — master storyteller; channels McKee + Campbell
- [ ] 5.5 — `@presentation-master` (Caravaggio) — visual communication; channels Duarte + Saul Bass
- [ ] 5.10 — `@growth-marketer` (Maya) — marketing & growth; channels Dunford + Ellis + Shah
- [ ] 5.11 — `@seo-specialist` (Clio) — SEO strategist; channels Fishkin + Solis
- [ ] 5.12 — `@database-engineer` (Cassandra) — DB specialist; channels Stonebraker + Winand
- [ ] 5.13 — `@api-designer` (Mercury) — API surface review; channels Kin Lane + API Stylebook
- [ ] 5.14 — `@ml-ops` (Atlas) — ML production systems; channels Huyen Chip + Mohandas
- [ ] 5.15 — `@accessibility-architect` (Atlas-A11y) — WCAG audit; channels Watson + de Vries
- [ ] 5.16 — `@migration-engineer` (Hermes) — migrations; channels Brandur Leach + Charity Majors
- [ ] 5.17 — `@customer-success` (Iris-CS) — CSM; channels Lincoln Murphy + Nick Mehta
- [ ] 5.18 — `@support-engineer` (Aegis) — support lead; channels Robert Rose + Intercom playbook

### New Skills (T1, 13 total)

For each skill, the work is:
1. Create the folder + `SKILL.md` (boilerplate 50 lines)
2. Create the `steps/` (or tri-modal subfolders)
3. Add to the orchestrator state machine (if it gates a phase)
4. Document in `skills.md` quick-reference
5. Test with a real example

- [ ] 5.21 — `/brainstorming` — divergent ideation workshop; primary agent `@brainstormer`
- [ ] 5.23 — `/pr-faq` (Working Backwards) — press release + FAQ; primary `@product-manager`
- [ ] 5.24 — `/epics-and-stories` — decompose PRD; primary `@product-manager`
- [ ] 5.25 — `/market-research` — TAM/SAM/SOM + GTM; primary `@growth-marketer`
- [ ] 5.26 — `/storytelling` — narrative artifacts; primary `@storyteller`
- [ ] 5.27 — `/presentation` — pitch/deck architecture; primary `@presentation-master`
- [ ] 5.28 — `/design-thinking` — empathy-first discovery; primary `@user-researcher` + `@ux-researcher`
- [ ] 5.31 — `/accessibility-audit` — WCAG 2.2 AA; primary `@accessibility-architect`
- [ ] 5.32 — `/cost-analysis` (FinOps) — cloud cost; primary `@devops-engineer` + `@architect`
- [ ] 5.33 — `/api-design` — API surface review; primary `@api-designer`
- [ ] 5.34 — `/database-migration` — schema/data migrations; primary `@database-engineer` + `@migration-engineer`
- [ ] 5.35 — `/migrate-stack` — framework/language/cloud; primary `@migration-engineer` + `@architect`
- [ ] 5.36 — `/correct-course` — mid-flight pivot; primary `@founder` leads

### Squad Updates (T1)

- [ ] 5.41 — Add `@growth-marketer`, `@seo-specialist`, `@customer-success`, `@support-engineer` to a new `growth` squad (opt-in)
- [ ] 5.42 — Add `@database-engineer`, `@ml-ops`, `@migration-engineer` to a new `data-platform` squad (opt-in)
- [ ] 5.43 — Add `@migration-engineer` to a new `migration` squad (opt-in, paired with `data-platform` for the DB portion)
- [ ] 5.44 — Update existing squads: `startup` adds `@brainstormer`; `build` adds `@database-engineer` + `@api-designer`; `ship` adds `@accessibility-architect`

### Tier 1 Done when

- [ ] All 14 T1 personas have v2 frontmatter, IDENTITY block, channeled mentor, icon
- [ ] All 13 T1 skills are folder + `SKILL.md` + `steps/` (or tri-modal subfolders)
- [ ] The `brainstormer ↔ founder` pairing is documented in `AGENTS.md`
- [ ] The `humanize` skill is invoked by default by every external-facing persona
- [ ] No persona duplicates an existing persona's charter (per file 4 AC #6)
- [ ] The 3 new squads (`growth`, `data-platform`, `migration`) are opt-in via `install-modules`

---

## Tier 2 — Game Studio + Brand (3 weeks, ships after T1)

### New Personas (T2, 5 total)

- [ ] 5.6 — `@narrative-engineer` (Homer) — story & world architect; channels Crawford + Hennig
- [ ] 5.7 — `@game-designer` (Samus Shepard) — game designer; channels Miyamoto + Sid Meier
- [ ] 5.8 — `@game-developer` (Link Freeman) — game developer; channels Casey Muratori + Naoki Yoshida
- [ ] 5.9 — `@level-designer` (Braid) — level/encounter designer; channels Romero + Naughty Dog
- [ ] 5.20 — `@brand-voice-curator` (Echo) — brand voice consistency; channels various brand strategists
- [ ] 5.21 (T2) — `@content-engineer` (Quill+) — content production; channels editorial + SEO combined

### New Skills (T2, 4 total)

- [ ] 5.22 — `/domain-research` — deep market & industry research; complements `/validate-idea`
- [ ] 5.29 — `/game-design-doc` — GDD authoring; primary `@game-designer` + `@narrative-engineer`
- [ ] 5.30 — `/playtest-plan` — playtesting methodology; primary `@game-designer` + `@ux-researcher`
- [ ] 5.40 — `/brand-voice` — brand voice consistency audit
- [ ] 5.41 — `/seo` — SEO audit + optimization
- [ ] 5.42 — `/content-engine` — content production pipeline

### Squad Updates (T2)

- [ ] 5.45 — Update `game-studio` squad with `@game-designer`, `@game-developer`, `@narrative-engineer`, `@level-designer`
- [ ] 5.46 — `growth` squad adds `@brand-voice-curator` + `@content-engineer`

### Tier 2 Done when

- [ ] All 5 T2 personas have full charters
- [ ] All 4 T2 skills are folder + step files
- [ ] The `game-studio` squad is fully populated (uses the T1 T2 personas + the original `validate-game-idea` + `explore-game-idea` skills)
- [ ] A working game project (even a prototype) exercises every game persona and skill

---

## Tier 3 — Back Office (1 week, ships last)

### New Personas (T3, 1 total)

- [ ] 5.50 — `@legal-counsel` (Justitia) — privacy-focused legal review; read-only, flags issues

**Hard rules:**
- [ ] Persona is jurisdiction-agnostic; flags GDPR/CCPA/HIPAA-relevant patterns
- [ ] Persona is read-only; never drafts legal text
- [ ] Persona is opt-in; not in any default squad
- [ ] Persona ships in a separate minor release (v2.1 or v2.2) so it can be reviewed by an actual lawyer

---

## Cross-cutting updates for Phase 5

- [ ] 5.60 — `validate_frontmatter.js` updates to enforce:
  - [ ] Persona count ≤ 50 (sanity check; alarm at 50)
  - [ ] No duplicate charter descriptions
  - [ ] Channeled mentor count ≤ 2 per persona
- [ ] 5.61 — `test_catalog_parity.js` (from Phase 3) updates with the new persona/skill/squad counts
- [ ] 5.62 — `agent-contracts.md` updates with the 18 new personas' owns/doesn't-own
- [ ] 5.63 — `skills.md` quick-reference updates with the 16 new skills
- [ ] 5.64 — `AGENTS.md` updates the agent count from 21 → ~40
- [ ] 5.65 — `ROADMAP.md` updates with v2.1 or v3.0 entry

---

## Phase 5 Done when

- [ ] 18 new personas all have v2 frontmatter, IDENTITY block, channeled mentor, icon, charter
- [ ] 16 new skills are all folder + step files
- [ ] 3 new opt-in squads (`growth`, `data-platform`, `migration`) work via `install-modules`
- [ ] `humanize` skill is invoked by default by every external-facing persona
- [ ] No persona duplicates an existing persona's charter
- [ ] `validate_frontmatter.js` exits 0 on all ~40 personas
- [ ] `test_catalog_parity.js` exits 0 with the new counts
- [ ] The `brainstormer ↔ founder` pairing is documented
- [ ] `@legal-counsel` ships in a separate minor release after lawyer review

## Risks specific to this phase

- **Persona overlap is discovered post-release.** Pre-release review by `@architect` against the existing 21 personas. The "no overlap" rule is a hard gate.
- **Channeled mentors become a crutch.** Hard rule: max 2 channeled references per persona. Reviewers reject 3+.
- **"21 was already too many" criticism.** Frame the count as "21 core + 19 opt-in." New personas never appear in `startup` or `build` squads by default.
- **The `humanize` skill is too long (565 lines) to be a default for so many personas.** Cache the humanize patterns as a structured checklist (`humanize-checklist.md`), invoked by all external-facing personas.
- **Game-studio squad can't find a real project to validate against.** T2 ship-block is: a working game project (even a prototype) that exercises every game persona and skill.
- **Documentation site becomes the bottleneck.** Each persona ships with a single-page charter in `docs/personas/<name>.md`; the docs site is a marketing surface, not a dependency.

## Master roadmap integration

When Phase 5 ships, the master roadmap should be updated to:
- Add Phase 5 as Phase 5 in the dependency graph
- Add the 18 new personas and 16 new skills to the F-number inventory
- Update the DoD to include "all 40 personas have v2 frontmatter" (was 21)
- Update the squad count from 7 → 10
- Mark `4. persona-skill-enrichment-plan.md` as superseded (or kept as historical reference)

The simplest integration: copy this file's tier-by-tier checklist into master as `Phase 5`, `Phase 6`, `Phase 7`.
