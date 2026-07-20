import { TextSelection, type Transaction } from "prosemirror-state";

import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

/**
 * Determines whether the formatting toolbar should be shown for the selection
 * of the given transaction.
 *
 * Exported for testing.
 */
export function formattingToolbarShouldShow(tr: Transaction): boolean {
  // Don't show if the selection is empty.
  if (tr.selection.empty) {
    return false;
  }

  // Don't show if the selection is a text selection but contains no text.
  if (
    tr.selection instanceof TextSelection &&
    tr.doc.textBetween(tr.selection.from, tr.selection.to).length === 0
  ) {
    return false;
  }

  // Inspects the content of the selection to see whether it spans a node with a
  // code spec (e.g. a code block), and whether it also contains any non-code
  // inline content that the toolbar could actually format.
  let spansCode = false;
  let spansNonCodeInlineContent = false;
  tr.selection.content().content.descendants((node) => {
    if (node.type.spec.code) {
      spansCode = true;
      // No need to descend into code content - it can't be formatted.
      return false;
    }

    if (node.isInline) {
      spansNonCodeInlineContent = true;
    }

    return true;
  });

  // Don't show if the selection is entirely within code, i.e. it spans a code
  // node but has no other formattable inline content. A selection spanning both
  // a code block and regular content (#2865) should still show the toolbar,
  // since the non-code content can be formatted.
  if (spansCode && !spansNonCodeInlineContent) {
    return false;
  }

  // Show toolbar otherwise.
  return true;
}

export const FormattingToolbarExtension = createExtension(({ editor }) => {
  const store = createStore(false);

  const shouldShow = () => {
    return editor.transact((tr) => formattingToolbarShouldShow(tr));
  };

  return {
    key: "formattingToolbar",
    store,
    mount({ dom, signal }) {
      /**
       * We want to mimic the Notion behavior of not showing the toolbar while the user is holding down the mouse button (to create a selection)
       */
      let preventShowWhileMouseDown = false;
      let preventShowWhileDragging = false;

      const unsubscribeOnChange = editor.onChange(() => {
        if (preventShowWhileMouseDown || preventShowWhileDragging) {
          return;
        }
        // re-evaluate whether the toolbar should be shown
        store.setState(shouldShow());
      });
      const unsubscribeOnSelectionChange = editor.onSelectionChange(() => {
        if (preventShowWhileMouseDown || preventShowWhileDragging) {
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
          preventShowWhileMouseDown = true;
        },
        { signal, capture: true },
      );

      editor.prosemirrorView.root.addEventListener(
        "dragstart",
        () => {
          preventShowWhileDragging = true;
          store.setState(false);
        },
        { signal },
      );

      editor.prosemirrorView.root.addEventListener(
        "dragend",
        () => {
          preventShowWhileDragging = false;
        },
        { signal },
      );

      signal.addEventListener("abort", () => {
        unsubscribeOnChange();
        unsubscribeOnSelectionChange();
      });
    },
  } as const;
});
