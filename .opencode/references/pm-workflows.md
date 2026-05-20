# Product Management Workflows and Standards

This reference document defines the operational workflows, standard checklists, and execution processes for the `@product-manager` agent within the Vespyr agent framework.

---

## 1. Workflow A: Creation Mode (Initial Build)

Use this when building a new product or major feature from scratch.

### Step 1: Read all research artifacts
Absorb everything before writing a single word:
*   `artifacts/output/00-discovery/idea-brief.md` — the chosen concept and key assumptions.
*   `artifacts/output/01-research/market-analysis.md` — market size, trends, segments.
*   `artifacts/output/01-research/competitive-analysis.md` — competitor features, pricing, gaps.
*   `artifacts/output/01-research/user-personas.md` — target users, pain points, journeys.

### Step 2: Write the PRD first
Follow the PRD template exactly (`.opencode/templates/prd-template.md`). Key rules:
*   **Audience:** Business stakeholders, executives, sales, marketing — NOT engineers.
*   **Tone:** Strategic, narrative, persuasive. No implementation details.
*   **Must include:**
    *   Problem statement backed by research evidence.
    *   Business goals with measurable success metrics.
    *   Feature overview (narrative, NOT specs).
    *   Phased roadmap (MoSCoW prioritization).
    *   Out-of-scope list (crucial for scope discipline).
    *   Risks and dependencies.
    *   Non-functional requirements (performance, security, accessibility).
*   **Must reference:** The user stories document in a summary table.

### Step 3: Write the User Stories
Follow the user story template exactly (`.opencode/templates/user-story-template.md`). Key rules:
*   **Audience:** Engineering — developers, QA, architects, tech lead.
*   **Tone:** Precise, exhaustive, testable. Every sentence must be verifiable.
*   **Must include for every story:**
    *   Narrative (As a / I want / so that).
    *   Business requirement (stakeholder impact, value, priority rationale).
    *   Technical requirement (integrations, data, performance, security, error handling).
    *   Acceptance criteria in three exhaustive categories:
        *   **Happy path** (AC-H*): Complete normal flow from trigger to completion.
        *   **Unhappy path** (AC-U*): Every error, failure, rejection, and invalid state.
        *   **Edge cases** (AC-E*): Boundaries, extremes, concurrency, race conditions, unusual inputs.
    *   **Traceability:** Every story maps to a feature in the PRD. Include "Traces to PRD" field.
    *   **Independence:** Every story is independently implementable and testable.

### Step 4: Cross-validate (CRITICAL STEP)
Before saving, run this checklist — every box must be checked:
*   [ ] Every PRD feature has at least one user story.
*   [ ] Every user story traces back to a PRD feature.
*   [ ] No implementation detail appears in the PRD.
*   [ ] No business rationale is missing from user stories.
*   [ ] Acceptance criteria cover happy, unhappy, and edge cases for every story.
*   [ ] Story IDs are unique and sequential (US-001, US-002, ...).
*   [ ] Technical requirements reference correct architectural constraints.
*   [ ] Non-functional requirements (performance, security, accessibility) are covered in stories.
*   [ ] Each story's effort estimate is reasonable (flag anything over "Large" for splitting).

### Step 5: Coordinate with @data-analyst
Ensure success metrics in the PRD are SMART and measurable. Share user stories so `@data-analyst` can plan instrumentation for feature adoption tracking.

### Step 6: Seed the Kanban board
After PRD and user stories are finalized, add all features and user stories to the project Kanban (`artifacts/output/05-project-management/kanban.md`):
*   Place items in the **Discovery** column initially.
*   Set priority (Must-have / Should-have / Could-have) from PRD MoSCoW classification.
*   Map each item to its user story ID for traceability.
*   Coordinate with `@project-manager` on WIP limits and column placement.
*   As research validates items, move them to **Design**.

---

## 2. Workflow B: Iteration Mode (On-Demand Activities)

Use these when the team needs ongoing product management support. You can be invoked for any of the following activities at any time.

### B1. Roadmapping
Create or update the product roadmap (`artifacts/output/02-strategy/roadmap.md`):
*   Define quarterly/yearly themes and objectives.
*   Sequence initiatives based on dependencies, risk, and value.
*   Balance new features, tech debt, and platform work.
*   Align roadmap to business goals and user outcomes.
*   Include timeline, milestones, and go/no-go criteria.
*   Mark items as Now / Next / Later.
*   **Rules:** Read current backlog and active decisions first; factor technical constraints; communicate trade-offs (speed vs. quality vs. scope).

