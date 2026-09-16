# Review 08 — Documentation Tidy & Private Workspace Isolation Plan

**Date:** 2026-09-10 (Revised 2026-09-11 r2 — review blockers closed, empirically verified)  
**Status:** REVISED r2 (Phase 0.1 landed and proven; 0.2–0.5 specified, not yet executed)  
**Target:** `lalulali/vespyr`  
**Scope:** `Guide/`, `artifacts/`, `evals/`, `security/`, `tests/`, `tools/`, `.gitignore`, `package.json`, `.npmignore`

---

## 1. Executive Summary & Objective

The objective is to establish an impenetrable boundary between **public user-facing materials**, **published npm runtime packages**, and **private internal strategy & agent runtime artifacts**.

- **Public Users / Forkers / Cloners** must only see standard open-source documentation (`docs/guide/`, architecture primers, license, README) and working engine code. They must have zero visibility into proprietary roadmaps, company development plans, internal reviews, or runtime agent memory.
- **npm Consumers** (`npm install vespyr` / `npx vespyr init` / `npx vespyr-eval`) must receive only the lean runtime engine, CLI entrypoints, audit specifications, and benchmark definitions necessary to operate. Internal tests and exploit payloads must never ship in the npm tarball.
- **Project Owner (Chris)** must maintain full version control, automated persistence, and private cloud backup of all internal strategy, review logs, agent context, and sprint deliverables without risking accidental public exposure.
- **Repository Integrity (GitHub Stars & Metadata):** All cleanup and history-filtering procedures must preserve the GitHub repository identity, commit continuity, issues, discussions, and the project's **8 GitHub stars**.
- **Contributors & CI:** a fresh clone, a fork, and GitHub Actions must keep `npm test` green. The boundary may not convert enforcement into silent skips — every contract that can no longer be checked in public must be relocated (Phase 0), not dropped.

---

## 2. Leak Audit & Problem Statement

Git enforces access control exclusively at the repository boundary. It provides **no object-level, branch-level, or directory-level access control within a single repository**. 

A security and repository audit finds **65 tracked files under `artifacts/`** (61 `docs/`, 3 roundtable transcripts, 1 test PRD) across **89 commits** in `main` history, all publicly reachable:

| Path | Current State | Risk / Defect |
| :--- | :--- | :--- |
| `artifacts/docs/strategy/` | **Tracked in Git (Public)** | **CRITICAL LEAK:** Master roadmaps, 50 strategy/development-plan files (Phase 0 to Phase 8), framework comparisons, and risk registers are publicly visible to anyone cloning or forking `vespyr`. |
| `artifacts/docs/review/` | **Tracked in Git (Public)** | **LEAK:** Internal audits, security defect registers, and verification logs are publicly visible. |
| `artifacts/docs/defects/` + `artifacts/test-prd.md` | **Tracked in Git (Public)** | **LEAK:** Harness defect register and test PRD are publicly visible. |
| `artifacts/docs/decisions/` + `artifacts/docs/architecture/` | **Tracked in Git (Public)** | **LEAK (small):** 1 internal ADR + 1 architecture note committed (missed by the first audit pass). |
| `evals/security/corpus/baseline-repo-2026-08-{23,25}.json` | **Tracked in Git (Public)** | **LEAK (content copy):** 94 + 102 frozen findings whose `path`/`detail` fields quote internal review/strategy lines (incl. internal P0/P1 titles) and **44 absolute owner paths each**. Purging `artifacts/` does **not** remove these. |
| `artifacts/evals/roundtable/transcripts/` | **Tracked in Git (Public)** | **LEAK:** 3 internal discussion transcripts and agent debate logs on unreleased plans are committed. |
| `Guide/` (`en/`, `cn/`) | Tracked in Git (Public) | Cosmetic hygiene only (not a security defect). Open-source convention expects user documentation under `docs/`. |
| `.gitignore` | Inconsistent coverage | Ignores `artifacts/telemetry/`, `artifacts/memory/`, `artifacts/output/`, and roundtable `runs/`/`telemetry/`, but leaves `artifacts/docs/` and `artifacts/evals/roundtable/transcripts/` exposed. |

> [!WARNING]
> **The Git Invariant:** Adding `artifacts/docs/` to `.gitignore` while it is already tracked will **not** remove it from Git. Tracked files ignore `.gitignore` rules until explicitly untracked with `git rm --cached`. Furthermore, existing files remain visible in the repository's past commit history across dozens of historical commits until purged.

> [!CAUTION]
> **Purge scope — a directory filter is not a content filter.** `git filter-repo --path artifacts` removes the *directory*; it does nothing about content copies of that directory living under other paths. The first audit pass (§2) only enumerated tracked files *inside* `artifacts/`, which is why the corpus baselines above were missed. Phase 0.3 closes this with an explicit sweep and re-freeze.

---

