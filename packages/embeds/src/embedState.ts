import type { BlockNoteEditor } from "@blocknote/core";
import type { EmbedsBlockSchema } from "./types.js";

export type DocumentNode =
  BlockNoteEditor<EmbedsBlockSchema>["prosemirrorState"]["doc"];
export type EmbedState = {
  candidate?: {
    blockId: string;
    url: string;
    node: DocumentNode;
    selection: number;
  };
  pending?: string;
  announcement?: { blockId: string; text: string };
};

/** Capture/compare the whole target subtree, including children. */
export function blockNode(doc: DocumentNode, id: string) {
  let found: DocumentNode | undefined;
  doc.descendants((node) => {
    if (node.attrs.id === id) {
      found = node;
      return false;
    }
    return !found;
  });
  return found;
}
