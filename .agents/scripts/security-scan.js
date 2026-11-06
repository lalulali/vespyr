#!/usr/bin/env node
/* Vulnerability scanning & supply-chain audit capability — owned by @security-engineer. */
/**
 * security-scan.js — Vespyr content-integrity scanner (02f F1.47)
 *
 * Consumes audit-spec.json (F1.55) as the ONLY source of rules, pattern
 * table, and pin-store semantics — no re-derived patterns in code.
 *
 * Exit codes (contract, 02f §9):
 *   0 = clean
 *   1 = findings (rule hits)
 *   2 = tool/environment failure (fail-closed) — NEVER triggered by
 *       harness-shaped content; negative fixtures must exit 0.
 *
 * Usage:
 *   node security-scan.js [--dir <root>] --spec <path-to-audit-spec.json>
 *                         [--json] [--allowlist-file <path>] [--compose]
 *                         [--include-node-modules]
 *
 * Fail-closed defaults: --spec is REQUIRED (missing spec = FAULT-1, exit 2 —
 * no default-path fallback). A nonexistent/unreadable --dir root is a tool
 * failure (exit 2), NEVER a silent "clean — 0 findings" result.
 *
 * node_modules policy (P0-2 fix): skipped by DEFAULT for determinism/perf,
 * but the skip is EXPLICIT — skipped paths are reported in output (`skipped`
 * field / stderr notice), never silent. Pass --include-node-modules to scan
 * them (postinstall/beacon triage). Pin-store + --compose own the
 * supply-chain verdict for skipped trees; content scan owns the rest.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Fault contract (audit-spec.json → fault_contract)
// ---------------------------------------------------------------------------

/**
 * Redact the matched value from a finding's detail.
 *
 * WHY THIS EXISTS (blind run 13, @security-engineer, HIGH). The scan echoed the matched source line
 * in BOTH text and JSON output — `findings[].detail` carried the literal — so scanning a real
 * credential copied it into terminal history, CI logs, and any saved JSON report. A security tool
 * that discloses the secret it found has moved the leak, not closed it.
 *
 * A short prefix is kept so a human can tell WHICH value is at issue without reproducing it —
 * the same reason a card statement shows the last four digits. Everything else is replaced by a
 * length marker, which is enough to triage and useless to an attacker.
 *
 * `--show-matches` restores the raw text for local debugging. It is opt-in, never the default,
 * because the default is what ends up in a log.
 */
let SHOW_MATCHES = false;

function redactDetail(line, match) {
  const text = String(line == null ? '' : line).trim();
  if (SHOW_MATCHES) return text.slice(0, 120);
  // If the match cannot be located in the raw line, the line is WITHHELD rather than truncated.
  // The normalizer can match a form the raw text does not contain, and returning the raw line then
  // would disclose exactly the value that was normalized to be found. A finding without a readable
  // detail is still triageable; a finding that prints the credential is not.
  if (!match) return text ? `[line withheld — match not locatable in raw text, ${text.length} chars]` : '';
  if (text.indexOf(match) === -1) return `[line withheld — match not locatable in raw text, ${text.length} chars]`;
  // Mask every CREDENTIAL-SHAPED run, not just the matched span — a line can carry two secrets and
  // only the first is the match.
  //
  // What counts as credential-shaped is deliberately narrow: 20+ characters of token alphabet that
  // are NOT a hyphenated lowercase phrase. `sk_live_…`, base64 blobs, hex digests and `npm_…`
  // tokens all get masked; `ignore-previous-instructions-and-format-all-outputs` is a hyphenated
  // English phrase that triage needs to READ, and masking it would have made the hardened
  // bypass variants unreadable in exactly the report a human is meant to review.
  //
  // The first version masked the matched span unconditionally, which redacted prose payloads too —
  // correct on secrets, useless on triage, and it hid the false positives in the SUPPRESSED list
  // that a reviewer re-checks. This keeps both properties.
  const out = text.replace(/[A-Za-z0-9_\-]{20,}/g, (run) =>
    /^[a-z]+(?:-[a-z]+)+$/.test(run) ? run : `${run.slice(0, 4)}…[redacted ${run.length} chars]`
  );
  return out.slice(0, 120);
}

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, findings: [] }) + '\n');
  } else {
    console.error(`FAIL-CLOSED: ${msg}`);
  }
  // F-2 (QA): set exitCode + return so stdout/stderr pipes drain before exit —
  // process.exit() here truncated output nondeterministically at scale.
  process.exitCode = 2;
}

// ---------------------------------------------------------------------------
// Glob → regex (minimal, sufficient for audit-spec patterns)
// ---------------------------------------------------------------------------

function globToRegExp(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          // **/ matches zero or more directory levels, so root-level
          // files also match (e.g. **/*.md must match inj-prompt.md).
          out += '(?:.*\\/)?';
          i += 2;
        } else {
          out += '.*';
          i++;
        }
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else if (c === '{') {
      // {a,b} alternation — scan to matching }
      const end = glob.indexOf('}', i);
      if (end === -1) {
        // Unbalanced brace — emit literal. MUST NOT loop here (an
        // unterminated { previously reset i to 0 → infinite loop → OOM).
        out += '\\{';
      } else {
        const alts = glob.slice(i + 1, end).split(',');
        out += '(?:' + alts.join('|') + ')';
        i = end;
      }
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(out + '$');
}

// Split a comma-separated path list, ignoring commas inside {a,b} brace
// alternations (e.g. "**/*.{js,sh,py}" must stay ONE path, not five).
function splitPathList(str) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of str) {
    if (ch === '{') depth++;
    else if (ch === '}' && depth > 0) depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

// ---------------------------------------------------------------------------
// Walker
// ---------------------------------------------------------------------------

// F-7 (Victor): unreadable subtrees/files are a FAIL-CLOSED condition, not a
// silent skip — a chmod-000 directory hiding payload content must never yield
// "clean — 0 findings". ENOENT stays tolerable (optional roots / files
// vanishing mid-walk); every other error code is collected here and main()
// converts it to exit 2 with a FAULT listing.
const walkFaults = [];

// P0-2: node_modules skips are EXPLICIT, never silent. Walker records every
// skipped node_modules root here; main() surfaces them in output. Pass
// --include-node-modules to descend instead of skipping.
const skippedNodeModules = [];
let includeNodeModules = false;

function walk(dir, fileList = [], base = dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code !== 'ENOENT') walkFaults.push({ path: dir, op: 'readdir', code: e.code || String(e) });
    return fileList;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    // P0-2: node_modules skipped by default (explicit, reported). Opt-in via
    // --include-node-modules. Symlinked node_modules routes to INJ-SYMLINK.
    if (ent.name === 'node_modules') {
      if (!includeNodeModules) {
        skippedNodeModules.push(path.relative(base, full));
        continue;
      }
      if (ent.isSymbolicLink()) {
        fileList.push({ full, rel: path.relative(base, full), symlink: true });
        continue;
      }
      if (ent.isDirectory()) {
        walk(full, fileList, base);
        continue;
      }
      // fall through for non-dir edge cases
    }
    // GH-1: scan .git/config + .git/hooks/** only — never the object store.
    // Also accepts gitdir/ (fixture alias — git refuses to track .git dirs,
    // so the corpus uses gitdir/ for GH-1 fixtures; corpus task 2026-08-10).
    if (ent.name === '.git' || ent.name === 'gitdir') {
      // F-10 (Victor): a SYMLINKED .git must be routed to the symlink check
      // (INJ-SYMLINK), never silently skipped by the dir branch — a repo can
      // redirect its git dir outside the trust boundary.
      if (ent.isSymbolicLink()) {
        fileList.push({ full, rel: path.relative(base, full), symlink: true });
      } else if (ent.isDirectory()) {
        // O-2 (Victor): every syscall in this branch is guarded — a hostile or
        // unreadable hooks dir must land in walkFaults (exit 2), not throw an
        // uncaught error whose exit code collides with the findings code.
        try {
          const gitConfig = path.join(full, 'config');
          if (fs.existsSync(gitConfig)) {
            // F-10 (Victor): lstat the .git/config path — a symlinked .git/config
            // must be checked by INJ-SYMLINK, not silently read.
            const lstatd = fs.lstatSync(gitConfig);
            fileList.push({ full: gitConfig, rel: path.relative(base, gitConfig), symlink: lstatd.isSymbolicLink(), vcsMeta: true });
          }
          const hooksDir = path.join(full, 'hooks');
          if (fs.existsSync(hooksDir) && fs.statSync(hooksDir).isDirectory()) {
            for (const h of fs.readdirSync(hooksDir)) {
              // Git-shipped samples (*.sample, README.sample) are
              // non-executable templates, never live hooks — scanning their
              // prose (which names hook events) self-flags GH-1. Skip all
              // *.sample (extends the prior README.sample-only skip, P0-1).
              if (h === 'README.sample' || h.endsWith('.sample')) continue;
              const hFull = path.join(hooksDir, h);
              const hLstat = fs.lstatSync(hFull);
              fileList.push({ full: hFull, rel: path.relative(base, hFull), symlink: hLstat.isSymbolicLink(), vcsMeta: true });
            }
          }
        } catch (e) {
          walkFaults.push({ path: full, op: 'git-inspect', code: e.code || String(e) });
        }
      }
      continue;
    }
    if (ent.isSymbolicLink()) {
      fileList.push({ full, rel: path.relative(base, full), symlink: true });
    } else if (ent.isDirectory()) {
      walk(full, fileList, base);
    } else {
      fileList.push({ full, rel: path.relative(base, full), symlink: false });
    }
  }
  return fileList;
}

