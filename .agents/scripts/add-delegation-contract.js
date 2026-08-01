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

const DELEGATION_BLOCK = `

## Delegation Contract

**You delegate I/O to sub-agents by default.** See \`.agents/references/delegation-policy.md\` for the task->agent mapping. Direct I/O requires a \`[DIRECT-IO-JUSTIFIED: ...]\` line in your response.

Common patterns (don't think, just follow):
- Reading code or docs -> \`@reader\`
- Writing files -> \`@writer\`
- Running shell -> \`@executor\`
- Memory updates -> \`@memory-controller\`

Your output is graded on how often you delegated. The user runs \`delegation_audit.js\` weekly.
`;

let count = 0;

for (const name of REASONING_AGENTS) {
  const filePath = path.join(AGENTS_DIR, `${name}.md`);
  if (!fs.existsSync(filePath)) {
    console.log('SKIP: ' + name + ' — file not found');
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('## Delegation Contract')) {
    console.log('SKIP: ' + name + ' — already has Delegation Contract');
    continue;
  }

  content = content.replace(
    '<!-- /IDENTITY -->',
    '<!-- /IDENTITY -->' + DELEGATION_BLOCK,
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('OK: ' + name);
  count++;
}

console.log('\nAdded Delegation Contract to ' + count + ' agent(s).');
