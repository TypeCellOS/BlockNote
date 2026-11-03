import { UniqueID } from "@blocknote/core/extensions";
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
 * Gives a new ID to each block without an ID, and the ID of
 * {@link distinctId} to each block with the ID of an earlier block. Then each
 * ID identifies one block. ProseMirror can make a block without an ID, for
 * example when it fills a group that became empty. A document can have two
 * blocks with one ID, for example from a Y.Doc after two writers moved the
 * same block. In an editor, the UniqueID extension does this, but not for a
 * transaction without an editor (for example on a Y.Doc), and not for a
 * remote change of a Y.Doc.
 *
 * As in the UniqueID extension, a block with the mark `y-attributed-delete`
 * does not count: it is a deleted copy of a block, with the same ID.
 */
export function fixBlockIds(tr: Transform): void {
  const ids = new Set<string>();
  tr.doc.descendants((node, pos) => {
    if (
      !node.type.isInGroup("bnBlock") ||
      node.marks.some((mark) => mark.type.name === "y-attributed-delete")
    ) {
      return;
    }
    const own: string | null = node.attrs.id;
    const id = own ? distinctId(own, ids) : UniqueID.options.generateID();
    ids.add(id);
    if (id !== own) {
      // A change of attributes does not move positions.
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
    }
  });
}

/**
 * The blocks with the ID rule of {@link fixBlockIds}, in document order: a
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
