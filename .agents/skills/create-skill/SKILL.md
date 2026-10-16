---
name: create-skill
description: Create new skills, modify and improve existing skills, and measure whether they work. Use when the user says "create a new skill", "turn what we just did into a skill", "package this workflow", "rebuild this skill", "write an eval suite for this skill", "why isn't this skill triggering", or invokes /create-skill. Covers scaffolding, frontmatter, harness neutrality, benchmarks, and trigger verification. For surgical tweaks to an existing skill use /customize-skill instead.
metadata:
  version: "2.0"
  last_updated: "2026-10-16"
---

# Create Skill — Skill Authoring, Verification & Optimization

## What this skill does

Guides you through creating a new Vespyr skill or substantially rebuilding an existing one: capture
the intent, check for a duplicate, structure the `SKILL.md`, provision resources, add benchmarks, and
**verify the skill actually triggers and actually helps**.

The last two are the parts most skill-authoring guidance skips. A skill that never triggers is dead
weight in the context window, and a skill that triggers but does not improve the output is worse —
it costs tokens to produce the same result.

## When to use

- "Create a new skill for X"
- "Turn what we just did into a skill"
- "Rebuild or heavily restructure this skill" (major rewrites)
- "Add benchmarks for a skill" / "write an eval suite"
- "Why isn't this skill triggering?" / "optimize the description"
- "Turn this skill into a router that calls step files"

## When NOT to use

- For agent persona customizations (use `/customize-agent`)
- For surgical tweaks to a description, trigger phrase, or workflow step (use `/customize-skill`)
- For standard project features (use `/develop`)
- For prompt snippets or memory notes (those go in `project-context.md` / `active-decisions.md`)

---

## Core principles

### Concise is key — the context window is a public good

A skill shares the window with the system prompt, the conversation, every other skill's metadata, and
the actual request. **Assume the agent is already capable.** For each paragraph ask: *does the agent
need this explanation, and does it justify its token cost?*

Prefer a concise example over a verbose explanation. If a rule can be shown in three lines, showing it
in ten wastes seven.

### Set appropriate degrees of freedom

Match specificity to the task's fragility. This is the single most useful design decision in a skill,
and it is not the same as "be precise everywhere":

| Freedom | Write | Use when |
|---|---|---|
| **High** — prose, heuristics | "Read the changed files and look for the failure modes that matter" | Multiple approaches are valid; judgement depends on context |
| **Medium** — pseudocode, parameterised steps | "Run `check --kind <k> --file <f>`, then act on the exit code" | A preferred pattern exists; some variation is acceptable |
| **Low** — one exact command, few parameters | "Run exactly this, then stop" | The operation is fragile, consistency is critical, or order matters |

Think of the agent exploring a path: **a narrow bridge with cliffs needs guardrails; an open field
allows many routes.** A skill that puts guardrails on an open field gets ignored; one that leaves a
cliff unguarded gets someone hurt.

### Progressive disclosure — three levels, loaded as needed

1. **Metadata** (`name` + `description`) — always in context. This is the router.
2. **`SKILL.md` body** — loaded when the skill triggers. Keep under 500 lines.
3. **Bundled resources** — loaded only when the body points at them. No practical limit; a script can
   run without ever being read into context.

Three patterns for the split:

- **High-level guide** — core workflow in the body, depth in `references/<topic>.md`, each linked with
  *when* to read it.
- **Domain organisation** — one reference file per variant (an AWS file, a GCP file, an Azure
  file) so the agent reads only the one it needs. **Write the example as a description, not as a
  path** — `spec_check.js` scans the whole body for path-shaped references and cannot tell an
  illustration from a citation, so a path written as an example fails as a phantom.
- **Conditional detail** — the common path inline, the advanced path behind a link.

**Keep references one level deep.** A reference that points at another reference is a trail the agent
will lose.

### Harness neutrality — the skill must survive a product swap

Full rules: **`references/harness-neutrality.md`**. Read it before writing any frontmatter or any
instruction that names a tool. The short version:

- **The body names capabilities, never tools.** "Ask the user", not `AskUserQuestion`. "Run the
  command", not `Bash`. A tool name that resolves on one harness points at nothing on another.
- **Frontmatter declares; the body instructs.** `allowed-tools` and `compatibility` may name a
  specific product's tools — they are declarations, inert where unread. The body must not depend on them.
- **A rule that needs a tool must have the declaration to match.** A skill that asks the user while
  declaring no question tool has an unenforceable rule in the one harness that checks.
- **No product binary in a command.** `claude -p`, `codex`, `cursor-agent` do not run anywhere else.
- **Use the repository's runtime.** A Node repository does not need a Python toolchain.
- **Degrade in one body, not per-harness forks.** Say what changes without subagents or a browser;
  do not carry three sections that drift.

`spec_check.js` enforces the mechanical half. See the reference for which half is **not** enforced and
why.

### Explain the why

An agent given the reason behind a rule can apply it to a case the author never imagined; an agent
given a bare `ALWAYS` cannot. **If you find yourself writing `ALWAYS` or `NEVER` in capitals, or
reaching for a rigid structure, treat it as a yellow flag** — reframe and explain what the rule is for.

