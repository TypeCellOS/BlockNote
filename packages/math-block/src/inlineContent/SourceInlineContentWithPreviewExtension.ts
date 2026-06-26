import { BlockNoteEditor, createExtension, createStore } from "@blocknote/core";
import { Selection, TextSelection } from "prosemirror-state";

// Whether a Backspace/Delete at `selection` would remove the entire source
// content range `[content.from, content.to)`.
const emptiesSource = (
  selection: Selection,
  key: string,
  content: { from: number; to: number },
) => {
  if (!selection.empty) {
    return selection.from <= content.from && selection.to >= content.to;
  }

  const isSingleChar = content.to - content.from === 1;

  return key === "Backspace"
    ? isSingleChar && selection.from === content.to
    : isSingleChar && selection.from === content.from;
};

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

          // An empty inline node can't hold a text cursor, so ProseMirror can't
          // edit across the empty boundary from the DOM: typing into an empty
          // source inserts next to the node, and deleting the last character
          // leaves an un-reconcilable empty node that freezes the editor. While
          // the popup is open, handle both boundary edits via transactions so
          // the caret stays inside the source.
          if (store.state.popupOpen !== undefined) {
            const pos = store.state.popupOpen;
            const node = view.state.doc.nodeAt(pos);

            if (node?.type.name === inlineContentType) {
              const contentFrom = pos + 1;
              const contentTo = pos + 1 + node.content.size;

              // Empty source: redirect the typed character into the node.
              if (isTypedChar && node.content.size === 0) {
                const tr = view.state.tr.insert(
                  contentFrom,
                  view.state.schema.text(event.key),
                );
                tr.setSelection(
                  TextSelection.create(tr.doc, contentFrom + event.key.length),
                );
                view.dispatch(tr);

                event.preventDefault();
                event.stopImmediatePropagation();
              } else if (
                (event.key === "Backspace" || event.key === "Delete") &&
                node.content.size > 0 &&
                emptiesSource(view.state.selection, event.key, {
                  from: contentFrom,
                  to: contentTo,
                })
              ) {
                // Delete the whole source in one transaction, keeping the now-
                // empty node (and the caret inside it) so it shows the "add
                // source" state and stays editable.
                const tr = view.state.tr.delete(contentFrom, contentTo);
                tr.setSelection(TextSelection.create(tr.doc, contentFrom));
                view.dispatch(tr);

                event.preventDefault();
                event.stopImmediatePropagation();
              }
            }

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
