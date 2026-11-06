'use strict';

/**
 * Test-only fs shim, loaded with NODE_OPTIONS=--require by
 * tests/test_memory_lock_contention.test.js.
 *
 * WHY IT EXISTS. The lost-update bug is a race between a compactor's read and its write.
 * Reproducing it by luck is flaky, so this shim widens the read-to-write window
 * deterministically: it snapshots active-decisions.md, drops a marker file, then blocks
 * before handing the (already stale) bytes back. The test can then attempt an append at a
 * known point instead of guessing at a sleep.
 *
 * No production code path loads this file.
 */

const fs = require('node:fs');

const delayMs = Number(process.env.VESPYR_SLOW_READ_MS || 0);
const marker = process.env.VESPYR_SLOW_READ_MARKER;
const originalReadFileSync = fs.readFileSync;

let delayed = false;

if (delayMs > 0 && marker) {
  fs.readFileSync = function readFileSyncWithWindow(file, ...rest) {
    const data = originalReadFileSync.call(fs, file, ...rest);

    // First read only: compaction reads active-decisions.md again at the end to count
    // tokens. Delaying that second read would just make the test slower, not wider.
    if (!delayed && String(file).endsWith('active-decisions.md')) {
      delayed = true;
      fs.writeFileSync(marker, String(process.pid));
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }

    return data;
  };
}
