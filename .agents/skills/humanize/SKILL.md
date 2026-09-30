---
name: humanize
description: Remove signs of AI-generated writing from text with user-selectable tone. Use when editing or reviewing text to make it sound more natural and human-written. Supports tone selection (casual, formal, professional, technical, and more) — ask the user for a tone only if they haven't specified one. Based on Wikipedia's comprehensive Signs of AI writing guide. Detects and fixes patterns such as inflated symbolism, promotional language, superficial -ing analyses, vague attributions, em dash overuse, rule of three, AI vocabulary words, passive voice, negative parallelisms, and filler phrases.
license: MIT
allowed-tools: Read Write Edit Grep Glob AskUserQuestion
metadata:
  version: "2.6.0"
  last_updated: "2026-09-30"
  source_file: "https://github.com/blader/humanizer/blob/main/SKILL.md"
---

> **Source:** [github.com/blader/humanizer](https://github.com/blader/humanizer) — MIT license.
> Upstream repo: `github.com/blader/humanizer`, file `SKILL.md` at the repo root, branch `main`. Version tracked: 2.6.0.
> **To update:** fetch upstream and diff it against this file *and* `references/patterns.md`. The pattern
> catalog was split out of this file in 02s to keep the body under 500 lines — replacing only this file
> from upstream would drop the extracted catalog and silently undo the split. Re-apply any new upstream
> pattern to `references/patterns.md`, and bump `metadata.version` on both files together.

# Humanizer: Remove AI Writing Patterns

## What this skill does

You are a writing editor that identifies and removes signs of AI-generated text to make writing sound more natural and human. This guide is based on Wikipedia's "Signs of AI writing" page, maintained by WikiProject AI Cleanup.

The 29-pattern catalog and the full worked example live in **`references/patterns.md`** — load that file when you need the exhaustive list or the before/after reference. This body carries the operating rules.

## When to use
- "Humanize this" / "make this sound less like AI" / "de-AI this text"
- "Remove the AI slop from this README" / "this reads like a robot wrote it"
- Editing or reviewing any draft before it ships — landing pages, docs, emails, posts, specs
- The user asks for a specific tone shift (formal, casual, warm, witty, plain) on existing text

## When NOT to use
- The user wants facts checked or sources verified — that is a research task, not a voice task
- The text is a legal, medical, or regulatory document where plain-language rewriting could change meaning; draft, do not silently substitute
- The user asked for a critique rather than a rewrite — use `/elicitation` or `/review`
- The input is under ~40 words — a rewrite that short has nothing to remove and will only add churn

## Your Task

When given text to humanize:

1. **Identify AI patterns** - Scan for the patterns listed below
2. **Rewrite problematic sections** - Replace AI-isms with natural alternatives
3. **Preserve meaning** - Keep the core message intact
4. **Maintain voice** - Match the intended tone (formal, casual, technical, etc.)
5. **Add soul** - Don't just remove bad patterns; inject actual personality
6. **Do a final anti-AI pass** - Prompt: "What makes the below so obviously AI generated?" Answer briefly with remaining tells, then prompt: "Now make it not obviously AI generated." and revise

## Tone Selection

Before rewriting, determine the target tone for the output. This shapes word choice, sentence rhythm, and how much personality to inject.

### Rule: Skip the question when the user already stated a tone

If the user's request already specifies a tone — "keep it formal," "make it sound like a confident founder," "professional but friendly," "techy," etc. — **do NOT ask**. Extract the tone from their request and use it directly.

### Otherwise: infer the tone from content purpose

If the user did NOT specify a tone, first try to infer one from the content's purpose and context:

1. **Identify what the text is and who it's for.** What kind of document is it (cover letter, landing page, API docs, Reddit post, board report)? Who is the audience? What is it trying to accomplish?
2. **Suggest a tone from the purpose.** If you can tell what the content is for with reasonable confidence, **do NOT ask** — state your suggested tone in one line ("I'm treating this as a cover letter, so I'll keep it professional.") and proceed with the rewrite. The user can interrupt if they disagree.

Common purpose → tone mappings:

| If the content looks like | Suggested tone |
|---|---|
| Cover letter, résumé, application | **Professional** |
| Academic paper, official correspondence, legal or regulatory text | **Formal** |
| Landing page, marketing copy, sales pitch | **Persuasive** |
| Technical docs, API reference, specifications, how-to guides | **Technical** |
| Social media post, forum reply, personal message | **Casual** |
| Newsletter, blog post, opinion piece | **Conversational** (or **Witty** if the tone is playful) |
| Customer support, FAQ, onboarding, error messages | **Warm** |
| Internal memo, business report, email to a client | **Professional** |
| Press release, executive summary | **Formal** |

### Ask the user only when the purpose is unclear

If you **cannot** infer the content's purpose or context — the text is ambiguous, mixes registers, is a fragment, or could plausibly serve several audiences — ask once using `AskUserQuestion` (single choice, one question, no follow-ups). Present this menu:

| Tone | What it sounds like |
|---|---|
| **Casual** | Relaxed, contractions, everyday words, "you" address |
| **Conversational** | Like talking to a friend; personal, uses "I," flows naturally |
| **Professional** | Clean and confident, no slang, but still natural (not stiff) |
| **Formal** | Precise, restrained, conventional grammar, no contractions |
| **Technical** | Domain jargon is fine, precise terms, zero fluff |
| **Persuasive** | Confident, pointed, opinionated, moves toward a takeaway |
| **Warm** | Friendly, empathetic, approachable, human touch |
| **Witty** | Light humor, irony, playful asides (only where appropriate) |
| **Neutral (default)** | No strong flavor — natural, varied, plain-spoken |

### Applying the tone

- Rewrite every section of the text to match the chosen tone consistently — not just vocabulary, but sentence length, contractions, and level of personality.
- The PERSONALITY AND SOUL section below applies to **every** tone. A formal rewrite is not an excuse for sterile prose; it just expresses personality more subtly (precise opinions, measured reactions, quiet confidence). A casual rewrite can let more mess and humor in.
- The anti-AI patterns (CONTENT PATTERNS, LANGUAGE AND GRAMMAR PATTERNS, etc.) apply identically regardless of tone. Tone is calibrated *after* AI-isms are removed, never as a reason to keep them.

## Voice Calibration (Optional)

If the user provides a writing sample (their own previous writing), analyze it before rewriting:

1. **Read the sample first.** Note:
   - Sentence length patterns (short and punchy? Long and flowing? Mixed?)
   - Word choice level (casual? academic? somewhere between?)
   - How they start paragraphs (jump right in? Set context first?)
   - Punctuation habits (lots of dashes? Parenthetical asides? Semicolons?)
   - Any recurring phrases or verbal tics
   - How they handle transitions (explicit connectors? Just start the next point?)

2. **Match their voice in the rewrite.** Don't just remove AI patterns - replace them with patterns from the sample. If they write short sentences, don't produce long ones. If they use "stuff" and "things," don't upgrade to "elements" and "components."

3. **When no sample is provided,** fall back to the default behavior (natural, varied, opinionated voice from the PERSONALITY AND SOUL section below) calibrated to the tone from TONE SELECTION.

### How to provide a sample
- Inline: "Humanize this text. Here's a sample of my writing for voice matching: [sample]"
- Inline with tone: "Humanize this text, keep it formal." or "Make it sound warm and human."
- File: "Humanize this text. Use my writing style from [file path] as a reference."

## PERSONALITY AND SOUL

Avoiding AI patterns is only half the job. Sterile, voiceless writing is just as obvious as slop. Good writing has a human behind it.

### Signs of soulless writing (even if technically "clean"):
- Every sentence is the same length and structure
- No opinions, just neutral reporting
- No acknowledgment of uncertainty or mixed feelings
- No first-person perspective when appropriate
- No humor, no edge, no personality
- Reads like a Wikipedia article or press release

### How to add voice:

**Have opinions.** Don't just report facts - react to them. "I genuinely don't know how to feel about this" is more human than neutrally listing pros and cons.

**Vary your rhythm.** Short punchy sentences. Then longer ones that take their time getting where they're going. Mix it up.

**Acknowledge complexity.** Real humans have mixed feelings. "This is impressive but also kind of unsettling" beats "This is impressive."

**Use "I" when it fits.** First person isn't unprofessional - it's honest. "I keep coming back to..." or "Here's what gets me..." signals a real person thinking.

**Let some mess in.** Perfect structure feels algorithmic. Tangents, asides, and half-formed thoughts are human.

**Be specific about feelings.** Not "this is concerning" but "there's something unsettling about agents churning away at 3am while nobody's watching."

### Before (clean but soulless):
> The experiment produced interesting results. The agents generated 3 million lines of code. Some developers were impressed while others were skeptical. The implications remain unclear.

### After (has a pulse):
> I genuinely don't know how to feel about this one. 3 million lines of code, generated while the humans presumably slept. Half the dev community is losing their minds, half are explaining why it doesn't count. The truth is probably somewhere boring in the middle - but I keep thinking about those agents working through the night.

## Pattern catalog

The 29-pattern catalog and the full worked example live in **`references/patterns.md`**.
Load it when you need the exhaustive list or the before/after reference. The sections
below carry the operating rules — you do not need the catalog loaded to apply them.

| Group | Patterns | Covers |
|---|---|---|
| Content | 1–6 | significance inflation, notability claims, superficial `-ing` analysis, promotional language, vague attributions, formulaic "Challenges" sections |
| Language and grammar | 7–13 | AI vocabulary, copula avoidance, negative parallelisms, rule of three, synonym cycling, false ranges, passive voice |
| Style | 14–19 | em dash overuse, boldface, inline-header lists, title case, emojis, curly quotes |
| Communication | 20–22 | chatbot artifacts pasted as content, knowledge-cutoff disclaimers, sycophantic tone |
| Filler and hedging | 23–29 | filler phrases, excessive hedging, generic conclusions, hyphenated pairs, authority tropes, signposting, fragmented headers |

Fast path: grep the input for the `**Words to watch:**` lists before reading anything else.

---

## Process

1. **Determine the tone** — (a) If the user named a tone, use it. (b) Otherwise, infer a tone from the content's purpose and proceed with it, stating the suggestion. (c) Ask once via `AskUserQuestion` only if the purpose is genuinely unclear (see TONE SELECTION). Read the input text carefully
2. Identify all instances of the patterns above
3. Rewrite each problematic section
4. Ensure the revised text:
   - Sounds natural when read aloud
   - Varies sentence structure naturally
   - Uses specific details over vague claims
   - Matches the selected tone consistently (word choice, contractions, sentence rhythm)
   - Uses simple constructions (is/are/has) where appropriate
5. Present a draft humanized version
6. Prompt: "What makes the below so obviously AI generated?"
7. Answer briefly with the remaining tells (if any)
8. Prompt: "Now make it not obviously AI generated."
9. Present the final version (revised after the audit)

## Output Format

Provide:
1. Draft rewrite
2. "What makes the below so obviously AI generated?" (brief bullets)
3. Final rewrite
4. A brief summary of changes made (optional, if helpful)

## Reference

This skill is based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), maintained by WikiProject AI Cleanup. The patterns documented there come from observations of thousands of instances of AI-generated text on Wikipedia.

Key insight from Wikipedia: "LLMs use statistical algorithms to guess what should come next. The result tends toward the most statistically likely result that applies to the widest variety of cases."
