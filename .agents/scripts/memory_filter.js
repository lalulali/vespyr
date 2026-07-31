#!/usr/bin/env node
/**
 * Memory Filter — Deterministic Keyword + Recency Scoring for Vespyr Memory
 *
 * Replaces the LLM-based two-stage hybrid scoring pipeline.
 * Fast, consistent, zero LLM tokens for computation.
 *
 * Usage:
 *   node memory_filter.js --agent developer --task "implement auth login"
 *   node memory_filter.js --agent architect --task "design data model" --max 10
 *   node memory_filter.js --search "JWT authentication decision" --max 5
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(process.cwd(), 'artifacts', 'memory');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive');
const SESSION_DIR = path.join(MEMORY_DIR, 'session-summaries');

/**
 * Phase 1.3 — Auto-create guard.
 * Guarantees session-summaries/ and its seed files exist before any
 * memory load or session-write operation. Runs on every filterMemory()
 * call so fresh clones, accidental deletions, and future inits are
 * all covered without manual setup steps.
 * This is intentionally silent (no stdout) — it must never pollute
 * the JSON output that callers parse.
 */
function ensureSessionSummaryFiles() {
  if (!fs.existsSync(SESSION_DIR)) {
    try { fs.mkdirSync(SESSION_DIR, { recursive: true }); } catch (e) { return; }
  }

  const latestPath = path.join(SESSION_DIR, 'latest.md');
  if (!fs.existsSync(latestPath)) {
    try {
      fs.writeFileSync(latestPath, [
        '# Session Summary (latest)',
        '',
        '## Last Session',
        '- **Date:** none',
        '- **Worked on:** No sessions recorded yet.',
        '- **Decisions:** none',
        '- **Next step:** Initialize project memory.',
        '',
        '## Active Blockers',
        'None',
        ''
      ].join('\n'), 'utf8');
    } catch (e) { /* non-blocking */ }
  }

  const historyPath = path.join(SESSION_DIR, 'history.md');
  if (!fs.existsSync(historyPath)) {
    try {
      fs.writeFileSync(historyPath, [
        '# Session History',
        '',
        '<!-- Each entry is appended by @memory-controller session-write. Format:',
        '## [YYYY-MM-DD] Agent: @{agent} — {topic}',
        '- Worked on: ...',
        '- Decisions: ...',
        '- Next step: ...',
        '- Blockers: ...',
        '-->',
        '',
        '(No sessions recorded yet.)',
        ''
      ].join('\n'), 'utf8');
    } catch (e) { /* non-blocking */ }
  }
}

