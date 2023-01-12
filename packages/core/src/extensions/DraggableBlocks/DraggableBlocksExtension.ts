import { Editor, Extension } from "@tiptap/core";
import { BlockMenuFactory } from "./BlockMenuFactoryTypes";
import { createDraggableBlocksPlugin } from "./DraggableBlocksPlugin";

export type DraggableBlocksOptions = {
  editor: Editor;
  blockMenuFactory: BlockMenuFactory;
};

/**
 * This extension adds a drag handle in front of all nodes with a "data-id" attribute
 *
 * code based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-506637799
 */
export const DraggableBlocksExtension =
  Extension.create<DraggableBlocksOptions>({
    name: "DraggableBlocksExtension",
    priority: 1000, // Need to be high, in order to hide draghandle when typing slash
    addProseMirrorPlugins() {
      if (!this.options.blockMenuFactory) {
        console.warn("factories not defined for DraggableBlocksExtension");
        return [];
      }
      return [
        createDraggableBlocksPlugin({
          editor: this.editor,
          blockMenuFactory: this.options.blockMenuFactory,
        }),
      ];
    },
  });
