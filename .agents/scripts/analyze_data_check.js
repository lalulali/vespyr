#!/usr/bin/env node
/**
 * analyze_data_check.js — mechanical gate for /analyze-data.
 *
 * WHY THIS EXISTS. `/analyze-data` declared two output artifacts and **nothing checked either**:
 * `grep` over `.agents/scripts/*.js` found no gate, `grep` over `tests/` found no test, and
 * `artifacts/output/07-iteration/` did not exist. Worse, the skill referenced neither of the two
 * templates that already describe its artifacts — `.agents/templates/quality/measurement-plan-template.md`
 * (293 lines) and `.agents/templates/quality/analytics-insights-template.md` (160 lines) — while
 * `/design` and `/iterate` both pointed at them. A run that never opened a template produced an
 * artifact of whatever shape it invented, and no observable difference existed between that and a
 * conformant run.
 *
 * It also wrote to `data-analysis-report.md`, which **nothing read**. The template's own header, the
 * iteration backlog, the iteration results template, `/iterate` and the agent contracts all consume
 * `analytics-insights.md` — so the analysis was done and the next skill in the pipeline could not
 * find it. That is fixed in the SKILL.md; this gate pins it.
 *
 * WHAT IS CHECKED, AND WHAT DELIBERATELY IS NOT.
 *
 * Checked: the sections the template declares (a closed list an author can read), placeholders, and
 * two of the skill's own mechanical rules — a target carries a number or says why it does not, and an
 * insights report carries an observation→insight→action rather than three observations.
 *
 * Not checked: whether the metric is the RIGHT metric, whether the analysis is sound, whether the
 * visualization is honest, whether the recommendation follows from the data, or whether a Goodhart
 * risk was genuinely considered. Those need an analyst, and the gate prints them as limits rather
 * than pretending.
 *
 * The rule this gate follows, learned from three gates in this repo that rejected honest work at 83%,
 * 49% and 33%: check only what has a canonical form the author can look up. Section names from a
 * template qualify. Open prose does not.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * The sections `measurement-plan-template.md` declares, in template order.
 *
 * `conditional: true` marks a section the template itself labels "if applicable" — those are checked
 * for content WHEN PRESENT and never required, because demanding an A/B design from a team that ran
 * no A/B test is demanding a fabrication.
 *
 * Matched by STEM, not by exact text: `## 2. Success Metrics (North Star)` and `## Success Metrics`
 * are the same section to any reader, and pinning the numbering would reject a hand-written plan for
 * a reason its author could not act on.
 */
const MEASUREMENT_PLAN_SECTIONS = [
  ['Measurement Overview', /measurement overview|^overview\b/i],
  ['Success Metrics (North Star)', /success metric|north star/i],
  ['Event Tracking Plan', /event tracking|tracking plan|event taxonomy/i],
  ['Funnel Analysis', /funnel/i],
  ['Dashboard Specifications', /dashboard/i],
  ['A/B Test Design', /a\/?b test|experiment design/i, true],
  ['Data Dictionary', /data dictionary|event (?:spec|properties)/i],
  ['Privacy & Compliance', /privacy|compliance|pii/i],
  ['ML Model Monitoring', /ml model|model monitoring|drift/i, true],
];

/** The sections `analytics-insights-template.md` declares, in template order. */
const INSIGHTS_SECTIONS = [
  ['Executive Summary', /executive summary|^summary\b/i],
  ['Success Metrics vs. Targets', /success metric|metrics vs|targets?/i],
  ['User Behavior Analysis', /user behavior|behaviour|usage pattern/i],
  ['Error and Performance Data', /error|performance|latency/i],
  ['A/B Test Results', /a\/?b test|experiment result/i, true],
  ['Qualitative Feedback', /qualitative|feedback|interview/i],
  ['Iteration Hypotheses', /hypothes/i],
  ['Recommendations', /recommendation|next action/i],
  ['Next Steps', /next steps|follow-?up/i],
];

