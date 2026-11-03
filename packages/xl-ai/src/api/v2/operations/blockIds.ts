import { UniqueID } from "@blocknote/core/extensions";
import type { Transform } from "prosemirror-transform";

/**
 * Gives a new ID to each block without an ID, and to each block with the ID
 * of an earlier block. Then each ID identifies one block. ProseMirror can
 * make a block without an ID, for example when it fills a group that became
 * empty. A document can have two blocks with one ID, for example from a
 * Y.Doc after two writers moved the same block. In an editor, the UniqueID
 * extension does this, but not for a transaction without an editor (for
 * example on a Y.Doc), and not for a remote change of a Y.Doc.
 *
 * As in the UniqueID extension, a block with the mark `y-attributed-delete`
 * does not count: it is a deleted copy of a block, with the same ID.
 */
export function fixBlockIds(tr: Transform): void {
  const ids = new Set<unknown>();
  tr.doc.descendants((node, pos) => {
    if (
      !node.type.isInGroup("bnBlock") ||
      node.marks.some((mark) => mark.type.name === "y-attributed-delete")
    ) {
      return;
    }
    if (node.attrs.id && !ids.has(node.attrs.id)) {
      ids.add(node.attrs.id);
      return;
    }
    // A change of attributes does not move positions.
    const id = UniqueID.options.generateID();
    ids.add(id);
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
  });
}
