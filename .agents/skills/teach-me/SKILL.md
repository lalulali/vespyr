---
name: teach-me
description: 'Personal learning partner: Quick, Explain, or Deep Dive on any topic. Use when the user says "teach me X", "explain X simply", "deep dive into X", "quick summary of X", or invokes /teach-me.'
metadata:
  capabilities: "curriculum-design, content-synthesis"
  version: "1.0"
  last_updated: "2026-07-24"
  author: "@shifu"
  mode: "skill"
---

# Teach-Me — Personal Interactive Learning Partner

## What this skill does

Provides a rapid, personalized learning companion powered by **`@shifu` (Kong Qiu)**. Adapts any complex concept, framework, technical subject, or general humanities topic into three distinct learning scopes (Quick, Explain, Deep Dive) tuned to your preferred explanation style (Beginner, Intermediate, Expert).

## Persona delegation

This skill delegates reasoning and content formulation to **`@shifu` (Kong Qiu)**, channeling Richard
Feynman's first-principles clarity and Barbara Oakley's cognitive load control.

**Memory operations delegate; note files do not.** `@memory-controller` owns every read and write
of `artifacts/memory/teaching-style.md`, and `@researcher` owns Deep Dive research. The learning
note itself is written **directly** by `@shifu`, as the Delegation Matrix below states. This
paragraph used to say "All file operations are delegated to operational sub-agents", which
contradicted that matrix row — the same two-opposite-instructions defect found in
`/craft-lesson`'s anti-patterns, in the sibling skill, in the same audit.

## When to use

- "Explain Job-to-be-Done theory to me"
- "Teach me how Kubernetes ingress controllers work"
- "Quick summary of Quantum Entanglement"
- "Deep dive into Transformers and Attention Mechanisms"
- Trigger command: `/teach-me`

## Prerequisites

- Topic or concept specified by user (e.g. `/teach-me "Database Sharding"`).
- `@shifu` persona configuration (`.agents/agents/shifu.md`).
- Memory layer accessible via `@memory-controller` (`artifacts/memory/teaching-style.md`).

---

## 3 Learning Scopes

| Scope | Target Length | Channel & Output | Research Subagent | File Save |
|---|---|---|---|---|
| **Quick** | ~100 words | Inline response | No (`@shifu` direct) | No |
| **Explain** | ~500–1,500 words | Inline response | Optional (web search if needed) | Optional (`artifacts/output/teaching/notes/{topic-slug}.md`) |
| **Deep Dive** | ~2,000–5,000 words | Summary inline + full saved file | Yes (`@researcher`) | Required (`artifacts/output/teaching/notes/{topic-slug}.md`) |

---

## 4-Step Workflow

### Step 1: Intake & Preference Loading

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill teach-me --step 1`

1. **Parse Input Topic**: Extract the core subject from user query or prompt for one if omitted.
2. **Load User Teaching Style**: Delegate to `@memory-controller`:
   ```
   @memory-controller load shifu [teach-me: load user preferences from teaching-style.md]
   ```
3. **Check Existence**:
   - If `artifacts/memory/teaching-style.md` exists, load active default explanation style (`Beginner`, `Intermediate`, or `Expert`), section preferences, and format flags.
   - If `artifacts/memory/teaching-style.md` does NOT exist, flag for Step 2 Guided Onboarding.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill teach-me --step 1`

---