## 3. Target Architecture: The Public-Private Boundary

```mermaid
flowchart TD
    subgraph PublicRepo ["Public Repository: lalulali/vespyr"]
        direction TB
        RootCode["Engine Code (bin/, tools/, .agents/, tests/, security/)"]
        PublicDocs["docs/ (Standardized User Documentation)"]
        PublicDocs --> GuideEn["guide/en/ (Getting Started, Skills, Reference)"]
        PublicDocs --> GuideCn["guide/cn/ (Chinese Translation)"]
        PublicDocs --> PubArch["architecture/ (Engine design, Public ADRs)"]
        PublicEvals["evals/ (Public Benchmarks & Rubrics)"]
        GitIgnore[".gitignore (Rule: artifacts/)"]
    end

    subgraph PrivateStorage ["Private GitHub Repo: lalulali/vespyr-artifacts"]
        direction TB
        PrivDocs["docs/"]
        PrivDocs --> Strat["strategy/ (Roadmaps, 01-10 Dev Plans)"]
        PrivDocs --> Rev["review/ (Internal Audits & Reviews)"]
        PrivDocs --> Def["defects/ (Harness Defect Registers)"]
        PrivMem["memory/ (project-context.md, active-decisions.md)"]
        PrivOut["output/ (Sprint deliverables, discovery, design specs)"]
        PrivEvals["evals/ (Roundtable transcripts, run logs)"]
        PrivTelem["telemetry/ (Traces, spans)"]
    end

    subgraph NpmTarball ["Published npm Package (node_modules/vespyr)"]
        direction TB
        NpmBin["bin/ (cli.js, vespyr-eval.js)"]
        NpmAgents[".agents/ (personas, skills, runtime scripts)"]
        NpmTools["tools/ (eval runner, judges, telemetry)"]
        NpmSec["security/ (audit-spec.json, supply-chain-spec.md)"]
        NpmEvals["evals/ (suites, rubrics, fixtures, baseline)"]
    end

    subgraph UserProject ["End-User Project (after npx vespyr init)"]
        direction TB
        URoot[".agents/ + artifacts/ + harness configs"]
        UNo["ZERO evals/ | ZERO tests/ | ZERO tools/ | ZERO security/"]
    end

    Owner["Chris (Owner)"] -->|Push / Pull Code| PublicRepo
    Owner -->|Push / Pull Artifacts via Nested Git| PrivateStorage

    PublicForker["Public User (Fork / Clone)"] -->|Clones| PublicRepo
    PublicForker -.->|BLOCKED (Directory completely ignored)| PrivateStorage

    PublicRepo -->|npm publish (filtered by .npmignore)| NpmTarball
    NpmTarball -->|npx vespyr init| UserProject
```

---

## 4. Subsystem Audit: `tools/`, `tests/`, `security/`, and `evals/`

### 4.1 Subsystem Classification & Distribution

Each root directory serves a distinct role across Git, CI, and npm distribution:

| Subsystem | GitHub Visibility | npm Tarball | Purpose & Distribution Rationale |
| :--- | :--- | :--- | :--- |
| **`tools/`** | **Public** | **Required (100%)** | Runtime engine for evaluation (`tools/eval/runner.js`, judges, AST biomarkers) and telemetry (`tools/telemetry/modelTierGuards.js`). Without this, `npx vespyr-eval` crashes with `MODULE_NOT_FOUND`. |
| **`tests/`** | **Public** | **Excluded (0%)** | 40 unit, CLI, and integration test files (179 test cases). Public on GitHub for CI and contributors; excluded from npm via `.npmignore:2` to minimize package bloat. |
| **`security/`** | **Public** | **Required (100%)** | Machine-readable supply chain specification (`security/audit-spec.json`) read by `.agents/scripts/security-scan.js`. Verified in npm by `tests/cli/packaging.test.js:52`. |
| **`evals/`** *(Root)* | **Public** | **Split** (see breakdown) | Standard benchmark definitions, rubrics, and mock fixtures ship in npm; exploit payloads and internal dev transcripts are strictly banned from npm. |
| **`artifacts/evals/`** | **PRIVATE** | **Excluded (100%)** | Live transcripts of proprietary agent debates on unreleased strategy (`gate-review-02n-reverse-prd_native_1.md`). Must be moved to the private `artifacts/` workspace. |

### 4.2 Detailed Breakdown of `evals/`

```
evals/
├── suites/             # Core benchmark definitions (agents, skills, invariants)  --> PUBLIC & SHIPPED in npm
├── rubrics/            # Checklist evaluation rubrics for Tier-1 judge            --> PUBLIC & SHIPPED in npm
├── fixtures/           # Mock inputs for offline deterministic testing           --> PUBLIC & SHIPPED in npm
├── mock-baseline.json  # Reference benchmark scores for `vespyr-eval diff`       --> PUBLIC & SHIPPED in npm
├── meta-eval/          # Evaluation calibration & gold standards                 --> PUBLIC & SHIPPED in npm
├── roundtable/         # topics.json (SHIPPED) | fixtures/ & transcripts (EXCLUDED)
└── security/           # Attack corpus (malware scripts, prompt injections)      --> PUBLIC in Git | BANNED from npm
```

