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

function getMethodsPaths(source) {
  const base = path.join(__dirname, '..', 'skills');
  const sources = {
    elicitation: path.join(base, 'elicitation', 'methods.csv'),
    brainstorming: path.join(base, 'brainstorming', 'methods.csv'),
    validation: path.join(base, 'validation-patterns', 'methods.csv'),
  };
  if (source && sources[source]) {
    const p = sources[source];
    return fs.existsSync(p) ? [p] : [];
  }
  // default: all three
  return Object.values(sources).filter(p => fs.existsSync(p));
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

function main() {
  const args = process.argv.slice(2);
  let contextIndex = args.indexOf('--context');
  let context = '';
  if (contextIndex !== -1 && args[contextIndex + 1]) {
    context = args[contextIndex + 1];
  } else {
    context = args.join(' ');
  }

  let source = null;
  const sourceIndex = args.indexOf('--source');
  if (sourceIndex !== -1 && args[sourceIndex + 1]) {
    source = args[sourceIndex + 1];
  }

  let topN = 5;
  const topIndex = args.indexOf('--top');
  if (topIndex !== -1 && args[topIndex + 1]) {
    topN = parseInt(args[topIndex + 1], 10) || 5;
  }

  const paths = getMethodsPaths(source);
  if (paths.length === 0) {
    console.error(JSON.stringify({ error: 'No method CSV files found' }));
    process.exit(1);
  }

  const allMethods = [];
  for (const p of paths) {
    const content = fs.readFileSync(p, 'utf8');
    const methods = parseCSV(content);
    const sourceName = path.basename(path.dirname(p));
    for (const m of methods) {
      m.source = sourceName;
      allMethods.push(m);
    }
  }

  const tokens = tokenize(context);
  const keywords = expandKeywords(tokens);

  const scored = allMethods.map(m => ({
    method: m,
    score: scoreMethod(m, keywords)
  }));

  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.filter(s => s.score > 0).slice(0, topN).map(s => ({
    method_name: s.method.method_name,
    category: s.method.category,
    source: s.method.source,
    score: s.score,
    description: s.method.description
  }));

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
