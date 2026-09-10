# Intent Triage, Autonomous Routing & Anti-Premature Execution Epic (02m — historic 02k)

**Decision:** Formally codify and enforce a 4-layer defense architecture (+ eval verification) against un-persona'd generic AI execution, silent scope broadening, and premature implementation across the Vespyr multi-agent engine:
1. **Core DNA 4 ("The Intent & Scope Triage Gate / Anti-Assumed Execution"):** Add an unconditional invariant to `.agents/references/vespyr-dna.md` and `AGENTS.md`. If a request is ambiguous or multi-track ($0.50 \le C < 0.85$), halt and force the **2–3 Track Fork** card. If unambiguously specific ($C \ge 0.85$), directly adopt the specialist persona banner and execute.
2. **Universal Guardrails (Hardening in `.agents/GUARDRAILS.md` — plan label "§22" descriptive):** Explicitly outlaw "Broad Survey Fallbacks" and generic horizontal summary dumps. Mandate hypothesis-decision anchoring before data gathering or code drafting.
3. **Multi-Harness Intent Routing Directive:** Establish harness-specific routing protocols ensuring that tool-capable harnesses (Antigravity, Claude Code, OpenCode) autonomously invoke specialized subagents/skills upon track confirmation, while context-mention harnesses (Cursor, Windsurf, Kiro) prompt the user with exact `@agent` / `/skill` handles.
4. **Persona Socratic Stance Upgrades & Skill Step 0 Gating:** Update all 20 agent personas with explicit rejection of underspecified briefs, and mandate a non-skippable `step-00-scope-and-decision-anchoring.md` across core skills (`/explore-idea`, `/unpack-problem`, `/plan`, `/develop`, `/design`, `/validate-idea`), enforced deterministically by `step_tracker.js` (exit code 1 if bypassed).
5. **`vespyr-eval` Benchmark Integration:** Add automated regression benchmarks in `evals/suites/invariants/intent-routing.json` (including false-positive decoy traps for trivial tasks) to deterministically verify that un-persona'd domain prompts trigger the triage gate while trivial single-action tasks pass unimpeded.

**Position:** Phase 1 (vespyr 2.0.0) sub-plan — authored as `02k` (12th); **re-homed to `02m` (13th) on 2026-08-28** when a concurrent session inserted `02k-phase-1-round-table-skill.md` and shifted the series. Current neighbors: after `02l-phase-1-observability-biomarkers-and-small-model-harness.md`; on-disk successors before `02p` are `02n-phase-1-reverse-prd-design-fork.md` (inserted 2026-09-09) and `02o-phase-1-prd-prototype-fidelity.md` (inserted 2026-09-10); `02p-phase-1-record-integrity-recovery.md` is the former `02m` (record integrity), renumbered again 2026-09-10. Task IDs below retain their historical `02k.N` labels.

**Gate Reviews:** Round table 2026-08-19 (@founder, @architect, @tech-lead, @researcher, @product-manager, @qa-engineer, @ml-ai-engineer), unanimous alignment recorded in `artifacts/memory/active-decisions.md`. **Later review passes:** 2026-08-28 record-correction round table (token-budget + eval-gating + gate-reachability corrections); 2026-09-01 token-budget withdrawal (5/5 SATISFIED); **2026-09-10 final review** (5 seats + 2 challengers — corrections folded into §7.1).

---

## 1. Mandate & Root Cause Autopsy

### 1.1 Mandate (from Chris)
"Vespyr is not understanding user intent and not invoking the right agent/skill/tool. For example, if I say I want to do research without explicitly mentioning `@researcher` or `/explore-idea`, the plain assistant without a persona executes the task and outputs a generic summary. We need a robust architecture that intercepts un-persona'd domain prompts, prevents premature broad execution, presents structured decision tracks, and routes to the right agent and skill."

### 1.2 The Root Cause Autopsy: The "Default Assistant Reflex"

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   The Un-Persona'd Default Assistant Failure Loop                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   User Prompt: "Research payment gateways for our SaaS platform"                      │
│                                                                                        │
│   ❌ Current Failure Mode (The Downstream Trap):                                       │
│   1. No persona mentioned (@researcher omitted).                                      │
│   2. Harness defaults to base assistant prompt (AGENTS.md).                            │
│   3. Base assistant has no domain-intercept gate -> triggers Default Assistant Reflex. │
│   4. LLM attempts to look helpful by generating a 10-page horizontal survey dump.      │
│   5. Result: Zero actionable insight, high effort waste, zero hypothesis testing.       │
│                                                                                        │
│   ✅ Target Architecture (The 4-Layer Upstream Intercept):                             │
│   1. Root Prompt (DNA 4) detects domain task (Research) without persona/skill.         │
│   2. HALT EXECUTION IMMEDIATELY (Zero ungrounded text generation).                     │
│   3. Surface the 2-3 Track Fork (Market/Pricing vs API/DX vs Compliance/KYC).          │
│   4. Recommend exact persona (@researcher) and skill (/explore-idea).                  │
│   5. Upon user track selection: Delegate to subagent / load skill with locked scope.   │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Why Downstream-Only Fixes Fail

A common misconception is that updating `.agents/agents/researcher.md` solves this problem. In file-based multi-agent engines:
- If the user prompt does not include `@researcher`, the harness **never reads `researcher.md`**.
- The rules inside `researcher.md` are dormant and un-evaluated.
- Therefore, **the intent triage gate MUST live at the root system prompt (`AGENTS.md` and `vespyr-dna.md`)** to intercept un-persona'd prompts *before* any tool execution or content generation begins.

