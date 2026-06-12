#!/usr/bin/env node
/**
 * Dedupe Validator — Semantic Similarity for Memory Entry Titles
 * 
 * Uses a hybrid similarity approach combining:
 * 1. Word overlap with synonym expansion
 * 2. Character n-gram overlap for fuzzy matching
 * 3. Domain-aware keyword weighting
 * 
 * No heavy ML dependencies. Works out of the box.
 * 
 * Usage:
 *   node dedupe_validator.js --title "Implement OAuth2 login" --target artifacts/memory/active-decisions.md
 *   node dedupe_validator.js --title "Fix login bug" --target artifacts/memory/active-decisions.md --threshold 0.85
 */

const fs = require('fs');

// Synonym expansion table (aligned with memory-controller.md)
const SYNONYMS = {
  auth: ['authentication', 'authorization', 'session', 'token', 'jwt', 'oauth'],
  authentication: ['auth', 'authorization', 'session', 'token', 'jwt', 'oauth', 'login', 'signin'],
  authorization: ['auth', 'authentication', 'permission', 'access control'],
  login: ['signin', 'sign-in', 'authentication', 'auth', 'log in'],
  signin: ['login', 'sign-in', 'authentication', 'auth', 'sign in'],
  jwt: ['json web token', 'token', 'auth', 'session', 'bearer token'],
  oauth: ['oauth2', 'open authorization', 'auth', 'sso', 'social login'],
  db: ['database', 'data', 'schema', 'model', 'migration', 'query', 'sql', 'postgres', 'mongo'],
  database: ['db', 'data', 'schema', 'model', 'migration', 'query', 'sql', 'postgres'],
  schema: ['db', 'database', 'model', 'migration', 'table', 'structure'],
  migration: ['db', 'database', 'schema', 'model', 'migrate', 'upgrade'],
  api: ['endpoint', 'route', 'handler', 'controller', 'rest', 'graphql', 'interface'],
  endpoint: ['api', 'route', 'handler', 'controller', 'url', 'path'],
  route: ['api', 'endpoint', 'handler', 'controller', 'url', 'path'],
  test: ['testing', 'spec', 'coverage', 'assertion', 'mock', 'stub', 'fixture', 'qa', 'unit test'],
  testing: ['test', 'spec', 'coverage', 'assertion', 'mock', 'stub', 'fixture', 'qa'],
  deploy: ['deployment', 'release', 'ship', 'ci/cd', 'pipeline', 'rollout', 'infra', 'production'],
  deployment: ['deploy', 'release', 'ship', 'ci/cd', 'pipeline', 'rollout', 'production'],
  bug: ['error', 'issue', 'exception', 'failure', 'crash', 'regression', 'defect', 'fix'],
  error: ['bug', 'issue', 'exception', 'failure', 'crash', 'regression', 'defect'],
  fix: ['bug', 'patch', 'resolve', 'repair', 'correct'],
  perf: ['performance', 'latency', 'throughput', 'speed', 'slow', 'bottleneck', 'cache', 'optimize'],
  performance: ['perf', 'latency', 'throughput', 'speed', 'slow', 'bottleneck', 'cache', 'optimize'],
  security: ['secure', 'vulnerability', 'owasp', 'cve', 'threat', 'permission', 'encryption', 'safety'],
  vulnerability: ['security', 'cve', 'threat', 'exploit', 'weakness', 'flaw'],
  ui: ['ux', 'design', 'flow', 'screen', 'interaction', 'component', 'layout', 'accessibility', 'interface'],
  ux: ['ui', 'design', 'flow', 'screen', 'interaction', 'component', 'layout', 'accessibility', 'user experience'],
  design: ['ui', 'ux', 'flow', 'screen', 'interaction', 'component', 'layout', 'spec'],
  ml: ['ai', 'model', 'training', 'inference', 'prediction', 'feature', 'drift', 'pipeline', 'machine learning'],
  ai: ['ml', 'model', 'training', 'inference', 'prediction', 'feature', 'drift', 'artificial intelligence'],
  cache: ['caching', 'redis', 'memcached', 'performance', 'speed', 'optimize'],
  redis: ['cache', 'caching', 'store', 'performance'],
  config: ['configuration', 'settings', 'env', 'environment', 'setup'],
  configuration: ['config', 'settings', 'env', 'environment', 'setup'],
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'for', 'to', 'of', 'in', 'on', 'at', 'by',
  'with', 'from', 'that', 'this', 'it', 'be', 'as', 'or', 'and', 'but', 'not', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'its',
  'their', 'our', 'your', 'my', 'we', 'they', 'he', 'she', 'i', 'you'
]);

