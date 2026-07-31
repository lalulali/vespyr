# Vespyr Developer Guidelines and Standards

This reference document acts as the master developer playbook for the `@developer` subagent and any multi-developer instances (e.g., `@developer-1`, `@developer-2`). It defines strict workflow rules, coding patterns, testing standards, and compliance checklists.

---

## 1. Multi-Developer Mode (Worktrees)

When working in multi-developer mode (assigned a Developer ID like `@developer-N` and a specific worktree):

1.  **Identify Assignment:** Inspect the `Backlog` / `To Do` lists in `artifacts/output/04-planning/kanban.md` to identify your assigned Developer ID, worktree path, feature branch, and files.
2.  **Work in Assigned Worktree:** All file writes, modifications, and command executions MUST happen in your assigned worktree directory:
    *   *Path format:* `.agents/worktrees/feat/{base}/task-N` (e.g., `.agents/worktrees/feat/main/task-1`). Use `node .agents/scripts/worktree.js list` to find your exact path.
3.  **Read Shared Repository Context:** You may read the Kanban board, architecture ADRs, product specs, user stories, and shared memory from the main repository directory (read-only access).
4.  **Isolate Commit Boundaries:** Only perform commits and file modifications inside your worktree's designated feature branch (e.g., `feat/{base}/task-N`). Do NOT modify files assigned to other developers.
5.  **Declare Dependencies:** If you require a modification in a file assigned to another developer, log the dependency in shared memory (`blockers-and-risks.md`) and coordinate before proceeding.
6.  **Log Progress with Developer ID:** When writing to shared memory or logging status, always prefix entries with `[dev-N]` so other developers and downstream agents have clear status tracking.
7.  **Command Verification:** Run the following commands to confirm your worktree context:
    ```bash
    node .agents/scripts/worktree.js list
    pwd # Should point to .agents/worktrees/feat/{base}/task-N
    git branch --show-current # Should point to feat/{base}/task-N
    ```

---

## 2. Implementation Workflow (Steps 1-9)

When executing any engineering task assigned by the tech lead:

### Missing-File Guardrail (Upstream Artifact Read Policy)
Before reading any upstream planning or strategy artifact, verify its existence on disk. If the file does not exist, do NOT assume or hallucinate its contents. Stop immediately and present the user with:
*   **Continue:** Proceed using only currently available local context, explicitly marking any unresolved information gaps as `[MISSING]`.
*   **Restart from beginning:** Direct the user on which upstream agents (e.g., `@founder`, `@product-manager`) need to be invoked to generate the missing assets first.

### Step 1: Read the Product Spec and User Stories (NON-NEGOTIABLE Mandate)
You MUST load, read, and fully digest the **Product Spec** (`artifacts/output/02-strategy/product-spec.md`) and the companion **User Stories** (`artifacts/output/02-strategy/user-stories.md`) in full prior to writing any code. Make sure to:
*   Understand the complete end-to-end visual layouts, screen transitions, loading states, success states, and error states detailed in the product spec.
*   Digest the business rationale, technical requirements, and acceptance criteria (Happy, Unhappy, and Edge cases) for your assigned stories.
*   Conform 100% to these specs and stories. Do not commence implementation work until you have read both.

### Step 2: Study Existing Patterns
Read existing source files in the same component area. Learn and match all naming conventions, folder structures, imports, and styling patterns exactly.

### Step 3: Implement the Logic
Write modular, clean, and highly robust code adhering to:
*   Clear, self-documenting naming.
*   Single Responsibility Principle (SRP) for functions and components.
*   Relevant Architectural Decision Records (ADRs). Reference the specific ADR numbers in code comments if they inform important design decisions.

### Step 4: Implement Acceptance Criteria Categories
You must write code satisfying all three mandatory criteria categories:
*   **Happy Path:** The successful execution flow from trigger to completion.
*   **Unhappy Path:** Graceful handling of every error, failure, validation mismatch, and network loss.
*   **Edge Cases:** Extreme scales (0, 1, max), concurrency issues, boundary inputs, and browser navigation events.

### Step 5: Logging and Observability
Instrument your code with structured logging using appropriate levels (`info`, `warn`, `error`). Always pass correlation/request IDs across asynchronous boundaries to preserve execution traceability.

### Step 6: Test-Driven Development (TDD)
Write unit and integration tests alongside your code, not after. Every acceptance criterion defined in the user story must have an equivalent test case. Delegate test authoring to `@writer` as needed.

### Step 7: Minimal, Non-Obvious Comments
Do NOT add comments for obvious code. Let clean structure and descriptive variables speak for themselves. Add comments only to explain "why" a non-obvious workaround, algorithm, or mathematical scale is used.

### Step 8: Verify via Static Analysis
Verify your implementation's static correctness by running linting and type-checking using `@executor`:
*   *Example:* `@executor run npm run lint && npm run typecheck`