1. **Why `evals/security/` is BANNED from npm:**  
   `evals/security/corpus/positive/` contains actual shell exploits (`beacon-1.sh`), malicious git hooks, prompt injections (`inj-prompt.md`), and path traversal samples. Shipping malware fixtures in an npm package triggers automated npm registry scanners, antivirus flags (ClamAV, Windows Defender), and developer security firewalls. This exclusion is enforced by `evals/.npmignore:1` and verified by `tests/cli/packaging.test.js:75-77`.
2. **Why `evals/suites/` and `evals/rubrics/` are REQUIRED in npm:**  
   When a user runs `npx vespyr-eval run --suite agents/core-swarm`, the CLI reads `evals/suites/agents/core-swarm.json` and loads checklist rubrics from `evals/rubrics/`. If these are omitted, the standalone eval CLI cannot function.

### 4.3 Installation Topology & Execution Model

**Are `evals/`, `tests/`, `tools/`, and `security/` placed in the user's project root when they install Vespyr?**

**Answer: NO.**
They reside at the root of the **Vespyr Engine Source Repository** (for framework development and monorepo CI), but they are **never created or copied into the end-user's project root**.

| Directory | In Vespyr Source Repo? | In npm Tarball (`node_modules/vespyr`)? | In End-User's Project Root? |
| :--- | :--- | :--- | :--- |
| **`tests/`** | **Yes** (root) | **NO (0%)** — Excluded by `.npmignore` | **NEVER** |
| **`tools/`** | **Yes** (root) | **Yes** (internal CLI dependency) | **NEVER** (stays inside `node_modules`) |
| **`evals/`** | **Yes** (root) | **Yes** (benchmark definitions) | **NEVER** (stays inside `node_modules`) |
| **`security/`** | **Yes** (root) | **Yes** (audit specification) | **NEVER** (stays inside `node_modules`) |
| **`.agents/`** | **Yes** (root) | **Yes** (template source) | **YES** (copied into user project) |
| **`artifacts/`** | **Yes** (private) | **NO (0%)** — Excluded by `.npmignore` | **YES** (fresh scaffolded empty for user) |

#### How Security Works Without Polluting the User's Root

When an end-user runs `npx vespyr audit`:
1. `bin/cli.js:1624-1653` resolves the scanner script and the specification from its own bundled directory inside `node_modules/vespyr/`:
   ```js
   const scanScript = path.join(__dirname, "..", ".agents", "scripts", "security-scan.js");
   const defaultSpec = path.join(__dirname, "..", "security", "audit-spec.json");
   ```
2. The scanner executes from within the package directory and scans the user's project directory (`--dir <user-project>`) from the outside.
3. This architecture yields two vital advantages:
   - **Zero Workspace Clutter:** The user's project root remains clean and contains only their project code, `.agents/`, and `artifacts/`.
   - **Tamper Resistance:** `security/audit-spec.json` sits in read-only package space, preventing LLM edits or rogue repository contributors from silently weakening or disabling audit rules.
4. If an enterprise team requires custom security policies, they can supply their own file via `--spec <path/to/custom-spec.json>`.

#### The 3 Active Security Layers in User Workspaces

| Security Layer | Where It Runs | Protection Provided |
| :--- | :--- | :--- |
| **1. CLI Scanner (`vespyr audit`)** | CI / Manual invocation | Scans the user's project against `security/audit-spec.json` for prompt injections (`INJ-PROMPT`), secret leaks (`INJ-SECRET`), path traversal (`INJ-PATH`), and malicious git hooks (`BEACON-1`). |
| **2. Runtime Sanitizer (`memory_write.js`)** | Active during all agent sessions | Located in `.agents/scripts/memory_write.js`. Automatically scrubs API keys (`sk-`, `sk-proj-`) and sanitizes injection patterns before writing to persistent memory. |
| **3. Agent Persona (`@security-engineer`)** | Active during product lifecycle | Victor (`.agents/agents/security-engineer.md`) executes threat modeling, architectural review, and outputs reports to `artifacts/output/04-architecture/security/`. |

---

## 5. Work Breakdown & Execution Phases

### Phase 0: Preconditions (blocking — no purge step runs until 0.1–0.5 are green)