---

## 2. The 4-Layer Defense Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         The 4-Layer Intent & Scope Defense Model                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   Layer 1: Root System DNA (vespyr-dna.md & AGENTS.md)                                 │
│   ├── DNA 4: Intent & Scope Triage Gate (Anti-Assumed Execution)                        │
│   ├── Dual-Route: C ≥ 0.85 -> Direct Persona Banner; 0.50 ≤ C < 0.85 -> 2-3 Fork Card  │
│   └── Autonomous Persona & Skill Recommendation Invariant                              │
│                                                                                        │
│   Layer 2: Universal Guardrails (.agents/GUARDRAILS.md)                                │
│   ├── Expansion: Anti-Premature Execution & Scope Clarification                        │
│   ├── Total Ban on "Catch-All Horizontal Summaries" and Broad Dumps                    │
│   └── The 2–3 Track Fork UX Protocol (Structured options vs open interrogation)        │
│                                                                                        │
│   Layer 3: Multi-Harness Routing Engine                                                │
│   ├── Tool-Capable Harnesses (Antigravity/Claude Code): Subagent auto-dispatch         │
│   └── Context-Mention Harnesses (Cursor/Kiro): Explicit @-tag & /-skill directives     │
│                                                                                        │
│   Layer 4: Persona Socratic Stances & Skill Step 0 Gates                               │
│   ├── All 20 Personas: Explicit rejection of unconstrained / underspecified briefs     │
│   ├── Major Skills: Mandatory non-skippable "Step 0: Scope & Decision Anchoring"       │
│   └── Deterministic Check: step_tracker.js exits 1 if Step 0 [SCOPE_LOCKED] bypassed   │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### 3.1 Layer 1: Vespyr Core DNA 4 (Specification)

Add to `.agents/references/vespyr-dna.md` and embed in `AGENTS.md`:

```markdown
## DNA 4: Intent & Scope Triage Gate (Anti-Assumed Execution)

> **Execution without defined intent is engine malpractice. Never generate broad horizontal surveys or ungrounded code.**

When a user request lacks an active persona/skill:
1. **Unambiguous Single Domain ($C \ge 0.85$):** Directly announce the persona adoption banner (`🔍 Iris (@researcher): ...` / `⚡ Felix (@performance-engineer): ...`), load the skill, and execute without performative friction.
2. **Multi-Track / Ambiguous ($0.50 \le C < 0.85$):**
   - **HALT GENERATION IMMEDIATELY.** Do NOT guess defaults or output broad overviews.
   - **The 2–3 Track Fork:** Output a concise card presenting 2–3 divergent decision tracks with recommended `@agent` and `/skill` handles.
3. **Dispatch:**
   - *Tool/Subagent harnesses:* Prompt user to select a track, then autonomously spawn subagent / invoke skill.
   - *Mention harnesses:* Prompt user to select track via `@agent` / `/skill` handles.
```

---

### 3.2 Layer 2: Guardrails Expansion (Specification)

Update `.agents/GUARDRAILS.md` (add named section `Anti-Premature Execution, Scope Clarification & Ban on Broad Fallbacks` — plan label "§22" is descriptive, no numbered §22 exists in file):

```markdown
## Anti-Premature Execution, Scope Clarification & Ban on Broad Fallbacks

- **No Silent Scope Broadening:** When an incoming task or research topic lacks a defined business objective, target hypothesis, or technical boundary, agents MUST NOT default to a "catch-all" horizontal summary or speculative implementation.
- **Hypothesis-Decision Anchoring:** Every research, planning, or architectural task must state:
  1. *What specific business decision or engineering constraint does this inform?*
  2. *What is the falsifiable hypothesis or boundary condition?*
- **The 2–3 Track Fork UX Standard:** Clarification requests must not interrogate the user with endless open-ended questions. Agents must formulate 2–3 concrete, mutually distinct execution tracks and ask the user to select one.
- **Zero Artifact Scaffolding on Underspecified Scope:** Writing markdown deliverables to `artifacts/output/` is strictly prohibited until the scope track is confirmed.
```

---

### 3.3 Layer 3: Multi-Harness Routing Matrix

| Harness Environment | Intent Detection Mechanism | Dispatch Action |
| :--- | :--- | :--- |
| **Google Antigravity** | Root system prompt (`AGENTS.md` + rules) triggers DNA 4 on un-persona'd domain prompts. | `[SPEC — prompt-text only]` Halts text generation; presents 2–3 Track Fork; upon user selection, calls `invoke_subagent` or activates skill via skill tool. |
| **Claude Code** | System prompt & `CLAUDE.md` rules intercept plain prompts. | `[SPEC — prompt-text only]` Halts; presents 2–3 Track Fork; spawns subagent (`Agent tool`) or prompts `/skill-name`. |
| **Cursor / Windsurf / Kiro** | System rules & `.cursorrules` intercept plain prompts. | `[SPEC — NOT IMPLEMENTED]` No `.cursorrules`/`.cursor/`/`.kiro/`/`.windsurf/` on disk; row describes target state. |
| **OpenCode / Headless CLI** | `bin/cli.js` & orchestrator state detect missing persona argument. | `[SPEC — NOT IMPLEMENTED]` `rg -ni "persona\|track" bin/cli.js` → 0 matches; no detection exists. Target: CLI prompts for domain track and attaches the persona file. |

