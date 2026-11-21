#!/usr/bin/env node
'use strict';
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('route:task')) return;
  const input = h.readInput();
  const prompt = String(input.prompt || input.user_prompt || input.userPrompt || '');
  const rules = [
    [/test|qa|bug|coverage|regression/i, '@qa-engineer'],
    [/security|audit|compliance|privacy/i, '@security-engineer'],
    [/design|ux|wireframe|usability/i, '@product-designer'],
    [/architect|adr|trade.?off|topology/i, '@architect'],
    [/deploy|release|launch|ship/i, '@devops-engineer'],
    [/plan|estimate|break.?down/i, '@tech-lead'],
    [/build|implement|code|fix/i, '@developer'],
  ];
  const hit = rules.find(([re]) => re.test(prompt));
  h.context('Routing suggestion: ' + (hit ? hit[1] : '@product-manager') + ' (advisory — owner decides).');
});
