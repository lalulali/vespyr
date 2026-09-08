#!/usr/bin/env node
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

// ---------------------------------------------------------------------------
// Shannon entropy (INJ-SECRET regex+entropy mode)
// ---------------------------------------------------------------------------

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
  if (allowlistFlag !== -1) {
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
  const files = walk(rootDir);

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
        if (!inside) {
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
      if (allowlist[rule.id] && allowlist[rule.id].some((m) => m.test(rel))) continue;

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
              detail: line.trim().slice(0, 120),
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
          // regex match below threshold is NOT a finding (negative fixture)
          if (minWindowEntropy(candidate, win) < threshold) continue;
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
          detail: line.trim().slice(0, 120),
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

  // P0-2: skipped node_modules are EXPLICIT in output (never silent).
  const skipped = [...skippedNodeModules].sort();
  if (jsonMode) {
    process.stdout.write(
      JSON.stringify(
        {
          exit: uniqueFindings.length ? 1 : 0,
          findings: uniqueFindings,
          skipped_node_modules: skipped,
          compose: composeMode,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    if (uniqueFindings.length) {
      console.log(`\n${uniqueFindings.length} finding(s):`);
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

  process.exitCode = uniqueFindings.length ? 1 : 0;
  return { exitCode: process.exitCode, findings: uniqueFindings };
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  shannonEntropy,
  minWindowEntropy,
  looksLikeBase64,
  normalizeForDetection,
  validatePinStore,
  runComposeChecks,
};
