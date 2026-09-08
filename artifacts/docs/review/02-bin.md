# Review 02 — `bin/` (exhaustive)

Date: 2026-09-05 | Scope: `cli.js` (1358) + `vespyr-eval.js` (179) + `lib/` 6 + `harnesses/` 7 — both core files read end-to-end, all lib/harness files read

## 1. Command map (`cli.js:140-251,1166-1276`)

`init`/`update` positionals, `verify`, `audit`, `manifest`, `--sync-docs`, `--install-git-hook`, `worktree` intercept (`:1169`), else `detectState` → menu/migrate/update/fresh-install. `parseFlags` also takes `--json/--spec/--dry-run/--yes/--project-name/--user-nickname/--stack/--target/--harness/--version/--help`.

## 2. What holds

- Verify fail-closed on missing/corrupt manifest (`:952-970`, `exitCode=2`), reverse-walk planted-file detection (`:1021-1054`) with symlink guard (`:1038-1042`), unreadable-dir fail-closed — correct instincts.
- Static harness require map (`harnesses/index.js:13-18`, no dynamic require — scanner-safe); `dormant` legacy handling keeps uninstall sweeps without checklist pollution.
- win32 `junction` + EPERM copy fallback (`link-utils.js:92-113`) covers common Windows case.

## 3. Defects

### P0
- **P0-1 Dual manifests, neither covering the other.** Path-list `.vespyr-manifest.json` (`cli.js:592-632`) vs hashed `manifest.json` (`:860-925`). Verify checks only the latter (`:930`); update cleanup uses only the former (`:634-662`, `installer.js:582`). Both walks exclude `.vespyr-manifest.json` (`:875,1019`) — plant/modify it invisibly to verify. (`cli.js:592-596` vs `:860-910` vs `:927-930`)
- **P0-2 Forward-walk symlink TOCTOU.** Reverse walk rejects undeclared symlinks, but forward loops (`:977-990`, `files_root :998-1011`) use `existsSync`+`readFileSync` with no `lstat` guard — out-of-boundary file contents get read/hashed before the reverse walk flags `extra`.
- **P0-3 `vespyr-eval diff` stub.** `vespyr-eval.js:122-130` prints baseline summary, exits 0. Never calls `runEvaluation`/`diffAgainstBaseline`; `--fail-on-regression/--reporter/--output/--suite` ignored; exit-2 regression unreachable via `diff`.
- **P0-4 `vespyr-eval` arg swallowing + NaN/crash.** `parseArgs:75-113` no `else` (unknown flags ignored; contrast `cli.js:244-247` exit 1). `--temp`/`--concurrency` unchecked (`NaN` propagates); missing values crash on `.replace`/`path.resolve(undefined)`, misreported as exit 3.
- **P0-5 SIGINT data loss + false receipt.** `lib/ui.js:62-82`: `process.on` (not `once`, never removed) → unconditional `rmSync(.agents)` even when pre-existing (update path), link sweep misses dangling symlinks (`existsSync`), then prints "No changes were made." (`:80`).

