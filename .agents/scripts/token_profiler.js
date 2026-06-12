#!/usr/bin/env node
/**
 * Token Profiler — Measures Agent Prompt Sizes and Phase Context Load
 *
 * Counts words, lines, and estimated tokens for each agent prompt,
 * template, and script. Estimates total context load per pipeline phase.
 *
 * Usage:
 *   node token_profiler.js
 *   node token_profiler.js --verbose
 *   node token_profiler.js --phase exploration
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const AGENTS_DIR = path.join(ROOT, '.opencode', 'agents');
const TEMPLATES_DIR = path.join(ROOT, '.opencode', 'templates');
const SCRIPTS_DIR = path.join(ROOT, '.opencode', 'scripts');

// Rough token estimation: ~1.3 tokens per word for English
const TOKENS_PER_WORD = 1.3;

function countFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  const words = content.split(/\s+/).filter(Boolean).length;
  const chars = content.length;
  const tokens = Math.round(words * TOKENS_PER_WORD);
  return { lines, words, chars, tokens };
}

function readFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) fm[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

function scanDir(dir, ext = '.md') {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

function profileAgents(verbose = false) {
  const agentFiles = scanDir(AGENTS_DIR);
  const agents = [];
  let totalWords = 0;
  let totalTokens = 0;

  for (const f of agentFiles) {
    const stats = countFile(f);
    if (!stats) continue;
    const fm = readFrontmatter(f);
    const name = path.basename(f, '.md');
    const agent = {
      name,
      file: path.relative(ROOT, f),
      lines: stats.lines,
      words: stats.words,
      tokens: stats.tokens,
      model: fm.model || (fm.permission?.includes('allow') ? 'Premium' : 'Premium'),
      optional: fm.optional === 'true' || fm.optional === 'yes',
      description: fm.description || ''
    };
    agents.push(agent);
    totalWords += stats.words;
    totalTokens += stats.tokens;
  }

  agents.sort((a, b) => b.words - a.words);

  if (verbose) {
    console.log('\n=== Agent Prompt Sizes (sorted by word count) ===\n');
    console.log(`${'Agent'.padEnd(25)} ${'Lines'.padStart(6)} ${'Words'.padStart(6)} ${'Tokens'.padStart(7)} ${'Optional'.padStart(9)}`);
    console.log('-'.repeat(60));
    for (const a of agents) {
      console.log(`${a.name.padEnd(25)} ${String(a.lines).padStart(6)} ${String(a.words).padStart(6)} ${String(a.tokens).padStart(7)} ${a.optional ? 'yes' : 'no'.padStart(9)}`);
    }
    console.log('-'.repeat(60));
    console.log(`${'TOTAL'.padEnd(25)} ${String(agents.reduce((s, a) => s + a.lines, 0)).padStart(6)} ${String(totalWords).padStart(6)} ${String(totalTokens).padStart(7)}`);
  }

  return { agents, totalWords, totalTokens, count: agents.length };
}

function profileTemplates(verbose = false) {
  const templateFiles = scanDir(TEMPLATES_DIR);
  const templates = [];
  let totalWords = 0;

  for (const f of templateFiles) {
    const stats = countFile(f);
    if (!stats) continue;
    const name = path.basename(f, '.md').replace(/-template$/, '');
    templates.push({ name, file: path.relative(ROOT, f), words: stats.words, tokens: Math.round(stats.words * TOKENS_PER_WORD) });
    totalWords += stats.words;
  }

  templates.sort((a, b) => b.words - a.words);

  if (verbose) {
    console.log('\n=== Template Sizes (sorted by word count) ===\n');
    console.log(`${'Template'.padEnd(35)} ${'Words'.padStart(6)} ${'Tokens'.padStart(7)}`);
    console.log('-'.repeat(50));
    for (const t of templates) {
      console.log(`${t.name.padEnd(35)} ${String(t.words).padStart(6)} ${String(t.tokens).padStart(7)}`);
    }
    console.log('-'.repeat(50));
    console.log(`${'TOTAL'.padEnd(35)} ${String(totalWords).padStart(6)} ${String(Math.round(totalWords * TOKENS_PER_WORD)).padStart(7)}`);
  }

  return { templates, totalWords, totalTokens: Math.round(totalWords * TOKENS_PER_WORD), count: templates.length };
}

function profileScripts(verbose = false) {
  const scriptFiles = scanDir(SCRIPTS_DIR, '.js');
  const scripts = [];
  let totalWords = 0;

  for (const f of scriptFiles) {
    const stats = countFile(f);
    if (!stats) continue;
    const name = path.basename(f, '.js');
    scripts.push({ name, file: path.relative(ROOT, f), lines: stats.lines, words: stats.words, tokens: Math.round(stats.words * TOKENS_PER_WORD) });
    totalWords += stats.words;
  }

  scripts.sort((a, b) => b.words - a.words);

  if (verbose) {
    console.log('\n=== Script Sizes (sorted by word count) ===\n');
    console.log(`${'Script'.padEnd(30)} ${'Lines'.padStart(6)} ${'Words'.padStart(6)} ${'Tokens'.padStart(7)}`);
    console.log('-'.repeat(55));
    for (const s of scripts) {
      console.log(`${s.name.padEnd(30)} ${String(s.lines).padStart(6)} ${String(s.words).padStart(6)} ${String(s.tokens).padStart(7)}`);
    }
    console.log('-'.repeat(55));
    console.log(`${'TOTAL'.padEnd(30)} ${String(scripts.reduce((sum, s) => sum + s.lines, 0)).padStart(6)} ${String(totalWords).padStart(6)} ${String(Math.round(totalWords * TOKENS_PER_WORD)).padStart(7)}`);
  }

  return { scripts, totalWords, totalTokens: Math.round(totalWords * TOKENS_PER_WORD), count: scripts.length };
}

function estimatePhaseContext(phase, agents) {
  const phaseAgents = {
    validation: ['founder'],
    exploration: ['researcher', 'user-researcher'],
    design: ['product-manager', 'product-designer'],
    development: ['tech-lead', 'developer', 'code-reviewer', 'qa-engineer']
  };

  const agentMap = {};
  for (const a of agents) agentMap[a.name] = a;

  const names = phaseAgents[phase] || [];
  let totalTokens = 0;
  const details = [];

  for (const name of names) {
    const agent = agentMap[name];
    if (agent) {
      totalTokens += agent.tokens;
      details.push({ name, tokens: agent.tokens, words: agent.words });
    }
  }

  // Add memory load estimate (~1000 tokens per agent load)
  const memoryLoad = names.length * 1000;
  // Add template overhead (avg ~300 tokens per template)
  const templateOverhead = names.length * 300;

  return {
    phase,
    agents: details,
    agent_prompt_tokens: totalTokens,
    memory_load_tokens: memoryLoad,
    template_overhead_tokens: templateOverhead,
    estimated_total_tokens: totalTokens + memoryLoad + templateOverhead
  };
}

function profilePhases(agents, verbose = false) {
  const phases = ['validation', 'exploration', 'design', 'development'];
  const results = [];

  for (const phase of phases) {
    results.push(estimatePhaseContext(phase, agents));
  }

  if (verbose) {
    console.log('\n=== Estimated Context Load Per Phase ===\n');
    console.log(`${'Phase'.padEnd(15)} ${'Agents'.padEnd(30)} ${'Prompts'.padStart(8)} ${'Memory'.padStart(8)} ${'Templates'.padStart(10)} ${'Total'.padStart(8)}`);
    console.log('-'.repeat(85));
    for (const p of results) {
      const agentNames = p.agents.map(a => a.name).join(', ');
      console.log(`${p.phase.padEnd(15)} ${agentNames.padEnd(30)} ${String(p.agent_prompt_tokens).padStart(8)} ${String(p.memory_load_tokens).padStart(8)} ${String(p.template_overhead_tokens).padStart(10)} ${String(p.estimated_total_tokens).padStart(8)}`);
    }
  }

  return results;
}

function generateRecommendations(agents, templates, phases) {
  const recommendations = [];

  // Find agents over 1000 words (heavy prompts)
  const heavyAgents = agents.filter(a => a.words > 1000);
  if (heavyAgents.length > 0) {
    recommendations.push({
      type: 'heavy_agent',
      agents: heavyAgents.map(a => ({ name: a.name, words: a.words })),
      action: 'Consider extracting reference sections to .agents/references/ or splitting into modes'
    });
  }

  // Find optional agents that could be lazy-loaded
  const optionalAgents = agents.filter(a => a.optional);
  if (optionalAgents.length > 0) {
    recommendations.push({
      type: 'optional_agents',
      agents: optionalAgents.map(a => ({ name: a.name, words: a.words })),
      action: 'These are optional — only load when triggered. Saves ~' + optionalAgents.reduce((s, a) => s + a.tokens, 0) + ' tokens when not needed.'
    });
  }

  // Find heaviest phase
  const heaviestPhase = phases.reduce((max, p) => p.estimated_total_tokens > max.estimated_total_tokens ? p : max, phases[0]);
  recommendations.push({
    type: 'heaviest_phase',
    phase: heaviestPhase.phase,
    tokens: heaviestPhase.estimated_total_tokens,
    action: 'This phase has the highest context load. Consider splitting agents or lazy-loading memory.'
  });

  // Large templates
  const largeTemplates = templates.filter(t => t.words > 1000);
  if (largeTemplates.length > 0) {
    recommendations.push({
      type: 'large_templates',
      templates: largeTemplates.map(t => ({ name: t.name, words: t.words })),
      action: 'Templates over 100 words add to context when agents read them. Consider simplifying.'
    });
  }

  return recommendations;
}

function main() {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const phaseFilter = process.argv.find(a => a.startsWith('--phase='));
  const phaseName = phaseFilter ? phaseFilter.split('=')[1] : null;

  console.log('Vespyr Token Profiler');
  console.log('=====================\n');

  const agentProfile = profileAgents(verbose);
  const templateProfile = profileTemplates(verbose);
  const scriptProfile = profileScripts(verbose);

  const phases = profilePhases(agentProfile.agents, verbose);

  const filteredPhases = phaseName ? phases.filter(p => p.phase === phaseName) : phases;

  const recommendations = generateRecommendations(agentProfile.agents, templateProfile.templates, filteredPhases);

  console.log('\n=== Summary ===\n');
  console.log(`Agents: ${agentProfile.count} files, ${agentProfile.totalWords} words, ~${agentProfile.totalTokens} tokens`);
  console.log(`Templates: ${templateProfile.count} files, ${templateProfile.totalWords} words, ~${templateProfile.totalTokens} tokens`);
  console.log(`Scripts: ${scriptProfile.count} files, ${scriptProfile.totalWords} words, ~${scriptProfile.totalTokens} tokens`);
  console.log(`\nTotal codebase: ~${agentProfile.totalTokens + templateProfile.totalTokens + scriptProfile.totalTokens} tokens`);

  console.log('\n=== Recommendations ===\n');
  for (const r of recommendations) {
    console.log(`[${r.type.toUpperCase()}]`);
    if (r.agents) {
      for (const a of r.agents) console.log(`  - ${a.name}: ${a.words} words`);
    }
    if (r.templates) {
      for (const t of r.templates) console.log(`  - ${t.name}: ${t.words} words`);
    }
    if (r.phase) console.log(`  Phase: ${r.phase} (${r.tokens} tokens)`);
    console.log(`  Action: ${r.action}\n`);
  }
}

main();
