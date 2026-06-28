import { BlockNoteEditor, createExtension, createStore } from "@blocknote/core";
import { Selection, TextSelection } from "prosemirror-state";

/**
 * Inline-content counterpart of {@link SourceBlockWithPreviewExtension}. Drives
 * the source popup for inline content with a preview: toggling it with the
 * keyboard, navigating out of the (hidden) source, and preventing edits to it
 * while it's hidden.
 *
 * Unlike the block version, its store holds a single `open` flag rather than a
 * block ID - at most one inline content can hold the cursor, and the render
 * component decides whether the open popup is its own by checking if the cursor
 * is inside its source.
 */
export const SourceInlineContentWithPreviewExtension = createExtension(
  ({
    editor,
    options: { key, inlineContentType, runsBefore = [] },
  }: {
    editor: BlockNoteEditor<any, any, any>;
    options: {
      key: string;
      inlineContentType: string;
      runsBefore?: readonly string[];
    };
  }) => {
    const store = createStore<{
      popupOpen: number | undefined;
      selected: number | undefined;
    }>({
      popupOpen: undefined,
      selected: undefined,
    });

    const handleArrow =
      (direction: "before" | "after") =>
      ({ editor }: { editor: BlockNoteEditor<any, any, any> }) => {
        if (store.state.popupOpen) {
          return false;
        }

        const { $from } = editor.prosemirrorState.selection;
        const node = $from.node();
        if (node.type.name !== inlineContentType) {
          return false;
        }

        const view = editor.prosemirrorView!;
        const target = direction === "before" ? $from.before() : $from.after();
        const selection = Selection.near(
          view.state.doc.resolve(target),
          direction === "before" ? -1 : 1,
        );

        view.dispatch(view.state.tr.setSelection(selection));

        return true;
      };

    return {
      key,
      store,
      runsBefore,
      keyboardShortcuts: {
        // Toggles the popup.
        Enter: ({ editor }) => {
          const { $from } = editor.prosemirrorState.selection;
          const node = $from.node();
          if (node.type.name !== inlineContentType) {
            return false;
          }

          const view = editor.prosemirrorView!;
          view.dispatch(
            view.state.tr.setSelection(
              TextSelection.create(view.state.tr.doc, $from.end()),
            ),
          );

          store.setState((state) => ({
            ...state,
            popupOpen: state.popupOpen ? undefined : $from.before(),
          }));

          return true;
        },
        // Closes the popup.
        Escape: ({ editor }) => {
          const { $from } = editor.prosemirrorState.selection;
          const node = $from.node();
          if (node.type.name !== inlineContentType) {
            return false;
          }

          const view = editor.prosemirrorView!;
          view.dispatch(
            view.state.tr.setSelection(
              TextSelection.create(view.state.tr.doc, $from.end()),
            ),
          );

          store.setState((state) => ({ ...state, popupOpen: undefined }));

          return true;
        },
        // While the popup is closed, moves the selection straight out of the inline
        // content rather than navigating its hidden source.
        ArrowUp: handleArrow("before"),
        ArrowLeft: handleArrow("before"),
        ArrowDown: handleArrow("after"),
        ArrowRight: handleArrow("after"),
      },
      mount: ({ dom, signal }) => {
        const unsubscribeSelectionChange = editor.onSelectionChange(() => {
          const { $from } = editor.prosemirrorState.selection;
          const node = $from.node();
          const before = $from.before();

          store.setState((state) => ({
            selected: node.type.name === inlineContentType ? before : undefined,
            popupOpen:
              state.popupOpen && state.popupOpen !== before
                ? undefined
                : state.popupOpen,
          }));
        });
        signal.addEventListener("abort", unsubscribeSelectionChange);

        const handleKeyDown = (event: KeyboardEvent) => {
          const view = editor.prosemirrorView;
          if (!editor.isEditable || !view) {
            return;
          }

          const isTypedChar =
            event.key.length === 1 && !event.ctrlKey && !event.metaKey;

          // While the popup is open, the source is shown and editable, so edits
          // are let through. Boundary edits on the (possibly empty) source - an
          // empty inline node can't hold a text cursor, so typing/deleting at
          // the boundary needs special handling - are handled generically by the
          // editor's `InlineContentBoundaryEdit` extension.
          if (store.state.popupOpen !== undefined) {
            return;
          }

          // While the popup is closed, prevents editing of the (hidden) source.
          // Handled here rather than in `keyboardShortcuts` as it needs to match
          // any text-input key, which a keymap can't express.
          if (
            editor.prosemirrorState.selection.$from.node().type.name !==
            inlineContentType
          ) {
            return;
          }

          if (
            isTypedChar ||
            event.key === "Backspace" ||
            event.key === "Delete" ||
            event.key === "Tab"
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        };
        dom.addEventListener("keydown", handleKeyDown, {
          capture: true,
          signal,
        });
      },
    };
  },
);