**Correction — 2026-09-10 (final review):** All Layer-3 dispatch rows describe **target behavior, not verified implementation**. Delivery on disk is the root directive text only (`AGENTS.md` + `CLAUDE.md` DNA 4, `GUARDRAILS.md` section); no harness dispatch test exists. Falsifiers: `rg -ni "persona|track" bin/cli.js .agents/scripts/orchestrator_state.js` → 0 matches; `ls .cursorrules .cursor .kiro .windsurf` → all absent. Inline `[SPEC …]` labels are derived from this block, never hand-edited.

---

### 3.4 Layer 4: Persona Socratic Stance Upgrades across All 20 Roles

Update the `## Socratic Stance` section of each persona to explicitly reject unconstrained, underspecified prompts:

| Agent Persona | Socratic Invariant on Underspecified Input |
| :--- | :--- |
| **`@researcher` (Iris)** | *"I reject open-ended research briefs. If the prompt does not state the business decision, market risk, or competitor angle it informs, I halt, present the 2-3 research tracks, and require track selection before collecting data."* |
| **`@user-researcher` (Paige)** | *"I reject unsegmented user inquiry. If target persona cohorts, interview objectives, or behavioral hypotheses are missing, I demand cohort definition before drafting interview guides."* |
| **`@ux-researcher` (Zara)** | *"I reject ungrounded usability reviews. If specific interaction flows, heuristics, or user friction points are unspecified, I halt and map the primary journey forks."* |
| **`@product-manager` (Sarah)** | *"I reject vague feature wishlists. If success metrics, user problems, and scope boundaries are not defined, I enforce the 2-3 track scope fork before drafting PRDs or Kanban tickets."* |
| **`@product-designer` (Ivy)** | *"I reject unconstrained design requests. If platform invariants, component design system constraints, and responsive breakpoints are undefined, I ask before generating wireframes."* |
| **`@architect` (Vera)** | *"I reject unconstrained architecture requests. If scale targets, latency budgets, data consistency models, and stack invariants are missing, I present architectural forks before proposing system topologies."* |
| **`@tech-lead` (Grant)** | *"I reject ambiguous execution requests. If task dependencies, technical contracts, or time budgets are missing, I break the problem into modular spikes before issuing execution plans."* |
| **`@developer` (Rex)** | *"I reject underspecified implementation requests. If API contracts, error boundaries, or edge cases are ambiguous, I ask before writing code. I never write speculative abstractions."* |
| **`@security-engineer` (Victor)** | *"I reject unscoped security audits. If the trust boundary, threat model, or data sensitivity classification is missing, I halt and demand asset classification."* |
| **`@performance-engineer` (Felix)** | *"I reject unquantified performance complaints. If p95 latency baselines, throughput targets, and hardware profiles are missing, I require baseline telemetry before profiling."* |
| **`@ml-ai-engineer` (Kai)** | *"I reject vague AI/LLM feature requests. If evaluation datasets, prompt benchmarks, latency ceilings, and fallback strategies are missing, I halt before writing RAG or inference pipelines."* |
| **`@devops-engineer` (Axel)** | *"I reject un-budgeted infrastructure requests. If cloud environment constraints, CI/CD runners, and rollback invariants are missing, I require environment parameters before scaffolding IaC."* |

**Correction — 2026-09-10 (final review):** the original execution hardened 12 reasoning personas (listed above); disk now carries the invariant in **20/20 agent files** — the remaining 8 landed later (`cdcdba6`, 2026-09-07). Falsifier: `rg -l "On underspecified briefs" .agents/agents/ | wc -l` → 20.

---

### 3.5 Layer 4 (cont.): Skill Step 0 Mandatory Gates & Deterministic CLI Enforcement

All major multi-step skills must include a standardized, non-skippable **`step-00-scope-and-decision-anchoring.md`**:

```
.agents/skills/<skill>/steps/
├── step-00-scope-and-decision-anchoring.md  # Mandatory Track & Intent Gate
├── step-01-...
└── ...
```

#### Step 0 Specification Template & State Invariant
1. **Input Inspection:** Check if the user prompt specifies a concrete outcome, boundary constraints, and target decision.
2. **Decision Fork:** If ambiguous ($0.50 \le C < 0.85$), present the 2–3 Track Fork and halt.
3. **Satisfaction Checkpoint:** Record `[SCOPE_LOCKED: track_name]` in the skill's working memory (`scope_locked: true`, `track_selected: "<name>"`) before advancing to Step 1.
4. **Deterministic Script Enforcement:** `.agents/scripts/step_tracker.js` and `orchestrator_state.js` must verify that `scope_locked: true` exists in the step metadata prior to executing Step 1. If missing, the script halts with **Exit Code 1**: `[ERROR] Step 0 Scope Gate bypassed. Scope must be locked before Step 1 execution.`

---

## 4. `vespyr-eval` Benchmark Integration

Add a dedicated evaluation suite to `vespyr-eval` (`evals/suites/invariants/intent-routing.json`): Tier-0 structural regexes with negative-boundary decoy fixtures. Original spec — ~~robust regex pattern matching, negative boundary decoy traps, and calibrated 1-shot G-Eval anchors~~ — **[FALSIFIED 2026-08-28: no Tier-1 anchors shipped; suite is fixture-tier]**. Listed-phrase regexes are demonstrably bypassable: a generic horizontal survey carrying a `Track A` header and an `@researcher` name-drop passes Tier-0. Behavioral gating deferred (FC-2).

### 4.1 Benchmark Test Matrix (`evals/suites/invariants/intent-routing.json` — sketch; shipped suite uses 02j schema `assertContains`/`assertNotContains`, no token ceiling)

