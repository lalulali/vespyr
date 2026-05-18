# Project Context Template

> **Used by:** @founder (to initialize) → **Read by:** All agents
> **Save to:** `artifacts/memory/project-context.md`

This is the single source of truth for project-level context. Every agent reads this before starting work.

---

## 1. Project Basics

| Field | Value |
|-------|-------|
| **Project name** | ... |
| **Description** | ... |
| **Repository** | ... |
| **Primary language(s)** | ... |
| **Framework(s)** | ... |
| **Started** | ... |
| **Current phase** | [Exploration / Design / Development / Maintenance] |

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | ... | ... | ... |
| Backend | ... | ... | ... |
| Database | ... | ... | ... |
| Cache | ... | ... | ... |
| Queue | ... | ... | ... |
| ML/AI (if applicable) | ... | ... | ... |
| Infrastructure | ... | ... | ... |
| CI/CD | ... | ... | ... |

## 3. Project Structure

```
artifacts/
  directions/       # Guidelines, workflow docs
  example/          # Example files, references
  input/            # Raw inputs, briefs, requirements
  output/           # Generated artifacts (PRDs, specs, ADRs, etc.)
  memory/           # Shared context and memories (this directory)

src/                # Source code
  ...

tests/              # Test files
  ...

.github/workflows/  # CI/CD pipelines
  ...
```

## 4. Coding Standards

### Style
- Formatter: ...
- Linter: ...
- Line length: ...
- Indentation: ...

### Patterns
- [Pattern 1]: [description and example]
- [Pattern 2]: [description and example]

### Testing
- Framework: ...
- Coverage target: ...%
- Test naming convention: ...

## 5. Key Files

| File | Purpose | Owner |
|------|---------|-------|
| `README.md` | Project overview | @technical-writer |
| `package.json` / `Cargo.toml` / etc. | Dependencies | @developer |
| `.opencode/workflow.md` | Agent orchestration | System |
| `artifacts/memory/` | Shared context | All agents |

## 6. External Dependencies

| Service | Purpose | Contact / Docs |
|---------|---------|----------------|
| ... | ... | ... |

## 7. Team & Communication

| Role | Agent | Notes |
|------|-------|-------|
| Founder | @founder | Strategic decisions |
| Product | @product-manager | Requirements and scope |
| Design | @product-designer + @ux-researcher | UX/UI |
| Engineering | @architect + @tech-lead + @developer | Implementation |
| Quality | @qa-engineer + @code-reviewer | Testing and review |
| Operations | @devops-engineer + @security-engineer | Infrastructure |

## 8. Current Constraints

- [ ] Budget: ...
- [ ] Timeline: ...
- [ ] Team size: ...
- [ ] Regulatory: ...
- [ ] Technical: ...

---

**Last updated:** [date]
**Updated by:** @agent-name
**Next review:** [date]