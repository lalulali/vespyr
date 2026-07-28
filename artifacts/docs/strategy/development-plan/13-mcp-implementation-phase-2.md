# MCP Implementation Phase 2 — Agent Capability Enrichment

**Status:** Planned  
**Date:** 2026-07-21  
**Depends on:** `03a-mcp-integration-plan.md` (Phase 1 foundation: `@vespyr/mcp` + 4 default servers)

---

## 1. Purpose

Phase 1 gives every agent a baseline: structured memory, code graphs, web research, E2E testing, diffs, and LSP diagnostics. Phase 2 closes the gaps — MCP servers that give specific agents capabilities they currently lack entirely, or that `@executor` shell calls handle poorly.

**Rule:** Only add an MCP server if at least 2 agents need it AND `@executor` can't provide the same capability with a one-liner.

---

## 2. Gap Analysis Per Agent

### Reasoning Agents — What They Have vs. What's Missing

| Agent | Has (Phase 1) | Missing |
|---|---|---|
| **@founder** | Hound (research), elicitation | — Covered |
| **@product-manager** | Hound, `@vespyr/mcp` (memory, pipeline, tasks, artifacts) | — Covered |
| **@product-designer** | Hound, Playwright (screenshots), Figma (opt-in) | **Accessibility audit.** Cannot verify WCAG compliance or color contrast of designs before handoff. |
| **@architect** | code_graph, artifact_graph, elicitation | — Covered |
| **@tech-lead** | task_history, pipeline | — Covered |
| **@developer** | LSP, Git, Shadcn, code_graph, Hound | **Package vulnerability check.** `npm audit` is a shell command, but flagging transitive dependencies with known CVEs requires structured data. **Bundle analysis.** Cannot see what's bloating the build. |
| **@code-reviewer** | Git, LSP, code_graph, fidelity_check | **Static analysis.** LSP catches types, but not anti-patterns (cyclomatic complexity, dead code). **Secret detection.** No way to scan for accidentally committed keys/tokens. |
| **@qa-engineer** | Playwright (E2E, DOM) | **Test coverage reporting.** Must parse coverage JSON manually via `@executor`. **Accessibility testing.** WCAG violations in built pages are invisible. **API testing.** No structured way to validate endpoints. |
| **@researcher** | Hound (search, fetch, crawl, PDF/OCR) | — Covered. Hound handles 100% of researcher tooling. |
| **@user-researcher** | Hound | — Covered |
| **@ux-researcher** | Hound, Playwright | **Accessibility audit.** Same gap as `@product-designer`. **Color contrast checker.** WCAG AA/AAA ratio verification on design tokens. |
| **@data-analyst** | — (nothing specific) | **BIG GAP.** No data query capability. Must shell out for every CSV/JSON analysis. Cannot run quick aggregation queries. |
| **@security-engineer** | Hound (CVE lookup) | **BIG GAP.** Dependency CVE scanning produces unstructured text. Secret detection requires manual grep. No structured threat model output. |
| **@performance-engineer** | — (nothing specific) | **BIG GAP.** No web performance audit tooling. Cannot get Lighthouse scores, waterfall charts, or bundle size breakdowns without manual browser interaction. |
| **@ml-engineer** | — (nothing specific) | Low priority — conditional agent, only active when ML is core. |
| **@devops-engineer** | GitHub (opt-in) | Config validation. Docker/compose/env file syntax checking. Low priority — `@executor` handles most infra ops. |
| **@technical-writer** | Hound, artifact_graph | **Markdown quality.** No link checking (broken internal links), no spell/grammar linting, no style guide enforcement. |

### I/O Sub-Agents — Not Applicable

`@reader`, `@writer`, `@executor`, `@memory-controller` are narrow I/O executors. They don't reason or need tool enrichment. MCP is for the 13 reasoning agents.

---

## 3. Proposed Phase 2 MCP Servers

Based on the gap analysis, 6 new capabilities are needed. Two are new MCP servers. Four are thin wrappers that extend the existing `@vespyr/mcp` tool surface.

### 3a. New MCP Servers