The exception is a genuinely closed set: `[GO]` / `[RESHAPE]` / `[NO-GO]` are the vocabulary, and
listing them is not barking, it is defining.

### What not to include

A skill contains only what an agent needs to do the job. **Do not add** `README.md`,
`INSTALLATION_GUIDE.md`, `QUICK_REFERENCE.md`, `CHANGELOG.md`, or similar. They are context about the
skill rather than instructions for using it, and they make the reader guess which file matters.

---

## Anatomy of a Vespyr skill

```
.agents/skills/<skill-name>/
├── SKILL.md (required)
│   ├── Frontmatter — name, description; optional: license, compatibility, metadata, allowed-tools
│   └── Body — Markdown instructions, <500 lines ideal
├── steps/      (router skills only — one file per step, each cited by SKILL.md)
├── references/ (optional — loaded on demand)
├── scripts/    (optional — executable helpers for deterministic work)
└── resources/  (optional — templates, assets, static data)
```

Benchmarks do **not** live in the skill folder. They are centralised under
`evals/suites/<group>/<name>.json`. See `references/evals-schema.md`.

### Naming

- Lowercase letters, digits and hyphens only; normalise a title to hyphen-case (`Plan Mode` →
  `plan-mode`). Under 64 characters, no leading or trailing hyphen.
- Prefer a short, **verb-led** phrase describing the action.
- Namespace by tool when it improves triggering (`gh-address-comments`, not `comments`).
- The folder name and the frontmatter `name` are the same string.

---

## Workflow

### Step 1: Capture intent

Understand what the skill should accomplish before writing anything.

- **From chat context** — extract the tools used, the sequence, the corrections the user made, and the
  input/output formats observed. Confirm with the user before proceeding.
- **From scratch** — interview briefly. Four questions:
  1. What should this skill let the agent do?
  2. When should it trigger — which phrases, tasks, or slash command?
  3. What is the expected output?
  4. What are the edge cases or constraints to guard against?

**Ask about the failure mode, not just the happy path.** *"What goes wrong today, without this
skill?"* is the question that decides whether the skill earns its place.

### Step 2: Deduplication & collision check

List `.agents/skills/` and read the names and descriptions. Then:

- If an existing skill covers ~80% of the intent, **enhance that one** rather than adding a sibling.
  Two skills that both answer "what should I do next?" is how `/sprint-status` came to exist and then
  be deleted.
- If the new skill would take over part of another's job, say so and plan the removal. A skill that
  supersedes another must retire it in the same change.
- Check the trigger phrases specifically. Two descriptions matching the same user sentence means one
  of them undertriggers forever.

### Step 3: Draft SKILL.md

Use `references/skill-template.md` as the baseline. For a router (a skill that owns `steps/`), use
`references/router-skill-template.md` and carry the `<!-- router-skill -->` marker plus
`When to invoke`, `Halt conditions`, and `Done when`.

#### Frontmatter

Allowed top-level keys **only**: `name`, `description`, `license`, `compatibility`, `metadata`,
`allowed-tools`. Anything else is a violation — put it under `metadata`.

- **name** — matches the folder.
- **description** — **the primary triggering mechanism.** Include both what the skill does and the
  contexts that should fire it. All "when to use" information belongs here, not in the body: the body
  is only loaded *after* triggering, so a "When to use" section cannot help the agent decide.
  Single line, 1–1024 chars, no `|`/`>` block scalars.
  **Write it slightly pushy.** Agents systematically *undertrigger* — they skip a skill that would
  have helped. Name the user phrases, the synonyms, and the slash command.
- **metadata** — string keys to string values. Put `version`, `last_updated`, `author` here. Lists are
  rejected; join them into a comma-separated string.
- **compatibility** — 1–500 chars, only if the skill genuinely needs an environment. Do not claim a
  harness you have not verified (see *Harness neutrality*).
- **allowed-tools** — optional, space-separated string. YAML list form is invalid.

#### Body

- Under 500 lines. Move depth into `references/` and link it with *when* to read it.
- Imperative mood.
- Explicit input/output templates where the output has a shape.
- **A rule that matters gets its reason.** A rule that does not matter gets deleted.

### Step 4: Write the files

Write `SKILL.md`, then any `references/`, `scripts/`, `resources/`. Delete unused scaffolding — an
empty directory reads as intent.

**Scripts must be run, not just written.** Execute each one against a real input before shipping it. A
script that has never run is a script that does not work.

### Step 5: Verify

1. **`node .agents/scripts/spec_check.js` must report 0 violations and 0 warnings.** Violations are
   machine-decidable facts: missing H1, a cited `steps/*.md` not on disk, an unreachable step file, a
   phantom skill or agent reference, an unbalanced fence, a box-drawing glyph outside a fence, a
   non-standard frontmatter key, a missing `metadata.last_updated`, a body that names a harness tool,
   or a rule that needs a question tool the declaration does not grant.
