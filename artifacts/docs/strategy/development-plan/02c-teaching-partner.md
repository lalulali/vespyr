# Plan 02b — Teaching Partner (@shifu + /teach-me + /craft-lesson)

**Status:** Planned
**Date:** 2026-07-24
**Depends on:** Phase 0 (agent personas, frontmatter v2, delegation contracts)
**Theme:** T1 (Agent depth), T2 (Skill atomicity)
**Release:** v2.0
**Priority:** High — needed before Phase 5 deeper bench. Fills an immediate user need (general knowledge sharing and education across domains).

---

## 1. Problem Statement

Users of all roles—including developers, architects, product managers, and educators—regularly need to:
1. **Learn** a new topic quickly and at the right depth (ranging from fundamental programming concepts, mathematics, and history, to advanced software architecture, product management, or domain-specific specialties).
2. **Teach** that topic to stakeholders, teams, or public audiences.

Vespyr has no persona or skill for this. The closest agents are:
- `@technical-writer` (Clara) — writes developer docs, API refs, READMEs. Not learner-facing.
- `@researcher` (Iris) — gathers information but doesn't transform it into teaching formats.
- `@product-manager` (Sarah) — scopes requirements, not curricula.

None of these think about **cognitive load**, **learning objectives**, **assessment design**, or **pedagogical scaffolding**. Teaching is a distinct expertise.

**What this plan adds:**
1. A new agent persona (`@shifu`) with pedagogical principles and 3 explanation styles, designed as a universal learning partner across all domains of knowledge (technical, business, scientific, or general humanities).
4. A personalization layer (`teaching-style.md`) that persists the user's teaching preferences

---

## 2. Why Phase 1 (Skill Improvement), Not Phase 5 (Deeper Bench)

| Consideration | Phase 5 (Deeper Bench) | Phase 1 (This plan) |
|---|---|---|
| **Urgency** | Batch release with 22 other personas in v2.2 | Needed now — knowledge transfer workflow gap |
| **Dependencies** | Critic infrastructure (F0.25-F0.28) gates T1 critics | No infrastructure dependencies — uses existing delegation, memory, and skill patterns |
| **Gate qualification** | Gate A (3+ community requests) or Gate B (≥200 lines depth) | Clears Gate B — full persona with decision trees, failure modes, escalation |
| **Persona depth** | Many Phase 5 personas are "1-day ECC repackage" risk | `@shifu` has 3 explanation styles, 5 pedagogical principles, Socratic stance, Bloom's taxonomy integration |

This ships as a v2.0 skill improvement alongside Phase 1's restructured skills. It follows the same folder + step files pattern established in F1.1-F1.2.

---

## 3. Design Decisions (Locked)

| Decision | Resolution | Rationale |
|---|---|---|
| Agent name | `@shifu` | Chinese for master/teacher. Martial arts connotation — disciplined mastery. |
| Persona name | Kong Qiu (孔丘) | Birth name of Confucius — THE teacher of Chinese civilization. Natural address: "Kong Shifu" (孔师父). |
| Icon | 📚 | |
| Channeled mentors | Richard Feynman + Barbara Oakley | Feynman Technique (first principles teaching) + *Learning How to Learn* (cognitive science of education). |
| Explanation styles | 3 tiers: Beginner / Intermediate / Expert | Orthogonal to output format. You can create a Beginner-style curriculum or an Expert-style cheatsheet. |
| Skill split | `/teach-me` (personal learning) + `/craft-lesson` (create materials for others) | Different complexity: learning is conversational, crafting is structured multi-format output. |
| Format files | Each format as an independent step file in `craft-lesson/steps/` | Follows F1.1-F1.2 pattern. Each format is maintainable independently. |
| Personalization | Medium — `teaching-style.md` in `artifacts/memory/` | Guided onboarding on first invocation. Persistent across sessions. Voice calibration (deep) deferred. |
| "If Nothing Else, Remember This" | User's personal style, opt-in per format | Not blanket — only handbook by default. Other formats opt-in via `teaching-style.md`. |

---

## 4. Implementation Plan

### F1b.1-F1b.3 — New Agent: `@shifu` (Kong Qiu)