```json
{
  "suite": "intent_routing_and_anti_premature",
  "version": "1.0.0",
  "benchmarks": [
    {
      "id": "intent-01-plain-research-prompt",
      "description": "Underspecified research prompt must trigger 2-3 track fork and halt without broad survey dump",
      "input_prompt": "Can you do research on vector databases for our app?",
      "active_persona": null,
      "tier0_gates": {
        "forbidden_regex": [
          "(?i)# Comprehensive Overview",
          "(?i)Vector databases are (?:a type of|used for)",
          "(?i)In this (?:document|guide) we will explore"
        ],
        "required_regex": [
          "(?i)@researcher",
          "(?i)/explore-idea",
          "(?i)(?:Track|Option)\\s*(?:[A-Z]|\\d+)|\\d+\\.\\s+\\*\\*"
        ]
      },
      "tier1_rubrics": {
        "anti_premature_halt": "Agent must halt immediately without generating a horizontal survey.",
        "track_fork_clarity": "Agent must present 2-3 distinct decision tracks (e.g. In-memory vs Managed Cloud vs Self-hosted pgvector).",
        "routing_recommendation": "Agent must recommend @researcher and /explore-idea.",
        "calibration_anchor_positive": "### 🔍 Research Scope Triage\nThis topic has 2 primary decision tracks:\n1. **Track A (Managed Cloud vs Self-Hosted):** Pinecone/Qdrant vs pgvector latency & maintenance cost.\n2. **Track B (Scale & Indexing):** HNSW vs IVF indexing trade-offs under 1M+ embeddings.\n\n👉 Recommended: `@researcher` with `/explore-idea`. Which track are we testing?",
        "calibration_anchor_negative": "# Vector Databases Overview\nVector databases are specialized systems designed to store and query high-dimensional vectors...\n[400 words of generic background without asking for decision focus]"
      }
    },
    {
      "id": "intent-02-plain-architecture-prompt",
      "description": "Underspecified architecture prompt must trigger triage fork without writing speculative code",
      "input_prompt": "I want to build a real-time notification system.",
      "active_persona": null,
      "tier0_gates": {
        "forbidden_regex": [
          "```(?:typescript|javascript|python)",
          "package\\.json",
          "const express = require"
        ],
        "required_regex": [
          "(?i)@architect",
          "(?i)(?:Track|Option)\\s*(?:[A-Z]|\\d+)|\\d+\\.\\s+\\*\\*"
        ]
      },
      "tier1_rubrics": {
        "anti_premature_halt": "Agent must not generate code or architectural topologies immediately.",
        "track_fork_clarity": "Agent must present 2-3 scale/protocol forks (WebSockets vs SSE vs Push Notifications)."
      }
    },
    {
      "id": "intent-03-explicit-persona-bypass",
      "description": "Fully specified prompt with explicit persona bypasses triage and proceeds directly",
      "input_prompt": "@researcher investigate Stripe vs Adyen transaction fee break-even points for European micro-transactions under €5.",
      "active_persona": "researcher",
      "tier0_gates": {
        "required_regex": [
          "(?i)Hypothesis|Decision Anchor",
          "(?i)European micro-transactions"
        ]
      },
      "tier1_rubrics": {
        "direct_execution": "Because scope and persona are fully specified, agent proceeds with hypothesis-driven research without unnecessary triage stalling."
      }
    },
    {
      "id": "intent-04-trivial-task-zero-triage",
      "description": "Trivial single-action requests must execute immediately with ZERO triage stalling",
      "input_prompt": "Fix typo on line 12 of README.md changing 'inital' to 'initial'.",
      "active_persona": null,
      "tier0_gates": {
        "forbidden_regex": [
          "(?i)Track A",
          "(?i)Track 1",
          "(?i)Decision Track",
          "(?i)Triage Gate"
        ]
      },
      "tier1_rubrics": {
        "frictionless_execution": "Agent executes the surgical edit directly without emitting a performative 2-3 track triage card."
      }
    }
  ]
}
```

---

## 5. Granular Task Breakdown & Execution Matrix

> **Note (2026-09-10):** §5 preserves the plan-time breakdown. Execution state, evidence stamps, and corrections live in §7 / §7.1.

### Phase 1: Core System Directives & DNA Updates
- [ ] **Task 02k.1 — Vespyr Core DNA 4 Codification**
  - **Files:** `.agents/references/vespyr-dna.md`, `AGENTS.md`
  - **Action:** Add `## DNA 4: Intent & Scope Triage Gate (Anti-Assumed Execution)` with the high-confidence direct adoption banner ($C \ge 0.85$) and the 2–3 Track Fork ($0.50 \le C < 0.85$).
  - **Verify:** Verify `AGENTS.md` and `vespyr-dna.md` contain identical DNA 4 definitions.

- [ ] **Task 02k.2 — Guardrails Expansion (plan label "§22")**
  - **Files:** `.agents/GUARDRAILS.md`
  - **Action:** Add named section `Anti-Premature Execution, Scope Clarification & Ban on Broad Fallbacks` to ban broad survey fallbacks, mandate hypothesis-decision anchors, and define the 2–3 Track Fork UX protocol.
  - **Verify:** Validate that `GUARDRAILS.md` explicitly forbids un-persona'd horizontal output dumps.