| # | Server | License | Fills Gap For | Capability |
|---|---|---|---|---|
| 1 | **Lighthouse MCP** | Apache 2.0 | `@performance-engineer`, `@qa-engineer` | Web performance audits (LCP, CLS, INP, TBT), accessibility scores, SEO, best practices. Produces structured JSON, not raw DevTools output. |
| 2 | **Axe-core / Accessibility MCP** | MPL 2.0 | `@qa-engineer`, `@ux-researcher`, `@product-designer` | WCAG 2.1/2.2 violation detection with element selectors, severity, and fix suggestions. Runs on live pages via Playwright's existing browser. |

### 3b. New `@vespyr/mcp` Tools (Thin Wrappers)

| # | Tool | Wraps / Uses | Fills Gap For | Input | Output |
|---|---|---|---|---|---|
| 11 | `audit_dependencies` | `npm audit --json` / `pip-audit` | `@developer`, `@security-engineer`, `@code-reviewer` | `manager` (`npm`\|`pip`) | `{ vulnerabilities[{ package, severity, cve, fix_version }], summary }` |
| 12 | `scan_secrets` | `gitleaks detect --no-git` or `detect-secrets` | `@security-engineer`, `@code-reviewer` | `path` (directory\|file) | `{ findings[{ file, line, rule, secret_type }] }` |
| 13 | `check_docs` | `markdownlint`, `lychee` (link checker) | `@technical-writer`, `@code-reviewer` | `path` (directory) | `{ broken_links[{ file, url, status }], lint_issues[{ file, line, rule }], word_count, readability }` |
| 14 | `analyze_bundle` | `webpack-bundle-analyzer` / `source-map-explorer` | `@developer`, `@performance-engineer` | `stats_file` (path to stats.json) | `{ total_size, chunks[{ name, size, modules[] }], largest_modules, duplicates[], tree_shaking_loss }` |
| 15 | `query_data` | SQLite in-memory + CSV/JSON import | `@data-analyst` | `files[]` (CSV/JSON paths), `query` (SQL) | `{ columns[], rows[][], row_count, execution_ms }` |

### 3c. Rationale Per Tool

**`audit_dependencies`** — Today: `@executor` runs `npm audit`, returns raw JSON or text. Agent must parse, filter false positives, map to files. MCP: returns structured `{ vulnerabilities[], summary, fixable_count }` with pre-filtered noise. Both `@developer` (catch before commit) and `@security-engineer` (block release on critical CVEs) need this.

**`scan_secrets`** — Today: `@executor` runs `gitleaks` and returns full output. MCP: returns typed findings with `secret_type` (AWS key, JWT, private key, etc.) so `@security-engineer` can triage without scanning raw output. `@code-reviewer` uses it as a pre-merge gate.

**`check_docs`** — Today: link checking is manual. Linting is absent. MCP: returns broken links (404s, stale anchors), markdownlint violations (MD001–MD053), and readability score (Flesch-Kincaid). `@technical-writer` uses it for quality; `@code-reviewer` uses it to catch doc drift in PRs.

**`analyze_bundle`** — Today: `@executor` can run `webpack-bundle-analyzer` but output is an HTML visualization. MCP: returns structured data (`chunks[], largest_modules, duplicates[]`) so `@developer` or `@performance-engineer` can act on findings without opening a browser.

**`query_data`** — Today: `@data-analyst` must manually write node scripts for every analysis. MCP: imports CSV/JSON into in-memory SQLite, runs SQL, returns results. `SELECT region, COUNT(*) FROM events GROUP BY region HAVING COUNT(*) > 100` in one call instead of 50 lines of node.

---

## 4. Implementation Priority

| Priority | Server / Tool | Effort | Justification |
|---|---|---|---|
| **P0** | `audit_dependencies` + `scan_secrets` | 3-4 hours (2 thin wrappers) | Security gap is highest risk. `@security-engineer` is ineffective without tooling. Both are one-liner wrappers around existing CLIs. |
| **P1** | `query_data` | 4-5 hours (new script) | `@data-analyst` has zero tooling today. SQLite wrapper unlocks the entire persona. |
| **P1** | Lighthouse MCP | 2-3 hours (registration) | `@performance-engineer` has no tooling. Lighthouse is a well-established MCP server — just register and configure. |
| **P2** | `check_docs` | 3-4 hours (1 wrapper) | `@technical-writer` currently relies on manual review. Link checker catches drift early. |
| **P2** | Axe-core / Accessibility MCP | 2-3 hours (registration) | Three agents need it but Playwright already owns the browser — axe-core injects into the same session. |
| **P3** | `analyze_bundle` | 3-4 hours (1 wrapper) | Useful but project-specific. Only active when `webpack-bundle-analyzer` stats exist. |

