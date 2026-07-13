# Session Summary Template

> **Written by:** Any agent at end of session via `Mnemos (@memory-controller) session-write [content]`
> **Save to:** `artifacts/memory/session-summaries/latest.md` (overwrite each session)
> **Also appended to:** `artifacts/memory/session-summaries/history.md` (never overwrite)
> **Read by:** `Mnemos (@memory-controller)` as part of Tier 1 context loading

The session summary is the fastest path to cross-session continuity. It costs ~100 tokens to load and tells the next agent exactly where things stand — without re-reading all memory files.

---

## latest.md format

```markdown
## Last Session
*Written: YYYY-MM-DD by @agent-name*

**Worked on:** {1-2 sentences describing what was done this session}

**Decisions made:**
- {decision 1 — be specific, include domain tag if relevant}
- {decision 2}
- {decision 3}
(max 5 bullets)

**Next step:** {single sentence — what the next agent or session should do first}

**New blockers:** {describe new blockers discovered, or "none"}
```

---

## history.md format

Each session appends a dated entry:

```markdown
---
### Session: YYYY-MM-DD — @agent-name

**Worked on:** {summary}

**Decisions made:**
- {decision 1}
- {decision 2}

**Next step:** {next step}

**New blockers:** {blockers or "none"}
```

---

## Rules

- `latest.md` is always overwritten — it holds only the most recent session
- `history.md` is append-only — it holds the full session log, never modified
- `latest.md` must stay under 600 words — `@memory-controller` will summarize if over
- `history.md` has no size limit — it is never loaded into agent context directly (only searched via `@memory-controller search`)
- The `## Last Session` header in `latest.md` must be preserved exactly — `@memory-controller` uses it as an anchor for Tier 1 extraction

---

## Example

```markdown
## Last Session
*Written: 2026-05-19 by @developer*

**Worked on:** Implemented OAuth2 login flow with Google. Completed US-012 (happy path and unhappy path). Edge cases for concurrent sessions still pending.

**Decisions made:**
- [AUTH] Using authorization code grant type (not implicit) per ADR-003
- [CODE] Refresh token rotation enabled — each use issues a new token
- [TEST] Auth tests use mock OAuth server, not real Google credentials

**Next step:** Implement concurrent session edge cases (AC-E-012-1 through AC-E-012-3) then submit for @code-reviewer.

**New blockers:** Google OAuth client ID still pending platform team approval — blocks US-013 but not US-012.
```
