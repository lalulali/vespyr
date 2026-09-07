# Degraded-Mode Tiers (shared — round-table + elicitation)

Single source of truth for harness-neutral delegation. Skills cite this file; they do not restate it. Reconciles the pre-2026-09-05 divergence (round-table offered `--solo` on insistence; elicitation permitted `--simulated` on insistence) into one rule.

## The tiers

1. **Subagents available → native mode (default).** Dispatch each persona as an independent participant receiving only its own inputs (topic, persona file, loaded context, targeted peer stance where the skill's protocol requires it). Never let one persona see another's output before forming its own. Do not assume a particular command, API, or `@`-invocation syntax.
2. **No subagents, but multiple isolated LLM calls possible → `--solo` mode.** Context-firewalled sequential dispatch with the same data contract; synthesis happens in the orchestrator, never in a shared context. Announce the mode, disclose the degraded-output risk, and note the fallback in the session summary. Never claim independent subagents were spawned.
3. **Single shared conversation context only → refuse multi-persona simulation.** Simulating independent minds in one context merges opinions into performative agreement — worse than none. State this plainly. Exception ONLY on explicit user insistence: `--simulated`, MUST be labeled degraded in the output ("single-context simulation — perspectives will converge") AND logged. Prefer offering `--solo` first whenever isolated calls exist.

## Telemetry

Log the resolved tier at activation via `roundtable_eval.js log --mode <native|solo|refused> [--tool <skill>]` (the `--simulated` exception logs `--mode refused` with a `--note simulated-on-insistence`). A refused roundtable logs and stops — no welcome, no debate.