// Agent profiles: which files to check + domain keywords
const AGENT_PROFILES = {
  developer: {
    tier2: ['patterns-and-conventions.md', 'active-decisions.md', 'blockers-and-risks.md', 'agent-notes/developer-notes.md'],
    domains: ['code', 'implementation', 'test', 'bug', 'refactor', 'pattern', 'dependency', 'api', 'database', 'auth'],
    max_results: 10
  },
  architect: {
    tier2: ['active-decisions.md', 'patterns-and-conventions.md', 'agent-notes/architect-notes.md'],
    domains: ['architecture', 'system', 'design', 'adr', 'tech stack', 'database', 'api', 'security', 'scalability', 'integration'],
    max_results: 10
  },
  'product-manager': {
    tier2: ['project-context.md', 'active-decisions.md', 'lessons-learned.md', 'blockers-and-risks.md', 'agent-notes/product-manager-notes.md'],
    domains: ['product', 'feature', 'requirement', 'user story', 'roadmap', 'priority', 'scope', 'metric', 'kpi', 'timeline', 'blocker', 'risk', 'milestone', 'sprint', 'stakeholder', 'delivery'],
    max_results: 10
  },
  'product-designer': {
    tier2: ['project-context.md', 'active-decisions.md', 'patterns-and-conventions.md'],
    domains: ['design', 'ux', 'ui', 'wireframe', 'screen', 'interaction', 'accessibility', 'prototype', 'design system'],
    max_results: 10
  },
  'tech-lead': {
    tier2: ['active-decisions.md', 'patterns-and-conventions.md', 'blockers-and-risks.md', 'agent-notes/tech-lead-notes.md'],
    domains: ['task', 'estimate', 'sprint', 'dependency', 'risk', 'execution', 'plan', 'milestone'],
    max_results: 10
  },
  founder: {
    tier2: ['project-context.md', 'active-decisions.md', 'lessons-learned.md'],
    domains: ['strategy', 'vision', 'market', 'user', 'business', 'pivot', 'assumption', 'risk'],
    max_results: 10
  },
  researcher: {
    tier2: ['project-context.md', 'active-decisions.md', 'lessons-learned.md'],
    domains: ['market', 'segment', 'tam', 'sam', 'trend', 'competitor', 'pricing', 'positioning', 'gap', 'growth', 'customer'],
    max_results: 10
  },
  'user-researcher': {
    tier2: ['project-context.md', 'lessons-learned.md'],
    domains: ['user', 'persona', 'pain point', 'journey', 'behavior', 'need', 'feedback'],
    max_results: 10
  },
  'qa-engineer': {
    tier2: ['patterns-and-conventions.md', 'active-decisions.md', 'blockers-and-risks.md'],
    domains: ['test', 'bug', 'regression', 'coverage', 'acceptance', 'quality', 'validation'],
    max_results: 5
  },
  'security-engineer': {
    tier2: ['active-decisions.md', 'agent-notes/architect-notes.md'],
    domains: ['security', 'auth', 'vulnerability', 'owasp', 'cve', 'threat', 'permission', 'encryption'],
    max_results: 10
  },
  'devops-engineer': {
    tier2: ['active-decisions.md', 'patterns-and-conventions.md'],
    domains: ['deploy', 'ci/cd', 'infrastructure', 'pipeline', 'environment', 'rollback', 'monitoring'],
    max_results: 10
  },
  'performance-engineer': {
    tier2: ['active-decisions.md', 'agent-notes/architect-notes.md'],
    domains: ['performance', 'latency', 'throughput', 'load', 'cache', 'query', 'bottleneck'],
    max_results: 10
  },
  'data-analyst': {
    tier2: ['project-context.md', 'active-decisions.md', 'lessons-learned.md'],
    domains: ['metric', 'analytics', 'measurement', 'kpi', 'funnel', 'retention', 'conversion'],
    max_results: 10
  },
  'technical-writer': {
    tier2: ['project-context.md', 'patterns-and-conventions.md'],
    domains: ['documentation', 'api', 'guide', 'changelog', 'runbook'],
    max_results: 10
  },
  'ux-researcher': {
    tier2: ['project-context.md', 'lessons-learned.md'],
    domains: ['usability', 'ux', 'accessibility', 'heuristic', 'flow', 'interaction'],
    max_results: 10
  },
  'ml-engineer': {
    tier2: ['active-decisions.md', 'patterns-and-conventions.md', 'agent-notes/architect-notes.md'],
    domains: ['ml', 'model', 'training', 'inference', 'pipeline', 'feature', 'data', 'drift'],
    max_results: 10
  },
  'code-reviewer': {
    tier2: ['patterns-and-conventions.md', 'active-decisions.md', 'blockers-and-risks.md'],
    domains: ['test', 'bug', 'regression', 'coverage', 'acceptance', 'quality', 'validation', 'pattern', 'anti-pattern'],
    max_results: 5
  }
};

// Synonym expansion map
const SYNONYMS = {
  auth: ['authentication', 'authorization', 'session', 'token', 'jwt', 'oauth', 'login', 'signin'],
  db: ['database', 'schema', 'model', 'migration', 'query', 'sql', 'nosql', 'postgres', 'mongo', 'redis'],
  api: ['endpoint', 'route', 'handler', 'controller', 'rest', 'graphql', 'request', 'response'],
  test: ['testing', 'spec', 'coverage', 'assertion', 'mock', 'stub', 'fixture', 'qa'],
  deploy: ['deployment', 'release', 'ship', 'ci/cd', 'pipeline', 'rollout', 'infra', 'infrastructure'],
  bug: ['error', 'issue', 'exception', 'failure', 'crash', 'regression', 'defect'],
  perf: ['performance', 'latency', 'throughput', 'speed', 'slow', 'bottleneck', 'cache'],
  security: ['secure', 'vulnerability', 'owasp', 'cve', 'threat', 'permission', 'encryption'],
  ui: ['ux', 'design', 'flow', 'screen', 'interaction', 'component', 'layout', 'accessibility'],
  ml: ['ai', 'model', 'training', 'inference', 'prediction', 'feature', 'drift', 'pipeline']
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'for', 'to', 'of', 'in', 'on', 'at', 'by',
  'with', 'from', 'that', 'this', 'it', 'be', 'as', 'or', 'and', 'but', 'not', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'its', 'their', 'our', 'your', 'my', 'we', 'they', 'he', 'she', 'i', 'you', 'implement',
  'add', 'create', 'build', 'fix', 'update', 'change', 'make', 'work', 'need', 'want'
]);

