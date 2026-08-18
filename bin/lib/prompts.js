const readline = require('readline');

/**
 * Interactive terminal prompts for CLI wizard.
 * Includes robust raw-mode cleanup on exit or SIGINT.
 */

function askQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askSingleChoice(query, choices, defaultIndex = 0) {
  if (!process.stdin.isTTY) {
    return Promise.resolve(choices[defaultIndex]?.value ?? choices[defaultIndex]);
  }

  return new Promise((resolve) => {
    let selected = defaultIndex;

    const cleanup = () => {
      try {
        process.stdin.setRawMode(false);
      } catch {}
      process.stdout.write('\x1B[?25h'); // Show cursor
      process.stdin.removeAllListeners('keypress');
    };

    const render = () => {
      process.stdout.write(`\x1B[${choices.length + 1}A\r`);
      console.log(query);
      choices.forEach((c, idx) => {
        const label = typeof c === 'object' ? c.label : c;
        const prefix = idx === selected ? '> \x1b[36m●\x1b[0m ' : '  ○ ';
        console.log(`${prefix}${label}\x1B[K`);
      });
    };

    console.log(query);
    choices.forEach((c, idx) => {
      const label = typeof c === 'object' ? c.label : c;
      const prefix = idx === selected ? '> \x1b[36m●\x1b[0m ' : '  ○ ';
      console.log(`${prefix}${label}`);
    });

    readline.emitKeypressEvents(process.stdin);
    try {
      process.stdin.setRawMode(true);
    } catch {}
    process.stdout.write('\x1B[?25l'); // Hide cursor

    const onKeypress = (str, key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(130);
      } else if (key.name === 'up') {
        selected = (selected - 1 + choices.length) % choices.length;
        render();
      } else if (key.name === 'down') {
        selected = (selected + 1) % choices.length;
        render();
      } else if (key.name === 'return') {
        cleanup();
        const chosen = choices[selected];
        resolve(typeof chosen === 'object' ? chosen.value : chosen);
      }
    };

    process.stdin.on('keypress', onKeypress);
  });
}

function askChecklist(query, items) {
  if (!process.stdin.isTTY) {
    return Promise.resolve(items.map(i => i.id || i.value || i));
  }

  return new Promise((resolve) => {
    let cursor = 0;
    const selected = new Set(items.filter(i => i.selected !== false).map((_, idx) => idx));

    const cleanup = () => {
      try {
        process.stdin.setRawMode(false);
      } catch {}
      process.stdout.write('\x1B[?25h');
      process.stdin.removeAllListeners('keypress');
    };

    const render = () => {
      process.stdout.write(`\x1B[${items.length + 1}A\r`);
      console.log(query);
      items.forEach((item, idx) => {
        const isCursor = idx === cursor ? '>' : ' ';
        const isChecked = selected.has(idx) ? '\x1b[32m[✓]\x1b[0m' : '[ ]';
        const label = typeof item === 'object' ? item.label : item;
        console.log(`${isCursor} ${isChecked} ${label}\x1B[K`);
      });
    };

    console.log(query);
    items.forEach((item, idx) => {
      const isCursor = idx === cursor ? '>' : ' ';
      const isChecked = selected.has(idx) ? '\x1b[32m[✓]\x1b[0m' : '[ ]';
      const label = typeof item === 'object' ? item.label : item;
      console.log(`${isCursor} ${isChecked} ${label}`);
    });

    readline.emitKeypressEvents(process.stdin);
    try {
      process.stdin.setRawMode(true);
    } catch {}
    process.stdout.write('\x1B[?25l');

    const onKeypress = (str, key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(130);
      } else if (key.name === 'up') {
        cursor = (cursor - 1 + items.length) % items.length;
        render();
      } else if (key.name === 'down') {
        cursor = (cursor + 1) % items.length;
        render();
      } else if (key.name === 'space') {
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
        render();
      } else if (key.name === 'return') {
        cleanup();
        const result = Array.from(selected).map(idx => {
          const it = items[idx];
          return typeof it === 'object' ? (it.id || it.value || it.label) : it;
        });
        resolve(result);
      }
    };

    process.stdin.on('keypress', onKeypress);
  });
}

module.exports = {
  askQuestion,
  askSingleChoice,
  askChecklist
};
