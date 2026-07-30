---
name: create-skill
description: Create new skills, modify and improve existing skills, and design lightweight skill evals. Make sure to use this skill whenever the user mentions creating a skill, adding a new skill, authoring workflow instructions, turning a conversation/workflow into a skill, building custom skill logic, or updating an existing skill definition.
version: "1.0"
last_updated: 2026-07-30
---

# Create Skill — Skill Authoring & Optimization

## What this skill does

Guides you through creating new Vespyr skills or enhancing existing skills. Helps extract workflows from conversation history or interviews, checks for duplicates, structures the `SKILL.md` file following Vespyr conventions, provisions optional resource/reference directories, and crafts lightweight `evals/evals.json` verification suites.

## When to use

- "Create a new skill for X"
- "Turn what we just did into a skill"
- "Package this deployment workflow into a reusable skill"
- "Improve the triggering and instructions of `@skill-name`"
- "Add test prompts/evals to a skill"

## When NOT to use

- For agent persona customizations (use `/customize-skill`)
- For standard codebase features or project code (use `/develop`)
- For adding simple prompt snippets or memory notes (use `project-context.md` or `active-decisions.md`)

---

## Anatomy of a Vespyr Skill

```
.agents/skills/<skill-name>/
├── SKILL.md (required)
│   ├── Frontmatter (name, description, version, last_updated)
│   └── Body (Markdown instructions, <500 lines ideal)
├── references/ (optional — documentation loaded into context as needed)
├── scripts/    (optional — executable helper scripts for deterministic tasks)
├── resources/  (optional — templates, assets, or static data)
└── evals/      (optional — verification test cases & expectations)
    └── evals.json
```

---

## Workflow

### Step 1: Capture Intent

Start by understanding what the skill should accomplish. 
- **If capturing from chat context**: Use `@reader` to extract tools used, sequence of steps, user corrections, and input/output formats observed in the session.
- **If building from scratch**: Conduct a short interview with the user.

Ask these key questions:
1. What capability or workflow should this skill enable?
2. When should this skill trigger? (What user phrases, tasks, or slash commands?)
3. What is the expected output format or deliverable?
4. Are there edge cases or constraints to guard against?

### Step 2: Deduplication & Collision Check

Use `@reader` to list existing skills under `.agents/skills/`. Check names and descriptions to ensure:
- The proposed skill does not duplicate an existing skill (e.g. `/plan`, `/design`, `/test`).
- If an existing skill covers ~80% of the intent, suggest enhancing the existing skill instead of creating a duplicate.

### Step 3: Draft SKILL.md

Construct `.agents/skills/<skill-name>/SKILL.md` using `.agents/skills/create-skill/references/skill-template.md` as a baseline.

#### Frontmatter Guidelines
- **name**: Concise kebab-case identifier (e.g. `create-skill`, `api-linter`).
- **description**: **MUST include both what the skill does AND explicit triggering contexts.** Write descriptions that are slightly "pushy" to ensure the AI engine doesn't undertrigger. Include relevant keywords, user phrases, and slash command syntax.
- **version**: `"1.0"`
- **last_updated**: `YYYY-MM-DD`

#### Body Guidelines
- Keep under 500 lines. Move large domain docs or extensive reference materials into `references/<topic>.md`.
- Use imperative language ("Check X", "Write Y", "Do NOT execute Z").
- Include clear step-by-step workflows.
- Provide explicit input/output templates and examples.

### Step 4: Write Skill Files

Use `@writer` to write `.agents/skills/<skill-name>/SKILL.md`.

If the skill requires extra resources:
- Create subdirectories (`references/`, `scripts/`, `resources/`) as needed.
- Write supporting documents or scripts into those directories.

### Step 5: Draft Lightweight Evals (Optional & Recommended)

Skills with verifiable outputs (code transforms, file generation, structured reports) benefit from documented test prompts.

Ask the user: *"Would you like to draft 2–3 test evals for this skill?"*

If yes, write `.agents/skills/<skill-name>/evals/evals.json` following `.agents/skills/create-skill/references/evals-schema.md`:

```json
{
  "skill_name": "<skill-name>",
  "evals": [
    {
      "id": 1,
      "prompt": "User prompt testing the skill workflow",
      "expected_output": "Description of expected final state or deliverable",
      "expectations": [
        "The output file contains section X",
        "No syntax errors occur"
      ]
    }
  ]
}
```

### Step 6: Smoke-Test & Trigger Verification

Verify the skill setup:
1. Review the `description` field in frontmatter — does it cover all anticipated user trigger phrases?
2. Perform a dry run or manual walk-through against the drafted test prompts.
3. Validate that `@qa-engineer` (Nina) or `/test` can read and evaluate the skill expectations.

### Step 7: Log the Skill Creation

Append an entry to `artifacts/memory/active-decisions.md`:

```markdown
### [DECISION] Created Skill: <skill-name> [date: YYYY-MM-DD]
**Purpose:** {summary of capability}
**Path:** .agents/skills/<skill-name>/SKILL.md
**Evals:** {yes/no}
```

---

## Anti-patterns

- **Undertriggered descriptions.** Writing vague descriptions like *"How to deploy apps"* instead of *"Deploy and publish web apps. Trigger whenever the user mentions deployment, release, hosting, or shipping to production."*
- **Bloated SKILL.md files.** Packing 1,000+ lines into `SKILL.md` instead of using `references/`.
- **Malicious or unexpected logic.** Skills must adhere to `.agents/GUARDRAILS.md` and principle of least surprise.

---

## Reference Resources

- Template: `.agents/skills/create-skill/references/skill-template.md`
- Evals Schema: `.agents/skills/create-skill/references/evals-schema.md`