const AGENT_NAMES = new Set([
  'developer', 'architect', 'founder', 'product', 'manager', 'engineer',
  'researcher', 'analyst', 'writer', 'reviewer', 'tech', 'lead', 'qa',
  'security', 'devops', 'performance', 'data', 'technical', 'ux', 'ml'
]);

function extractKeywords(task) {
  const words = task.toLowerCase().replace(/[^a-z0-9\s/.-]/g, ' ').split(/\s+/).filter(Boolean);
  const expanded = new Set();

  for (const word of words) {
    if (STOP_WORDS.has(word) || AGENT_NAMES.has(word) || word.length < 2) continue;
    expanded.add(word);
    // Synonym expansion
    for (const [key, synonyms] of Object.entries(SYNONYMS)) {
      if (word === key || synonyms.includes(word)) {
        expanded.add(key);
        for (const s of synonyms) expanded.add(s);
      }
    }
  }

  return Array.from(expanded);
}

function parseSections(content, filename) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      if (currentSection) {
        currentSection.body = currentLines.join('\n');
        sections.push(currentSection);
      }
      const header = line.replace(/^###\s+/, '').trim();
      const statusMatch = header.match(/\[date:\s*(\d{4}-\d{2}-\d{2})\]/);
      const date = statusMatch ? statusMatch[1] : null;
      const isCritical = header.includes('[CRITICAL]');
      const isResolved = content.substring(content.indexOf(line)).includes('**Status:** resolved') ||
                         content.substring(content.indexOf(line)).includes('**Status:** superseded') ||
                         content.substring(content.indexOf(line)).includes('**Status:** archived');

      currentSection = {
        header,
        file: filename,
        date,
        isCritical,
        isResolved,
        lines: [],
        body: ''
      };
      currentLines = [line];
    } else if (currentSection) {
      currentLines.push(line);
    }
  }

  if (currentSection) {
    currentSection.body = currentLines.join('\n');
    sections.push(currentSection);
  }

  return sections;
}