### Phase 2: Agent Persona Socratic Stances Upgrades
- [ ] **Task 02k.3 — Update Core Engineering & Domain Personas**
  - **Files:** `.agents/agents/researcher.md`, `.agents/agents/user-researcher.md`, `.agents/agents/ux-researcher.md`, `.agents/agents/architect.md`, `.agents/agents/tech-lead.md`, `.agents/agents/developer.md`, `.agents/agents/product-manager.md`, `.agents/agents/product-designer.md`, `.agents/agents/security-engineer.md`, `.agents/agents/performance-engineer.md`, `.agents/agents/ml-ai-engineer.md`, `.agents/agents/devops-engineer.md`
  - **Action:** Add explicit underspecified-input pushback rules to `## Socratic Stance` and `## Persona Principles`.
  - **Verify:** Run `node .agents/scripts/validate_frontmatter.js` to ensure zero syntax or frontmatter regressions.

### Phase 3: Skill Step 0 Gating & Deterministic Script Checks
- [ ] **Task 02k.4 — Implement Mandatory Step 0 in Core Skills**
  - **Files:**
    - `.agents/skills/explore-idea/SKILL.md` (+ step-00)
    - `.agents/skills/unpack-problem/SKILL.md` (+ step-00)
    - `.agents/skills/develop/SKILL.md` (+ step-00)
    - `.agents/skills/design/SKILL.md` (+ step-00)
    - `.agents/skills/validate-idea/SKILL.md` (+ step-00)
    - `.agents/skills/plan/SKILL.md` (+ step-00 — omitted from original task list, added per Decision statement)
    - `.agents/scripts/step_tracker.js`
  - **Action:** Author `step-00-scope-and-decision-anchoring.md` and link in bootloaders. Update `step_tracker.js` to assert `scope_locked: true` before advancing past Step 0 (exit code 1 if bypassed).
  - **Verify:** Check that skill step tracking fails fast with Exit Code 1 if Step 0 is bypassed without `[SCOPE_LOCKED]`.

### Phase 4: Harness Rules & Documentation Sync
- [ ] **Task 02k.5 — Update Multi-Harness Instruction Files**
  - **Files:** `CLAUDE.md`, `.cursorrules` (if present), `README.md`, `README_CN.md`, `artifacts/memory/project-context.md`, `artifacts/memory/active-decisions.md`
  - **Action:** Document the Intent Triage Gate and 2–3 Track Fork in all harness guides.
  - **Verify:** Verify all references match across English and Chinese docs.

### Phase 5: Automated Regression Benchmarking
- [ ] **Task 02k.6 — Author `evals/suites/invariants/intent-routing.json`**
  - **Files:** `evals/suites/invariants/intent-routing.json`
  - **Action:** Scaffold test fixtures (including `intent-04` trivial task decoy trap) and assert Tier 0 regex pattern gates for un-persona'd requests.
  - **Verify:** Execute benchmark tests via `vespyr-eval` runner and achieve 100% pass rate.

---

## 6. Definition of Done (DoD) for Epic 02k (historic 02m)

1. **DNA 4 Active:** `vespyr-dna.md` and `AGENTS.md` contain `DNA 4: Intent & Scope Triage Gate` (concise card, no token budget).
2. **Guardrail Active:** `.agents/GUARDRAILS.md` named section `Anti-Premature Execution, Scope Clarification & Ban on Broad Fallbacks` exists and mandates the 2–3 Track Fork (plan label "§22" descriptive).
3. **All 20 Personas Hardened (20/20 disk):** every agent file carries the Socratic pushback against underspecified briefs — 12 at original execution, completed 2026-09-07 (`cdcdba6`). **Derived**, never hand-edited: `rg -l "On underspecified briefs" .agents/agents/ | wc -l` → 20.
4. **Step 0 Enforced Deterministically:** `/explore-idea`, `/unpack-problem`, `/develop`, `/design`, `/validate-idea`, and `/plan` enforce `step-00-scope-and-decision-anchoring` with `step_tracker.js` exit code 1 validation. Probe-verified 2026-09-10 after stale-lock purge (develop: exit 1 no-lock → exit 0 after `scope-lock`). **Open limit (FC-3):** locks are not session/track-scoped — any past lock unlocks the skill indefinitely; hardening unowned.
5. **Evals (split — one blended checkbox forbidden):**
   - **[VERIFIED — structural, fixture-tier]** `evals/suites/invariants/intent-routing.json` exists, 02j schema valid. Documented invocation `node bin/vespyr-eval.js run --suite invariants/intent-routing --mock` → Tier-0 4/4 PASS, overall 0/4 (Tier-1 dimension-default SPC rubric 2.0–4.0 vs threshold 4.5), exit 1; without `--mock` the runner fails closed (4/4 FAIL, exit 1, "Refusing to self-grade"). Structural gates only.
   - **[UNVERIFIED — behavioral, open]** real harness execution, Tier-1 green, no-`--mock` exit 0. Owner: @ml-ai-engineer via FC-1/FC-2 routing. Trigger: execution adapter lands, ratified at the 02l gate review. Probe: `node bin/vespyr-eval.js run --suite invariants/intent-routing` exits 0 without `--mock`.
6. **Memory Persisted:** Decision logged in `active-decisions.md`, session summary updated in `session-summaries/latest.md`, and `project-context.md` reflects the epic. Final review 2026-09-10 corrected the stale `02k-…` filename pointers via the sanctioned memory path (§7.1 D4).

---

## 7. Master Execution Checklist & TODOs

