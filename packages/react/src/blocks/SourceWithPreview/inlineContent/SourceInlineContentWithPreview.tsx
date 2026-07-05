import { MouseEvent, ReactNode } from "react";

import { ReactCustomInlineContentRenderProps } from "../../../schema/ReactInlineContentSpec.js";
import { AddSourceButton } from "../AddSourceButton.js";
import { PreviewWithSourcePopup } from "../PreviewWithSourcePopup.js";
import { useSourceInlineContentPreviewPopup } from "./useSourceInlineContentPreviewPopup.js";

export type SourceInlineContentWithPreviewProps = Pick<
  ReactCustomInlineContentRenderProps<any, any>,
  "editor" | "contentRef" | "node" | "getPos"
> & {
  /**
   * The inline content's source as plain text. When empty, an "add source"
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
 * Renders inline content as a preview of its source, with the editable source
 * in a popup - the inline counterpart of `SourceBlockWithPreview`. The popup
 * is controlled via {@link useSourceInlineContentPreviewPopup}, so the inline
 * content's `SourceInlineContentWithPreviewExtension` must be registered with
 * the inline content spec. Unlike blocks, the popup is open exactly while the
 * selection is inside the inline content's source, which is the same
 * condition that marks it as selected.
 */
export const SourceInlineContentWithPreview = (
  props: SourceInlineContentWithPreviewProps,
) => {
  const { editor, contentRef, node, getPos, source, preview, error } = props;

  const popup = useSourceInlineContentPreviewPopup({ editor, node, getPos });

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
    if (!editor.isEditable) {
      return;
    }

    event.stopPropagation();

    popup.close();
  };

  return (
    <PreviewWithSourcePopup
      inline
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
