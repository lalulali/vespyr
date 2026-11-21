/**
 * bin/lib/hooks.js — per-harness hook wiring emitted at install time (F2.3).
 *
 * The hook scripts are harness-agnostic (stdin JSON + exit codes). This module
 * only writes each harness's configuration, using the event names verified in
 * 03 F2.3 V1–V4 on 2026-11-19:
 *   Claude Code  .claude/settings.json          PascalCase events, exit 2 blocks
 *   Cursor       .cursor/hooks.json             camelCase, failClosed, timeout
 *   Copilot      .github/hooks/vespyr.json      camelCase, timeoutSec, fail-closed errors
 *   OpenCode     .opencode/plugins/vespyr-hooks.ts  V2 Plugin.define (no hooks config key)
 */
const fs = require("fs");
const path = require("path");

const REGISTRY = path.join(__dirname, "..", "..", ".agents", "hooks", "hooks.json");

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
}

function readJsonIf(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function isVespyrHookEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (typeof entry.command === "string" && entry.command.includes(".agents/scripts/hooks/")) return true;
  if (Array.isArray(entry.hooks)) {
    return entry.hooks.some((h) => h && typeof h.command === "string" && h.command.includes(".agents/scripts/hooks/"));
  }
  return false;
}

function mergeHookMap(existingHooks, incomingHooks) {
  const merged = { ...(existingHooks && typeof existingHooks === "object" ? existingHooks : {}) };
  for (const [event, entries] of Object.entries(incomingHooks || {})) {
    const kept = Array.isArray(merged[event]) ? merged[event].filter((e) => !isVespyrHookEntry(e)) : [];
    merged[event] = [...kept, ...entries];
  }
  return merged;
}

function writeJson(file, data, logDry, dryRun, mergeMode = false) {
  if (dryRun) {
    logDry(`Would write hooks config: ${file}`);
    return;
  }
  let out = data;
  if (mergeMode) {
    const existing = readJsonIf(file);
    if (existing && typeof existing === "object") {
      out = { ...existing, ...data, hooks: mergeHookMap(existing.hooks, data.hooks) };
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n", "utf8");
}

function claudeConfig(hooks) {
  const out = {};
  for (const h of hooks) {
    const event = h.event;
    if (!out[event]) out[event] = [];
    const entry = { hooks: [{ type: "command", command: `node ${h.script}`, timeout: h.timeout || 10 }] };
    if (h.matcher) entry.matcher = h.matcher;
    out[event].push(entry);
  }
  return { hooks: out };
}

function cursorConfig(hooks) {
  const out = {};
  for (const h of hooks) {
    const event = h.cursorEvent || h.event;
    if (!out[event]) out[event] = [];
    const entry = { command: `node ${h.script}`, timeout: h.timeout || 10 };
    if (h.matcher) entry.matcher = h.matcher;
    if (h.blocking) entry.failClosed = true;
    out[event].push(entry);
  }
  return { version: 1, hooks: out };
}

function copilotConfig(hooks) {
  const out = {};
  for (const h of hooks) {
    const event = h.copilotEvent || h.event;
    if (!out[event]) out[event] = [];
    out[event].push({ type: "command", command: `node ${h.script}`, timeoutSec: h.timeout || 10 });
  }
  return { version: 1, hooks: out };
}

/**
 * OpenCode needs no emitted config: the plugin ships statically at
 * `.agents/plugins/vespyr-hooks.ts` and OpenCode discovers it through the
 * `.opencode -> .agents` symlink the adapter creates. Emitting it at install
 * would land inside the symlink, pollute the integrity manifest, and leave
 * residue after uninstall (caught by install-flows tests 2026-11-19).
 */
function emitHarnessHooks(targetDir, selections, { dryRun = false, logDry = () => {} } = {}) {
  const hooks = loadRegistry().hooks;
  const written = [];
  const emit = (rel, content, mergeMode = false) => {
    writeJson(path.join(targetDir, rel), content, logDry, dryRun, mergeMode);
    written.push(rel);
  };

  if (selections.includes("claude")) emit(path.join(".claude", "settings.json"), claudeConfig(hooks), true);
  if (selections.includes("cursor")) emit(path.join(".cursor", "hooks.json"), cursorConfig(hooks), true);
  if (selections.includes("github")) emit(path.join(".github", "hooks", "vespyr.json"), copilotConfig(hooks), false);
  // OpenCode: no emitted config. The static plugin at .agents/plugins/vespyr-hooks.ts
  // is discovered through the .opencode -> .agents symlink created by its adapter.
  return written;
}

function removeHarnessHooks(targetDir, selections) {
  const targets = [
    ["claude", ".claude/settings.json"],
    ["cursor", ".cursor/hooks.json"],
    ["github", ".github/hooks/vespyr.json"],
  ];
  const removed = [];
  for (const [id, rel] of targets) {
    if (!selections.includes(id)) continue;
    const file = path.join(targetDir, rel);
    if (fs.existsSync(file)) {
      if (id === "github") {
        fs.rmSync(file, { force: true });
        removed.push(rel);
      } else {
        const existing = readJsonIf(file);
        if (existing && existing.hooks && typeof existing.hooks === "object") {
          const nextHooks = {};
          for (const [event, entries] of Object.entries(existing.hooks)) {
            const kept = Array.isArray(entries) ? entries.filter((e) => !isVespyrHookEntry(e)) : [];
            if (kept.length > 0) nextHooks[event] = kept;
          }
          const next = { ...existing, hooks: nextHooks };
          if (Object.keys(nextHooks).length === 0) delete next.hooks;
          const remainingKeys = Object.keys(next).filter((k) => !(id === "cursor" && k === "version"));
          if (remainingKeys.length === 0) {
            fs.rmSync(file, { force: true });
          } else {
            fs.writeFileSync(file, JSON.stringify(next, null, 2) + "\n", "utf8");
          }
          removed.push(rel);
        }
      }
    }
    // rmdir only succeeds when empty — user-authored hooks and other files survive.
    for (const parent of [path.dirname(file), path.dirname(path.dirname(file))]) {
      const rel = path.relative(targetDir, parent);
      // Never remove targetDir itself — callers inspect it after uninstall.
      if (!rel || rel.startsWith("..")) continue;
      try {
        fs.rmdirSync(parent);
      } catch { /* non-empty or absent — leave it alone */ }
    }
  }
  return removed;
}

module.exports = {
  loadRegistry,
  emitHarnessHooks,
  removeHarnessHooks,
  claudeConfig,
  cursorConfig,
  copilotConfig,
};
