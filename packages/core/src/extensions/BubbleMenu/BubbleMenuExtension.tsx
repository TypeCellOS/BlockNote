import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { createBubbleMenuPlugin } from "./BubbleMenuPlugin";
import { BubbleMenuFactory } from "../../menu-tools/BubbleMenu/types";

/**
 * The menu that is displayed when selecting a piece of text.
 */
export const BubbleMenuExtension = Extension.create<{
  bubbleMenuFactory: BubbleMenuFactory;
}>({
  name: "BubbleMenuExtension",

  addProseMirrorPlugins() {
    return [
      createBubbleMenuPlugin({
        editor: this.editor,
        bubbleMenuFactory: this.options.bubbleMenuFactory,
        pluginKey: new PluginKey("BubbleMenuPlugin"),
      }),
    ];
  },
});
