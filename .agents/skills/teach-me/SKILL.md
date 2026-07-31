---
name: teach-me
description: "Personal learning partner: Quick, Explain, or Deep Dive on any topic"
capabilities:
  - curriculum-design
  - content-synthesis
version: "1.0"
last_updated: "2026-07-24"
author: "@shifu"
mode: skill
---

# Teach-Me — Personal Interactive Learning Partner

## What this skill does

Provides a rapid, personalized learning companion powered by **`@shifu` (Kong Qiu)**. Adapts any complex concept, framework, technical subject, or general humanities topic into three distinct learning scopes (Quick, Explain, Deep Dive) tuned to your preferred explanation style (Beginner, Intermediate, Expert).

## Persona delegation

This skill delegates reasoning and content formulation to **`@shifu` (Kong Qiu)**, channeling Richard Feynman's first-principles clarity and Barbara Oakley's cognitive load control. All file operations are delegated to operational sub-agents (`@memory-controller`, `@researcher`, `@writer`).

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
     - Explanation Style: Intermediate # (or selected)
     - Target Audience: Cross-functional
     - Preferred Formats: [handbook, cheatsheet]
     - Core Takeaways Enabled: yes (handbook default)
     ```
   - *Exemption*: If the user explicitly selects **Quick** scope on first run, skip onboarding to preserve sub-second speed, and default to `Intermediate` style.

2. **Scope Confirmation**: Confirm active scope (Quick / Explain / Deep Dive) and explanation style. Allow explicit inline override (e.g., `/teach-me "Kafka" --scope=quick --style=beginner`).

> **Tracker:** `node .agents/scripts/step_tracker.js complete --skill teach-me --step 2`

---

### Step 3: Response Generation

> **Tracker:** `node .agents/scripts/step_tracker.js begin --skill teach-me --step 3`

Execute according to selected scope:

#### A. Quick Scope (~100 words inline)
- High-level, zero-jargon summary in $\le 5$ short sentences.
- Use one memorable anchor analogy.
- No footnotes or research subagent overhead needed.
- Deliver directly inline to user.

#### B. Explain Scope (~500–1,500 words walkthrough)
- Structured walkthrough using the 6 Core Pedagogical Principles:
  1. **First Principles Core**: State what the topic fundamental truth is in 1–2 paragraphs.
  2. **Cognitive Chunking**: Break topic into 3–4 logical sub-concepts.
  3. **Analogy Anchor**: Include 1 core conceptual analogy matched to explanation style.
  4. **Concrete Example**: Provide code, visual diagram (Mermaid), math formula, or step-by-step scenario.
  5. **Active Recall Prompt**: End with 1 self-test question or mental exercise.
- If requested or if content length $> 1,000$ words, delegate file saving to `@writer`:
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
- **File Output**: Delegate writing to `@writer`:
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
| Save Learning Note File | `@writer` (Quill) | `artifacts/output/teaching/notes/{topic-slug}.md` |
| Pedagogical Structuring & Style | `@shifu` (Kong Qiu) | Direct reasoning persona |

---

## Anti-Patterns to Avoid

- **Do NOT flood Quick scope with citations or long background history.** Keep it under ~100 words.
- **Do NOT violate cognitive load principles.** Limit sub-sections to 3–5 key concepts max per level.
- **Do NOT hardcode fixed style without checking `teaching-style.md`.** Always respect user's persisted preferences.