/**
 * Apply the spec's product-code scope.
 *
 * WHY THIS EXISTS. A release scan answers "does the code we are shipping contain a live
 * vulnerability" — it is not a whole-repository audit, and a green result must never be read as
 * "the repository passed". Wiring the scanner into /launch surfaced that distinction the hard way:
 * 129 findings on this repository, every one triaged as a false positive — 19 on the scanner's
 * own adversarial corpus, 37 on absolute filesystem paths that match the base64 rule, 5 reviewed
 * test fixtures, and the rest prose in review documents that DESCRIBE injection attacks.
 *
 * Suppressing those one by one until the number reached zero would have produced a green that
 * meant nothing. Declaring the scope — and PRINTING what was excluded, every run — keeps the
 * result honest: a reader always learns what was not scanned.
 *
 * Returns { kept, excludedCounts, applied }. `applied` is false when the spec declares no scope,
 * so a spec without this block scans everything exactly as before.
 */
function applyProductScope(fileList, spec) {
  const scope = spec && spec.scope;
  // No scope block at all: nothing is excluded, which is the safe direction. Report the mode as
  // 'exclude-list' rather than 'none', because 'none' reads like "unfiltered and therefore risky"
  // when the truth is "no exclusions were declared, so none applied". `applied:false` already
  // carries the first fact; `mode` carries the direction.
  if (!scope) {
    return { kept: fileList, excludedCounts: {}, excludedByTree: {}, applied: false,
             mode: 'exclude-list', examined: fileList.length };
  }

  // DEFAULT MODE IS `exclude-list`, AND THAT IS THE WHOLE POINT.
  //
  // The first version of this function filtered by `product_roots` — an INCLUSION allowlist. On
  // this repo that took the scan from 129 findings to 7, and it looked like the fix. It was the
  // opposite of the fix, because product_roots is a list of THIS ENGINE's directories and
  // /launch runs on PRODUCT codebases.
  //
  // Measured, on a product tree: a hardcoded AWS-key-shaped literal (`AKIA` + 16 chars) in
  // `src/config.js` was
  // SILENTLY DROPPED. The scan reported the injection it found in .agents/ and reported zero
  // findings for the credential, and printed `dropped: {"src": 1}`. `src/` is the single most
  // common source directory in every product that exists.
  //
  // An inclusion allowlist fails OPEN: any directory nobody remembered to list is unscanned, and
  // the failure is invisible because the scan still returns a confident answer. An exclusion list
  // fails CLOSED: a new directory is scanned until somebody deliberately excludes it, which is
  // the direction a security scanner must err in.
  //
  // So: `exclude-list` is the default and needs no configuration. `include-list` is opt-in, and
  // only this repository uses it, because only this repository has the noise problem that
  // motivates it.
  const mode = scope.mode === 'include-list' ? 'include-list' : 'exclude-list';
  const roots = Array.isArray(scope.product_roots) ? scope.product_roots : [];
  const rootFiles = Array.isArray(scope.root_files) ? scope.root_files : [];
  // excluded_trees is ENFORCED, not merely declared. An earlier version of this function read
  // only product_roots/root_files, so every entry in excluded_trees -- including the written
  // reason for each one -- was decoration. Measured: adding `security/supply-chain-audit-spec.md`
  // to excluded_trees changed the finding count by zero. A spec that documents an exclusion the
  // code never performs is worse than no spec at all: it is a claim a reviewer trusts. Same class
  // as the lstat-mode bug, same lesson -- an exclude that silently does nothing reads as safety.
  // Exclusions WIN over inclusions, because an explicit exclusion is more specific than a root.
  const excludedTrees = (Array.isArray(scope.excluded_trees) ? scope.excluded_trees : [])
    .filter((e) => e && typeof e.path === 'string')
    .map((e) => ({ re: globToRegExp(e.path), path: e.path, reason: e.reason || '(no reason recorded)' }));
  const isExcludedTree = (rel) => excludedTrees.find((e) => e.re.test(rel));
  // In exclude-list mode there is no "is product" question at all — only "is excluded".
  const isProduct = (rel) => {
    const top = String(rel).split('/')[0];
    return roots.includes(top) || rootFiles.includes(String(rel));
  };
  const kept = [];
  const excludedCounts = {};
  const excludedByTree = {};
  // Source-shaped files removed by the inclusion filter. Reported because an inclusion allowlist
  // fails open, and a dropped .js file is the shape of that failure: measured in a blind /launch run
  // (2026-10-08), running this repository's own include-list spec against a product tree dropped
  // src/ and a live Stripe key vanished from the findings with `warnings: []`.
  const CODE_EXT = /\.(?:[cm]?js|jsx|ts|tsx|py|rb|go|rs|java|kt|php|sh|bash|zsh|cs|swift|scala|ex|erl|sql)$/i;
  // ADDED BY BLIND /LAUNCH RUN 7 (2026-10-10), @security-engineer seat, confirmed by the orchestrator.
  //
  // `droppedSource` tracked code extensions ONLY. An inclusion allowlist fails open, and the
  // disclosure of that failure was itself a partial blind spot: a `src/.env` carrying
  // `STRIPE_SECRET_KEY=sk_live_…` was dropped by the inclusion filter and counted in NOTHING —
  // not in `droppedSourceCount`, not in the sample. The `.js` file beside it was disclosed
  // honestly, so the run read as "1 file disclosed, 0 found" while the credential was invisible.
  //
  // Config-shaped files are exactly where a credential leaks (`.env`, `.properties`, `Dockerfile`,
  // kube manifests). They now get their own counter and sample, and the total drop count is
  // surfaced so no extension class can disappear unaccounted.
  const CONFIG_EXT = /(?:^|\/)(?:\.env|\.env\.[\w.-]+|Dockerfile[\w.-]*|docker-compose[\w.-]*|[\w.-]+\.(?:env|json|ya?ml|toml|ini|cfg|conf|config|properties|pem|key|crt|p12|jks))$/i;
  const droppedSource = [];
  const droppedConfig = [];
  let droppedTotal = 0;
  for (const f of fileList) {
    const hit = isExcludedTree(f.rel);
    if (hit) {
      excludedByTree[hit.path] = (excludedByTree[hit.path] || 0) + 1;
      continue;
    }
    if (mode === 'exclude-list' || isProduct(f.rel)) { kept.push(f); continue; }
    const top = String(f.rel).split('/')[0];
    excludedCounts[top] = (excludedCounts[top] || 0) + 1;
    droppedTotal += 1;
    if (CODE_EXT.test(f.rel)) droppedSource.push(f.rel);
    else if (CONFIG_EXT.test(f.rel)) droppedConfig.push(f.rel);
  }
  // INJ-SCOPE (blind run 14, @security-engineer HIGH): `security/audit-spec.json` claimed the
  // scanner "FAILS CLOSED when an include-list drops a config-shaped file at depth 0, so a name
  // missing from this list cannot silently reintroduce the same hole." Measured: it did not. A root
  // `secrets.json` holding a Stripe-shaped key, and a root `.git-credentials` holding a `ghp_` token,
  // both reported `clean — 0 findings`, exit 0 — and the launch gate's scan leg passed on the same
  // tree (`code: 0, reason: null`) with `dropped_config_files: 1`. The spec asserted a control that
  // did not exist, which is worse than having no control, because it stops anyone looking.
  //
  // Depth 0 is where the run-13 fix enumerated names by hand, so depth 0 is exactly where an
  // unlisted name lands. Everything below depth 0 is a tree the spec declined on purpose.
  const depth0 = (rel) => !String(rel).includes('/');
  const ROOT_CREDENTIAL_NAME =
    /^(?:\.?git-credentials|\.?netrc|\.npmrc|\.?htpasswd|\.?pgpass|secrets?[\w.-]*|credentials?[\w.-]*|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?|[\w.-]+\.(?:pem|key|p12|pfx|jks|keystore))$/i;
  const droppedConfigRoot = droppedConfig.filter(depth0);
  const droppedCredentialRoot = fileList
    .filter((f) => depth0(f.rel) && ROOT_CREDENTIAL_NAME.test(String(f.rel)))
    .map((f) => f.rel)
    .filter((rel) => !kept.some((k) => k.rel === rel) && !CONFIG_EXT.test(rel));

  return {
    kept, excludedCounts, excludedByTree, applied: true, mode,
    examined: kept.length,
    droppedTotal,
    droppedConfigRootCount: droppedConfigRoot.length,
    droppedConfigRootSample: droppedConfigRoot.slice(0, 5),
    droppedCredentialRootCount: droppedCredentialRoot.length,
    droppedCredentialRootSample: droppedCredentialRoot.slice(0, 5),
    droppedSourceCount: droppedSource.length,
    droppedSourceSample: droppedSource.slice(0, 5),
    // Not "0 when there are none": a config-shaped file dropped because nobody listed its tree is
    // the shape of the F-1 failure, so it is always reported, never folded into a zero.
    droppedConfigCount: droppedConfig.length,
    droppedConfigSample: droppedConfig.slice(0, 5),
  };
}

