#!/usr/bin/env node
/**
 * self_learn.js — 3-tier self-learning pipeline (F2.11/F2.12, spec 03e §9).
 *
 *   Tier 1 episodes   .agents/state/episodes.ndjson              (raw, ephemeral)
 *   Tier 2 patterns   artifacts/memory/patterns-and-conventions.md (curated)
 *   Tier 3 instincts  artifacts/memory/instincts.md              (auto-loaded, house style)
 *
 * Promotion rules (all required for a pattern): >=3 occurrences, >=2 agents,
 * >=7 day span. Instinct promotion is human-in-the-loop (--approve) and needs
 * >=30 days stable plus >=2 ADR references. Nothing is promoted on age alone.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { scrubSecrets, sanitizeContent } = require('./memory_write');
const { withLock } = require('./lib/lock');
const { writeFileSync: atomicWriteFileSync } = require('./lib/fs_atomic');

const DAY = 86400000;
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'onto', 'over',
  'when', 'then', 'than', 'also', 'just', 'only', 'very', 'more', 'most',
  'to', 'in', 'on', 'of', 'at', 'by', 'is', 'it', 'or', 'as', 'an', 'be',
  'do', 'we', 'no', 'so', 'up', 'if', 'a',
]);

function paths(root = process.cwd()) {
  const memory = path.join(root, 'artifacts', 'memory');
  const state = path.join(root, '.agents', 'state');
  return {
    root,
    memory,
    episodes: path.join(state, 'episodes.ndjson'),
    patterns: path.join(memory, 'patterns-and-conventions.md'),
    instincts: path.join(memory, 'instincts.md'),
    adr: path.join(root, 'artifacts', 'output', '04-architecture'),
    state,
    lock: path.join(state, 'memory.lock'),
    hits: path.join(state, 'instinct-hits.json'),
    digest: path.join(state, 'self-learning-digest.md'),
    witness: path.join(state, 'witness.json'),
  };
}

/** Parse CLI flags sequentially so a value passed to --summary cannot hijack --agent/--title/--root. */
const VALUE_FLAGS = new Set([
  'root', 'since', 'min-occurrences', 'min-agents', 'min-span-days',
  'title', 'occurrences', 'agents', 'last-seen', 'pattern', 'id',
  'reason', 'min-sessions', 'agent', 'summary', 'context', 'outcome',
]);

