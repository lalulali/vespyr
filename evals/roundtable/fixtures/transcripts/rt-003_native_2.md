Roundtable on rt-003 (LLM meeting-notes summarization via third-party API) — native run 2.

[RED-TEAM: @security-engineer]

### @product-manager (Sarah)
Feature is a retention wedge for team plans; scope to post-meeting email summaries.
[VERDICT: RESHAPE]

### @ml-ai-engineer (Kai)
Extractive baseline plus API fallback, eval-gated before rollout.
[VERDICT: RESHAPE]

### @security-engineer (Victor)
Redaction and DPA conditions are buildable; conditional pass.
[VERDICT: RESHAPE]

```roundtable-coverage
panel: @product-manager, @ml-ai-engineer, @security-engineer
challenges:
- @ml-ai-engineer -> @product-manager: retention-wedge claim has no funnel data behind it
- @product-manager -> @security-engineer: DPA-first sequencing blocks discovery competitors ship without
- @security-engineer -> @ml-ai-engineer: baseline-first doubles time-to-demo — why here?
```

Host synthesis: conditional proceed with redaction, DPA, and eval gate.
[SYNTHESIS: RESHAPE]
