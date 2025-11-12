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
