import { Link } from "@tiptap/extension-link";
import {
  createHyperlinkMenuPlugin,
  HyperlinkMenuPluginProps,
} from "./HyperlinkMenuPlugin";

/**
 * This custom link includes a special menu for editing/deleting/opening the link.
 * The menu will be triggered by hovering over the link with the mouse,
 * or by moving the cursor inside the link text
 */
const Hyperlink = Link.extend<HyperlinkMenuPluginProps>({
  priority: 500,
  addProseMirrorPlugins() {
    if (!this.options.hyperlinkMenuFactory) {
      console.warn("factories not defined for Hyperlink");
      return [...(this.parent?.() || [])];
    }

    return [
      ...(this.parent?.() || []),
      createHyperlinkMenuPlugin(this.editor, {
        hyperlinkMenuFactory: this.options.hyperlinkMenuFactory,
      }),
    ];
  },
});

export default Hyperlink;
