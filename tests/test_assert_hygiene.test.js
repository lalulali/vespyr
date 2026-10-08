'use strict';
/**
 * test_assert_hygiene.test.js — guards against assertions that cannot fail.
 *
 * WHY THIS FILE EXISTS
 * While reverse-auditing `/design`, four revert-proofs reported "no test failed" and I nearly
 * recorded that as weak coverage. The tests were fine in intent and dead in effect:
 *
 *     r.userStoriesFailures.some((f) => /no user story is defined/i)
 *
 * `.some(f => regex)` returns the RegExp OBJECT from the callback, and an object is always
 * truthy — so `.some()` returns `true` whenever the array is non-empty, whether or not any
 * element matches. The assertion passed on a list of 15 failures that contained none of the
 * thing it named. The only difference from a correct assertion is a missing `.test(f)`.
 *
 * This is the same failure the whole audit keeps finding in gates: code that looks correct and
 * checks something else. A test that cannot fail is worse than no test, because it converts
 * "unverified" into "verified" on a green line.
 *
 * WHAT THIS CHECKS
 *   - `.some/.filter/.every/.find(cb)` where the callback body is a bare regex literal and
 *     therefore never inspects the element
 *   - `assert(<bare regex>, ...)` — a RegExp is always truthy
 *   - `.includes()` called with a RegExp, which is a substring test against an object and is
 *     therefore always false
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TESTS_DIR = __dirname;

/** Bare-regex callback: `(...) => /re/flags` with nothing after the literal. */
const BARE_REGEX_CALLBACK = /\.(some|filter|every|find|findIndex)\(\s*\(?[A-Za-z_$][\w$]*\)?\s*=>\s*\/[^\n]*?\/[gimsuy]*\s*\)/g;
/** A RegExp literal used as a truthiness argument to assert-ish helpers. */
const REGEX_AS_ASSERTION = /\b(?:assert|assert\.ok|expect)\(\s*\/[^\n]*?\/[gimsuy]*\s*[,)]/g;
/** `str.includes(/re/)` — always false, and silent. */
const INCLUDES_REGEX = /\.includes\(\s*\/[^\n]*?\/[gimsuy]*\s*\)/g;

function offending(file, rel) {
  const src = fs.readFileSync(file, 'utf8');
  const hits = [];
  for (const [re, label] of [
    [BARE_REGEX_CALLBACK, 'callback returns a RegExp object (always truthy) — did you mean .test(x)?'],
    [REGEX_AS_ASSERTION, 'a RegExp object is always truthy — did you mean .test(x)?'],
    [INCLUDES_REGEX, '.includes(RegExp) is a substring test against an object and is always false'],
  ]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const line = src.slice(0, m.index).split('\n').length;
      hits.push(`${rel}:${line} — ${label}\n      ${m[0].replace(/\s+/g, ' ').slice(0, 110)}`);
    }
  }
  return hits;
}

test('no test asserts a RegExp object instead of matching with it', () => {
  const files = fs.readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith('.test.js'))
    .map((f) => path.join(TESTS_DIR, f));
  assert.ok(files.length > 0, 'no test files found — this guard would be vacuous');

  const hits = [];
  for (const f of files) {
    if (path.basename(f) === 'test_assert_hygiene.test.js') continue; // this file names the patterns
    hits.push(...offending(f, path.relative(path.join(TESTS_DIR, '..'), f)));
  }

  assert.deepStrictEqual(
    hits,
    [],
    `Assertions that cannot fail were found. A green line from one of these converts ` +
      `"unverified" into "verified":\n  ${hits.join('\n  ')}`
  );
});

test('the guard itself detects the pattern it is named for', () => {
  // A guard that has never been shown failing is a guard of unknown behaviour. This is the
  // exact expression that was live in test_design_run1_contract.test.js.
  const sample = 'const x = arr.some((f) => /no user story is defined/i);\n';
  BARE_REGEX_CALLBACK.lastIndex = 0;
  assert(BARE_REGEX_CALLBACK.test(sample), 'the detector does not detect the pattern it exists for');
});