> **Execution status: BUILD WORK PERFORMED — EVIDENCE RECORDED 2026-08-28 — PROVISIONAL ONLY; NO CLOSURE CLAIMED (02p:112). Reconciliation pends `02p-phase-1-record-integrity-recovery.md`.** All 6 tasks executed single-writer in one session; committed as `45e34a6` (suite + record corrections), token-claim scrub in `35cbe4c`/`3b91342`, series renumber in `ee22666`. Final review 2026-09-10 (5 seats + 2 challengers) recorded falsified/partial stamps in §7.1. Two plan-vs-implementation deviations, resolved toward the epic decision: (1) `/plan` was omitted from Task 02k.4's file list but named in the epic decision's core-skills set — step-00 shipped for all 6 skills; (2) Task 02k.6's sketch used `tier0_gates`/`required_regex` keys — the shipped 02j suite schema (`assertContains`/`assertNotContains`; the former token-ceiling keys were removed 2026-09-01 per owner — exact identifiers in `35cbe4c`, suite follow-up `3b91342`; no token ceiling asserted) governs, and the suite lives at `evals/suites/invariants/intent-routing.json` per 02j's suite layout.

### Phase 1: Core System Directives & DNA 4
- [x] **Task 02k.1:** Codify `DNA 4: Intent & Scope Triage Gate` (tri-route $C \ge 0.85$ vs $0.50 \le C < 0.85$ vs $C < 0.50$) in `.agents/references/vespyr-dna.md` and `AGENTS.md`. **[EXECUTED 2026-08-28]** Evidence: `rg -c "DNA 4: Intent & Scope Triage Gate" AGENTS.md CLAUDE.md .agents/references/vespyr-dna.md` → 1 each, identical block; trivial-tier (C < 0.50) included to match eval decoy intent-04.
  **[RECORD CORRECTION → REMEDIATED 2026-08-28, review roundtable; AMENDED 2026-09-01 per owner]:** the original ≤120-token attention-budget claim was **[FALSIFIED]** — block measured 243 tokens via `tools/eval/lib/tokenizer.js` and the 2026-08-23 CHANGES-REQUESTED had not been applied. Same-day remediation compressed the block and added Ladder Level 3 precedence. **Per owner direction 2026-09-01, all quantitative token-budget claims (≤120 tokens, <100-token card) are withdrawn** — no numeric token ceiling is asserted for DNA 4; conciseness is retained as a qualitative "concise card" requirement without a measured budget. Historical 119-token measurement retained as forensic record only, not a DoD gate.
- [x] **Task 02k.2:** Expand §22 in `.agents/GUARDRAILS.md` to ban broad horizontal survey fallbacks and mandate the 2–3 Track Fork UX protocol. **[EXECUTED 2026-08-28]** Evidence: `rg -n "Ban on Broad Fallbacks" .agents/GUARDRAILS.md` → section present with all 4 mandates (no §22 numbering exists in GUARDRAILS.md — added as named section; plan's "§22" label does not map to the file's structure).

### Phase 2: Agent Persona Socratic Hardening
- [x] **Task 02k.3:** Update 12+ reasoning personas (`@researcher`, `@user-researcher`, `@ux-researcher`, `@architect`, `@tech-lead`, `@developer`, `@product-manager`, `@product-designer`, `@security-engineer`, `@performance-engineer`, `@ml-ai-engineer`, `@devops-engineer`) with explicit Socratic rejection of underspecified briefs. **[EXECUTED 2026-08-28]** Evidence: ~~`rg -l "On underspecified briefs" .agents/agents/ | wc -l` → 12~~ **[FALSIFIED 2026-09-10 → §7.1 D1.1]** (12 was true at execution; disk now → 20, completed `cdcdba6` 2026-09-07); `node .agents/scripts/validate_frontmatter.js` → 20/20 agents pass, no regressions.

### Phase 3: Skill Step 0 Gating & Deterministic Script Verification
- [x] **Task 02k.4a:** Author `step-00-scope-and-decision-anchoring.md` across core skills (`/explore-idea`, `/unpack-problem`, `/develop`, `/design`, `/validate-idea`). **[EXECUTED 2026-08-28 — 6 skills incl. `/plan` per decision statement]** Evidence: `ls .agents/skills/{develop,plan,design,validate-idea,explore-idea,unpack-problem}/steps/step-00-scope-and-decision-anchoring.md` → 6 files; all 6 SKILL.md bootloaders reference the Step 0 gate; `validate_frontmatter.js` → 95/95 step files pass.
- [~] **Task 02k.4b:** Update `.agents/scripts/step_tracker.js` to assert `scope_locked: true` before advancing past Step 0 (exit code 1 if bypassed). **[EXECUTED 2026-08-28; [~] = partial — residue gap closed 2026-09-10]** Evidence: bypass probe `node .agents/scripts/step_tracker.js begin --skill develop --step 1` (no lock) → exit 1 with `[ERROR] Step 0 Scope Gate bypassed...` **in `off` mode** (gate is config-independent); `scope-lock --skill develop --track "test-track"` → exit 0, audit entry recorded; repeat `begin` → exit 0; non-gated skill (`shape-up`) → silent exit 0, contract unchanged; ~~test residue removed~~ **[PARTIAL 2026-08-28 → §7.1 D2]**. Suite: `tests/run-all.js` → 168/168.
  **[RECORD CORRECTION → REMEDIATED 2026-08-28, review roundtable]:** gate reachability was **[PARTIAL]** — `begin --step 1` callers existed only in develop/design/validate-idea; explore-idea & unpack-problem were tracker-optional (GUARDRAILS:131) and plan had no step-1 file, leaving 3/6 gates inert. Same-day remediation: GUARDRAILS:131 carve-out fixed, tracker begin/complete added to explore-idea/unpack-problem step-01 and plan SKILL.md Step 1; off-mode contract docs corrected in 3 sites (step_tracker.js header, GUARDRAILS.md, config.yaml). Counter-evidence the gate works in real use: a concurrent `/plan` session scope-locked track `surgical-skill-edit` at 02:26Z (`step-audit.json` entry 2) before Step 1.
  **[FINAL REVIEW 2026-09-10]:** (a) the "test residue removed" sub-claim was **[FALSIFIED]** — a stale `qa-probe-track` lock (2026-08-28T02:13:10Z, QA-seat probe) left `develop` unlocked (`begin --skill develop --step 1` → exit 0); purged 2026-09-10 with acceptance probes (develop exit 1 no-lock → `scope-lock` exit 0 → begin exit 0 → probe lock purged → exit 1; design exit 1; shape-up exit 0). (b) the off-mode doc correction was **[PARTIAL]**: `GUARDRAILS.md:143` still claimed "0 output, 0 files written"; corrected 2026-09-10 and the four tracker bullets moved back under `## Step Tracking`. (c) evergreen-lock limit (any past lock unlocks a skill indefinitely) recorded as **FC-3**, unowned.

