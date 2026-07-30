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
  "description": "Test suite for agent customization override generation",
  "evals": [
    {
      "id": 1,
      "name": "developer-temperature-override",
      "prompt": "Customize @developer to set temperature to 0.4 and use named exports convention",
      "expected_output": ".agents/custom/developer.toml created with temperature and conventions table",
      "files": [".agents/agents/developer/customize.toml"],
      "expectations": [
        "The file .agents/custom/developer.toml exists",
        "temperature is set to 0.4",
        "conventions.exports specifies named exports",
        "merge script returns valid merged JSON without errors"
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