function parseFlags(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = String(args[i]);
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) {
      out[a.slice(2, eq)] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    if (i + 1 < args.length && (VALUE_FLAGS.has(key) || !String(args[i + 1]).startsWith('--'))) {
      out[key] = args[i + 1];
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function flag(args, name, fallback = null) {
  const parsed = parseFlags(args);
  if (parsed[name] === undefined || parsed[name] === true) return fallback;
  return parsed[name];
}

function has(args, name) {
  const parsed = parseFlags(args);
  return parsed[name] !== undefined && parsed[name] !== false;
}

function days(args, fallback = 30) {
  const v = flag(args, 'since', `${fallback}d`);
  return parseInt(String(v).replace(/\D/g, ''), 10) || fallback;
}

function readIf(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  atomicWriteFileSync(file, text, 'utf8');
}

function today() { return new Date().toISOString().slice(0, 10); }

function safeAgent(raw) {
  const clean = String(raw || '').trim().replace(/^@+/, '');
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(clean)) {
    throw new Error(`Invalid agent name: ${raw}`);
  }
  return clean;
}

function cleanText(text) {
  return scrubSecrets(sanitizeContent(String(text || '')));
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function refreshWitnessIfActive(p, filePath) {
  if (!fs.existsSync(p.witness)) return;
  try {
    const { signFiles } = require('./memory_check');
    if (typeof signFiles === 'function') signFiles([filePath], p.root);
  } catch { /* non-blocking if witness helper unavailable */ }
}

/** Tier 1: parse dated episodes from .agents/state/episodes.ndjson. */
function parseEpisodes(p, sinceDays) {
  const cutoff = Date.now() - sinceDays * DAY;
  const episodes = [];
  if (!fs.existsSync(p.episodes)) return episodes;
  for (const line of fs.readFileSync(p.episodes, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const ep = JSON.parse(line);
      const t = Date.parse(ep.date || ep.ts);
      if (!Number.isFinite(t) || t < cutoff) continue;
      episodes.push({
        domain: ep.domain || 'CODE',
        title: String(ep.title || '').trim(),
        date: ep.date || new Date(t).toISOString().slice(0, 10),
        agent: String(ep.agent || 'unknown').replace(/^@+/, ''),
      });
    } catch { /* skip malformed line */ }
  }
  return episodes;
}

function meaningfulTokens(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function clusterKey(title) {
  const clean = String(title || '').trim().toLowerCase();
  if (!clean || clean === 'session outcome') return '';
  return [...new Set(meaningfulTokens(clean))].sort().slice(0, 6).join(' ');
}

function findPatternCandidates(episodes, minOccurrences = 3, minAgents = 2, minSpanDays = 7) {
  const clusters = new Map();
  for (const ep of episodes) {
    const key = clusterKey(ep.title);
    if (!key) continue;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(ep);
  }
  const candidates = [];
  const multiClusters = [];
  for (const [key, eps] of clusters) {
    if (eps.length >= minOccurrences) multiClusters.push(eps);
    if (eps.length < minOccurrences) continue;
    const agents = [...new Set(eps.map((e) => e.agent))];
    if (agents.length < minAgents) continue;
    const times = eps.map((e) => Date.parse(e.date)).filter(Number.isFinite);
    if (!times.length) continue;
    const spanDays = (Math.max(...times) - Math.min(...times)) / DAY;
    if (spanDays < minSpanDays) continue;
    candidates.push({ key, title: eps[0].title, occurrences: eps.length, agents, spanDays, dates: eps.map((e) => e.date) });
  }
  return { clusters: multiClusters, candidates };
}

const PATTERN_RE = /^###\s+\[PATTERN\]\s+(.+?)\s+\[promoted:\s*(\d{4}-\d{2}-\d{2})\](?:\s+\[date:\s*(\d{4}-\d{2}-\d{2})\])?\s+\[occurrences:\s*(\d+)\]\s+\[agents:\s*([^\]]+)\](?:\s+\[agent:\s*@?([^\]]+)\])?(?:\s+\[last_seen:\s*(\d{4}-\d{2}-\d{2})\])?/gm;

function loadPatterns(p) {
  const text = readIf(p.patterns);
  const out = [];
  let m;
  PATTERN_RE.lastIndex = 0;
  while ((m = PATTERN_RE.exec(text)) !== null) {
    out.push({
      title: m[1].trim(),
      promoted: m[2],
      occurrences: +m[4],
      agents: m[5].split(/[, ]+/).map((a) => a.replace(/^@+/, '').trim()).filter(Boolean),
      last_seen: m[7] || m[3] || m[2],
      rawHeader: m[0],
    });
  }
  return out;
}

/** Sync existing [PATTERN] occurrences and last_seen against recent episodes. */
function syncPatternsFromEpisodes(p, episodes) {
  if (!fs.existsSync(p.patterns) || !episodes.length) return 0;
  let patterns = loadPatterns(p);
  if (!patterns.length) return 0;
  let updated = 0;
  let text = readIf(p.patterns);
  for (const pat of patterns) {
    const key = clusterKey(pat.title);
    if (!key) continue;
    const matched = episodes.filter((ep) => clusterKey(ep.title) === key);
    if (!matched.length) continue;
    const maxDate = matched.map((e) => e.date).sort().pop();
    const nextOcc = Math.max(pat.occurrences, matched.length);
    const nextSeen = maxDate > pat.last_seen ? maxDate : pat.last_seen;
    const mergedAgents = [...new Set([...pat.agents, ...matched.map((e) => e.agent)])];
    if (nextOcc === pat.occurrences && nextSeen === pat.last_seen && mergedAgents.length === pat.agents.length) continue;
    const newHeader = `### [PATTERN] ${pat.title} [promoted: ${pat.promoted}] [date: ${nextSeen}] [occurrences: ${nextOcc}] [agents: ${mergedAgents.join(', ')}] [agent: @self-learning] [last_seen: ${nextSeen}]`;
    text = text.replace(pat.rawHeader, newHeader);
    updated++;
  }
  if (updated > 0) {
    withLock(p.lock, () => {
      atomicWrite(p.patterns, text);
      refreshWitnessIfActive(p, p.patterns);
    });
  }
  return updated;
}

function countAdrRefs(p, pattern) {
  if (!fs.existsSync(p.adr)) return 0;
  const tokens = meaningfulTokens(pattern.title);
  if (!tokens.length) return 0;
  const requiredMatches = tokens.length >= 2 ? Math.ceil(tokens.length / 2) : 1;
  return fs.readdirSync(p.adr).filter((f) => {
    if (!f.endsWith('.md')) return false;
    const content = readIf(path.join(p.adr, f)).toLowerCase();
    const hits = tokens.filter((t) => new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i').test(content)).length;
    return hits >= requiredMatches;
  }).length;
}

function promotePattern(p, args) {
  const rawTitle = flag(args, 'title');
  if (!rawTitle) throw new Error('promote-pattern requires --title=...');
  const title = safeTitle(cleanText(rawTitle));
  const occurrences = Number(flag(args, 'occurrences', '3'));
  if (!Number.isInteger(occurrences) || occurrences < 3) {
    throw new Error('promote-pattern requires --occurrences >= 3');
  }
  const agents = (flag(args, 'agents', 'unknown') || 'unknown')
    .split(/[, ]+/)
    .map((a) => cleanText(a).replace(/^@+/, '').trim())
    .filter(Boolean);
  const seen = flag(args, 'last-seen', today());
  if (Number.isNaN(Date.parse(seen))) throw new Error(`Invalid --last-seen date: ${seen}`);

  return withLock(p.lock, () => {
    const patterns = loadPatterns(p);
    const existing = patterns.find((x) => x.title.toLowerCase() === title.toLowerCase());
    let text = readIf(p.patterns) || '# Patterns & Conventions\n\n';
    if (existing) {
      const nextOccurrences = Math.max(existing.occurrences, occurrences);
      const nextSeen = existing.last_seen > seen ? existing.last_seen : seen;
      const mergedAgents = [...new Set([...existing.agents, ...agents])];
      const newHeader = `### [PATTERN] ${existing.title} [promoted: ${existing.promoted}] [date: ${nextSeen}] [occurrences: ${nextOccurrences}] [agents: ${mergedAgents.join(', ')}] [agent: @self-learning] [last_seen: ${nextSeen}]`;
      text = text.replace(existing.rawHeader, newHeader);
    } else {
      const d = today();
      text += `\n### [PATTERN] ${title} [promoted: ${d}] [date: ${seen}] [occurrences: ${occurrences}] [agents: ${agents.join(', ')}] [agent: @self-learning] [last_seen: ${seen}]\n\n**Status:** active\n`;
    }
    atomicWrite(p.patterns, text);
    refreshWitnessIfActive(p, p.patterns);
    return { title, created: !existing, occurrences, agents };
  });
}

function instinctsSections(p) {
  const text = readIf(p.instincts);
  const demotedIdx = text.search(/^##\s+Demoted/mi);
  const re = /^###\s+\[(INS-\d+)\]\s+(.+?)\n([\s\S]*?)(?=^###\s|^##\s|(?![\s\S]))/gm;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({
      id: m[1],
      title: m[2].trim(),
      body: m[3],
      raw: m[0],
      demoted: demotedIdx !== -1 && m.index > demotedIdx,
    });
  }
  return out;
}

function nextInstinctId(sections) {
  const nums = sections.map((s) => parseInt(s.id.slice(4), 10)).filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `INS-${String(max + 1).padStart(3, '0')}`;
}

function promoteInstinct(p, args) {
  if (!has(args, 'approve')) throw new Error('promote-instinct requires explicit --approve (human-in-the-loop)');
  const title = flag(args, 'pattern') || flag(args, 'title');
  if (!title) throw new Error('promote-instinct requires --pattern=...');
  const pattern = loadPatterns(p).find((x) => x.title.toLowerCase() === title.toLowerCase());
  if (!pattern) throw new Error(`Pattern not found: ${title}`);
  const promotedMs = Date.parse(pattern.promoted);
  if (!Number.isFinite(promotedMs)) throw new Error(`Invalid pattern promoted date: ${pattern.promoted}`);
  const ageDays = (Date.now() - promotedMs) / DAY;
  if (ageDays < 30) throw new Error(`Pattern is only ${ageDays.toFixed(0)} days stable; 30+ required`);
  const adrRefs = countAdrRefs(p, pattern);
  if (adrRefs < 2) throw new Error(`Pattern has ${adrRefs} ADR refs; 2+ required`);

  return withLock(p.lock, () => {
    const sections = instinctsSections(p);
    if (sections.some((s) => !s.demoted && s.title.toLowerCase() === pattern.title.toLowerCase())) {
      throw new Error(`Pattern already promoted as active instinct: ${pattern.title}`);
    }
    const id = flag(args, 'id') || nextInstinctId(sections);
    let text = readIf(p.instincts) || '# Instincts\n\n## Active Instincts\n\n## Demoted Instincts\n';
    const entry = `### [${id}] ${pattern.title}\n**Source pattern:** ${pattern.title}\n**Promoted:** ${today()}\n**Evidence:** ${adrRefs} ADR references\n**Status:** active\n\n`;
    const marker = '## Demoted Instincts';
    if (text.includes(marker)) text = text.replace(marker, entry + marker);
    else text += '\n' + entry;
    atomicWrite(p.instincts, text);
    return { id, title: pattern.title, adrRefs };
  });
}

function demoteInstinct(p, args) {
  const id = flag(args, 'id') || flag(args, 'pattern');
  const reason = cleanText(flag(args, 'reason', 'no reason recorded'));
  if (!id) throw new Error('demote-instinct requires --id=...');
  return withLock(p.lock, () => {
    let text = readIf(p.instincts);
    const section = instinctsSections(p).find((s) => s.id === id);
    if (!section) throw new Error(`Instinct not found: ${id}`);
    if (section.demoted) throw new Error(`${id} is already demoted`);
    const moved = `### [${id}] ${section.title}\n**Demoted:** ${today()}\n**Reason:** ${reason}\n**Status:** archived\n\n`;
    text = text.replace(section.raw, '').replace('## Demoted Instincts', '## Demoted Instincts\n\n' + moved);
    atomicWrite(p.instincts, text);
    return { id, reason };
  });
}

function stalePatterns(p) {
  const recentEps = parseEpisodes(p, 90);
  return loadPatterns(p).filter((x) => {
    const lastMs = Date.parse(x.last_seen);
    if (!Number.isFinite(lastMs)) return false;
    const age = (Date.now() - lastMs) / DAY;
    if (age <= 90) return false;
    const key = clusterKey(x.title);
    const recentMatches = key ? recentEps.filter((ep) => clusterKey(ep.title) === key).length : 0;
    return x.occurrences < 3 || recentMatches < 3;
  });
}

function readHits(p) {
  if (!fs.existsSync(p.hits)) return [];
  return fs.readFileSync(p.hits, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
    try {
      const v = JSON.parse(line);
      return Array.isArray(v) ? v : [v];
    } catch { return []; }
  });
}

function percentile(sorted, q) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1);
  return sorted[idx];
}

