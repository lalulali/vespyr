# Release Planning Frameworks

> **Used by:** Sarah (@product-manager) during **B5. Release Planning**
> **Reference from PRD:** §9.1 Phased Releases — fill in your chosen framework's table there; use this doc to decide which one.

---

## How to Choose a Framework

| Framework | Best for | Requires |
|-----------|----------|----------|
| [MoSCoW](#a--moscow) | Fixed deadline; hard scope triage | Stakeholder alignment on must-haves |
| [RICE](#b--rice) | Data-rich env; objectively comparing many features | Reach & effort estimates |
| [Kano](#c--kano) | Mapping table-stakes vs. delight; customer-led roadmap | User research / survey data |
| [Now / Next / Later](#d--now--next--later) | Continuous discovery; no hard release date | Stable team + regular discovery cadence |
| [Value vs. Effort](#e--value-vs-effort) | Fast 2×2 workshop; early-stage or thin data | Team workshop (60 min) |
| [WSJF](#f--wsjf) | SAFe / scaled agile; cost-of-delay driven sequencing | CoD estimates per feature |

**Decision rule:**
- Sprint-based team with a fixed release date → **MoSCoW**
- Plenty of usage data and many competing features → **RICE**
- Building a consumer product where delight matters → **Kano**
- Running continuous discovery with no fixed dates → **Now / Next / Later**
- Early stage, fast alignment needed, limited data → **Value vs. Effort**
- Large program increment (PI) planning, multiple teams → **WSJF**

---

## A — MoSCoW
*Scope triage under fixed deadline*

Copy this table into PRD §9.1:

```markdown
| Phase | Features | Priority | Target Date |
|-------|----------|----------|-------------|
| MVP | Core capabilities | Must-have | ... |
| V1.1 | Enhanced capabilities | Should-have | ... |
| Future | Nice-to-haves | Could-have | ... |
```

**Priority definitions:**
- **Must-have** — Non-negotiable. Release fails without it.
- **Should-have** — High value; include if time allows.
- **Could-have** — Nice to have; first to cut under pressure.
- **Won't-have (this time)** — Explicitly out of scope; document to prevent scope creep.

---

## B — RICE
*Data-driven scoring for environments with reach & effort estimates*

Copy this table into PRD §9.1:

```markdown
| Feature | Reach (users/qtr) | Impact (0.25–3) | Confidence (%) | Effort (person-weeks) | RICE Score | Phase |
|---------|-------------------|-----------------|----------------|-----------------------|------------|-------|
| e.g., Feature A | 1 000 | 2 | 80% | 4 | 400 | MVP |
```

**Formula:** `RICE Score = (Reach × Impact × Confidence) ÷ Effort`

**Scale guidance:**
| Field | Scale |
|-------|-------|
| Impact | 3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal |
| Confidence | 100% = high certainty, 80% = medium, 50% = low |

Sort descending by RICE Score. Features in the top quartile → MVP; remainder → later phases.

---

## C — Kano
*Customer delight mapping — differentiates table-stakes from wow-factors*

Copy this table into PRD §9.1:

```markdown
| Feature | Category | Rationale | Phase |
|---------|----------|-----------|-------|
| e.g., Core login | Basic (must-have) | Users expect it; absence causes dissatisfaction | MVP |
| e.g., Smart search | Performance | More = better; directly raises satisfaction | V1.1 |
| e.g., Surprise reward | Delighter | Unexpected; creates delight without expectation | Future |
```

**Category definitions:**
| Category | Description | Sequencing |
|----------|-------------|------------|
| **Basic (Must-be)** | Expected; causes dissatisfaction if absent | Always in MVP |
| **Performance (Linear)** | More = better satisfaction | Prioritize by impact score |
| **Delighter (Excitement)** | Unexpected; creates delight | Layer in post-MVP |
| **Indifferent** | Users don't care either way | Cut or defer indefinitely |
| **Reverse** | Actively disliked by some users | Investigate before building |

**Source:** Use survey data or user interviews from `artifacts/output/01-research/user-personas.md`.

---

## D — Now / Next / Later
*Continuous discovery roadmap — no hard release dates*

Copy this table into PRD §9.1:

```markdown
| Horizon | Features | Signal / Trigger to advance |
|---------|----------|-----------------------------|
| Now (current sprint) | ... | Ship & measure |
| Next (1-2 sprints) | ... | Validated by user feedback / metric |
| Later (3+ sprints or backlog) | ... | Re-evaluate when Now is complete |
```

**Horizon definitions:**
| Horizon | Time window | Commitment level |
|---------|-------------|------------------|
| **Now** | Current sprint | Fully committed; detailed stories written |
| **Next** | 1–2 sprints out | Directionally committed; rough sizing only |
| **Later** | 3+ sprints or open backlog | Options only; no commitment |

**Advancement trigger:** A feature moves from Later → Next only when a defined signal is observed (e.g., metric threshold, user feedback pattern, dependency unblocked).

---

## E — Value vs. Effort
*Fast 2×2 workshop for early-stage or thin-data environments*

Copy this table into PRD §9.1:

```markdown
| Quadrant | Features | Action |
|----------|----------|--------|
| High Value / Low Effort (Quick Wins) | ... | Ship first |
| High Value / High Effort (Major Bets) | ... | Plan carefully; break down |
| Low Value / Low Effort (Fill-ins) | ... | Pick up opportunistically |
| Low Value / High Effort (Time Sinks) | ... | Cut or deprioritize |
```

**Workshop format (60 min):**
1. List all candidate features on sticky notes.
2. Dot-vote on Value (1–5) and Effort (1–5) with the team.
3. Average scores; place each feature in the 2×2.
4. Sequence: Quick Wins → Major Bets → Fill-ins → cut Time Sinks.

---

## F — WSJF (Weighted Shortest Job First)
*Cost-of-delay driven sequencing for SAFe / scaled agile teams*

Copy this table into PRD §9.1:

```markdown
| Feature | User-Business Value | Time Criticality | Risk Reduction | Job Duration (weeks) | WSJF Score | Phase |
|---------|---------------------|------------------|----------------|----------------------|------------|-------|
| e.g., Feature A | 8 | 5 | 3 | 4 | 4.0 | MVP |
```

**Formula:** `WSJF = (User-Business Value + Time Criticality + Risk Reduction) ÷ Job Duration`

**Scoring scale (Fibonacci: 1, 2, 3, 5, 8, 13, 20):**
| Field | What to score |
|-------|---------------|
| User-Business Value | Revenue, user satisfaction, strategic alignment |
| Time Criticality | How fast does value decay? Deadline-sensitive? |
| Risk Reduction | Unblocks other work? Reduces technical or business risk? |
| Job Duration | Normalized effort in weeks (1 = shortest job on board) |

Sort descending by WSJF Score. Highest scores enter the next Program Increment (PI) first.

---

*Maintained by @product-manager. Update when new frameworks are adopted by the team.*