/**
 * A target cell is a VALUE if it carries a digit, or declares its own absence WITH a reason.
 *
 * WHY THIS IS NOT A STOP-LIST (blind review, both seats). The first version rejected only blanks,
 * dashes, `n/a`, `TBD`, `None` and `?` — so `improve`, `increase substantially`, `higher than
 * baseline`, `soon`, `Q3` and `???` all passed a rule whose own message says "a target with no
 * number is a wish". A stop-list of words cannot test for a number; it can only test for the words
 * somebody thought of. This tests for the number, and accepts a reasoned absence because "n/a — no
 * cohort is old enough yet" is an honest answer and demanding a figure would demand a fabrication.
 */
const REASONED_ABSENCE_RE = /^\s*(?:n\/?a|not yet|none|tbd)\b[^a-z0-9]*\S.{4,}$/i;
function isTargetValue(cell) {
  const c = String(cell || '').trim();
  // A bare quarter or version label is an identifier that happens to contain a digit, not a
  // measurement — `Q3` and `v2` passed the first version of this test, and both are a WHEN, not a
  // threshold. Everything else with a digit is accepted: `62%`, `> 20`, `90 seconds`, `n=2000`, `4`.
  // A quarter, a sprint number or a version is a WHEN, not a threshold — and each of them carries a
  // digit, which is why testing for a digit alone let `Q3 2026`, `sprint 4` and `v3.1` through.
  // A quarter, a half, a fiscal year, a bare year, or "by end of <year>" are all a WHEN. The first
  // version named quarters, sprints and versions; the confirmation review then passed `H2 2026`,
  // `FY2026`, `by end of 2026` and `end of 2026`, which are the same class of label.
  // Split in two because a trailing `\b` cannot follow a letter that is immediately followed by a
  // digit: `FY2026` failed the first version's `fy\b` and passed as a target. The period-prefixed
  // family takes its digits with no separator; the word family needs a boundary so `sprinter` is not
  // a sprint.
  if (/^(?:q[1-4]|h[12]|fy)\s*\d{0,4}$/i.test(c)) return false;
  if (/^(?:v\d+|sprint|release|phase|milestone|cycle|wave)\b[\s\d.\-/]*$/i.test(c)) return false;
  if (/^\d{4}$/.test(c)) return false;                                   // a bare year
  if (/^(?:by|in|from|end of|start of|mid|early|late)\b[^]*\d{4}\s*$/i.test(c)) return false;
  if (/^(?:by|end of|next|this|last|early|late)\s+(?:q[1-4]|h[12]|quarter|month|year|week|sprint|half)\b/i.test(c)) return false;
  // Hyphenated, initialised and ordinal forms of the same phrases — `year-end 2026` is `end of 2026`.
  //
  // A RECORDED BOUNDARY, NOT A COMPLETE LIST. This class is open-ended in English: `EOY`, `year end`,
  // `end of year`, `by the time we ship`, `after the migration`. Each confirmation round produced a
  // rewording the previous pattern missed — `end of 2026`, then `year-end 2026` — which is the
  // vocabulary-over-prose trap this audit has hit repeatedly, and enumerating further would keep
  // losing. What the rule can do honestly is name the common period phrases and say where it stops.
  // `by the time we ship` still passes. That is a limit, stated rather than implied.
  if (/^(?:year|month|quarter|half)[- ]?(?:end|start|beginning)\b[\s\d-]*$/i.test(c)) return false;
  if (/^(?:eoy|eom|eoq|fye)\b[\s\d]*$/i.test(c)) return false;
  if (/^(?:first|second|third|fourth|1st|2nd|3rd|4th)\s+(?:q[1-4]|quarter|half|h[12])\b/i.test(c)) return false;
  if (/\d{4}\s*(?:year[- ]?end|eoy|fiscal)\b/i.test(c)) return false;
  if (/\d/.test(c)) return true;
  if (REASONED_ABSENCE_RE.test(c)) return true;
  return false;
}

/** Template markers that mean the artifact is still the template. */
/**
 * Template markers. WIDENED after review.
 *
 * The first version required an uppercase initial inside brackets, so `[X days / months]`,
 * `[specific action]` and `[2-3 sentences]` — real template slots from this repo's own templates —
 * passed a rule that claims to catch unfilled placeholders. `...` as a whole cell is also a stub.
 * The bracket form now matches any bracketed slot that is not a markdown link (no `](` follows) and
 * is not a short ALL-CAPS tag like `[N]` or `[GO]`.
 */
