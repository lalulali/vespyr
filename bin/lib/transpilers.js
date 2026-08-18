const fs = require('fs');
const path = require('path');

function yamlQuote(value) {
  const s = String(value);
  if (/[\r\n]/.test(s)) {
    const lines = s.split(/\r?\n/).map((l) => `  ${l}`);
    return `|\n${lines.join('\n')}`;
  }
  const escaped = s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\u0000-\u001f\u007f]/g, (c) =>
      `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
    );
  return `"${escaped}"`;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: content };

  const data = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const kv = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/);
    if (!kv) continue;

    const key = kv[1].trim();
    let val = kv[2].trim();

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    } else if (val === 'true') {
      val = true;
    } else if (val === 'false') {
      val = false;
    }

    data[key] = val;
  }

  const body = content.slice(match[0].length).trim();
  return { data, body };
}

function transpileCopilotYAML(agentsDir, outputDir, dryRun = false) {
  const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
  if (dryRun) return;

  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    const { data, body } = parseFrontmatter(content);
    if (!data.description && !body) continue;

    const name = path.basename(file, '.md');
    const desc = yamlQuote(data.description || '');

    const yml = [
      `name: ${name}`,
      `description: ${desc}`,
      `instructions: |`,
      ...body.split('\n').map((line) => `  ${line}`),
      '',
    ].join('\n');

    fs.writeFileSync(path.join(outputDir, `${name}.yml`), yml);
  }
}

function transpileCursorMDC(agentsDir, outputDir, dryRun = false) {
  const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
  if (dryRun) return;

  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    const { data, body } = parseFrontmatter(content);
    if (!data.description && !body) continue;

    const name = path.basename(file, '.md');
    const desc = (data.description || '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/"/g, '\\"');

    const mdc = [
      '---',
      `description: "${desc}"`,
      'globs: "*"',
      'alwaysApply: false',
      '---',
      '',
      body,
    ].join('\n');

    fs.writeFileSync(path.join(outputDir, `${name}.mdc`), mdc);
  }
}

module.exports = {
  yamlQuote,
  parseFrontmatter,
  transpileCopilotYAML,
  transpileCursorMDC
};
