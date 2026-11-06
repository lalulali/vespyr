---
name: deslop
description: "Core Deslop and Plain-Clarity Engine (alias for /humanize) — removes AI writing patterns, replaces fancy/thesaurus words with plain words, and eliminates circumlocution. Use when polishing prose, specs, docs, or drafts to strip AI slop and make text easy to understand."
license: MIT
compatibility: Node.js >= 18
allowed-tools: Read Write Edit Grep Glob AskUserQuestion
metadata:
  version: "2.7.0"
  last_updated: "2026-10-29"
  canonical: "humanize"
---

# Deslop: Core Anti-Slop & Plain-Clarity Engine

## What this skill does

Direct entry point for the **Vespyr Core Deslop & Plain-Clarity Engine** (`DNA 7 §6`, alias for `/humanize`). Identifies and removes statistical AI writing tells, replaces pretentious or fancy vocabulary (`utilize`, `elucidate`, `ameliorate`, `juxtaposition`, `ubiquitous`, `ephemeral`, `endeavor`, `commence`) with simple everyday words (`use`, `explain`, `fix`, `contrast`, `everywhere`, `brief`, `try`, `start`), and eliminates circumlocution that circles around the point (`came to the realization that` -> `realized`, `in the process of` -> cut).

Operates on the **33-Pattern Catalog** (`references/patterns.md`), the multi-locale lexicon (`references/anti-slop-lexicon.json`), and the deterministic linter (`scripts/prose_linter.js`).

## When to use

- When the user invokes `/deslop` or asks to "deslop this", "strip the AI slop", "stop using fancy words", or "make this easier to understand".
- Before shipping any PRD, specification, guide, lesson, or document to ensure every sentence passes the One-Read Windowpane Test.
- Standalone deterministic lint check: `node .agents/skills/deslop/scripts/prose_linter.js --file <path>`

## Workflow

1. **Run the Deterministic Linter (if operating on a file):**
   ```bash
   node .agents/skills/deslop/scripts/prose_linter.js --file <path>
   ```
2. **Execute the Full Humanize & Plain-Clarity Pass:**
   Follow the complete workflow in `.agents/skills/humanize/SKILL.md`:
   - Determine or infer the target tone (`Casual`, `Conversational`, `Professional`, `Formal`, `Technical`, `Persuasive`, `Warm`, `Witty`, `Neutral`).
   - Purge Patterns 1–29 (significance inflation, superficial `-ing` tails, promotional language, vague attributions, AI vocabulary, copula avoidance, negative parallelisms, rule of three, em dash spam, filler phrases).
   - Purge Patterns 30–33 (**Plain-Word Clarity & Anti-Circumlocution**):
     - Replace fancy/thesaurus words with crisp, everyday words.
     - Collapse zombie nominalizations and roundabout wrapper phrases into direct verbs.
     - Rewrite foggy multi-clause abstractions so every sentence is understood on the very first read.
3. **Two-Step Adversarial Self-Audit:**
   - Ask: *"What makes the draft still read like an LLM wrote it, use fancy words, or circle around the point?"*
   - Fix the remaining tells and present the final clean version.
