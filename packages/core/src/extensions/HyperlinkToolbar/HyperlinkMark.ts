import { Link } from "@tiptap/extension-link";
import {
  createHyperlinkToolbarPlugin,
  HyperlinkToolbarPluginProps,
} from "./HyperlinkToolbarPlugin";

/**
 * This custom link includes a special menu for editing/deleting/opening the link.
 * The menu will be triggered by hovering over the link with the mouse,
 * or by moving the cursor inside the link text
 */
const Hyperlink = Link.extend<HyperlinkToolbarPluginProps>({
  priority: 500,
  addProseMirrorPlugins() {
    if (!this.options.hyperlinkToolbarFactory) {
      throw new Error("UI Element factory not defined for HyperlinkMark");
    }

    return [
      ...(this.parent?.() || []),
      createHyperlinkToolbarPlugin(this.editor, {
        hyperlinkToolbarFactory: this.options.hyperlinkToolbarFactory,
      }),
    ];
  },
});

export default Hyperlink;
