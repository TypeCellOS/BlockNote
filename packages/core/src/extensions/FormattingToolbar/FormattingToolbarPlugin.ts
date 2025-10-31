import { isNodeSelection, posToDOMRect } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

export const FormattingToolbarExtension = createExtension((editor) => {
  const store = createStore({
    show: false,
    referencePos: null as DOMRect | null,
  });

  let preventShow = false;

  return {
    key: "formattingToolbar",
    store: store,
    plugins: [
      new Plugin({
        key: new PluginKey("formattingToolbar"),
        props: {
          handleKeyDown: (_view, event) => {
            if (event.key === "Escape" && store.state.show) {
              store.setState({ show: false, referencePos: null });
              return true;
            }
            return false;
          },
        },
      }),
    ],
    // TODO should go into core, perhaps `editor.getSelection().getBoundingBox()`
    getSelectionBoundingBox() {
      const { selection } = editor.prosemirrorState;

      // support for CellSelections
      const { ranges } = selection;
      const from = Math.min(...ranges.map((range) => range.$from.pos));
      const to = Math.max(...ranges.map((range) => range.$to.pos));

      if (isNodeSelection(selection)) {
        const node = editor.prosemirrorView.nodeDOM(from) as HTMLElement;
        if (node) {
          return node.getBoundingClientRect();
        }
      }

      return posToDOMRect(editor.prosemirrorView, from, to);
    },
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
          preventShow = true;
        }
      }

      function onMouseUpHandler() {
        if (preventShow) {
          preventShow = false;
          setTimeout(() =>
            store.setState((prev) => ({
              ...prev,
              show: true,
              referencePos: null,
            })),
          );
        }
      }

      function onDragHandler() {
        if (store.state.show) {
          store.setState({ show: false, referencePos: null });
        }
      }

      const onScrollHandler = () => {
        if (store.state.show) {
          store.setState((prev) => ({
            ...prev,
            referencePos: this.getSelectionBoundingBox(),
          }));
        }
      };

      dom.addEventListener("mousedown", onMouseDownHandler);
      dom.addEventListener("mouseup", onMouseUpHandler);
      dom.addEventListener("dragstart", onDragHandler);
      dom.addEventListener("dragover", onDragHandler);
      dom.addEventListener("scroll", onScrollHandler);

      return () => {
        dom.removeEventListener("mousedown", onMouseDownHandler);
        dom.removeEventListener("mouseup", onMouseUpHandler);
        dom.removeEventListener("dragstart", onDragHandler);
        dom.removeEventListener("dragover", onDragHandler);
        dom.removeEventListener("scroll", onScrollHandler);
      };
    },
  } as const;
});