### Step 2: Style & Scope Selection (With Guided Onboarding)

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill teach-me --step 2`

1. **Check First-Run Onboarding Condition**:
   - If `teaching-style.md` is **missing** and user requested **Explain** or **Deep Dive** scope, prompt the user with Guided Onboarding:
     > *"Welcome to `/teach-me`! Before we start, how do you prefer to learn?"*
     > 1. **Beginner**: Story-driven, real-world analogies first, zero jargon without immediate plain-English translation.
     > 2. **Intermediate**: Balanced conceptual depth, standard industry terminology defined inline, cross-functional focus.
     > 3. **Expert**: Dense technical/domain precision, architectural trade-offs, edge cases, formal specifications.
     
     Save the selected preference by delegating to `@memory-controller`:
     ```markdown
     @memory-controller write artifacts/memory/teaching-style.md
     # Personal Teaching Style Preferences
     ## Defaults
     - **Explanation Style:** `<beginner|intermediate|expert>`
     - **Default Format:** `handbook`
     - **Active Recall Exercises:** `true`
     - **Citations Protocol:** `required`
     ## Audience Defaults
     - **Primary Target Audience:** `cross_functional_team`
     - **Prerequisite Level:** `foundational`
     ```

     **Write only these fields on first run; never overwrite an existing file.** The earlier version of
     this block wrote three keys of its own invention — `Target Audience`, `Preferred Formats`,
     `Core Takeaways Enabled` — none of which exist in the real schema, and it omitted Tone, Jargon
     Policy, Analogy Density, Section Patterns, Format-Specific Preferences and Prerequisite Level.
     `artifacts/memory/teaching-style.md` is a 16-key, 5-section config, and this block seeds **6** of
     those keys: enough for the skill to run, not a replacement for the file. The other ten keep their
     documented defaults until the learner changes them, which is the difference between seeding a
     config and overwriting one.
   - *Exemption*: If the user explicitly selects **Quick** scope on first run, skip onboarding to preserve sub-second speed, and default to `Intermediate` style.

2. **Scope Confirmation**: Confirm active scope (Quick / Explain / Deep Dive) and explanation style. Allow explicit inline override (e.g., `/teach-me "Kafka" --scope=quick --style=beginner`).

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill teach-me --step 2`

---

### Step 3: Response Generation

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill teach-me --step 3`

Execute according to selected scope:

#### A. Quick Scope (~100 words inline)
- High-level, zero-jargon summary in five short sentences or fewer.
- Use one memorable anchor analogy.
- No footnotes or research subagent overhead needed.
- Deliver directly inline to user.

#### B. Explain Scope (~500–1,500 words walkthrough)
- Structured walkthrough applying `@shifu`'s **6 Core Pedagogical Principles**
  (`.agents/agents/shifu.md` §6 Core Pedagogical Principles). **Do not restate the canon here** — cite it.
  This list used to be a divergent five-item copy that named a six-item set: it dropped *Bloom's
  Taxonomy*, *Spaced Repetition across Formats* and *Verifiable Citations*, and substituted two
  principles (`Analogy Anchor`, `Concrete Example`) that are not in the canon. An agent following it
  produced a walkthrough with no Bloom's mapping, no reinforcement anchor and no citations while
  believing it had applied all six.

  What the six mean *at Explain scope*, concretely:
  1. **First Principles** — the topic's irreducible truth in 1–2 paragraphs.
  2. **Cognitive Load** — 3–5 sub-concepts per section, the bound `shifu.md` §2 states. This line
     said "3–4, never more" while the canon says "3 to 5 core concepts max" and the anti-patterns
     below say "3–5" — three numbers for one rule, in the skill whose job is to reduce confusion.
  3. **Bloom's Taxonomy** — name the tier each sub-concept lands on (Remember → Create).
  4. **Spaced Repetition** — one "If Nothing Else, Remember This" anchor, matching the
     `Core Takeaways Callout` preference in `teaching-style.md`.
  5. **Active Recall** — end with 1 self-test question or mental exercise.
  6. **Verifiable Citations** — every domain claim anchored `[N]`; if you cannot find the source,
     write `[Source: unverified]` rather than asserting it (DNA 5).
- If requested, or if the walkthrough exceeds ~1,000 words, save the file:
  - Path: `artifacts/output/teaching/notes/{topic-slug}.md`

#### C. Deep Dive Scope (~2,000–5,000 words comprehensive note)
- **Delegate Topic Research**: Delegate to `@researcher` (Iris) for deep domain synthesis, key references, literature context, and trade-offs.
- **Synthesize Curriculum**: `@shifu` organizes findings into an exhaustive reference note:
  - Table of Contents
  - Executive Overview & First Principles
  - Deep-Dive Technical/Domain Architecture (4–6 core sections)
  - Edge Cases, Trade-offs, & Common Pitfalls
  - Historical / Theoretical Context & Footnote Citations `[N]`
  - Active Recall Scenarios & Self-Assessment Exercises
- **File Output**: Write:
  - Path: `artifacts/output/teaching/notes/{topic-slug}.md`
- Deliver inline summary with link to saved note.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill teach-me --step 3`

