import { Plugin, PluginKey } from "prosemirror-state";

const PLUGIN_KEY = new PluginKey("non-editable-block");
// Prevent typing for blocks without inline content, as this would otherwise
// convert them into paragraph blocks.
// TODO: This implementation misses a lot of edge cases, e.g. inserting emojis
//  and special characters on international keyboards (e.g. "ś" which is Alt-S
//  on the Polish keyboard). A more robust approach would be to filter out
//  transactions in which a no content block is selected before, and replaced
//  with a paragraph block after (will likely need additional filtering e.g. to
//  not filter out `updateBlock` calls).
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
            (event.key.length === 1 || event.key === "Enter") &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
          ) {
            event.preventDefault();

            return true;
          }
        }

        return false;
      },
    },
  });
};
