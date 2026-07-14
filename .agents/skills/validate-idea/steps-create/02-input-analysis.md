---
step: 2
name: Input Analysis
mode: create
prerequisites:
  - step-01 completed
delegation:
  reads: "direct (user input only; no file I/O)"
  writes: none
  runs: none
  direct_justified: ["pure reasoning on user input; no file reads"]
output_contract:
  citations: not-required
---

# Step 2 — Input Analysis

Parse the user's raw idea input. Clarify ambiguity before the diagnostic begins.

## Goal
Extract both the stated problem and the proposed solution. Push on vague answers. Don't proceed until you have both.

## Agent invocation
`@founder` asks: **What problem are you solving, and what's your proposed solution?**

Get both the pain ("ops managers waste 10 hrs/week on manual scheduling") and the proposed fix ("automated scheduling that learns from past patterns").

## Push on ambiguity
If the answer is vague, push before proceeding:

- **Vague terms** ("make onboarding better," "something with AI") → "What do you mean by 'better'? What's broken today in concrete terms?"
- **Solution without a problem** ("I want to build a dashboard for X") → "That's a solution. What's the problem it solves? Who has this problem today?"
- **Problem without a solution** ("scheduling is a mess at our company") → "Good — that's a real pain. What's your proposed fix? Even a rough one."
- **Too broad** ("I want to help small businesses") → "Which small businesses? Doing what? Name one specific person at one specific business."

## Restate and confirm
Reframe constructively: "Let me try restating: you're saying [problem reframe] and your proposed fix is [solution reframe]. Does that capture it?"

## Gate
Don't move to Step 3 until you have both a **stated problem** and a **proposed solution**, even if rough.

## Delegation
- **Reads:** direct — user input only (no file I/O)
- **Writes:** none
- **Direct:** pure reasoning step; no file operations