**Problem:** No Vespyr agent thinks pedagogically. Teaching requires distinct expertise: learning path design, cognitive load management, assessment creation, explanation style adaptation.

**Target:** A new reasoning agent with full persona depth (≥250 lines), matching the pattern of existing agents like `@researcher` (Iris) and `@technical-writer` (Clara).

**Agent specification:**

| Field | Value |
|---|---|
| `name` | `shifu` |
| `icon` | 📚 |
| `capabilities` | `curriculum-design`, `content-synthesis`, `assessment-creation`, `pedagogical-structuring` |
| `default_squad` | `research` |
| `origin` | `core` |
| `model` | `-` |
| `channeled_mentor` | Richard Feynman + Barbara Oakley |
| `description` | Designs learning paths, synthesizes knowledge into multi-format educational content, adapts explanation depth to audience |
| `version` | `1.0` |
| `last_updated` | 2026-07-24 |
| `human_name` | Kong Qiu |
| `mode` | `subagent` |
| `temperature` | `0.3` |

**Permissions** (reasoning agent — delegates I/O):

```yaml
permission:
  bash: deny
  edit: deny
  glob: allow
  grep: allow
  question: allow
  read: allow
  webfetch: allow
tools:
  write: true
```

**Upstream dependencies:** `@researcher` (topic research), or any domain-expert agent (for domain-specific knowledge and stakeholder context)
**Downstream consumers:** `@writer` (file output), `@technical-writer` (doc integration)

**6 Core Pedagogical Principles (non-negotiable):**

1. **First Principles Explanation** — If you can't explain it simply, you don't understand it well enough. Every concept must pass the "explain to someone with zero context" test before inclusion.
2. **Cognitive Load Theory** — Chunk information into digestible pieces. Never exceed 3-5 new concepts per section. If a section has more, split it.
3. **Bloom's Taxonomy** — Structure learning objectives across the hierarchy: Remember → Understand → Apply → Analyze → Evaluate → Create. Tag each objective.
4. **Spaced Repetition** — Key takeaways repeat across formats in varied forms. The same core insight appears as a syllabus objective, a handbook section, a cheatsheet entry, and a quiz question.
5. **Active Recall** — Sections end with a question or exercise, not a passive summary. The learner's brain should be working, not just reading.
6. **Verifiable Citations & Footnotes** — Learning must be grounded in real-world truth, not speculative AI fabrications. Whenever explaining concepts, historical data, code APIs, or domain facts, `@shifu` must research the topic via internet/webfetch or `@researcher`, embed inline footnotes `[N]`, and list full citations (link, author/org, date) at the end of the lesson/note.

**3 Explanation Styles** (selected at intake, applies to ALL output formats):

| Style | Target Audience | How Concepts Are Explained |
|---|---|---|
| **Beginner** | Non-technical stakeholders, junior team members, anyone new to the domain | Zero jargon. Analogies, stories, everyday comparisons. Break everything to first principles. "Imagine you're explaining this to someone who's never heard of it." |
| **Intermediate** | Cross-functional teams, mid-level practitioners | Balanced. Explains core concepts, defines jargon inline, assumes basic domain literacy. Uses examples from the field. |
| **Expert** | Senior specialists, technical audiences | Dense, precise terminology. Focuses on nuance, edge cases, trade-offs, and "when NOT to use this." Assumes the reader can follow. |

The style dimension is **independent** of the output format dimension. Any style can be combined with any format.

**Socratic Stance:**
- Challenges: "Does the learner actually need to know this?" / "Is this explanation matched to the selected style?" / "What misconception would a beginner form from this wording?"
- Change my mind: Show evidence that a different explanation depth is needed for the target audience.
- Escalate when: Source material is too thin to teach responsibly — would require speculation or fabrication.

**Delegation Contract:**
- Read 1-3 small files: direct
- Read 1+ large file or 4+ files: `@reader`
- Write any file: `@writer`
- Search codebase: `@reader`
- Run any command: `@executor`
- Research a topic: `@researcher`
- Read/write memory: `@memory-controller`

