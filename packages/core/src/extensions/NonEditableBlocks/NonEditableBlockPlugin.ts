import { Plugin, PluginKey } from "prosemirror-state";

const PLUGIN_KEY = new PluginKey("non-editable-block");
// Prevent typing for blocks without inline content, as this would otherwise
// convert them into paragraph blocks.
export const NonEditableBlockPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    props: {
      handleKeyDown: (view, event) => {
        if ("node" in view.state.selection) {
          event.preventDefault();
        }
      },
    },
  });
};
