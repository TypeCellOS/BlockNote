import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey("node-selection-keyboard");
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
export class NodeSelectionKeyboardPlugin extends BlockNoteExtension {
  public static key() {
    return "nodeSelectionKeyboard";
  }

  constructor() {
    super();
    this.addProsemirrorPlugin(
      new Plugin({
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
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.altKey &&
                !event.ctrlKey &&
                !event.metaKey
              ) {
                const tr = view.state.tr;
                view.dispatch(
                  tr
                    .insert(
                      view.state.tr.selection.$to.after(),
                      view.state.schema.nodes["paragraph"].createChecked(),
                    )
                    .setSelection(
                      new TextSelection(
                        tr.doc.resolve(view.state.tr.selection.$to.after() + 1),
                      ),
                    ),
                );

                return true;
              }
            }

            return false;
          },
        },
      }),
    );
  }
}
