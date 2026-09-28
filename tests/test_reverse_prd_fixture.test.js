#!/usr/bin/env node
/**
 * tests/test_reverse_prd_fixture.test.js — 02n.F fixture integrity.
 *
 * Guards the reverse-PRD dry-run fixture against drift:
 *   - Every manifest anchor resolves against the prototype per the frozen
 *     A11 `path#id` grammar (02n plan §3).
 *   - All 10 detail classes carry seeded behaviors.
 *   - The kernel carries the canonical 5 fields (Review 10 §4 input anchor).
 *   - The State Switcher's 3 critical state moments exist (Review 10 §4).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'evals', 'fixtures', 'prototypes', 'reverse-prd');
const PROTOTYPE = path.join(DIR, 'workspace-members.html');
const MANIFEST = path.join(DIR, 'SEEDED-BEHAVIORS.md');
const KERNEL = path.join(DIR, 'SPEC.md');

/*
 * Browser smoke contract (P2-02)
 *
 * This package has no package-local Playwright/Puppeteer dependency or test
 * configuration. The Node tests in this file are structural gates, not
 * behavioral proof. A browser-capable harness must execute the contract below
 * against the fixture at all listed viewports and attach the browser results.
 * The contract is executable without adding a dependency:
 *
 *   node tests/test_reverse_prd_fixture.test.js --print-reverse-prd-browser-smoke
 *
 * Each check is deliberately phrased as an observable browser assertion. A
 * source-only pass must not be reported as satisfying these checks.
 */
const BROWSER_SMOKE_CONTRACT = Object.freeze({
  runner: 'harness-provided Playwright browser (no package-local dependency)',
  entry: 'evals/fixtures/prototypes/reverse-prd/workspace-members.html',
  command: 'node tests/test_reverse_prd_fixture.test.js --print-reverse-prd-browser-smoke',
  viewports: [
    { label: 'desktop', width: 1200, height: 762 },
    { label: 'mobile-320', width: 320, height: 812 },
    { label: 'mobile-375', width: 375, height: 812 },
    { label: 'mobile-414', width: 414, height: 896 },
  ],
  checks: [
    'P1-01: at each mobile viewport, open a lower mobile card action menu and assert every enabled menu item center resolves through elementFromPoint; Arrow/Home/End and Escape navigation still works and Escape returns to the summary.',
    'P1-02: at desktop and mobile widths, navigate to #edge-unicode-names and assert the resolved target has non-zero rendered bounds, belongs to usr_amelie, and document.activeElement is that target.',
    'P1-03: at desktop and mobile widths, mutate a row through each direct button and menu item available for resend, revoke, role change, and remove; assert focus is the equivalent action/summary or the documented #members fallback after rerender.',
    'P2-01: at mobile width, open #mobile-nav-drawer by deep link and assert #mobile-nav-trigger[aria-expanded="true"]; close it and assert the attribute is "false".',
    'P2-02: record console/page errors and the exact browser result for every check; do not substitute a source assertion for a browser result.',
    'R1-B1: at desktop width, open each shared modal and assert its rendered rectangle is horizontally and vertically centered; at mobile widths, assert the same dialogs remain bottom-anchored and inside the viewport.',
    'R1-B2: at 320, 375, and 414px, open the role, transfer, and bulk-role dialogs and assert their select controls each measure at least 44x44px without horizontal overflow.',
    'R1-S1: after a final-seat invite disables the opener at Free or Team cap, assert focus settles on the stable enabled #members target for at least 1000ms; otherwise assert it returns to the still-enabled trigger.',
  ],
});
if (process.argv.includes('--print-reverse-prd-browser-smoke')) {
  process.stdout.write(`${JSON.stringify(BROWSER_SMOKE_CONTRACT, null, 2)}\n`);
  process.exit(0);
}

const ANCHOR_RE = /^[A-Za-z0-9._/-]+#[A-Za-z][A-Za-z0-9._:-]*$/;
const CLASSES = [
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
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function manifestRows() {
  const md = fs.readFileSync(MANIFEST, 'utf8');
  const rows = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\| \d+ \| `([^`]+)` \| ([^|]+) \|/);
    if (m) rows.push({ anchor: m[1], cls: m[2].trim() });
  }
  return rows;
}

function resolves(anchor) {
  if (!ANCHOR_RE.test(anchor)) return false;
  const i = anchor.indexOf('#');
  const file = path.join(ROOT, anchor.slice(0, i));
  const id = anchor.slice(i + 1);
  if (!fs.existsSync(file)) return false;
  const content = fs.readFileSync(file, 'utf8');
  if (/\.(html?|svg)$/i.test(file)) {
    return new RegExp(`id=["']${escapeRe(id)}["']`).test(content);
  }
  return new RegExp(`(^|[^A-Za-z0-9_-])${escapeRe(id)}([^A-Za-z0-9_-]|$)`).test(content);
}

