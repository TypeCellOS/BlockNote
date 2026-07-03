import {
  BlockNoteEditor,
  SourceBlockWithPreviewExtension,
} from "@blocknote/core";

import {
  useExtension,
  useExtensionState,
} from "../../../hooks/useExtension.js";
import type { SourcePreviewPopup } from "../SourcePreviewPopup.js";

/**
 * Controls the source popup of a block with a preview, e.g. to open it from a
 * custom preview element. A block's popup is toggled explicitly - `open` and
 * `close` set a flag, separate from the selection. The popup state itself is
 * managed by the `SourceBlockWithPreviewExtension` registered with the block
 * spec (so it survives node view re-creation and stays in sync with the
 * keyboard handling) - this hook is the React API to it.
 */
export const useSourceBlockPreviewPopup = (props: {
  editor: BlockNoteEditor<any, any, any>;
  block: { id: string };
}): SourcePreviewPopup => {
  const { editor, block } = props;

  const { store } = useExtension(SourceBlockWithPreviewExtension, { editor });

  const isOpen = useExtensionState(SourceBlockWithPreviewExtension, {
    editor,
    selector: (state) => state.popupOpen === block.id,
  });
  const isSelected = useExtensionState(SourceBlockWithPreviewExtension, {
    editor,
    selector: (state) => state.selected === block.id,
  });

  // Opens the popup with the cursor at the end of the source.
  const open = () => {
    if (!editor.isEditable) {
      return;
    }

    store.setState((state) => ({ ...state, popupOpen: block.id }));
    editor.setTextCursorPosition(block.id, "end");
    editor.focus();
  };

  const close = () => {
    store.setState((state) => ({ ...state, popupOpen: undefined }));
  };

  return { isOpen, isSelected, open, close };
};
