# Memory Entry Template

Use this format for every entry written to `artifacts/memory/` files.
The `@memory-controller` validates this format before persisting any write.

---

## Entry Format

```markdown
### [{DOMAIN}] {Short descriptive title} [date: YYYY-MM-DD] [agent: @agent-name]

{Content — max 500 words. Be specific and factual. No filler.}

**Status:** active
**References:** {ADR-NNN, US-NNN, or artifact path — omit if none}
```

---

## Domain Tags

Use one of these domain tags to enable keyword-based filtering:

| Domain tag | Use for |
|------------|---------|
| `AUTH` | Authentication, authorization, sessions, tokens |
| `API` | API contracts, endpoints, versioning, error codes |
| `DATA` | Data models, schemas, migrations, storage |
| `ARCH` | System architecture, component design, boundaries |
| `INFRA` | Infrastructure, CI/CD, deployment, environments |
| `SECURITY` | Security decisions, vulnerabilities, threat model |
| `PERF` | Performance, caching, query optimization, load |
| `PRODUCT` | Product decisions, scope, features, priorities |
| `PROCESS` | Team process, workflow, handoffs, conventions |
| `CODE` | Coding patterns, conventions, standards |
| `TEST` | Testing strategy, coverage, QA decisions |
| `ML` | Machine learning, models, pipelines, data |
| `UX` | UX decisions, flows, accessibility, interactions |
| `MARKET` | Market research, competitive intelligence |
| `RISK` | Risks, blockers, mitigations, dependencies |
| `LESSON` | Lessons learned, retrospective insights |
| `DECISION` | Resolved decisions with rationale |

The canonical tag list is exactly these 17 tags: `AUTH`, `API`, `DATA`, `ARCH`, `INFRA`, `SECURITY`, `PERF`, `PRODUCT`, `PROCESS`, `CODE`, `TEST`, `ML`, `UX`, `MARKET`, `RISK`, `LESSON`, `DECISION`. Entries with any other domain tag are rejected.

---

## Status Values

| Status | Meaning |
|--------|---------|
| `active` | Decision or pattern is currently in effect |
| `resolved` | Blocker cleared, task done, or decision superseded |
| `superseded` | Replaced by a newer decision (reference the new one) |

---

## Special Tags

Add these inline to the entry header when applicable:

| Tag | Meaning |
|-----|---------|
| `[CRITICAL]` | Never archive — always keep in active memory |
| `[RESOLVED: YYYY-MM-DD]` | Marks the resolution date for blockers |
| `[SUPERSEDED BY: {title}]` | Links to the replacement decision |

---

## Examples

### Good entry — active decision

```markdown
### [AUTH] Use JWT with 15-minute expiry and refresh tokens [date: 2026-05-10] [agent: @architect]

Decided to use JWT for stateless authentication. Access tokens expire in 15 minutes; refresh tokens expire in 7 days and are stored in httpOnly cookies. This avoids server-side session storage while maintaining reasonable security. Refresh token rotation is enabled — each use issues a new refresh token and invalidates the old one.

**Status:** active
**References:** ADR-003, US-012
```

### Good entry — resolved blocker

```markdown
### [RISK] OAuth2 Google integration blocked on client ID approval [date: 2026-05-08] [agent: @developer] [RESOLVED: 2026-05-12]

Google OAuth2 client ID was pending approval from the platform team. Blocked US-012 and US-013 implementation. Resolved on 2026-05-12 — credentials delivered via 1Password vault.

**Status:** resolved
**References:** US-012, US-013
```

### Good entry — lesson learned

```markdown
### [LESSON] Acceptance criteria gaps cause QA rework [date: 2026-05-15] [agent: @qa-engineer]

Three stories in Sprint 4 required rework because edge cases (concurrent session handling) were not in the acceptance criteria. @product-manager and @qa-engineer should review edge cases together before stories enter development. Add a "concurrent access" checklist item to the story template.

**Status:** active
**References:** artifacts/output/09-retro/execution-review.md
```

### Bad entry — do not write like this

```markdown
### Decision about auth

We talked about auth and decided to use JWT. It's good for our use case.

Status: done
```

Problems: no domain tag, no date, no agent, vague content, wrong status value.