function instinctCost(p, args) {
  const since = days(args, 7);
  const cutoff = Date.now() - since * DAY;
  const hits = readHits(p).filter((e) =>
    e.type === 'load' &&
    Array.isArray(e.instinct_ids) && e.instinct_ids.length > 0 &&
    new Date(e.ts).getTime() >= cutoff
  );
  const tokens = hits.map((e) => Number(e.tokens) || 0).sort((a, b) => a - b);
  const total = tokens.reduce((a, b) => a + b, 0);
  const report = {
    since_days: since,
    total_loads: hits.length,
    avg_tokens: hits.length ? Math.round(total / hits.length) : 0,
    p95: percentile(tokens, 0.95),
    p95_tokens: percentile(tokens, 0.95),
    over_cap_count: tokens.filter((t) => t > 200).length,
    cap: 200,
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

/** F2.15.a: compute distinct-session instinct citation rate over rolling window. */
function citationRate(p, args) {
  const since = days(args, 14);
  const minSessions = Number(flag(args, 'min-sessions', '10')) || 10;
  const cutoff = Date.now() - since * DAY;
  const events = readHits(p).filter((e) => e.session_id && new Date(e.ts).getTime() >= cutoff);
  const loadedByInstinct = new Map();
  const citedByInstinct = new Map();
  const allLoadedSessions = new Set();

  for (const e of events) {
    const ids = Array.isArray(e.instinct_ids) ? e.instinct_ids : [];
    if (!ids.length) continue;
    if (e.type === 'load') {
      allLoadedSessions.add(e.session_id);
      for (const id of ids) {
        if (!loadedByInstinct.has(id)) loadedByInstinct.set(id, new Set());
        loadedByInstinct.get(id).add(e.session_id);
      }
    } else if (e.type === 'cite') {
      for (const id of ids) {
        if (!citedByInstinct.has(id)) citedByInstinct.set(id, new Set());
        citedByInstinct.get(id).add(e.session_id);
      }
    }
  }

  const byInstinct = {};
  for (const [id, loadSet] of loadedByInstinct) {
    const citeSet = citedByInstinct.get(id) || new Set();
    const pairedCites = [...citeSet].filter((sid) => loadSet.has(sid)).length;
    byInstinct[id] = {
      loaded_sessions: loadSet.size,
      cited_sessions: pairedCites,
      citation_rate: loadSet.size ? Number((pairedCites / loadSet.size).toFixed(3)) : 0,
    };
  }

  const report = {
    since_days: since,
    min_sessions: minSessions,
    distinct_loaded_sessions: allLoadedSessions.size,
    insufficient_sample: allLoadedSessions.size < minSessions,
    by_instinct: byInstinct,
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function scan(p, args) {
  const sinceDays = days(args, 30);
  const episodes = parseEpisodes(p, sinceDays);
  syncPatternsFromEpisodes(p, episodes);
  const { clusters, candidates } = findPatternCandidates(
    episodes,
    +(flag(args, 'min-occurrences', '3')),
    +(flag(args, 'min-agents', '2')),
    +(flag(args, 'min-span-days', '7'))
  );
  const patterns = loadPatterns(p);
  const stale = stalePatterns(p);
  const instinctCandidates = patterns.filter((x) => {
    const t = Date.parse(x.promoted);
    if (!Number.isFinite(t)) return false;
    return (Date.now() - t) / DAY >= 30 && countAdrRefs(p, x) >= 2;
  });
  const digest = [
    '# Self-Learning Digest',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Episodes scanned (last ${sinceDays}d): ${episodes.length}`,
    `Clusters (3+): ${clusters.length}`,
    `Pattern candidates: ${candidates.length}`,
    `Curated patterns: ${patterns.length}`,
    `Instinct candidates (30d + 2 ADRs): ${instinctCandidates.length}`,
    `Stale patterns (last_seen > 90d, <3 recent occurrences): ${stale.length}`,
    '',
    '## Candidates',
    ...candidates.map((c) => `- ${c.title} — ${c.occurrences} episodes, ${c.agents.length} agents, ${c.spanDays.toFixed(0)}d span`),
    '',
    '## Stale patterns',
    ...stale.map((s) => `- ${s.title} — last seen ${s.last_seen}, ${s.occurrences} occurrences`),
    '',
  ].join('\n');
  atomicWrite(p.digest, digest);
  if (!has(args, 'quiet')) console.log(digest);
  return { episodes: episodes.length, candidates: candidates.length, stale: stale.length, digest: p.digest };
}

const DOMAIN_HINTS = [
  [/test|qa|coverage|regress|bug/i, 'TEST'],
  [/security|audit|compliance|privacy/i, 'SECURITY'],
  [/design|ux|wireframe|accessib/i, 'UX'],
  [/architect|adr|trade.?off|topolog/i, 'ARCH'],
  [/deploy|release|launch|ship/i, 'INFRA'],
  [/memory|instinct|pattern|learn/i, 'PROCESS'],
  [/api|database|schema|query/i, 'DATA'],
];

function inferDomain(text) {
  const hit = DOMAIN_HINTS.find(([re]) => re.test(text));
  return hit ? hit[1] : 'CODE';
}

/** Sanitize a model-written title so it cannot break headers or leak injections. */
function safeTitle(text) {
  return cleanText(text || 'session outcome')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 120) || 'session outcome';
}

/** Tier 1: append one episode to .agents/state/episodes.ndjson (02i-compliant). */
function recordEpisode(p, args) {
  const agent = safeAgent(flag(args, 'agent', 'unknown'));
  const title = safeTitle(flag(args, 'title') || flag(args, 'summary'));
  const domain = inferDomain(`${title} ${cleanText(flag(args, 'summary', ''))}`);
  const context = safeTitle(flag(args, 'context', 'session end')).slice(0, 300);
  const outcome = safeTitle(flag(args, 'outcome', 'no explicit outcome')).slice(0, 300);
  const row = {
    ts: new Date().toISOString(),
    date: today(),
    domain,
    title,
    agent,
    context,
    outcome,
  };
  withLock(p.lock, () => {
    fs.mkdirSync(path.dirname(p.episodes), { recursive: true });
    fs.appendFileSync(p.episodes, JSON.stringify(row) + '\n', 'utf8');
  });
  return { file: path.relative(p.root, p.episodes), domain, title, agent };
}

function autoCapture(p, args) {
  const episode = recordEpisode(p, args);
  const marker = path.join(p.state, 'self-learning-last-scan');
  const last = readIf(marker).trim();
  let scanResult = 'skipped';
  if (last !== today()) {
    scan(p, ['--since=30d', '--quiet']);
    fs.mkdirSync(p.state, { recursive: true });
    atomicWrite(marker, today() + '\n');
    scanResult = 'ran';
  }
  return { episode, scan: scanResult };
}

/**
 * Surface actionable next steps for mid-session or retro review:
 * pattern promotions, instinct promotions, /create-skill candidates, and /create-agent candidates.
 */
function suggest(p, args) {
  const sinceDays = days(args, 30);
  const episodes = parseEpisodes(p, sinceDays);
  const { candidates: patternCandidates } = findPatternCandidates(episodes, 3, 2, 7);
  const patterns = loadPatterns(p);
  const activeInstincts = instinctsSections(p).filter((s) => !s.demoted);
  const instinctCandidates = patterns.filter((x) => {
    const t = Date.parse(x.promoted);
    if (!Number.isFinite(t)) return false;
    const alreadyActive = activeInstincts.some((i) => i.title.toLowerCase() === x.title.toLowerCase());
    return !alreadyActive && (Date.now() - t) / DAY >= 30 && countAdrRefs(p, x) >= 2;
  });

  const WORKFLOW_RE = /\b(workflow|checklist|step|pipeline|procedure|runbook|audit|migrate|deploy|verify|scaffold|script)\b/i;
  const createSkillCandidates = [];
  for (const pat of patterns) {
    if (WORKFLOW_RE.test(pat.title) || pat.occurrences >= 5) {
      createSkillCandidates.push({
        source: 'pattern',
        title: pat.title,
        reason: WORKFLOW_RE.test(pat.title)
          ? 'Repeatable multi-step workflow fits a /create-skill checklist better than a 1-line rule'
          : `High frequency (${pat.occurrences} occurrences) — consider packaging as /create-skill`,
        command: '/create-skill',
      });
    }
  }
  if (activeInstincts.length > 5) {
    createSkillCandidates.push({
      source: 'instinct-budget',
      title: `${activeInstincts.length} active instincts compete for the 200-token cap`,
      reason: 'Move procedural instincts into /create-skill so they load on demand instead of every session',
      command: '/create-skill',
    });
  }

  const domainCounts = new Map();
  for (const ep of episodes) {
    if (!ep.title || ep.title.toLowerCase() === 'session outcome') continue;
    domainCounts.set(ep.domain, (domainCounts.get(ep.domain) || 0) + 1);
  }
  const createAgentCandidates = [];
  for (const [domain, count] of domainCounts) {
    if (count >= 5) {
      createAgentCandidates.push({
        domain,
        occurrences: count,
        reason: `${count} episodes in domain [${domain}] over ${sinceDays}d — if existing agents miss this perspective, consider /create-agent`,
        command: '/create-agent',
      });
    }
  }

  const out = {
    since_days: sinceDays,
    episodes_scanned: episodes.length,
    promote_patterns: patternCandidates,
    promote_instincts: instinctCandidates.map((x) => ({ title: x.title, promoted: x.promoted, adr_refs: countAdrRefs(p, x) })),
    create_skill_candidates: createSkillCandidates,
    create_agent_candidates: createAgentCandidates,
    stale_patterns: stalePatterns(p).map((s) => ({ title: s.title, last_seen: s.last_seen, occurrences: s.occurrences })),
  };
  if (!has(args, 'quiet')) console.log(JSON.stringify(out, null, 2));
  return out;
}

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const p = paths(flag(args, 'root', process.cwd()));
  switch (cmd) {
    case 'scan-episodes': {
      const eps = parseEpisodes(p, days(args, 30));
      syncPatternsFromEpisodes(p, eps);
      console.log(JSON.stringify({ since_days: days(args, 30), episodes: eps.length, detail: eps }, null, 2));
      break;
    }
    case 'find-patterns': {
      const eps = parseEpisodes(p, days(args, 30));
      const out = findPatternCandidates(eps, +(flag(args, 'min-occurrences', '3')), +(flag(args, 'min-agents', '2')), +(flag(args, 'min-span-days', '7'))).candidates;
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'promote-pattern': console.log(JSON.stringify(promotePattern(p, args), null, 2)); break;
    case 'promote-instinct': console.log(JSON.stringify(promoteInstinct(p, args), null, 2)); break;
    case 'demote-instinct': console.log(JSON.stringify(demoteInstinct(p, args), null, 2)); break;
    case 'demote': console.log(JSON.stringify(demoteInstinct(p, args), null, 2)); break;
    case 'scan': console.log(JSON.stringify(scan(p, args), null, 2)); break;
    case 'scan-patterns': {
      if (has(args, 'stale')) {
        const out = stalePatterns(p);
        console.log(JSON.stringify(out, null, 2));
        if (out.length > 0) process.exitCode = 1;
      } else {
        console.log(JSON.stringify(loadPatterns(p), null, 2));
      }
      break;
    }
    case 'instinct-cost': instinctCost(p, args); break;
    case 'citation-rate': citationRate(p, args); break;
    case 'suggest': suggest(p, args); break;
    case 'episode': console.log(JSON.stringify(recordEpisode(p, args), null, 2)); break;
    case 'auto-capture': console.log(JSON.stringify(autoCapture(p, args), null, 2)); break;
    default:
      console.log('Usage: self_learn.js scan-episodes|find-patterns|promote-pattern|promote-instinct|demote-instinct|scan|scan-patterns [--stale]|instinct-cost [--since=7d]|citation-rate [--since=14d]|suggest [--since=30d]|episode|auto-capture [--root DIR]');
      process.exit(2);
  }
}

if (require.main === module) main();

module.exports = {
  paths, parseEpisodes, findPatternCandidates, loadPatterns, promotePattern,
  promoteInstinct, demoteInstinct, stalePatterns, instinctCost, citationRate,
  scan, countAdrRefs, recordEpisode, autoCapture, inferDomain, safeTitle,
  safeAgent, syncPatternsFromEpisodes, clusterKey, suggest,
};
