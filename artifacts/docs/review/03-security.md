# Review 03 — `security/` (exhaustive)

Date: 2026-09-05 | Scope: `audit-spec.json` (253) + `supply-chain-audit-spec.md` (221) + `security-scan.js` (580) + suite/mutation/invariants gates + corpus (30 entries on disk, not 36) + held-out (8)

## 1. What holds (reproduced today)

- INJ-SECRET `sk-` + entropy: `audit-spec.json:174`, logic `security-scan.js:476-482` — held-out `sk-proj-…` fires; negatives suppressed correctly.
- INJ-OBFUSC seeds, fail-closed exits (missing spec/dir/unreadable → exit 2 at `:258-279,:338-360,:524-535`), `lstat`+`realpathSync` boundary (`:367-391`, `/repo-evil` prefix handled), `{T0}` glob union (`:302-307,419-422`).
- Held-out recall today: 6/6 positive fire, 2/2 negative clean.

## 2. Defects

### P0
- **P0-1 `.git/hooks/**` dead path (narrowed 15:30 UTC).** Spec `audit-spec.json:107` advertises it; `.git/hooks/pre-commit` with payload → exit 0, 0 findings (repro holds — walker special-cases `.git/gitdir`, parse branch `:459` matches only `.git/config`, `gitdir/config`, `.husky/`). NOTE `.husky/**` path is LIVE (`positive/gh1/.husky/pre-commit` fires normally via `:167-168` + `:459`) — the earlier "hook payloads silently pass" wording overstated; the hole is specifically `.git/hooks/`, not hooks in general. Fix routing or spec. Corpus doc staleness: `README.md:20` maps GH-1 positive to `positive/gh1/.git/config`, actual file is `gitdir/` alias (git can't track `.git`).
- **P0-2 `node_modules` silently skipped.** `:128` `continue`, no fault/finding. Repro: `node_modules/evil.md` with injection → clean, exit 0. Postinstall/beacon threat lives there — document + allowlist-scope or flag; silent skip contradicts fail-closed posture.

### P1
- **P1-1 FAULT-2/3/4 + `--compose` unimplemented.** Spec (`supply-chain-audit-spec.md:149-159`, `audit-spec.json:216-230`) promises npm-audit/OSV/socket subprocess; scanner has only a comment (`:328-331`), no arg parse, no `child_process`. `--fault-inject FAULT-2/3/4` stub (`:251-254`) always exits 2 → `test_security_suite.js:66-91` passes vacuously.
- **P1-2 `--allowlist-file` / `--compose` advertised but unparsed.** Usage (`:16`) lists allowlist-file; zero `indexOf` refs; `--compose` not even in usage. Both silently ignored (verified).
- **P1-3 INJ-PATH overclaim.** Spec (`audit-spec.json:167`, `supply-chain-audit-spec.md:183`) claims "filenames + interpolated identifiers"; code (`:439-452`) tests `rel` filename only, then `continue`. Narrow spec or implement content path.
- **P1-4 `pin_store` never validated.** `audit-spec.json:85-101` empty-string rows with `"allowlist": true` vs policy (`:62,72`, doc `:80` empty→exit 2). Scanner never reads `spec.pin_store` (zero refs). Placeholders should be `allowlist:false` or removed.
- **P1-5 Mutation eval can't fail.** `test_security_mutation.js:33-53` promises casing/whitespace/comment/encoding; implements only always-pass transforms (regexes `/i`, patterns `\s+`). Measured 32/32 100%. No zero-width/homoglyph/pipe-variant. 85% threshold (`:115`) uncalibrated.
- **P1-6 Held-out gate dir-exit-only.** `test_security_suite.js:271-285` asserts positive-dir exit 1 — one firing file of six passes. No per-file/per-rule recall. Regressed rules masked.

### P2
- README map stale (`positive/gh1/.git/config` vs actual `gitdir/config`), "36 files" vs 30, `.DS_Store` committed (special-cased `:49-50`), baseline "14 findings/10 rules" vs current 11-rule spec.
- `parseInt("8-char sliding",10)` (`:478`) yields 8 by accident — store `window` as integer.

## 3. Secret-scrub follow-up (from roundtable)

Scanner `sk-` fires; `memory_write.js` patterns lack bare `sk-`/`sk-proj`, and `searchArchive` read path has no scrub call — asymmetry stands. Severity Medium (local-only memory, no exfil sink proven) — fix by unifying pattern lists + read-path scrub, not by scanner change.

## 4. Fix order

1. P0-1/P0-2: route hooks branch; decide+document `node_modules` policy (scan with allowlist or explicit fault).
2. P1-1/P1-2: implement `--compose` + allowlist-file or remove from spec/usage; make FAULT-2/3/4 exercise real paths.
3. P1-3/P1-4: narrow INJ-PATH text or implement identifier scan; fix pin_store placeholders + add validation.
4. P1-5/P1-6: strengthen mutations (comment/zero-width/homoglyph/pipe-variant); per-rule held-out assertions.
5. P2: refresh README counts/paths, drop `.DS_Store`, integer window.

## 5. Coverage

Both spec files + scanner end-to-end; all 3 gates read; corpus FULLY enumerated and read (30 entries: 11 positive + 12 negative + README + 3 baselines + `.DS_Store` + dir entries — final 10 verified 15:35 UTC: pos `beacon-1.sh` curl-pipe-sh→BEACON-1, `inj-role.md` "you are now the system administrator"→INJ-ROLE, `inj-tool.md` `<invoke name>`→INJ-TOOL, `user-query.template.md` `{{user_input}}`→INJ-TEMPLATE; neg `harness-shaped.md` prose clean, `inj-role.md` "expert marketer" clean (no-now-no-privilege boundary), `inj-prompt.md` "ignore the typo" clean (ignore+typo boundary), `inj-tool.md` prose-"invoke" clean, `inj-obfusc.md` short-token clean, `inj-symlink-inside.md` in-repo symlink clean — the escape/inside boundary pair holds); held-out 8/8 read; live `--json` runs for pos/neg/held-out + hook/node_modules repros.
