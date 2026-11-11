/**
 * Helpers that compare block JSON (plain objects, arrays and primitives).
 *
 * An object key with the value `undefined` is the same as no key. Thus,
 * `{ bold: undefined }` is equal to `{}`. Block JSON uses the two forms for
 * "not set".
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
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
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
 * Returns JSON with sorted object keys and without `undefined` values. Values
 * that are equal for {@link deepEqual} give the same string. Use the result as
 * a hash key.
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
