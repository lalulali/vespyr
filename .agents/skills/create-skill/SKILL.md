---
name: create-skill
description: Create new skills and design lightweight skill evals. Make sure to use this skill whenever the user mentions creating a skill, adding a new skill, authoring workflow instructions, turning a conversation/workflow into a skill, building custom skill logic, or doing a major rewrite of an existing skill. For surgical tweaks to an existing skill's triggering, description, or workflow steps, use /customize-skill instead.
metadata:
  version: "1.0"
  last_updated: "2026-07-30"
---

# Create Skill — Skill Authoring & Optimization

## What this skill does

Guides you through creating new Vespyr skills or enhancing existing skills. Helps extract workflows from conversation history or interviews, checks for duplicates, structures the `SKILL.md` file following Vespyr conventions (leaf or router), provisions optional resource/reference directories, and adds benchmarks to the centralized `evals/suites/` runner.

## When to use

- "Create a new skill for X"
- "Turn what we just did into a skill"
- "Package this deployment workflow into a reusable skill"
- "Rebuild or heavily restructure an existing skill (major rewrites)"
- "Add benchmarks for a skill" / "write an eval suite for this skill"
- "Turn this skill into a router that calls step files"

## When NOT to use

- For agent persona customizations (use `/customize-agent`)
- For surgical tweaks to an existing skill's description, triggering, or workflow (use `/customize-skill`)
- For standard codebase features or project code (use `/develop`)
- For adding simple prompt snippets or memory notes (use `project-context.md` or `active-decisions.md`)

---

## Anatomy of a Vespyr Skill

```
.agents/skills/<skill-name>/
├── SKILL.md (required)
│   ├── Frontmatter (name, description; optional: license, compatibility, metadata, allowed-tools)
│   └── Body (Markdown instructions, <500 lines ideal)
├── steps/      (router skills only — one file per step, each cited by SKILL.md)
├── references/ (optional — documentation loaded into context as needed)
├── scripts/    (optional — executable helper scripts for deterministic tasks)
└── resources/  (optional — templates, assets, or static data)
```

Benchmarks do **not** live in the skill folder. They are centralized suites
under `evals/suites/<group>/<name>.json`, run by the wired `vespyr-eval` runner.
See `references/evals-schema.md`.

---

## Workflow

### Step 1: Capture Intent

Start by understanding what the skill should accomplish. 
- **If capturing from chat context**: Read the session to extract tools used, sequence of steps, user corrections, and input/output formats observed.
- **If building from scratch**: Conduct a short interview with the user.

Ask these key questions:
1. What capability or workflow should this skill enable?
2. When should this skill trigger? (What user phrases, tasks, or slash commands?)
3. What is the expected output format or deliverable?
4. Are there edge cases or constraints to guard against?

### Step 2: Deduplication & Collision Check

List the existing skills under `.agents/skills/`. Check names and descriptions to ensure:
- The proposed skill does not duplicate an existing skill (e.g. `/plan`, `/design`, `/test`).
- If an existing skill covers ~80% of the intent, suggest enhancing the existing skill instead of creating a duplicate.

### Step 3: Draft SKILL.md

Construct `.agents/skills/<skill-name>/SKILL.md` using `.agents/skills/create-skill/references/skill-template.md` as a baseline.

#### Frontmatter Guidelines (agentskills.io spec)

