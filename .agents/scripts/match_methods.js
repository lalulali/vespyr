#!/usr/bin/env node
/**
 * Method Matcher — Find the top 5 most relevant elicitation methods for a given context
 */

const fs = require('fs');
const path = require('path');

// Simple CSV parser that handles quotes and commas
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  const headers = lines[0].split(',');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = [];
    let inQuotes = false;
    let currentField = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    row.push(currentField.trim());

    if (row.length >= headers.length) {
      const record = {};
      headers.forEach((header, idx) => {
        let val = row[idx] || '';
        // Strip leading/trailing quotes if present
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        record[header.trim()] = val;
      });
      records.push(record);
    }
  }

  return records;
}

function getMethodsPath() {
  const possiblePaths = [
    path.join(__dirname, '..', 'skills', 'elicitation', 'methods.csv'),
    path.join(__dirname, '..', '..', '.agents', 'skills', 'elicitation', 'methods.csv'),
    path.join(__dirname, '..', '..', '.opencode', 'skills', 'elicitation', 'methods.csv')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function tokenize(text) {
  if (!text) return [];
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'for', 'to',
    'in', 'on', 'at', 'by', 'from', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'of',
    'up', 'down', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
    'has', 'had', 'do', 'does', 'did', 'we', 'i', 'you', 'he', 'she', 'they',
    'it', 'our', 'my', 'your', 'his', 'her', 'their', 'its', 'this', 'that'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .split(/[\s_]+/)
    .filter(word => word.length > 1 && !stopWords.has(word));
}

// Map keywords to relevant categories or method names
const SYNONYMS = {
  'prd': ['requirements', 'product-manager', 'stories', 'scope', 'stakeholder', 'feature', 'pm'],
  'requirements': ['prd', 'scope', 'stories', 'pm', 'stakeholder'],
  'stories': ['requirements', 'prd', 'scenarios', 'acceptance'],
  'architecture': ['design', 'adr', 'database', 'api', 'system', 'structure', 'coupling', 'architect'],
  'design': ['architecture', 'layout', 'ui', 'ux', 'screens', 'flows', 'designer'],
  'api': ['architecture', 'contracts', 'interfaces', 'endpoint'],
  'database': ['models', 'schemas', 'sql', 'storage'],
  'code': ['bug', 'developer', 'develop', 'refactor', 'test', 'review', 'technical'],
  'bug': ['code', 'debug', 'troubleshoot', 'reproduce'],
  'test': ['qa', 'validation', 'verify', 'robustness', 'boundary', 'edge'],
  'risk': ['vulnerability', 'threat', 'security', 'failure', 'pre-mortem', 'mitigation'],
  'security': ['risk', 'threat', 'auth', 'vulnerability', 'hacker', 'audit'],
  'research': ['market', 'competitor', 'user', 'persona', 'exploration', 'analysis']
};

function expandKeywords(tokens) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    if (SYNONYMS[token]) {
      SYNONYMS[token].forEach(syn => expanded.add(syn));
    }
  }
  return expanded;
}

function scoreMethod(method, keywords) {
  let score = 0;
  const nameTokens = tokenize(method.method_name);
  const descTokens = tokenize(method.description);
  const catTokens = tokenize(method.category);

  keywords.forEach(kw => {
    if (nameTokens.includes(kw)) score += 4;
    if (catTokens.includes(kw)) score += 3;
    if (descTokens.includes(kw)) score += 1;
  });

  return score;
}

// Fallback high-quality default methods if no/low matches
const DEFAULT_METHODS = [
  'First Principles Analysis',
  'Critique and Refine',
  'Pre-mortem Analysis',
  '5 Whys Deep Dive',
  'Steelmanning'
];

function main() {
  const args = process.argv.slice(2);
  let contextIndex = args.indexOf('--context');
  let context = '';
  if (contextIndex !== -1 && args[contextIndex + 1]) {
    context = args[contextIndex + 1];
  } else {
    // If no explicit context argument, merge all args
    context = args.join(' ');
  }

  const methodsPath = getMethodsPath();
  if (!methodsPath) {
    console.error(JSON.stringify({ error: 'methods.csv not found' }));
    process.exit(1);
  }

  const content = fs.readFileSync(methodsPath, 'utf8');
  const methods = parseCSV(content);

  const tokens = tokenize(context);
  const keywords = expandKeywords(tokens);

  // Score each method
  const scored = methods.map(m => {
    return {
      method: m,
      score: scoreMethod(m, keywords)
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Get top 5 matches
  const topMatches = scored.filter(s => s.score > 0).slice(0, 5).map(s => s.method);

  // If we have fewer than 5 matches, fill with defaults
  while (topMatches.length < 5) {
    const nextDefault = DEFAULT_METHODS.find(defName => 
      !topMatches.some(m => m.method_name === defName)
    );
    if (!nextDefault) break;

    const defaultMethodObj = methods.find(m => m.method_name === nextDefault);
    if (defaultMethodObj) {
      topMatches.push(defaultMethodObj);
    } else {
      break;
    }
  }

  console.log(JSON.stringify(topMatches, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  parseCSV,
  tokenize,
  expandKeywords,
  scoreMethod
};
