# Delegation Layer: Cross-Harness Pattern

This document defines the **universal optimization pattern** for AI coding assistants: separate reasoning from I/O. It works in any harness — opencode, Cursor, Windsurf, Claude Code, GitHub Copilot, or raw API usage.

---

## The Core Insight

**The problem:** Most AI coding tools use one model for everything. When a reasoning model (Claude Opus, GPT-5, Kimi K2.6) reads files, writes code, and processes test output, every token burns expensive credits. Command output alone can consume 10K+ tokens per test run, and most of those tokens are noise — pass/fail lines, stack traces, and log messages the model reads but barely uses.

**The solution:** Separate the reasoning and I/O concerns. Use a smaller, faster model for I/O operations, preserving the reasoning model's context for actual reasoning.

```
Cost = (reasoning_tokens × reasoning_price) + (io_tokens × io_price)

Without separation:  Cost ≈ total_tokens × reasoning_price
With separation:     Cost ≈ (reasoning_tokens × reasoning_price) + (io_tokens × io_price)
                     io_price ≪ reasoning_price, so savings approach 90%+ on I/O
```

Even more important than cost: **quality**. A reasoning model that spends 80% of its context on raw test output has less capacity for actual reasoning. Delegation keeps its context focused.

---

## The Three Roles

### 1. Reader — read-only, returns summaries

```
Input:  "Read src/auth.ts, summarize the auth flow"
Output: "src/auth.ts (143 lines): login() [L12], logout() [L45], verifyToken() [L78]..."

Permissions:
- ALLOW: read, glob, grep
- DENY:  bash, edit, write
- Model: lightweight, fast — does not need reasoning capability
```

**Prompt core:** "You read files and return summaries. Do not analyze, suggest, or design. Be terse and structured."

**When to use @reader instead of reading directly:**
- Exploring unfamiliar files where you want a structural overview first
- Searching the codebase with glob/grep patterns
- Reading large files where you only need specific sections
- When you want to minimize context consumption

### 2. Writer — write-only, executes precisely

```
Input:  "Write src/auth.ts with the following content: ..."
Output: "Written: src/auth.ts (143 lines)"

Permissions:
- ALLOW: edit, write tool
- DENY:  bash, read (unless context needed for edit)
- Model: lightweight, fast — transcription requires no reasoning
```

**Prompt core:** "Write files exactly as specified. Do not modify, improve, or refactor. Execute precisely."

**When to use @writer instead of writing directly:**
- Creating new files with known content
- Editing existing files with precise old→new replacements
- When you've designed the solution and just need it transcribed

### 3. Executor — command-only, returns summaries

```
Input:  "Run npm test -- --filter=auth"
Output: "→ exit: 0\n→ 42 passed, 3 failed: testAuthExpiry, testInvalidToken, testRateLimit"

Permissions:
- ALLOW: bash
- DENY:  edit, write, read
- Model: lightweight, fast — summarization requires minimal reasoning
```

**Prompt core:** "Run commands and summarize output. Keep results terse — exit code, pass/fail counts, first N errors."

**When to use @executor instead of running directly:**
- Running test suites (the biggest source of token waste)
- Running linters and type-checkers
- Running builds
- Git operations (status, diff summary)
- Any command whose output is mostly noise

---

## Harness-Specific Implementations

### opencode

1. Define sub-agents in `opencode.json` with `"mode": "subagent"` and a lightweight model
2. Create `.md` files in `.agents/agents/` with detailed prompts
3. Restrict thinking agents: `"permission": { "bash": "deny", "edit": "deny" }`
4. Instruct prompts: "Delegate to @writer for writes, @executor for commands"

```json
{
  "model": "opencode-go/kimi-k2.6",
  "agent": {
    "developer": {
      "permission": { "bash": "deny", "edit": "deny" }
    },
    "executor": {
      "model": "opencode-go/deepseek-v4-flash",
      "mode": "subagent"
    }
  }
}
```

**Enforcement:** Permission denial (`bash: deny`, `edit: deny`) physically prevents the agent from performing those actions, forcing it to delegate. This is more reliable than asking politely.

