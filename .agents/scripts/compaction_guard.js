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

// Thresholds aligned to Epic 02i §2.2 spec (2026-08-25): the previous
// in-file values (700/2500/2000/1800) contradicted the plan and were flagged
// by two audit rounds as "guard ceilings contradicting spec".
// Dynamic-tier files (blockers-and-risks, session-summaries) carry no hard
// budget per §2.2 — null tokens means report-only, never a violation.
const THRESHOLDS = {
  'project-context.md': { words: 225, tokens: 300 },
  'active-decisions.md': { words: 300, tokens: 400 },
  'patterns-and-conventions.md': { words: 375, tokens: 500 },
  'lessons-learned.md': { words: 375, tokens: 500 },
  'blockers-and-risks.md': { words: null, tokens: null },
  'teaching-style.md': { words: null, tokens: null },
  'session-summaries/latest.md': { words: null, tokens: null }
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

  // Dynamic-tier files (null thresholds): report usage, never a violation.
  if (wordThreshold === null || tokenThreshold === null) {
    return {
      words,
      tokens,
      word_threshold: null,
      token_threshold: null,
      status: 'DYNAMIC',
      action: 'none'
    };
  }

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
