/**
 * tests/test_spec_parity_anchor_am1.test.js — closing the A11 anchor gap.
 *
 * The frozen A11 grammar was `path#id`, and for HTML it resolved only against an `id="…"` attribute.
 * Measured consequence, on a real reverse-mode run: a local prototype with NO id attributes — the
 * normal case for a hand-written static HTML file — had no sanctioned machine-readable anchor at
 * all. `prototype.html#anything` failed because no id existed, and the only alternative, anchoring to
 * `prototype-inventory.md#INV-NN`, is reserved for NON-FILE prototypes and is a self-reference that
 * proves nothing about the prototype. 28 of 41 ledger rows rested on a human-only pointer.
 *
 * AM1 adds `path#css=<selector>` and `path#text=<phrase>` ADDITIVELY: every existing `path#id` anchor
 * keeps its exact meaning, and neither new form requires editing the artifact in order to make it
 * auditable — injecting ids into a delivered prototype changes the thing being audited.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveAnchor } = require('../.agents/scripts/spec_parity.js');

const HTML = `<!doctype html>
<html><body>
  <nav class="top-nav"><a href="/">Home</a></nav>
  <section class="checkout">
    <h2>Confirm your order</h2>
    <form class="checkout-form" action="/pay" method="post">
      <input name="card" placeholder="Card number">
      <button class="pay-btn" type="submit">Pay now</button>
    </form>
  </section>
  <footer><p>Refunds are handled by support within 5 business days.</p></footer>
</body></html>
`;

const WITH_IDS = `<!doctype html>
<html><body>
  <button id="pay-btn" class="pay-btn">Pay now</button>
</body></html>
`;

let root;
function setup() {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'a11-'));
  fs.writeFileSync(path.join(root, 'prototype.html'), HTML);
  fs.writeFileSync(path.join(root, 'with-ids.html'), WITH_IDS);
}
function teardown() {
  if (root) fs.rmSync(root, { recursive: true, force: true });
}

test('AM1: the gap is closed — an id-less prototype now has addressable anchors', (t) => {
  setup();
  t.after(teardown);

  // THE DEFECT: the only sanctioned form before AM1 could not address this file at all.
  const old = resolveAnchor(root, 'prototype.html#pay-btn');
  assert.strictEqual(old.ok, false);
  assert.match(old.reason, /declares no id attributes/,
    'the failure must explain WHY and name the alternative, not read like a typo');
  assert.match(old.reason, /#css=/, 'the message must point at the sanctioned alternative');
  assert.match(old.reason, /do not add ids/,
    'and must say not to mutate the artifact just to make it auditable');

  const css = resolveAnchor(root, 'prototype.html#css=.checkout-form .pay-btn');
  assert.strictEqual(css.ok, true, 'css form must resolve an id-less prototype');

  const text = resolveAnchor(root, 'prototype.html#text=Confirm your order');
  assert.strictEqual(text.ok, true, 'text form must resolve an id-less prototype');
});

test('AM1 is ADDITIVE — the frozen path#id form keeps its exact meaning', (t) => {
  setup();
  t.after(teardown);
  assert.strictEqual(resolveAnchor(root, 'with-ids.html#pay-btn').ok, true,
    'an existing id anchor must still resolve');
  const missing = resolveAnchor(root, 'with-ids.html#nope');
  assert.strictEqual(missing.ok, false);
  assert.match(missing.reason, /id="nope" not found/,
    'a file WITH ids must still report a plain not-found, not the AM1 guidance');
});

test('css subset: tag, .class, #id, [attr], [attr="v"], descendant, child, comma lists', (t) => {
  setup();
  t.after(teardown);
  const ok = [
    'prototype.html#css=nav.top-nav',
    'prototype.html#css=section.checkout .pay-btn',
    'prototype.html#css=form.checkout-form > button.pay-btn',
    'prototype.html#css=form > button',
    'prototype.html#css=button[type="submit"]',
    'prototype.html#css=input[name="card"]',
    'prototype.html#css=a[href="/"]',
    'prototype.html#css=nav .top-nav, footer p',
    'with-ids.html#css=#pay-btn',
  ];
  for (const a of ok) {
    assert.strictEqual(resolveAnchor(root, a).ok, true, `expected ${a} to resolve`);
  }
  assert.strictEqual(resolveAnchor(root, 'prototype.html#css=.nope').ok, false);
  assert.strictEqual(resolveAnchor(root, 'prototype.html#css=section > p').ok, false,
    'p is in the footer, not a child of section');
  assert.strictEqual(resolveAnchor(root, 'prototype.html#css=form.checkout-form > input').ok, true,
    'input is a genuine child of the form');
});

test('a child combinator tolerates siblings between parent and child', (t) => {
  setup();
  t.after(teardown);
  // <input> sits between <form> and <button>. The first implementation used a flat tag list and
  // treated "immediately preceding tag" as the parent, so this failed on correct markup.
  const r = resolveAnchor(root, 'prototype.html#css=form.checkout-form > button.pay-btn');
  assert.strictEqual(r.ok, true, 'siblings between a parent and its child are ordinary HTML');
});

test('`>` means child, not descendant — the discriminator for the sibling bug', (t) => {
  setup();
  t.after(teardown);
  // Without this case, degrading `>` to a plain descendant passes every other test in this file, and
  // the bug survives a revert. The button is a GRANDCHILD of section (section > form > button), so
  // `section > button` must not resolve while `section button` must.
  assert.strictEqual(resolveAnchor(root, 'prototype.html#css=section.checkout > button.pay-btn').ok, false,
    'a grandchild is not a child');
  assert.strictEqual(resolveAnchor(root, 'prototype.html#css=section.checkout button.pay-btn').ok, true,
    'but it is a descendant');
  assert.strictEqual(resolveAnchor(root, 'prototype.html#css=section.checkout > h2').ok, true,
    'h2 IS a direct child of section');
});

test('text form: minimum length, real presence, and ambiguity is reported', (t) => {
  setup();
  t.after(teardown);
  assert.strictEqual(resolveAnchor(root, 'prototype.html#text=Pay').ok, false,
    'a 3-character phrase is not an anchor');
  assert.strictEqual(resolveAnchor(root, 'prototype.html#text=Confirm your order').ok, true);
  assert.strictEqual(resolveAnchor(root, 'prototype.html#text=a phrase that is absent').ok, false);

  fs.writeFileSync(path.join(root, 'twice.html'),
    '<p>Refund policy</p><p>Refund policy</p>');
  const amb = resolveAnchor(root, 'twice.html#text=Refund policy');
  assert.strictEqual(amb.ok, true);
  assert.strictEqual(amb.ambiguous, true, 'an anchor matching twice must be flagged ambiguous');
});

test('path safety and missing files still fail closed', (t) => {
  setup();
  t.after(teardown);
  assert.strictEqual(resolveAnchor(root, 'nope.html#css=div').ok, false);
  assert.match(resolveAnchor(root, 'nope.html#css=div').reason, /file not found/);
  assert.strictEqual(resolveAnchor(root, '../escape.html#css=div').ok, false);
  assert.match(resolveAnchor(root, '/etc/passwd#css=div').reason, /repo-relative/);
});

test('an unsupported selector is a non-match, never a silent pass', (t) => {
  setup();
  t.after(teardown);
  // Pseudo-classes and unsupported combinators are outside the subset and must not resolve.
  for (const a of ['prototype.html#css=button:hover', 'prototype.html#css=nav + footer']) {
    assert.strictEqual(resolveAnchor(root, a).ok, false, `${a} is outside the supported subset`);
  }
});
