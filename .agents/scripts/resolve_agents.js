#!/usr/bin/env node
/**
 * Agent Resolver — Parser to resolve active agent personas in Vespyr
 */

const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const BOM = String.fromCharCode(0xfeff);
  const normalized = content.split(BOM).join('').replace(/^\s+/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: content };

  const yamlStr = match[1];
  const body = normalized.substring(match[0].length).trim();
  const data = {};

  const lines = yamlStr.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim();
      // Strip only matched surrounding quotes — mismatched quotes are kept
      // verbatim instead of silently mangling the value.
      const val = line.substring(colonIdx + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      data[key] = val;
    }
  }

  return { data, body };
}

function parseTemperature(raw) {
  if (raw === undefined || raw === null || raw === '') return 0.1;
  const t = parseFloat(raw);
  return Number.isNaN(t) ? 0.1 : t;
}

const ROUTER_PATH = path.join(__dirname, '..', 'references', 'roster-router.json');

function loadRouter(routerPath) {
  return JSON.parse(fs.readFileSync(routerPath || ROUTER_PATH, 'utf8'));
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Enforced router namespace (review 12 R09-D1): every value the code consumes
// is read from rules.* and nowhere else. A malformed table fails loudly at the
// call site rather than silently shadowing the table with a literal.
function rulesOf(router) {
  const rules = (router && router.rules) || {};
  for (const key of ['default_seats', 'hard_cap', 'untagged_fallback']) {
    if (rules[key] === undefined) {
      throw new Error(`roster-router.json is missing rules.${key} — refusing to fall back to a literal`);
    }
  }
  if (!Number.isInteger(rules.default_seats) || rules.default_seats < 2) {
    throw new Error('roster-router.json rules.default_seats must be an integer >= 2');
  }
  if (!Number.isInteger(rules.hard_cap) || rules.hard_cap < 1) {
    throw new Error('roster-router.json rules.hard_cap must be a positive integer');
  }
  if (rules.default_seats > rules.hard_cap) {
    throw new Error('roster-router.json rules.default_seats must be <= rules.hard_cap');
  }
  if (!Array.isArray(rules.untagged_fallback) || rules.untagged_fallback.length === 0
      || rules.untagged_fallback.some((s) => typeof s !== 'string' || !s.trim())) {
    throw new Error('roster-router.json rules.untagged_fallback must be a non-empty array of agent names');
  }
  return rules;
}

// Content router: match a free-text topic against router tag keywords and
// return matched tags plus unioned mandatory/consulted seats. This is what
// makes auto-seating executable instead of host improvisation (RT-P1-1).
// Scoring matches whole words for single tokens <= 6 chars, exact substrings
// for multi-word phrases, and substrings for longer tokens.
// If mandatory union < default_seats (default 2), auto-seating cascades from
// matched tags' consulted lists to untagged_fallback.
// Untagged topics assign rules.untagged_fallback as mandatory.
// Returns { tags, mandatory, consulted, autoSeated, untaggedFallback,
// overflow, cap, rosterLine }.
function matchTopicToTags(topic, router, mode) {
  const text = String(topic || '').toLowerCase();
  const tags = [];
  for (const [tag, def] of Object.entries(router.tags || {})) {
    // Exclusion phrases veto the tag before scoring (backdoor guard: cost
    // accounting threads must not auto-seat specialists on keyword accident).
    const excluded = (def.excludes || []).some(
      (x) => x && text.includes(String(x).toLowerCase())
    );
    if (excluded) continue;
    let score = 0;
    for (const kw of def.keywords || []) {
      if (!kw) continue;
      const lkw = String(kw).toLowerCase();
      let hit = false;
      if (lkw.includes(' ') || lkw.includes('/')) {
        hit = text.includes(lkw);
      } else if (lkw.length <= 6) {
        const re = new RegExp('\\b' + escapeRegex(lkw) + '\\b');
        hit = re.test(text);
      } else {
        hit = text.includes(lkw);
      }
      if (hit) score += 1;
    }
    if (score > 0) tags.push({ tag, score });
  }
  tags.sort((a, b) => b.score - a.score);
  const mandatory = [];
  const consulted = [];
  for (const { tag } of tags) {
    for (const seat of router.tags[tag].mandatory || []) {
      if (!mandatory.includes(seat)) mandatory.push(seat);
    }
    for (const seat of router.tags[tag].consulted || []) {
      if (!consulted.includes(seat) && !mandatory.includes(seat)) consulted.push(seat);
    }
  }

  const rules = rulesOf(router);
  const defaultSeats = rules.default_seats;
  const cap = rules.hard_cap;
  const untaggedFallbackList = rules.untagged_fallback;

  let untaggedFallback = false;
  let seats = [];
  const autoSeated = [];

  if (tags.length === 0) {
    untaggedFallback = true;
    mandatory.push(...untaggedFallbackList);
    seats = mandatory.slice(0, cap);
  } else {
    seats = mandatory.slice(0, cap);
    if (seats.length < defaultSeats) {
      // 1. Try consulted from matched tags in rank order
      for (const { tag } of tags) {
        for (const candidate of (router.tags[tag] && router.tags[tag].consulted) || []) {
          if (!seats.includes(candidate)) {
            seats.push(candidate);
            autoSeated.push({ tag, agent: candidate });
            if (seats.length >= defaultSeats) break;
          }
        }
        if (seats.length >= defaultSeats) break;
      }
      // 2. If consulted is exhausted, fallback to untagged_fallback
      if (seats.length < defaultSeats) {
        for (const candidate of untaggedFallbackList) {
          if (!seats.includes(candidate)) {
            seats.push(candidate);
            autoSeated.push({ tag: 'fallback', agent: candidate });
            if (seats.length >= defaultSeats) break;
          }
        }
      }
    }
  }

  const overflow = mandatory.length > cap ? mandatory.slice(cap) : [];
  return {
    tags,
    mandatory,
    consulted,
    autoSeated,
    untaggedFallback,
    overflow,
    cap,
    rosterLine: `ROSTER: ${seats.map((s) => '@' + s).join(',')}`,
  };
}

function getAgentsDir() {
  const possibleDirs = [
    path.join(__dirname, '..', 'agents'),
    path.join(__dirname, '..', '..', '.agents', 'agents')
  ];
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

function buildRoster(agentsDir) {
  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  const roster = {};

  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = parseFrontmatter(content);
    const code = path.basename(file, '.md');

    roster[code] = {
      code,
      name: data.human_name || code.charAt(0).toUpperCase() + code.slice(1),
      title: data.description || '',
      description: data.description || '',
      mode: data.mode || 'subagent',
      temperature: parseTemperature(data.temperature),
      reasoningParticipant: data.reasoning_participant === 'false' ? false : true,
      optional: data.optional === 'true',
      summonWhen: data.summon_when || null
    };
  }

  return roster;
}

// ROSTER validator (RT-P2-6): checks a proposed seat list against the router
// for a topic. Rules: within cap; at least default_seats (default 2); every
// mandatory seat of matched tags is present (no substitution); seats from
// position 3 onward must belong to allowed (mandatory or consulted; for
// untagged, untagged_fallback) — positions 1-2 are unchecked by design
// (09-roundtable-roster-integrity-plan.md §3).
// User-named overrides bypass validation only with an explicit
// [ROUTER-DEVIATION]/[ROUTING-OVERRIDE] marker — the validator itself never waives.
// Returns { pass, failures[], tags, rosterLine }.
function validateRoster(topic, seats, router, mode) {
  const match = matchTopicToTags(topic, router, mode);
  const norm = (seats || []).map((s) => String(s).trim().replace(/^@/, '')).filter(Boolean);
  const failures = [];
  const rules = rulesOf(router);
  const defaultSeats = rules.default_seats;
  const cap = rules.hard_cap;

  if (norm.length === 0) {
    failures.push('roster is empty — seat at least the tag-mandatory agents');
  } else if (norm.length < defaultSeats) {
    failures.push(`roster below default_seats (${defaultSeats}) — seat at least ${defaultSeats} agents`);
  }
  if (norm.length > cap) {
    failures.push(`roster of ${norm.length} exceeds cap ${cap}`);
  }
  for (const m of match.mandatory) {
    if (!norm.includes(m)) failures.push(`missing mandatory seat @${m}`);
  }
  const allowed = new Set([...match.mandatory, ...match.consulted]);
  for (const s of norm.slice(2)) {
    if (!allowed.has(s)) failures.push(`@${s} matches no router tag for this topic`);
  }
  return { pass: failures.length === 0, failures, tags: match.tags, rosterLine: match.rosterLine };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'roster' && argv[1] === 'check') {
    const topicIdx = argv.indexOf('--topic');
    const seatsIdx = argv.indexOf('--seats');
    const words = [];
    if (topicIdx !== -1) {
      for (let i = topicIdx + 1; i < argv.length && !argv[i].startsWith('--'); i++) {
        words.push(argv[i]);
      }
    }
    if (!words.length || seatsIdx === -1 || !argv[seatsIdx + 1] || argv[seatsIdx + 1].startsWith('--')) {
      console.error('[resolve-agents] roster check requires --topic "..." and --seats "@a,@b"');
      process.exit(2);
    }
    let mode = 'native';
    const modeIdx = argv.indexOf('--mode');
    if (modeIdx !== -1) {
      if (!argv[modeIdx + 1] || argv[modeIdx + 1].startsWith('--')) {
        console.error('[resolve-agents] --mode requires a value (native|solo)');
        process.exit(2);
      }
      mode = argv[modeIdx + 1];
    }
    const seats = argv[seatsIdx + 1].split(',').map((s) => s.trim()).filter(Boolean);
    const result = validateRoster(words.join(' '), seats, loadRouter(), mode);
    console.log(JSON.stringify(result, null, 2));
    if (!result.pass) {
      console.error(`[resolve-agents] roster REJECTED: ${result.failures.join('; ')}`);
      process.exit(2);
    }
    return;
  }
  const topicIdx = argv.indexOf('--topic');
  if (topicIdx !== -1) {
    // Topic words end at the next flag; a missing value is a usage error,
    // not an empty roster.
    const words = [];
    for (let i = topicIdx + 1; i < argv.length && !argv[i].startsWith('--'); i++) {
      words.push(argv[i]);
    }
    if (!words.length) {
      console.error('[resolve-agents] --topic requires a value');
      process.exit(2);
    }
    let mode = 'native';
    const modeIdx = argv.indexOf('--mode');
    if (modeIdx !== -1) {
      if (!argv[modeIdx + 1] || argv[modeIdx + 1].startsWith('--')) {
        console.error('[resolve-agents] --mode requires a value (native|solo)');
        process.exit(2);
      }
      mode = argv[modeIdx + 1];
    }
    const router = loadRouter();
    const match = matchTopicToTags(words.join(' '), router, mode);
    console.log(JSON.stringify(match, null, 2));
    if (match.overflow.length) {
      console.error(
        `[resolve-agents] roster overflow: ${match.overflow.map((s) => '@' + s).join(', ')} ` +
        `dropped beyond cap ${match.cap} — narrow the topic or split the panel (ties → founder)`
      );
      process.exit(2);
    }
    return;
  }
  const agentsDir = getAgentsDir();
  if (!agentsDir) {
    console.error(JSON.stringify({ error: 'Agents directory not found' }));
    process.exit(1);
  }

  console.log(JSON.stringify(buildRoster(agentsDir), null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  parseFrontmatter,
  parseTemperature,
  getAgentsDir,
  buildRoster,
  loadRouter,
  matchTopicToTags,
  validateRoster
};
