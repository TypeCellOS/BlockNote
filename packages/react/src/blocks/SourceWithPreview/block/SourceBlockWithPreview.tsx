import { MouseEvent, ReactNode } from "react";

import { ReactCustomBlockRenderProps } from "../../../schema/ReactBlockSpec.js";
import { AddSourceButton } from "../AddSourceButton.js";
import { PreviewWithSourcePopup } from "../PreviewWithSourcePopup.js";
import { useSourceBlockPreviewPopup } from "./useSourceBlockPreviewPopup.js";

export type SourceBlockWithPreviewProps = Pick<ReactCustomBlockRenderProps<any>, "block" | "editor"> & {
  // Not picked from `ReactCustomBlockRenderProps` like the props above, as
  // it's conditional on the block's content type there, which TypeScript
  // can't resolve for a generic block config.
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
export const SourceBlockWithPreview = (
  props: SourceBlockWithPreviewProps,
) => {
  const { block, editor, contentRef, source, preview, error } = props;

  const popup = useSourceBlockPreviewPopup({ editor, block });

  // The actions run on click (rather than mousedown), so keyboard &
  // assistive technology activation also works. No mousedown focus guards:
  // React's synthetic `onMouseDown` doesn't fire on node view elements, and
  // testing with real input showed they aren't needed - `open`/`close`
  // restore the editor's focus & selection themselves.

  // Opens the popup when clicking the preview.
  const handlePreviewClick = (event: MouseEvent) => {
    if (!editor.isEditable) {
      return;
    }

    event.stopPropagation();

    popup.open();
  };

  // Closes the popup when clicking the "OK" button.
  const handleOkButtonClick = (event: MouseEvent) => {
    event.stopPropagation();

    popup.close();
  };

  return (
    <PreviewWithSourcePopup
      isOpen={popup.isOpen}
      isSelected={popup.isSelected}
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
      previewContainerProps={{ onClick: handlePreviewClick }}
      okButtonProps={{ onClick: handleOkButtonClick }}
    />
  );
};
