import { NodeSelection, TextSelection } from "prosemirror-state";

import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

export const FormattingToolbarExtension = createExtension(({ editor }) => {
  const store = createStore(false);

  const shouldShow = () => {
    return editor.transact((tr) => {
      // Don't show if the selection is empty, or is a text selection with no
      // text.
      if (tr.selection.empty) {
        return false;
      }

      // Don't show if a block with inline content is selected.
      if (
        tr.selection instanceof NodeSelection &&
        (tr.selection.node.type.spec.content === "inline*" ||
          tr.selection.node.firstChild?.type.spec.content === "inline*")
      ) {
        return false;
      }

      // Don't show if the selection is a text selection but contains no text.
      if (
        tr.selection instanceof TextSelection &&
        tr.doc.textBetween(tr.selection.from, tr.selection.to).length === 0
      ) {
        return false;
      }

      // Searches the content of the selection to see if it spans a node with a
      // code spec.
      let spansCode = false;
      tr.selection.content().content.descendants((node) => {
        if (node.type.spec.code) {
          spansCode = true;
        }
        return !spansCode; // keep descending if we haven't found a code block
      });

      // Don't show if the selection spans a code block.
      if (spansCode) {
        return false;
      }

      // Show toolbar otherwise.
      return true;
    });
  };

  return {
    key: "formattingToolbar",
    store,
    mount({ dom, signal }) {
      /**
       * We want to mimic the Notion behavior of not showing the toolbar while the user is holding down the mouse button (to create a selection)
       */
      let preventShowWhileMouseDown = false;

      const unsubscribeOnChange = editor.onChange(() => {
        if (preventShowWhileMouseDown) {
          return;
        }
        // re-evaluate whether the toolbar should be shown
        store.setState(shouldShow());
      });
      const unsubscribeOnSelectionChange = editor.onSelectionChange(() => {
        if (preventShowWhileMouseDown) {
          return;
        }
        // re-evaluate whether the toolbar should be shown
        store.setState(shouldShow());
      });

      // To mimic Notion's behavior, we listen to the mouse down event to set the `preventShowWhileMouseDown` flag
      dom.addEventListener(
        "pointerdown",
        () => {
          preventShowWhileMouseDown = true;
          store.setState(false);
        },
        { signal },
      );
      // To mimic Notion's behavior, we listen to the mouse up event to reset the `preventShowWhileMouseDown` flag and show the toolbar (if it should)
      editor.prosemirrorView.root.addEventListener(
        "pointerup",
        () => {
          preventShowWhileMouseDown = false;
          // We only want to re-show the toolbar if the mouse made the selection
          if (editor.isFocused()) {
            store.setState(shouldShow());
          }
        },
        { signal, capture: true },
      );
      // If the pointer gets cancelled, we don't want to be stuck in the `preventShowWhileMouseDown` state
      dom.addEventListener(
        "pointercancel",
        () => {
          preventShowWhileMouseDown = false;
        },
        {
          signal,
          capture: true,
        },
      );

      signal.addEventListener("abort", () => {
        unsubscribeOnChange();
        unsubscribeOnSelectionChange();
      });
    },
  } as const;
});
