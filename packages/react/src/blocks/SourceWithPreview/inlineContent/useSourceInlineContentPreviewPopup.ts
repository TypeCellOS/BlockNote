import {
  BlockNoteEditor,
  SourceInlineContentWithPreviewExtension,
} from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";

import {
  useExtension,
  useExtensionState,
} from "../../../hooks/useExtension.js";
import type { SourcePreviewPopup } from "../SourcePreviewPopup.js";

/**
 * Controls the source popup of inline content with a preview, e.g. to open it
 * from a custom preview element. Unlike a block's, the popup is open exactly
 * while the selection is inside the inline content's source - so `isOpen` and
 * `isSelected` always agree, and `open`/`close` work by moving the selection
 * into/out of the source. The popup state itself is managed by the
 * `SourceInlineContentWithPreviewExtension` registered with the inline
 * content spec (so it survives node view re-creation and stays in sync with
 * the keyboard handling) - this hook is the React API to it.
 */
export const useSourceInlineContentPreviewPopup = (props: {
  editor: BlockNoteEditor<any, any, any>;
  node: { nodeSize: number };
  getPos: () => number | undefined;
}): SourcePreviewPopup => {
  const { editor, node, getPos } = props;

  const { store } = useExtension(SourceInlineContentWithPreviewExtension, {
    editor,
  });

  // `getPos` is called fresh in the selector and actions rather than captured
  // once per render, as the inline content's position can shift without its
  // node view re-rendering. The `undefined` guard matters when rendered
  // outside the editor (i.e. serialized to HTML): there `getPos()` returns
  // `undefined`, which must not match the store's initial `undefined` state.
  const isSelected = useExtensionState(
    SourceInlineContentWithPreviewExtension,
    {
      editor,
      selector: (state) =>
        state.selected !== undefined && state.selected === getPos(),
    },
  );

  // Opens the popup by moving the selection to the end of the source.
  const open = () => {
    if (!editor.isEditable) {
      return;
    }

    const pos = getPos();
    if (!pos) {
      return;
    }

    store.setState({ selected: pos });

    const view = editor.prosemirrorView!;
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.tr.doc, pos + node.nodeSize - 1),
      ),
    );
    editor.focus();
  };

  // Closes the popup by moving the selection to just after the inline
  // content.
  const close = () => {
    if (!editor.isEditable) {
      return;
    }

    const pos = getPos();
    if (!pos) {
      return;
    }

    const view = editor.prosemirrorView!;
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.tr.doc, pos + node.nodeSize),
      ),
    );
    editor.focus();
  };

  // The popup is open exactly when the selection is inside the source, which
  // is the same condition that marks it as selected.
  return { isOpen: isSelected, isSelected, open, close };
};
