---
prototype: "<repo-relative path or source pointer (Figma URL, live code)>"
prototype_type: file
generated: "<YYYY-MM-DD>"
generator: "@product-designer"
---

# Prototype Inventory — {feature}

Extraction-only record of what the prototype does. No requirements language, no interpretation. Every row carries a `path#id` anchor (frozen A11 grammar: repo-relative POSIX path + one `#` + anchor token; HTML/SVG anchors are `id="<id>"` attributes, other files use a word-boundary symbol occurrence; non-file prototypes anchor to `prototype-inventory.md#INV-NN` rows).

## Rows

| ID | Kind | Name | Anchor (`path#id`) | Observable fact |
|---|---|---|---|---|
| INV-01 | screen | {screen name} | `{path}#{anchor}` | {what is observable — states, fields, copy, behaviors} |
| INV-02 | flow | {flow name} | `{path}#{anchor}` | {step-by-step what happens} |
| INV-03 | behavior | {behavior name} | `{path}#{anchor}` | {validation rule, permission, edge case — as observed} |
| INV-04 | state | {state name} | `{path}#{anchor}` | {empty / loading / error / populated — what shows} |
| INV-05 | interaction | {interaction name} | `{path}#{anchor}` | {focus, keyboard, micro-feedback as observed} |

**Kinds:** `screen` · `flow` · `behavior` · `state` · `interaction` — `behavior` carries observable rules and properties (validation, permissions, data shapes, telemetry, performance, accessibility, platform facts, copy). One kind per row; a row that needs two kinds is two rows.

## Coverage self-check (10 detail classes)

| Detail class | Rows covering it |
|---|---|
| Screen states (empty/loading/error) | {INV-NN, ...} |
| Edge cases & validation | {INV-NN, ...} |
| Data fields & types | {INV-NN, ...} |
| Permissions & auth | {INV-NN, ...} |
| Navigation & flows | {INV-NN, ...} |
| Copy & tone | {INV-NN, ...} |
| Telemetry | {INV-NN, ...} |
| Performance notes | {INV-NN, ...} |
| Accessibility | {INV-NN, ...} |
| Platform constraints | {INV-NN, ...} |

## Unobserved questions (not inventory rows)
- {suspected behavior that could not be observed — routed to the session summary, answered by the owner or the prototype}
