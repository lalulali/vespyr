#!/usr/bin/env node
/**
 * Agent Resolver — Parser to resolve active agent personas in Vespyr
 */

const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: content };

  const yamlStr = match[1];
  const body = content.substring(match[0].length).trim();
  const data = {};
  
  const lines = yamlStr.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      data[key] = val;
    }
  }

  return { data, body };
}

function getAgentsDir() {
  const possibleDirs = [
    path.join(__dirname, '..', 'agents'),
    path.join(__dirname, '..', '..', '.agents', 'agents'),
    path.join(__dirname, '..', '..', '.opencode', 'agents')
  ];
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

function main() {
  const agentsDir = getAgentsDir();
  if (!agentsDir) {
    console.error(JSON.stringify({ error: 'Agents directory not found' }));
    process.exit(1);
  }

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
      temperature: parseFloat(data.temperature) || 0.1
    };
  }

  console.log(JSON.stringify(roster, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  parseFrontmatter
};
