import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";
import { TextSelection } from "prosemirror-state";

export const FormattingToolbar = createExtension((editor) => {
  const store = createStore(false);

  const shouldShow = () => {
    return editor.transact((tr) => {
      // if the selection is empty, or not a text selection, we should not show the toolbar
      if (tr.selection.empty || !(tr.selection instanceof TextSelection)) {
        return false;
      }

      // We don't want to show the toolbar if the selection has code in it
      let spansCode = false;
      // search the content of the selection to see if it ever spans a node with a code spec
      tr.selection.content().content.descendants((node) => {
        if (node.type.spec.code) {
          spansCode = true;
        }
        return !spansCode; // keep descending if we haven't found a code block
      });

      // if the selection is in a code block, we should not show the toolbar
      if (spansCode) {
        return false;
      }

      // otherwise, we should show the toolbar at the current selection
      return true;
    });
  };

  return {
    key: "formattingToolbar",
    store: store,
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
