import { BlockNoteEditor, createExtension, createStore } from "@blocknote/core";
import { Selection } from "prosemirror-state";

/**
 * Inline-content counterpart of {@link SourceBlockWithPreviewExtension}. Drives
 * the source popup for inline content with a preview.
 *
 * Unlike the block version, the popup isn't toggled with a separate state flag:
 * it's open exactly when the selection is inside the inline content's source.
 * The store therefore only tracks which inline content (by its position) holds
 * the selection - moving the selection in opens its popup, moving it out closes
 * it. Since the source popup is always laid out (just hidden via opacity), the
 * cursor can navigate into and out of it with the arrow keys as usual.
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
      selected: number | undefined;
    }>({
      selected: undefined,
    });

    // Moves the selection out of (just after) the inline content, which closes
    // the popup via the selection-change handler below. Lets the keyboard
    // commit-and-exit the source the same way arrowing past its end does, and
    // keeps Enter from splitting the block while editing the source.
    const moveSelectionOut = ({
      editor,
    }: {
      editor: BlockNoteEditor<any, any, any>;
    }) => {
      const { $from } = editor.prosemirrorState.selection;
      const node = $from.node();
      if (node.type.name !== inlineContentType) {
        return false;
      }

      const view = editor.prosemirrorView!;
      const selection = Selection.near(
        view.state.doc.resolve($from.after()),
        1,
      );
      view.dispatch(view.state.tr.setSelection(selection));

      return true;
    };

    return {
      key,
      store,
      runsBefore,
      keyboardShortcuts: {
        Enter: moveSelectionOut,
        Escape: moveSelectionOut,
      },
      mount: ({ signal }) => {
        // The popup is open exactly when the selection is inside the inline
        // content, so we just track which inline content (if any) holds it.
        const unsubscribeSelectionChange = editor.onSelectionChange(() => {
          const { $from } = editor.prosemirrorState.selection;
          const node = $from.node();

          store.setState({
            selected:
              node.type.name === inlineContentType ? $from.before() : undefined,
          });
        });
        signal.addEventListener("abort", unsubscribeSelectionChange);
      },
    };
  },
);
