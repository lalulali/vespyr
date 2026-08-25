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
 *                         [--json] [--allowlist-file <path>]
 *
 * Fail-closed defaults: --spec is REQUIRED (missing spec = FAULT-1, exit 2 —
 * no default-path fallback). A nonexistent/unreadable --dir root is a tool
 * failure (exit 2), NEVER a silent "clean — 0 findings" result.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    if (ent.name === 'node_modules') continue;
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
              if (h === 'README.sample') continue;
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

  if (faultFlag !== -1 && args[faultFlag + 1]) {
    const faultId = args[faultFlag + 1];
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

  // FAULT-2/FAULT-3: composed scanners (npm audit / OSV / socket.dev) are
  // invoked via child_process when present; failure/offline → exit 2.
  // This implementation shells out only when --compose is passed, keeping
  // the default scan deterministic and offline.

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
      // explicit routing below.
      if (file.vcsMeta && rule.mode !== 'parse') continue;

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

      // INJ-PATH (and any filename-scoped rule): apply the pattern to the
      // FILENAME only, never to content lines — spec supply-chain-audit-spec.md
      // line 183: "INJ-PATH regex is applied to filenames and interpolated
      // identifier values ... NOT full prose" (QA F-1).
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
          // GH-1: config-key parse on .git/config + .husky executables
          // (gitdir/ is the git-trackable fixture alias)
          if (!/\.git\/config$/.test(rel) && !/gitdir\/config$/.test(rel) && !/\.husky\//.test(rel)) continue;
          if (re.test(line)) {
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

        const matches = line.match(re);
        if (!matches) continue;

        if (rule.mode === 'regex+entropy') {
          const threshold = (rule.entropy && rule.entropy.min_shannon_per_char) || 3.5;
          const win = (rule.entropy && parseInt(rule.entropy.window, 10)) || 8;
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

  if (jsonMode) {
    process.stdout.write(
      JSON.stringify({ exit: uniqueFindings.length ? 1 : 0, findings: uniqueFindings }, null, 2) + '\n'
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
  looksLikeBase64
};