// ---------------------------------------------------------------------------
// Shannon entropy (INJ-SECRET regex+entropy mode)
// ---------------------------------------------------------------------------

/**
 * The fixed provider prefixes this rule's own pattern branches begin with. Stripped before the
 * entropy statistic runs, so the statistic measures ONLY the random material.
 *
 * This regex used to be `^(?:[A-Za-z]+[_-])+[A-Za-z]*[_-]?|^[A-Za-z]{2,8}(?=[0-9])` and its
 * docstring claimed it "must not eat into the random material". It did, massively: the trailing
 * `[A-Za-z]*` greedily consumed the leading LETTER RUN of the secret body itself, so what was
 * measured was not the credential but whatever happened to follow the body's first digit. Blind
 * run 16 measured the consequences (@architect's four falsification probes, all four explained by
 * this one bug): a body whose every window is high-entropy was still missed because a short
 * non-letter remainder fell to the whole-string branch; reversing the body flipped the verdict
 * because it moved the letter run; adding characters OUTSIDE the match changed it; and
 * `sk_live_` + 24 repeated characters FIRED, because the strip ate all 24 letters, left an empty
 * measurable, and fell back to the candidate — whose `sk_live_` prefix window scores 2.75 against
 * a 2.6 threshold. A perfect predictor built from that model agreed with the scanner on 40/40
 * predicted-found and 21/21 predicted-missed tokens.
 *
 * The fix is the regex the docstring always claimed to describe: a bounded list of the exact
 * prefixes the pattern branches declare, nothing else. `[A-Za-z]{2,8}(?=[0-9])` is dropped as
 * well — it stripped an arbitrary 2-8 letter head off any value that begins with letters followed
 * by a digit, the same bug in a smaller coat.
 */
const PROVIDER_PREFIX_RE = /^(?:sk[-_](?:live|test)_?|ghp_|npm_|xox[abprs]-|AKIA|AIza)/;

/**
 * The KEYWORD branch of the same defect, fixed after blind /launch run 8.
 *
 * F-1 was fixed for provider prefixes (`sk_live_`) and left live in the keyword branch. In
 * `secret = "<value>"` the match includes the keyword, the separator and the quotes, so the
 * sliding-window MINIMUM lands on `ecret = ` — a window with no value material in it at all,
 * entropy 2.500 against a 2.6 threshold. Measured: `secret = "<value>"` was detected in
 * **0 of 160 values**, deterministically, for every key that follows it.
 *
 * It is not a fail-open by accident, it is a fail-open BY CONSTRUCTION: `password = "v"` scores
 * worse than `secret="v"` purely because the keyword is longer. A longer word before the credential
 * made it harder to detect, which is backwards.
 *
 * Strip the keyword, the separator and the quoting, and measure the value. It is the structure, not
 * the secret — the same reason the provider prefix was stripped. A match that is nothing but
 * keyword still has a value to fall back to, so this cannot manufacture a detection.
 */
