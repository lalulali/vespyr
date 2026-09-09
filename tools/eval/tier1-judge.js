/**
 * Tier 1: Deterministic Rubric Evaluation Judge (WS-1 Task 1.5)
 * Evaluates agent outputs against 7 foundational dimensions using discrete,
 * multi-criteria binary checklist rubrics (1/0) aggregated deterministically (INV-JUDGE-2).
 * NOTE: regex/substring heuristics only — no LLM call, no calibration. The
 * "calibrated semantic" label was removed as an overclaim.
 */

const fs = require("fs");
const path = require("path");

const RUBRICS_DIR = path.join(__dirname, "..", "..", "evals", "rubrics");

/**
 * Loads a rubric definition from evals/rubrics/, traversal-guarded.
 * `name` must be a bare filename (`code-quality.json`); anything else
 * (absolute paths, `..`, separators) returns null instead of reading
 * arbitrary host files into the judging path.
 */
function loadRubricFile(name) {
  if (!name || typeof name !== "string") return null;
  if (name.includes("..") || path.isAbsolute(name)) return null;
  if (/[/\\]/.test(name)) return null;
  if (!/^[a-z0-9_.-]+\.json$/i.test(name)) return null;
  const rubricPath = path.join(RUBRICS_DIR, name);
  if (!path.resolve(rubricPath).startsWith(path.resolve(RUBRICS_DIR) + path.sep)) return null;
  if (!fs.existsSync(rubricPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(rubricPath, "utf8"));
  } catch (e) {
    return { __parseError: e.message };
  }
}

/**
 * Loads a rubric definition from evals/rubrics/
 * @param {string} dimension
 * @returns {Object|null}
 */
