import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

const PLUGIN_KEY = new PluginKey("non-editable-block");
// By default, typing with a node selection active will cause ProseMirror to
// replace the node with one that contains editable content. This plugin blocks
// this behaviour without also blocking things like keyboard shortcuts:
//
// - Lets through key presses that do not include alphanumeric characters. This
// includes things like backspace/delete/home/end/etc.
// - Lets through any key presses that include ctrl/meta keys. These will be
// shortcuts of some kind like ctrl+C/mod+C.
// - Special case for Enter key which creates a new paragraph block below and
// sets the selection to it. This is just to bring the UX closer to Notion
//
// While a more elegant solution would probably process transactions instead of
// keystrokes, this brings us most of the way to Notion's UX without much added
// complexity.
export const NonEditableBlockPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    props: {
      handleKeyDown: (view, event) => {
        // Checks for node selection
        if ("node" in view.state.selection) {
          // Checks if key press uses ctrl/meta modifier
          if (event.ctrlKey || event.metaKey) {
            return false;
          }
          // Checks if key press is alphanumeric
          if (event.key.length === 1) {
            event.preventDefault();

            return true;
          }
          // Checks if key press is Enter
          if (event.key === "Enter") {
            // Kind of a hacky way to ensure that pressing Enter when a file
            // block is showing the add file button will open the file panel.
            // Here, we just make the Enter handler skip this case and the file
            // block's implementation will have to handle it itself. It would be
            // cleaner if both handlers were in the same place, however:
            // - This plugin takes precedence over handlers in the file block's
            // implementation, so we can't override the behaviour there.
            // - This plugin has no access to the BN schema, so it can't convert
            // the node to a block for the file panel plugin, and therefore
            // can't open the file plugin here.
            let blockContentDOM = view.domAtPos(view.state.selection.from)
              .node as HTMLElement;
            while (!blockContentDOM.className.includes("bn-block-content")) {
              blockContentDOM = blockContentDOM.firstChild as HTMLElement;
            }

            const isFileBlock =
              blockContentDOM.getAttribute("data-file-block") !== null;
            const hasURL = blockContentDOM.getAttribute("data-url") !== null;

            if (isFileBlock && !hasURL) {
              return false;
            }

            const tr = view.state.tr;
            view.dispatch(
              tr
                .insert(
                  view.state.tr.selection.$to.after(),
                  view.state.schema.nodes["paragraph"].create()
                )
                .setSelection(
                  new TextSelection(
                    tr.doc.resolve(view.state.tr.selection.$to.after() + 1)
                  )
                )
            );

            return true;
          }
        }

        return false;
      },
    },
  });
};
