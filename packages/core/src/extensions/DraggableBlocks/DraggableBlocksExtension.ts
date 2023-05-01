import { Editor, Extension } from "@tiptap/core";
import { BlockSideMenuFactory } from "./BlockSideMenuFactoryTypes";
import { createDraggableBlocksPlugin } from "./DraggableBlocksPlugin";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";

export type DraggableBlocksOptions<BSchema extends BlockSchema> = {
  tiptapEditor: Editor;
  editor: BlockNoteEditor<BSchema>;
  blockSideMenuFactory: BlockSideMenuFactory<BSchema>;
};

/**
 * This extension adds a menu to the side of blocks which features various BlockNote functions such as adding and
 * removing blocks. More importantly, it adds a drag handle which allows the user to drag and drop blocks.
 *
 * code based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-506637799
 */
export const createDraggableBlocksExtension = <BSchema extends BlockSchema>() =>
  Extension.create<DraggableBlocksOptions<BSchema>>({
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
          tiptapEditor: this.editor,
          editor: this.options.editor,
          blockSideMenuFactory: this.options.blockSideMenuFactory,
        }),
      ];
    },
  });