**0.1 — `npm test` must pass without `artifacts/` (LANDED 2026-09-11).** Two test files read owner-only dev-plan docs by absolute repo path and failed on every fresh clone, fork, and CI checkout — i.e. the purge as originally written would have turned `main` permanently red:
- `tests/test_plan_reservation.test.js:13-18` → `.agents/scripts/check_plan_reservation.js:24-27` exits 1 when `artifacts/docs/strategy/development-plan` is missing.
- `tests/test_schema_single_owner.test.js:20-46` → 3 subtests read `04/04a/04b-*.md`.

Both now take an explicit `skip(private workspace absent …)` path when those files are absent, and run unskipped when they are present (no tautology, no silent pass). Precedent already in-repo: `.agents/scripts/test_security_suite.js:170-178` isolates `artifacts/memory` for exactly this reason after CI run 32825787864.

**Evidence — both states re-run 2026-09-11:**

| State | Result |
| :--- | :--- |
| Working repo with `artifacts/` | 467 tests · 467 pass · **0 fail** · 0 skipped |
| Clone with `artifacts/` removed (= post-purge, CI, fork) | 467 tests · 463 pass · **0 fail** · skips: plan-registry, 3 × schema-contract, pre-existing install-smoke |

**0.2 — Relocate the coverage that 0.1 trades away.** 0.1 removes red CI at the cost of CI verification. The private repo `lalulali/vespyr-artifacts` MUST run, on every push: `check_plan_reservation.js` plus the three `04/04a/04b` single-owner assertions (copied into the private repo's own test file). Without this, the 02l and 02o.5 contracts lose machine enforcement permanently — accepted debt, recorded, not silent.

**0.3 — Residual-copy sweep + baseline re-freeze.** Two signals, two bars:

```bash
# (a) BLOCKING — content copies of private material (owner absolute paths, quoted internal text).
#     Baseline 2026-09-11 (pre-freeze): 2 files, 44 matching lines each. Target: 0 files.
git grep -Inc -e 'christianhadianto' -e 'TechSmith' -- . ':(exclude)artifacts'

# (b) INFORMATIONAL — legitimate repo-path references to `artifacts/docs` (docs, scripts, skill
#     bodies, changelog). Reviewed, not required to be zero: 10 files at baseline 2026-09-11.
git grep -Iln -e 'artifacts/docs' -- . ':(exclude)artifacts'
```

Signal (a) is confined to `evals/security/corpus/baseline-repo-2026-08-{23,25}.json` (44 matching lines each). Signal (b) covers the two baselines plus `.agents/GUARDRAILS.md`, `.agents/agents/product-manager.md`, `.agents/references/roster-router.json`, `.agents/references/utter-satisfaction.md`, `.agents/scripts/check_plan_reservation.js`, `.agents/skills/round-table/SKILL.md`, `CHANGELOG.md`, `security/supply-chain-audit-spec.md` — path references, not content, and they survive the boundary intact. After the purge: regenerate the frozen baseline from the cleaned tree **with the same scanner + spec** (keep `scanner_sha256_prefix` / `spec_sha256_prefix` byte-identical so the drift gate stays meaningful), update the default path in `.agents/scripts/check_new_findings.js:30`, then commit both the new baseline and the removal of the two stale ones as one human-reviewed commit. Absolute owner paths are recorded repo-relative from now on. Pre-freeze snapshots remain in Git history unless they are folded into the rewrite (`--replace-text`) — decide and record which.

**0.4 — Prevent regrowth.** Add one boundary-guard test: fail if any tracked path *outside* `artifacts/` matches internal-only patterns (`development-plan`, `defects/`, `roundtable/transcripts`, `0\d[a-z]?-phase-`). Acceptance: fails on a staged probe file, passes on the clean tree. Without this, the boundary is a one-time cleanup, not a boundary.

**0.5 — Doc-reference sweep + CI trigger cleanup.** Five tracked files carry `guide/en` / `guide/cn`: `AGENTS.md:252-253`, `CLAUDE.md:252-253`, `agent.md:252-253`, `.agents/templates/system/AGENTS.md.canonical:252-253`, `.agents/templates/system/agent.md.canonical:252-253` — update all five in lockstep with the move (the `.canonical` pair is asserted by `tests/vespyr-dna.test.js:20-21`). Also delete the dead `artifacts/**` entry from `.github/workflows/swarm-tests.yml:8,16`.

**Pre-flight assertions (any failure aborts Step 3):**
```bash
git -C artifacts status --porcelain    # empty — everything committed to the private repo
git -C artifacts ls-files | wc -l      # ≥ 65 + any working docs (e.g. this plan)
```
This plan file is currently **untracked**: it survives `git filter-repo`'s hard reset but **not** Step 5's `rm -rf artifacts/`. It is recoverable only if Step 2's `git add .` captured it.

### Phase 1: Tidy Public Documentation Surface (cosmetic hygiene — unrelated to the security boundary)
1. **Normalize documentation directory** (`git mv` to preserve history):
   - Move `Guide/en/` $\rightarrow$ `docs/guide/en/`
   - Move `Guide/cn/` $\rightarrow$ `docs/guide/cn/`
   - Remove legacy empty `Guide/` folder.
2. **Establish public architecture folder** (net-new authoring — size before execution):
   - Publish exactly two files: `docs/architecture/overview.md` (high-level engine design) and `docs/architecture/adr/index.md` (public ADR index).
   - Allowlist rule: no ADR is copied public unless explicitly listed in the index. Internal ADRs stay private under `artifacts/docs/decisions/`.
3. **Repoint public links** — the *markdown link* surface is exactly 12 links (verified line-by-line):
   - `README.md`: lines 10, 56, 107, 120, 143, 144.
   - `README_CN.md`: lines 10, 58, 109, 122, 145, 146.
   - Not links, but stale after the move: 5 further files enumerate `guide/en` / `guide/cn` — handled in **Phase 0.5**, not here.
   - `CHANGELOG.md:230` references `Guide/` historically — do **not** rewrite it.

### Phase 2: Consolidate & Isolate Private Workspace
1. **Preserve engine compatibility:**
   - Keep `artifacts/` as the local folder name so zero agent scripts, tools, or memory controllers need breaking path changes.
2. **Ensure all private files reside within `artifacts/`:**
   - `artifacts/docs/strategy/`
   - `artifacts/docs/review/`
   - `artifacts/docs/defects/`
   - `artifacts/memory/`
   - `artifacts/output/`
   - `artifacts/evals/` (moves private roundtable transcripts here)
   - `artifacts/telemetry/`
3. **Enforce blanket `.gitignore` rule:**
   Replace the five granular `artifacts/*` entries in root `.gitignore` (current lines 13-17) with a single blanket rule:
   ```gitignore
   # ==========================================
   # Private Workspace (Owner-only & AI runtime)
   # ==========================================
   artifacts/
   ```
4. **Operational hazards to document:**
   - `git clean -fdx` in the parent repo deletes the entire ignored `artifacts/` workspace. Restore with `git clone git@github.com:lalulali/vespyr-artifacts.git artifacts`.
   - A fresh parent clone never contains `artifacts/`; the private clone is the restore path on any new machine.
   - `worktree.js create` will no longer populate `artifacts/docs` in a new worktree — only `artifacts/memory` and `artifacts/telemetry` are symlinked (`.agents/scripts/worktree.js:110-123`). Internal docs are unavailable inside worktrees; read them from the primary checkout.

### Phase 3: Setup Private Remote Backup (Nested Repo Pattern)
To ensure internal strategy and AI memory are backed up to GitHub under exclusive access:

1. Create a **private** repository on GitHub: `lalulali/vespyr-artifacts` (via GitHub web UI or `gh repo create lalulali/vespyr-artifacts --private`).
2. Initialize and configure the nested Git repository inside `artifacts/`:
   ```bash
   cd /Users/christianhadianto/Documents/TechSmith/vespyr/artifacts
   git init
   git branch -M main
   git remote add origin git@github.com:lalulali/vespyr-artifacts.git
   printf ".DS_Store\n**/.DS_Store\n" > .gitignore
   git add .
   git commit -m "feat: initial private artifacts sync"
   git push -u origin main
   ```
3. Because `artifacts/` is in the parent `.gitignore`, Git treats `artifacts/.git` as completely invisible. No submodule pointer or URL leaks to the public repository.
4. The private push (Phase 3) must complete **before** the Phase 5 history rewrite; it is the zero-loss restore source for Step 5.

### Phase 4: Enforce Packaging & Distribution Guardrails
1. **Verify `package.json` `"files"` array:**
   ```json
   "files": [
     "bin/",
     ".agents/",
     "tools/",
     "evals/",
     "security/"
   ]
   ```
2. **Verify root `.npmignore`:** Ensures `tests/`, `artifacts/`, and `.github/` are never packed.
3. **Verify `evals/.npmignore`:** Ensures `evals/security/` (attack corpus) and `evals/roundtable/fixtures/` are never packed.
4. **Run packaging validation suite:**
   ```bash
   node tests/cli/packaging.test.js
   ```

### Phase 5: Complete History Scrubbing & Zero-Loss Restoration Protocol

To eliminate `artifacts/` from `main` and the stale branches on GitHub (hidden PR refs are accepted as a documented exception — §5.5) while **guaranteeing the safety of the repository's 8 GitHub stars**, the following protocol governs the history rewrite.

#### 5.1 The GitHub Stars & Metadata Invariant
- **Stars belong to the repository URL / object (`lalulali/vespyr`)**, **NOT to Git commit hashes.**
- Rewriting Git history and force-pushing `main` **does not affect stars, watchers, issue tickets, discussions, or releases**.
- **Branch invariant:** stale branches `2.0` and `2.1` carry 37 artifact-bearing commits each and are **0 commits ahead of `main`** (fully contained), so they are deleted in Step 6. Purging only `main` would leave the leak reachable via a default `git clone`.
- Option 2 (deleting and recreating the repository) is strictly **REJECTED** to preserve project stars and community trust.

#### 5.2 Risk & Mitigation Matrix

| Risk | Consequence | Mitigation Protocol |
| :--- | :--- | :--- |
| **1. Local `artifacts/` Deletion** | `git-filter-repo` deletes targeted paths from disk. Ignored/untracked siblings (`memory/`, `output/`, `telemetry/`) survive, so a raw `cp -r` restore would nest as `artifacts/artifacts/`. | **Pre-flight backup** (Step 1) plus **Step 5 restore via `rm -rf artifacts && git clone <private-repo>`** — never `cp -r` into a populated directory. |
| **2. Commit SHA Mutation** | Every past commit hash changes (e.g., `1eed88a` $\rightarrow$ new SHA). Dates and messages stay identical. | Accepted. Essential for cryptographic removal of the leaked blobs. |
| **3. Stale Branch Leak** | `2.0` and `2.1` (37 artifact commits each) remain on `origin` if only `main` is force-pushed → still reachable by `git clone`. | Verified fully contained in `main` (0 commits ahead) → delete after force-push: `git push origin --delete 2.0 2.1`. |
| **4. Fork & Clone Persistence** | Prior clones/mirrors retain the leaked objects permanently; GitHub does not purge them on force-push. **Verified: 0 forks exist**, so no fork-network residual. | Accepted by owner (see §5.5). Prior anonymous clones and web snapshots are irrevocable. |
| **5. GitHub Commit Caching** | Old commit SHAs may stay reachable on GitHub's CDN until garbage collection. | Blobs vanish from branch trees and default clones immediately; direct-SHA reachability is **not** guaranteed to end at push time. |
| **6. Workspace Data Loss** | `git clean -fdx` or a fresh parent clone silently removes the entire ignored `artifacts/` workspace. | Private clone is the canonical restore path; `git clean` is banned in the workspace root (documented in Phase 2.4). |
| **7. Merged PR Hidden Refs** | GitHub preserves `refs/pull/1/head` (`0fc42e3…`, tip of deleted branch `2.1`). Objects reachable from it are never garbage-collected, so the artifacts tree stays browsable/fetchable from the public parent repo (verified live: contents API returns 9 entries at that SHA). | **Accepted as documented exception (Option B, §5.5).** Branch deletion does not remove it and it is never GC'd. Optional mitigation: GitHub Support sensitive-data purge if the exposure posture changes. |

#### 5.3 Indestructible Rollback Guarantee (10-Second Recovery)
Before running any filter commands, an offline safety clone is created at `/Users/christianhadianto/Documents/TechSmith/vespyr-safety-backup`. 

If `git-filter-repo` produces any undesired state or test regression, running:
```bash
cd /Users/christianhadianto/Documents/TechSmith/vespyr-safety-backup
git push origin main --force
```
instantly restores the remote repository's `main` back to its prior reachable state (stale branches were never modified by the rewrite). The backup is a raw `cp -r` taken before the nested repo is initialized, so it restores file content only — not the private-repo wiring. For a full local rollback, also `rm -rf vespyr && cp -r vespyr-safety-backup vespyr`.

**Data-loss window (r2):** `git-filter-repo` hard-resets the tree and discards **uncommitted changes to tracked files**. Anything in flight must be committed *and pushed to the private repo* (Step 2) before Step 3, or the backup itself predates those edits. The backup is only a rollback for state that existed when it was taken.

#### 5.4 The 7-Step Safe Execution Blueprint

```mermaid
sequenceDiagram
    autonumber
    actor Chris as Owner (Chris)
    participant Local as vespyr (Local)
    participant Backup as vespyr-safety-backup (Offline)
    participant PrivRepo as lalulali/vespyr-artifacts (Private)
    participant PubRepo as lalulali/vespyr (Public GitHub)

    Chris->>Backup: Step 1: cp -r vespyr vespyr-safety-backup
    Chris->>PrivRepo: Step 2: cd artifacts && git push to private repo
    Chris->>Local: Step 3: filter-repo in scratch clone /tmp/vespyr-purge (no --force)
    Chris->>Local: Step 4: Scratch-clone gate: 0 artifact refs + run-all 0 fail
    PrivRepo->>Local: Step 5: rm -rf artifacts && git clone private repo + .gitignore
    Chris->>PubRepo: Step 6: force-push main + delete stale branches 2.0/2.1
    Chris->>PubRepo: Step 7: verify refs + record PR #1 exception
    Note over PubRepo: 8 Stars Preserved; main+branches clean; PR #1 exception recorded
```

1. **Step 1: Create Full Safety Backup Outside Workspace**
   ```bash
   cp -r /Users/christianhadianto/Documents/TechSmith/vespyr /Users/christianhadianto/Documents/TechSmith/vespyr-safety-backup
   ```
2. **Step 2: Initialize & Push `artifacts/` to Private GitHub Repository**
   ```bash
   cd /Users/christianhadianto/Documents/TechSmith/vespyr/artifacts
   git init
   git branch -M main
   git remote add origin git@github.com:lalulali/vespyr-artifacts.git
   printf ".DS_Store\n**/.DS_Store\n" > .gitignore
   git add .
   git commit -m "feat: initial private artifacts sync"
   git push -u origin main
   ```
3. **Step 3: Run `git-filter-repo` in a Scratch Clone — never in the working repo**
   ```bash
   brew install git-filter-repo
   git clone --no-local /Users/christianhadianto/Documents/TechSmith/vespyr /tmp/vespyr-purge
   cd /tmp/vespyr-purge
   git filter-repo --path artifacts --invert-paths   # fresh clone → --force not needed
   ```
   Why not in place: filter-repo's fresh-clone check exists "to prevent accidental data loss from rewriting local history that doesn't exist anywhere else", and `--force` is the flag that bypasses it — in the same tree that holds the owner's uncommitted work. A scratch clone also removes the Step 3/5 ordering hazard (the hard reset deletes the tracked `artifacts/` files while the nested private repo — initialized at Step 2 — is mid-sync and briefly shows ~65 deletions).
4. **Step 4: Verify in the Scratch Clone, Before Pushing**
   ```bash
   cd /tmp/vespyr-purge
   git log --all --oneline -- artifacts/   # 0 lines — no artifact path in any local ref
   node tests/run-all.js                   # MUST report 0 fail
   ```
   This tree has no `artifacts/`, so it *is* the post-purge gate — the same state CI and every fork will see. Do **not** run this gate in the working repo: `artifacts/` is still present there, so `npm test` passes even when the purge is broken (the false green that hid Phase 0.1).
5. **Step 5: Restore `artifacts/` from the Private Remote & Enforce `.gitignore`**
   ```bash
   cd /Users/christianhadianto/Documents/TechSmith/vespyr
   rm -rf artifacts
   git clone git@github.com:lalulali/vespyr-artifacts.git artifacts

   # Replace the granular artifacts/* ignore entries with the blanket rule:
   # remove artifacts/telemetry, artifacts/memory, artifacts/output,
   # artifacts/evals/roundtable/runs, artifacts/evals/roundtable/telemetry
   # and add "artifacts/" under the Private Workspace section.
   git add .gitignore
   git commit -m "chore: ignore private artifacts workspace"
   ```
   The safety backup remains at `vespyr-safety-backup` until Steps 6-7 are verified. It is never used for the working-tree restore because it predates the nested repo initialization.
6. **Step 6: Reconnect Origin from the Scratch Clone, Force-Push `main`, Delete Stale Branches**
   ```bash
   cd /tmp/vespyr-purge
   git remote add origin git@github.com:lalulali/vespyr.git
   git push origin main --force
   git push origin --delete 2.0 2.1   # both branches: 0 commits ahead of main
   ```
   Then re-point the working repo at the purged history — **after** Step 5's restore, and only once its own work is committed: `git fetch origin && git reset --hard origin/main` (discards uncommitted tracked changes).
7. **Step 7: Verify the Ref Surface & Record the PR-Ref Exception**
   ```bash
   # Expect refs/heads/main (+HEAD); refs/pull/1/head is the documented exception:
   git ls-remote origin

   # Expect refs/pull/1/head only — accepted exception (see §5.5):
   git ls-remote origin 'refs/pull/*'
   ```
   Record in §5.5 that PR #1 remains reachable. Optional future path: execute Option A (GitHub Support purge); then the following must return 404:
   ```bash
   gh api "repos/lalulali/vespyr/contents/artifacts/docs/strategy?ref=0fc42e32a5741621440f3140b0a6fb5bc5e861ad"
   ```

#### 5.5 Residual Exposure & Future Fork Isolation Guarantee — Decision Recorded (2026-09-11)

**Decisions accepted by owner:**
1. **GitHub Object Cache:** Wait for GitHub to naturally remove its internal object cache over its standard garbage-collection cycle. Prior clones and external mirrors are acknowledged and ignored as irrevocable. **Verified: 0 forks exist today** (`gh api repos/lalulali/vespyr/forks` → 0), confirming there is no existing fork-network residual.
2. **Future Fork Isolation Guarantee (tree-scoped):** Once GitHub clears its object cache (and immediately upon force-push of the cleaned branches), any future fork **cannot see, download, or reconstruct the removed `artifacts/` tree**:
   - **Ref-Bound Pack Transfer:** When a user forks on GitHub, the fork operation duplicates only active branch heads (`refs/heads/*`). Because `main` is purged and stale branches (`2.0`, `2.1`) are deleted, no branch in the upstream repo advertises `artifacts/`.
   - **No Hidden-Ref Leakage:** Forks **never** inherit GitHub-internal refs such as `refs/pull/*` (PR #1). A new fork's object database is seeded strictly from the clean `refs/heads/main`.
   - **Zero Dangling Object Transfer:** Git's packfile negotiation protocol transfers only objects reachable from the advertised branch refs. Unreachable parent commits and their historical tree blobs are never copied into the fork.
   - **Fork Verification Invariant:** In any future fork:
     ```bash
     git clone https://github.com/<forker>/vespyr.git
     git log --all --oneline -- artifacts/    # Returns strictly ZERO output
     git checkout 0fc42e32...                 # Fatal: reference is not a tree / not found
     ```
   - **Scope limit (r2 — corrected claim):** this guarantee covers the **tree**. It does **not** cover content copies that stay tracked: 196 frozen findings in `evals/security/corpus/baseline-repo-2026-08-{23,25}.json` quote internal review/strategy lines and 44 absolute owner paths each. Until Phase 0.3 re-baselines them, a forker reading `main` sees those excerpts. Corrected guarantee: *no branch advertises the removed tree; residual excerpts live only in the corpus baselines and disappear only when those are re-frozen.*
3. **Merged PR #1 Hidden Ref — Option B (Documented Parent-Only Exception):** `refs/pull/1/head` (`0fc42e3…`) remains on the parent repository only. It keeps the pre-purge tree reachable on `lalulali/vespyr` via direct SHA API calls until GitHub Support purges it or PR refs age out.
   - **Fork Boundary:** This ref does **not** propagate to forks.
   - **Reconsideration Path (Option A):** If desired, file a sensitive-data removal ticket with GitHub Support to purge `refs/pull/1/head` immediately, after which all historical SHA URLs will return 404.

---

## 6. Verification & Acceptance Checklist

- [ ] `docs/guide/en/` and `docs/guide/cn/` exist and render properly.
- [ ] Root `README.md` and `README_CN.md` point to `docs/guide/`.
- [ ] `git status` confirms `artifacts/` is ignored by parent repository.
- [ ] `git ls-files artifacts/` returns empty (zero files tracked in parent Git index).
- [ ] `git log --all --oneline -- artifacts/` returns empty, scoped to `refs/heads/*` and `refs/tags/*` (a default clone never fetches `refs/pull/*`; see §5.5).
- [ ] `git ls-remote origin` advertises no branch or tag other than `refs/heads/main`. (Baseline 2026-09-11: 5 refs returned — `HEAD`, `2.0`, `2.1`, `main`, `refs/pull/1/head`; only the PR ref is permitted to survive, per §5.5.)
- [x] PR #1 hidden ref (`refs/pull/1/head`, `0fc42e3…`) remains reachable — accepted exception per §5.5 (Option B).
- [ ] `.gitignore` contains a single blanket `artifacts/` rule (no stale granular entries).
- [x] §5.5 decisions recorded (2026-09-11): wait for natural cache removal, prior clones ignored, 0 forks verified, future fork isolation guaranteed, PR #1 ref = parent-only exception.
- [ ] `cd artifacts && git status` confirms `artifacts/` is independently tracked against `lalulali/vespyr-artifacts`.
- [ ] `node tests/cli/packaging.test.js` passes 100% (proves tarball contains `tools/`, `security/`, and `evals/suites/`, while excluding `tests/` and `evals/security/`).
- [ ] GitHub repository confirms **8 stars preserved** and no reachable branch contains a trace of `artifacts/`.
- [ ] Fresh test clone (`git clone https://github.com/lalulali/vespyr.git /tmp/vespyr-test`) passes `git log --all --oneline -- artifacts/` with zero output and contains no strategy documents in any branch.
- [x] Clone gate (Phase 0.1): clone with `artifacts/` removed → `node tests/run-all.js` = 467 tests, 463 pass, **0 fail** (re-verified 2026-09-11); working repo unchanged at 467 pass / 0 fail / 0 skipped.
- [ ] Private-repo CI (Phase 0.2) runs `check_plan_reservation.js` + the 04/04a/04b single-owner assertions on every push.
- [ ] Content-leak sweep (Phase 0.3a) returns **0 files** after re-freeze (at baseline 2026-09-11 it returns exactly the two `baseline-repo-*.json`), and both baselines are re-frozen with no internal excerpts and no absolute owner paths.
- [ ] Boundary-guard test (Phase 0.4) exists, fails on a staged probe outside `artifacts/`, passes on the clean tree.
- [ ] `git grep -Iln -e guide/en -e guide/cn` returns 0 files, and `swarm-tests.yml` no longer triggers on `artifacts/**` (Phase 0.5).
- [ ] This plan file is committed to the private repo before Step 3 (Phase 0 pre-flight assertion).