test('02n.F fixture: manifest anchors resolve per the frozen A11 grammar', () => {
  const rows = manifestRows();
  assert.equal(rows.length, 82, `expected 82 seeded behaviors, got ${rows.length}`);
  const bad = rows.filter((r) => !resolves(r.anchor));
  assert.deepEqual(bad, [], `unresolvable anchors: ${bad.map((r) => r.anchor).join(', ')}`);
});

test('02n.F fixture: all 10 detail classes are seeded', () => {
  const rows = manifestRows();
  const counts = new Map(CLASSES.map((c) => [c, 0]));
  for (const r of rows) {
    assert.ok(counts.has(r.cls), `unknown detail class "${r.cls}" in manifest`);
    counts.set(r.cls, counts.get(r.cls) + 1);
  }
  const uncovered = [...counts.entries()].filter(([, n]) => n === 0).map(([c]) => c);
  assert.deepEqual(uncovered, [], `classes without seeded behaviors: ${uncovered.join(', ')}`);
});

test('02n.F fixture: prototype uses Tailwind v4 browser CDN and shadcn token/component conventions', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  assert.match(html, /https:\/\/cdn\.jsdelivr\.net\/npm\/@tailwindcss\/browser@4/);
  for (const token of ['--background:', '--foreground:', '--primary:', '--muted-foreground:', '--border:', '--ring:', '--radius:']) {
    assert.ok(html.includes(token), `missing shadcn-style token ${token}`);
  }
  for (const utility of ['bg-background', 'text-foreground', 'bg-card', 'text-muted-foreground', 'rounded-md', 'focus-visible:ring-ring']) {
    assert.ok(html.includes(utility), `missing shadcn/Tailwind utility ${utility}`);
  }
});

test('02n.F fixture: complete member-management scenarios have stable anchors', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  for (const id of [
    'role-switcher',
    'workspace-mode-switcher',
    'theme-toggle',
    'seat-usage',
    'member-filters',
    'bulk-actions',
    'member-actions-menu',
    'nav-member-details',
    'nav-transfer-ownership',
    'state-no-results',
    'nav-invite-discard-confirm',
    'invite-resend',
    'toast-error',
    'mobile-member-cards',
    'column-visibility',
    'selection-summary',
    'clear-filters',
    'offline-banner',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `missing complete-feature anchor #${id}`);
  }
});

test('02n.F fixture: remediation contracts stay local, classified, and policy-driven', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  for (const marker of [
    'data-state-authority="prototype-only"',
    'data-derived="occupied-seats"',
    'data-policy-control="true"',
    'data-annotation-classification="annotation-only"',
    'data-annotation-classification="deferred-production"',
    'data-annotation-classification="executable-local"',
    'id="team-49-of-50"',
    'id="team-50-of-50"',
    'id="free-25-of-25"',
  ]) assert.ok(html.includes(marker), `missing remediation marker: ${marker}`);
  assert.doesNotMatch(html, /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest|WebSocket)\s*\(/);
  assert.doesNotMatch(html, /\.mutation-control/);
});

