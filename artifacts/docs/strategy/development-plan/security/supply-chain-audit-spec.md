# Harness-Config & Dependency Supply-Chain Audit Spec (F1.55)

**Owner:** @developer (Rex) · **Consumers:** @security-engineer (F1.47 scanner), @devops-engineer (F1.57 published-package audit, R51)
**Position:** Phase 1 (vespyr 2.0.0) — 02f sub-plan §8. Depends on F1.51 (taxonomy labels). Feeds F1.47, F1.57.
**Deliverables (handoff to F1.47):**
1. `supply-chain-audit-spec.md` — this document (human-readable)
2. `audit-spec.json` — machine-readable, imported by `security-scan.js`, never re-derived

---

## 1. Purpose & Consumption Contract

The audit spec defines **what** the scanner checks for two attack surfaces:

| Surface | Threat (02f §3) | Owner rule set |
|---|---|---|
| Harness config (shipped `opencode.json`, `.opencode/`, per-harness config) | S4 — malicious mcpServers/plugin path = RCE at config load, no prompt involved | INJ-CONFIG (pattern-table resolved) |
| Dependency chain | S5 — postinstall scripts in transitive deps execute at clone+install; S15 — lockfile integrity silently trusted by `npm ci`; S16 — phone-home beacons | Pin-store + BEACON-1 + F1.57 policy |

### 1.1 Consumption contract (import-only, no re-derivation)

`security-scan.js` (F1.47) imports `audit-spec.json` as its **sole** source of:

- the harness pattern table (which dirs/files are T0 harness config),
- the pin-store schema and policy (allowlist semantics, mandatory fields),
- the typed rule set (id / label / path / pattern / severity / mode).

The scanner **must not** re-implement, re-derive, or hardcode any pattern, harness dir, or policy from this document or from `bin/cli.js`. Pattern drift is detected by freezing the imported JSON's SHA-256 in the scanner baseline; a changed spec without a human-reviewed re-baseline fails the run (exit 2, fail-closed). The scanner's own hash is on its own allowlist (§9 of 02f).

