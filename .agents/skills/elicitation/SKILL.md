---
name: elicitation
description: 'Push the LLM to reconsider, refine, and improve its recent output. Use when user asks for deeper critique or mentions a known deeper critique method, e.g. socratic, first principles, pre-mortem, red team. Consult @ml-ai-engineer where eval prompts or scored judgements are under review.'
metadata:
  version: "1.0"
  last_updated: "2026-10-14"
---

# Advanced Elicitation

## What this skill does

**Goal:** Push the LLM to reconsider, refine, and improve its recent output — always against a sharpened, user-confirmed target (Step 0), never a vague one.

Loads the method registry (`methods.csv`), matches the top 5 methods against the sharpened target, and runs the chosen critique method — in-context for single-persona methods, as real dispatched subagents for multi-persona ones. Ends every session with a five-line Sharpening Ledger so the critique is auditable after the fact.

## When to invoke
- "Push back on what you just wrote" / "critique this section" / "improve this output"
- The user names a deeper-critique method by name — pre-mortem, red team, first principles, Socratic, steelman, devil's advocate
- Output was produced moments ago and you want it examined before it is committed to a document
- A single agent's blind spot is suspected and a second independent perspective is cheaper than a full panel (for multi-stakeholder tension, use `/round-table` instead)

## When NOT to use
- The artifact is already committed and shipped — critique cannot unwrite it; use `/retro` or `/incident`
- The user wants a verdict on a *decision*, not a critique of *text* — use `/grill-me`
- The ask is a panel with genuinely opposed stakeholder positions — use `/round-table`; elicitation critiques one artifact, it does not seat personas
- There is no ground-truth material to critique against — a critique with nothing to check is taste, not analysis

## When invoked indirectly

When another skill or process calls this one mid-flight, apply the methods to the section just produced, then return the enhanced content to the caller with the Critique coverage line. Do not open the options menu — an indirect invocation wants the work done, not a chooser.

---

## Done when — checked mechanically

This skill shipped as pure prose with a closed outcome vocabulary and **no gate at all**. The skill
calls the outcome marker *CRITICAL* and says *"A bare `discarded` is not allowed"* — nothing checked
either.

```bash
node .agents/scripts/critique_session_check.js check \
  --kind elicitation --file artifacts/output/{current-phase}/elicitation-session.md --json
```

| Rule | What is checked |
|---|---|
| **Sharpening Ledger** | present and **exactly five lines** — (1) original → sharpened, (2) methods with outcome markers, (3) what changed, (4) critique coverage, (5) residual open questions |
| **Coverage count** | the ledger carries `{covered}/{total} points` |
| **Outcome markers** | every `[ELICITATION: …]` names an outcome from the closed set `applied \| discarded \| refined`. A marker the scorer cannot parse is a method that ran invisibly |
| **Discards carry a reason and a payload** | `user-rejected` / `superseded-by-<method>` / `out-of-scope — "<quoted boundary>"`. A bare `discarded` fails |
| **Skips** | every `[ELICITATION-SKIPPED: …]` names a reason from the closed taxonomy `user-explicit-override` / `no-applicable-method` / `time-boxed` — parity with brainstorming's SPC skips |

**Recorded as a limit:** whether the methods were applied well, whether the critique improved the
artifact, and whether a skip reason is honest. Those need a human who was in the room.

## CRITICAL LLM INSTRUCTIONS

- **MANDATORY:** Execute ALL steps in the flow section IN EXACT ORDER
- DO NOT skip steps or change the sequence
- HALT immediately when halt-conditions are met
- Each action within a step is a REQUIRED action to complete that step
- Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution
- **YOU MUST ALWAYS SPEAK OUTPUT in the active agent's persona voice** — defined in the active agent file's `Persona voice` section; with no active persona, default to the Vespyr Core DNA stance (`.agents/references/vespyr-dna.md`)

---

## INTEGRATION (When Invoked Indirectly)

When invoked from another prompt or process:

1. Receive or review the current section content that was just generated
2. Apply elicitation methods iteratively to enhance that specific content
3. Return the enhanced version back when the user selects 'x' to proceed
4. The enhanced content replaces the original section content in the output document
5. Enumerate the section's critique points before executing and return the Critique coverage line with the enhanced content (canon: `.agents/references/point-coverage.md`)

---

## Harness-Neutral Delegation (Tiered Dispatch)

Multi-persona methods derive their value from genuinely independent critique. In-context roleplay of multiple specialists is the opinion-merging failure mode — it is prohibited as a substitute for dispatch.

Degraded-mode policy lives in the shared contract `.agents/references/degraded-mode-tiers.md` (tiers, `--simulated` exception rule, telemetry) — this skill does not restate it. Elicitation-specific additions: dispatch each persona with the artifact under critique, its persona file, and the method's focus; cross-persona synthesis happens in the orchestrator, not in a shared context; single-persona methods may run in-context (one perspective critiquing content is legitimate).

