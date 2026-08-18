#!/usr/bin/env node
/**
 * Compaction Guard — Check memory files against thresholds and recommend action
 * 
 * Usage:
 *   node compaction_guard.js --dir artifacts/memory/
 *   node compaction_guard.js --dir artifacts/memory/ --file active-decisions.md
 */

const fs = require('fs');
const path = require('path');

const THRESHOLDS = {
  'project-context.md': { words: 500, tokens: 700 },
  'active-decisions.md': { words: 1800, tokens: 2500 },
  'patterns-and-conventions.md': { words: 1500, tokens: 2000 },
  'lessons-learned.md': { words: 1300, tokens: 1800 },
  'blockers-and-risks.md': { words: 900, tokens: 1200 },
  'teaching-style.md': { words: 600, tokens: 800 },
  'session-summaries/latest.md': { words: 600, tokens: 800 }
};

function countWords(content) {
  return content.split(/\s+/).filter(w => w.length > 0).length;
}

function estimateTokens(words) {
  // Rough estimate: 1 token ≈ 0.75 words for English text
  return Math.round(words / 0.75);
}

function checkFile(filePath, thresholds) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const words = countWords(content);
  const tokens = estimateTokens(words);
  const wordThreshold = thresholds.words;
  const tokenThreshold = thresholds.tokens;

  let status = 'OK';
  if (words > wordThreshold) {
    status = 'OVER_THRESHOLD';
  } else if (words > wordThreshold * 0.8) {
    status = 'NEAR_THRESHOLD';
  }

  return {
    words,
    tokens,
    word_threshold: wordThreshold,
    token_threshold: tokenThreshold,
    status,
    action: status === 'OVER_THRESHOLD' ? 'compact' : (status === 'NEAR_THRESHOLD' ? 'warn' : 'none')
  };
}

function checkDirectory(dirPath) {
  const results = {};

  if (!fs.existsSync(dirPath)) {
    return results;
  }

  // Check known files
  for (const [filename, thresholds] of Object.entries(THRESHOLDS)) {
    const filePath = path.join(dirPath, filename);
    const result = checkFile(filePath, thresholds);
    if (result) {
      results[filename] = result;
    }
  }

  return results;
}

// CLI
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node compaction_guard.js --dir <directory>
  node compaction_guard.js --file <filepath> --words <threshold> --tokens <threshold>`);
    process.exit(0);
  }

  let dir = null;
  let file = null;
  let wordThreshold = 1000;
  let tokenThreshold = 1500;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir') dir = args[i + 1];
    if (args[i] === '--file') file = args[i + 1];
    if (args[i] === '--words') wordThreshold = parseInt(args[i + 1], 10);
    if (args[i] === '--tokens') tokenThreshold = parseInt(args[i + 1], 10);
  }

  if (dir) {
    const results = checkDirectory(dir);
    const needsAction = Object.entries(results).filter(([_, r]) => r.action !== 'none');

    console.log(JSON.stringify({
      directory: dir,
      files_checked: Object.keys(results).length,
      needs_compaction: needsAction.length,
      results
    }, null, 2));

    if (needsAction.length > 0) {
      process.exit(2); // Exit code 2 = compaction needed
    }
  }

  if (file) {
    const result = checkFile(file, { words: wordThreshold, tokens: tokenThreshold });
    console.log(JSON.stringify(result, null, 2));
    if (result && result.action === 'compact') {
      process.exit(2);
    }
  }
}

main();
