# Skill Standards Adoption — Build Plan (v4.1, compliance-only, post-gate)

**Decision:** Adopt the agentskills.io spec for the skill layer — **compliance only**. Vespyr's DNA is orchestration; nothing skills.sh-related is built or published. No standalone machinery, no manifest, no distribution work. Value: **fixes two live help-me catalog bugs and stops frontmatter drift via CI**; harness portability (opencode, Claude Code, Kiro, Cursor) is secondary future insurance — the old form never broke loading today, so the claim is framed accordingly.

**Gate reviews (2nd round, 2026-08-05):** @product-manager + @ml-ai-engineer — both CHANGES REQUESTED (surgical). Incorporated: capabilities list-form trap (B2), indent-aware parser requirement (B1), humanize quoted single-line description (B1/B2), compile_skills `.sort()` + catalog-gate mechanism (B4), audit-count corrections, grill-me body `\n` placeholder fix, mirror concern closed (symlink). Deferred as out-of-scope per user: license-on-all, distribution work, standalone machinery.

**Audit facts (corrected):** 43 skills in `.agents/skills/`. 33 SKILL.md files call `orchestrator_state.js` directly. **Only `delegate` is fully clean.** 23 files carry non-standard keys (`version` ×23, `last_updated` ×22, `capabilities`/`author`/`mode` ×2, `source_file` ×1); list-form `allowed-tools` in `humanize` + `round-table` (humanize has 3 violations: version, folded description, allowed-tools). `.opencode/skills/` is a **symlink** to `.agents/skills/` — mirror reconciliation is a non-issue (closed).

---

## Build Items

### B1. Spec validator — `spec_check.js` (new, `.agents/scripts/`)

Standalone Node script, **zero deps** (package.json has none; npm ships raw), **node-18 compatible** (CI matrix runs 18/20/22), **zero side effects** (no file writes — it runs alongside compile_skills.js in CI).

**Parser:** indent-aware scanner (NOT compile_skills.js's parser — that promotes nested `metadata:` keys to top level and would false-red ~24 files). Top-level key scan skips whitespace-indented lines; the `metadata:` block is collected separately and each entry must be `key: scalar-string`. Fixtures: migrated grill-me passes; nested map/list/block-scalar under `metadata:` fails.

**Rules (fail = exit 1):**
- Frontmatter parses; body non-empty
- Allowed keys only: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`
- `name` == parent dir name, matches `^[a-z0-9]+(-[a-z0-9]+)*$` (ASCII kebab — stricter than spec's unicode-alnum, all 43 pass), ≤ 64 chars
- `description` 1–1024 chars, non-empty, **no block scalars (`|`/`>`)** — compile_skills.js truncates folded values, so the gate rejects them to stay consistent forever
- `compatibility` 1–500 chars **when present** (reject empty)
- `allowed-tools` is a space-separated string (reject YAML list form; spaces/pipes inside are valid)
- `metadata` values are strings (reject nested maps/lists)
- **Reject block scalars on `description`/`compatibility`/`license`/`allowed-tools` and unquoted `: ` in single-line values** (prevents YAML syntax bombs real harnesses reject — e.g. humanize's description contains `patterns including: inflated symbolism`)

**Warnings (exit 0):** SKILL.md body > 500 lines; description < 40 chars.

**Acceptance:** `node .agents/scripts/spec_check.js` → 0 violations across all 43 skills, warnings listed.

### B2. Frontmatter migration pass (edit 24 files)

- Move `version`, `last_updated`, `capabilities`, `author`, `mode` → `metadata:` map; **stringify list values** (`capabilities` in craft-lesson + teach-me → comma-joined single-line string; moving them as lists would fail B1's string-values rule)
- Metadata keys: plain `version` / `last_updated` (map keys are local to the skill; no namespace prefix needed)
- `humanize`: keep `license: MIT`, move `source_file` → `metadata:`; **rewrite folded `description: |` as a single-line QUOTED string** (inner quotes escaped/dropped; ~410 chars ≤1024); convert `allowed-tools` list → string
- `round-table`: convert `allowed-tools` list → string
- **`compile_skills.js`: add `.sort()` to its `readdirSync` result** (CI flake risk: ubuntu readdir order is not guaranteed alphabetical)
- **`grill-me`: restore the active-decisions entry template at Step 3** (SKILL.md:102 has a literal `\n` placeholder — the flagship skill currently doesn't tell agents the entry format)
- No `license` field changes elsewhere (spec-optional; repo MIT covers distribution)
- Regenerate `skills-catalog.json`; verify: humanize description no longer truncated, grill-me shows new description

**Acceptance:** B1 reports 0 violations; catalog regenerated and consistent (no `\n` in catalog descriptions).

### B3. Authoring path — update `/create-skill`

- `create-skill/references/skill-template.md`: replace `version` / `last_updated` frontmatter with spec fields (`name`, `description`, optional `metadata:` with version/last_updated inside)
- `create-skill/SKILL.md`: update frontmatter documentation (lines ~35, 73–74) to spec form; add a step: new skills must pass `node .agents/scripts/spec_check.js`
- `evals-schema.md`: verified no SKILL.md frontmatter examples — **no-op, skip**

**Acceptance:** A skill scaffolded via `/create-skill` passes B1 on first run.

### B4. CI gate — `.github/workflows/skills-spec.yml`

On PR to main, in order:
1. `node .agents/scripts/spec_check.js` (all 43) — runs FIRST, before compile
2. Stale-catalog gate: `node .agents/scripts/compile_skills.js && git diff --exit-code -- .agents/skills/help-me/skills-catalog.json` (compile always writes; the diff is the check)

**Acceptance:** Green on test PR with intentional violation (red) and clean change (green).

### B5. Docs (blocked on user approval per doc protocol)

- Optional single note in AGENTS.md / README: skills follow the agentskills.io spec and are CI-validated
- No install instructions, no distribution copy

---

## Sequencing

```
B1 (validator) → B2 (migration → green) → B3 (create-skill) → B4 (CI) → B5 (docs, on approval)
```

Estimated total: ~1 day (0.75–1.25). No risky items — all mechanical, verified traps pre-empted.

## Out of scope (deliberately)

- skills.sh / packs / per-skill installs — anything distribution-facing (rejected; orchestration DNA)
- Standalone machinery: portable manifest, guarded hooks, bundling, compatibility strings
- Standalone evals / smoke tests
- `.opencode/skills` mirror reconciliation — **closed**: it is a symlink to `.agents/skills/`

---

## Completion Checklist

**02e status: COMPLETE.**

- [x] B1: `spec_check.js` validator implemented and passes across all skills
- [x] B2: Frontmatter migration pass completed across all skill files
- [x] B3: Authoring template updated in `/create-skill`
- [x] B4: CI gate and catalog compilation verification
- [x] B5: Documentation aligned with agentskills.io standard

---

## Sign-Off

**@product-manager (Sarah):** APPROVED — SATISFIED (2026-08-05). Scope: skill standards adoption and catalog consistency.  
**@ml-ai-engineer (Kai):** APPROVED — SATISFIED (2026-08-05). Scope: agentskills.io compliance, clean parsing, and catalog regression prevention.  
**@devops-engineer (Axel):** APPROVED — SATISFIED (2026-08-05). Scope: CI automation and spec_check.js validation in GitHub workflows.
