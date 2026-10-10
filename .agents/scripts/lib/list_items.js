/**
 * lib/list_items.js — the one list-item extractor.
 *
 * WHY THIS FILE EXISTS. Two gates needed the same thing: the numbered/bulleted items of a markdown
 * section, with headers, table separators, and checkbox markers filtered out. `research_plan_check.js`
 * carried its own copy; `discovery_canvas_check.js` needed the same extraction for pain ranking and
 * had none, so it reached for a helper that did not exist and died with a ReferenceError at runtime.
 *
 * A ReferenceError is the loud kind of bug, which is the only reason it was caught immediately. The
 * quiet version of this is two subtly different extractors drifting apart, each reporting a different
 * item count for the same document — and a gate whose verdict depends on which copy it called.
 *
 * `items()` returns the CONTENT of each item, with the marker stripped, so callers can match against
 * the text rather than the bullet glyph. It deliberately keeps empty-looking items that had content
 * before filtering, because a section containing only headers is a different situation from one
 * containing items.
 */

'use strict';

/** Headings, table separator rows, and bare checkbox markers are structure, not items. */
function items(text) {
  return String(text == null ? '' : text)
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*+])\s*/, '').trim())
    .filter(Boolean)
    .filter((line) => !/^#{1,6}\s/.test(line))
    .filter((line) => !/^\|[\s:|-]+\|?$/.test(line))
    .filter((line) => !/^\[[ xX]\]\s*/.test(line));
}

module.exports = { items };