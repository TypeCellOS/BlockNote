import type { Transform } from "prosemirror-transform";

import type { LensBlock } from "../blocks/types.js";

/**
 * The ID for a block whose ID an earlier block has: the ID with a number (for
 * example `a-2`). Each writer computes the same IDs for one document. Thus,
 * the current document and a base of the same Y.Doc agree (see
 * {@link withDistinctIds}).
 */
function distinctId(id: string, used: ReadonlySet<string>): string {
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
 * Gives the ID of {@link distinctId} to each block with the ID of an earlier
 * block. Then each ID identifies one block. A document can have two blocks
 * with one ID, for example from a Y.Doc after two writers moved the same
 * block: the ID extension of the editor does not fix a remote change of a
 * Y.Doc.
 *
 * Throws for a block without an ID. The ID extension gives each new block an
 * ID (also in an editor without a view). Thus, such a block is a bug, for
 * example of another client of a Y.Doc.
 *
 * As in the ID extension, a block with the mark `y-attributed-delete` does
 * not count: it is a deleted copy of a block, with the same ID.
 */
export function makeIdsDistinct(tr: Transform): void {
  const ids = new Set<string>();
  tr.doc.descendants((node, pos) => {
    if (
      !node.type.isInGroup("bnBlock") ||
      node.marks.some((mark) => mark.type.name === "y-attributed-delete")
    ) {
      return;
    }
    const own: string | null = node.attrs.id;
    if (!own) {
      throw new Error(
        "A block of the document has no ID. The editor gives each block an ID.",
      );
    }
    const id = distinctId(own, ids);
    ids.add(id);
    if (id !== own) {
      // A change of attributes does not move positions.
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
    }
  });
}

/**
 * The blocks with the ID rule of {@link makeIdsDistinct}, in document order: a
 * block with the ID of an earlier block gets the ID of {@link distinctId}.
 * The lens applies it to a base. Thus, a base with two blocks with one ID
 * agrees with the current document.
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
