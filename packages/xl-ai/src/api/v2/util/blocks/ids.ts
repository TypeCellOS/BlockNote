import type { LensBlock } from "../../model.js";

/**
 * The ID for a block whose ID an earlier block has: the ID with a number (for
 * example `a-2`). Each writer computes the same IDs for one document. Thus,
 * the current document, a base of the same Y.Doc, and the JSON of a client
 * that read it agree (see {@link withDistinctIds}).
 */
export function distinctId(id: string, used: ReadonlySet<string>): string {
  if (!used.has(id)) {
    return id;
  }
  for (let n = 2; ; n++) {
    const candidate = `${id}-${n}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }
}

/**
 * The blocks in document order, where a block with the ID of an earlier
 * block gets the ID of {@link distinctId}. The lens applies this rule to each
 * document of a write: the current document, a base, and the JSON of a
 * client. The ProseMirror document gets the same rule (see `makeIdsDistinct`).
 * Thus, a document with two blocks with one ID (for example from a Y.Doc)
 * gives the same IDs on each side.
 */
export function withDistinctIds(blocks: readonly LensBlock[]): LensBlock[] {
  const ids = new Set<string>();
  function fix(block: LensBlock): LensBlock {
    const id = distinctId(block.id, ids);
    ids.add(id);
    return { ...block, id, children: block.children.map(fix) };
  }
  return blocks.map(fix);
}