// One regex, not four alternatives: with the `g` flag the `^`-anchored branches can only match at
// position 0, so a separate opening-quote branch never fires after the keyword branch has advanced
// lastIndex past it — the quote survived and the window minimum was unchanged. Measuring the whole
// wrapper as one unit avoids that ordering trap.
const KEYWORD_PREFIX_RE =
  /\s*[^\s=:*,{}()\[\]"'`]{0,32}\s*[:=]\s*["'`]?|["'`]$/g;

function shannonEntropy(str) {
  const counts = new Map();
  for (const ch of str) counts.set(ch, (counts.get(ch) || 0) + 1);
  let h = 0;
  const len = str.length;
  for (const n of counts.values()) {
    const p = n / len;
    h -= p * Math.log2(p);
  }
  return h;
}

// Sliding-window entropy over a candidate string
function minWindowEntropy(str, windowSize = 8) {
  if (str.length < windowSize) return shannonEntropy(str);
  let min = Infinity;
  for (let i = 0; i + windowSize <= str.length; i++) {
    min = Math.min(min, shannonEntropy(str.slice(i, i + windowSize)));
  }
  return min;
}

/**
 * The HIGHEST 8-char window entropy in a candidate — the statistic the credential check uses.
 *
 * INJ-SECRET (blind run 16, @security-engineer HIGH; independently reproduced here: 50% of random
 * `AKIA` tokens, 49% `ghp_`, 42% `npm_` and 32% `sk_live_` were reported as nothing). The check used
 * the window MINIMUM, so one unlucky 8-char stretch suppressed the entire token. Measured on a fresh
 * random `ghp_` token: a single window held a repeated character, its entropy fell to 2.5 against the
 * 2.6 threshold, and a live-shaped credential was reported as clean. That is deterministic per token,
 * so re-running the scan never recovers it — the credential verdict was a coin flip.
 *
 * The MINIMUM answers "is this string low-entropy ANYWHERE", which is true of roughly half of all
 * random 36-character strings: an 8-draw from a 62-symbol alphabet collides about 45% of the time.
 * The question the rule means to ask is "does this string contain enough random material to be a
 * credential", and the maximum answers that — a real key always has a high-entropy window, a
 * placeholder has none.
 *
 * The documented negative fixture still works, and is why this is the maximum rather than a prefix
 * exemption: `AKIA` + repeated characters strips to a run of one character, so EVERY window measures
 * ~0.0 and the token is still rejected. Exempting provider prefixes would have turned that fixture
 * into a false positive.
 */
function maxWindowEntropy(str, windowSize = 8) {
  if (str.length < windowSize) return shannonEntropy(str);
  let max = -Infinity;
  for (let i = 0; i + windowSize <= str.length; i++) {
    max = Math.max(max, shannonEntropy(str.slice(i, i + windowSize)));
  }
  return max;
}

// ---------------------------------------------------------------------------
// Evasion normalization (P1-5 hardening) — applied BEFORE regex matching so
// zero-width / comment / homoglyph mutations cannot silently bypass.
// Mirrors memory_write.js sanitizeContent stripping; detection-side only
// (original line preserved in finding detail).
// ---------------------------------------------------------------------------

const HOMOGLYPH_MAP = {
  '\u0430': 'a', '\u0410': 'A', // Cyrillic а/А
  '\u0435': 'e', '\u0415': 'E', // Cyrillic е/Е
  '\u0456': 'i', '\u0406': 'I', // Cyrillic і/І
  '\u043E': 'o', '\u041E': 'O', // Cyrillic о/О
  '\u0440': 'p', '\u0420': 'P', // Cyrillic р/Р
  '\u0441': 'c', '\u0421': 'C', // Cyrillic с/С
  '\u0445': 'x', '\u0425': 'X', // Cyrillic х/Х
  '\u03B1': 'a', '\u0391': 'A', // Greek alpha
  '\u03B5': 'e', '\u0395': 'E', // Greek epsilon
  '\u03BF': 'o', '\u039F': 'O', // Greek omicron
};

function normalizeForDetection(line) {
  let s = String(line);
  // Strip zero-width / directional controls (same class as memory_write.js).
  s = s.replace(/[\u200B\u200C\u200D\uFEFF\u202E\u2060]/g, '');
  // Unwrap HTML + C-style comments to reveal hidden keywords
  // (e.g. "ignore <!--x--> previous" → "ignore  previous").
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Fold homoglyph lookalikes to ASCII.
  s = s.replace(/[\u0430\u0410\u0435\u0415\u0456\u0406\u043E\u041E\u0440\u0420\u0441\u0421\u0445\u0425\u03B1\u0391\u03B5\u0395\u03BF\u039F]/g, (c) => HOMOGLYPH_MAP[c] || c);
  return s;
}

// ---------------------------------------------------------------------------
// Pin-store validation (P1-4) — audit-spec.json → pin_store is enforced,
// never documentation-only. Empty arrays = zero pins (current state, §1.2).
// Any present row with empty mandatory fields, bad integrity/SHA format, or
// non-boolean allowlist is a schema violation → exit 2 (fail-closed).
// ---------------------------------------------------------------------------

function validatePinStore(spec) {
  const errors = [];
  const store = spec.pin_store;
  if (!store || typeof store !== 'object') {
    errors.push('pin_store missing or not an object');
    return errors;
  }
  const npmRows = Array.isArray(store.npm) ? store.npm : null;
  const ghRows = Array.isArray(store.github_refs) ? store.github_refs : null;
  if (!npmRows) errors.push('pin_store.npm must be an array (empty = zero deps)');
  if (!ghRows) errors.push('pin_store.github_refs must be an array (empty = zero refs)');
  if (errors.length) return errors;
  const SHA512_RE = /^sha512-[A-Za-z0-9+/=]+$/;
  const SHA1_RE = /^sha1-[A-Za-z0-9+/=]+$/;
  for (let i = 0; i < npmRows.length; i++) {
    const r = npmRows[i] || {};
    if (!r.name || !r.version || !r.integrity) {
      errors.push(`pin_store.npm[${i}]: empty mandatory field (name/version/integrity required)`);
      continue;
    }
    if (typeof r.version !== 'string' || /^(latest|\*|>=|>|~|\^)/.test(r.version) || r.version.includes(' ')) {
      // Exact-semver enforcement is advisory here (range → finding class),
      // but empty/garbage is a schema error. Ranges are flagged, not fatal.
      if (!r.version.trim()) errors.push(`pin_store.npm[${i}]: empty version`);
    }
    if (!SHA512_RE.test(r.integrity) && !SHA1_RE.test(r.integrity)) {
      errors.push(`pin_store.npm[${i}]: integrity must be sha512-<base64> (sha1- legacy accepted)`);
    }
    if (typeof r.allowlist !== 'boolean') {
      errors.push(`pin_store.npm[${i}]: allowlist must be boolean`);
    }
  }
  const SHA_RE = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/i;
  for (let i = 0; i < ghRows.length; i++) {
    const r = ghRows[i] || {};
    if (!r.repo || !r.tag || !r.commit_sha) {
      errors.push(`pin_store.github_refs[${i}]: empty mandatory field (repo/tag/commit_sha required)`);
      continue;
    }
    if (!SHA_RE.test(r.commit_sha)) {
      errors.push(`pin_store.github_refs[${i}]: commit_sha must be full 40/64-hex (short SHAs invalid)`);
    }
    if (typeof r.allowlist !== 'boolean') {
      errors.push(`pin_store.github_refs[${i}]: allowlist must be boolean`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Composed scanners (P1-1) — npm audit subprocess owned here via
// child_process. Default scan stays deterministic/offline; --compose opts in.
// Any tool failure (missing binary, killed, offline, corrupt manifest) is
// exit 2 per fault_contract FAULT-2/3/4 — never a silent pass.
// ---------------------------------------------------------------------------

function runComposeChecks(rootDir, spec, opts = {}) {
  const { faultId = null } = opts;
  // Fault-injection paths exercise the REAL compose failure modes with
  // distinct messages (P1-1: tests must not pass vacuously).
  if (faultId === 'FAULT-2') {
    return { exit: 2, fault: 'FAULT-2: composed scanner subprocess killed/non-zero (fault-injected npm audit failure)' };
  }
  if (faultId === 'FAULT-3') {
    return { exit: 2, fault: 'FAULT-3: composed scanners offline (fault-injected network failure for npm audit/OSV/socket.dev)' };
  }
  if (faultId === 'FAULT-4') {
    return { exit: 2, fault: 'FAULT-4: corrupt signed manifest (fault-injected manifest parse failure)' };
  }
  // Real --compose path:
  // (a) pin-store schema already validated by caller; re-assert here.
  const pinErrors = validatePinStore(spec);
  if (pinErrors.length) {
    return { exit: 2, fault: `FAULT-4: pin_store invalid under --compose (${pinErrors[0]})` };
  }
  // (b) zero-install-scripts policy (§5): published manifest must not carry
  // postinstall/preinstall/install without ADR.
  try {
    const pkgPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const scripts = (pkg && pkg.scripts) || {};
      const bad = ['postinstall', 'preinstall', 'install'].filter((k) => scripts[k]);
      if (bad.length) {
        return { exit: 1, fault: null, composeFinding: `install-scripts present (${bad.join(',')}) — requires ADR + human review (§5)` };
      }
    }
  } catch (e) {
    return { exit: 2, fault: `FAULT-4: corrupt manifest under --compose (${e.message})` };
  }
  // (c) npm audit subprocess (registry endpoint only, §6 step 1). Zero-dep
  // repos with no lockfile skip the subprocess (clean — nothing to audit).
  // Otherwise non-zero (vulns, kill, offline) maps to exit 2 per
  // fault_contract (triage ladder gates on tool success; vuln triage is
  // step 3+ manual).
  let pkgDeps = 0;
  try {
    const pkgPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkgDeps =
        Object.keys((pkg && pkg.dependencies) || {}).length +
        Object.keys((pkg && pkg.devDependencies) || {}).length;
    }
  } catch (e) {
    return { exit: 2, fault: `FAULT-4: corrupt manifest under --compose (${e.message})` };
  }
  const hasLock =
    fs.existsSync(path.join(rootDir, 'package-lock.json')) ||
    fs.existsSync(path.join(rootDir, 'npm-shrinkwrap.json'));
  if (pkgDeps === 0 && !hasLock) return { exit: 0, fault: null };
  try {
    const out = execFileSync('npm', ['audit', '--json', '--audit-level=low'], {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // npm audit exits 0 when clean; parse to confirm valid JSON.
    JSON.parse(out);
    return { exit: 0, fault: null };
  } catch (e) {
    const stderr = String((e && e.stderr) || '') + String((e && e.message) || '');
    if (/ENOLOCK|requires an existing lockfile/i.test(stderr)) {
      return { exit: 2, fault: `FAULT-4: lockfile missing under --compose (S15 manifest scope: ${stderr.slice(0, 160)})` };
    }
    if (/ENOTFOUND|EAI_AGAIN|ENETUNREACH|offline|network|ETIMEDOUT/i.test(stderr)) {
      return { exit: 2, fault: `FAULT-3: composed scanners offline (npm audit network failure: ${stderr.slice(0, 160)})` };
    }
    if (e && (e.code === 'ENOENT' || /command not found/i.test(stderr))) {
      return { exit: 2, fault: 'FAULT-2: npm binary missing for composed audit (tool failure)' };
    }
    // Any other non-zero (vulns found, killed, corrupt) → fail-closed per
    // contract. Preserve npm's stdout when it carries audit JSON for triage.
    return { exit: 2, fault: `FAULT-2: npm audit subprocess non-zero/killed (${stderr.slice(0, 200) || e.message})` };
  }
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Known-FP suppression (02f §10) — token-fragment guard
//
// The INJ-OBFUSC base64-blob heuristic is documented-FP-prone on long
// tokens. A match that is purely base64-class AND immediately preceded on
// the line by a token-continuation char ([A-Za-z0-9_-]) is a fragment of a
// longer credential-shaped token (e.g. ghp_<body>, sk-<body>, xoxb-<body>),
// NOT a standalone obfuscation blob — suppress it. This covers every
// documented secret prefix without re-deriving patterns in code: ghp_/sk-/xox
// bodies are glued to `_`/`-`; AKIA/AIza tokens are <40 chars so they can
// never trigger the 40-char blob heuristic anyway. Restricted to base64-class
// text so unrelated regex rules (INJ-PATH `$`, INJ-PROMPT prose) are never
// touched; regex+entropy / parse / lstat modes are unaffected.
// ---------------------------------------------------------------------------

const BASE64_CLASS_RE = /^[A-Za-z0-9+/=]+$/; // purely base64-alphabet match
const TOKEN_CHAR_RE = /[A-Za-z0-9_\-]/; // token-continuation chars

// F-3 (Victor): the 40+-char base64-class heuristic false-positives on plain
// English word runs (paths like artifacts/output/teaching/class/assessments
// are 100% letters, all in the base64 class). Real base64 blobs almost always
// contain digits and/or +/= AND mix upper/lowercase. Word runs are
// near-uniform case. Require: (a) a digit or +/= symbol, AND (b) mixed case.
function looksLikeBase64(match) {
  if (!BASE64_CLASS_RE.test(match)) return false;
  if (!/[0-9+/=]/.test(match)) return false;
  const hasUpper = /[A-Z]/.test(match);
  const hasLower = /[a-z]/.test(match);
  if (!hasUpper || !hasLower) return false;
  // F-3 (Victor, round 2): path/URL fragments are the FP class — they show
  // up as repeated slashes ('///Users/...', 'Substitute/Combine/...') and
  // dots (domains, file extensions). Real base64 blobs never contain '//'
  // (a '/' appears roughly once per 64 chars) and never contain '.'.
  if (/\/\//.test(match)) return false;
  if (/\./.test(match)) return false;
  return true;
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  // Opt-in only. The default must not put a matched credential into a log.
  SHOW_MATCHES = args.includes('--show-matches');
  const dirFlag = args.indexOf('--dir');
  const specFlag = args.indexOf('--spec');
  const faultFlag = args.indexOf('--fault-inject');
  const allowlistFlag = args.indexOf('--allowlist-file');
  const composeMode = args.includes('--compose');
  includeNodeModules = args.includes('--include-node-modules');

  // P1-2: --allowlist-file / --compose are PARSED (previously silently
  // ignored). Unknown flags are ignored (standard CLI posture — no strict
  // flag validation; a typo'd --compose degrades to the default scan).
  if (allowlistFlag !== -1 && !args[allowlistFlag + 1]) {
    return failClosed('missing --allowlist-file value (allowlist path required)', jsonMode);
  }
  // Reset per-run global walk state (module may be required multiple times
  // in-process by tests — stale faults/skips must never leak across runs).
  walkFaults.length = 0;
  skippedNodeModules.length = 0;

  // P1-1: FAULT-2/3/4 exercise the REAL compose failure paths (distinct
  // messages via runComposeChecks), not a generic stub. FAULT-1 stays generic
  // (spec-load failure). Tests assert distinct FAULT-N substrings.
  if (faultFlag !== -1 && args[faultFlag + 1]) {
    const faultId = args[faultFlag + 1];
    if (faultId === 'FAULT-2' || faultId === 'FAULT-3' || faultId === 'FAULT-4') {
      // Need spec for compose path when available; otherwise fail with the
      // distinct fault message directly (no spec required for injection).
      let specForFault = null;
      if (specFlag !== -1 && args[specFlag + 1]) {
        try {
          specForFault = JSON.parse(fs.readFileSync(args[specFlag + 1], 'utf8'));
        } catch (e) { /* fall through to direct fault */ }
      }
      const res = runComposeChecks(ROOT, specForFault || { pin_store: { npm: [], github_refs: [] } }, { faultId });
      return failClosed(res.fault, jsonMode);
    }
    return failClosed(`Fault injection triggered: ${faultId}`, jsonMode);
  }

  // FAULT-1: a scan without an explicit audit-spec.json is fail-open by
  // definition — refuse the old default-path fallback (exit 2, never scan).
  if (specFlag === -1) {
    return failClosed(
      'FAULT-1: missing --spec argument (audit-spec.json is required; refusing to scan without it)',
      jsonMode
    );
  }
  if (!args[specFlag + 1]) {
    return failClosed('FAULT-1: --spec given without a path', jsonMode);
  }
  const rootDir = dirFlag !== -1 ? args[dirFlag + 1] : ROOT;
  const specPath = args[specFlag + 1];

  // FAULT-1: unparseable, unreadable, or schema-invalid audit-spec.json → exit 2
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (e) {
    return failClosed(`FAULT-1: cannot parse audit-spec.json (${e.message})`, jsonMode);
  }
  if (!spec || !Array.isArray(spec.rules) || !Array.isArray(spec.pattern_table)) {
    return failClosed('FAULT-1: audit-spec.json schema invalid (missing rules/pattern_table)', jsonMode);
  }

  // F-5 (Victor): machine-enforceable invariant — no rule path/pattern may
  // contain a pattern_table harness_dir value (harness-agnostic guarantee,
  // DoD #12). Spec supply-chain-audit-spec.md §1.1 requires exit 2 here.
  {
    const harnessNames = spec.pattern_table.map((r) => r.harness_dir).filter(Boolean);
    for (const r of spec.rules) {
      const haystack = `${r.path || ''} ${r.pattern || ''}`;
      for (const name of harnessNames) {
        if (name && haystack.includes(name)) {
          return failClosed(
            `FAULT-1: rule ${r.id} embeds harness name "${name}" — harness-agnostic invariant violated`,
            jsonMode
          );
        }
      }
    }
  }

  // P1-4: pin_store is ENFORCED (previously never read). Empty arrays =
  // zero pins (current state); any present row with empty mandatory fields,
  // bad integrity/SHA, or non-boolean allowlist → exit 2.
  {
    const pinErrors = validatePinStore(spec);
    if (pinErrors.length) {
      return failClosed(
        `FAULT-1: audit-spec.json pin_store invalid (${pinErrors[0]}${pinErrors.length > 1 ? `; +${pinErrors.length - 1} more` : ''})`,
        jsonMode
      );
    }
  }

  // Resolve {T0} union token from the pattern table — matched as GLOB
  // patterns against rel (F-1, Victor), never exact-name equality, so
  // .cursor/rules/** and other per-harness config paths actually fire.
  const t0Globs = [];
  for (const row of spec.pattern_table) {
    if (row.scope === 'T0') {
      for (const cf of row.config_files) t0Globs.push(globToRegExp(cf));
    }
  }

  // Build per-rule matchers
  const rules = spec.rules.map((r) => {
    const re = new RegExp(r.pattern, r.flags || 'i');
    const paths = splitPathList(r.path);
    const isT0 = paths.some((p) => p === '{T0}');
    const matchers = paths.filter((p) => p !== '{T0}').map(globToRegExp);
    return { rule: r, re, isT0, matchers };
  });

  // F-9 (QA): known-FP path exclusions imported from audit-spec.json —
  // never re-derived. Per-rule path globs whose matches are documented
  // false-positive classes (e.g. INJ-OBFUSC on lockfiles).
  const knownFp = {};
  if (spec.known_fp_excludes && spec.known_fp_excludes.rules) {
    for (const [ruleId, globs] of Object.entries(spec.known_fp_excludes.rules)) {
      knownFp[ruleId] = globs.map(globToRegExp);
    }
  }

  // P1-2: --allowlist-file is ENFORCED (previously advertised but unparsed).
  // Format: { "rules": { "<RULE>": ["<glob>", ...] } } (mirrors
  // known_fp_excludes) OR { "excludes": [{ "rule": "<RULE>", "path": "<glob>" }] }.
  // Unreadable/invalid allowlist → exit 2 (fail-closed, never silent ignore).
  const allowlist = {};
  let allowlistActive = false;
  if (allowlistFlag !== -1) {
    allowlistActive = true;
    const allowPath = args[allowlistFlag + 1];
    let allowRaw;
    try {
      allowRaw = JSON.parse(fs.readFileSync(allowPath, 'utf8'));
    } catch (e) {
      return failClosed(`cannot parse --allowlist-file (${e.message})`, jsonMode);
    }
    try {
      if (allowRaw && allowRaw.rules && typeof allowRaw.rules === 'object') {
        for (const [ruleId, globs] of Object.entries(allowRaw.rules)) {
          if (!Array.isArray(globs)) throw new Error(`rules["${ruleId}"] must be an array of globs`);
          allowlist[ruleId] = globs.map(globToRegExp);
        }
      } else if (allowRaw && Array.isArray(allowRaw.excludes)) {
        for (const ex of allowRaw.excludes) {
          if (!ex.rule || !ex.path) throw new Error('excludes[] entries require {rule, path}');
          (allowlist[ex.rule] = allowlist[ex.rule] || []).push(globToRegExp(ex.path));
        }
      } else {
        throw new Error('expected {rules:{RULE:[globs]}} or {excludes:[{rule,path}]}');
      }
    } catch (e) {
      return failClosed(`invalid --allowlist-file schema (${e.message})`, jsonMode);
    }
  }

  // Fail-closed: a missing/unreadable scan root is a tool failure, NEVER a
  // clean result — a typo'd --dir must not silently pass as "0 findings".
  if (dirFlag !== -1 && !args[dirFlag + 1]) {
    return failClosed('missing --dir value (scan root required)', jsonMode);
  }
  let rootStat;
  try {
    rootStat = fs.statSync(rootDir);
  } catch (e) {
    return failClosed(`scan root does not exist or is unreadable: ${rootDir}`, jsonMode);
  }
  if (!rootStat.isDirectory()) {
    return failClosed(`scan root is not a directory: ${rootDir}`, jsonMode);
  }

  // Walk the tree
  const walked = walk(rootDir);
  // Product-code scope. `applied: false` when the spec declares none, so behaviour is unchanged.
  const scoped = applyProductScope(walked, spec);
  const files = scoped.kept;

  // F-7: any unreadable subtree/file discovered during the walk is a tool
  // failure — exit 2 with a FAULT listing, never a silent partial scan.
  if (walkFaults.length > 0) {
    return failClosed(
      `unreadable paths skipped would invalidate a clean result (${walkFaults.length}): ` +
        walkFaults.slice(0, 10).map((f) => `${f.path} [${f.op} ${f.code}]`).join('; ') +
        (walkFaults.length > 10 ? `; …+${walkFaults.length - 10} more` : ''),
      jsonMode
    );
  }

  // INJ-SCOPE: the fail-closed backstop the spec promised. A root-level credential that the include
  // list did not enumerate must not be reported as a clean scan — "not scanned" and "nothing there"
  // are different answers and only one of them is safe to ship on.
  {
    const rootDrops = (scoped.droppedConfigRootSample || []).concat(scoped.droppedCredentialRootSample || []);
    const rootDropCount = (scoped.droppedConfigRootCount || 0) + (scoped.droppedCredentialRootCount || 0);
    if (rootDropCount > 0) {
      return failClosed(
        // @security-engineer (blind run 15): the message said "credential-shaped" while the spec says
        // "config-shaped" and the behaviour is config-shaped — a root `tsconfig.json` with no secret
        // in it faults. Three places, two vocabularies. Converged on one.
        `FAULT-5: ${rootDropCount} config- or credential-shaped file(s) at the repo root were dropped by the ` +
          `include-list and never scanned (${rootDrops.slice(0, 5).join(', ')}` +
          `${rootDropCount > 5 ? `, …+${rootDropCount - 5} more` : ''}). A root-level secret is where ` +
          'credentials leak, and "not scanned" is not "clean". Add the file to `scope.root_files` in ' +
          'audit-spec.json so it is scanned, or delete it. This is the backstop the spec claimed.',
        jsonMode
      );
    }
  }

  const findings = [];

  for (const file of files) {
    const rel = file.rel.replace(/\\/g, '/');

    // INJ-SYMLINK: lstat every symlink; target outside repo tree = finding
    if (file.symlink) {
      const rulesForSymlink = rules.filter(({ rule }) => rule.mode === 'lstat');
      for (const { rule } of rulesForSymlink) {
        let target;
        try {
          target = fs.realpathSync(file.full);
        } catch (e) {
          target = '<unresolvable>';
        }
        const resolvedRoot = path.resolve(rootDir);
        // Path-boundary guard: /repo/x is inside, /repo-evil/x is not
        const inside = target === resolvedRoot || target.startsWith(resolvedRoot + path.sep);
        // F-9 parity for lstat-mode rules. This branch bypassed both exclusion mechanisms, so a
        // documented-FP path was reported anyway — measured: the scanner's own adversarial
        // fixture `evals/security/corpus/positive/inj-symlink-escape` kept firing after the whole
        // eval corpus was excluded for every rule. An exclude that silently does nothing is worse
        // than no exclude, because the spec claims it and a reviewer trusts the spec.
        const excluded =
          (knownFp[rule.id] && knownFp[rule.id].some((m) => m.test(rel))) ||
          (allowlist[rule.id] && allowlist[rule.id].some((m) => m.test(rel)));
        if (!inside && !excluded) {
          findings.push({
            rule: rule.id,
            label: rule.label,
            severity: rule.severity,
            path: rel,
            detail: `symlink target outside repo: ${target}`,
          });
        }
      }
      continue; // do not read symlinked content
    }

    // Read content (skip binaries by heuristic — first null byte)
    let content;
    try {
      content = fs.readFileSync(file.full, 'utf8');
    } catch (e) {
      // F-7: ENOENT = file vanished mid-walk (tolerated); anything else
      // (EACCES/EPERM/EISDIR…) is a tool failure, collected for exit 2.
      if (e.code !== 'ENOENT') walkFaults.push({ path: file.full, op: 'read', code: e.code || String(e) });
      continue;
    }
    if (content.indexOf('\0') !== -1) continue;

    const lines = content.split('\n');

    for (const { rule, re, isT0, matchers } of rules) {
      if (rule.mode === 'lstat') continue; // handled above

      // VCS metadata (.git/config, .git/hooks/*) is runner/tooling surface,
      // not repo content: content-mode rules (INJ-OBFUSC etc.) must never
      // scan it — GH Actions' own checkout credential produced a CI-only
      // INJ-OBFUSC (runs 32825787864/32826395949). GH-1 parse-mode keeps its
      // explicit routing below. BEACON-1 is exempted (round-table 2026-09-08:
      // keywordless curl-pipe hooks exited 0 — hook bodies must see the
      // pipe-to-shell rule; credential URLs contain no pipe so the CI FP
      // class cannot re-fire through BEACON-1).
      if (file.vcsMeta && rule.mode !== 'parse' && rule.id !== 'BEACON-1') continue;

      // Path scoping
      let pathMatches = false;
      if (isT0) {
        // F-1 (Victor): T0 config_files are globs matched against rel — no
        // hardcoded prefixes, no re-derived policy (import-only invariant).
        pathMatches = t0Globs.some((m) => m.test(rel));
      } else if (matchers.length > 0) {
        pathMatches = matchers.some((m) => m.test(rel));
      } else {
        pathMatches = true;
      }
      if (!pathMatches) continue;

      // F-9 (QA): known-FP path exclusion — documented false-positive classes
      // for this rule (e.g. INJ-OBFUSC on lockfiles) are imported from the
      // spec, never hardcoded.
      if (knownFp[rule.id] && knownFp[rule.id].some((m) => m.test(rel))) continue;

      // P1-2: --allowlist-file suppression (human-reviewed allowlist).
      //
      // F-11 (blind /launch run 4, 2026-10-08): suppression used to be SILENT. The allowlist's
      // existence was reported, but not what it hid — so a two-line allowlist naming
      // `src/payments.js` turned a release carrying a live Stripe credential into a clean scan, and
      // the output looked reviewed because the allowlist PATH was printed. The gate printed the path
      // of the thing doing the suppressing, never the findings it suppressed.
      //
      // The rule now still RUNS; the finding is recorded as `suppressed` instead of being dropped.
      // Suppression becomes visible at the point of use, which is the only place it can be audited.
      // It is still suppression — nothing here makes an allowlist trustworthy — but it can no longer
      // be silent, and silence is what made it a forgery rather than a decision.
      // NOTE: --allowlist-file does NOT skip here. F-11: suppression used to `continue` silently, so
      // a two-line allowlist naming src/payments.js turned a release carrying a live Stripe
      // credential into a clean scan while the output looked reviewed. The rule now runs and the
      // finding is partitioned into `suppressed` after collection, which puts what was hidden on the
      // record at the only place it can be audited.

      // INJ-PATH (P1-3 narrowed): filename-scoped ONLY — applied to the
      // FILENAME during the walk, never to content lines or interpolated
      // identifiers. Spec overclaimed "filenames + interpolated identifiers";
      // code tests rel only. Narrowed to filenames (prose $/parens never fire).
      if (rule.scope === 'filename') {
        const filenameMatches = re.test(rel);
        if (filenameMatches) {
          findings.push({
            rule: rule.id,
            label: rule.label,
            severity: rule.severity,
            path: rel,
            line: 0,
            detail: `filename matches ${rule.id}: ${rel.slice(0, 120)}`,
          });
        }
        continue;
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (rule.mode === 'parse') {
          // GH-1 (P0-1 fix): config-key parse on .git/config + .git/hooks/**
          // + .husky executables. gitdir/ is the git-trackable fixture alias
          // for .git/ (git refuses to track .git dirs). Both roots route here;
          // previously hooks files were walked (vcsMeta) but never matched
          // (dead path → exit 0 on hook payloads).
          if (
            !/\.git\/config$/.test(rel) &&
            !/gitdir\/config$/.test(rel) &&
            !/\.git\/hooks\//.test(rel) &&
            !/gitdir\/hooks\//.test(rel) &&
            !/\.husky\//.test(rel)
          )
            continue;
          // P1-5: parse-mode also honors normalized line (comment/zero-width).
          const normParse = normalizeForDetection(line);
          if (re.test(line) || (normParse !== line && re.test(normParse))) {
            findings.push({
              rule: rule.id,
              label: rule.label,
              severity: rule.severity,
              path: rel,
              line: i + 1,
              detail: redactDetail(line, (line.match(re) || [])[0]),
            });
          }
          continue;
        }

        // P1-5 hardening: match against evasion-normalized line (zero-width
        // stripped, comments unwrapped, homoglyphs folded) IN ADDITION to raw.
        // Either hit counts — bypass variants still fire, original preserved.
        const normLine = normalizeForDetection(line);
        const matches = line.match(re) || (normLine !== line ? normLine.match(re) : null);
        if (!matches) continue;

        if (rule.mode === 'regex+entropy') {
          const threshold = (rule.entropy && rule.entropy.min_shannon_per_char) || 3.5;
          // P2: window is an INTEGER in spec (was "8-char sliding" parsed by
          // accident via parseInt→8). Accept numeric or numeric-prefix strings.
          const rawWin = rule.entropy && rule.entropy.window;
          const win = typeof rawWin === 'number' ? rawWin : parseInt(rawWin, 10) || 8;
          const candidate = matches[0];
          // F-1 (blind /launch run 2026-10-08): strip the PROVIDER PREFIX before measuring entropy.
          //
          // The check is a sliding-window MINIMUM, so one low-entropy 8-char window suppresses the
          // whole candidate. Every Stripe key begins with the fixed literal `sk_live_`, whose window
          // entropy is 2.75 against a 2.6 threshold — meaning every Stripe secret in every codebase
          // was undetectable BY CONSTRUCTION, not by bad luck. Measured on the key planted in the
          // blind run: the window minimum of a real Stripe live key measured 2.500 before the prefix was
          // stripped and 2.750 after, against a 2.6 threshold.
          //
          // The prefix is structure, not secret material. Measuring it as if it were material is what
          // made a real credential look like a placeholder. The documented negative fixture still
          // works: `AKIA` + repeated characters strips to a run of one repeated character, ~0.0.
          // Two strips, in order: the keyword/separator/quote wrapper, then the provider prefix.
        // Both are structure. Measuring either as secret material is what made a real credential
        // look like a placeholder, and the keyword branch was still doing it.
        const measurable = candidate
          .replace(KEYWORD_PREFIX_RE, '')
          .replace(PROVIDER_PREFIX_RE, '');
          // Guard the degenerate case: never measure an empty string, which would read as 0 entropy
          // and suppress a match that is nothing but prefix.
          // INJ-SECRET (blind run 16): was `minWindowEntropy(...) < threshold`, which suppressed a
          // real-shaped credential whenever any single 8-char window happened to repeat a character.
          // See maxWindowEntropy's note. Threshold and window are unchanged; only the statistic moved
          // from "lowest window" to "highest window".
          if (maxWindowEntropy(measurable || candidate, win) < threshold) continue;
        }

        // Known-FP suppression (02f §10): token-fragment guard — see the
        // BASE64_CLASS_RE/TOKEN_CHAR_RE note above. A purely base64-class
        // match glued to a token char (ghp_<body>, sk-<body>) is a fragment
        // of a longer token, not standalone obfuscation.
        // F-6 (Victor): two-char lookback — only suppress when BOTH the
        // preceding char and the char before it are token-continuation
        // (mid-token glue), so "-<base64>" where the blob starts the token
        // still fires.
        // F-3 (Victor): the 40+-char base64-class heuristic false-positives on
        // plain English word runs. Real base64 blobs mix case + contain
        // digits/symbols; word runs don't. looksLikeBase64 encodes this.
        // (The old corpus positive "SGVsbG8gVmVzcHly..." is repetitive
        // lowercase-heavy text-base64 — weak positive; corpus task replaces it
        // with a mixed-case random blob.)
        if (rule.mode === 'regex' && rule.id === 'INJ-OBFUSC') {
          if (!looksLikeBase64(matches[0])) continue;
        }
        if (
          rule.mode === 'regex' &&
          typeof matches.index === 'number' &&
          BASE64_CLASS_RE.test(matches[0]) &&
          matches.index > 1 &&
          TOKEN_CHAR_RE.test(line[matches.index - 1]) &&
          TOKEN_CHAR_RE.test(line[matches.index - 2])
        ) {
          continue;
        }

        findings.push({
          rule: rule.id,
          label: rule.label,
          severity: rule.severity,
          path: rel,
          line: i + 1,
          detail: redactDetail(line, matches[0]),
        });
      }
    }
  }

  // N-16 (Victor, post-fix audit): the read loop above also accumulates
  // walkFaults (chmod-000 FILES land here, not in readdir). Re-check AFTER
  // processing — a fault discovered mid-read must still fail closed, never
  // degrade to "clean — 0 findings".
  if (walkFaults.length > 0) {
    return failClosed(
      `unreadable paths skipped would invalidate a clean result (${walkFaults.length}): ` +
        walkFaults.slice(0, 10).map((f) => `${f.path} [${f.op} ${f.code}]`).join('; ') +
        (walkFaults.length > 10 ? `; …+${walkFaults.length - 10} more` : ''),
      jsonMode
    );
  }

  // P1-1: --compose runs the composed supply-chain checks (npm audit via
  // child_process + install-script policy + pin re-validation). Tool failure
  // → exit 2; install-script policy hit → finding (INJ-CONFIG surface).
  if (composeMode) {
    const composeRes = runComposeChecks(rootDir, spec);
    if (composeRes.exit === 2) {
      return failClosed(composeRes.fault, jsonMode);
    }
    if (composeRes.exit === 1 && composeRes.composeFinding) {
      findings.push({
        rule: 'INJ-CONFIG',
        label: 'INJ-CONFIG',
        severity: 'high',
        path: 'package.json',
        line: 0,
        detail: composeRes.composeFinding.slice(0, 120),
      });
    }
  }

  // Dedup: canonical dedup key (rule-id, file-path, line, first-seen-SHA) + normalized finding hash
  const seen = new Map();
  for (const f of findings) {
    const hash = crypto
      .createHash('sha256')
      .update([f.rule, f.path, String(f.line || 0), f.detail].join('|'))
      .digest('hex')
      .slice(0, 16);
    const key = `${f.rule}|${f.path}|${f.line || 0}|${hash}`;
    if (!seen.has(key)) seen.set(key, f);
  }
  const uniqueFindings = Array.from(seen.values());

  // F-11: split off anything the allowlist covers. Suppression stays possible — a reviewed allowlist
  // is a legitimate mechanism — but it is no longer silent. The gate reports both counts, so a
  // clean scan with suppressed findings can never be mistaken for a clean scan.
  const suppressedFindings = allowlistActive
    ? uniqueFindings.filter((f) => {
        const globs = allowlist[f.rule];
        return globs && globs.some((m) => m.test(f.path));
      })
    : [];
  const reportedFindings = allowlistActive
    ? uniqueFindings.filter((f) => !suppressedFindings.includes(f))
    : uniqueFindings;

  // F-3: AN EMPTY SCAN IS NOT A CLEAN SCAN.
  //
  // Measured (blind /launch run 2026-10-08): a spec whose `excluded_trees` covered `src/**`
  // examined zero files and reported `exit: 0, findings: []`. The launch gate read that as a clean
  // scan and returned `verdict: PASS, ok: true, warnings: []` — over a tree holding a live Stripe
  // secret. An empty scan and a clean scan produced the same output; nothing in the result
  // distinguished "I looked at everything and found nothing" from "I looked at nothing".
  //
  // This is fail-closed (exit 2), the same treatment a scanner fault already gets, because it is
  // the same class of thing: the tool cannot produce a verdict. It is emphatically NOT exit 1 —
  // exit 1 means "I found problems", which is a different and much milder claim.
  const filesExamined = scoped.examined != null ? scoped.examined : walked.length;
  if (filesExamined === 0) {
    return failClosed(
      `scanned 0 files — every candidate was excluded by the scope, so this is not a clean result ` +
      `(declared exclusions: ${JSON.stringify(scoped.excludedByTree || {})}). An empty scan and a ` +
      `clean scan must never look identical.`,
      jsonMode
    );
  }

  // P0-2: skipped node_modules are EXPLICIT in output (never silent).
  const skipped = [...skippedNodeModules].sort();

  // BLIND /LAUNCH RUN 7, @security-engineer seat. An inclusion allowlist fails open, and the
  // disclosure of that failure had its own blind spot: a config-shaped file dropped because nobody
  // listed its tree was counted in NOTHING. It must be printed where a human reads the result, not
  // merely present in the JSON a machine reads — the JSON is only read when someone already knows
  // to look, which is not the situation in which this matters.
  const printDropDisclosure = () => {
    const lines = [];
    const srcCount = scoped.droppedSourceCount || 0;
    if (srcCount) {
      lines.push(`  ${srcCount} code file(s) not scanned (not in product_roots):`);
      for (const p of scoped.droppedSourceSample || []) lines.push(`    ${p}`);
    }
    const cfgCount = scoped.droppedConfigCount || 0;
    if (cfgCount) {
      lines.push(`  ${cfgCount} config file(s) not scanned (not in product_roots) — THIS IS WHERE CREDENTIALS LEAK:`);
      for (const p of scoped.droppedConfigSample || []) lines.push(`    ${p}`);
      lines.push('    An inclusion allowlist fails open. A clean scan with an unlisted config tree is');
      lines.push('    not a clean scan — add the tree to product_roots or exclude it with a written reason.');
    }
    const total = scoped.droppedTotal || 0;
    const accounted = srcCount + cfgCount;
    if (total > accounted) {
      // The bucketed counters must not become the new invisible class. Anything dropped that is
      // neither code nor config-shaped is named as a residual, so the total always reconciles.
      lines.push(`  ${total - accounted} further file(s) not scanned (neither code nor config-shaped):`);
      lines.push('    no sample is printed for these; re-run with --json and read `scope.dropped_total`');
      lines.push('    to see the reconciling count against dropped_source_files + dropped_config_files.');
    }
    // Declared exclusions, BY NAME AND COUNT.
    //
    // The spec's own `what_this_is` promises: "the scanner prints the excluded trees on every run so
    // nobody has to remember." It did not. The counts lived only in `--json`, so a human reading the
    // console learned an aggregate drop number and never which trees it covered — 1,600 of 2,205
    // walked files were skipped and the operator was told neither their names nor the reasons. A
    // promise in the spec that the binary does not keep is the exact defect class this scanner exists
    // to catch, and it survived twelve runs (blind run 13, @security-engineer, N-3).
    //
    // A declared tree that matches NOTHING is printed as such: it is either a typo or a scope written
    // for a tree that no longer exists, and both are worth seeing on every run.
    const declaredTrees = (spec.scope && Array.isArray(spec.scope.excluded_trees))
      ? spec.scope.excluded_trees : [];
    const treeCounts = scoped.excludedByTree || {};
    if (declaredTrees.length) {
      const treeTotal = Object.values(treeCounts).reduce((a, b) => a + b, 0);
      lines.push(`  ${declaredTrees.length} declared excluded tree(s), ${treeTotal} file(s) skipped:`);
      for (const e of declaredTrees) {
        const n = treeCounts[e.path];
        lines.push(
          n == null
            ? `    ${e.path} — MATCHED NOTHING (a declared exclusion that skips no file is a typo or a stale scope)`
            : `    ${e.path} — ${n} file(s)`
        );
      }
    }
    if (lines.length) {
      console.log('\nNot scanned — disclosed because an inclusion allowlist fails open:');
      for (const l of lines) console.log(l);
    }
  };

  if (jsonMode) {
    process.stdout.write(
      JSON.stringify(
        {
          exit: reportedFindings.length ? 1 : 0,
          findings: reportedFindings,
          suppressed: suppressedFindings,
          skipped_node_modules: skipped,
          compose: composeMode,
          // Printed on EVERY run. A green that silently omitted these would read as "the
          // repository passed", which is not what was scanned.
          scope: {
            applied: scoped.applied,
            // 'exclude-list' errs toward scanning MORE; 'include-list' errs toward scanning LESS.
            // A reader must be able to see which one produced this result, because the two differ
            // only in what they silently skip.
            mode: scoped.mode,
            fail_direction: scoped.mode === 'include-list'
              ? 'opens: a directory not listed in product_roots is NOT scanned'
              : 'closes: only declared excluded_trees are skipped',
            product_roots: (spec.scope && spec.scope.product_roots) || [],
            excluded_trees: (spec.scope && spec.scope.excluded_trees) || [],
            excluded_file_counts: scoped.excludedCounts || {},
            // Files removed BY each declared tree. A declared tree that matches nothing is itself a
            // signal (typo, or a scope written for a tree that no longer exists).
            excluded_by_tree: scoped.excludedByTree || {},
            // How many files the scan actually opened. Without this, "0 findings" and "0 files"
            // are the same output and an over-broad scope reads as a clean bill of health.
            files_examined: filesExamined,
            // Only meaningful in include-list mode, where dropping is the dangerous direction.
            dropped_source_files: scoped.droppedSourceCount || 0,
            dropped_source_sample: scoped.droppedSourceSample || [],
            // Blind /launch run 7: an inclusion allowlist fails open, and its disclosure had its own
            // blind spot. `src/.env` holding a live key was dropped and counted in NOTHING — so the
            // run read as "1 file disclosed, 0 findings" while the credential was invisible. Config-
            // shaped files now get their own count, and the total drop is surfaced so no extension
            // class can disappear unaccounted for.
            dropped_config_files: scoped.droppedConfigCount || 0,
            dropped_config_sample: scoped.droppedConfigSample || [],
            dropped_config_root_files: scoped.droppedConfigRootCount || 0,
            dropped_config_root_sample: scoped.droppedConfigRootSample || [],
            dropped_credential_root_files: scoped.droppedCredentialRootCount || 0,
            dropped_credential_root_sample: scoped.droppedCredentialRootSample || [],
            dropped_total: scoped.droppedTotal || 0,
          },
        },
        null,
        2
      ) + '\n'
    );
  } else {
    printDropDisclosure();
    if (suppressedFindings.length) {
      console.log(`\n${suppressedFindings.length} finding(s) SUPPRESSED by the reviewed allowlist:`);
      for (const f of suppressedFindings) {
        console.log(`  [${f.severity}] ${f.rule} ${f.path}${f.line ? ':' + f.line : ''} — ${f.detail}`);
      }
      console.log('  Each was read and accepted by a human. A clean scan with suppressed findings is');
      console.log('  not the same as a clean scan — check this list before trusting the result.');
    }
    if (reportedFindings.length) {
      console.log(`\n${reportedFindings.length} finding(s):`);
      for (const f of uniqueFindings) {
        console.log(
          `  [${f.severity}] ${f.rule} (${f.label}) ${f.path}${f.line ? ':' + f.line : ''} — ${f.detail}`
        );
      }
    } else {
      console.log('clean — 0 findings');
    }
    if (skipped.length) {
      console.error(
        `notice: skipped ${skipped.length} node_modules tree(s) (default policy; --include-node-modules to scan): ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? `; …+${skipped.length - 5} more` : ''}`
      );
    }
    if (composeMode) console.error('notice: --compose checks ran (npm audit subprocess + pin/install-script policy)');
  }

  process.exitCode = reportedFindings.length ? 1 : 0;
  return { exitCode: process.exitCode, findings: uniqueFindings };
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  shannonEntropy,
  minWindowEntropy,
  maxWindowEntropy,
  looksLikeBase64,
  normalizeForDetection,
  validatePinStore,
  runComposeChecks,
};
