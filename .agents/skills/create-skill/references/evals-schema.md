# Evals Schema Specification (Vespyr Lightweight Format)

Vespyr uses a lightweight, human-readable evaluation schema for testing skills without complex external runner infrastructure.

---

## File Location

Each skill can optionally contain an `evals/evals.json` file:

```
.agents/skills/<skill-name>/evals/evals.json
```

---

## Schema Structure

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "VespyrSkillEvals",
  "type": "object",
  "required": ["skill_name", "evals"],
  "properties": {
    "skill_name": {
      "type": "string",
      "description": "Must match the skill's name frontmatter field"
    },
    "description": {
      "type": "string",
      "description": "Optional summary of what this eval suite tests"
    },
    "evals": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "prompt", "expected_output", "expectations"],
        "properties": {
          "id": {
            "type": "integer",
            "description": "Unique test case number (1, 2, 3...)"
          },
          "name": {
            "type": "string",
            "description": "Descriptive short title for the test case"
          },
          "prompt": {
            "type": "string",
            "description": "The exact user task or prompt being tested"
          },
          "expected_output": {
            "type": "string",
            "description": "High-level summary of expected success state"
          },
          "files": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Optional relative input file paths needed for test execution"
          },
          "expectations": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Verifiable pass/fail statements checked during review"
          }
        }
      }
    }
  }
}
```

---

## Example `evals.json`

```json
{
  "skill_name": "customize-skill",
  "description": "Test suite for surgical skill customization",
  "evals": [
    {
      "id": 1,
      "name": "skill-trigger-widening",
      "prompt": "The /validate-idea skill should also trigger when I say 'check my concept' — update it",
      "expected_output": "validate-idea/SKILL.md description extended with the new trigger phrase and spec_check passes",
      "files": [".agents/skills/validate-idea/SKILL.md"],
      "expectations": [
        "The description field in validate-idea/SKILL.md includes 'check my concept'",
        "The mirror .opencode/skills/validate-idea/SKILL.md is byte-identical",
        "node .agents/scripts/spec_check.js exits 0"
      ]
    }
  ]
}
```

---

## Evaluation Workflow

1. Execute the `prompt` using the designated skill.
2. Review the resulting output against the items in `expectations`.
3. `@qa-engineer` or the user checks off expectations manually or via `/test`.