test('02n.F fixture: fresh design-review remediations remain wired', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  assert.match(html, /<p class="identity-full font-medium leading-6"[^>]*>\$\{name\}<\/p>/);
  assert.match(html, /\.dark \.text-destructive \{ color: var\(--status-danger\); \}/);
  assert.match(html, /function seatOccupiedCopy\(value\)/);
  assert.match(html, /function sampleRecordNoun\(count\)/);
  assert.match(html, /named \$\{sampleNoun\} \$\{derived\.sampleCount === 1 \? 'is' : 'are'\} rendered/);
  assert.match(html, /function captureEmptySnapshot\(\)/);
  assert.match(html, /state\.emptySnapshot = state\.emptySnapshot \|\| captureEmptySnapshot\(\)/);
  assert.match(html, /roleSwitcher\.value = state\.viewerRole/);
  assert.match(html, /workspaceModeSwitcher\.value = state\.workspaceMode/);
  assert.match(html, /const suspendedMembers = state\.entities\.filter/);
  assert.match(html, /suspendedMembers\.length === 0/);
  assert.match(html, /transfer-target-empty/);
  assert.match(html, /id="transfer-policy-reason"/);
  assert.match(html, /const policyReasonId = action === 'bulk-revoke'/);
  assert.match(html, /action === 'transfer-submit' \? 'transfer-policy-reason'/);
  assert.match(html, /kind: 'select-all'/);
  assert.match(html, /meta\.focus = focusDescriptorFor\(trigger, fallback\)/);
  assert.match(html, /const inviteFocus = dialogMeta\.get\(inviteDialog\)\?\.focus/);
  assert.match(html, /fallback: \{ kind: 'fallback', id: 'members' \}/);
  assert.match(html, /focusContext, onSuccess:/);
  assert.match(html, /\.dark #member-table-body \.role-badge/);
  assert.match(html, /id="bulk-role-policy-reason"/);
  assert.match(html, /const policyReasonId = action === 'bulk-revoke'/);
  assert.match(html, /control\.setAttribute\('aria-describedby', policyReasonId\)/);
  assert.match(html, /function removeConfirmationCopy\(entity\)/);
  assert.match(html, /return `Remove \$\{name\}\? They'll lose access immediately\.`/);
  assert.match(html, /function closeMenu\(menu, restoreFocus = false\)/);
  assert.match(html, /function positionMenu\(menu\)/);
  assert.match(html, /panel\.style\.top =/);
  assert.match(html, /function captureSelectionFocus\(\)/);
  assert.match(html, /function restoreSelectionFocus\(context\)/);
  assert.match(html, /function mutationFocusContext\(control\)/);
  assert.match(html, /function restoreMutationFocus\(context\)/);
  assert.match(html, /function restoreOpenDialog\(dialog\)/);
  assert.match(html, /dialog\.close = \(\.\.\.args\) =>/);
  assert.match(html, /event\.key === 'Escape'[\s\S]*closeMenu\(menu, true\)/);
  assert.match(html, /remaining === 1 \? ' remains' : 's remain'/);
  assert.match(html, /\.modal-sheet \{ position: fixed; inset: 0; margin: auto;/);
  assert.match(html, /#member-role-select, #transfer-owner-select, #bulk-role-value \{ height: 44px; min-height: 44px; \}/);
});

test('02n.F fixture: mobile action surfaces and form targets stay reachable', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  assert.match(html, /\.mobile-card \{ overflow: visible;/);
  assert.match(html, /#members-list \{ overflow: visible; \}/);
  assert.match(html, /\.member-actions-menu > \[role="menu"\] \{ position: fixed;/);
  assert.match(html, /#invite-email, #invite-role, #invite-message \{ min-height: 44px; \}/);
  assert.match(html, /data-runtime-anchor-proxy="true"/);
  assert.match(html, /entity\.id === 'usr_amelie' \? ' id="edge-unicode-names"/);
  assert.match(html, /data-focus-key="role-\$\{escapeHtml\(entity\.id\)\}-\$\{surface\}"/);
  assert.match(html, /runtime-anchor-registry/);
  assert.match(html, /data-anchor-ref="member-actions-menu"/);
  assert.match(html, /data-anchor-ref="nav-role-change"/);
  assert.match(html, /data-anchor-ref="invite-resend"/);
});

test('02n.F fixture: deep links restore state, filters, dialogs, and dynamic anchors', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  for (const id of ['overview', 'members', 'security', 'notifications', 'general', 'billing', 'integrations']) {
    assert.ok(html.includes(`id="${id}"`), `missing real navigation destination #${id}`);
  }
  assert.match(html, /window\.addEventListener\('hashchange', revealForAnchor\)/);
  assert.match(html, /function prepareDialogsForAnchor\(id\)/);
  assert.match(html, /function syncRuntimeAnchors\(\)/);
  assert.match(html, /rect\.width > 0 && rect\.height > 0/);
  assert.match(html, /function setMobileNavExpanded\(dialog, expanded\)/);
  assert.match(html, /dialog\.id !== id/);
  assert.match(html, /const screenAnchors = \{/);
  assert.match(html, /state\.filters = \{ query: '', role: 'invited', status: 'invited' \}/);
  assert.match(html, /state\.filters = \{ query: '', role: 'invited', status: 'expired' \}/);
  assert.match(html, /openDialog\(confirmation, \$\('#invite-email'\), 'button\[data-request-close\]'\)/);
  assert.match(html, /'copy-error-load': 'error'/);
  assert.match(html, /showToast\('Invite sent to jane@acme\.com\.', 'success'\)/);
  assert.match(html, /runMutation\('revoke', \(\) => mutateRevoke\('inv_jane'\)/);
});

test('02n.F fixture: empty data and focus lifecycle use explicit local state', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  assert.match(html, /screen === 'empty' && !wasEmpty[\s\S]*state\.entities = \[\]/);
  assert.match(html, /screen === 'populated' && state\.emptySnapshot[\s\S]*restoreEmptySnapshot\(state\.emptySnapshot\)/);
  assert.match(html, /screen === 'populated' && wasEmpty[\s\S]*state\.entities = makeEntities\(plan\(\)\.target\)/);
  assert.match(html, /state\.screen = 'populated';/);
  assert.match(html, /function focusDescriptorFor\(trigger, fallback/);
  assert.match(html, /function resolveFocusTarget\(descriptor\)/);
  assert.match(html, /function fallbackFocusFor\(dialog\)/);
  assert.match(html, /const REMOVED_ROW_FOCUS_FALLBACK = 'members'/);
  assert.match(html, /candidate\.sample && candidate\.kind === 'member'/);
  assert.match(html, /const visibleIds = new Set\(\(state\.derived\?\.filtered \|\| \[\]\)/);
  assert.match(html, /const rendered = state\.derived\?\.filtered\?\.some/);
  assert.match(html, /nextOwner\.sample/);
  assert.match(html, /function mutationFocusContext\(control\)/);
  assert.match(html, /function restoreMutationFocus\(context\)/);
  assert.match(html, /const sourceMenu = trigger\?\.closest\?\.\('\.member-actions-menu'\);/);
  assert.match(html, /if \(!dialog && id !== 'member-actions-menu'/);
});

test('02n.F fixture: invite errors keep one associated message and one announcement', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  assert.match(html, /data-base-describedby="invite-email-help invite-email-errors"/);
  assert.match(html, /aria-errormessage="invite-email-error-summary"/);
  assert.match(html, /summary\.textContent = message;/);
  assert.doesNotMatch(html, /setHidden\(\$\(`#\$\{errorId\}`\), false\)/);
  assert.match(html, /announce\(`Invite not sent\. \$\{message\}`, true\)/);
  assert.match(html, /field\.setAttribute\('aria-describedby', field\.dataset\.baseDescribedby\)/);
});

test('02n.F fixture: rerenders preserve columns and account label-in-name', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  assert.match(html, /renderRows\(state\.derived\);\s*updateColumnVisibility\(\);/);
  assert.match(html, /toggle\.checked = state\.columns\[key\]/);
  assert.match(html, /aria-label="Open account menu for Chris \(CR\)"/);
  assert.match(html, /<span aria-hidden="true">CR<\/span>/);
});

test('02n.F fixture: P2-02 browser smoke contract is explicit and not source-only behavioral proof', () => {
  assert.match(BROWSER_SMOKE_CONTRACT.runner, /Playwright/);
  assert.equal(BROWSER_SMOKE_CONTRACT.entry, 'evals/fixtures/prototypes/reverse-prd/workspace-members.html');
  assert.deepEqual(BROWSER_SMOKE_CONTRACT.viewports.map(({ width }) => width), [1200, 320, 375, 414]);
  assert.equal(BROWSER_SMOKE_CONTRACT.checks.length, 8);
  assert.match(BROWSER_SMOKE_CONTRACT.checks[0], /elementFromPoint/);
  assert.match(BROWSER_SMOKE_CONTRACT.checks[1], /non-zero rendered bounds/);
  assert.match(BROWSER_SMOKE_CONTRACT.checks[4], /source assertion/);
  assert.match(BROWSER_SMOKE_CONTRACT.checks[5], /centered/);
  assert.match(BROWSER_SMOKE_CONTRACT.checks[6], /44x44px/);
  assert.match(BROWSER_SMOKE_CONTRACT.checks[7], /#members target/);
});

test('02n.F fixture: prototype carries the 3 critical state moments + switcher', () => {
  const html = fs.readFileSync(PROTOTYPE, 'utf8');
  for (const id of ['state-switcher', 'state-empty', 'state-populated', 'state-error']) {
    assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  }
});

test('02n.F fixture: SPEC kernel carries the canonical 5 fields', () => {
  const kernel = fs.readFileSync(KERNEL, 'utf8');
  for (const heading of ['## 1. Why', '## 2. Capabilities', '## 3. Constraints', '## 4. Non-goals', '## 5. Success signal']) {
    assert.ok(kernel.includes(heading), `kernel missing "${heading}"`);
  }
});
