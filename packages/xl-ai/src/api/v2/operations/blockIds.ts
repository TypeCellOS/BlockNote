import { UniqueID } from "@blocknote/core/extensions";
import type { Transform } from "prosemirror-transform";

/**
 * Gives a new ID to each block without an ID. ProseMirror can make such
 * blocks, for example when it fills a group that became empty. In an editor,
 * the UniqueID extension does this. A transaction without an editor (for
 * example on a Y.Doc) needs this function.
 */
export function addMissingBlockIds(tr: Transform): void {
  const doc = tr.doc;
  doc.descendants((node, pos) => {
    if (node.type.isInGroup("bnBlock") && !node.attrs.id) {
      // A change of attributes does not move positions.
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        id: UniqueID.options.generateID(),
      });
    }
  });
}
