/**
 * Unified YAML frontmatter parser and serializer for skills, agents, and templates.
 * Lightweight, zero-dependency implementation.
 */

function parseFrontmatter(content) {
  if (!content || typeof content !== 'string') {
    return { frontmatter: {}, body: content || '', hasFrontmatter: false };
  }

  const trimmed = content.replace(/^\uFEFF/, ''); // Strip BOM
  if (!trimmed.startsWith('---')) {
    return { frontmatter: {}, body: content, hasFrontmatter: false };
  }

  const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content, hasFrontmatter: false };
  }

  const rawYaml = match[1];
  const body = match[2];
  const frontmatter = {};

  const lines = rawYaml.split(/\r?\n/);
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    // Array item under current key
    if (trimmedLine.startsWith('- ') && currentKey) {
      const itemVal = trimmedLine.slice(2).trim().replace(/^['"](.*)['"]$/, '$1');
      if (!currentArray) {
        currentArray = [];
        frontmatter[currentKey] = currentArray;
      }
      currentArray.push(itemVal);
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      currentArray = null;
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();

      if (val === '') {
        currentKey = key;
        frontmatter[key] = {};
      } else {
        currentKey = key;
        // Strip outer quotes if any
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
          val = val.slice(1, -1);
        } else if (val === 'true') {
          val = true;
        } else if (val === 'false') {
          val = false;
        } else if (!isNaN(Number(val)) && val !== '') {
          val = Number(val);
        }
        frontmatter[key] = val;
      }
    }
  }

  return { frontmatter, body, hasFrontmatter: true };
}

function serializeFrontmatter(frontmatter, body) {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return body;
  }

  const lines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${key}:`);
      for (const [subKey, subVal] of Object.entries(value)) {
        lines.push(`  ${subKey}: ${subVal}`);
      }
    } else if (typeof value === 'string' && (value.includes(':') || value.includes('#') || value.includes('\'') || value.includes('"'))) {
      lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(body.startsWith('\n') ? body.slice(1) : body);

  return lines.join('\n');
}

module.exports = {
  parseFrontmatter,
  serializeFrontmatter
};
