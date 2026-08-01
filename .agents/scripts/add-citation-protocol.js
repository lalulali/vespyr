#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

const SHARED_PROTOCOL = `
## Citation Protocol

When your output includes facts, quotes, statistics, data, or claims from a real source, you MUST cite the source inline and provide a footnote.

**Inline format:** \`[N]\` — bracketed number linking to the footnote at the end of the artifact.

**Footnote format:**
[^N]: Author/Org, "Title," Source, Date. URL (if applicable). Accessed: YYYY-MM-DD.

**What requires a citation:**
- Direct quotes (verbatim text from a source)
- Paraphrased claims from a specific source
- Statistics, numbers, benchmarks, survey results
- Frameworks, methodologies, or models attributed to a person/org
- Code patterns or algorithms from external sources

**What does NOT require a citation:**
- Your own analysis or reasoning (original thought)
- General knowledge not attributable to a specific source
- Internal project artifacts (cite by file path, not footnote)
- Spec-kernel content (already has CAP-IDs for traceability)

**If you cannot find the source:** say "Source: unverified" and flag it for the user. Never fabricate a citation.

See \`.agents/references/citation-format.md\` for the full format spec.
`;

const CITATION_EMPHASIS = {
  researcher: '**Your emphasis:** Every market statistic, competitor data point, and trend claim gets a footnote.',
  'user-researcher': '**Your emphasis:** Every interview quote gets a participant ID + date; survey results get source + sample size.',
  'data-analyst': '**Your emphasis:** Every metric, funnel number, and experiment result gets a telemetry source + date range.',
  architect: '**Your emphasis:** Every trade-off claim references the ADR or external paper that informs it.',
  'ml-ai-engineer': '**Your emphasis:** Every model benchmark references the paper, model card, or eval harness.',
  'security-engineer': '**Your emphasis:** Every vulnerability reference gets a CVE ID or OWASP reference.',
  'performance-engineer': '**Your emphasis:** Every latency benchmark references the measurement method + hardware.',
  'technical-writer': '**Your emphasis:** Every API claim references the source file:line or spec section.',
  founder: '**Your emphasis:** Every market-sizing or competitive claim in the GO/PIVOT/KILL gets a source.',
  'product-manager': '**Your emphasis:** Every user need, JTBD claim, and market reference in the PRD gets a source.',
  'product-designer': '**Your emphasis:** Every design principle reference (Norman, Nielsen, etc.) gets a source.',
  'tech-lead': '**Your emphasis:** Every estimation benchmark or pattern reference gets a source.',
  developer: '**Your emphasis:** Every code pattern, library usage, or API reference gets a source link.',
  'code-reviewer': '**Your emphasis:** Every pattern violation reference gets a source (style guide, lint rule, etc.).',
  'qa-engineer': '**Your emphasis:** Every test standard or compliance reference gets a source.',
  'ux-researcher': '**Your emphasis:** Every usability heuristic reference (Nielsen, WCAG, etc.) gets a source.',
  'devops-engineer': '**Your emphasis:** Every infrastructure best-practice or cloud reference gets a source.',
};

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

  if (content.includes('## Citation Protocol')) {
    console.log('SKIP: ' + name + ' — already has Citation Protocol');
    continue;
  }

  let block = SHARED_PROTOCOL;
  if (CITATION_EMPHASIS[name]) {
    block += '\n' + CITATION_EMPHASIS[name] + '\n';
  }

  content = content.replace(
    '<!-- /IDENTITY -->',
    '<!-- /IDENTITY -->' + block,
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('OK: ' + name);
  count++;
}

console.log('\nAdded Citation Protocol to ' + count + ' agent(s).');
