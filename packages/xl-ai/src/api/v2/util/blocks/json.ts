/**
 * Helpers that compare block JSON (plain objects, arrays and primitives).
 *
 * Two values are equal if they give the same JSON. A document can come from
 * the editor, or from a store that keeps JSON (for example a version as
 * `base`), and these must compare as the same document. Thus:
 *
 * - An object key with the value `undefined` is the same as no key:
 *   `{ bold: undefined }` is equal to `{}`. JSON drops such a key.
 * - An array item `undefined` is the same as `null`. JSON writes such an
 *   item as `null`. An example is a table without column widths: the editor
 *   gives `columnWidths: [undefined, undefined]`, and a store gives
 *   `[null, null]`. Core reads the two as "no width".
 */

import type { BlockFields } from "../../model.js";

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length &&
      a.every((item, i) => deepEqual(item ?? null, b[i] ?? null))
    );
  }

  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aRecord), ...Object.keys(bRecord)]);
  for (const key of keys) {
    if (!deepEqual(aRecord[key], bRecord[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Returns JSON with sorted object keys and without `undefined` values. Two
 * values of block JSON (which has no `NaN`) give the same string if and only
 * if they are equal for {@link deepEqual}. Use the result as a hash key.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

/** Returns a key of all the data in a block, but not its ID and children. */
export function blockKey(block: BlockFields): string {
  return stableStringify({
    type: block.type,
    props: block.props,
    content: block.content,
  });
}

/** The value with sorted object keys and without `undefined` values (see {@link stableStringify}). */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (record[key] !== undefined) {
        result[key] = canonicalValue(record[key]);
      }
    }
    return result;
  }
  return value;
}
