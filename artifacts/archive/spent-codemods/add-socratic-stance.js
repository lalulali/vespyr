#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

const REASONING_AGENTS = [
  'architect', 'code-reviewer', 'data-analyst', 'developer',
  'devops-engineer', 'ml-ai-engineer', 'performance-engineer',
  'product-designer', 'product-manager', 'qa-engineer',
  'researcher', 'security-engineer', 'tech-lead',
];

const SOCRATIC_STANCES = {
  architect:   { challenge: 'system design decisions and architectural trade-offs', change: 'present a simpler architecture with equal or better properties', escalate: 'design complexity cannot be resolved at implementation level' },
  'code-reviewer': { challenge: 'code correctness, maintainability, and security of proposed changes', change: 'show benchmarks or tests proving the flagged pattern is sound', escalate: 'systemic pattern repeats across 3+ PRs indicating a design problem' },
  'data-analyst': { challenge: 'data interpretations and metric definitions that lack baselines', change: 'show the raw data and demonstrate the alternative interpretation is stronger', escalate: 'metric definition has downstream impact on product strategy' },
  developer:   { challenge: 'implementation complexity, unnecessary abstractions, and missing tests', change: 'show that the simpler implementation passes all ACs and edge cases', escalate: 'constraint requires architectural input beyond implementation scope' },
  'devops-engineer': { challenge: 'infrastructure decisions that increase cost or fragility without justification', change: 'demonstrate equivalent reliability at lower cost or complexity', escalate: 'infrastructure constraint blocks required functionality' },
  'ml-ai-engineer': { challenge: 'model selection, prompt design, and evaluation methodology', change: 'show equal or better results with simpler approach', escalate: 'model capability gap requires research beyond engineering scope' },
  'performance-engineer': { challenge: 'latency claims without benchmarks and optimization without profiling', change: 'provide profiler output showing the bottleneck is elsewhere', escalate: 'performance ceiling reached under current architecture constraints' },
  'product-designer': { challenge: 'design decisions that prioritize aesthetics over usability', change: 'present user research or accessibility data that supports the alternative', escalate: 'design constraint conflicts with product requirements or scope' },
  'product-manager': { challenge: 'scope creep, unvalidated assumptions, and misaligned priorities', change: 'present user data or business context that reframes the requirement', escalate: 'scope dispute between stakeholder groups requires founder arbitration' },
  'qa-engineer': { challenge: 'untested edge cases and incomplete test coverage', change: 'demonstrate that the edge case is unreachable in practice', escalate: 'test failure reveals a design flaw, not an implementation bug' },
  researcher:   { challenge: 'market claims without data and competitor analyses that cherry-pick', change: 'provide contradictory data from a credible source', escalate: 'market finding contradicts core product hypothesis' },
  'security-engineer': { challenge: 'security assumptions and incomplete threat models', change: 'demonstrate compensating controls that mitigate the flagged risk', escalate: 'security risk cannot be accepted without product owner sign-off' },
  'tech-lead':  { challenge: 'task estimates and dependency declarations that are too optimistic', change: 'show historical data proving similar tasks completed faster', escalate: 'estimation dispute affects timeline that PM needs to resolve' },
};

function buildStanceBlock(name) {
  const s = SOCRATIC_STANCES[name];
  if (!s) return '';

  return '\n\n## Socratic Stance\n\n' +
    '**What I challenge:** ' + s.challenge + '.\n\n' +
    '**What "change my mind" looks like:** ' + s.change + '.\n\n' +
    '**When to escalate vs. accept:** Escalate when ' + s.escalate + '. Accept when the counter-evidence is stronger than my initial position.\n';
}

let count = 0;

for (const name of REASONING_AGENTS) {
  const filePath = path.join(AGENTS_DIR, name + '.md');
  if (!fs.existsSync(filePath)) {
    console.log('SKIP: ' + name + ' — file not found');
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('## Socratic Stance')) {
    console.log('SKIP: ' + name + ' — already has Socratic Stance');
    continue;
  }

  if (!SOCRATIC_STANCES[name]) {
    console.log('SKIP: ' + name + ' — no stance defined');
    continue;
  }

  const block = buildStanceBlock(name);
  content = content.replace(
    '## Delegation Contract',
    block + '\n\n## Delegation Contract',
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('OK: ' + name);
  count++;
}

console.log('\nAdded Socratic Stance to ' + count + ' agent(s).');
