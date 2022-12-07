import { Extension } from "@tiptap/core";
import { createDraggableBlocksPlugin } from "./DraggableBlocksPlugin";

/**
 * This extension adds a drag handle in front of all nodes with a "data-id" attribute
 *
 * code based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-506637799
 */
export const DraggableBlocksExtension = Extension.create<{}>({
  name: "DraggableBlocksExtension",
  priority: 1000, // Need to be high, in order to hide draghandle when typing slash
  addProseMirrorPlugins() {
    return [createDraggableBlocksPlugin(this.editor)];
  },
});