Allowed top-level keys only: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`.

- **name**: Concise kebab-case identifier matching the folder name (e.g. `create-skill`, `api-linter`). Lowercase alphanumerics + hyphens only, no leading/trailing hyphen, ≤ 64 chars.
- **description**: **MUST include both what the skill does AND explicit triggering contexts.** Write descriptions that are slightly "pushy" to ensure the AI engine doesn't undertrigger. Include relevant keywords, user phrases, and slash command syntax. Single line, 1–1024 chars, no `|`/`>` block scalars.
- **metadata**: Optional map of string keys to string values — put `version`, `last_updated`, `author`, etc. here (e.g. `metadata:\n  version: "1.0"`). List values are not allowed; join lists into a comma-separated string.
- **license**: Optional (e.g. `MIT`).
- **compatibility**: Optional, 1–500 chars, only if the skill needs specific environment requirements.
- **allowed-tools**: Optional, space-separated string (e.g. `Read Write Edit`). YAML list form is invalid.

After drafting, new skills MUST pass: `node .agents/scripts/spec_check.js` (validates all skills in CI).

#### Body Guidelines
- Keep under 500 lines. Move large domain docs or extensive reference materials into `references/<topic>.md`.
- Use imperative language ("Check X", "Write Y", "Do NOT execute Z").
- Include clear step-by-step workflows.
- Provide explicit input/output templates and examples.

### Step 4: Write Skill Files

Write `.agents/skills/<skill-name>/SKILL.md`.

If the skill requires extra resources:
- Create subdirectories (`references/`, `scripts/`, `resources/`) as needed.
- Write supporting documents or scripts into those directories.

### Step 5: Add Benchmarks to the Centralized Suite (Recommended)

Skills with verifiable outputs (code transforms, file generation, structured reports) should carry benchmarks. **Benchmarks live in `evals/suites/<group>/<name>.json`, not in the skill folder** — a per-skill `evals/evals.json` is never read by the runner.

Ask the user: *"Would you like to add 2–3 benchmarks for this skill?"*

If yes:

1. Pick the suite matching the skill's domain — `delivery`, `design`, `discovery`, `meta-authoring`, `operations`, or `research`. Full map: `references/evals-schema.md`.
2. **If the skill already has an invariant suite** (`grill-me`, `shut-up`), extend that instead of adding a scored duplicate.
3. **Append** to the `benchmarks` array — never rewrite the suite file. Other work may be uncommitted in it.
4. Give each benchmark a globally unique `id` (`SKILL-<NAME>-<SLUG>`) and assert the **output contract**, not the prose:

```json
{
  "id": "SKILL-<NAME>-<SLUG>",
  "skill": "<skill-name>",
  "name": "Short human title",
  "dimension": "prd_completeness",
  "assertContains": ["<heading the skill must emit>", "<literal command>"],
  "assertNotContains": ["I cannot", "As an AI"],
  "prompt": "The literal user prompt to send"
}
```

5. Verify every suite still parses — `npm run eval:skills` only loads `skills/delivery`, so it cannot see a break elsewhere:

```bash
npm run eval 2>&1 | grep -i "malformed suite"   # expect NO output
```

### Step 6: Smoke-Test & Trigger Verification

Verify the skill setup:
1. Review the `description` field in frontmatter — does it name the slash command AND the phrases a user would actually type? A description without an explicit trigger cue is the single most common cause of undertriggering, and `spec_check.js` warns on it.
2. Run `node .agents/scripts/spec_check.js` — the new skill MUST pass with **0 violations and 0 warnings**. Violations are machine-decidable facts (missing H1, a cited `steps/*.md` that does not exist, an unreachable step file, a phantom skill reference, an unbalanced fence, a box-drawing glyph outside a fence, missing `metadata.last_updated`). Do not ship a skill that trips any of them.
3. If the skill is a **router** (it owns a `steps/` directory), add the `<!-- router-skill -->` marker under its H1 and follow `references/router-skill-template.md` — it must carry `When to invoke`, `Halt conditions`, and `Done when`.
4. Perform a dry run against the benchmark prompts you added in Step 5.
5. Regenerate the compiled catalog so `/help-me` sees the new skill:
   ```bash
   node .agents/scripts/compile_skills.js
   git diff -- .agents/skills/help-me/skills-catalog.json   # must list the new skill
   ```

### Step 7: Log the Skill Creation

Append an entry to `artifacts/memory/active-decisions.md`:

```markdown
### [DECISION] Created Skill: <skill-name> [date: YYYY-MM-DD]
**Purpose:** {summary of capability}
**Path:** .agents/skills/<skill-name>/SKILL.md
**Router:** {yes — owns steps/, carries <!-- router-skill --> | no}
**Benchmarks:** {suite file + count, or "none — <reason>"}
```

---

## Anti-patterns

- **Undertriggered descriptions.** Writing vague descriptions like *"How to deploy apps"* instead of *"Deploy and publish web apps. Use when the user says ship it, deploy, release, or invokes /deploy."* The description **is** the router; make it slightly pushy.
- **Bloated SKILL.md files.** Packing 1,000+ lines into `SKILL.md` instead of using `references/`. The <500-line guideline is a warning, not a preference.
- **A per-skill `evals/evals.json`.** Nothing reads it. Benchmarks go in `evals/suites/`.
- **A step file no citation path reaches.** A fully-written contract the router never loads reads as coverage that does not exist. Link it or delete it.
- **Malicious or unexpected logic.** Skills must adhere to `.agents/GUARDRAILS.md` and principle of least surprise.

---

## Reference Resources

- Leaf-skill template: `.agents/skills/create-skill/references/skill-template.md`
- Router-skill template: `.agents/skills/create-skill/references/router-skill-template.md`
- Evals schema (the real `vespyr-eval` suite format): `.agents/skills/create-skill/references/evals-schema.md`
