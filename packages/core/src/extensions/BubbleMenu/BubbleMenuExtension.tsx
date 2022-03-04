import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import ReactDOM from "react-dom";
import { createBubbleMenuPlugin } from "./BubbleMenuPlugin";
import { BubbleMenu } from "./component/BubbleMenu";

export const BubbleMenuExtension = Extension.create<{}>({
  name: "BubbleMenuExtension",

  addProseMirrorPlugins() {
    const element = document.createElement("div");

    ReactDOM.render(<BubbleMenu editor={this.editor} />, element);
    return [
      createBubbleMenuPlugin({
        editor: this.editor,
        element,
        pluginKey: new PluginKey("BubbleMenuPlugin"),
        tippyOptions: {
          appendTo: document.body,
        },
      }),
    ];
  },
});