### Phase 4: Multi-Harness Sync & Documentation
- [x] **Task 02k.5:** Update `CLAUDE.md`, `.cursorrules`, `README.md`, `README_CN.md`, `artifacts/memory/project-context.md`, and `artifacts/memory/active-decisions.md`. **[EXECUTED 2026-08-28 with 2 named deviations]** Evidence: CLAUDE.md carries the identical DNA 4 block (`rg -c` → 1); README.md:21 + README_CN.md carry the DNA 4 feature note (placed outside the Why-Vespyr table — AGENTS.md locks the identity claim at two differentiators; a third table row would contradict it); `.cursorrules` does not exist on disk — "if present" branch N/A; memory files updated via the sanctioned pipeline only (`memory_write.js` [DECISION] entry 2026-08-28; session-write via `orchestrator_state.js`), not direct edits.

### Phase 5: Automated Evals & Decoy Trap Benchmarking
- [~] **Task 02k.6:** Author `evals/suites/invariants/intent-routing.json` in `vespyr-eval` asserting Tier 0 regex patterns ~~and Tier 1 G-Eval calibration anchors~~ **[FALSIFIED 2026-08-28 — no Tier-1 anchors shipped]** across positive triage, single-track direct adoption, explicit bypass, and trivial decoy tasks. **[EXECUTED 2026-08-28; [~] = partial — evidence stamp superseded 2026-09-10]** Evidence: ~~`node bin/vespyr-eval.js run --suite invariants/intent-routing` → 4/4 PASS (intent-01 96 tok; intent-02 76 tok; intent-03 bypass; intent-04 trivial decoy 18 tok, zero triage markers), no baseline regressions, exit 0~~ **[FALSIFIED 2026-08-28 → §7.1 D1.3]**. Current runner (probe 2026-09-10): no-`--mock` → 4/4 FAIL, exit 1 ("Refusing to self-grade"); `--mock` → Tier-0 4/4 PASS, overall 0/4 (Tier-1 dimension-default SPC rubric 4.00/3.00/3.00/2.00 vs threshold 4.5), tokens 99/79/72/21, exit 1. Fixture-tier structural only. Schema note: authored in the shipped 02j suite schema, not this plan's §4.1 pre-implementation sketch.
  **[RECORD CORRECTION 2026-08-28, review roundtable; AMENDED 2026-09-01 per owner]:** eval-gating claim **[FALSIFIED]** — the suite validates its own `mockOutput` fixtures (runner.js:63-65 returns them verbatim; tier0 regexes assert the same text); passes 4/4 in a tree with NO AGENTS.md (@qa-engineer counterfactual); no Tier-1 anchors exist; baseline diff vacuous (0 intent-* entries). Dispositions: suite repurposed as **fixture-tier** (not cut); behavioral gating → harness prompt-execution adapter (post-02n backlog); falsifiability restructure (runner prompt-keyed branches, delete mockOutput, fix intent-03 answer-key leak) → 02l per @tech-lead ruling. **Token-ceiling gates removed 2026-09-01 per owner — the exact suite-schema key identifiers are preserved in git history (`35cbe4c` carries the deletions; `3b91342` is the suite-touching follow-up); no quantitative token budget is asserted; suite now gates on structural regex only.**
  **[FINAL REVIEW 2026-09-10]:** current runner is fail-closed at `tools/eval/runner.js:112-127` (mockOutput returns only under explicit `--mock`, watermarked `[MOCK]`; else throws — the cited `:63-65` is stale suite-loading code). The intent-03 answer-key leak is still live (assertContains strings match its own `mockOutput`). Routes were **phantom on disk** — 02l carries no restructure item and no backlog artifact named the adapter — replaced by the forward-condition table **FC-1/FC-2** in §7.1. The recorded dispositions above remain true only as intent, not as landed work.

---

### §7.1 Final-review corrections (2026-09-10)

**Panel:** @tech-lead (Grant), @product-manager (Sarah), @ml-ai-engineer (Kai), @code-reviewer (Scout), @founder (Elena) — 5 context-firewalled seats; challengers @qa-engineer (Nina), @architect (Vera). Pre-fold verdicts: 4× [PARTIAL], 1× [FALSIFIED]; every challenged position defended or conceded; the fold below is binding. Cross-record items are filed to `02p`'s single reconciliation pass (02p:112) instead of being edited here.

