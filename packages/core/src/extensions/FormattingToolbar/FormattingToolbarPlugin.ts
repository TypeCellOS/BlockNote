import { isNodeSelection } from "@tiptap/core";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

export const FormattingToolbarExtension = createExtension((editor) => {
  const store = createStore({ show: false });

  return {
    key: "formattingToolbar",
    store: store,
    init({ dom }) {
      let preventShowWhileMouseDown = false;

      editor.onChange((editor) => {
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
      editor.onSelectionChange((editor) => {
        if (!preventShowWhileMouseDown) {
          store.setState({ show: !editor.prosemirrorState.selection.empty });
        }
      });

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

      dom.addEventListener("mousedown", onMouseDownHandler);
      dom.addEventListener("mouseup", onMouseUpHandler);

      return () => {
        dom.removeEventListener("mousedown", onMouseDownHandler);
        dom.removeEventListener("mouseup", onMouseUpHandler);
      };
    },
  } as const;
});
