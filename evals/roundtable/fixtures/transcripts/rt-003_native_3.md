Roundtable on rt-003 (LLM meeting-notes summarization via third-party API) — native run 3.

### @product-manager (Sarah)
Same retention-wedge thesis; narrower scope after prior friction.
[VERDICT: PIVOT]

### @ml-ai-engineer (Kai)
Latency ceiling undefined: summarization must beat manual reading time or the feature is negative value. p95 under 20s or cut scope to action-items only.
[VERDICT: PIVOT]

### @security-engineer (Victor)
Standing by the KILL unless the DPA is signed first; prompt-injection surface (meeting content is untrusted input) needs the T2/T3 data rule.
[VERDICT: KILL]

```roundtable-coverage
panel: @product-manager, @ml-ai-engineer, @security-engineer
challenges:
- @ml-ai-engineer -> @product-manager: "narrower scope" is unspecified — which fields survive redaction?
- @product-manager -> @security-engineer: signing-first blocks discovery competitors ship without
- @security-engineer -> @ml-ai-engineer: 20s p95 is asserted without a measured baseline reading time
```

Host synthesis: irreconcilable sequencing dispute (DPA-first vs ship-first) escalated to ADR.
[SYNTHESIS: ADR:adr-006]