**Total Phase 2 estimate:** 17–23 hours

---

## 5. Agent Coverage After Phase 2

| Agent | Phase 1 | Phase 2 Adds | Coverage |
|---|---|---|---|
| @founder | Hound, elicitation | — | Full |
| @product-manager | Hound, `@vespyr/mcp` | — | Full |
| @product-designer | Hound, Playwright, Figma | Axe-core | Full |
| @architect | code_graph, artifact_graph, elicitation | — | Full |
| @tech-lead | task_history, pipeline | — | Full |
| @developer | LSP, Git, Shadcn, code_graph, Hound | `audit_dependencies`, `analyze_bundle` | Full |
| @code-reviewer | Git, LSP, code_graph, fidelity_check | `audit_dependencies`, `scan_secrets`, `check_docs` | Full |
| @qa-engineer | Playwright | Lighthouse, Axe-core | Full |
| @researcher | Hound | — | Full |
| @user-researcher | Hound | — | Full |
| @ux-researcher | Hound, Playwright | Axe-core | Full |
| @data-analyst | — | `query_data` | Full |
| @security-engineer | Hound | `audit_dependencies`, `scan_secrets` | Full |
| @performance-engineer | — | Lighthouse, `analyze_bundle` | Full |
| @ml-engineer | — | — | Conditional |
| @devops-engineer | GitHub (opt-in) | — | Adequate |
| @technical-writer | Hound, artifact_graph | `check_docs` | Full |

---

## 6. Updated User Setup

```bash
# Phase 1 (existing)
npx vespyr install

# Phase 2 additions — installer registers:
# - Lighthouse MCP
# - Axe-core MCP  
# - 5 new @vespyr/mcp tools (audit_dependencies, scan_secrets, check_docs, analyze_bundle, query_data)
npx vespyr install-mcp-phase2
```

---

## 7. Risks

- **Lighthouse MCP + Axe-core MCP dependency.** Both use the same Chromium browser as Hound and Playwright. If the browser pool is exhausted, audits queue. Mitigation: Lighthouse and Axe-core share the Hound/Playwright browser session.
- **`scan_secrets` false positives.** Gitleaks flags test fixtures, example files, and documentation. Mitigation: `@vespyr/mcp` filters by file type and ignores `.gitignore`d paths.
- **`query_data` performance.** Large CSVs (>100MB) in memory may OOM. Mitigation: cap at 50MB, stream-read with LIMIT.
- **`analyze_bundle` only works for webpack projects.** Mitigation: detect bundler type, skip gracefully if no stats file found.

---

## 8. Verification

- [ ] Verify `audit_dependencies` returns structured CVE data by running against a project with known vulnerabilities.
- [ ] Verify `scan_secrets` finds a committed `.env` with AWS key by planting a test secret file.
- [ ] Verify `query_data` imports CSV + runs GROUP BY by importing a 100-row CSV and running aggregation.
- [ ] Verify Lighthouse returns LCP/CLS scores by running against sample project.
- [ ] Verify Axe-core finds WCAG violations by running against a page with missing alt text.
- [ ] Verify `check_docs` finds broken internal link by creating a dead link in a sample doc.
- [ ] Verify `analyze_bundle` returns chunk sizes by running against sample webpack stats.

---

## Implementation Checklist

- [ ] Implement `audit_dependencies` P0 tool wrapper
- [ ] Implement `scan_secrets` P0 tool wrapper
- [ ] Implement `query_data` P1 tool script
- [ ] Register & configure Lighthouse MCP P1 server
- [ ] Implement `check_docs` P2 tool wrapper
- [ ] Register & configure Axe-core / Accessibility MCP P2 server
- [ ] Implement `analyze_bundle` P3 tool wrapper
