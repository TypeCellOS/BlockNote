import { Editor, Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { createBubbleMenuPlugin } from "./BubbleMenuPlugin";

/**
 * The menu that is displayed when selecting a piece of text.
 */
export const BubbleMenuExtension = Extension.create<{
  bubbleMenuFactory: (editor: Editor) => HTMLElement;
}>({
  name: "BubbleMenuExtension",

  addProseMirrorPlugins() {
    return [
      createBubbleMenuPlugin({
        editor: this.editor,
        bubbleMenuFactory: this.editor.options.menus.bubbleMenuFactory,
        pluginKey: new PluginKey("BubbleMenuPlugin"),
      }),
    ];
  },
});