---

### Step 4: Follow-up & Escalation to `/craft-lesson`

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill teach-me --step 4`

After delivering the lesson, offer 4 active follow-up paths:

1. **Test Recall**: *"Would you like me to quiz you on this topic with 3 Socratic questions?"*
2. **Expand Scope**: *"Would you like to upgrade this to a full Deep Dive note?"* (if currently Quick or Explain).
3. **Save Note**: *"Would you like me to persist this explanation to `artifacts/output/teaching/notes/{topic-slug}.md`?"*
4. **Escalate to `/craft-lesson`**: *"Do you want to turn this topic into structured teaching materials (syllabus, handbook, cheatsheet, presentation slides, class modules, or video script) for others?"*
   - If YES, trigger transition to `/craft-lesson` passing the topic and generated note context.

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill teach-me --step 4`

---

## Delegation Matrix

| Task | Operational Agent | Contract & Path |
|---|---|---|
| Load / Save Teaching Preferences | `@memory-controller` (Mnemos) | `artifacts/memory/teaching-style.md` |
| Deep Dive Topic Research | `@researcher` (Iris) | Multi-source literature & technical research |
| Save Learning Note File | Direct I/O (`@shifu`) | `artifacts/output/teaching/notes/{topic-slug}.md` |
| Pedagogical Structuring & Style | `@shifu` (Kong Qiu) | Direct reasoning persona |

## Halt conditions

Any one halts the run:
- **No topic.** `/teach-me` with an empty subject is a prompt to ask one, not a topic to guess.
- **Deep Dive with no research path.** The scope declares `@researcher`; if no research subagent is
  available, say so and offer Explain scope instead of writing a 2,000-word note from memory.
- **`teaching-style.md` exists but cannot be read.** Do not silently default to `Intermediate` —
  the learner configured something, and ignoring it produces material they cannot use.

## Done when — checked mechanically

**Quick** leaves nothing on disk. **Explain** leaves a note only when the user asks or the walkthrough
exceeds ~1,000 words, and **Deep Dive** always does — so the gate below applies to any saved note,
whichever scope produced it. It is written against the Deep Dive section list because that is the
shape a saved note is expected to have; an Explain walkthrough saved at Step 3B is held to it too.
If that is the wrong contract for a short saved answer, say so and the gate changes — what it must
not do is pass a file the skill told the agent to write and then call it a mistake.

```bash
node .agents/scripts/teaching_artifact_check.js check \
  --kind note --file artifacts/output/teaching/notes/{topic-slug}.md --json
```

| Rule | What is checked |
|---|---|
| **Record hygiene** | no unfilled template placeholders |
| **The six declared sections** | Step 3C's list, in full: Table of Contents; Executive Overview / First Principles; **Deep-Dive Technical / Domain Architecture**; Edge Cases / Trade-offs / Pitfalls; Historical / Theoretical Context; Active Recall. Matched by stem, so numbering and `&` vs `and` do not defeat it. The first version of this gate checked five and claimed six — the same count-vs-list defect this audit keeps finding, inside the gate written to catch it |
| **Resolvable citations** | every inline `[N]` resolves to a `[^N]` footnote or a numbered entry under a references heading. A marker that resolves to nothing is a claim wearing a citation's costume (DNA 5) |
| **It is a note, not an answer** | below 800 words it is not a reference note. Length above that is reported as a note, never enforced — padding to a word count is the failure a count cannot detect |

**What the gate does not check:** whether the explanation is correct, whether the analogy lands,
whether the recall questions test what the note taught, or whether a citation supports the claim it
sits beside. Those need a human who knows the subject. A green gate means the note is *structured*,
not that it *teaches*.

---

## Anti-Patterns to Avoid

- **Do NOT flood Quick scope with citations or long background history.** Keep it under ~100 words.
- **Do NOT violate cognitive load principles.** Limit sub-sections to 3–5 key concepts max per level.
- **Do NOT hardcode fixed style without checking `teaching-style.md`.** Always respect user's persisted preferences.
