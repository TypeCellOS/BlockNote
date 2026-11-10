import type { LensBlock } from "../../model.js";

/**
 * Returns the first ID that two blocks of the document have (in document
 * order, also in the children), or `undefined`. The lens pairs the blocks of
 * the documents of a write by ID, thus an ID must identify one block.
 */
export function duplicateId(blocks: readonly LensBlock[]): string | undefined {
  const ids = new Set<string>();
  function visit(list: readonly LensBlock[]): string | undefined {
    for (const block of list) {
      if (ids.has(block.id)) {
        return block.id;
      }
      ids.add(block.id);
      const inner = visit(block.children);
      if (inner !== undefined) {
        return inner;
      }
    }
    return undefined;
  }
  return visit(blocks);
}

/**
 * Throws if a block of the document has no ID, or if two blocks have one ID.
 * The editor gives each block an ID, and the lens pairs blocks by ID. Thus,
 * such a document is a broken invariant for the lens, not an expected
 * failure. `name` names the document in the message (for example "current
 * document" or "base").
 *
 * REVISIT: a Y.Doc can have two blocks with one ID, after two writers moved
 * the same block (y-prosemirror v13). The ID extension of an editor gives
 * the copy a new ID, but it does not write that ID to the Y.Doc. Then the
 * lens cannot write that document until a client fixes the IDs. An earlier
 * version of the lens gave a later block with the ID of an earlier block the
 * ID with a number (`x-2`), on each side of a write. Also, Yjs v14
 * suggestions keep a deleted copy of a block with the same ID (the mark
 * `y-attributed-delete`): such a copy must not count, when the lens
 * supports v14.
 */
export function assertBlockIds(blocks: readonly LensBlock[], name: string) {
  const missing = (list: readonly LensBlock[]): boolean =>
    list.some((block) => !block.id || missing(block.children));
  if (missing(blocks)) {
    throw new Error(
      `A block of the ${name} has no ID. The editor gives each block an ID.`,
    );
  }
  const id = duplicateId(blocks);
  if (id !== undefined) {
    throw new Error(
      `Two blocks of the ${name} have the ID ${id}. The lens pairs blocks by ID.`,
    );
  }
}