**Machine-enforceable invariant:** `audit-spec.json` carries `"harness_names_only_in_pattern_table": true`. `security-scan.js` must assert that no rule `path` or `pattern` string contains any `pattern_table[].harness_dir` value. Violation = spec corruption → exit 2. Harness names appear **only** in the pattern-table fixture rows (and this document's pattern-table section), never in rules.

### 1.2 Verified real repo state (evidence, 2026-08-08)

| Item | Finding | Consequence |
|---|---|---|
| `package.json` (vespyr 2.0.5) | **Zero runtime dependencies** (no `dependencies`/`devDependencies` fields); `bin: vespyr → bin/cli.js`; `files: bin/, .agents/`; `engines: node >=18` | Pin-store npm list starts empty; every future dependency lands in the pin-store before merge |
| Install scripts | `scripts` = `test`, `sync-docs`, `validate:frontmatter`, `worktree:create`, `worktree:clean` — **no postinstall/preinstall/install** | Zero-install-scripts policy (F1.57) is satisfied today; policy change requires ADR + audit |
| Lockfile | **`package-lock.json` does not exist** | Lockfile is added to the signed manifest scope the day deps exist (S15); `npm ci` cannot be the install path until it does |
| Harness adapter registry | `bin/cli.js` — `HARNESS_OPTIONS` (6 entries), `detectInstalledHarnesses()`, `harnessLinkMap`, `getGlobalPath()` | Pattern table below is derived from this code, not from examples |
| Live checkouts in this repo | `.opencode → .agents` (symlink), root `opencode.json` (agent defs, permissions, `$schema`), `CLAUDE.md`, `AGENTS.md`, `agent.md`; `.github/` = `workflows/` only (no `.github/agents/`) | Scanner's first real T0 scan surface; `.github/workflows/**` is CI config, NOT a harness adapter row (F1.54 trigger path, separate rule surface) |

---

## 2. Pattern-Table Semantics

### 2.1 Derivation (single source of truth: `bin/cli.js`)

Each row maps a harness adapter to the config files it produces/consumes, derived from `HARNESS_OPTIONS` + `detectInstalledHarnesses()` + `harnessLinkMap` + `getGlobalPath()` in `bin/cli.js`. The table below **is** the human mirror of `audit-spec.json → pattern_table`; the scanner reads only the JSON.

| harness_dir | config_files (glob) | T0? | Adapter behavior in `bin/cli.js` |
|---|---|---|---|
| opencode | `.opencode/**`, `opencode.json` | T0 | `.opencode` symlink → `.agents`; root `opencode.json` is the live config (present in this repo) |
| claude | `.claude/**`, `CLAUDE.md` | T0 | `.claude` symlink → `.agents` + root `CLAUDE.md` |
| cursor | `.cursor/rules/**` | T0 | transpiled `*.mdc` rules; global: `~/Library/Application Support/Cursor/User/globalRules` (darwin) or `~/.config/Cursor/User/globalRules` |
| github | `.github/agents/**` | T0 | transpiled `*.yml` Copilot agents; global `~/.config/github-copilot` |
| windsurf | `.windsurf/**`, `.windsurfrules` | T0 | `.windsurf/workflows` symlink + `.windsurfrules` symlink |
| kiro | `.kiro/**` | T0 | `.kiro/steering/AGENTS.md` + `.kiro/skills` symlink |

Detection markers (mirrors `detectInstalledHarnesses`): `.opencode` exists · `.claude` exists · `.cursor/rules` dir exists · `.github/agents` dir exists · `.windsurf/workflows` exists · `.kiro/steering` **or** `.kiro/skills` exists. A root `CLAUDE.md` without a `.claude` dir is **not** a detection marker per the registry (documented limitation: it is still scanned when the row matches by file glob).

### 2.2 Scope semantics

- Every pattern-table row is **T0** — harness config is treated as T0 trust, verified (02f §3 R45: "config treated as T0 trust, verified"). Modification vs. the signed manifest = failure.
- `{T0}` **resolution token** (used by rule INJ-CONFIG): expands at scan time to the **union of all `config_files` globs across pattern-table rows with `scope == "T0"`**. Pure join of imported data — not a re-derived pattern.
- Symlinked harness dirs (`.opencode`, `.claude`, `.windsurf/workflows`, `.kiro/skills`): the scanner resolves with `lstat` — the **link itself** is the config artifact (target must stay in-repo, INJ-SYMLINK); the target tree `.agents/**` is scanned under its own T0/T1 rules, not duplicated via the harness row.

### 2.3 Negative-fixture requirement

The corpus (F1.54) must include near-miss harness dirs that **must NOT match** any pattern-table row:

- `fake-harness name` (e.g., `.opencode-backup/`, `.claude2/`, `.cursor2/rules/`, `.kiro-old/steering/`) → **zero matches**,
- harness-shaped dir with different content (`.opencode/` containing a non-config file) → matches the row but must not trip config rules.

Row matching is **exact directory-name matching** — no prefix, suffix, or case-folding. A silent skip of a fixture is a false pass (02f §10).

---

## 3. Pin-Store Policy

`audit-spec.json → pin_store` defines two collections with a machine-checkable `policy` object. Empty mandatory fields make a row **invalid** → scanner errors (exit 2, fail-closed); placeholder rows below are schema documentation, not valid pins.

### 3.1 npm pins

| Field | Mandatory | Rule |
|---|---|---|
| `name` | yes | exact package name (typosquat check in human review) |
| `version` | yes | **exact semver**, never ranges/`latest` — floating versions make the pin meaningless |
| `integrity` | yes | `sha512-<base64>` (npm registry `integrity` value; `sha1-` legacy accepted); must match what `npm ci` would verify |
| `allowlist` | yes | `true` = pinned + trusted; `false` = known-untrusted (finding always raised); `absent` = unpinned → finding, severity medium |

### 3.2 GitHub ref pins

| Field | Mandatory | Rule |
|---|---|---|
| `repo` | yes | `owner/repo` canonical form |
| `tag` | yes | tag or ref name (recorded for auditability) |
| `commit_sha` | yes | **full** 40-hex / 64-hex SHA. Short SHAs invalid. Floating refs (branches, ranges) cannot be pinned → `allowlist` must be false |
| `allowlist` | yes | `true` = pinned + trusted; `false`/absent = finding, severity **high** (moved-tag/malleable-ref defense: `git verify-tag` is a supplement, not a substitute — per F1.44) |

### 3.3 Human review coverage (what a human actually checks)

1. Version intent: exact pin vs. silent range creep (`npm audit fix --force`, `npm update` are forbidden as automated paths)
2. Integrity/provenance: registry integrity field, npm provenance (Sigstore), signed tags
3. Install scripts: does the pinned version's manifest contain `postinstall`/`preinstall`/`install`? (zero-install-scripts policy, §5)
4. Publisher identity: maintainer/owner verified — typosquat and account-takeover signals
5. License + declared deps of the pinned artifact
6. The accompanying lockfile diff (S15, §4)

### 3.4 Re-baseline rules

- Every pin-store change (add/remove/bump) requires a **human-reviewed diff**; never auto-accepted (S12).
- Every re-baseline is recorded with owner + rationale + date (same discipline as scanner baselines, 02f DoD #13).
- A re-baseline that removes a pin without a replacement is a finding, not a waiver.

---

## 4. Lockfile Scope (S15)

- `package-lock.json` (and any future `npm-shrinkwrap.json`/`yarn.lock`/`pnpm-lock.yaml`) is declared **in manifest scope**: its SHA-256 joins the signed install manifest (F1.42), so `npm ci` — which silently trusts lockfile integrity fields — is only ever fed a manifest-verified lockfile.
- **Human-reviewed diff on every change**: a lockfile churn that is not explained by the corresponding pin-store diff fails review. `npm audit fix --force` is explicitly forbidden as an automated mutator.
- Until a lockfile exists (current state: none), `npm install` in this repo is already deterministic (zero deps); the day the first dependency lands, the lockfile lands in the same commit as the pin-store row.
- Owner of S15 detection: @devops-engineer (manifest diff + `vespyr verify` lockfile hash check — 02f §3, R51).

---

## 5. Published-Package Audit + Zero-Install-Scripts Policy (F1.57)

### 5.1 Zero-install-scripts policy (binding)

The published `vespyr` package **has no install scripts today** (verified §1.2). Policy:

- **Baseline: zero install scripts.** `postinstall`/`preinstall`/`install` in `package.json` = a finding (high) unless accompanied by a dedicated ADR amendment and a human-reviewed scan of the script body.
- Transitive deps with install scripts are triaged per §6 and recorded in the pin-store human-review coverage; they cannot be silently allowed.
- Rationale (S3/S5): install scripts execute with the *user's* privileges at clone+install — the highest-privilege, lowest-attention moment in the supply chain. Any script is therefore gated content, and gated content requires review before it may run.

### 5.2 Published-package audit (what F1.57 runs on top of this spec)

1. Own package: confirm zero install scripts (CI-enforced: fail if `scripts.postinstall`/`preinstall`/`install` appears without ADR).
2. Transitive tree: enumerate every dep's install script from its published manifest (not from unpacked content — the published manifest is the trust anchor), triage per §6.
3. Beacon scan: BEACON-1 rule over `bin/`, `.agents/`, and the package `files` list (S16) — phone-home/curl-pipe patterns.
4. Result artifacts: findings list + updated pin-store rows, fed back through the §3.3 human review.

---

## 6. Postinstall / Transitive-Dep Risk Triage Procedure

Composition of existing tooling (F1.47 spec: "scan.js stays thin — composes existing tooling instead of building a second Trivy"). Network calls restricted to registry endpoints only (S16).

**Triage ladder (escalation until cleared):**

| Step | Tool | Action | Gate |
|---|---|---|---|
| 1 | `npm audit` (registry endpoint only) | advisory triage: does the dep or its tree carry a known vuln? | Findings → step 3; clean → step 2 |
| 2 | **OSV** (osv.dev API) | cross-check advisories incl. non-npm ecosystems | Findings → step 3 |
| 3 | **socket.dev** composition (or equivalent SBOM/composition review) | install-script presence, provenance score, package-age/activity signals | Any `postinstall` in tree → step 4 |
| 4 | Manual review by @security-engineer + @devops-engineer | read the actual script body from the published manifest; classify: benign (e.g., platform shims) vs. risky (network, eval, write-outside-cache) | Risky → pin-store `allowlist: false` or reject dep; benign → pin row + note |
| 5 | Re-baseline | record the triage outcome as the pin's human review | Owner + date recorded |

**Subprocess failure semantics:** killed `npm audit`/OSV/socket.dev subprocess, corrupt manifest, offline network → **exit 2** (tool failure = fail-closed, never a pass) — fault-injection matrix owned by Nina (02f §9).

---

## 7. Rule Catalog (imported verbatim from `audit-spec.json → rules`)

Every scanner rule maps to a taxonomy label (02f §7); every label has a rule **or** an explicit bypass entry. Modes: `regex` (pattern is a JS RegExp), `parse` (pattern matches config keys in parsed files — `.git/config`, husky), `lstat` (structural symlink check; `pattern` is a sentinel, not a regex), `regex+entropy` (regex match + **entropy confirmation: min Shannon entropy 2.6 bits/char over an 8-char sliding window (3.5 was unreachable for 8-char windows; max for 8 distinct chars is 3.0)** — regex match below threshold is NOT a finding; enables the negative fixture "regex-matches but low-entropy prose").

| ID | Label | Path | Pattern (abridged) | Severity | Mode |
|---|---|---|---|---|---|
| GH-1 | INJ-HOOK | `**/.git/config,**/.husky/**` | `(core\.hooksPath|hooksPath)\s*=\|` hook-name lines (`pre-commit`, `pre-push`, `post-checkout`, `post-merge`, `prepare-commit-msg`) | high | parse |
| INJ-PROMPT | INJ-PROMPT | `**/*.md` | `ignore (all|any)? (previous\|prior\|earlier) instructions` + disregard/forget variants | high | regex |
| INJ-TOOL | INJ-TOOL | `**/*.md` | `<(invoke\|use_mcp_tool\|execute_command\|tool_use\|antml:invoke)[^>]*>` (fabricated invocation blocks) | high | regex |
| INJ-OBFUSC | INJ-OBFUSC | `**` | `[A-Za-z0-9+/]{40,}={0,2}` (base64 blob heuristic) or `(\x[0-9a-fA-F]{2}){16,}` (hex blob) | medium | regex |
| INJ-ROLE | INJ-ROLE | `**/*.md` | `you are now (the )?(system\|root\|superuser)` / `act as (the )?system` / `new system prompt:` | medium | regex |
| INJ-TEMPLATE | INJ-TEMPLATE | `**/templates/**,**/*.template.*` | `\{\{\s*[^}]{0,40}\}\}` or `<%[=-]?…%>` (EJS-style) | medium | regex |
| INJ-PATH | INJ-PATH | `**` | `(\.[/\\])` traversal segments, `^[\\/]{2}` UNC/absolute, `` [`$();|&] `` shell metachar class | medium | regex |
| INJ-SECRET | INJ-SECRET | `**` | known formats (`AKIA…`, `ghp_…`, `sk-…`, `xox…`, `AIza…`) + `(api_key|secret|token|password)\s*[:=]` with 16+ char value | medium | regex+entropy |
| INJ-CONFIG | INJ-CONFIG | `{T0}` (pattern-table union) | `mcpServers` / `"command": "…"` spawn keys / `plugins?` entries | high | regex |
| INJ-SYMLINK | INJ-SYMLINK | `**` | sentinel `<lstat:target_outside_repo>` — lstat every symlink; target outside repo tree = finding | medium | lstat |
| BEACON-1 | S16-BEACON | `**/*.{js,sh,py,mjs,cjs}` | `(curl\|wget\|Invoke-WebRequest)[^\n|]*\| *(sh\|bash\|powershell)` (curl-pipe exfil/download patterns) | medium | regex |

**Application context notes (documented here, enforced by scan.js spec F1.47):**

- INJ-PATH regex is applied to **filenames and interpolated identifier values** (task IDs, template arguments), **not** full prose — `$`/parens in natural language are not findings. Traversal (`..\`/`../`, backslash + UNC variants) applies to filenames during the walk; `security-scan.js` owns the walk mechanics.
- INJ-OBFUSC base64 heuristic is documented-FP-prone on `data:` URIs and long tokens; F1.54's FP budget (≤1% informational) is measured against the frozen corpus, and `data:image/...;base64,` is an explicit known-FP class the corpus records.
- INJ-ROLE deliberately does **not** match "You are an expert…" — legitimate persona identity lines are T0-canonical content, not findings; only system-role *override* phrasings match.
- GH-1 additionally requires the executable scan of `.husky/` (files with exec bits) and `.git/config` `core.hooksPath` parse — the pattern above covers the config surface; executable-bit inspection is scanner mechanics.
- The scanner's own `bin/cli.js` and its allowlisted scripts are on the checksum allowlist (F1.47 §9); BEACON-1 exempts nothing else by default — a curl-pipe in any other script is a finding under the "not a distribution channel" policy (02e, §3 S6).
- Tier-promotion write-time guard (S14) and re-baseline diff review (S12) are **behaviors** of scan.js, not content rules — this spec supplies the content patterns they run against.

---

## 8. Cross-Platform Notes

| Concern | Policy |
|---|---|
| `shasum` (macOS) vs `sha256sum` (Linux) | Never shell out to either: manifest/allowlist hashing uses Node `crypto.createHash('sha256')` — identical output on every OS (F1.47 owns the mechanics; this spec pins the algorithm) |
| Path separators | Globs in `pattern_table.config_files` use `/`; the scanner normalizes `\` on Windows before matching. Traversal patterns must include both `../` and `..\` forms (INJ-PATH covers both) |
| Windows junctions | `lstat` on a junction reports symlink-ish semantics; INJ-SYMLINK must treat junctions as links (target must stay in-repo). POSIX runners skip-or-adapt junction fixtures **with an explicit skip manifest** — a silent skip is a false pass (02f §10) |
| UNC paths | `^[\\/]{2}` alternative in INJ-PATH catches `\\server\share`-style absolute paths in filenames on any OS (fixture is skip-or-adapted on POSIX with the skip manifest) |
| Case sensitivity | Harness dir matching is exact (case-sensitive) on all OS; macOS default-insensitive filesystems are a documented scanner-side normalization concern for *content paths*, not for row matching |

---

## 9. Acceptance Criteria (DoD for F1.55)

1. `audit-spec.json` parses via `JSON.parse` and passes the embedded invariant checks (no harness names in rules; empty mandatory pin fields only in placeholder rows).
2. Pattern table matches `bin/cli.js` registry 1:1 — verified against `HARNESS_OPTIONS`, `detectInstalledHarnesses`, `harnessLinkMap` (6 rows, §2.1).
3. All 10 taxonomy labels (F1.51) have a rule (INJ-HOOK via GH-1); BEACON-1 covers S16; no label is rule-less and no rule is label-less in the JSON.
4. `{T0}` resolution semantics documented; INJ-CONFIG contains zero harness names.
5. Section 1.2 repo-state findings are current as of 2026-08-08 (zero deps, zero install scripts, no lockfile).
6. This spec is consumed, not re-derived, by F1.47; pattern drift fails fail-closed.

---

## References

- `artifacts/docs/strategy/development-plan/02f-phase-1-security-and-integrity-architecture.md` — parent plan: §3 threat table (S3–S16), §7 taxonomy (F1.51), §8 (this task), §9 scanner contract (F1.47), §10 corpus (F1.54)
- `bin/cli.js` — harness adapter registry (`HARNESS_OPTIONS`, `detectInstalledHarnesses`, `harnessLinkMap`, `getGlobalPath`)
- `package.json` — current manifest state (zero deps, zero install scripts, node >=18)
- `opencode.json` — live T0 harness config in this repo (INJ-CONFIG scan target)
- `artifacts/docs/strategy/development-plan/security/audit-spec.json` — machine-readable twin of this spec (the scanner's import)