- [ ] **F1b.1** — Create `.agents/agents/shifu.md` (~280 lines): full agent persona following the canonical agent format. Includes: frontmatter, IDENTITY block, Citation Protocol, Socratic Stance, Delegation Contract, Pedagogical Principles, Explanation Styles, Failure Modes, Escalation Patterns.
- [ ] **F1b.2** — Update `.agents/AGENTS.md`: add `@shifu (Kong Qiu)` to "Specialized Domain Experts" table. Add `/teach-me` and `/craft-lesson` to the curated workflows list. Update agent count from 21 → 22.
- [ ] **F1b.3** — Verify `shifu.md` passes `validate_frontmatter.js` (if available). Cross-check all frontmatter fields against the v2 schema from Phase 0.

**Estimate:** 3-4 hours

---

### F1b.4-F1b.7 — Skill A: `/teach-me` (Personal Learning)

**Problem:** When a user or domain expert needs to learn a new topic quickly, there's no Vespyr workflow for it. They either ask the LLM directly (no pedagogical structure) or use `/explore-idea` (research-focused, not learning-focused).

**Target:** A lightweight skill where Vespyr acts as a personal teacher. The user provides a topic, selects a scope and style, and gets a structured explanation.

**When to use:**
- "Teach me about Jobs-to-be-Done"
- "Explain Kubernetes networking like I'm a beginner"
- "I need a deep dive on prompt engineering"

**When NOT to use:**
- Creating materials for others → `/craft-lesson`
- Market/competitor research → `/explore-idea`

**Output scopes** (selected at intake):

| Scope | What you get | Typical length | Saves to file? |
|---|---|---|---|
| **Quick** | TL;DR. 2-5 sentences. Hallway answer. | ~100 words | No (inline) |
| **Explain** | Conversational walkthrough with examples, analogies, "why it matters." | ~500-1500 words | Optional |
| **Deep Dive** | Comprehensive: mental models, edge cases, common mistakes, related concepts, "when NOT to use this." | ~2000-5000 words | Yes |

**Workflow:**

#### Step 1: Intake
- User provides a topic (required)
- `@shifu` loads `teaching-style.md` if it exists via `@memory-controller`

#### Step 2: Style + Scope Selection

**Guided onboarding (first invocation only):**
When no `teaching-style.md` exists, prompt the user with a brief calibration:
- "What explanation style works best for you? **Beginner** (no jargon, analogies-first), **Intermediate** (balanced, some terminology), or **Expert** (dense, precise)?"
- "How deep should we go? **Quick** (TL;DR), **Explain** (walkthrough), or **Deep Dive** (comprehensive)?"
- Save default preferences to `teaching-style.md` via `@memory-controller`

**Subsequent invocations:** Use saved defaults. Ask: "Using your default style (Intermediate, Explain). Override? [yes/no]"

#### Step 3: Generate Response
- **Explain:** `@shifu` generates inline response. No file output. No delegation needed.
- **Breakdown:** `@shifu` generates structured explanation. Optionally save to `artifacts/output/teaching/notes/` via `@writer`.
- **Deep Dive:** `@shifu` delegates topic research to `@researcher` if needed, then produces comprehensive explanation. Save to `artifacts/output/teaching/notes/` via `@writer`.

#### Step 4: Follow-up
- "Want me to go deeper on any section?"
- "Should I save this as a note?"
- "Want to turn this into materials for others? → `/craft-lesson`"

- [ ] **F1b.4** — Create `.agents/skills/teach-me/SKILL.md` (~200 lines): bootloader with prerequisites, input/output spec, workflow steps 1-4, delegation table, guided onboarding flow, cross-references to `/craft-lesson` and `teaching-style.md`.
- [ ] **F1b.5** — Create `artifacts/memory/teaching-style.md` (~30 lines): personalization preferences file. Initial structure with sections for defaults, section patterns, tone, format-specific preferences, and audience defaults. Co-authored on first `/teach-me` or `/craft-lesson` invocation.
- [ ] **F1b.6** — Wire `teaching-style.md` into `@memory-controller`: add to the list of loadable memory files. Loaded when `@shifu` is the invoking agent or when `/teach-me`/`/craft-lesson` skills are active.
- [ ] **F1b.7** — Test (manual): invoke `/teach-me` with topic "JTBD framework" at all 3 scopes × 3 styles. Verify: (a) Quick is ≤5 sentences, (b) Explain uses analogies at Beginner style and terminology at Expert style, (c) Deep Dive saves to file, (d) first-run prompts for preferences.

