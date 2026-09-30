/**
 * slugify.js — implementation under test (DEV-11 test-writing benchmark).
 * Documented behavior:
 *  - lowercases the input
 *  - trims leading/trailing whitespace
 *  - replaces any run of non-alphanumeric characters with a single hyphen
 *  - collapses consecutive hyphens and strips leading/trailing hyphens
 */
function slugify(text) {
  if (typeof text !== 'string') throw new TypeError('slugify expects a string');
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

module.exports = { slugify };
