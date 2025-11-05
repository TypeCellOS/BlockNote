import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

export const FormattingToolbarExtension = createExtension((editor) => {
  const store = createStore({ show: false });

  return {
    key: "formattingToolbar",
    store: store,
    plugins: [
      new Plugin({
        key: new PluginKey("formattingToolbar"),
        props: {
          handleKeyDown: (_view, event) => {
            if (event.key === "Escape" && store.state.show) {
              store.setState({ show: false });
              return true;
            }
            return false;
          },
        },
      }),
    ],
    init({ dom }) {
      const isElementWithinEditorWrapper = (element: Node | null) => {
        if (!element) {
          return false;
        }
        const editorWrapper = dom.parentElement;
        if (!editorWrapper) {
          return false;
        }

        return editorWrapper.contains(element);
      };

      function onMouseDownHandler(e: MouseEvent) {
        if (!isElementWithinEditorWrapper(e.target as Node) || e.button === 0) {
          store.setState({ show: false });
        }
      }

      function onMouseUpHandler() {
        setTimeout(() => {
          if (editor.prosemirrorState.selection.empty) {
            store.setState({ show: false });
          } else {
            store.setState({ show: true });
          }
        }, 1);
      }

      function onDragHandler() {
        if (store.state.show) {
          store.setState({ show: false });
        }
      }

      dom.addEventListener("mousedown", onMouseDownHandler);
      dom.addEventListener("mouseup", onMouseUpHandler);
      dom.addEventListener("dragstart", onDragHandler);
      dom.addEventListener("dragover", onDragHandler);

      return () => {
        dom.removeEventListener("mousedown", onMouseDownHandler);
        dom.removeEventListener("mouseup", onMouseUpHandler);
        dom.removeEventListener("dragstart", onDragHandler);
        dom.removeEventListener("dragover", onDragHandler);
      };
    },
  } as const;
});