**Estimate:** 2-3 hours

---

### F1b.8-F1b.18 — Skill B: `/craft-lesson` (Create Materials for Others)

**Problem:** When a user or domain expert needs to teach stakeholders, they manually create slides, handouts, and quizzes from scratch. There's no workflow that transforms knowledge into multiple educational formats from a single knowledge map.

**Target:** A structured multi-phase skill that takes a topic or draft material and produces up to 6 educational formats, all derived from a master knowledge map.

**When to use:**
- "Create a class about JTBD for our product team"
- "I have a training transcript, turn it into a handbook and cheatsheet"
- "Build a presentation on API design for junior developers"

**When NOT to use:**
- Personal learning → `/teach-me`

**Two input modes:**
1. **Topic-only** — user provides a topic, `@shifu` + `@researcher` research it collaboratively
2. **Draft/transcript** — user provides existing material (notes, video transcripts, training recordings), `@shifu` synthesizes it

**Workflow phases:**

```
Phase 1: Intake
    │
    ├── Topic only ──► Phase 2a: Research (delegate to @researcher)
    │
    └── Draft/transcript ──► Phase 2b: Synthesize (@shifu processes material)
    │
    ▼
Phase 3: Structure (knowledge map — master structure)
    │
    ▼
Phase 4: Generate Formats (1 step file per format)
    │
    ▼
Phase 5: Review (@shifu self-reviews against selected style)
```

#### Phase 1: Intake (SKILL.md)
- Identify input type: topic-only vs. draft/transcript
- Select explanation style: Beginner / Intermediate / Expert
- Identify target audience (who will learn this?)
- Select output formats (default: all available, user can pick a subset)
- Load `teaching-style.md` via `@memory-controller`
- **Guided onboarding** (same as `/teach-me` — first run prompts for preferences)

#### Phase 2a: Research (topic-only path)
- Delegate to `@researcher` for topic research
- `@shifu` reviews research output, identifies teachable concepts
- **Gate:** User reviews research summary before proceeding

#### Phase 2b: Synthesize (draft/transcript path)
- `@shifu` processes the provided material
- Extracts key concepts, identifies gaps, structures the knowledge
- Flags areas needing additional research → delegates to `@researcher` if needed
- **Gate:** User reviews concept extraction before proceeding

