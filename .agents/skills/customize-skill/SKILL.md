---
name: customize-skill
description: Guided flow for customizing an existing Vespyr skill — describe what to change, locate the skill's SKILL.md and support files, apply surgical edits, and verify triggering plus spec compliance. Use this skill whenever you need to modify, adjust, retune, or refine an existing skill's description, trigger phrases, workflow steps, or resources without rebuilding it from scratch. Trigger on "customize the X skill", "tweak this skill", "adjust skill triggering", "fix the skill description", "make the X skill trigger more often", "update the X skill workflow".
metadata:
  version: "1.0"
  last_updated: "2026-08-11"
---

# Customize Skill — Surgical Skill Editing

## What this skill does

Helps you customize an existing Vespyr skill. You describe what feels wrong or what should change, the skill locates the right files (SKILL.md, references/, scripts/, resources/), applies minimal surgical edits, and verifies the skill still passes spec checks and triggers correctly.

## When to use

- "The `/validate-idea` skill doesn't trigger when I say X"
- "This skill's description is too vague, make it pushier"
- "Reorder the workflow steps in `/develop`"
- "The skill should support a new output format"
- "Add a new reference document to `/motion`"

## When NOT to use

- To build a brand-new skill from scratch (use `/create-skill`)
- To change a skill's core purpose or rewrite most of its body (create a new skill with `/create-skill`, or migrate the content deliberately)
- For agent persona or settings changes (use `/customize-agent`)
- For one-off behavior guidance in a single prompt (just instruct the agent in your prompt)

## Prerequisites

- The skill exists under `.agents/skills/<skill-name>/` — this is the single source of truth; there is no per-harness mirror to keep in sync
- You know which skill you want to customize and roughly what should change

---

## Workflow

### Step 1: Capture Intent (Socratic Probes)

Ask the user or extract from context:
1. **Which skill?** (e.g., `/plan`, `/motion`)
2. **What specifically is wrong or missing?** (triggering, description, workflow steps, references, output format)
3. **What should the new behavior be?**
4. **Why this change?**

Example intents:
- *"`/validate-idea` should also fire when I say 'check my concept'"*
- *"The description doesn't mention mobile apps, so it never triggers for them"*
- *"Step 4 and 5 should be swapped — verification should come before writing the file"*

### Step 2: Locate the Skill Files

Inspect the skill directory. `.agents/skills/<skill-name>/` is the only copy — every harness reads it, so there is no mirror to keep in sync and no second file to edit.

```
.agents/skills/<skill-name>/
├── SKILL.md      (required — frontmatter + body)
├── steps/        (router skills: one file per step, each cited by SKILL.md)
├── references/   (docs loaded on demand)
├── scripts/      (helper scripts)
└── resources/    (templates, assets, static data)
```

Verification test cases do **not** live in the skill folder. They are centralized suites under `evals/suites/<group>/<name>.json` and run via `npm run eval` — see `.agents/skills/create-skill/references/evals-schema.md`.

Read the current `SKILL.md` frontmatter and body before editing. Understand the existing structure before touching anything.

### Step 3: Decide What to Edit

| Change | File(s) to edit |
|---|---|
| Triggering behavior | `SKILL.md` frontmatter `description` |
| Workflow steps, tone, guardrails | `SKILL.md` body |
| Large domain content | `references/<topic>.md` (add/update, keep SKILL.md lean) |
| A single workflow step | `steps/step-NN-<name>.md` |
| Deterministic helper logic | `scripts/` |
| Templates/assets | `resources/` |
| Test prompts & expectations | `evals/suites/<group>/<name>.json` (centralized, not per-skill) |

### Step 4: Apply Surgical Edits

- **Triggering first.** The `description` field is the single highest-leverage edit. It MUST include both what the skill does AND explicit triggering contexts — write it slightly "pushy" with relevant keywords and user phrases so the engine doesn't undertrigger. Single line, 1–1024 chars, no `|`/`>` block scalars.
- **Body edits minimal.** Change only the sections relevant to the intent. Keep the file under 500 lines; push large additions into `references/`.
- **Keep conventions.** Preserve the skill's existing structure, headings, and tone. Don't restructure sections that weren't part of the request.
- **One file, one edit.** `.agents/skills/<skill-name>/` is the single source of truth — there is no mirror to propagate to.

### Step 5: Verify

1. Run the spec validator — the skill MUST pass with 0 violations:
   ```bash
   node .agents/scripts/spec_check.js
   ```
   It also checks link integrity: a cited `steps/*.md` must exist, every file in `steps/` must be reachable, and the body must open with an H1. A violation here is a real broken reference, not a style note.
2. Review the `description` — does it cover all anticipated user trigger phrases?
3. If the skill has benchmarks, walk its prompts from the relevant `evals/suites/<group>/<name>.json` against the edited workflow and confirm the suite still loads:
   ```bash
   npm run eval 2>&1 | grep -i "malformed suite"   # expect no output
   ```
4. If you changed a `description`, regenerate the compiled catalog and confirm the diff matches your intent:
   ```bash
   node .agents/scripts/compile_skills.js
   git diff -- .agents/skills/help-me/skills-catalog.json
   ```

### Step 6: Log the Change

Append to `artifacts/memory/active-decisions.md`:

```markdown
### [DECISION] Customized Skill: <skill-name> [date: YYYY-MM-DD]
**Changes:** {summary of what was changed and why}
**Path:** .agents/skills/<skill-name>/SKILL.md
**Trigger impact:** {new/updated trigger phrases}
```

---

## Troubleshooting & Edge Cases

| Issue | Root Cause | Solution |
|---|---|---|
| Skill still doesn't trigger | Description too vague or lacks user phrases | Rewrite description with exact phrases users say; include synonyms and variations |
| Spec check fails | Invalid frontmatter (block scalars, list metadata, wrong top-level keys) | Only `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` allowed; `metadata` values are strings only |
| Spec check reports a phantom step link | The cited filename does not match the file on disk (e.g. `step-06-x.md` cited, `step-05-x.md` exists) | Fix the citation to the real filename. A phantom link makes the agent load nothing and report a false pass. |
| Spec check reports an unreachable step file | A file in `steps/` that no citation path reaches | Cite it from the router, or delete it. A contract nothing loads reads as coverage that does not exist. |
| Skill file too long | Large body edits pushed inline | Move extensive content into `references/<topic>.md` |
| Catalog out of date | `skills-catalog.json` is compiled, not hand-edited | Re-run `node .agents/scripts/compile_skills.js` and review the diff |

---

## Anti-patterns

- **Rewriting the whole skill for one tweak.** Change only what the intent requires.
- **Editing the description without checking trigger phrases.** The description IS the trigger — verify it against real user phrasings.
- **Looking for a mirror to update.** There isn't one. `.agents/skills/` is the single source of truth; hunting for a second copy wastes a step and invites a fabricated edit.
- **Adding tests inside the skill folder.** Benchmarks are centralized in `evals/suites/`; a per-skill `evals/evals.json` is never read by the runner.
- **Skipping validation.** Always run `spec_check.js` after edits.

---

## Output Artifacts

- Updated `SKILL.md` (and any support files) under `.agents/skills/<skill-name>/` — the single source of truth
- `.agents/skills/help-me/skills-catalog.json` regenerated if a `description` changed
- `artifacts/memory/active-decisions.md` (audit log entry)