function loadRubric(dimension) {
  if (!dimension) return null;
  const candidates = [
    dimension + ".json",
    dimension.replace(/_/g, "-") + ".json",
    dimension.replace(/-/g, "_") + ".json"
  ];

  for (const c of candidates) {
    const rubricPath = path.join(RUBRICS_DIR, c);
    if (fs.existsSync(rubricPath)) {
      try {
        return JSON.parse(fs.readFileSync(rubricPath, "utf8"));
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

/**
 * Evaluates output against a discrete checklist rubric.
 * @param {Object} benchmark - The test benchmark definition
 * @param {Object} executionResult - Agent execution result { output, ... }
 * @param {Object} [options] - Optional custom rubric or LLM judge adapter
 * @returns {Object} Tier 1 result { tier: 1, pass: boolean, score: number (1.0 to 5.0), criteriaResults: [] }
 */
async function evaluateTier1(benchmark, executionResult, options = {}) {
  const dimension = benchmark.dimension || "code_quality";

  // Held-out rubric mechanism (review 04 residual): a benchmark may pin an
  // independently-authored rubric instead of the dimension default —
  // inline (`benchmark.rubric = {criteria: [...]}`) or by file
  // (`benchmark.rubricFile = "my-heldout.json"` under evals/rubrics/).
  // `rubricSource` records which rubric judged the output so co-authored
  // (default) vs held-out scores never mix silently.
  let rubric = options.rubric || null;
  let rubricSource = options.rubric ? "override" : null;
  if (!rubric && benchmark.rubric && Array.isArray(benchmark.rubric.criteria)) {
    rubric = benchmark.rubric;
    rubricSource = "held-out-inline";
  }
  if (!rubric && benchmark.rubricFile) {
    const loaded = loadRubricFile(benchmark.rubricFile);
    if (loaded && loaded.__parseError) {
      return {
        tier: 1, pass: false, score: 1.0, dimension,
        rubricSource: "held-out-file",
        criteriaResults: [],
        rationale: `Held-out rubric file corrupt: "${benchmark.rubricFile}" — ${loaded.__parseError}`
      };
    }
    if (!loaded || !Array.isArray(loaded.criteria) || loaded.criteria.length === 0) {
      return {
        tier: 1, pass: false, score: 1.0, dimension,
        rubricSource: "held-out-file",
        criteriaResults: [],
        rationale: `Held-out rubric unavailable: "${benchmark.rubricFile}" — fail closed`
      };
    }
    rubric = loaded;
    rubricSource = "held-out-file";
  }
  if (!rubric) {
    rubric = loadRubric(dimension);
    rubricSource = "dimension-default";
  }

  const outputText = executionResult.output || executionResult.stdout || "";
  const criteriaResults = [];

  if (!rubric || !rubric.criteria || !Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    // No rubric configured means unmeasured — fail closed instead of
    // awarding a perfect default score (de-circularized: a missing rubric
    // previously passed with 5.0, inflating every uncovered dimension).
    return {
      tier: 1,
      pass: false,
      score: 1.0,
      dimension,
      rubricSource,
      criteriaResults: [],
      rationale: "No rubric configured — unmeasured, fail closed"
    };
  }

  let passedCount = 0;
  let totalWeight = 0;
  let earnedWeight = 0;

  // Compiles a rubric/supplied pattern, reporting suite bugs as criterion
  // failures — never as model failures, and never as crashes.
  const tryPattern = (pat) => {
    try { return { regex: new RegExp(pat, "i") }; }
    catch (e) { return { error: `Invalid rubric pattern: "${pat}" — ${e.message}` }; }
  };

  for (const criterion of rubric.criteria) {
    const weight = criterion.weight || 1;
    totalWeight += weight;

    let passed = false;
    let rationale = "";

    // If prohibited pattern is specified on the criterion:
    if (criterion.prohibitedPatterns && Array.isArray(criterion.prohibitedPatterns)) {
      const compiled = criterion.prohibitedPatterns.map(tryPattern);
      const bad = compiled.find(c => c.error);
      if (bad) {
        passed = false;
        rationale = bad.error;
      } else {
        const matchNone = !compiled.some(c => c.regex.test(outputText));
        passed = matchNone;
        rationale = matchNone ? "No prohibited patterns detected" : "Prohibited pattern detected";
      }
    } else if (criterion.requiredPatterns && Array.isArray(criterion.requiredPatterns)) {
      // Rubric patterns are judged on their own — the benchmark's Tier-0
      // assertContains must NOT rescue Tier-1 (de-aliased: counting the same
      // substring twice measured mock-author effort, not output quality).
      const compiled = criterion.requiredPatterns.map(tryPattern);
      const bad = compiled.find(c => c.error);
      if (bad) {
        passed = false;
        rationale = bad.error;
      } else {
        const matchAll = compiled.every(c => c.regex.test(outputText));
        passed = matchAll;
        rationale = passed ? "Required structural criteria satisfied" : "Missing required structural criteria";
      }
    } else if (criterion.minWordCount) {
      if (benchmark.maxTokens !== undefined) {
        // Brevity mode explicitly caps tokens, exempt from minWordCount
        passed = true;
        rationale = "Brevity ceiling active (exempt from minimum length)";
      } else {
        const wordCount = (outputText.match(/\w+/g) || []).length;
        passed = wordCount >= criterion.minWordCount;
        rationale = `Word count: ${wordCount} (min: ${criterion.minWordCount})`;
      }
    } else {
      // Keyword heuristic on the criterion's own terms only — no
      // assertContains rescue, no length pass-through. A 21-character string
      // is not evidence of anything.
      const keywords = criterion.name.toLowerCase().split(/\s+/);
      const matches = keywords.filter(kw => kw.length > 3 && outputText.toLowerCase().includes(kw));
      passed = matches.length > 0;
      rationale = passed ? "Criterion heuristic satisfied" : "Heuristic check incomplete";
    }

    if (passed) {
      passedCount++;
      earnedWeight += weight;
    }

    criteriaResults.push({
      id: criterion.id,
      name: criterion.name,
      passed,
      weight,
      rationale
    });
  }

  const normalizedFraction = totalWeight > 0 ? (earnedWeight / totalWeight) : 1.0;
  // Map [0, 1] linearly to Likert [1.0, 5.0]: Score = 1.0 + 4.0 * fraction
  const score = Number((1.0 + 4.0 * normalizedFraction).toFixed(2));
  const passThreshold = rubric.passThreshold || 4.0;
  const pass = score >= passThreshold;
  const overlap = coauthorshipOverlap(benchmark, rubric);

  return {
    tier: 1,
    dimension,
    pass,
    score,
    normalizedFraction,
    passThreshold,
    rubricSource,
    // Co-authorship overlap (review 04 residual): fraction of the rubric's
    // requiredPatterns that also appear in the benchmark's own Tier-0
    // assertContains. High overlap means Tier-1 re-measures the same
    // author-chosen substrings — shared vocabulary, not independent evidence.
    // tier1Coauthored flags overlap >= 0.5 for summary reporting; prefer a
    // held-out rubric (`benchmark.rubric`/`rubricFile`) to clear it.
    tier1Overlap: overlap.fraction,
    tier1Coauthored: overlap.fraction !== null && overlap.fraction >= 0.5,
    criteriaResults,
    passedCount,
    totalCriteria: rubric.criteria.length
  };
}

/**
 * Measures rubric co-authorship: how much of the rubric's requiredPatterns
 * vocabulary is already present in the benchmark's Tier-0 assertContains.
 * Compares pattern STRINGS (author choices), not match outcomes — two
 * identical strings measure one authoring decision even when both "pass".
 * Returns { fraction: null } when the rubric has no requiredPatterns
 * (nothing to overlap: keyword/word-count criteria judge independently).
 */
function coauthorshipOverlap(benchmark, rubric) {
  const asserts = Array.isArray(benchmark.assertContains) ? benchmark.assertContains.map(String) : [];
  const required = [];
  for (const c of (rubric.criteria || [])) {
    if (c.requiredPatterns && Array.isArray(c.requiredPatterns)) {
      for (const p of c.requiredPatterns) required.push(String(p));
    }
  }
  if (required.length === 0 || asserts.length === 0) return { fraction: null };
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  let hit = 0;
  for (const p of required) {
    const np = norm(p);
    if (np.length <= 3) continue;
    if (asserts.some(a => {
      const na = norm(a);
      return na.length > 3 && (na === np || na.includes(np) || np.includes(na));
    })) hit++;
  }
  const denom = required.filter(p => norm(p).length > 3).length;
  if (denom === 0) return { fraction: null };
  return { fraction: Number((hit / denom).toFixed(4)) };
}

module.exports = {
  evaluateTier1,
  loadRubric,
  loadRubricFile,
  coauthorshipOverlap
};
