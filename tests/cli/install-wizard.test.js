const { describe, it } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const { createInstaller } = require('../../bin/lib/installer.js');

// Interactive fresh-install wizard navigation: every "← Back" must return to
// the previous logical page — never jump to the wizard start, never no-op.
// The wizard deps are injectable (createInstaller(deps)), so the flow is
// scripted page-by-page here; the run always ends in "Cancel installation"
// (process.exit intercepted), so nothing touches the filesystem.

function pageOf(question) {
  if (question.includes('scope')) return 'scope';
  if (question.includes('target directory')) return 'path';
  if (question.includes('link method')) return 'method';
  if (question.includes('language for generated')) return 'language';
  if (question.includes('Proceed')) return 'confirm';
  throw new Error(`unrecognized wizard question: ${question}`);
}

async function driveWizard(queues) {
  const trace = [];
  const deps = {
    log: () => {},
    logDry: () => {},
    logWarn: () => {},
    logError: () => {},
    askChecklist: async () => {
      trace.push('harnesses');
      return [];
    },
    askSingleChoice: async (question) => {
      const page = pageOf(question);
      trace.push(page);
      return (queues[page] || []).shift();
    },
    askQuestion: async () => {
      trace.push('name');
      return 'Tester';
    },
    detectRepository: () => ({}),
    detectMethod: () => 'symlink',
    performSyncDocs: () => {},
    getExistingUserNickname: () => 'User',
    updateUserNickname: () => {},
    writeManifest: () => {},
    performGenerateManifest: () => {},
    removeStaleManifestFiles: () => {},
    detectInstalledHarnesses: () => [],
    installGitHook: () => {},
    setupSignalHandler: () => {},
    teardownSignalHandler: () => {},
    printSummary: () => {},
    clearScreen: () => {},
    printWizardSummary: () => {},
    wizardState: {},
    ASCII_ART: '',
    VERSION: 'test',
    AGENTS_SRC: path.join(__dirname, '..', '..', '.agents'),
  };

  const installer = createInstaller(deps);
  const origExit = process.exit;
  let exitCode = null;
  process.exit = (code) => {
    exitCode = code;
    throw new Error('EXIT_CALLED');
  };
  try {
    await installer.performFreshInstall(path.join(os.tmpdir(), 'vespyr-wizard-test'), {
      harnesses: [],
      yes: false,
    });
  } catch (e) {
    if (e.message !== 'EXIT_CALLED') throw e;
  } finally {
    process.exit = origExit;
  }
  return { trace, exitCode };
}

describe('Fresh-install wizard back navigation', () => {
  it('confirm "Back to edit" returns to the previous page, not the wizard start', async () => {
    const { trace, exitCode } = await driveWizard({
      scope: [0], // Project-level
      path: [0], // Current directory
      method: [0], // Symlink
      language: [0, 0], // first pass, then revisited after going back
      confirm: [1, 2], // "← Back to edit", then "Cancel installation"
    });

    assert.deepStrictEqual(trace, [
      'harnesses', 'scope', 'path', 'method', 'name', 'language', 'confirm',
      'language', // ← back lands on the previous page
      'confirm',
    ]);
    assert.strictEqual(exitCode, 0, 'cancel must exit cleanly');
  });

  it('global scope: method back returns to scope (path step is skipped both ways)', async () => {
    const { trace, exitCode } = await driveWizard({
      scope: [1, 1], // Global, then Global again after going back
      method: [2, 0], // "← Back", then Symlink
      language: [0],
      confirm: [2], // Cancel
    });

    assert.deepStrictEqual(trace, [
      'harnesses', 'scope', 'method',
      'scope', // ← back skips the auto-skipped path page
      'method', 'name', 'language', 'confirm',
    ]);
    assert.strictEqual(exitCode, 0, 'cancel must exit cleanly');
  });
});