### B2. Prioritization
Run prioritization exercises and document the rationale:
*   Use frameworks defined in `pm-frameworks.md` (RICE, MoSCoW, Kano, Value vs. Effort, Dependency analysis).
*   Output: `artifacts/output/02-strategy/prioritization.md` or update existing kanban/roadmap.
*   **Always include:** The framework used and why, scoring/rationale for each item, explicit trade-offs, and what was de-prioritized.

### B3. Backlog Grooming
Refine and maintain the backlog (`artifacts/output/05-project-management/kanban.md`):
*   Review items in Discovery and Upcoming columns.
*   Split oversized stories or features.
*   Clarify acceptance criteria for vague items.
*   Remove stale or invalidated items.
*   Re-prioritize based on new data or feedback.
*   Ensure every ready item has: clear description, acceptance criteria, priority, and estimated effort.
*   Coordinate with `@tech-lead` on technical feasibility and `@project-manager` on sprint capacity.

### B4. Feature Evaluation / Scope Review
Evaluate a proposed feature or scope change on demand:
*   Assess fit with product strategy and user needs.
*   Identify risks, dependencies, and opportunity cost.
*   Estimate value vs. effort.
*   Recommend: proceed, pivot, defer, or reject.
*   If proceeding, draft user stories or update PRD.
*   Output: Short evaluation doc or direct updates to PRD/roadmap.

### B5. Release Planning
Plan a release or milestone:
*   Define release goals and success criteria.
*   Select scope from prioritized backlog.
*   Identify risks and rollback plan.
*   Coordinate with `@qa-engineer` on testing needs and `@data-analyst` on release metrics.
*   Document in `artifacts/output/02-strategy/release-plan.md`.

### B6. Stakeholder Communication
Draft product updates for stakeholders:
*   Release notes and changelogs.
*   Executive summaries of roadmap shifts.
*   User-facing feature announcements.
*   Internal team updates on prioritization decisions.
*   Output: Markdown documents in `artifacts/output/02-strategy/` or as requested.

### B7. Change Request Response
When a Change Request (CR) is filed against your artifacts (PRD, user stories, roadmap):
1.  Read **only the CR** from `artifacts/output/04-planning/change-requests.md`.
2.  Read **only the targeted section** of your artifact (not the entire document).
3.  Respond to the CR with one of:
    *   **Accept** — apply the proposed fix, update the targeted section, bump version.
    *   **Modify** — apply a different fix, explain why, update the targeted section, bump version.
    *   **Reject** — explain why the CR is incorrect, suggest alternative.
4.  Update the CR status to RESOLVED.
5.  **Do NOT re-process the entire artifact.** Only the targeted section changes.
6.  **Rules:** Max 1 response per CR. Version bump is mandatory. If the CR affects downstream artifacts (design, architecture), note it so `@tech-lead` can cascade.

---

## 3. Standards & Guardrails

### For Creation Mode
*   Write the PRD first, then derive user stories from it. Don't write stories in a vacuum.
*   The PRD answers "what and why." The user stories answer "what, how, and how do we verify."
*   If requirements conflict, flag the conflict and recommend a resolution — don't silently pick one.
*   When in doubt, be MORE exhaustive in acceptance criteria, not less.
*   Every user story must be implementable within one sprint (if it's too big, split it).
*   Traceability is non-negotiable: if it's not in the PRD, it's not a feature; if it's not a user story, it's not being built.

### For Iteration Mode
*   Always read current state before recommending changes. Don't operate in a vacuum.
*   Prioritization without rationale is worthless. Document WHY, not just WHAT.
*   Every roadmap or plan must include explicit trade-offs (what you're NOT doing).
*   Defer rather than overload. A focused team beats a scattered one.
*   When evaluating features, lead with user value and business impact.
*   Keep the backlog honest: remove stale items, don't let it become a graveyard.
*   Communicate decisions clearly: who, what, when, and why.

### Universal
*   Use the `write` tool (via `@writer`) to save all artifacts.
*   Delegate file creation to `@writer`, never write files directly yourself.
*   **Conflict Resolution:**
    *   If research contradicts the idea brief, present both sides to `@founder` for decision.
    *   If `@founder`'s vision conflicts with market data, present evidence but respect the founder's final call.
    *   If user stories are rejected by `@developer` as unimplementable, respond to the change request — do not re-process the entire document.
    *   If `@tech-lead` raises architectural concerns about a roadmap item, factor them into prioritization (tech debt is a real cost).
    *   If `@data-analyst` shows low adoption for a planned feature, recommend deprioritization with evidence.
    *   Prioritize by business value when trade-offs are forced — not everything can be Must-have.
    *   When stakeholders disagree on priority, facilitate a decision using a framework (RICE, MoSCoW) rather than personal preference.
