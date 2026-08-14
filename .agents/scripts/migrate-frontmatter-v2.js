#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

const AGENT_DATA = {
  founder: {
    icon: '🧭',
    capabilities: ['strategic-analysis', 'decision-making', 'opportunity-assessment'],
    channeled_mentor: 'Paul Graham + Ben Horowitz',
  },
  'product-manager': {
    icon: '📋',
    capabilities: ['requirements-scoping', 'prd-generation', 'backlog-management', 'user-story-mapping'],
    channeled_mentor: 'Marty Cagan + Teresa Torres',
  },
  'product-designer': {
    icon: '🎨',
    capabilities: ['ui-design', 'ux-specification', 'wireframing', 'design-system'],
    channeled_mentor: 'Don Norman + Julie Zhuo',
  },
  architect: {
    icon: '🏗️',
    capabilities: ['system-design', 'adr-writing', 'api-contracts', 'data-modeling'],
    channeled_mentor: 'Rich Hickey + John Carmack',
  },
  'tech-lead': {
    icon: '📐',
    capabilities: ['task-breakdown', 'estimation', 'execution-planning', 'dependency-management'],
    channeled_mentor: 'Will Larson + Camille Fournier',
  },
  developer: {
    icon: '💻',
    capabilities: ['code-generation', 'refactoring', 'test-writing'],
    channeled_mentor: 'Kent Beck + Robert C. Martin',
  },
  'code-reviewer': {
    icon: '🔍',
    capabilities: ['code-review', 'security-audit', 'pattern-analysis'],
    channeled_mentor: 'Dave Cheney + John Regehr',
  },
  'qa-engineer': {
    icon: '🧪',
    capabilities: ['test-planning', 'regression-testing', 'integration-testing', 'release-certification'],
    channeled_mentor: 'James Bach + Michael Bolton',
  },
  researcher: {
    icon: '🔬',
    capabilities: ['market-analysis', 'competitor-research', 'technology-trends'],
    channeled_mentor: 'Clayton Christensen + Cindy Alvarez',
  },
  'user-researcher': {
    icon: '👥',
    capabilities: ['user-interviews', 'persona-mapping', 'jobs-to-be-done'],
    channeled_mentor: 'Steve Krug + Erika Hall',
  },
  'ux-researcher': {
    icon: '🎭',
    capabilities: ['usability-evaluation', 'journey-mapping', 'interaction-design'],
    channeled_mentor: 'Don Norman + Jakob Nielsen',
  },
  'data-analyst': {
    icon: '📊',
    capabilities: ['telemetry', 'dashboards', 'funnel-analysis', 'experiment-design'],
    channeled_mentor: 'Avinash Kaushik + Edward Tufte',
  },
  'security-engineer': {
    icon: '🔒',
    capabilities: ['threat-modeling', 'vulnerability-scanning', 'security-review'],
    channeled_mentor: 'Bruce Schneier + OWASP contributors',
  },
  'performance-engineer': {
    icon: '⚡',
    capabilities: ['latency-analysis', 'profiling', 'optimization', 'load-testing'],
    channeled_mentor: 'Brendan Gregg + Aleksey Shipilëv',
  },
  'ml-ai-engineer': {
    icon: '🤖',
    capabilities: ['ml-integration', 'prompt-engineering', 'model-evaluation'],
    channeled_mentor: 'Andrej Karpathy + François Chollet',
  },
  'devops-engineer': {
    icon: '🚀',
    capabilities: ['ci-cd', 'infrastructure', 'deployment', 'monitoring'],
    channeled_mentor: 'Kelsey Hightower + Charity Majors',
  },
  'technical-writer': {
    icon: '✍️',
    capabilities: ['documentation', 'api-reference', 'release-notes'],
    channeled_mentor: 'Strunk + White',
  },
  'memory-controller': {
    icon: '🧠',
    capabilities: ['context-loading', 'memory-validation', 'history-compaction'],
    channeled_mentor: 'Mnemosyne (Greek goddess of memory)',
  },
};

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { fm: '', bodyStart: 0 };
  return { fm: match[1], bodyStart: match[0].length };
}

function migrateAgent(filePath) {
  const filename = path.basename(filePath, '.md');
  const data = AGENT_DATA[filename];
  if (!data) {
    console.log(`SKIP: ${filename} — no migration data`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const { fm, bodyStart } = parseFrontmatter(content);
  if (!fm) {
    console.log(`FAIL: ${filename} — no frontmatter found`);
    return false;
  }

  if (fm.includes('icon:') && fm.includes('capabilities:') && fm.includes('channeled_mentor:')) {
    console.log(`SKIP: ${filename} — already v2`);
    return false;
  }

  const body = content.slice(bodyStart);
  const model = 'opencode-go/claude-sonnet-4';

  const newFields = [
    `name: ${filename}`,
    `icon: ${data.icon}`,
    `capabilities:`,
    ...data.capabilities.map(c => `  - ${c}`),
    `origin: core`,
    `model: ${model}`,
    `channeled_mentor: ${data.channeled_mentor}`,
    ``,
  ].join('\n');

  const newContent = `---\n${newFields}${fm}\n---${body}`;
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`OK: ${filename}`);
  return true;
}

function validateMigrated(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { fm } = parseFrontmatter(content);
  if (!fm) return false;

  const required = ['name:', 'icon:', 'capabilities:', 'origin: core', 'channeled_mentor:'];
  for (const field of required) {
    if (!fm.includes(field)) {
      console.error(`FAIL: ${path.basename(filePath)} missing ${field}`);
      return false;
    }
  }

  const nameLine = fm.match(/^name: (.+)$/m);
  const filename = path.basename(filePath, '.md');
  if (nameLine && nameLine[1] !== filename) {
    console.error(`FAIL: ${filename} name field "${nameLine[1]}" doesn't match filename`);
    return false;
  }

  return true;
}

function main() {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  let count = 0;

  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    if (migrateAgent(filePath)) count++;
  }

  console.log(`\nMigrated ${count} agent(s) to v2 frontmatter.`);

  let allValid = true;
  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    if (!validateMigrated(filePath)) allValid = false;
  }

  if (allValid) {
    console.log('All 20 agents pass validation.');
  } else {
    console.error('Validation failed on some agents.');
    process.exit(1);
  }
}

main();
