/**
 * Tier 1: Calibrated Semantic Evaluation Judge (WS-1 Task 1.5)
 * Evaluates agent outputs against 7 foundational dimensions using discrete,
 * multi-criteria binary checklist rubrics (1/0) aggregated deterministically (INV-JUDGE-2).
 */

const fs = require("fs");
const path = require("path");

const RUBRICS_DIR = path.join(__dirname, "..", "..", "evals", "rubrics");

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
  const rubric = options.rubric || loadRubric(dimension);

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
      criteriaResults: [],
      rationale: "No rubric configured — unmeasured, fail closed"
    };
  }

  let passedCount = 0;
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const criterion of rubric.criteria) {
    const weight = criterion.weight || 1;
    totalWeight += weight;

    let passed = false;
    let rationale = "";

    // If prohibited pattern is specified on the criterion:
    if (criterion.prohibitedPatterns && Array.isArray(criterion.prohibitedPatterns)) {
      const matchNone = !criterion.prohibitedPatterns.some(pat => new RegExp(pat, "i").test(outputText));
      passed = matchNone;
      rationale = matchNone ? "No prohibited patterns detected" : "Prohibited pattern detected";
    } else if (criterion.requiredPatterns && Array.isArray(criterion.requiredPatterns)) {
      // Rubric patterns are judged on their own — the benchmark's Tier-0
      // assertContains must NOT rescue Tier-1 (de-aliased: counting the same
      // substring twice measured mock-author effort, not output quality).
      const matchAll = criterion.requiredPatterns.every(pat => new RegExp(pat, "i").test(outputText));
      passed = matchAll;
      rationale = passed ? "Required structural criteria satisfied" : "Missing required structural criteria";
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

  return {
    tier: 1,
    dimension,
    pass,
    score,
    normalizedFraction,
    passThreshold,
    criteriaResults,
    passedCount,
    totalCriteria: rubric.criteria.length
  };
}

module.exports = {
  evaluateTier1,
  loadRubric
};