function scoreSection(section, keywords, now) {
  if (section.isResolved) return null; // Skip resolved sections

  let score = 0;
  const headerLower = section.header.toLowerCase();
  const bodyLower = section.body.toLowerCase();

  for (const kw of keywords) {
    // Exact keyword match in header
    if (headerLower.includes(kw)) score += 3;
    // Exact keyword match in body (max +5)
    const bodyMatches = (bodyLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    score += Math.min(bodyMatches, 5);
  }

  // Domain tag match
  const domainMatch = headerLower.match(/\[([a-z]+)\]/);
  if (domainMatch) {
    const domain = domainMatch[1];
    if (keywords.some(kw => domain.includes(kw) || kw.includes(domain))) score += 2;
  }

  // Age penalty
  if (section.date) {
    const age = Math.floor((now - new Date(section.date)) / (1000 * 60 * 60 * 24));
    if (age > 180) score -= 2;
    else if (age > 90) score -= 1;
    else if (age < 14) score += 1; // Recency bonus
  }

  // Critical bonus
  if (section.isCritical) score += 3;

  return score;
}

function filterMemory(agent, task, maxResults) {
  // Phase 1.3 guard: guarantee session-summaries/ exists before any load.
  ensureSessionSummaryFiles();

  const profile = AGENT_PROFILES[agent];
  if (!profile) {
    return { error: `Unknown agent: ${agent}. Available: ${Object.keys(AGENT_PROFILES).join(', ')}` };
  }

  // Use profile-specific max if not explicitly provided
  const max = maxResults || profile.max_results || 10;
  const keywords = extractKeywords(task);
  const now = new Date();
  const allSections = [];

  // Read all memory files (not just tier2 — tier3 scans everything)
  const memoryFiles = [];
  if (fs.existsSync(MEMORY_DIR)) {
    for (const f of fs.readdirSync(MEMORY_DIR)) {
      if (f.endsWith('.md') && !f.startsWith('session-')) {
        memoryFiles.push(f);
      }
      // Also check agent-notes subdirectory
      if (f === 'agent-notes' && fs.existsSync(path.join(MEMORY_DIR, f))) {
        for (const sf of fs.readdirSync(path.join(MEMORY_DIR, f))) {
          if (sf.endsWith('.md')) {
            memoryFiles.push(`agent-notes/${sf}`);
          }
        }
      }
    }
  }

  for (const file of memoryFiles) {
    const filePath = path.join(MEMORY_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const sections = parseSections(content, file);
      for (const section of sections) {
        const score = scoreSection(section, keywords, now);
        if (score !== null && score >= 2) {
          allSections.push({ ...section, score });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }

  // Sort by score descending, then by date (newer first)
  allSections.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return 0;
  });

  const results = allSections.slice(0, max).map(s => ({
    header: s.header,
    file: s.file,
    score: s.score,
    date: s.date,
    isCritical: s.isCritical,
    // Truncate body to first 3 sentences
    preview: s.body.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ')
  }));

  return {
    agent,
    task,
    keywords,
    total_sections_scanned: allSections.length + (allSections.length > 0 ? 0 : 0),
    results_returned: results.length,
    results
  };
}

function searchArchive(query, maxResults = 5) {
  const indexFile = path.join(ARCHIVE_DIR, 'index.json');
  if (!fs.existsSync(indexFile)) {
    return { error: 'Archive is empty — no entries have been compacted yet.' };
  }

  const keywords = extractKeywords(query);
  let data;
  try {
    const content = fs.readFileSync(indexFile, 'utf8');
    data = JSON.parse(content);
  } catch (e) {
    return { error: `Invalid archive index: ${e.message}` };
  }

  const entries = data.entries || [];
  const scored = [];

  for (const entry of entries) {
    let score = 0;
    const titleLower = (entry.title || '').toLowerCase();
    const summaryLower = (entry.summary || '').toLowerCase();
    const domainLower = (entry.domain || '').toLowerCase();
    const entryKeywords = (entry.keywords || []).map(k => k.toLowerCase());

    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 3;
      if (entryKeywords.some(ek => ek.includes(kw) || kw.includes(ek))) score += 2;
      const matches = (summaryLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      score += Math.min(matches, 4);
      if (domainLower.includes(kw)) score += 2;
    }

    if (score >= 2) {
      scored.push({ ...entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, maxResults).map(e => ({
    id: e.id,
    title: e.title,
    domain: e.domain,
    date: e.date,
    status: e.status,
    score: e.score,
    summary: e.summary,
    location: e.location
  }));

  return { query, keywords, results_returned: results.length, results };
}

// CLI
function prefetchPatterns(agent, phase) {
  const patternsFile = path.join(MEMORY_DIR, 'patterns-and-conventions.md');
  if (!fs.existsSync(patternsFile)) {
    console.log('[PREFETCH] no patterns file');
    return;
  }
  const content = fs.readFileSync(patternsFile, 'utf8');
  const entries = content.split(/^###\s+/m).filter(function(s) { return s.trim(); });
  const matched = entries.filter(function(e) {
    const lower = e.toLowerCase();
    return lower.includes('[agent: @' + agent + ']') ||
           lower.includes('[agent: ' + agent + ']') ||
           lower.includes('[phase: ' + phase + ']');
  }).slice(0, 5);

  if (matched.length === 0) {
    console.log('[PREFETCH] no matching patterns');
    return;
  }
  console.log('[PREFETCH — top 5 patterns for ' + agent + ' / ' + phase + ']');
  for (const entry of matched) {
    const lines = entry.split('\n').filter(function(l) { return l.trim(); });
    const title = lines[0] || '(untitled)';
    const detail = lines.slice(1, 3).join(' ');
    console.log('- ' + title);
    if (detail) {
      const truncated = detail.substring(0, 120);
      console.log('  ' + truncated + (detail.length > 120 ? '...' : ''));
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node memory_filter.js --agent <agent> --task "<task description>" [--max N]
  node memory_filter.js --search "<query>" [--max N]

Agents: ${Object.keys(AGENT_PROFILES).join(', ')}`);
    process.exit(0);
  }

  let agent = null;
  let task = null;
  let searchQuery = null;
  let max = null;
  let phase = null;
  let prefetch = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--agent') agent = args[i + 1];
    if (args[i] === '--task') task = args[i + 1];
    if (args[i] === '--search') searchQuery = args[i + 1];
    if (args[i] === '--max') max = parseInt(args[i + 1], 10);
    if (args[i] === '--phase') phase = args[i + 1];
    if (args[i] === '--prefetch-patterns') prefetch = true;
  }

  if (prefetch && agent && phase) {
    prefetchPatterns(agent, phase);
    return;
  }

  if (searchQuery) {
    const result = searchArchive(searchQuery, max || 5);
    console.log(JSON.stringify(result, null, 2));
  } else if (agent && task) {
    const result = filterMemory(agent, task, max);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error('Missing --agent/--task or --search');
    process.exit(1);
  }
}

main();