### P1
- **P1-1 Dead exports.** `parseFrontmatter:283-309` + `yamlQuote:312-325` exported (`:1328-1358`) never called; `resetRuntimeState` imported (`:35`) never invoked → `R.createdLinks`/`dryRun` leak across reuse/tests. Frontmatter regex handles only offset-0 `---`, no `...` close.
- **P1-2 Dual-writer sync-docs.** `performSyncDocs:810-858` path A shells `sync-entry-points.js`+`validate_frontmatter.js` via `execSync` (`:825,834`) with no try/catch; path B only writes when missing (`:855-856`). Sync failure throws into `main` catch (`:1277`) which deletes `.agents` (`:1294-1298`).
- **P1-3 Exclusion drift + `.bak` poisoning.** `MANIFEST_EXCLUDE:592-596` vs `generateManifestData:874-880` vs `MANIFEST_EXCLUSIONS:1019` — three sets, two systems. `backupCustomizedFiles` (`installer.js:529-558`) writes `*.bak-YYYYMMDD` inside `.agents/`, excluded by no walk → every customized update poisons next `verify`.
- **P1-4 Rollback asymmetry.** Error rollback (`:1294-1308`) deletes `.agents` only if `R.installed` (set solely on fresh install `installer.js:500`) — update partials never roll back; SIGINT has no such guard at all.
- **P1-5 `init`/`update` positionals ignored.** `parseFlags` sets `flags.command` (`:164-167`); `main` never reads it — dispatch is pure `detectState`. `vespyr update` in fresh dir installs; `init` in installed dir shows update menu. Help (`:1194-1226`) omits them.
- **P1-6 Exit codes.** Missing `--spec` value exits 2 (`:183`), all other missing values 1; unknown flag 1 conflates with verify-tamper 1 (`:1107`); `performVerify` uses `exitCode=2` (`:939`) vs `performAudit` hard `process.exit(2)` (`:1121`) — mixed testability.
- **P1-7 Unvalidated reporter.** `vespyr-eval.js:146-154` unknown `--reporter` falls through to console silently.
- **P1-8 Installer no-ops + divergence.** Global install for cursor/github/windsurf (`installer.js:673-713`) only `mkdir`s — empty dirs, no emission. Kiro global (`:682-705`) diverges from local `kiro.js:63-69` fallback. `harnessLinkMap` (`:641-664`) duplicates adapter geometry (divergence risk). Fresh/update always `cpSync` full `.agents` (`:499,583`) — `method` affects harnesses only, wizard wording (`:423-437`) misleading. `detectRepository()` without `targetDir` (`:118`) wrong for custom path. Backup misses user-only files, same-day re-update skips backup (`:547-550`) → silent overwrite.
- **P1-9 Reconfigure never refreshes core.** `performReconfigure:728-800` refreshes docs+harnesses, not `.agents/` core — version bumps need separate `update`; stale `CLAUDE.md` never removed; `bootstrapRootDocs` never overwrites (`:181-182`) so canonical fixes never propagate. `installHarnesses` sync-calls `adapter.install` without `await` (`:226-230`).
- **P1-10 Dormant `--harness` silent no-op.** `installHarnesses` iterates active only; explicit `--harness cursor` validates then does nothing. Reject or install.

### P2 (lib + harnesses)
- `state.js`: `R` by reference (untracked mutation), no per-install isolation; `resetRuntimeState` mid-install orphans links.
- `detector.js:23-38`: `else-if` single-label (Next+React→Next only); dead `allDeps.nestjs`; catch→JavaScript mislabels non-JS repos; misses poetry/setup.py/pnpm-workspace/csproj/composer/swift/Dart; `peerDependencies` inflates.
- `link-utils.js`: stale-link early-return never repairs (`:27-29`); copy+existing-dir silent return accumulates stale files (`:33-36`); `*.backup.*` litter; `ENOSYS/EROFS/ELOOP/ENOTSUP/EBUSY` rethrown (`:114-116`); fallback copy not tracked in `R.createdLinks`, copies symlinks as-is.
- `ui.js printSummary`: stale fallback (`:18`), unconditional ✓ lines (`:30-33`) even when scaffold skipped, hardcoded URLs, circular `npx vespyr init` next-step.
- `updatePathsInDir:333-363` rewrites code samples; follows symlinked dirs.
- `detectMethod:561-590` collapses probes to one path; double loop.
- Git hook installs `hooks/post-push` (`:105-135`) — git has no `post-push` (only `pre-push`); substring overwrite guard spoofable.
- Uninstall deletes root `AGENTS.md/agent.md/CLAUDE.md` (`:718-726`) without backup; leaves `.bak`.
- Per-harness: opencode/claude relative-link fragility + `postInstall` destroys user commands (`opencode.js:44-56`); copilot `mkdirSync` on dry-run (`:40`) + `.github` false-positive + global uninstall misses `~/.config/github-copilot`; kiro self-detection always fails (probes `steering/AGENTS.md`, emits `vespyr-steering.md`) + uninstall over-deletes colliding names (`:137-151`); cursor `methodProbePaths=[]` (undetectable); windsurf unconditionally unlinks user `.windsurfrules`.

## 4. Fix order

1. P0-1/P0-2: single manifest authority; `lstat` guards on both walks; cover `.vespyr-manifest.json`.
2. P0-5+P1-4: scope SIGINT/rollback to fresh-install session only; snapshot before mutate; remove false receipts.
3. P0-3/P0-4/P1-7: real `diff` (latest run vs baseline) or remove subcommand; strict arg validation (reject unknown/NaN, validate reporter).
4. P1-2: single-writer sync-docs (CLI delegates, no fallback template writer; try/catch with non-destructive error).
5. P1-3: unify exclusion sets; exclude `*.bak-*` + `.vespyr-manifest.json` consistently.
6. P1-8/P1-9/P1-10: fix global no-ops, reconfigure core refresh, dormant-harness reject-or-install.
7. P2 batch per file lines above.