// Domain-specific keyword importance weights
const KEYWORD_WEIGHTS = {
  jwt: 3.0, oauth: 3.0, auth: 2.5, authentication: 2.5, authorization: 2.5,
  login: 2.5, signin: 2.5, token: 2.5, session: 2.0,
  database: 2.0, db: 2.0, schema: 2.0, migration: 2.0, model: 1.5, query: 1.5,
  api: 2.0, endpoint: 2.0, route: 2.0, controller: 1.5, handler: 1.5,
  test: 1.5, testing: 1.5, spec: 1.5, coverage: 1.5, mock: 1.5,
  deploy: 1.5, deployment: 1.5, release: 1.5, pipeline: 1.5,
  bug: 2.0, error: 2.0, fix: 2.0, crash: 2.0, regression: 2.0,
  perf: 2.0, performance: 2.0, latency: 2.0, bottleneck: 2.0, cache: 1.5, optimize: 1.5,
  security: 2.5, vulnerability: 2.5, threat: 2.0, encryption: 2.0,
  ui: 1.5, ux: 1.5, design: 1.5, component: 1.5,
  ml: 2.0, ai: 2.0, model: 1.5, training: 1.5, inference: 1.5,
};

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function expandSynonyms(words) {
  const expanded = new Map();
  for (const word of words) {
    expanded.set(word, (expanded.get(word) || 0) + 1);
    if (SYNONYMS[word]) {
      for (const syn of SYNONYMS[word]) {
        expanded.set(syn, (expanded.get(syn) || 0) + 0.7); // Slightly lower weight for synonyms
      }
    }
  }
  return expanded;
}

function getCharNgrams(text, n = 3) {
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ngrams = new Set();
  for (let i = 0; i <= clean.length - n; i++) {
    ngrams.add(clean.slice(i, i + n));
  }
  return ngrams;
}

function ngramSimilarity(text1, text2) {
  const ngrams1 = getCharNgrams(text1);
  const ngrams2 = getCharNgrams(text2);
  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
  const union = new Set([...ngrams1, ...ngrams2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function weightedOverlap(words1, words2) {
  const map1 = expandSynonyms(words1);
  const map2 = expandSynonyms(words2);

  let overlapScore = 0;
  let totalWeight = 0;

  // Check overlap in both directions
  for (const [word, count1] of map1) {
    const weight = KEYWORD_WEIGHTS[word] || 1.0;
    totalWeight += weight * count1;
    if (map2.has(word)) {
      const count2 = map2.get(word);
      overlapScore += weight * Math.min(count1, count2);
    }
  }

  for (const [word, count2] of map2) {
    const weight = KEYWORD_WEIGHTS[word] || 1.0;
    if (!map1.has(word)) {
      totalWeight += weight * count2;
    }
  }

  return totalWeight === 0 ? 0 : overlapScore / totalWeight;
}

function computeSimilarity(title1, title2) {
  const words1 = tokenize(title1);
  const words2 = tokenize(title2);

  if (words1.length === 0 || words2.length === 0) return 0;

  // Signal 1: Weighted word overlap with synonyms
  const wordSim = weightedOverlap(words1, words2);

  // Signal 2: Character n-gram overlap for fuzzy matching
  const ngramSim = ngramSimilarity(title1, title2);

  // Signal 3: Exact word overlap (without synonyms)
  const exactWords1 = new Set(words1);
  const exactWords2 = new Set(words2);
  const exactIntersection = new Set([...exactWords1].filter(x => exactWords2.has(x)));
  const exactUnion = new Set([...exactWords1, ...exactWords2]);
  const exactSim = exactUnion.size === 0 ? 0 : exactIntersection.size / exactUnion.size;

  // Combined score: weighted average
  // Word similarity is most important, but n-grams catch spelling variants and phrases
  const score = (wordSim * 0.5) + (ngramSim * 0.25) + (exactSim * 0.25);

  return Math.min(1.0, score);
}

function extractHeadersFromMarkdown(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const headers = [];
  // Match ### [DOMAIN] Title [date: ...] [agent: ...]
  const regex = /^###\s+\[.*?\]\s+(.+?)\s*\[/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    headers.push(match[1].trim());
  }
  return headers;
}

function dedupeCheck(title, targetFile, threshold = 0.85, possibleThreshold = 0.65) {
  const headers = extractHeadersFromMarkdown(targetFile);

  if (headers.length === 0) {
    return { status: 'pass', reason: 'no_existing_entries', score: 0 };
  }

  let bestMatch = null;
  let bestScore = 0;
  let allScores = [];

  for (const header of headers) {
    const score = computeSimilarity(title, header);
    allScores.push({ header, score });
    if (score > bestScore) {
      bestScore = score;
      bestMatch = header;
    }
  }

  // Sort by score for debugging
  allScores.sort((a, b) => b.score - a.score);

  if (bestScore >= threshold) {
    return {
      status: 'duplicate',
      match: bestMatch,
      score: bestScore,
      reason: 'similarity_above_threshold',
      top_matches: allScores.slice(0, 3)
    };
  }

  if (bestScore >= possibleThreshold) {
    return {
      status: 'possible_duplicate',
      match: bestMatch,
      score: bestScore,
      reason: 'similarity_possible',
      top_matches: allScores.slice(0, 3)
    };
  }

  return {
    status: 'pass',
    best_match: bestMatch,
    score: bestScore,
    reason: 'below_threshold',
    top_matches: allScores.slice(0, 3)
  };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node dedupe_validator.js --title "<title>" --target <file> [--threshold 0.70] [--possible-threshold 0.50]`);
    process.exit(0);
  }

  let title = null;
  let target = null;
  let threshold = 0.70;
  let possibleThreshold = 0.50;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title') title = args[i + 1];
    if (args[i] === '--target') target = args[i + 1];
    if (args[i] === '--threshold') threshold = parseFloat(args[i + 1]);
    if (args[i] === '--possible-threshold') possibleThreshold = parseFloat(args[i + 1]);
  }

  if (!title || !target) {
    console.error('Missing --title or --target');
    process.exit(1);
  }

  const result = dedupeCheck(title, target, threshold, possibleThreshold);
  console.log(JSON.stringify(result, null, 2));
}

main();
