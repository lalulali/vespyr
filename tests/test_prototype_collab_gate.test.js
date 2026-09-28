#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '.agents', 'scripts', 'prototype_collab_gate.js');

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prototype-collab-'));
  const prototype = path.join(root, 'prototype.html');
  fs.writeFileSync(prototype, '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>', 'utf8');
  const hash = crypto.createHash('sha256').update(fs.readFileSync(prototype)).digest('hex');
  const record = path.join(root, 'prototype-collaboration.md');
  fs.writeFileSync(record, `# Prototype Collaboration

## Track and runtime
- **Track:** \`static-html\`
- **Runtime:** \`vanilla HTML/CSS/JS + Tailwind CDN\`
- **Review scope:** \`handoff\`
- **Track classification:** \`SATISFIED\`
- **R1 evidence disposition:** \`SATISFIED\`
- **Implementation handoff:** \`SATISFIED\`
- **Prototype:** \`prototype.html\`
- **Prototype SHA-256:** \`${hash}\`
- **Date:** \`2026-09-24\`

## Track validation
- **Track gate command:** \`node shadcn_gate.js verify --track static-html --prototype prototype.html\`
- **Track gate result:** \`PASS\`
- **Evidence:** exit 0

## Reviewed surface
| Area | Evidence reviewed | Notes |
|---|---|---|
| Screens and flows | prototype.html | reviewed |
| Critical states | state switcher | reviewed |
| Interactions and feedback | hover/focus | reviewed |
| Responsive behavior | mobile/desktop | reviewed |
| Accessibility risks | keyboard/focus | reviewed |

## Implementation mapping
- **Token mapping:** CSS variables mapped
- **Static-to-component mapping:** future shadcn components identified
- **Component/API boundary:** N/A
- **Feasibility risks:** none
- **Accessibility disposition:** \`SATISFIED\`
- **Feasibility disposition:** \`SATISFIED\`

## Decisions and open questions
| ID | Decision or question | Owner | Status |
|---|---|---|---|
| PC-01 | none | Chris | resolved |

## Reviewer sign-off
| Reviewer | State | Evidence/date |
|---|---|---|
| @product-designer | \`SATISFIED\` | visual review / 2026-09-24 |
| @tech-lead | \`SATISFIED\` | feasibility review / 2026-09-24 |

## Disposition
- **State:** \`SATISFIED\`
- **Owner disposition for blockers:** none
- **Next action:** proceed
`, 'utf8');
  return { root, prototype, record };
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, 'verify', ...args, '--json'], { encoding: 'utf8' });
}

test('prototype collaboration gate accepts a complete static review', () => {
  const { root, prototype, record } = setup();
  const result = run(['--root', root, '--record', record, '--track', 'static-html', '--prototype', prototype]);
  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(result.stdout);
  assert.equal(json.pass, true);
  assert.equal(json.evidence.reviewerStates.productDesigner, true);
  assert.equal(json.evidence.reviewerStates.techLead, true);
  assert.equal(json.evidence.prototypeHashChecked, true);
});

test('prototype collaboration gate allows bounded R1 evidence while implementation handoff remains blocked', () => {
  const { root, prototype, record } = setup();
  const text = fs.readFileSync(record, 'utf8')
    .replace('**Review scope:** `handoff`', '**Review scope:** `r1-evidence`')
    .replace('**Implementation handoff:** `SATISFIED`', '**Implementation handoff:** `BLOCKED`')
    .replace('**State:** `SATISFIED`', '**State:** `BLOCKED`')
    .replace('**Accessibility disposition:** `SATISFIED`', '**Accessibility disposition:** `BLOCKED`');
  fs.writeFileSync(record, text, 'utf8');
  const r1 = run(['--root', root, '--record', record, '--track', 'static-html', '--prototype', prototype, '--scope', 'r1-evidence']);
  assert.equal(r1.status, 0, r1.stderr);
  assert.equal(JSON.parse(r1.stdout).evidence.implementationHandoff, 'BLOCKED');
  const handoff = run(['--root', root, '--record', record, '--track', 'static-html', '--prototype', prototype, '--scope', 'handoff']);
  assert.equal(handoff.status, 1);
  assert.match(JSON.parse(handoff.stdout).problems.join('\n'), /handoff scope/);
});

test('prototype collaboration gate rejects a missing tech-lead sign-off', () => {
  const { root, prototype, record } = setup();
  const text = fs.readFileSync(record, 'utf8').replace('| @tech-lead | `SATISFIED` | feasibility review / 2026-09-24 |', '| @tech-lead | `BLOCKED` | feasibility review / 2026-09-24 |');
  fs.writeFileSync(record, text, 'utf8');
  const result = run(['--root', root, '--record', record, '--track', 'static-html', '--prototype', prototype]);
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).problems.join('\n'), /@tech-lead/);
});

test('prototype collaboration gate rejects a stale prototype hash', () => {
  const { root, prototype, record } = setup();
  const text = fs.readFileSync(record, 'utf8').replace(/[a-f0-9]{64}/, '0'.repeat(64));
  fs.writeFileSync(record, text, 'utf8');
  const result = run(['--root', root, '--record', record, '--track', 'static-html', '--prototype', prototype]);
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).problems.join('\n'), /SHA-256/);
});