### Cursor

Create `.cursor/rules/delegation.mdc` with:

```
You are a reasoning agent. Delegate I/O to specialized sub-agents:
- @writer → for file writes and edits
- @executor → for bash commands
- @reader → for file searches and summaries (optional optimization)

You cannot write files directly. You cannot run commands directly. Use the sub-agents.
```

Use Cursor's agent mode with different base model per tab. The main tab uses a reasoning model; create dedicated tabs for writer/executor/reader with a faster model.

### Claude Code

**CLAUDE.md:**
```
## Task Delegation
- Use @writer for file writes and edits
- Use @executor for bash commands
- Use @reader for file searches

Create custom hook scripts that intercept @role mentions and route them to a faster model:
1. Parse the message for @writer, @executor, @reader patterns
2. Extract the instruction
3. Forward to a lightweight model endpoint
4. Return the result
```

### Windsurf

Use Cascade's rule system:

```
## Agent Architecture
Main agent uses reasoning model for:
- Code design and problem-solving
- Architecture decisions
- Review and analysis

Specialized agents use a faster model for:
- File reads and searches
- File writes and edits
- Command execution

Delegation is mandatory — the main agent cannot write files or run commands directly.
```

### Raw API / Custom Implementation

```
def process_request(user_message):
    # Route based on intent
    if is_io_operation(user_message):
        return lightweight_model(user_message)  # No reasoning needed
    else:
        result = reasoning_model(user_message)  # Full reasoning
        return result
```

More sophisticated routing:

```
class AgentRouter:
    def __init__(self):
        self.reasoning_model = "claude-opus-4"       # Expensive, powerful
        self.io_model = "claude-sonnet-4"             # Faster, lighter

    def process(self, message, role="reasoning"):
        if role == "reader":
            return self.io_model(f"Read files and return summary. {message}")
        elif role == "writer":
            return self.io_model(f"Write files precisely. {message}")
        elif role == "executor":
            return self.io_model(f"Run command and summarize. {message}")
        else:
            return self.reasoning_model(message)
```

---

## Enforcement Mechanisms

| Harness | How to enforce delegation |
|---------|--------------------------|
| **opencode** | Permission denial (`bash: deny`, `edit: deny`) — model physically can't do it |
| **Cursor** | `.cursorrules` + per-agent model assignment + `.mdc` rules |
| **Claude Code** | Hook scripts that intercept mentions and route to lightweight model API |
| **Windsurf** | Cascade agent definitions with per-agent model |
| **Custom API** | Separate API calls — route read/write/exec to lightweight model endpoint |

The most reliable enforcement is **permission denial**: if the reasoning agent cannot physically write files or run commands, it must delegate. Permission denial works regardless of whether the model is well-behaved.

---

## Projected Impact

| Scenario | Without delegation | With delegation |
|----------|-------------------|-----------------|
| Read a 500-line file | ~2K raw tokens enter reasoning context | @reader returns ~200 token summary |
| Run test suite (50 tests, 3 fail) | ~10K raw output tokens | @executor returns ~300 token summary |
| Write a 300-line file | ~1K output tokens | @writer handles the output |
| **Total per cycle** | **~13K reasoning-model tokens** | **~500 reasoning-model tokens + ~2K I/O-model tokens** |

**Typical savings:** 90–98% reduction in reasoning-model I/O tokens. The exact savings depend on command output verbosity — projects with extensive test suites see the largest gains.

---

## Adaptation Guide

To apply this pattern to any AI coding harness:

1. **Identify the role system** — Does the harness support sub-agents, rules, hooks, or per-request model routing?
2. **Create 3 roles** — Reader, Writer, Executor with the core prompts above
3. **Assign a faster model to I/O roles** — Map each role to the fastest capable model
4. **Restrict the reasoning agent** — Remove I/O permissions so it must delegate
5. **Instruct delegation** — Add to the reasoning agent's prompt: "Use @reader/@writer/@executor for I/O"
6. **Verify enforcement** — Confirm the reasoning agent cannot bypass delegation (e.g., by attempting to write directly)
