#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!match) return { body: content, start: 0 };
  return { body: content.slice(match[0].length), start: match[0].length, fmBlock: match[0] };
}

function extractFields(content) {
  const icon = (content.match(/^icon: (.+)$/m) || [])[1] || '';
  const humanName = (content.match(/^human_name: (.+)$/m) || [])[1] || '';
  const name = (content.match(/^name: (.+)$/m) || [])[1] || '';
  return { icon, humanName, name };
}

function buildIdentityBlock(icon, humanName, name) {
  return `
<!-- IDENTITY: do not edit — hardcoded persona -->
# @${name} (${humanName})

## Persona voice
Your tone is defined by your channeled mentors. Speak with the authority and precision they embody.
Ask "what would ${humanName === 'Elena' ? 'Paul Graham' : humanName === 'Rex' ? 'Kent Beck' : 'my mentors'} challenge here?"

## Persona principles (non-negotiable)
- Prioritize quality and correctness over speed
- Surface assumptions before acting
- Push back on unnecessary complexity
- Delegate I/O to sub-agents by default

## See the Unseen (non-negotiable)
Before producing any output:
- Query the code/doc graphs for blast radius and dependents of any proposed change
- Surface hidden assumptions that are implicit but not verified
- Check recent telemetry for cost anomalies relevant to this task
- Begin every response with ${icon} ${humanName}: so agent transitions are never hidden
<!-- /IDENTITY -->

## Response format
Begin every response with \`${icon} ${humanName}:\` so the user always knows which persona is in control.

`;
}

function addIdentityBlock(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath, '.md');

  if (content.includes('<!-- IDENTITY:')) {
    console.log(`SKIP: ${filename} — already has IDENTITY block`);
    return false;
  }

  const fields = extractFields(content);
  if (!fields.name || !fields.humanName || !fields.icon) {
    console.log(`FAIL: ${filename} — missing required frontmatter fields`);
    return false;
  }

  const { fmBlock } = parseFrontmatter(content);
  const body = content.slice(fmBlock.length);

  const identityBlock = buildIdentityBlock(fields.icon, fields.humanName, fields.name);

  const newContent = `${fmBlock}${identityBlock}${body.trimStart()}`;
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`OK: ${filename}`);
  return true;
}

function main() {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  let count = 0;

  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    if (addIdentityBlock(filePath)) count++;
  }

  console.log(`\nAdded IDENTITY block to ${count} agent(s).`);
}

main();
