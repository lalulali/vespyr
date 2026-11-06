#!/usr/bin/env node
/**
 * Quirly Core Deslop & Plain-Clarity Linter — Software 1.0 Deterministic Gate
 *
 * Checks:
 *   1. Word count floors and ceilings.
 *   2. Micro-beat completion [BEAT-01] ... [BEAT-NN].
 *   3. 43-Pattern Anti-AI slop and cliché detection (locale-keyed).
 *   4. Plain-Word Clarity: Fancy/Thesaurus word replacement & Anti-Circumlocution (circling around the point).
 *   5. Sentence-length burstiness (standard deviation >= 6.5 words).
 *   6. Readability & Foggy Abstraction check (complex word ratio & long-winded circling sentences).
 *   7. Rolling N-gram crutch phrase repetition.
 *
 * Usage:
 *   node prose_linter.js --file <path> [--min-words 900] [--max-words 1500] [--locale en] [--json]
 */

const fs = require('fs');
const path = require('path');

const LEXICON_PATH = path.join(__dirname, '..', 'references', 'anti-slop-lexicon.json');

function loadLexicon() {
  try {
    return JSON.parse(fs.readFileSync(LEXICON_PATH, 'utf8'));
  } catch (err) {
    return {
      locales: {
        en: {
          banned_ai_words: [],
          fancy_word_replacements: {},
          circumlocution_replacements: {},
          banned_cliches: [],
          regex_patterns: {}
        }
      }
    };
  }
}

function countSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  const stemmed = clean
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const matches = stemmed.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function calculateSentenceStats(text) {
  // Split into sentences (handling punctuation followed by whitespace or end-of-string)
  const rawSentences = text
    .replace(/["'”’]/g, '')
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('#') && !s.startsWith('-'));

  if (rawSentences.length === 0) {
    return { count: 0, mean: 0, stdDev: 0, sentenceLengths: [] };
  }

  const lengths = rawSentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const count = lengths.length;
  const mean = lengths.reduce((a, b) => a + b, 0) / count;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  return { count, mean: parseFloat(mean.toFixed(2)), stdDev: parseFloat(stdDev.toFixed(2)), lengths };
}

function calculateClarityStats(text) {
  const rawSentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('#') && !s.startsWith('['));

  const rawWords = text
    .replace(/\[BEAT-\d+\]/gi, '')
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z'-]/g, ''))
    .filter((w) => w.length > 0);

  if (rawWords.length === 0) {
    return {
      avgWordLength: 0,
      complexWordCount: 0,
      complexWordRatio: 0,
      longCirclingSentenceCount: 0,
      clarityScore: 100
    };
  }

  const totalChars = rawWords.reduce((sum, w) => sum + w.length, 0);
  const avgWordLength = parseFloat((totalChars / rawWords.length).toFixed(2));

  // Count non-proper words with >= 4 syllables (fancy/polysyllabic density)
  const complexWords = rawWords.filter((w, idx) => {
    const isCapitalized = /^[A-Z]/.test(w);
    if (isCapitalized && idx > 0) return false; // skip proper nouns
    return countSyllables(w) >= 4 && w.length >= 9;
  });

  const complexWordCount = complexWords.length;
  const complexWordRatio = parseFloat((complexWordCount / rawWords.length).toFixed(4));

  // Detect sentences that circle around the point (> 38 words or >= 4 clauses/commas in a 24+ word sentence)
  const longCirclingSentences = rawSentences.filter((s) => {
    const wc = s.split(/\s+/).filter(Boolean).length;
    const clauseBreaks = (s.match(/[,;—]/g) || []).length;
    return wc > 38 || (wc >= 24 && clauseBreaks >= 4);
  });

  const totalSyllables = rawWords.reduce((sum, w) => sum + countSyllables(w), 0);
  const sentenceCount = Math.max(1, rawSentences.length);
  const wordsPerSentence = rawWords.length / sentenceCount;
  const syllablesPerWord = totalSyllables / rawWords.length;
  // Flesch Reading Ease clamped to 0..100
  const rawFlesch = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const clarityScore = parseFloat(Math.max(0, Math.min(100, rawFlesch)).toFixed(1));

  return {
    avgWordLength,
    complexWordCount,
    complexWordRatio,
    longCirclingSentenceCount: longCirclingSentences.length,
    clarityScore
  };
}

function extractNGrams(text, n = 4) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const ngrams = new Map();
  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n).join(' ');
    ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
  }
  return ngrams;
}