At activation, log the resolved tier:

```bash
node .agents/scripts/roundtable_eval.js log --mode <native|solo|refused> --tool elicitation --topic "{artifact}" --agents "@a,@b"
```

## FLOW

### Step 0: Topic Sharpening (Mandatory — before any method)

Sharpening follows the shared contract `.agents/references/step-0-sharpening.md` (restate / fuzz ≤5 / emit / confirm — no manufactured ambiguity, no generic filler). Elicitation-specific: the restated target names the artifact/section under critique plus the question it must answer; **enumerate the critique points** the confirmed target covers — the distinct claims/sections to be challenged, grouped to ≤7 clusters when the target is large (canon: `.agents/references/point-coverage.md`; closure is disclosure, never a gate). The confirmed statement drives the critique target, the telemetry `--topic`, and the Step 1 matching context.

### Step 1: Method Registry Loading

**Action:** Load `./methods.csv` for elicitation methods. To support multi-persona simulation methods, resolve the agent roster via:

```bash
node .agents/scripts/resolve_agents.js
```

The resolver scans `.agents/agents/*.md` and returns each agent's configuration, including `code` (filename), `human_name`, and `description` (title). This roster identifies the specialist personas available for dispatch (like `@architect`, `@security-engineer`, or `@qa-engineer`) when executing collaboration or critique methods (see Harness-Neutral Delegation).

#### CSV Structure

- **category:** Method grouping (core, structural, risk, etc.)
- **method_name:** Display name for the method
- **description:** Rich explanation of what the method does, when to use it, and why it's valuable
- **output_pattern:** Flexible flow guide using arrows (e.g., "analysis → insights → action")

#### Context Analysis

- Use conversation history
- Analyze: content type, complexity, stakeholder needs, risk level, and creative potential

#### Smart Selection

1. Run the method matching script to dynamically identify the top 5 most relevant elicitation methods for the current context (the active document, artifact name, or task details):
   ```bash
   node .agents/scripts/match_methods.js --context "[sharpened topic from Step 0 + artifact name + current section]"
   ```
2. Read the JSON output of the script to obtain the recommended methods.
3. Present these 5 matched methods to the user in the options display format.

---

### Step 2: Present Options and Handle Responses

#### Display Format

Present the choices to the user in a beautiful, styled markdown block:

```markdown
### 🔍 Advanced Elicitation Options

Select one of the following methods to critique and refine the **[Artifact Name]**:

1. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`
   * *Why matched:* [one line tying this method to the sharpened topic]
2. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`
3. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`
4. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`
5. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`

