/**
 * Deterministic Tokenizer Utility for vespyr-eval
 * Measurement primitive for token telemetry (02l spans, baseline inflation
 * tripwires). Not a Vespyr efficiency claim — per-benchmark ceilings, when a
 * policy defines one, are asserted via the optional benchmark.maxTokens gate.
 */

function countTokens(text) {
  if (!text || typeof text !== "string") return 0;
  // Standard approximation: words, contractions, and punctuation symbols
  const tokens = text.match(/\w+|[^\s\w]/g) || [];
  return tokens.length;
}

module.exports = {
  countTokens
};
