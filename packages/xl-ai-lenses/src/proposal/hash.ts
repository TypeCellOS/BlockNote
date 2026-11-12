import type { LensBlock } from "@blocknote/xl-ai/text-lens";

/**
 * A short hash of a document. Two hosts that apply the same batches to the
 * same origin get the same hash. A different hash shows that the documents
 * are different, for example because each host gave a block of the schema
 * fill its own ID.
 *
 * The hash is not for security. The method is cyrb53 (a public-domain 53-bit
 * string hash) on the JSON of the blocks, with the keys in order.
 */
export function hashDocument(blocks: readonly LensBlock[]): string {
  return cyrb53(stableStringify(blocks)).toString(36);
}

/** JSON with the keys of each object in order, and without `undefined` values. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    // JSON has no `undefined`: an array keeps the position as `null`.
    return `[${value.map((item) => stableStringify(item ?? null)).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function cyrb53(text: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
