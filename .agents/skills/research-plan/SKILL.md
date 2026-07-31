---
name: research-plan
description: Construct comprehensive research plans with goals, hypotheses, cohort definitions, methodology, and a 2-part interview guide (Profile + Behavioral)
version: "2.0"
last_updated: 2026-07-20
---

# Research Plan

Builds a structured research plan for validating product hypotheses. Outputs to `artifacts/output/01-research/research-plan.md`.

## Persona delegation
This skill delegates to `@user-researcher`. The researcher designs the plan (goals, methodology, interview guides). The skill provides structure; `@user-researcher` provides research methodology expertise.

## When to use
- "I need to interview users about X"
- "Create a research plan for validating our hypothesis"
- "What questions should I ask in user interviews?"
- Before conducting any primary research

## Workflow

### Step 1: Define research goals

Ask: what do you need to learn? Define 1-3 clear research goals. Each goal must be falsifiable — you should be able to learn that you're wrong.

### Step 2: Define cohort

Who should be interviewed/surveyed? Define:
- **Target segment:** demographics, role, behavior criteria
- **Sample size:** minimum 5 for qualitative, 30+ for quantitative signals
- **Recruitment method:** how will you find them?

### Step 3: Select methodology

Choose from: qualitative interviews, surveys, usability testing, card sorting, diary studies, A/B testing. Recommend based on goals and cohort. Explain why this method fits.

### Step 4: Build interview guide (2-part)

**Part 1: User Profile Questions**
- Demographics, background, role, current tools
- "Tell me about your typical workflow for {task}."
- "What tools do you currently use?"

**Part 2: Behavioral Questions (The Mom Test rules)**
- Ask about past specific behavior, not future hypotheticals: "Tell me about the last time you..." (NOT "Would you...")
- Listen for commitment signals: "How have you tried to solve this before?"
- Avoid pitching: "How do you currently handle this?" (NOT "Would you use our solution?")

### Step 5: Output

Delegate to `@writer` for `artifacts/output/01-research/research-plan.md`:

```markdown
# Research Plan — {topic}
**Date:** YYYY-MM-DD
**Methodology:** {approach}

## Research Goals
1. {goal} — falsifiable? Yes/No
2. {goal} — falsifiable? Yes/No

## Cohort
- **Segment:** {description}
- **Sample size:** {N}
- **Recruitment:** {method}

## Method
{selected method + rationale}

## Interview Guide
### Part 1: Profile Questions
1. {question}

### Part 2: Behavioral Questions
1. "Tell me about the last time you {action}..."
2. "How have you tried to solve {problem} before?"
3. "Walk me through your current process for {task}."

### Mom Test Validation
- [ ] Questions ask about past behavior, not future intent
- [ ] No solution pitching in questions
- [ ] Commitment signals are probed
```

## State machine integration
At start: `@executor` runs `node .agents/scripts/orchestrator_state.js status`
At end: `@executor` runs `node .agents/scripts/orchestrator_state.js complete --agent user-researcher --artifact 01-research/research-plan.md`

## Memory integration
**At start:** Load context before defining research goals:
```
@memory-controller load user-researcher [research-plan — {research topic}]
```

**At completion:** Write session summary — mandatory:
```
@memory-controller session-write [agent: @user-researcher]
Worked on: Research plan — {topic}
Decisions: Methodology: {chosen method}. Cohort: {target segment, N={size}}. Goals: {1-3 falsifiable goals}
Next step: Conduct research sessions, then load /explore-idea or /unpack-problem with findings
Blockers: {recruitment blockers or "none"}
```

