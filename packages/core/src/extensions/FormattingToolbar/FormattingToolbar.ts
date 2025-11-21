import { isNodeSelection } from "@tiptap/core";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

export const FormattingToolbar = createExtension((editor) => {
  const store = createStore({ show: false });

  return {
    key: "formattingToolbar",
    store: store,
    mount({ dom, signal }) {
      let preventShowWhileMouseDown = false;

      const unsubscribeOnChange = editor.onChange((editor) => {
        // Don't show in code block.
        if (
          editor.prosemirrorState.selection.$from.parent.type.spec.code ||
          (isNodeSelection(editor.prosemirrorState.selection) &&
            editor.prosemirrorState.selection.node.type.spec.code)
        ) {
          return;
        }

        if (!preventShowWhileMouseDown) {
          store.setState({ show: !editor.prosemirrorState.selection.empty });
        }
      });
      const unsubscribeOnSelectionChange = editor.onSelectionChange(
        (editor) => {
          if (!preventShowWhileMouseDown) {
            store.setState({ show: !editor.prosemirrorState.selection.empty });
          }
        },
      );

      function onMouseDownHandler() {
        preventShowWhileMouseDown = true;
        store.setState({ show: false });
      }

      function onMouseUpHandler() {
        preventShowWhileMouseDown = false;

        // Don't show in code block.
        if (
          editor.prosemirrorState.selection.$from.parent.type.spec.code ||
          (isNodeSelection(editor.prosemirrorState.selection) &&
            editor.prosemirrorState.selection.node.type.spec.code)
        ) {
          return;
        }

        store.setState({ show: !editor.prosemirrorState.selection.empty });
      }

      dom.addEventListener("mousedown", onMouseDownHandler, { signal });
      dom.addEventListener("mouseup", onMouseUpHandler, { signal });

      signal.addEventListener("abort", () => {
        unsubscribeOnChange();
        unsubscribeOnSelectionChange();
      });
    },
  } as const;
});