## 5. Coverage

`cli.js` + `vespyr-eval.js` end-to-end; all 6 `lib/` + 7 `harnesses/` files read with cross-checks into `installer.js:211-800`. Not executed: install/update/verify live runs; packaging test re-run.

## 6. Resolution (2026-09-07 — all P0/P1 fixed, P2 batch closed)

Verified: `tests/test_cli.js` 73/73 pass; `tests/cli/cli-init.test.js` + `refactor-contracts` 8/8 pass; full `npm test` 348/354 with only the 6 pre-existing fails (packaging, memory-consolidation, plan-reservation — identical on clean tree). Manual E2E: fresh init → manifest → verify clean → `.vespyr-manifest.json` tamper detected → symlink plant detected → pinned-path symlink swap detected without hashing target → `*.bak-*` ignored.

### P0
- **P0-1 FIXED** — single manifest authority (`bin/cli.js:648-673` `MANIFEST_EXCLUDE_FILES` + `isBackupLitter`, shared by `buildSourceManifest`, `generateManifestData`, reverse-walk). `.vespyr-manifest.json` is now hashed like any other file; `performGenerateManifest` refreshes it first (lockstep); `removeStaleManifestFiles` prefers `manifest.json` keys with legacy fallback.
- **P0-2 FIXED** — `lstat` + containment guards on both forward walks (`bin/cli.js:1112-1180`): symlinks at pinned paths flagged without reading target; `files_root` same; generation skips symlinks.
- **P0-3 FIXED** — `vespyr-eval diff` runs a real evaluation vs baseline and honors `--suite/--fail-on-regression/--reporter/--output` with exit-2 gating (`bin/vespyr-eval.js` `renderReport`/`emitReport` + `diff` branch).
- **P0-4 FIXED** — strict `parseArgs`: unknown flags → exit 3, missing values → exit 3 (no `.replace`/`resolve` crash), `--temp` finite 0..2, `--concurrency` int 1..64.
- **P0-5 FIXED** — `setupSignalHandler` uses `once`, captures pre-existence, deletes `.agents` only for fresh-install sessions (`R.installed && !existedBefore`), sweeps links via `lstat` (dangling-aware) incl. dir-copy fallbacks, honest receipts; `teardownSignalHandler` removes the handler on success (`bin/lib/ui.js:78-135`).

### P1
- **P1-1 FIXED** — `main` calls `resetRuntimeState()` at startup (no cross-run leak); frontmatter regex accepts `...` close + BOM; `yamlQuote`/`parseFrontmatter` retained as tested public utils; `snapshotRuntimeState()` added for inspection.
- **P1-2 FIXED** — single-writer `performSyncDocs` (`bin/cli.js:916`): `execFileSync` (no shell), try/catch, never throws into destructive rollback; template-fallback writer removed.
- **P1-3 FIXED** — unified exclusions incl. `*.bak-*`/`*.backup.*` everywhere; same-day backup uses counter suffixes (`bin/lib/installer.js` `backupCustomizedFiles`).
- **P1-4 FIXED** — error rollback stays fresh-only by design (update partials never wiped); SIGINT now matches; link sweep `lstat`-based.
- **P1-5 FIXED** — `init`/`update` honored: `init` on installed dir = idempotent refresh via update path (T0-INIT-01); `update` on fresh/migrate dirs exits 2; help documents all commands + exit codes.
- **P1-6 FIXED** — usage errors (missing values, unknown flags, dormant/unknown harness) exit 2; verify tamper exits 1; fail-closed exits 2; `performAudit` sets `exitCode` instead of hard `process.exit`.
- **P1-7 FIXED** — `--reporter` validated against console/json/ndjson/markdown, exit 3 otherwise.
- **P1-8 FIXED** — global install delegates to adapters (no `harnessLinkMap`, no empty-dir no-ops); opencode commands prune is surgical; wizard wording states method is harness-only; `detectRepository(targetDir)` uses `cwd`; `cpSync` uses `dereference`.
- **P1-9 FIXED** — reconfigure refreshes `.agents/` core (backup + stale-sweep + version + manifest), removes stale `CLAUDE.md` when deselected, `await`s adapter installs. Root `AGENTS.md`/`agent.md` stay never-overwrite by design (user-owned after creation; canonical fixes propagate via `.agents/templates` + sync-docs).
- **P1-10 FIXED** — explicit dormant `--harness` rejected at parse (exit 2) and in `installHarnesses` (throws).

