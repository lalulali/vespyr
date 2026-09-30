const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, '.agents', 'agents');
const CONTRACTS = path.join(ROOT, '.agents', 'references', 'agent-contracts.md');

// Evidence paths that can never be wiring: the registry itself and this gate
// (they contain every agent name and capability literal, so they would pass any
// relevance check vacuously).
const BANNED_EVIDENCE = new Set(['.agents/references/agent-contracts.md', 'tests/agent-capability-contract.test.js']);

// Normalized matching: lowercase, accent-folded, punctuation → spaces.
const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function frontmatterCapabilities(content) {
  const fm = (content.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  const block = (fm.match(/capabilities:\s*\n((?:\s+- .*\n)*)/) || [])[1] || '';
  return [...block.matchAll(/-\s*([^\n]+)/g)].map((m) => m[1].trim());
}

function registryRows() {
  const content = fs.readFileSync(CONTRACTS, 'utf8');
  const section = content.split('## Capability Registry')[1] || '';
  const rows = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\|\s*`@([a-z-]+)`\s*\|\s*`([^`]+)`\s*\|(.+?)\|\s*$/);
    if (!m) continue;
    const wiring = [...m[3].matchAll(/`([^`]+)`/g)].map((x) => x[1]);
    rows.push({ agent: m[1], cap: m[2], wiring });
  }
  return rows;
}

// Distinctive tokens (length ≥ 4); all-short capabilities fall back to the full
// normalized phrase so "ci-cd" still requires "ci cd" in the evidence.
function tokens(cap) {
  return norm(cap).split(' ').filter((t) => t.length >= 4);
}
function carriesCapability(normText, cap) {
  const full = norm(cap);
  const list = tokens(cap);
  if (!list.length) return normText.includes(full);
  return normText.includes(full) || list.some((t) => normText.includes(t) || (t.endsWith('s') && t.length > 4 && normText.includes(t.slice(0, -1))));
}
const textOf = (p) => (fs.existsSync(path.join(ROOT, p)) ? norm(fs.readFileSync(path.join(ROOT, p), 'utf8')) : '');
// Identify wiring files by inode (dev:ino) so path aliases — `./` prefixes,
// `..` segments, and case variants on case-insensitive filesystems — cannot
// evade bans or reuse caps. Falls back to the resolved absolute path.
const identity = (p) => {
  const abs = path.resolve(ROOT, p);
  try {
    const st = fs.statSync(abs);
    return `${st.dev}:${st.ino}`;
  } catch {
    return abs;
  }
};
const BANNED_IDENTITIES = new Set([...BANNED_EVIDENCE].map((p) => identity(p)));

