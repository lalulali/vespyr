#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('session:start:detect-package-manager')) return;
  const root = h.rootOf(h.readInput());
  const map = [['pnpm-lock.yaml','pnpm'],['yarn.lock','yarn'],['bun.lockb','bun'],['package-lock.json','npm'],['poetry.lock','poetry'],['Cargo.lock','cargo'],['go.sum','go']];
  const hit = map.find(([f]) => fs.existsSync(path.join(root, f)));
  h.context('Package manager: ' + (hit ? hit[1] : 'unknown') + '. Record it in project-context.md via @memory-controller if absent.');
});
