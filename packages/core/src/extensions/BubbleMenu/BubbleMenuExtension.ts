import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { BubbleMenuFactory } from "./BubbleMenuFactoryTypes";
import { createBubbleMenuPlugin } from "./BubbleMenuPlugin";

/**
 * The menu that is displayed when selecting a piece of text.
 */
export const BubbleMenuExtension = Extension.create<{
  bubbleMenuFactory: BubbleMenuFactory;
}>({
  name: "BubbleMenuExtension",

  addProseMirrorPlugins() {
    if (!this.options.bubbleMenuFactory) {
      console.warn("factories not defined for BubbleMenuExtension");
      return [];
    }

    return [
      createBubbleMenuPlugin({
        editor: this.editor,
        bubbleMenuFactory: this.options.bubbleMenuFactory,
        pluginKey: new PluginKey("BubbleMenuPlugin"),
      }),
    ];
  },
});
