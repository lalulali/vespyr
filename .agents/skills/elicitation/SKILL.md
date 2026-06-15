---
name: elicitation
description: 'Push the LLM to reconsider, refine, and improve its recent output. Use when user asks for deeper critique or mentions a known deeper critique method, e.g. socratic, first principles, pre-mortem, red team.'
---

# Advanced Elicitation

**Goal:** Push the LLM to reconsider, refine, and improve its recent output.

---

## CRITICAL LLM INSTRUCTIONS

- **MANDATORY:** Execute ALL steps in the flow section IN EXACT ORDER
- DO NOT skip steps or change the sequence
- HALT immediately when halt-conditions are met
- Each action within a step is a REQUIRED action to complete that step
- Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution
- **YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the `communication_language`**

---

## INTEGRATION (When Invoked Indirectly)

When invoked from another prompt or process:

1. Receive or review the current section content that was just generated
2. Apply elicitation methods iteratively to enhance that specific content
3. Return the enhanced version back when user selects 'x' to proceed and return back
4. The enhanced content replaces the original section content in the output document

---

## FLOW

### Step 1: Method Registry Loading

**Action:** Load `./methods.csv` for elicitation methods. To support multi-persona simulation methods, resolve the agent roster via:

```bash
node .agents/scripts/resolve_agents.js
```

The resolver scans `.agents/agents/*.md` and returns each agent's configuration, including `code` (filename), `human_name`, and `description` (title). This roster allows the active agent to simulate different specialist personas (like `@architect`, `@security-engineer`, or `@qa-engineer`) when executing collaboration or critique methods.

#### CSV Structure

- **category:** Method grouping (core, structural, risk, etc.)
- **method_name:** Display name for the method
- **description:** Rich explanation of what the method does, when to use it, and why it's valuable
- **output_pattern:** Flexible flow guide using arrows (e.g., "analysis → insights → action")

#### Context Analysis

- Use conversation history
- Analyze: content type, complexity, stakeholder needs, risk level, and creative potential

#### Smart Selection

1. Run the method matching script via `@executor` to dynamically identify the top 5 most relevant elicitation methods for the current context (the active document, artifact name, or task details):
   ```bash
   node .agents/scripts/match_methods.js --context "[detailed task context, artifact name, and current section]"
   ```
2. Read the JSON output of the script to obtain the recommended methods.
3. Present these 5 matched methods to the user in the options display format.

---

### Step 2: Present Options and Handle Responses

#### Display Format

Present the choices to the user in a beautiful, styled markdown block:

```markdown
### 🔍 Advanced Elicitation Options

Select one of the following methods to critique and refine the **[Artifact Name]**:

1. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`
2. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`
3. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`
4. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`
5. **[Method Name]** (`[Category]`)
   * [Description of the method]
   * *Pattern:* `[output_pattern]`

---
Reply with a number (1-5) or method name to execute, **reshuffle** to get new options, **list all** methods, or **proceed** to finalize the artifact.
```

#### Response Handling

**Case 1-5 (User selects a method by number or name):**

- Execute the selected method using its description from the CSV.
- Adapt the method's complexity and output format based on the current context.
- If the method requires multiple personas, dynamically simulate those personas using the agent roster profiles (e.g., `@architect`, `@developer`).
- Apply the method creatively to the current section content being enhanced.
- Display the enhanced version showing what the method revealed or improved (with clear diffs or formatted text).
- **CRITICAL:** Ask the user: *"Do you want to apply these changes to the document? (yes / no / refine further)"* and HALT to await response.
- **CRITICAL:** ONLY if Yes, apply the changes. IF No, discard your memory of the proposed changes. If any other reply, try best to follow the instructions given by the user.
- **CRITICAL:** Re-present the options menu (with 5 fresh or reshuffled methods) to allow additional elicitations.

**Case: Reshuffle**

- Select 5 random methods from methods.csv, present new list with same prompt format.
- When selecting, try to think and pick a diverse set of methods covering different categories and approaches, with 1 and 2 being potentially the most useful for the document or section being discovered.

**Case: List All**

- List all methods with their descriptions from the CSV in a clean, categorized markdown table.
- Allow user to select any method by name or number from the full list.
- After selection, execute the method as described in the Case 1-5 above.

**Case: Proceed**

- Complete elicitation and proceed.
- Return the fully enhanced content back to the invoking skill.
- The enhanced content becomes the final version for that section.
- Signal completion back to the invoking skill to continue with the next section.

**Case: Direct Feedback**

- Apply changes to current section content and re-present choices.

**Case: Multiple Numbers**

- Execute methods in sequence on the content, then re-offer choices.

---

### Step 3: Execution Guidelines

- **Method execution:** Use the description from CSV to understand and apply each method
- **Output pattern:** Use the pattern as a flexible guide (e.g., "paths → evaluation → selection")
- **Dynamic adaptation:** Adjust complexity based on content needs (simple to sophisticated)
- **Creative application:** Interpret methods flexibly based on context while maintaining pattern consistency
- Focus on actionable insights
- **Stay relevant:** Tie elicitation to specific content being analyzed (the current section from the document being created unless user indicates otherwise)
- **Identify personas:** For single or multi-persona methods, clearly simulate and identify viewpoints using the agent profiles from the resolved roster.
- **Critical loop behavior:** Always re-offer the options card after each method execution
- Continue until user selects 'x' to proceed with enhanced content, confirm or ask the user what should be accepted from the session
- Each method application builds upon previous enhancements
- **Content preservation:** Track all enhancements made during elicitation
- **Iterative enhancement:** Each selected method (1-5) should:
  1. Apply to the current enhanced version of the content
  2. Show the improvements made
  3. Return to the prompt for additional elicitations or completion
