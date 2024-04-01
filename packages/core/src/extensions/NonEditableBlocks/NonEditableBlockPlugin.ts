import { Plugin, PluginKey } from "prosemirror-state";

const PLUGIN_KEY = new PluginKey("non-editable-block");
// Prevent typing for blocks without inline content, as this would otherwise
// convert them into paragraph blocks.
export const NonEditableBlockPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    props: {
      handleKeyDown: (view, event) => {
        // Checks for node selection
        if ("node" in view.state.selection) {
          // Checks if key input will insert a character - we want to block this
          // as it will convert the block into a paragraph.
          if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.shiftKey
          ) {
            event.preventDefault();
          }
        }
      },
    },
  });
};
