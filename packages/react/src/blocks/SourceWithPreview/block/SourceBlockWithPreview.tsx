import { BlockNoteEditor } from "@blocknote/core";
import { MouseEvent, ReactNode } from "react";

import { AddSourceButton } from "../AddSourceButton.js";
import { PreviewWithSourcePopup } from "../PreviewWithSourcePopup.js";
import { useSourceBlockPreviewPopup } from "./useSourceBlockPreviewPopup.js";

export type SourceBlockWithPreviewProps = {
  // Only the ID is needed, so any block type is accepted.
  block: { id: string };
  editor: BlockNoteEditor<any, any, any>;
  contentRef: (node: HTMLElement | null) => void;
  /**
   * The block's source content as plain text. When empty, an "add source"
   * button is shown in place of the preview.
   */
  source: string;
  /**
   * The rendered preview (e.g. a formula or diagram).
   */
  preview: ReactNode;
  /**
   * Error from rendering the preview, shown below the source in the popup.
   * Accepts arbitrary elements, so actions (e.g. a button that fixes the
   * source) can be rendered alongside the error message.
   */
  error?: ReactNode;
};

/**
 * Renders a block as a preview of its source content, with the editable
 * source in a popup - the React counterpart of `createSourceBlockWithPreview`
 * from `@blocknote/core`. The popup is controlled via
 * {@link useSourceBlockPreviewPopup}, so the block's
 * `SourceBlockWithPreviewExtension` must be registered with the block spec.
 * The caller only provides the preview itself, making this the base for
 * custom blocks rendered from source code (math, diagrams, etc).
 */
export const SourceBlockWithPreview = (props: SourceBlockWithPreviewProps) => {
  const { block, editor, contentRef, source, preview, error } = props;

  const popup = useSourceBlockPreviewPopup({ editor, block });

  // Opens the popup when clicking the preview.
  const handlePreviewMouseDown = (event: MouseEvent) => {
    if (!editor.isEditable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    popup.open();
  };

  // Closes the popup when clicking the "OK" button.
  const handleOkButtonMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    popup.close();
  };

  return (
    <PreviewWithSourcePopup
      popupOpen={popup.isOpen}
      selected={popup.isSelected}
      preview={
        source.length > 0 ? (
          preview
        ) : (
          <AddSourceButton
            text={editor.dictionary.code_block.add_source_button_text}
          />
        )
      }
      error={error}
      contentRef={contentRef}
      onPreviewMouseDown={handlePreviewMouseDown}
      onOkMouseDown={handleOkButtonMouseDown}
    />
  );
};
