#!/usr/bin/env node
'use strict';
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('session:start:load-context')) return;
  h.readInput();
  h.context('Vespyr session start: load memory via @memory-controller load before reading specs or writing artifacts.');
});
