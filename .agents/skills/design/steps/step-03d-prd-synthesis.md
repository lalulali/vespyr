---
step: 3d
name: PRD Synthesis
mode: reverse
prerequisites:
  - step-2 completed
output_contract:
  citations: not-required
---

# Step 3 — PRD Synthesis (Reverse Mode)

Synthesize the PRD through the **same interactive loop the traditional flow uses** — re-run create-mode steps 02a→05a with the Evidence Ledger as fixed input. Never one-shot "generate from the prototype": one-pass derivation is the defect this mode exists to kill (M1).

## Prerequisites
- `requirements.md` §14 Evidence Ledger built (step-2) with every row anchored or `[OPEN]`.
- `prototype-inventory.md` (step-1) available as secondary reference.
- `artifacts/output/03-strategy/prototype-collaboration.md` records the selected prototype track, designer–tech review, and `SATISFIED` reviewer sign-offs; `prototype_collab_gate.js verify` passes.

## Process
> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill design-reverse --step 3`

1. Re-run the create-mode steps **in order**, treating each as a loop with the same pause points as create mode, and use the same canonical documents. **Scaffold first:** copy each template to its output path before populating, then fill in place — never author the document from scratch (scratch-authoring is what drifts off-template):
   - `cp .agents/templates/product/prd-template.md artifacts/output/03-strategy/requirements.md`
   - `cp .agents/templates/product/user-story-template.md artifacts/output/03-strategy/user-stories.md`
   - **Document version, not template version.** After copying, set the document's `**Version:**` field to `1` on first generation and `**Last changed:**` to today's date, with a `- v1: Initial draft` change-log line. The `Template Revision History` comment (template v3/v5/etc.) is Vespyr-internal — never copy a template revision number into the document's version. Later edits to this same file bump the document version (v2, v3, …) with a dated change-log line.
   - **02a personas** → populate the full `.agents/templates/product/prd-template.md` structure and fill §6 Target Audience (max 3, mapped to ledger evidence)
   - **03a user stories** → populate the full `.agents/templates/product/user-story-template.md` structure with AC-H / AC-U / AC-E per story
   - **04a screen states** → use `.agents/templates/product/product-spec-template.md` for states, transitions, and edge states
   - **05a design tokens** → use `.agents/templates/product/design.md` for the token layer and component states
2. **§2 Research Foundation — no source, no fact (DNA 5, hard rule).** The PRD template ships §2 with placeholder rows for `idea-brief.md`, `market-analysis.md`, `competitive-analysis.md`, `user-personas.md`, etc. These are **upstream research artifacts, not prototype evidence.** You must NOT mark any §2 row `Reviewed` or write a "Key Finding" unless the file at that exact path actually exists on disk and you have read it.
   - **Imported sub-track (the common case):** there is no upstream discovery/research flow — those files do not exist. Do **not** invent statuses or findings. For each non-existent row write status `[ABSENT — no upstream research]` and leave the finding as `—`. Add one line above the table: *"This PRD was reverse-engineered from an imported prototype; no upstream research artifacts exist. The prototype inventory (§14 Evidence Ledger) is the sole evidence base."* The `Prototype Inventory` row is the only row that may be `Reviewed`, and only if `prototype-inventory.md` exists.
   - **Generated sub-track / create mode:** mark a row `Reviewed` only for files that exist and were read; mark the rest `[PENDING]`. Never `Reviewed` a file you have not opened.
   - Fabricating a research row — a status, a finding, or a citation for a file that does not exist — is a DNA 5 defect and a halt condition, not a formatting choice. Verify each path with the file system before writing its row.
3. **Full-template gate.** `requirements.md` must retain the complete numbered PRD structure (§§1–14), including the Evidence Ledger in §14. `user-stories.md` must retain the backlog tree, Epic → Feature → Story hierarchy, metadata, Business/Technical Requirements, Gherkin AC blocks, UI/UX notes, data notes, out-of-scope items, and open questions. A compact evidence summary is not a valid substitute for either document.
4. **Row-anchor every authored artifact.** Each persona trait, FR/NFR, story, and screen state cites the ledger rows (`L-NN`) it is earned from. Keep the template's `Traces to PRD` field and append the ledger IDs to that field; never replace the FR reference. A *factual claim* with neither a ledger row nor a new `[OPEN]` row is a grounding violation — halt and fix. (Acceptance criteria follow the completeness rule in item 5 — they are not held to the same "must be anchored" bar as factual claims.)
5. **Facts are anchored; AC coverage is anticipatory — the PRD COMPLETES the prototype, it does not merely transcribe it.** This is the fix for shallow reverse-mode stories. A static prototype almost always shows only the happy path; the PRD must not inherit that happy-path bias.
   - **Behavioral facts** (what the product *does* — FRs, ledger statements, screen states that exist) must be anchored to the prototype or marked `[OPEN]`. Never invent a behavior the prototype does not have.
   - **Acceptance criteria coverage is decided by reasoning, not a count.** For each story, work through the 12-category risk sweep in `.agents/references/templates/user-story-instructions.md` §3.2 and record the result in the mandatory **AC Coverage Self-Audit** block (§3.3): one line per category, each resolving to either an `AC-…` reference or an `N/A because <concrete reason>`. Write an AC wherever a category has a real failure mode for *this* case. The number of ACs is then whatever the reasoning produces — few for a simple story, many for a complex one. There is no target count and no pattern to hit; a uniform 1/1/1 or 2/2/1 shape across stories is a tell that the sweep was skipped. **The mechanical gate never counts your ACs — it only checks that the self-audit exists and that every category line is genuinely resolved.** Depth is the byproduct of honest per-category reasoning.
   - **Tag each AC by source** so the ledger discipline stays honest: an AC whose behavior is witnessed in the prototype is tagged `[prototype L-NN]`; an AC derived from domain expectation to complete coverage is tagged `[derived]`. `[derived]` ACs are legitimate and required — they describe how a correct implementation must behave, not a claim about what the prototype already shows. Do NOT invent new *product behavior/features* under the guise of a derived AC; derived ACs cover failure/edge handling of behaviors that already exist, or raise an `[OPEN]` row when a genuinely new capability is implied.
   - If completing coverage surfaces a real product gap (a behavior the prototype lacks and the owner must decide on), append an `[OPEN]` row to §14 rather than silently specifying it.
6. **The ledger is fixed input for facts** — do not re-interpret the prototype or strengthen a factual statement into a claim it does not support. This constrains facts, not AC breadth: deriving anticipatory AC-U/AC-E (item 5) is required, not a violation of this rule.
7. Keep the loop honest: in `semi-autonomous` mode, pause at the same checkpoints create mode pauses at (personas → PRD, stories, screen states). This is a synthesis loop, not a generation prompt.
8. Every FR/NFR in `requirements.md` §7/§8 traces to ledger rows; ACs in `user-stories.md` reference the screen states they exercise, and each AC carries its `[prototype L-NN]` or `[derived]` source tag.

## Output
- `artifacts/output/03-strategy/requirements.md` — complete `.agents/templates/product/prd-template.md` document, §§1–14, including the populated Evidence Ledger
- `artifacts/output/03-strategy/user-stories.md` — complete `.agents/templates/product/user-story-template.md` document, with row-anchored stories and Gherkin ACs
- `artifacts/output/03-strategy/product-spec.md` and `artifacts/output/03-strategy/design.md` — complete outputs from their existing templates

## Recommended next step — AC enrichment pass (strongly recommended, not blocking)

Good acceptance criteria are not produced in a single pass — the same reason a traditional PRD earns its depth through iteration (the Asymmetry Law this mode is built around). The self-audit gate above forces you to *reason* about every risk category, but the first-pass ACs are a skeleton, especially in reverse mode where the prototype only showed the happy path. **Before handing off to `/develop`, run an enrichment pass to deepen coverage per story.**

Tell the user plainly, then offer the command:

> The requirements and user stories are drafted, but the acceptance criteria are an initial skeleton — the prototype mostly showed the happy path, so failure and edge cases are thin. I recommend an enrichment pass before development: it goes story by story, crosses each interactive component against the 12 risk categories, and adds the missing criteria (e.g. QR fails to load, download fails, clipboard API absent, timer drift while backgrounded, refresh mid-countdown). Run `/elicitation` on `user-stories.md` and pick **AC Enrichment Sweep**. You can also skip it and proceed to `/develop`.

This is a recommendation, not a gate — do not block handoff on it (a hard gate would just push the generator back toward hitting a quota). Record whether the user ran it or deferred it in the session summary.

## Halt conditions
- Any required PRD or user-story template section/field is missing
- **`node .agents/scripts/template_conformance.js check --mode reverse` exits non-zero** (mechanical enforcement of the full-template gate — a compact/off-template substitute fails here)
- Any authored statement without a ledger row or `[OPEN]` row (grounding violation)
- **A story missing its AC Coverage Self-Audit block, or a self-audit whose category lines are not resolved (bare `N/A`, placeholder, or blank instead of an AC reference or a concrete `N/A because …`) — caught by `template_conformance.js`. The gate never counts ACs; it checks that each risk category was actually reasoned about.**
- **Any §2 Research Foundation row marked `Reviewed` or given a "Key Finding" for a file that does not exist on disk (DNA 5 fabrication) — verify every path before writing its row**
- A story AC contradicts its cited ledger rows
- Ledger missing or containing `confirmed` rows with unresolvable anchors

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill design-reverse --step 3`

**Owner:** `@product-manager` (Sarah) synthesizes the final PRD from requirements and user stories.
