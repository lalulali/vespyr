# Vespyr Developer Guidelines and Standards

This reference document acts as the master developer playbook for the `@developer` subagent and any multi-developer instances (e.g., `@developer-1`, `@developer-2`). It defines strict workflow rules, coding patterns, testing standards, and compliance checklists.

---

## 1. Multi-Developer Mode (Worktrees)

When working in multi-developer mode (assigned a Developer ID like `@developer-N` and a specific worktree):

1.  **Identify Assignment:** Inspect the `Backlog` / `To Do` lists in `artifacts/output/05-planning/kanban.md` to identify your assigned Developer ID, worktree path, feature branch, and files.
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
You MUST load, read, and fully digest the **Product Spec** (`artifacts/output/03-strategy/product-spec.md`) and the companion **User Stories** (`artifacts/output/03-strategy/user-stories.md`) in full prior to writing any code. Make sure to:
*   Understand the complete end-to-end visual layouts, screen transitions, loading states, success states, and error states detailed in the product spec.
*   Digest the business rationale, technical requirements, and acceptance criteria (Happy, Unhappy, and Edge cases) for your assigned stories.
*   Conform 100% to these specs and stories. Do not commence implementation work until you have read both.

### Step 2: Study Existing Patterns
Read existing source files in the same component area. Learn and match all naming conventions, folder structures, imports, and styling patterns exactly.

### Step 3: Implement the Logic (Evolutionary Design over BDUF)
Write modular, clean, and highly robust code adhering to:
*   **Kent Beck's 4 Rules of Simple Design:** (1) Passes tests, (2) Reveals intention, (3) Eliminates duplication, (4) Fewest elements.
*   **YAGNI over BDUF:** Never build speculative frameworks, generic abstractions, or plumbing layers upfront. Build the simplest design that satisfies current acceptance criteria.
*   **Ports & Adapters (Hexagonal Boundaries):** Isolate pure domain business logic from databases, external APIs, IPC, and UI. Keep external frameworks at the boundary adapters.
*   Clear, self-documenting naming and Single Responsibility Principle (SRP).
*   Relevant Architectural Decision Records (ADRs). Reference the specific ADR numbers in code comments if they inform important design decisions.

### Step 4: Implement Acceptance Criteria Categories
You must write code satisfying all three mandatory criteria categories:
*   **Happy Path:** The successful execution flow from trigger to completion.
*   **Unhappy Path:** Graceful handling of every error, failure, validation mismatch, and network loss.
*   **Edge Cases:** Extreme scales (0, 1, max), concurrency issues, boundary inputs, and browser navigation events.

### Step 5: Logging and Observability
Instrument your code with structured logging using appropriate levels (`info`, `warn`, `error`). Always pass correlation/request IDs across asynchronous boundaries to preserve execution traceability.

### Step 6: Test-Driven Development (TDD) & Refactoring
Follow the strict **Red-Green-Refactor** cycle alongside your code:
*   **Red:** Write a failing test proving the missing capability or defect.
*   **Green:** Write minimal code to pass the test.
*   **Refactor:** Continuously clean structure, eliminate duplication, and improve readability while keeping tests green.
*   **The Anti-Mock Invariant:** Tests MUST assert against observable inputs/outputs and external boundary contracts, never against internal method call chains (`mock.expect(...).toBeCalledTimes()`). Tests that break during internal refactoring while external behavior is preserved are defective.
*   **Wire-Level vs. Internal Mocking Boundary:** Wire-level I/O simulation (e.g. MSW, local Node `http.createServer`, testcontainers) is legitimate and expected when testing boundary adapters against external systems. The Anti-Mock ban applies strictly to mocking *internal domain class methods*.
*   **Demonstrated Red on Disk:** Boundary adapters (DBs, network APIs, IPC) MUST have contract tests with negative fault injection (timeouts, 429s, disk errors) proving the failure handlers trip.

### Step 7: Minimal, Non-Obvious Comments
Do NOT add comments for obvious code. Let clean structure and descriptive variables speak for themselves. Add comments only to explain "why" a non-obvious workaround, algorithm, or mathematical scale is used.

### Step 8: Verify via Static Analysis
Verify your implementation's static correctness by running linting and type-checking directly:
*   *Example:* `npm run lint && npm run typecheck` (or syntax validation `node --check` when standalone).