### P2
- `state.js`: ownership documented, `snapshotRuntimeState()` added, reset-once-at-startup contract.
- `detector.js`: independent framework labels, `peerDependencies` excluded, corrupt-`package.json` → Unknown (no mislabel), added poetry/setup.py/pnpm-workspace/lockfiles/.NET/PHP/Swift/Dart.
- `link-utils.js`: dangling `.agents`-link repair, fallback codes extended (`ENOSYS/EROFS/ENOTSUP`), copies tracked in `R.createdLinks` with `dereference`, `ELOOP/EBUSY/ENOENT` still rethrow loudly.
- `ui.js printSummary`: live counts, only-on-disk ✓ lines, circular `npx vespyr init` next-step removed.
- `updatePathsInDir`: skips symlinked dirs, rewrites prose outside code fences only.
- `detectMethod`: single pass, symlink-wins, handles empty probes (cursor probe restored to `.cursor/rules`).
- Git hook: `hooks/pre-push` (valid; `post-push` never executed) with managed-header guard + legacy migration; `getGlobalPath`/`detectInstalledHarnesses` unified on the registry with `lstat` (dangling-aware).
- Uninstall: root docs backed up (`*.uninstall-bak-*`) before delete; `*.bak-*`/`*.backup.*` swept inside `.agents/`.
- Per-harness: opencode sweep is core-only; copilot dry-run pure + specific `detectPaths` (no bare-`.github` false positive); kiro probes `vespyr-steering.md` + uninstall removes only the owned doc; windsurf removes `.windsurfrules` only with Vespyr marker/symlink.
- Accepted (not bugs): relative `.agents` links (portable across moves), hardcoded repo URLs (match `package.json`), `console-reporter` `bRate` self-reference fixed as drive-by.

[Test: tests/test_cli.js 73/73; tests/cli/cli-init + refactor-contracts 8/8]

### Follow-up (2026-09-08): foreign `.agents/` misclassified as repair
- **Symptom:** pre-existing non-Vespyr `.agents/` (e.g. another tool's skill) + `vespyr` install → silent repair-merge instead of the fresh-install path.
- **Root cause:** `detectState` returned `repair` for ANY `.agents/` without `.vespyr-version`.
- **Fix (`bin/cli.js`):** `detectState` now distinguishes `fresh` (empty dir) / `repair` (Vespyr fingerprints: `.vespyr-manifest.json`, `manifest.json`, `GUARDRAILS.md`, `templates/`, `scripts/orchestrator_state.js` — generic `agents/`/`skills/` names deliberately excluded) / `foreign` (new state). New `performForeignConflict`: `--yes` backs the foreign dir aside (`.agents.backup.<ts>`) then fresh-installs; interactive offers backup+fresh / merge (collisions → `*.bak-*`) / cancel. `update` on foreign exits 2.
- [Test: tests/test_cli.js Test 5b (5 tests incl. full init---yes E2E); full suite 373/373]

### Follow-up (2026-09-08b): installer flow smoothness (uninstall/reconfigure/repair)
- **Gap:** `uninstall`/`reconfigure` existed only in the interactive menu — no non-interactive path; `performUninstall` swept fresh/foreign dirs unguarded; bare `reconfigure --yes` without `--harness` wiped every harness; menu uninstall had no confirm; repair banner copy-pasted in two branches.
- **Fix:** new `uninstall` / `reconfigure` subcommands (`bin/cli.js:parseFlags` + dispatch + help). `performUninstall` self-guards: fresh → no-op exit 0, foreign/migrate → exit 2, only installed/repair sweep. `reconfigure --yes` without `--harness` keeps the current set (`bin/lib/installer.js`). Confirm prompt on interactive uninstall (menu + subcommand; `--yes`/non-TTY handled). Repair banner extracted to `performRepair`.
- [Test: tests/cli/install-flows.test.js (6 E2E); full suite 383/383]
