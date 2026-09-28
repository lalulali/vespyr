'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SOURCE_REL = 'evals/fixtures/prototypes/reverse-prd';
const RESULT_REL = 'artifacts/evals/reverse-prd/a8/reverse';
const PROTOTYPE_REL = `${SOURCE_REL}/workspace-members.html`;

function write(root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function createFixtureTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-reverse-prd-'));
  fs.cpSync(path.join(ROOT, SOURCE_REL), path.join(root, SOURCE_REL), { recursive: true });

  write(
    root,
    `${RESULT_REL}/prototype-inventory.md`,
    `## Prototype Inventory\n\n| ID | Kind | Name | Anchor (path#id) | Observable fact |\n|---|---|---|---|---|\n| INV-01 | behavior | Empty state | \`${PROTOTYPE_REL}#state-empty\` | Empty member state is present |
| INV-49 | behavior | Error state | \`${PROTOTYPE_REL}#state-error\` | Load error state is present |\n`
  );
  write(
    root,
    `${RESULT_REL}/requirements.md`,
    `## Evidence Ledger\n\n| ID | Statement | Anchor (path#id) | Type | Status |\n|---|---|---|---|---|\n| L-01 | Empty state is available | \`${PROTOTYPE_REL}#state-empty\` | prototype | confirmed |\n| L-02 | Error state is available | \`${PROTOTYPE_REL}#state-error\` | prototype | confirmed |\n| L-03 | Unobserved follow-up | — | owner | [OPEN] |\n`
  );
  write(
    root,
    `${RESULT_REL}/parity-report.md`,
    `---\nreport: parity\nprototype: ${PROTOTYPE_REL}\ninventory: ${RESULT_REL}/prototype-inventory.md\nrequirements: ${RESULT_REL}/requirements.md\nprototype_type: file\n---\n# Parity Report\n\n## Detail-class coverage\n\n| Detail class | Evidence | Status |\n|---|---|---|\n${[
      'Screen states',
      'Edge cases & validation',
      'Data fields & types',
      'Permissions & auth',
      'Navigation & flows',
      'Copy & tone',
      'Telemetry',
      'Performance notes',
      'Accessibility',
      'Platform constraints',
    ].map((name) => `| ${name} | L-01 | covered |`).join('\n')}\n\n## Orphan deferrals\n\n| Anchor | Owner | Date | Reason |\n|---|---|---|---|\n| — | — | — | — |\n`
  );

  return {
    root,
    source: SOURCE_REL,
    result: RESULT_REL,
    prototype: PROTOTYPE_REL,
  };
}

module.exports = {
  ROOT,
  SOURCE_REL,
  RESULT_REL,
  PROTOTYPE_REL,
  createFixtureTree,
};
