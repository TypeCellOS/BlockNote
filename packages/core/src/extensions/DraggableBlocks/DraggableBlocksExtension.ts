import { Editor, Extension } from "@tiptap/core";
import { BlockSideMenuFactory } from "./BlockSideMenuFactoryTypes";
import { createDraggableBlocksPlugin } from "./DraggableBlocksPlugin";

export type DraggableBlocksOptions = {
  editor: Editor;
  blockSideMenuFactory: BlockSideMenuFactory;
};

/**
 * This extension adds a menu to the side of blocks which features various BlockNote functions such as adding and
 * removing blocks. More importantly, it adds a drag handle which allows the user to drag and drop blocks.
 *
 * code based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-506637799
 */
export const DraggableBlocksExtension =
  Extension.create<DraggableBlocksOptions>({
    name: "DraggableBlocksExtension",
    priority: 1000, // Need to be high, in order to hide menu when typing slash
    addProseMirrorPlugins() {
      if (!this.options.blockSideMenuFactory) {
        throw new Error(
          "UI Element factory not defined for DraggableBlocksExtension"
        );
      }
      return [
        createDraggableBlocksPlugin({
          editor: this.editor,
          blockSideMenuFactory: this.options.blockSideMenuFactory,
        }),
      ];
    },
  });