---
Reply with a number (1-5) or method name to execute, **reshuffle** to get new options, **list all** methods, or **proceed** to finalize the artifact.
```

#### Response Handling

**Case 1-5 (User selects a method by number or name):**

- Execute the selected method using its description from the CSV.
- Adapt the method's complexity and output format based on the current context.
- If the method requires multiple personas, dispatch them per the Harness-Neutral Delegation tiers — never in-context simulation of independent perspectives. Single-persona methods run in-context.
- **CRITICAL:** End every method execution with a machine-readable outcome line — `[ELICITATION: <method-name> -> applied|discarded|refined]` — for telemetry parsing. A bare `discarded` is not allowed: discards carry a reason from the closed set with payload — `[ELICITATION: <method-name> -> discarded — {user-rejected | superseded-by-{other-method} | out-of-scope — "{quoted Step-0 boundary}"}]`. Skipped methods (never executed) are logged per session, not per method: `[ELICITATION-SKIPPED: <method-name> — {one of: user-explicit-override | no-applicable-method | time-boxed}]`, recorded in the session output ledger; owner `@tech-lead` counts skip markers per rolling 10 sessions, and skips above ~20% trigger the same revisit as routing overrides. Parity rule: elicitation skips meet the same bar as brainstorming SPC skips (closed taxonomy, logged, counted) — see RT-P2-5.
- Apply the method creatively to the current section content being enhanced.
- **Announce and report:** before executing, state in 1-2 lines why this method fits the sharpened topic and what it will test; after executing, report "What this revealed" in 2-3 bullets tied to the sharpened topic — not to the method's generic purpose.
- Display the enhanced version showing what the method revealed or improved (with clear diffs or formatted text).
- **Sharp questions:** when user input would materially change the outcome, ask at most 3 pointed questions tied to the revealed gaps — never generic invitations ("any thoughts?"). If nothing materially needs input, ask nothing.
- **CRITICAL:** Ask the user: *"Do you want to apply these changes to the document? (yes / no / refine further)"* and HALT to await response.
- **CRITICAL:** ONLY if Yes, apply the changes. IF No, discard your memory of the proposed changes. If any other reply, try best to follow the instructions given by the user.
- **CRITICAL:** Re-present the options menu (with 5 fresh or reshuffled methods) to allow additional elicitations.

**Case: Reshuffle**

- Select 5 random methods from methods.csv, present new list with same prompt format.
- When selecting, try to think and pick a diverse set of methods covering different categories and approaches, with 1 and 2 being potentially the most useful for the document or section being discovered.

**Case: List All**

- List all methods with their descriptions from the CSV in a clean, categorized markdown table.
- Allow user to select any method by name or number from the full list.
- After selection, execute the method as described in the Case 1-5 above.

**Case: Consistency check — before the ledger closes**

Once the methods have run, scan what they concluded for contradictions before writing the Sharpening
Ledger. *Levered from `/grill-me`'s contradiction scan, 2026-10-14.*

- Does a method's conclusion contradict the sharpened target from Step 0?
- Does one method's finding invalidate another's assumption?
- Did a `discarded` method discard something a later method then relied on?
- Did any point end unexamined, or contradicted by another point's conclusion?

If contradictions surface, present them and ask which to revisit. **A ledger that closes over an
unresolved contradiction is a record of the disagreement, not a critique** — and the reader has no way
to tell which.

**Case: Proceed**

- Complete elicitation and proceed.
- **Close with the Sharpening Ledger** — the session's communicable record, exactly five lines:
  1. Original topic → sharpened topic
  2. Methods executed, each with its outcome marker
  3. What changed in the artifact (one line)
  4. Critique coverage: `{covered}/{total} points` — every enumerated point ends `covered (method)` / `unexamined (disclosed)` / `deferred (owner + reason)` / `out-of-scope ("boundary")`; `none` when all covered (canon: `.agents/references/point-coverage.md`; disclosure, not a gate)
  5. Residual open questions (max 3, or "none") — and the **handoff recommendation**: what this
     artifact is now ready for, or what it needs first (e.g. "ready for `/develop`", "needs
     `/grill-me` on the scope before specs"). *Levered from `/grill-me`, 2026-10-14: a critique that
     does not say what to do next leaves the reader to guess.*
- Return the fully enhanced content back to the invoking skill.
- The enhanced content becomes the final version for that section.
- Signal completion back to the invoking skill to continue with the next section.

**Case: Direct Feedback**

- Apply changes to current section content and re-present choices.

**Case: Multiple Numbers**

- Execute methods in sequence on the content, then re-offer choices.

---

### Step 3: Execution Guidelines

- **Method execution:** Use the description from CSV to understand and apply each method
- **Output pattern:** Use the pattern as a flexible guide (e.g., "paths → evaluation → selection")
- **Dynamic adaptation:** Adjust complexity based on content needs (simple to sophisticated)
- **Creative application:** Interpret methods flexibly based on context while maintaining pattern consistency
- **Stop when the answer needs something that does not exist yet.** Some critique questions cannot be settled by re-reading the content — *"does this interaction feel right?"* and *"is this the right split?"* need something to react to. When a method's output would be guesswork, **say so and name what to build or measure first**, rather than producing confident-sounding critique. *Levered from `/grill-me`'s ungrillable boundary, 2026-10-14.*
- **You are the sycophant here.** A critique that agrees with everything the artifact already says is not a critique — it is a summary with extra steps. If every method confirmed the existing draft, say that plainly; a no-change verdict is a legitimate outcome and a hollow one is not.
- Focus on actionable insights
- **Stay relevant:** Tie elicitation to specific content being analyzed (the current section from the document being created unless user indicates otherwise) and to the Step-0 sharpened topic. If the topic shifts mid-session, re-run Step 0 — never critique a moving target silently.
- **Identify personas:** For multi-persona methods, identify each dispatched persona by name and source file; for single-persona methods, critique in-context and label the output as one perspective.
- **Critical loop behavior:** Always re-offer the options card after each method execution
- Continue until user selects 'x' to proceed with enhanced content, confirm or ask the user what should be accepted from the session
- Each method application builds upon previous enhancements
- **Content preservation:** Track all enhancements made during elicitation
- **Iterative enhancement:** Each selected method (1-5) should:
  1. Apply to the current enhanced version of the content
  2. Show the improvements made
  3. Return to the prompt for additional elicitations or completion

---

## Is it working?

Coverage is not quality — the ledger can close with every point `covered` while nothing improved. The
test is whether the artifact changed in a way you did not already expect:

- Did a method find something the author had not considered, or restate their own framing back at them?
- Did any method change a decision, or only sharpen the wording of a decision already made?
- Did the session end somewhere the author did not anticipate?
- Could the author defend each accepted change to someone who was not in the room?

If every answer is "no", the session was a review, not an elicitation. Say so in the ledger rather than
letting the coverage count imply otherwise. *Levered from `/grill-me`'s passivity boundary, 2026-10-14.*
