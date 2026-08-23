/**
 * Deterministic Tokenizer Utility for vespyr-eval
 * Pinned standard for token ceiling assertions (<100 tokens under /shut-up)
 * and token spend telemetry.
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
