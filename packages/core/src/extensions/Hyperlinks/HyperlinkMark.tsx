import { Link } from "@tiptap/extension-link";
import { createHyperlinkMenuPlugin } from "./HyperlinkMenuPlugin";

/**
 * This custom link includes a special menu for editing/deleting/opening the link.
 * The menu will be triggered by hovering over the link with the mouse,
 * or by moving the cursor inside the link text
 */
const Hyperlink = Link.extend({
  priority: 500,
  addProseMirrorPlugins() {
    return [...(this.parent?.() || []), createHyperlinkMenuPlugin()];
  },
});

export default Hyperlink;
