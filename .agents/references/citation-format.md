# Citation Format — Inline + Footnote Protocol

Every factual claim in a Vespyr artifact that comes from a real source must be traceable. Use inline `[N]` markers linked to footnotes at the end of the artifact.

## Inline format

```
The market for AI agents grew 47% in 2025 [1], with enterprise adoption doubling year-over-year [2].
```

## Footnote formats per source type

| Source type | Footnote format |
|---|---|
| Web page | `[^N]: Author/Organization, "Title," URL, Date published. Accessed: YYYY-MM-DD.` |
| Book | `[^N]: Author, *Title*, Publisher, Year, page(s).` |
| Paper | `[^N]: Author(s), "Title," Journal/Conference, Year. DOI/URL.` |
| Code/library | `[^N]: Library name, version, URL. File:line if specific.` |
| Interview | `[^N]: Participant ID (anonymized), "Topic," interview date.` |
| Data/telemetry | `[^N]: Source system, metric name, date range, filter.` |
| Benchmark | `[^N]: Tool name, version, hardware spec, date, methodology.` |

## Worked examples per source type

**Web page:**
> The framework was released in March 2026 [1].
>
> [^1]: Vespyr Team, "Vespyr v2.0 Release Notes," https://github.com/lalulali/vespyr/releases/tag/v2.0.0, March 15, 2026. Accessed: 2026-07-12.

**Book:**
> The pattern is documented in Refactoring [2].
>
> [^2]: Martin Fowler, *Refactoring: Improving the Design of Existing Code*, Addison-Wesley, 2018, pp. 112-115.

**Paper:**
> The attention mechanism was introduced by Vaswani et al. [3].
>
> [^3]: Ashish Vaswani et al., "Attention Is All You Need," NeurIPS, 2017. https://arxiv.org/abs/1706.03762

**Code/library:**
> The implementation follows the React useReducer pattern [4].
>
> [^4]: React v18.2, useReducer API, https://react.dev/reference/react/useReducer.

**Interview:**
> Users reported frustration with the onboarding flow [5].
>
> [^5]: Participant P12, "Onboarding usability session," interview date: 2026-06-15.

**Data/telemetry:**
> Daily active users grew 12% week-over-week [6].
>
> [^6]: Amplitude Analytics, "DAU metric," date range: 2026-06-01 to 2026-06-30, segment: all users.

**Benchmark:**
> Query latency improved by 40% after the index change [7].
>
> [^7]: pgbench v15, PostgreSQL 15.4, AWS r6i.xlarge, 2026-06-20, TPC-B-like workload, 100 clients, 10-min run.

## Edge cases

**Citing a citation (secondary source):** Use "as cited in" format.
> Author, "Title," as cited in Secondary Author, "Secondary Title," Source, Year.

**Multi-source claims:** One footnote per source. If two sources corroborate the same claim, cite both.
> The market grew 30% [1] [2].

**Conflicting sources:** Cite both, note the conflict.
> [^N]: Source A claims 30% growth. Source B claims 18% growth (different methodology — includes only enterprise segment).

## "Source: unverified" protocol

If you cannot locate or verify the source for a claim:

1. Mark it: `[Source: unverified]`
2. State why: "Source attribution could not be confirmed."
3. Flag it for the user at the top of the artifact:
   > **⚠ Warning:** This artifact contains [N] claim(s) marked [Source: unverified]. These claims should not be used for production decisions without independent verification.

**Never fabricate a citation.** A fabricated citation is worse than no citation — it creates a false trail that wastes the user's time and erodes trust in all future citations.