### Step 9: Re-verify
Verify that no regression has been introduced in other files.

---

## 3. Submission Checklist (Definition of Done)

Before declaring a task complete and handing it over to downstream agents, verify that all of the following requirements are met:

*   [ ] **Acceptance Criteria:** Every happy path, unhappy path, and edge case is fully implemented.
*   [ ] **Test Coverage & Anti-Mock:** All tests assert observable behavior with zero mocks on domain logic; pre-existing and new test suites pass (`npm test`).
*   [ ] **Demonstrated Red:** Boundary adapters include automated negative fault-injection tests proving error handlers trip under simulated network/system faults.
*   [ ] **Continuous Refactoring Completed:** Red-Green-Refactor executed; code is simplified with zero speculative abstraction layers.
*   [ ] **Linting & Code Style:** Linter and syntax checks pass cleanly with zero errors (`npm run lint`).
*   [ ] **Type Safety:** Compilation and type-checks pass completely (`npm run typecheck`).
*   [ ] **Regression Safeguard:** The full pre-existing test suite passes with no regressions.
*   [ ] **ADR Compliance:** Code complies with all active architectural designs (ADRs).
*   [ ] **Deliverable Hand-off:** Submit a Pull Request (PR) and invoke `@code-reviewer` for review.

---

## 4. Coding Standards

*   **Evolutionary Design & YAGNI (The 2-Callsite Invariant):** Speculative abstractions are forbidden. Any internal interface, generic helper class, or multi-tenant wrapper must have at least two active, concrete production call sites in the PR to justify its existence.
    *   *No Test-as-Callsite Gaming:* Unit test invocations do **NOT** count toward the two required call sites.
    *   *Boundary Ports Exemption:* Outbound boundary ports (Ports & Adapters / Hexagonal Architecture) isolating pure business logic from external I/O (e.g. database repositories, third-party API clients) are justified by architectural boundary decoupling, not internal call site counts.
*   **Software 1.0 vs. Software 2.0 Boundary Standard:**
    *   *Software 1.0 (Deterministic Core):* Pure domain business logic, validated schemas, deterministic state transitions. Tested with zero-mock in-memory tests.
    *   *Software 2.0 (Stochastic AI/ML):* Prompts, agent loops, and model wrappers are disposable primitives (<24h replacement velocity). Typed schemas (PEP 544 / Pydantic) required at boundaries—no untyped dictionaries.
*   **Explicit over Implicit:** Write clear, descriptive code. Avoid clever tricks or implicit language syntax that reduces readability.
*   **Total Error Handling:** Never swallow exceptions or hide failures. Catch errors, log them with appropriate severity, and return clean user feedback or recovery alternatives.
*   **Traceability:** Always reference the Kanban backlog (`kanban.md`) and architectural patterns (`04-architecture/`) in your task reasoning.
*   **Observability:** Treat structured logs as a first-class feature of the codebase.

---

## 5. Conflict Resolution

*   **Architectural Issues:** If you uncover an architectural limitation or flaw while writing code, do NOT work around it silently. File a formal change request (CR) against the relevant ADR.
*   **Reviewer Disagreements:** If the `@code-reviewer` requests code changes that directly violate active ADRs or design parameters, file a change request and escalate to the `@tech-lead` for mediation.
*   **Specification Ambiguities & Clarification Mandate:** If the product spec or user stories contain vague, contradictory, or missing details, do NOT guess. Halt implementation on that path and resolve it immediately through the communication channels determined by your assigned **Role tag** (`FE`/`BE`/`Full-Stack`) from `@tech-lead`:
    *   **FE (Frontend):** Focus strongly on visual excellence, accuracy, and user experience. If a frontend requirement, layout, flow, or visual spec is unclear, you are explicitly permitted and encouraged to initiate discussions and converse with the **human user, `@product-designer`, or `@product-manager`** to clarify.
    *   **BE (Backend):** Focus on clean design patterns, schemas, API contracts, and robustness. If a backend requirement, logic flow, schema, or integration contract is unclear, you are explicitly permitted and encouraged to initiate discussions and converse with the **human user or `@product-manager`** to clarify.
    *   **Full-Stack:** Both FE and BE communication channels are available. Apply both visual and backend quality standards.


