# Phase 7 — Personal Knowledge Management & Knowledge Engine (Exploration & Design)

- [ ] **Status:** In Progress / Pending | **Document:** `09-phase-7-pkm-knowledge-engine.md`

> **Release Target:** v2.3  
> **Status:** Discovery & Exploration Stage  
> **Primary Persona:** `@technical-writer` (Clara) leads; `@architect` (Vera) for technical architecture; `@product-designer` (Ivy) for navigation UX exploration; `@researcher` (Iris) for paradigm research.

---

## Executive Summary

Phase 7 is dedicated to **Discovery, Analysis, and Architectural Prototyping** for Vespyr's **Personal Knowledge Management (PKM) & Knowledge Engine**.

Rather than prematurely locking down rigid file implementations, Phase 7 focuses first on deep exploration of four core knowledge-management paradigms and how they best serve both human learners and AI developer agents:

1. **Karpathy's LLM Wiki**: 3-layer architecture (`Raw Ingestion` → `Persistent Markdown Vault` → `Dynamic Schema Index`), with compounding knowledge refiling (Q&A answers automatically refiled into permanent wiki pages).
2. **Zettelkasten**: Atomic, single-concept notes connected via dense bidirectional links (`[[note-id]]`) with automated backlink tracking and strict source line citation tracebacks.
3. **PARA Framework (Tiago Forte)**: Actionable lifecycle categorizations (`01-projects/`, `02-areas/`, `03-resources/`, `04-archives/`) providing predictable structure for humans and AI agents.
4. **Andy Matuschak's Evergreen Notes & Thought Navigation**:
   - **Declarative Title APIs**: Notes titled as propositions/claims (e.g., `evergreen-notes-should-be-atomic.md`).
   - **Sliding Pane / Stacked Navigation**: Multi-column sliding UI in generated web view, allowing readers to traverse linked notes side-by-side without losing reading position.
   - **Transclusion & Popover Previews**: Inline peek tooltips for linked concepts.
   - **Maps of Content (MOCs)**: Curated entry points and learning trails.

---

## 🔍 Phase 7 Exploration & Discovery Tracks

Instead of fixed code deliverables, Phase 7 executes in four exploratory research and prototyping tracks:

### Track 1: Paradigm Synthesis & Vault Architecture Research
- **Objective**: Deep-dive into Zettelkasten, PARA, and Karpathy's LLM-wiki models to design a unified vault structure.
- **Key Questions**:
  - How do atomic Zettelkasten notes coexist inside a PARA directory hierarchy without fragmenting context?
  - What schema best allows LLM agent personas to query and write to the vault with minimal token overhead?
  - How should declarative claim/proposition titles be formatted so inline links read naturally in Markdown?

### Track 2: Navigation & Thought UX Prototyping
- **Objective**: Prototype and evaluate knowledge navigation paradigms for human readers.
- **Key Questions**:
  - How best to render Andy Matuschak-style multi-column sliding pane views for web/desktop?
  - What interactive graph visualizer (e.g. Mermaid vs. D3 force graphs) best represents concept relationships?
  - How can hover popovers (transclusion previews) display relevant line citations without cluttering the screen?

### Track 3: Agent Ingestion & Compounding Refiling Workflows
- **Objective**: Investigate automated knowledge ingestion and compounding synthesis workflows.
- **Key Questions**:
  - How should agent chat answers (`/help-me`, `@technical-writer`) be automatically parsed, refiled, and linked into permanent vault notes?
  - What strict citation protocol ensures zero-hallucination links back to original codebase symbols and ADR documents?

### Track 4: Architecture Specification & Execution Handoff
- **Objective**: Synthesize findings from Tracks 1–3 into a comprehensive design spec before implementation begins.
- **Output**: Finalized PKM Architecture Brief (`artifacts/output/04-architecture/pkm-spec.md`) detailing vault schemas, skill workflows, and compiler contracts.

---

## Deliverables & Tasks Checklist

- [ ] Track 1: Paradigm Synthesis & Vault Architecture Research
- [ ] Track 2: Navigation & Thought UX Prototyping
- [ ] Track 3: Agent Ingestion & Compounding Refiling Workflows
- [ ] Track 4: Architecture Specification & Execution Handoff (`artifacts/output/04-architecture/pkm-spec.md`)

---

## 🔒 Success Criteria for Phase 7 Discovery

1. Complete paradigm synthesis report resolving the integration of Zettelkasten, PARA, Karpathy LLM-Wiki, and Andy Matuschak navigation.
2. UX navigation prototype validated for sliding pane and backlink traversal.
3. Approved PKM Architecture Specification ready for implementation handoff.

---

## Reference
1. https://writing.bobdoto.computer/zettelkasten/
2. https://notes.andymatuschak.org/About_these_notes
3. https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
4. https://fortelabs.com/blog/para/

---

## Completion Checklist

**Phase 7 PKM Knowledge Engine status: PLANNED (Discovery/Exploration Target v2.3 — Not Started).**

- [ ] Track 1: Paradigm synthesis (Zettelkasten, PARA, Karpathy LLM-Wiki)
- [ ] Track 2: Navigation & thought UX prototyping (Andy Matuschak sliding panes)
- [ ] Track 3: Agent ingestion and compounding refiling workflows
- [ ] Track 4: Architecture specification & handoff (`pkm-spec.md`)

---

## Sign-Off

**@technical-writer (Clara):** PENDING — Discovery lead review.  
**@architect (Vera):** PENDING — Knowledge vault architecture and schema review.  
**@product-designer (Ivy):** PENDING — Sliding pane and navigation UX review.