2. **Trigger check** — read the description and answer honestly: does it name the slash command, the
   phrases a user would actually type, and the near-miss cases that should *not* fire it? If you
   cannot tell whether a sentence should trigger this skill or a neighbour, the description is not
   finished.
3. **Regenerate the catalog** so `/help-me` sees it:
   ```bash
   node .agents/scripts/compile_skills.js
   git diff -- .agents/skills/help-me/skills-catalog.json   # must list the new skill
   ```
   Note the compiler harvests every `artifacts/...` path the body *mentions*, reads included — see its
   header for that recorded limit.
4. **Run the skill once for real**, on the kind of prompt it exists for. Reading a skill is not running
   one.

### Step 6: Measure

Two measurements, and they answer different questions.

**Does it help?** A skill's value is the *difference* it makes, not the output it produces. For a skill
with a verifiable output:

- Write 2–3 realistic prompts — the kind a real user would type, not a description of the task.
- Run each **with the skill and without it** (for an existing skill, without means the *previous*
  version). Same prompt, same inputs.
- Compare the outputs. If the no-skill run is as good, the skill is costing tokens for nothing — cut it
  or rewrite it.

Record the comparison in `evals/suites/<group>/<name>.json` (schema: `references/evals-schema.md`).
Assert the **output contract**, never the prose: a heading that must appear, a command that must be
run, a field that must be present. An assertion on wording pins the phrasing and blocks every
improvement that changes it.

**Declare the baseline, so the runner can check the comparison for you:**

```json
"baseline": { "variant": "without-skill", "note": "why this baseline" }
```

The runner then runs the same prompt without the skill and compares. **If your assertions pass in
both runs, they measure the output rather than the skill** — the run reports those as
`nonDiscriminating`, and that number is the one to act on. A benchmark whose assertions hold either
way is decoration, and it will read as evidence until someone checks.

**Does it trigger?** Write ~10 queries: half that should fire the skill, half near-misses that should
not. The near-misses are the valuable half — *"write a fibonacci function"* as a negative for a PDF
skill tests nothing. A good negative shares vocabulary with the skill and genuinely needs something
else.

Run each query, note whether the skill fired, and fix the description where it did not. This is
cheap and it is the difference between a skill that works and a file nobody's agent ever opens.

**Generalise from what you see — do not overfit.** A skill is meant to run a thousand times on prompts
nobody has written yet; you are testing it on three. If a fix only helps the fixture, it is not a fix.
When a problem is stubborn, try a different framing rather than a more rigid rule.

**Read the transcript, not just the output.** If the skill made the agent spend ten minutes on
something unproductive, the fix is usually deleting the instruction that caused it.

**Look for repeated work.** If every test run independently wrote the same helper, that is the signal
to bundle it in `scripts/` — the empirical answer to "what belongs in this skill".

### Step 7: Log it

Append to `artifacts/memory/active-decisions.md`:

```markdown
### [DECISION] Created Skill: <skill-name> [date: YYYY-MM-DD]
**Purpose:** {summary of capability}
**Path:** .agents/skills/<skill-name>/SKILL.md
**Router:** {yes — owns steps/, carries <!-- router-skill --> | no}
**Benchmarks:** {suite file + count, or "none — <reason>"}
**Harness needs:** {filesystem only | + subagents | + network | …}
```

---

## Anti-patterns

- **Undertriggered descriptions.** *"How to deploy apps"* instead of *"Deploy and publish web apps. Use
  when the user says ship it, deploy, release, or invokes /deploy."* The description **is** the router.
- **A body that names a tool.** `AskUserQuestion`, `present_files`, `Bash` — each resolves on one
  product and points at nothing elsewhere. See `references/harness-neutrality.md`.
- **A rule the declaration does not grant.** Permitting a confirmation prompt while declaring no
  question tool makes the rule unenforceable where it is checked.
- **Bloated bodies.** 1,000 lines in `SKILL.md` instead of `references/`. The 500-line guideline is a
  warning, not a preference.
- **Guardrails on an open field.** Rigid steps where judgement is the point. The agent follows the
  steps and produces something worse than it would have alone.
- **A per-skill `evals/evals.json`.** Nothing reads it. Benchmarks go in `evals/suites/`.
- **Benchmarks that assert wording.** They pin the phrasing and turn every improvement into a test
  failure, which is how a benchmark stops being a measurement and becomes a brake.
- **A step file no citation path reaches.** A written contract the router never loads reads as
  coverage that does not exist. Link it or delete it.
- **Per-harness sections that drift.** Three forks of one workflow, no way to tell which is current.
- **Shipping without running it.** A skill that has never been executed is a draft with frontmatter.
- **Malicious or surprising logic.** Skills adhere to `.agents/GUARDRAILS.md` and the principle of
  least surprise.

---

## Reference resources

- Harness neutrality (read before writing frontmatter): `references/harness-neutrality.md`
- Leaf-skill template: `references/skill-template.md`
- Router-skill template: `references/router-skill-template.md`
- Evals schema (the real `vespyr-eval` format): `references/evals-schema.md`
