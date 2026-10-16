# Harness Neutrality — Writing a Skill That Works Everywhere

A Vespyr skill is plain Markdown plus, optionally, scripts in the repository's own runtime. Nothing
about it is bound to one agent product. This file is the rules for keeping it that way, and they exist
because this repository got them wrong repeatedly before they were written down.

**Read this before writing any frontmatter or any instruction that names a tool.** Everything else in
`create-skill` is about writing a *good* skill; this is about writing one that is still good when it
runs somewhere else.

---

## The one distinction everything else follows from

A skill has two surfaces, and they have opposite rules:

| Surface | Rule | Why |
|---|---|---|
| **Frontmatter** (`allowed-tools`, `compatibility`) | May name a specific harness's tools | These are *declarations*. A harness that understands them reads them; one that does not loses nothing |
| **Body** (the instructions) | **Never** names a tool. Names the *capability* | The body is what the agent executes. If it says `AskUserQuestion` and the harness calls that tool `question`, the instruction points at nothing |

The failure this rule was written for: `/humanize` said *"ask once using `AskUserQuestion`"* in its
body. Under Claude that resolves. Under OpenCode the tool is `question`, under Cursor and Windsurf it
is something else again — so the instruction named a tool that did not exist. Ten other places in this
repository already said *"ask the user"*, which works everywhere. One skill did not.

**Write the capability. Let the frontmatter carry the name.**

---

## The seven rules

### 1. Name capabilities, not tools

| Instead of | Write |
|---|---|
| `AskUserQuestion` | "ask the user", "your harness's question tool" |
| `Read` / `Write` / `Edit` | "read the file", "write the file" |
| `Bash` / `shell` | "run the command" |
| `Task` / subagent APIs | "dispatch a subagent, if your harness has them" |
| `present_files` | "if your harness can show the user a file" |

The test: **could a reader who has never seen this harness still act on the sentence?** If the sentence
only makes sense after looking up a tool name, rewrite it.

### 2. Frontmatter declares; the body instructs

`allowed-tools` and `compatibility` are declarations, and both are **optional** — most skills in this
repository declare neither, and they work. Two rules apply:

- **Do not claim a harness you have not verified.** `compatibility: claude-code opencode kiro
  antigravity` is a promise. If the body needs a tool, a binary, or a network call that one of those
  four lacks, the claim is false.
- **A declaration naming one harness's tools while claiming four is worse than no declaration.** Only
  `/shut-up` and `/round-table` declared `compatibility`, and both listed Claude tool names
  (`Bash Read Write Edit Grep Glob`) — accurate where the field is read, inert everywhere else. That is
  acceptable *because the field is inert elsewhere*; it stops being acceptable the moment a harness
  reads `allowed-tools` under different names.

**If a rule in the body needs a tool, the declaration must grant it.** `/shut-up` permitted a
destructive-command confirmation prompt while declaring no question tool — so in the one harness that
enforces `allowed-tools`, the safety rule was unenforceable. `/legal-safety-audit` required asking for
the user's region before drafting any legal document, under the same missing declaration. Both were
fixed; `spec_check.js` now catches the pattern.

### 3. No harness-specific binary in a command

A command block that starts with `claude`, `codex`, `cursor`, `gemini` or any other product name does
not run anywhere else. If the skill needs an LLM call, say what the call is *for* and let the harness
supply it.

The reference skills this one was benchmarked against both fail here: Anthropic's assumes `claude -p`
for its description optimizer, and OpenAI's ships `agents/openai.yaml` plus Python scripts that read it.
Each is correct for its own product and unusable in the other.

### 4. The runtime is the repository's runtime

A skill shipped inside a Node repository should use Node. Adding a Python toolchain to a JavaScript
project means the skill fails on any machine that has one and not the other — and the failure is at
*use* time, far from the author who introduced it.

Check `package.json` before adding a script. If the repository already has a script runner, a test
harness, and a linter, the new script belongs in those, not beside them.

### 5. Degrade explicitly, or do not depend

If a step needs subagents, a browser, a display, or the network, say what to do without it. Anthropic's
skill-creator is the model here and it is worth copying: it carries separate sections for Claude Code,
Claude.ai and Cowork, and each one says which steps to skip and what replaces them.

**But copy the honesty, not the shape.** Per-harness sections drift — three forks of one workflow means
three things to update and no way to tell which is current. Prefer **one body that works everywhere**,
plus a short note naming what degrades:

> **If your harness has no subagents**, run the test cases in series instead of in parallel. The
> comparison is still valid; it is only slower.

That sentence is harness-neutral. A `## Claude.ai-specific instructions` section is not.

### 6. Check before using an optional capability

"Use `present_files` if available" is better than "use `present_files`" — but both are worse than
*"if your harness can show the user a file, do; otherwise give the path."* The first form still names a
tool; the second names the capability and survives.

### 7. Say what the skill does NOT need

The strongest neutrality signal is a short list of non-dependencies:

```
This skill needs: a filesystem, and the ability to read a file.
It does not need: subagents, a browser, network access, or a specific agent product.
```

That sentence tells a reader in one line whether the skill will work for them. No competitor skill in
this comparison carries one.

---

## What `spec_check.js` enforces

The mechanical half of these rules is checked, so a violation fails CI rather than shipping:

| Rule | Checked |
|---|---|
| A body naming a known harness tool | **violation** — `AskUserQuestion`, `present_files`, and the Claude tool names in prose |
| A body requiring a harness binary in a command | **violation** — `claude -p`, `codex`, `cursor-agent` in a fenced block |
| A skill that asks the user but declares no question tool | **violation** — when `allowed-tools` is present |
| `compatibility` naming a harness the skill cannot run on | **not checked** — needs judgement; recorded as a limit |

The last row matters. A checker that pretends to verify portability is worse than one that says it
cannot, because the first is trusted.

---

## The test that settles it

Ask: **would this skill work if the agent product were swapped tomorrow?**

If yes, it is neutral. If the answer is "yes, except the tool names", fix the names — that is the
cheapest and most common failure. If the answer is "no, it needs X", then either X becomes a declared
dependency in `compatibility`, or the skill degrades gracefully without it.

There is no third option, and "it works on my harness" is not one of them.