#### D1 — Falsified evidence stamps (struck inline above)

| # | Task | Recorded stamp (quoted forensically — struck inline above) | Correction (2026-09-10) |
|---|---|---|---|
| D1.1 | 02k.3 | `→ 12` personas | **[FALSIFIED]** disk → 20 (`cdcdba6`, 2026-09-07) |
| D1.2 | 02k.4b | "test residue removed" | **[PARTIAL]** stale `qa-probe-track` lock left `develop` unlocked; purged 2026-09-10 (D2) |
| D1.3 | 02k.6 | "4/4 PASS …, exit 0" | **[FALSIFIED]** no-`--mock` → 4/4 FAIL exit 1; `--mock` → T0 4/4 PASS, overall 0/4, exit 1 |
| D1.4 | §4 intro | "calibrated 1-shot G-Eval anchors" | **[FALSIFIED]** no Tier-1 anchors shipped |

Falsifiers: D1.1 `rg -l "On underspecified briefs" .agents/agents/ | wc -l` → 20. D1.2 `node .agents/scripts/step_tracker.js begin --skill develop --step 1` → exit 0 pre-purge / exit 1 post-purge. D1.3 `node bin/vespyr-eval.js run --suite invariants/intent-routing` → exit 1; with `--mock` → exit 1 (Tier-1 dimension-default SPC rubric 4.00/3.00/3.00/2.00 vs threshold 4.5; tokens 99/79/72/21). D1.4 `rg -c tier1_rubrics evals/suites/invariants/intent-routing.json` → 0.

#### D2 — Stale-lock purge + acceptance probes (2026-09-10)

- Purged `develop`/`qa-probe-track` from `artifacts/output/step-audit.json` (runtime, gitignored; backup taken). Remaining legitimate locks: `plan`/`surgical-skill-edit`, `validate-idea`/`create`.
- Probes: develop exit 1 (no lock) → `scope-lock` exit 0 → begin exit 0 → probe lock purged → exit 1; design exit 1; shape-up (non-gated) exit 0.
- **FC-3 open limit:** locks are not session/track-scoped — any historical lock unlocks the skill indefinitely.

#### D3 — Cross-record defects (filed to 02p; not edited here)

| # | Defect | Falsifier | Filed to |
|---|---|---|---|
| D3.1 | `02j:630` TL-HO-06 claims `handoff-continuity.json` + `zero-mention-routing.json` executed in 02m — neither exists | `ls evals/suites/skills/handoff-continuity.json evals/suites/invariants/zero-mention-routing.json` → both absent | 02p §1.1 R1.6 ("02j×1") |
| D3.2 | `02p` title/self-references still "(02m)" — collides with this epic's number | `sed -n '1p' 02p-phase-1-record-integrity-recovery.md` | 02p single pass |
| D3.3 | dev-plan `README.md:120` "(02k)" / "`02a`–`02k` sub-plans"; `:3` sequencing inconsistent; `:31` registry row lacks reconciliation-pending | `sed -n '3p;31p;120p' development-plan/README.md` | 02p single pass |
| D3.4 | `02o` cites an "02l forward-note" no 02l task carries | `rg -n "fixture-tier\|prompt-execution" 02l-*.md` → no hits | 02p single pass (with FC-1) |

#### FC — Forward conditions (unowned until a gate review ratifies an owner)

| # | Item | Owner | Routing | Acceptance probe |
|---|---|---|---|---|
| FC-1 | Falsifiability restructure: prompt-keyed runner branches, delete `mockOutput`, fix intent-03 answer-key leak | unowned | 02l gate review ratifies owner, else back to 02j | no-`--mock` run exits 1 on fixture-only suites; AGENTS.md-less counterfactual tree cannot pass intent-01/02; `rg mockOutput evals/suites/invariants/intent-routing.json` → 0 |
| FC-2 | Behavioral gating adapter (real harness execution, measured split) | unowned | 02p converts to backlog | `node bin/vespyr-eval.js run --suite invariants/intent-routing` exits 0 without `--mock`; run appears in `split.measured` |
| FC-3 | Scope-lock session/track binding (kill evergreen bypass) | unowned | candidate 02q (parallel-session) or 02p defect pass | stale lock from a prior session no longer unlocks `begin --step 1` |

#### D4 — Memory corrections (2026-09-10)

`active-decisions.md` correction entry appended via the sanctioned `memory_write.js` pipeline (append-only; session `w-4a812faa25db`) — it supersedes the dangling `02k-…` reference at `:42` and records the withdrawn `<100-token` clause / TL-HO-06 falsifier. `project-context.md` living bullets re-pointed in place (`02k-…` → `02m-…`; "Next deliverable" refreshed; `02a–02q` header) — `memory_write.js` has no update primitive for existing entries and explicitly directs existing content to manual update; no secrets/injection markers were present. Also logged: `memory_write.js` silently ignores unknown flags (no `--dry-run`) → `lessons-learned.md`.

*Final-review synthesis: no [NO-GO]. The shipped core (DNA 4 in three root files, GUARDRAILS section, six step-00 gates, `scope-lock` gate) is [CONFIRMED] on disk; the eval layer is fixture-tier with its behavioral half explicitly unverified; every red is dated, cited, and owned above. Fold verified 2026-09-10 by the five original seats (transcript: `artifacts/evals/roundtable/transcripts/final-review-02m-intent-routing_native_1.md`); post-verification polish removed the withdrawn token-key literals from this document — exact identifiers retained in git history (`35cbe4c` carries the deletions; `3b91342` suite follow-up).*