const agentFiles = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md')).sort();
const agents = new Map(
  agentFiles.map((f) => [f.replace('.md', ''), frontmatterCapabilities(fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8'))])
);
const rows = registryRows();

describe('Agent capability contract (frontmatter ↔ per-capability registry)', () => {
  it('registry covers every agent exactly once per capability (set equality, both directions)', () => {
    for (const [agent, fmCaps] of agents) {
      const registryCaps = rows.filter((r) => r.agent === agent).map((r) => r.cap);
      const missing = fmCaps.filter((c) => !registryCaps.includes(c));
      const extra = registryCaps.filter((c) => !fmCaps.includes(c));
      assert.deepStrictEqual(missing, [], `@${agent}: frontmatter capabilities missing from registry: ${missing.join(', ')}`);
      assert.deepStrictEqual(extra, [], `@${agent}: registry lists capabilities absent from frontmatter: ${extra.join(', ')}`);
      assert.strictEqual(registryCaps.length, new Set(registryCaps).size, `@${agent}: duplicate registry rows`);
    }
    const registryAgents = [...new Set(rows.map((r) => r.agent))].sort();
    assert.deepStrictEqual(registryAgents, [...agents.keys()].sort(), 'registry agents must match agent files 1:1');
  });

  it('no capability string is claimed by two agents', () => {
    const seen = new Map();
    const dupes = [];
    for (const [agent, caps] of agents) {
      for (const cap of caps) {
        if (seen.has(cap)) dupes.push(`${cap} (@${seen.get(cap)} + @${agent})`);
        else seen.set(cap, agent);
      }
    }
    assert.deepStrictEqual(dupes, [], `duplicate capability labels: ${dupes.join('; ')}`);
  });

  it('every wiring path exists, is not the registry/gate itself, and every capability has at least one', () => {
    const broken = [];
    for (const row of rows) {
      if (row.wiring.length === 0) broken.push(`@${row.agent}/${row.cap}: no wiring paths`);
      for (const w of row.wiring) {
        if (BANNED_IDENTITIES.has(identity(w))) { broken.push(`@${row.agent}/${row.cap}: banned evidence path "${w}"`); continue; }
        if (!w.includes('/')) { broken.push(`@${row.agent}/${row.cap}: wiring "${w}" is not a path`); continue; }
        if (!fs.existsSync(path.join(ROOT, w))) broken.push(`@${row.agent}/${row.cap}: wiring path missing on disk: ${w}`);
      }
    }
    assert.deepStrictEqual(broken, [], broken.join('\n'));
  });

  it('every wiring path names the owning agent (attributable evidence, no coincidental matches)', () => {
    const broken = [];
    for (const row of rows) {
      const agentNorm = norm(row.agent);
      for (const w of row.wiring) {
        if (BANNED_IDENTITIES.has(identity(w))) continue;
        if (!textOf(w).includes(agentNorm)) {
          broken.push(`@${row.agent}/${row.cap}: "${w}" never names @${row.agent}`);
        }
      }
    }
    assert.deepStrictEqual(broken, [], broken.join('\n'));
  });

  it('every capability has non-persona evidence carrying the capability (self-assertion fails)', () => {
    const broken = [];
    for (const row of rows) {
      const self = `.agents/agents/${row.agent}.md`;
      const ok = row.wiring.some(
        (w) => identity(w) !== identity(self) && !BANNED_IDENTITIES.has(identity(w)) && carriesCapability(textOf(w), row.cap)
      );
      if (!ok) {
        broken.push(`@${row.agent}/${row.cap}: no non-persona wiring carries the capability — self-assertion only [${row.wiring.join(', ')}]`);
      }
    }
    assert.deepStrictEqual(broken, [], broken.join('\n'));
  });

  it('evidence paths cannot blanket-cover the registry (reuse caps)', () => {
    const byPath = new Map();
    for (const row of rows) {
      for (const w of row.wiring) {
        const key = identity(w);
        if (!byPath.has(key)) byPath.set(key, { rows: [], agents: new Set() });
        const v = byPath.get(key);
        v.rows.push(`${row.agent}/${row.cap}`);
        v.agents.add(row.agent);
      }
    }
    const broken = [];
    for (const [p, v] of byPath) {
      if (v.agents.size > 2) broken.push(`"${p}" serves ${v.agents.size} agents — a shared filler file cannot be wiring`);
      if (v.rows.length > 8) broken.push(`"${p}" serves ${v.rows.length} capabilities — evidence must be capability-specific, not blanket`);
    }
    assert.deepStrictEqual(broken, [], broken.join('\n'));
  });

  it('eval-suite wiring contains a capability-matching benchmark for the owning agent', () => {
    const broken = [];
    for (const row of rows) {
      for (const w of row.wiring) {
        if (!w.startsWith('evals/suites/')) continue;
        if (w.startsWith('evals/suites/invariants/')) {
          const suite = JSON.parse(fs.readFileSync(path.join(ROOT, w), 'utf8'));
          if (!Array.isArray(suite.benchmarks) || suite.benchmarks.length === 0) {
            broken.push(`@${row.agent}/${row.cap}: shared suite ${w} has no benchmarks`);
          }
          continue;
        }
        const suite = JSON.parse(fs.readFileSync(path.join(ROOT, w), 'utf8'));
        const forAgent = (suite.benchmarks || []).filter((b) => b.agent === row.agent);
        const matching = forAgent.some((b) => carriesCapability(norm(`${b.id} ${b.name} ${b.prompt}`), row.cap));
        if (!matching) {
          broken.push(`@${row.agent}/${row.cap}: suite ${w} has no ${row.agent} benchmark matching the capability`);
        }
      }
    }
    assert.deepStrictEqual(broken, [], broken.join('\n'));
  });
});