const PLACEHOLDER_RE = new RegExp(
  [
    // A bracketed run of digits, spaces and separators is a VALUE — `[18-24]` is an age band and
    // `[1/2/4]` is a schedule. The first version flagged both as unfilled slots. A slot has a WORD
    // in it: `[X days / months]`, `[2-3 sentences]`, `[Feature Name]`.
    '\\[(?![^\\]]*\\]\\()(?=[^\\]]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9 _/-]{2,}\\]',
    '\\{\\{?[a-z][^}]*\\}?\\}',                                                            // {feature}
    '<[a-z][a-z _-]{2,}>',                                                                        // <describe>
    '\\b(?:TBD|TODO|FIXME|XXX)\\b',                                                             // bare markers
    '(?:^|\\|)\\s*\\.{3}\\s*(?:\\||$)',                                                      // a `...` cell
  ].join('|'),
  ''
);

/** Body of the heading matching `headingRe`. Guarded against the ungrouped-alternation trap. */
function section(text, headingRe) {
  if (headingRe.replace(/\([^()]*\)/g, '').includes('|')) {
    throw new Error(`section(): headingRe "${headingRe}" contains an ungrouped alternation. Wrap it: "(?:A|B)".`);
  }
  const lines = String(text).split('\n');
  // `(?:(?:\d+(?:\.\d+)*)[.)]\s*)?` tolerates `## 2. Section`, `## 2.1 Section` and
  // `## Section` alike. Without it the pattern requires the heading text to begin immediately
  // after the markers, and a numbered template — which both templates in this repo are — matches
  // nothing while reporting a clean run.
  const re = new RegExp(`^(\\s*)(#{1,6})\\s*(?:(?:\\d+(?:\\.\\d+)*)[.)]\\s*)?${headingRe}`, 'i');
  let hit = -1;
  let best = 99;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const level = m[2].length;
    if (level >= 2 && level < best) { hit = i; best = level; }
  }
  if (hit === -1) return null;
  const level = lines[hit].match(re)[2].length;
  const body = [];
  for (let j = hit + 1; j < lines.length; j++) {
    const h = lines[j].match(/^(\s*)(#{1,6})\s/);
    if (h && h[2].length <= level) break;
    body.push(lines[j]);
  }
  return body.join('\n');
}

function hasSection(text, re) {
  return String(text)
    .split('\n')
    .some((l) => /^#{1,6}\s/.test(l) && re.test(l.replace(/^#{1,6}\s*/, '').replace(/^\d+(?:\.\d+)*[.)]\s*/, '')));
}

/** Remove fenced blocks so a sample never counts as a real section. */
function unfenced(text) {
  return String(text).replace(/^```[\s\S]*?^```/gm, '\n').replace(/^~~~[\s\S]*?^~~~/gm, '\n');
}

function failClosed(msg, jsonMode) {
  if (jsonMode) process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  else console.error(`✗ analyze_data_check: ${msg}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------------------------

function checkSections(text, spec) {
  const failures = [];
  const notes = [];
  const required = spec.filter((s) => !s[2]);
  const conditional = spec.filter((s) => s[2]);

  const missing = required.filter(([, re]) => !hasSection(text, re)).map(([n]) => n);
  if (missing.length) {
    failures.push(
      `Missing ${missing.length} of the ${required.length} required template sections: ` +
      `${missing.map((n) => `"${n}"`).join(', ')}. The template declares them; an artifact without ` +
      'them has whatever shape its author invented.'
    );
  }

  // A conditional section is never required — but if it is present and empty, it is worse than
  // absent, because it claims the question was answered.
  // CRASH FIXED (blind review, both seats). `section()` guards against an ungrouped alternation by
  // THROWING, and this call passed `re.source` — a bare `a\/?b test|experiment design` — straight in.
  // So the gate threw a stack trace on any artifact containing `## 6. A/B Test Design`,
  // `## 9. ML Model Monitoring` or `## 5. A/B Test Results`: **it failed on maximal conformance**, and
  // on both template files themselves. A guard that turns a caller mistake into a crash is only an
  // improvement when the caller is wrong; here the caller was the gate's own code. The source is now
  // wrapped, and the crash is gone.
  const emptyConditional = conditional
    .filter(([, re]) => hasSection(text, re))
    .filter(([, re]) => {
      const body = section(text, `(?:${re.source})`);
      return body !== null && !body.replace(/[\s\-—–*_]/g, '');
    })
    .map(([n]) => n);
  if (emptyConditional.length) {
    notes.push(
      `${emptyConditional.join(', ')} present but empty. These are "if applicable" sections: absent is ` +
      'fine, empty reads as answered-and-blank.'
    );
  }
  return { failures, notes };
}

function checkPlaceholders(text) {
  const hits = unfenced(text).split('\n')
    .map((l, i) => { const m = l.match(PLACEHOLDER_RE); return m ? { line: i + 1, token: m[0] } : null; })
    .filter(Boolean);
  if (!hits.length) return [];
  return [
    `${hits.length} unfilled template placeholder(s) remain` +
    (hits.length > 3
      ? ` — showing the first 3 of ${hits.length}: ${hits.slice(0, 3).map((h) => `line ${h.line} ${h.token}`).join('; ')}`
      : ` (${hits.map((h) => `line ${h.line} ${h.token}`).join('; ')})`) +
    '. This is still the template, not the artifact.'
  ];
}

// ---------------------------------------------------------------------------------------------
// the dashboard wire
// ---------------------------------------------------------------------------------------------

/**
 * Where the dashboards live. A CLOSED SET plus an escape hatch.
 *
 * A spec for Grafana, Metabase, Looker, Superset, a set of SQL views and a page in your own app are
 * six different documents that share every field below — which is why the template names the target
 * first and this gate requires it. `Query / definition` is PromQL in one and a Metabase question ID
 * in another; an unnamed target cannot be built from, only filed.
 */
const DASHBOARD_TARGETS = ['grafana', 'metabase', 'looker', 'superset', 'in-app', 'sql-only'];

/** The four things every panel row needs, or it is a wish with a title. */
const PANEL_COLUMNS = [
  ['metric', /metric/i],
  ['source', /source/i],
  ['query', /query|definition|computation/i],
  ['chart', /chart|visual|type/i],
];

/**
 * Read a `**Label:** value` field.
 *
 * Two shapes have to work and the first version handled neither: the templates in this repo put the
 * colon INSIDE the bold (`**Target:** value`), and a leading `[-*]` bullet alternative will happily
 * eat one of the two asterisks and leave `\*\*` nothing to match. The bullet now requires trailing
 * whitespace so it cannot consume a `**`, and the colon may sit either side of the closing bold.
 */
function fieldOf(text, labelRe) {
  const lines = String(text).split('\n');
  const re = new RegExp(`^\\s*(?:[-*]\\s+)?\\*\\*\\s*${labelRe}\\s*:?\\s*\\*\\*\\s*:?\\s*(.*)$`, 'i');
  for (const l of lines) {
    const m = l.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

function tableRows(text, headingRe) {
  const body = section(text, headingRe);
  if (!body) return { header: null, rows: [] };
  const rows = body.split('\n').filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l));
  if (!rows.length) return { header: null, rows: [] };
  return { header: rows[0], rows: rows.slice(1) };
}
const cellsOf = (r) => r.split('|').map((c) => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);

/**
 * Rows whose cell count differs from the header's.
 *
 * WHY (blind review, @qa-engineer). A row that drops a cell SHIFTS every column after it, so the
 * values land under the wrong headers and each named column still reads non-empty. Measured: a panel
 * row written `| P1 | Error rate | errors / requests | \`events\` | line | row 1 | @devops-engineer |`
 * — six cells under an eight-column header, with the Query cell missing — passed with **zero
 * failures**, because `Chart` read `line` and `Query` read `` `events` ``. The same shape let a data
 * source row's `Refresh` value answer for its `Access` column.
 *
 * A malformed table cannot be read by column at all, so the honest response is to reject it rather
 * than guess which cell the author meant. A builder reading a shifted row would configure the wrong
 * field, and nothing would say so.
 */
function raggedRows(table) {
  if (!table.header) return [];
  const width = cellsOf(table.header).length;
  return table.rows.filter((r) => {
    const cells = cellsOf(r);
    // A row of all-empty cells is caught by the per-column rules; this is about SHAPE.
    return cells.length !== width && cells.some((c) => c.replace(/[\s`*_\-—–]/g, ''));
  });
}

function checkDashboardSpecs(text) {
  const failures = [];
  const notes = [];
  const body = unfenced(text);
  failures.push(...checkPlaceholders(text));

  // ---- the target ------------------------------------------------------------------------------
  const target = fieldOf(body, 'Target');
  if (!target) {
    failures.push(
      'No `**Target:**`. A dashboard spec that does not name where the dashboard lives cannot be ' +
      `built from — the same field is PromQL in one target and a question ID in another. Declared set: ` +
      `${DASHBOARD_TARGETS.map((x) => `\`${x}\``).join(', ')}, or \`other: <name>\`.`
    );
  } else {
    const norm = target.replace(/[`*]/g, '').trim().toLowerCase();
    const ok = DASHBOARD_TARGETS.some((x) => norm === x || norm.startsWith(`${x} `) || norm.startsWith(`${x}:`))
      || /^other\s*:\s*\S+/i.test(norm);
    if (!ok) {
      failures.push(
        `The target "${target}" is not one of ${DASHBOARD_TARGETS.join(', ')}, and is not \`other: <name>\`. ` +
        'An unrecognized target means no builder can be named and no handoff chosen.'
      );
    }
  }

  // ---- the live object field -------------------------------------------------------------------
  if (!fieldOf(body, 'Live object')) {
    failures.push(
      'No `**Live object:**` field. It may read `not yet built` — that is expected before the work — ' +
      'but a spec with no field for the finished object is a spec that will be lost once it exists.'
    );
  }

  // ---- panels: all four columns, every row -----------------------------------------------------
  const panels = tableRows(body, '(?:Panels?)');
  if (!panels.header) {
    failures.push(
      'No panels table. The panels ARE the spec — without a table there is nothing for a builder to ' +
      'configure, and the file is a description of a dashboard rather than a plan for one.'
    );
  } else {
    const header = cellsOf(panels.header);
    const idx = {};
    for (const [name, re] of PANEL_COLUMNS) {
      const i = header.findIndex((c) => re.test(c));
      if (i === -1) {
        failures.push(
          `The panels table has no "${name}" column (needed: ${PANEL_COLUMNS.map((c) => c[0]).join(', ')}). ` +
          'A panel row missing any of the four is a wish with a title.'
        );
      }
      idx[name] = i;
    }
    const raggedPanels = raggedRows(panels);
    if (raggedPanels.length) {
      const w = cellsOf(panels.header).length;
      failures.push(
        `${raggedPanels.length} panel row(s) have a different cell count from the header ` +
        `(${w} columns). A row that drops a cell shifts every column after it, so the values land ` +
        `under the wrong headers and each named column still reads non-empty — the table cannot be ` +
        `read by column at all. First: "${raggedPanels[0].trim().slice(0, 70)}"`
      );
    }
    if (PANEL_COLUMNS.every(([n]) => idx[n] !== undefined) && !raggedPanels.length) {
      const incomplete = panels.rows.filter((r) => {
        const cells = cellsOf(r);
        return PANEL_COLUMNS.some(([n]) => {
          const c = cells[idx[n]];
          return c === undefined || !c.replace(/[\s`*_\-—–]/g, '');
        });
      });
      if (incomplete.length) {
        const first = incomplete[0];
        const cells = cellsOf(first);
        const missing = PANEL_COLUMNS.filter(([n]) => {
          const c = cells[idx[n]];
          return c === undefined || !c.replace(/[\s`*_\-—–]/g, '');
        }).map(([n]) => n);
        failures.push(
          `${incomplete.length} panel row(s) are not buildable — the first is missing ${missing.join(', ')} ` +
          `("${first.trim().slice(0, 70)}"). Every panel names a metric, a source, a query or definition, ` +
          'and a chart.'
        );
      } else if (!panels.rows.length) {
        failures.push('The panels table has a header and no rows.');
      }
    }
  }

  // ---- alerts when real-time -------------------------------------------------------------------
  // `real time` (space), `realtime` and `real-time` are the same value to any reader; the first
  // version only matched the hyphen and the space-less form, so `Refresh: real time` skipped the
  // alert requirement entirely.
  const refresh = fieldOf(body, 'Refresh').replace(/[`*]/g, '').trim().toLowerCase();
  if (/real[\s-]*time/.test(refresh)) {
    const alerts = tableRows(body, '(?:Alerts?)');
    const nonEmpty = (c) => c !== undefined && Boolean(c.replace(/[\s`*_\-—–]/g, ''));
    const alertRows = alerts.rows.filter((r) => cellsOf(r).some(nonEmpty));
    if (!alertRows.length) {
      failures.push(
        '`Refresh: real-time` with no alert rows. A real-time panel with no threshold is a screen ' +
        'nobody watches — the reason to render a number every second is to be told when it moves.'
      );
    } else if (raggedRows(alerts).length) {
      failures.push(
        `${raggedRows(alerts).length} alert row(s) have a different cell count from the header — a ` +
        'threshold or channel cannot be read from a shifted row.'
      );
    } else if (alerts.header) {
      // A row whose threshold or channel cell is blank names no alert. The first version only asked
      // whether ANY cell was non-empty, so `| P1 |  |  | on-call |` passed on the owner alone.
      const header = cellsOf(alerts.header);
      const thCol = header.findIndex((c) => /threshold|trigger|condition/i.test(c));
      const chCol = header.findIndex((c) => /channel|notify|where/i.test(c));
      if (thCol !== -1 && chCol !== -1) {
        const blank = alertRows.filter((r) => {
          const c = cellsOf(r);
          return !nonEmpty(c[thCol]) || !nonEmpty(c[chCol]);
        });
        if (blank.length) {
          failures.push(
            `${blank.length} alert row(s) name no threshold or no channel. Both are required: a ` +
            'threshold with nowhere to send it is not an alert, and a channel with no threshold has ' +
            'nothing to send.'
          );
        }
      }
    }
  }

  // ---- access named per source -----------------------------------------------------------------
  const sources = tableRows(body, '(?:Data Sources?)');
  if (sources.header && !sources.rows.some((r) => cellsOf(r).some((c) => c.replace(/[\s`*_\-—–]/g, '')))) {
    // A header-only table is the SAME skip as an absent one, one step later. The confirmation review
    // measured it: `| Source | What it is | Access | Refresh |` with zero rows exited 0, so the
    // access rule was skipped by a table that was present and empty. Panels and Alerts already
    // rejected the zero-row shape; this one did not.
    failures.push(
      'The data sources table has a header and no rows. That is the same skip as omitting the ' +
      'section — every source names its access level, and a table with no sources names none.'
    );
  } else if (sources.header && raggedRows(sources).length) {
    failures.push(
      `${raggedRows(sources).length} data source row(s) have a different cell count from the header — ` +
      'an access level cannot be read from a shifted row (measured: a dropped cell let the Refresh ' +
      'value answer for Access).'
    );
  } else if (sources.header) {
    const header = cellsOf(sources.header);
    const accessCol = header.findIndex((c) => /access|permission|role/i.test(c));
    if (accessCol === -1) {
      failures.push(
        'The data sources table has no access column. A spec that does not say who can read the data ' +
        'has not been designed, only drawn.'
      );
    } else {
      const unnamed = sources.rows.filter((r) => {
        const c = cellsOf(r)[accessCol];
        return c === undefined || !c.replace(/[\s`*_\-—–]/g, '');
      });
      if (unnamed.length) {
        failures.push(`${unnamed.length} data source row(s) name no access level.`);
      }
    }
  } else {
    // This was a NOTE, which made the access rule optional: omitting the whole section skipped the
    // check it exists to perform. The template declares the section, so its absence is a failure and
    // the access level is what the rule is for.
    failures.push(
      'No data sources table. The template declares one, and it is where every source names its ' +
      'access level — a spec that does not say who can read the data has not been designed, only drawn.'
    );
  }

  notes.push(
    'NOT CHECKED: whether the target is the right tool for this team, whether the chart chosen is ' +
    'honest for the data shape, whether the query computes what the panel claims, whether the layout ' +
    'is usable, or whether anyone will read it. Those need the builder and the analyst.'
  );
  return { failures, notes };
}

// ---------------------------------------------------------------------------------------------

function checkMeasurementPlan(text) {
  const body = unfenced(text);
  const { failures, notes } = checkSections(body, MEASUREMENT_PLAN_SECTIONS);
  failures.push(...checkPlaceholders(text));

  // The skill's own Mode 2 rule: "Explicit quantitative success benchmarks". A target with no number
  // is a wish, and the template asks for a Target column in three separate tables.
  const metricBody = section(body, '(?:Success Metrics|North Star)');
  if (metricBody) {
    // Any table row with a metric name but a blank target cell. Read as a table, not as prose —
    // this is the one place the skill declares a column, and a column is checkable.
    const rows = metricBody.split('\n').filter((l) => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l));
    const cellsOf = (r) => r.split('|').map((c) => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
    // The TARGET COLUMN is read from the header, not guessed as "the last cell". The first version
    // required every cell after the metric name to be blank, so a `Definition` column rescued a
    // blank `Target` — measured: `| Checkout completion | orders / sessions |  |` passed. The
    // template declares a Target column; finding it by name is reading the template, and guessing
    // by position is reading nothing.
    const headerIdx = rows.findIndex((r) => /target/i.test(r));
    const targetCol = headerIdx === -1 ? -1 : cellsOf(rows[headerIdx]).findIndex((c) => /target/i.test(c));
    const dataRows = rows.slice(headerIdx === -1 ? 1 : headerIdx + 1);
    const blankTargets = targetCol === -1 ? [] : dataRows.filter((r) => {
      const cells = cellsOf(r);
      if (cells.length <= targetCol) return false;
      return !isTargetValue(cells[targetCol]);
    });
    if (blankTargets.length) {
      failures.push(
        `${blankTargets.length} metric row(s) name a metric and no target ("${blankTargets[0].trim().slice(0, 60)}"). ` +
        'Mode 2 requires "explicit quantitative success benchmarks". Write the number, or write why ' +
        'there is not one yet — a blank target cell is a wish with a metric name on it.'
      );
    } else if (!dataRows.length) {
      notes.push('The Success Metrics section has no table rows. If metrics are stated as prose, that is fine — confirm each carries a number.');
    }
  }

  notes.push(
    'RECORDED LIMIT: the target rule rejects a cell with no number and a named time label. The ' +
    'time-label class is open-ended in English — `year-end 2026`, `EOY` and `2nd quarter` are ' +
    'rejected; `by the time we ship` and `after the migration` are not. The rule names a boundary; ' +
    'it does not enumerate every period phrase, and a future rewording will pass it.'
  );
  notes.push(
    'NOT CHECKED: whether the North Star is the right one, whether the event taxonomy covers the ' +
    'funnel, whether the guardrail catches the side effect it is paired with, whether the privacy ' +
    'section reflects the actual data handling, or whether a Goodhart risk was genuinely considered. ' +
    'Those need an analyst.'
  );
  return { failures, notes };
}

function checkInsights(text) {
  const body = unfenced(text);
  const { failures, notes } = checkSections(body, INSIGHTS_SECTIONS);
  failures.push(...checkPlaceholders(text));

  // The skill's own centrepiece: the "So What?" Action Map — Observation, Insight, Action. Three
  // observations is the failure this rule exists to catch: it looks like analysis and decides nothing.
  // Read IN the recommendations section, and require the ACTION specifically.
  //
  // The first version tested for the words anywhere in the document, so a report whose §8 held two
  // observations and whose §1 prose happened to contain "insight" and "action" went green — and one
  // reading "We have no observation, no insight, and no action to take" also went green, because it
  // contains all three words. Lexicon presence is not a decision. The action half is now required,
  // because an observation plus an insight with nothing to do is where analysis usually stops.
  // The map is read as three LABELLED lines with values, not as three words somewhere in a section.
  //
  // Word presence failed twice under review: `Observation:` / `Insight:` / `Action:` with empty
  // values passed, `"Observation: none. Insight: none. Action: none."` passed, and
  // `"The action is pending."` counted as the action half. All three name the label and decide
  // nothing. The template declares the labelled form (`- **Observation:** …`), so requiring a value
  // after each label is reading the template, not guessing at prose.
  const recBody = section(body, '(?:Recommendations|Next Actions?)') || body;
  const LABELS = [
    ['Observation', /^\s*[-*]?\s*\*{0,2}Observation\*{0,2}\s*:\s*(.*)$/im],
    ['Insight', /^\s*[-*]?\s*\*{0,2}Insight\*{0,2}\s*:\s*(.*)$/im],
    ['Action', /^\s*[-*]?\s*\*{0,2}Action\*{0,2}\s*:\s*(.*)$/im],
  ];
  const ABSENT = /^\s*(?:none|n\/?a|nothing|pending|tbd|todo|-+|—+)?\s*[.!]*\s*$/i;
  const missing = [];
  const empty = [];
  for (const [name, re] of LABELS) {
    const m = recBody.match(re);
    if (!m) { missing.push(name); continue; }
    const value = m[1].replace(/[`*_\[\]]/g, ' ').trim();
    if (ABSENT.test(value) || value.split(/\s+/).filter(Boolean).length < 3) empty.push(name);
  }
  if (missing.length) {
    failures.push(
      `The recommendation section is missing ${missing.length} of the three map labels: ` +
      `${missing.map((n) => `\`${n}:\``).join(', ')}. Mode 1 sub-flow 4 declares an ` +
      'Observation -> Insight -> Action map, and the "so what?" test is this skill\'s own centrepiece. ' +
      'The template prints the labelled form.'
    );
  } else if (empty.length) {
    failures.push(
      `${empty.map((n) => `\`${n}\``).join(', ')} carry no value. A label with nothing after it is a ` +
      'heading, not a decision — and "none" / "pending" is an absence, not an answer.'
    );
  }

  notes.push(
    'NOT CHECKED: whether the insight follows from the observation, whether the action follows from ' +
    'the insight, whether the analysis is statistically sound, or whether the chart is honest. Those ' +
    'need an analyst.'
  );
  return { failures, notes };
}

// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kind') args.kind = argv[++i];
    else if (a === '--file') args.file = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

const USAGE = `Usage: node .agents/scripts/analyze_data_check.js check \\
  --kind <measurement-plan|insights|dashboard-specs> --file <artifact.md> [--json]

measurement-plan: artifacts/output/03-strategy/measurement-plan.md
                  Template: .agents/templates/quality/measurement-plan-template.md
                  Required sections, placeholders, and a target number per metric row.

insights:         artifacts/output/07-iteration/analytics-insights.md
                  Template: .agents/templates/quality/analytics-insights-template.md
                  Required sections, placeholders, and an Observation -> Insight -> Action map.

dashboard-specs:  artifacts/output/03-strategy/dashboard-specs.md
                  Template: .agents/templates/quality/dashboard-specs-template.md
                  Declared target, live-object field, buildable panels (metric/source/query/chart),
                  alerts when real-time, and an access level per data source.

Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file || !args.kind) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') failClosed(`unknown command "${cmd}" (expected "check")`, args.json);
  if (!['measurement-plan', 'insights', 'dashboard-specs'].includes(args.kind)) {
    failClosed(`unknown --kind "${args.kind}" (expected measurement-plan, insights or dashboard-specs)`, args.json);
  }

  const file = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(file)) {
    failClosed(`cannot read ${args.file} — a missing analysis artifact is a missing deliverable, never a pass`, args.json);
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) failClosed(`${args.file} is empty`, args.json);

  const { failures, notes } =
    args.kind === 'measurement-plan' ? checkMeasurementPlan(text)
      : args.kind === 'dashboard-specs' ? checkDashboardSpecs(text)
      : checkInsights(text);

  if (args.json) {
    process.stdout.write(
      JSON.stringify(
        {
          exit: failures.length ? 1 : 0,
          kind: args.kind,
          file: args.file,
          notes,
          failures,
          note:
            'That the artifact CONFORMS to its template — sectioned, target-bearing, deciding ' +
            'something — not that the analysis is correct.',
        },
        null,
        2
      ) + '\n'
    );
  } else if (failures.length) {
    console.error(`✗ ${args.kind}: ${failures.length} issue(s) — ${args.file}`);
    for (const f of failures) console.error(`  - ${f}`);
    for (const n of notes) console.error(`  note: ${n}`);
  } else {
    console.log(`✓ ${args.kind}: template conformance and disclosure OK — ${args.file}`);
    for (const n of notes) console.log(`  note: ${n}`);
  }
  process.exit(failures.length ? 1 : 0);
}

if (require.main === module) main();

module.exports = { checkMeasurementPlan, checkInsights, checkDashboardSpecs, MEASUREMENT_PLAN_SECTIONS, INSIGHTS_SECTIONS, DASHBOARD_TARGETS };
