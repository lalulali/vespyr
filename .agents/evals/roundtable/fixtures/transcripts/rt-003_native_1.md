Roundtable on rt-003 (LLM meeting-notes summarization via third-party API) — native run 1.

### @product-manager (Sarah)
Users already paste notes into summaries manually; the job exists. But cold-start scope is vague: which meeting sources, which plan tier?
[VERDICT: PIVOT]

### @ml-ai-engineer (Kai)
No eval set, no production prompt. Meeting transcripts carry speaker attribution errors; summarization quality is unmeasured. Baseline first: extractive heuristic (headlines + action items) compared against LLM output on a 50-transcript gold set.
[VERDICT: PIVOT]

### @security-engineer (Victor)
Raw transcripts contain PII and customer secrets; third-party API processing without a data-processing agreement and redaction is a compliance incident waiting to happen.
[VERDICT: KILL]

```roundtable-coverage
panel: @product-manager, @ml-ai-engineer, @security-engineer
challenges:
- @ml-ai-engineer -> @product-manager: the "job exists" claim cites manual pasting, not demand for automated summaries
- @product-manager -> @security-engineer: DPA-first is a sequencing demand, not a kill — redaction is buildable
- @security-engineer -> @ml-ai-engineer: the 50-transcript gold set prescribes effort without a source for labeled data
```

Host synthesis: redaction layer + DPA unblocks the PII concern; scope narrows to one source and one plan tier; heuristic baseline is the gate.
[SYNTHESIS: PIVOT]
