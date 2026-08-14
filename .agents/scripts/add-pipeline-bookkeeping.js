#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

const REASONING_AGENTS = [
  'architect', 'code-reviewer', 'data-analyst', 'developer',
  'devops-engineer', 'founder', 'ml-ai-engineer', 'performance-engineer',
  'product-designer', 'product-manager', 'qa-engineer',
  'researcher', 'security-engineer', 'tech-lead', 'technical-writer',
  'user-researcher', 'ux-researcher',
];

let count = 0;

for (const name of REASONING_AGENTS) {
  const filePath = path.join(AGENTS_DIR, name + '.md');
  if (!fs.existsSync(filePath)) {
    console.log('SKIP: ' + name + ' — file not found');
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('### Pipeline Bookkeeping (NON-NEGOTIABLE)')) {
    console.log('SKIP: ' + name + ' — already has Pipeline Bookkeeping');
    continue;
  }

  // Find "## Shared Memory"
  const sharedMemoryIdx = content.indexOf('## Shared Memory');
  if (sharedMemoryIdx === -1) {
    console.error('FAIL: ' + name + ' — ## Shared Memory not found');
    continue;
  }

  // Find the next "## " heading after "## Shared Memory"
  const nextHeadingIdx = content.indexOf('\n## ', sharedMemoryIdx + 16);
  if (nextHeadingIdx === -1) {
    console.error('FAIL: ' + name + ' — next ## heading not found');
    continue;
  }

  // Injected block
  const injectedBlock = `
### Pipeline Bookkeeping (NON-NEGOTIABLE)

After all deliverables are saved and memory writes are complete:

1. **Orchestrator completion** — always run directly:
   \`\`\`
   node .agents/scripts/orchestrator_state.js complete --agent ${name} --artifact <relative-path-to-artifact>
   \`\`\`
2. **Step tracker** — if executing a skill with step files, run the \`begin\` and \`complete\` calls shown in each step file. The tracker self-governs based on \`.agents/config.yaml\` \`step_tracking\` mode (\`off\` exits immediately).

Never skip these calls. They are required for pipeline state continuity.
`;

  // We want to insert this block right before the next heading (which starts with \n## )
  const updatedContent = content.slice(0, nextHeadingIdx) + '\n\n' + injectedBlock.trim() + '\n' + content.slice(nextHeadingIdx);

  fs.writeFileSync(filePath, updatedContent, 'utf-8');
  console.log('OK: ' + name);
  count++;
}

console.log('\nAdded Pipeline Bookkeeping to ' + count + ' agent(s).');