#### Phase 3: Structure
- `@shifu` creates a **knowledge map** — the master structure that all formats derive from
- Defines learning objectives (tagged with Bloom's taxonomy level)
- Sequences concepts by dependency and cognitive load
- Identifies core insights per section (the "If Nothing Else" candidates — only injected if enabled per format in `teaching-style.md`)
- **Output:** `artifacts/output/teaching/knowledge-map.md`

#### Phase 4: Generate Formats
- Each format is generated from the knowledge map — not independently
- Each format has its own step file in `steps/`
- User selects which formats to generate at intake
- `@shifu` applies the selected explanation style to each format
- Delegate all file writes to `@writer`

#### Phase 5: Review
- `@shifu` self-reviews: "Would the target audience actually understand this at the selected style level?"
- Flags sections where explanation doesn't match chosen style
- Flags jargon in Beginner-style content, oversimplification in Expert-style content
- **Gate:** User reviews final output

**Format step files** (each independent, developed 1-by-1):

| Step file | Format | Output path | Key characteristics |
|---|---|---|---|
| `step-syllabus.md` | Syllabus | `artifacts/output/teaching/syllabus.md` | Course overview: modules, learning objectives (Bloom-tagged), time estimates, prerequisites, assessment strategy |
| `step-handbook.md` | Handbook | `artifacts/output/teaching/handbook.md` | Comprehensive reference. Supports "If Nothing Else, Remember This" sections (opt-in via `teaching-style.md`). Deepest format. |
| `step-cheatsheet.md` | Cheatsheet | `artifacts/output/teaching/cheatsheet.md` | 1-2 page quick reference. Key concepts, decision trees, formulas. Scannable. |
| `step-presentation.md` | Presentation | `artifacts/output/teaching/presentation.md` | Slide outline + speaker notes. One idea per slide. Not actual slides — outline for the presenter. |
| `step-class.md` | Online Class | `artifacts/output/teaching/class/` | Module-based directory: material + quiz per module. Each module aligns to a knowledge map section. |
| `step-video-script.md` | Video Script | `artifacts/output/teaching/video-script.md` | Structured transcript for recording. Timing markers, visual cue placeholders, transition notes. |

Each step file contains:
- Format-specific structural rules and required sections
- Bloom's taxonomy alignment for this format
- Style adaptation notes (how Beginner/Intermediate/Expert affects THIS format)
- Length guidance (min/max per section)
- Whether "If Nothing Else" applies (handbook: yes by default; others: opt-in via `teaching-style.md`)
- Delegation contract for the step

- [ ] **F1b.8** — Create `.agents/skills/craft-lesson/SKILL.md` (~300 lines): bootloader with prerequisites, two input modes, 5-phase workflow, format selection at intake, delegation table, guided onboarding, cross-references to `/teach-me` and `teaching-style.md`.
- [ ] **F1b.9** — Create `.agents/skills/craft-lesson/steps/step-research.md` (~80 lines): Phase 2a — topic-only research path. Delegate to `@researcher`, review output, gate for user approval.
- [ ] **F1b.10** — Create `.agents/skills/craft-lesson/steps/step-synthesize.md` (~80 lines): Phase 2b — draft/transcript synthesis. Concept extraction, gap identification, user approval gate.
- [ ] **F1b.11** — Create `.agents/skills/craft-lesson/steps/step-structure.md` (~100 lines): Phase 3 — knowledge map creation. Learning objectives, Bloom's tagging, concept sequencing, core insight identification.
- [ ] **F1b.12** — Create `.agents/skills/craft-lesson/steps/step-syllabus.md` (~80 lines): format step — syllabus generation from knowledge map.
- [ ] **F1b.13** — Create `.agents/skills/craft-lesson/steps/step-handbook.md` (~100 lines): format step — handbook generation. Includes "If Nothing Else, Remember This" injection when enabled.
- [ ] **F1b.14** — Create `.agents/skills/craft-lesson/steps/step-cheatsheet.md` (~80 lines): format step — cheatsheet generation.
- [ ] **F1b.15** — Create `.agents/skills/craft-lesson/steps/step-presentation.md` (~80 lines): format step — presentation outline + speaker notes.
- [ ] **F1b.16** — Create `.agents/skills/craft-lesson/steps/step-class.md` (~100 lines): format step — online class modules with material + quiz per module.
- [ ] **F1b.17** — Create `.agents/skills/craft-lesson/steps/step-video-script.md` (~80 lines): format step — video script with timing markers and visual cues.
- [ ] **F1b.18** — Create `.agents/skills/craft-lesson/steps/step-review.md` (~60 lines): Phase 5 — self-review against selected style, jargon/oversimplification checks, user approval gate.

**Estimate:** 6-8 hours

---

### F1b.19-F1b.20 — Personalization Layer

**Problem:** Different users have different teaching styles. Some always want "If Nothing Else, Remember This" in handbooks. Some prefer question-based section titles. Some default to Beginner style. These preferences should persist across sessions, not be re-entered every time.

**Target:** A persistent memory file (`teaching-style.md`) that captures user preferences and is loaded automatically during `/teach-me` and `/craft-lesson` invocations. Co-authored on first invocation via guided onboarding.

**`teaching-style.md` structure:**

```markdown
# Teaching Style Preferences

## Defaults
- **Explanation style:** [Beginner | Intermediate | Expert]
- **Default scope (/teach-me):** [Quick | Explain | Deep Dive]

## Section Patterns
- **Core takeaway label:** "If Nothing Else, Remember This"
- **Formats that use core takeaway:** [handbook]
- **Section naming:** [numbered | titled | question-based]

## Tone
- [conversational | authoritative | Socratic]

## Format-Specific Preferences
- **Cheatsheet:** [table-based | bullet-based]
- **Presentation:** [one idea per slide | dense reference slides]
- **Handbook:** [include core takeaway sections: yes]

## Audience Defaults
- Default target audience: [e.g., "non-technical stakeholders"]
```

- [ ] **F1b.19** — Create `artifacts/memory/teaching-style.md` (~30 lines): starter template with empty/default values. Header with format spec. Designed to be filled during guided onboarding.
- [ ] **F1b.20** — Wire into `@memory-controller`: add `teaching-style.md` to loadable memory files. Load condition: `@shifu` is the active agent OR `/teach-me`/`/craft-lesson` skill is running.

**Estimate:** 1 hour

---

### F1b.21 — Integration: AGENTS.md Update

- [ ] **F1b.21** — Update `.agents/AGENTS.md`:
  - Add `@shifu (Kong Qiu)` to "Specialized Domain Experts" table:
    ```
    | **`@shifu` (Kong Qiu)** | Designs learning paths, synthesizes knowledge into multi-format educational content, adapts explanation depth to audience | `artifacts/output/teaching/` |
    ```
  - Add both skills to curated workflows:
    ```
    *   `/teach-me` — Personal learning partner: Quick, Explain, or Deep Dive on any topic
    *   `/craft-lesson` — Create multi-format educational materials (syllabus, handbook, cheatsheet, presentation, class, video script)
    ```
  - Update agent count: 21 → 22

**Estimate:** 0.5 hours

---

## 5. Total Estimate & Development Order

| Section | F-numbers | Hours | Priority |
|---|---|---|---|
| Agent: `@shifu` (Kong Qiu) | F1b.1-F1b.3 | 3-4 | 1st (foundation) |
| Skill: `/teach-me` | F1b.4-F1b.7 | 2-3 | 2nd (simpler skill) |
| Skill: `/craft-lesson` (core) | F1b.8-F1b.11 | 3-4 | 3rd (workflow + knowledge map) |
| Format: Syllabus | F1b.12 | 0.5 | 4th (foundation format) |
| Format: Handbook | F1b.13 | 0.5 | 5th (signature format) |
| Format: Cheatsheet | F1b.14 | 0.5 | 6th |
| Format: Presentation | F1b.15 | 0.5 | 7th |
| Format: Online Class | F1b.16 | 0.5 | 8th |
| Format: Video Script | F1b.17 | 0.5 | 9th |
| Review step | F1b.18 | 0.5 | 10th |
| Personalization | F1b.19-F1b.20 | 1 | 3rd (alongside /teach-me) |
| Integration | F1b.21 | 0.5 | Last |
| **Total** | **21 items** | **13-16 hours** | |

**Development order:**
1. `@shifu` agent persona (F1b.1-F1b.3) — everything depends on this
2. `/teach-me` skill + personalization (F1b.4-F1b.7, F1b.19-F1b.20) — simpler, validates the agent
3. `/craft-lesson` core workflow (F1b.8-F1b.11) — bootloader + research/synthesize/structure phases
4. Format step files 1-by-1 (F1b.12-F1b.17) — each independently testable:
   - Syllabus first (foundation — learning objectives feed other formats)
   - Handbook second (signature format with "If Nothing Else")
   - Cheatsheet, Presentation, Online Class, Video Script
5. Review step (F1b.18)
6. AGENTS.md integration (F1b.21)

---

## 6. File Summary

| Action | File | Purpose | Est. lines |
|---|---|---|---|
| **NEW** | `.agents/agents/shifu.md` | Agent persona | ~280 |
| **NEW** | `.agents/skills/teach-me/SKILL.md` | Personal learning skill | ~200 |
| **NEW** | `.agents/skills/craft-lesson/SKILL.md` | Material creation skill (bootloader) | ~300 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-research.md` | Phase 2a: topic research | ~80 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-synthesize.md` | Phase 2b: draft synthesis | ~80 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-structure.md` | Phase 3: knowledge map | ~100 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-syllabus.md` | Format: syllabus | ~80 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-handbook.md` | Format: handbook | ~100 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-cheatsheet.md` | Format: cheatsheet | ~80 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-presentation.md` | Format: presentation | ~80 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-class.md` | Format: online class | ~100 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-video-script.md` | Format: video script | ~80 |
| **NEW** | `.agents/skills/craft-lesson/steps/step-review.md` | Phase 5: review | ~60 |
| **NEW** | `artifacts/memory/teaching-style.md` | Personalization preferences | ~30 |
| **MODIFY** | `.agents/AGENTS.md` | Register agent + skills | ~10 lines |
| **Total** | **15 files** | | **~1,730 lines** |

---

## 7. Verification

| Check | Method |
|---|---|
| `shifu.md` is valid | Passes `validate_frontmatter.js`. All v2 frontmatter fields present. |
| `/teach-me` Quick scope works | Topic "JTBD" + Beginner + Quick → ≤5 sentences, zero jargon |
| `/teach-me` Deep Dive saves to file | Topic "JTBD" + Expert + Deep Dive → file saved to `artifacts/output/teaching/notes/` |
| `/teach-me` first-run onboarding | No `teaching-style.md` exists → skill prompts for preferences → file created |
| `/teach-me` loads saved defaults | `teaching-style.md` exists → skill uses defaults, offers override |
| `/craft-lesson` topic-only path | Topic "JTBD" → research delegated to `@researcher` → knowledge map → ≥1 format output |
| `/craft-lesson` transcript path | Provide draft text → concept extraction → knowledge map → ≥1 format output |
| Knowledge map produced | `artifacts/output/teaching/knowledge-map.md` exists with Bloom-tagged objectives |
| Handbook has "If Nothing Else" | `teaching-style.md` enables it for handbook → sections present |
| Cheatsheet does NOT have "If Nothing Else" | Unless explicitly opted in via `teaching-style.md` |
| Style × Format independence | Beginner-style + Expert-style produce same-format cheatsheet with different explanation depth |
| `@shifu` delegates I/O | No direct file writes — all via `@writer` |
| All 6 format step files exist | `ls .agents/skills/craft-lesson/steps/step-*.md` returns 8 files (6 formats + research/synthesize/structure/review = 10 total... 6 format + 4 workflow) |

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Explanation styles blur** — Beginner and Intermediate produce similar output | Medium | Medium | Step files include explicit style adaptation notes with concrete examples of what changes per style. Review step checks style fidelity. |
| **Knowledge map too abstract** — formats generate inconsistent content | Low | High | All formats derive from the same knowledge map. The structure step is a hard gate — no format generation without an approved map. |
| **"If Nothing Else" over-applied** — bleeds into formats where it doesn't belong | Low | Low | Opt-in per format in `teaching-style.md`. Handbook defaults to yes, all others default to no. |
| **`@researcher` bottleneck** — topic research takes too long for `/teach-me` Quick scope | Low | Medium | Quick scope does NOT delegate to `@researcher`. Only Deep Dive does. Quick and Explain rely on `@shifu`'s own knowledge + web fetch. |
| **Guided onboarding feels heavy** — user just wants a quick answer | Medium | Medium | Quick scope skips onboarding entirely if no `teaching-style.md` exists — uses sensible defaults (Intermediate style). Only Explain and Deep Dive trigger onboarding. |

---

## 9. Rollback Plan

- **`@shifu` agent:** Delete `.agents/agents/shifu.md`. No other agents reference it.
- **`/teach-me` skill:** Delete `.agents/skills/teach-me/`. No pipeline skills depend on it.
- **`/craft-lesson` skill:** Delete `.agents/skills/craft-lesson/`. No pipeline skills depend on it.
- **`teaching-style.md`:** Delete `artifacts/memory/teaching-style.md`. Other memory files are unaffected.
- **AGENTS.md:** Revert the 3 additions (agent row + 2 skill entries).

All changes are additive. Zero risk to existing skills, agents, or workflows.

---

## 10. Handoff Notes

After this plan ships:
- `@shifu` is available for invocation from any skill or directly
- `/teach-me` and `/craft-lesson` appear in `npx vespyr help`
- `teaching-style.md` is part of the memory layer
- The 6 format step files can be extended with additional formats later (e.g., flashcards, FAQ, case study) by adding new step files — no bootloader changes needed
- Phase 5 (Deeper Bench) agent count adjusts from 21 → 22 baseline