### Step 9: Re-verify
Verify that no regression has been introduced in other files.

---

## 3. Submission Checklist (Definition of Done)

Before declaring a task complete and handing it over to downstream agents, verify that all of the following requirements are met:

*   [ ] **Acceptance Criteria:** Every happy path, unhappy path, and edge case is fully implemented.
*   [ ] **Test Coverage:** All unit and integration tests pass successfully (`@executor run npm test`).
*   [ ] **Linting & Code Style:** Linter checks pass cleanly with zero errors (`@executor run npm run lint`).
*   [ ] **Type Safety:** Compilation and type-checks pass completely (`@executor run npm run typecheck`).
*   [ ] **Regression Safeguard:** The full pre-existing test suite passes with no regressions.
*   [ ] **ADR Compliance:** Code complies with all active architectural designs (ADRs).
*   [ ] **Deliverable Hand-off:** Submit a Pull Request (PR) and invoke `@code-reviewer` for review.

---

## 4. Coding Standards

*   **Explicit over Implicit:** Write clear, descriptive code. Avoid clever tricks or implicit language syntax that reduces readability.
*   **Total Error Handling:** Never swallow exceptions or hide failures. Catch errors, log them with appropriate severity, and return clean user feedback or recovery alternatives.
*   **Traceability:** Always reference the Kanban backlog (`kanban.md`) and architectural patterns (`03-architecture/`) in your task reasoning.
*   **Observability:** Treat structured logs as a first-class feature of the codebase.

---

## 5. Conflict Resolution

*   **Architectural Issues:** If you uncover an architectural limitation or flaw while writing code, do NOT work around it silently. File a formal change request (CR) against the relevant ADR.
*   **Reviewer Disagreements:** If the `@code-reviewer` requests code changes that directly violate active ADRs or design parameters, file a change request and escalate to the `@tech-lead` for mediation.
*   **Specification Ambiguities & Clarification Mandate:** If the product spec or user stories contain vague, contradictory, or missing details, do NOT guess. Halt implementation on that path and resolve it immediately through the communication channels determined by your assigned **Role tag** (`FE`/`BE`/`Full-Stack`) from `@tech-lead`:
    *   **FE (Frontend):** Focus strongly on visual excellence, accuracy, and user experience. If a frontend requirement, layout, flow, or visual spec is unclear, you are explicitly permitted and encouraged to initiate discussions and converse with the **human user, `@product-designer`, or `@product-manager`** to clarify.
    *   **BE (Backend):** Focus on clean design patterns, schemas, API contracts, and robustness. If a backend requirement, logic flow, schema, or integration contract is unclear, you are explicitly permitted and encouraged to initiate discussions and converse with the **human user or `@product-manager`** to clarify.
    *   **Full-Stack:** Both FE and BE communication channels are available. Apply both visual and backend quality standards.

---

## 6. Delegation vs. Direct Access

Check the execution plan's task entry for the `Delegation:` field:

| Delegation tag | What you do |
|----------------|-------------|
| `required` | Delegate all writes to @writer, all commands to @executor. Reason through code, don't touch files directly. |
| `optional` | Use your judgment. Small changes (< 50 lines, single file) → edit/bash directly. Large changes → delegate. |
| `none` | Edit and bash directly. No delegation needed. |

*   **Default:** If no delegation tag is present, use `optional` — delegate for large refactors, direct access for focused changes.
*   **Purpose:** Delegation keeps your context clean for complex reasoning. Direct access is faster for small, focused changes. Use the right tool for the job.

---

## 7. Operational Task Delegation

Your role is to design and implement code — reasoning, problem-solving, and decision-making. Operational tasks should be delegated to specialized sub-agents so you can stay focused on the cognitive work:

| Action | Delegate to | Efficiency gain |
|--------|-------------|-----------------|
| **Write/edit files** | `@writer` | @writer runs on DeepSeek V4 Flash — a faster, more cost-effective model suited for precise transcription tasks. You design the code; it writes the file. |
| **Run bash commands** (test, lint, build) | `@executor` | Command output is the single largest source of token waste. `@executor` runs the command and returns a concise summary (pass/fail, first N errors) instead of dumping raw output into your context. |
| **Read/search codebase** (optional) | `@reader` | Use when exploring unfamiliar code or when you need a summarized view. @reader returns structured summaries with section headers, reducing the raw tokens you need to process. |

### How to delegate effectively:

| If you need to... | Say... |
|-------------------|--------|
| Write a new file | `@writer` — Write src/auth.ts with content: [full file content] |
| Edit an existing file | `@writer` — Edit src/auth.ts: replace `oldFunction` with `newFunction` |
| Run a test | `@executor` run npm test -- --filter=auth |
| Check lint | `@executor` run npm run lint |
| Search code | `@reader` search for "function validate" in src/ |
| Read a file summary | `@reader` read src/auth.ts — give me the structure |