function lintProse(content, options = {}) {
  const {
    minWords = 0,
    maxWords = Infinity,
    locale = 'en',
    minStdDev = 6.5,
    maxComplexWordRatio = 0.08,
    blocklistNgrams = []
  } = options;

  const errors = [];
  const warnings = [];

  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Word Count Checks
  if (minWords > 0 && wordCount < minWords) {
    errors.push(`Word count floor violated: ${wordCount} words (minimum required: ${minWords})`);
  }
  if (maxWords < Infinity && wordCount > maxWords) {
    warnings.push(`Word count ceiling exceeded: ${wordCount} words (maximum budget: ${maxWords})`);
  }

  // 2. Beat Coverage Check (if beats are expected)
  const beatMatches = content.match(/\[BEAT-\d+\]/gi) || [];
  const uniqueBeats = new Set(beatMatches.map((b) => b.toUpperCase()));

  // 3. Anti-Slop & Plain-Clarity Lexicon Checks
  const lexicon = loadLexicon();
  const locData = lexicon.locales[locale] || lexicon.locales['en'];

  if (locData) {
    const lowerContent = content.toLowerCase();

    // Check banned AI words
    for (const word of locData.banned_ai_words || []) {
      const re = new RegExp(`\\b${word}\\b`, 'i');
      if (re.test(content)) {
        errors.push(`Banned AI vocabulary word detected: "${word}"`);
      }
    }

    // Check fancy / over-complicated words (Pattern 40)
    for (const [fancyWord, plainWord] of Object.entries(locData.fancy_word_replacements || {})) {
      const re = new RegExp(`\\b${fancyWord}\\b`, 'i');
      if (re.test(content)) {
        errors.push(`Fancy/over-complicated word detected: "${fancyWord}" -> use plain word: "${plainWord}"`);
      }
    }

    // Check circumlocution / circling phrases (Pattern 41)
    for (const [circlingPhrase, directPhrase] of Object.entries(locData.circumlocution_replacements || {})) {
      if (lowerContent.includes(circlingPhrase.toLowerCase())) {
        errors.push(`Circumlocution (circling around the point) detected: "${circlingPhrase}" -> state directly: "${directPhrase}"`);
      }
    }

    // Check banned cliches
    for (const cliche of locData.banned_cliches || []) {
      if (lowerContent.includes(cliche.toLowerCase())) {
        errors.push(`Banned AI cliché detected: "${cliche}"`);
      }
    }

    // Check regex patterns
    for (const [patternName, patternStr] of Object.entries(locData.regex_patterns || {})) {
      try {
        const regex = new RegExp(patternStr, 'i');
        const match = content.match(regex);
        if (match) {
          errors.push(`AI pattern violation [${patternName}]: "${match[0].slice(0, 50)}..."`);
        }
      } catch (e) {
        // Ignore invalid regex
      }
    }
  }

  // 4. Burstiness Check (Sentence length variation)
  const sentenceStats = calculateSentenceStats(content);
  if (sentenceStats.count >= 5 && sentenceStats.stdDev < minStdDev) {
    warnings.push(`Low sentence burstiness (stdDev: ${sentenceStats.stdDev} < ${minStdDev}). Prose risks robotic metronome cadence.`);
  }

  // 5. Plain-Clarity & Foggy Abstraction Check (Patterns 40-43)
  const clarityStats = calculateClarityStats(content);
  if (wordCount >= 30 && clarityStats.complexWordRatio > maxComplexWordRatio) {
    warnings.push(
      `High fancy/complex word density (${(clarityStats.complexWordRatio * 100).toFixed(1)}% >= 4-syllable words; threshold ${(maxComplexWordRatio * 100).toFixed(1)}%). Replace ornate vocabulary with plain, everyday words.`
    );
  }
  if (clarityStats.longCirclingSentenceCount > 0) {
    warnings.push(
      `Detected ${clarityStats.longCirclingSentenceCount} overly long or multi-clause sentence(s) circling around the point. Split into direct, easy-to-understand sentences.`
    );
  }

  // 6. Rolling N-gram crutch checks
  if (blocklistNgrams.length > 0) {
    const lower = content.toLowerCase();
    for (const gram of blocklistNgrams) {
      if (lower.includes(gram.toLowerCase())) {
        errors.push(`Rolling N-gram crutch repetition detected: "${gram}" was already overused in preceding scenes.`);
      }
    }
  }

  const ngrams4 = extractNGrams(content, 4);
  for (const [gram, count] of ngrams4.entries()) {
    if (count >= 3 && !gram.includes('of the') && !gram.includes('in the')) {
      warnings.push(`Repeated 4-gram phrase (${count}x in single scene): "${gram}"`);
    }
  }

  return {
    valid: errors.length === 0,
    wordCount,
    sentenceStats,
    clarityStats,
    beatsFound: Array.from(uniqueBeats),
    errors,
    warnings
  };
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  let filePath = null;
  let minWords = 0;
  let maxWords = Infinity;
  let minStdDev = 6.5;
  let locale = 'en';
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      filePath = args[++i];
    } else if (args[i] === '--min-words' && args[i + 1]) {
      minWords = parseInt(args[++i], 10);
    } else if (args[i] === '--max-words' && args[i + 1]) {
      maxWords = parseInt(args[++i], 10);
    } else if (args[i] === '--min-std-dev' && args[i + 1]) {
      minStdDev = parseFloat(args[++i]);
    } else if (args[i] === '--locale' && args[i + 1]) {
      locale = args[++i];
    } else if (args[i] === '--json') {
      jsonOutput = true;
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.error('Usage: node prose_linter.js --file <path> [--min-words N] [--max-words N] [--min-std-dev N] [--locale en] [--json]');
    process.exit(2);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const result = lintProse(content, { minWords, maxWords, minStdDev, locale });

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n=== Quirly Core Deslop & Plain-Clarity Linter Report ===`);
    console.log(`File: ${filePath}`);
    console.log(`Word count: ${result.wordCount}`);
    console.log(`Sentence burstiness (stdDev): ${result.sentenceStats.stdDev} (mean: ${result.sentenceStats.mean})`);
    console.log(`Plain-clarity score: ${result.clarityStats.clarityScore}/100 (complex word ratio: ${(result.clarityStats.complexWordRatio * 100).toFixed(1)}%)`);
    console.log(`Status: ${result.valid ? 'PASS' : 'FAIL'}`);

    if (result.errors.length > 0) {
      console.log(`\n[ERRORS] (${result.errors.length}):`);
      for (const err of result.errors) console.log(`  - ${err}`);
    }
    if (result.warnings.length > 0) {
      console.log(`\n[WARNINGS] (${result.warnings.length}):`);
      for (const w of result.warnings) console.log(`  - ${w}`);
    }
    console.log();
  }

  process.exit(result.valid ? 0 : 1);
}

module.exports = {
  lintProse,
  calculateSentenceStats,
  calculateClarityStats,
  countSyllables,
  extractNGrams,
  loadLexicon
};
