import { BlockNoteEditor } from "@blocknote/core";
import { MouseEvent, ReactNode, useId, useRef } from "react";
import { MdKeyboardReturn } from "react-icons/md";

import { PreviewPlaceholder } from "./PreviewPlaceholder.js";
import { SourcePreviewPopup } from "./SourcePreviewPopup.js";

/**
 * Props shared by {@link SourceBlockWithPreview} and
 * {@link SourceInlineContentWithPreview}.
 */
export type SourceWithPreviewProps = {
  /**
   * Ref for the element holding the editable source content.
   */
  contentRef: (node: HTMLElement | null) => void;
  /**
   * The source as plain text. When empty, an "add source" button is shown in
   * place of the preview.
   */
  source: string;
  /**
   * The rendered preview (e.g. a formula or diagram). When the current source
   * has an error, pass the last successfully rendered preview so it stays up
   * while the user edits, or `undefined` when there is none - the error state
   * is shown in its place. The last-good preview only stays up within the
   * editing session that introduced the error: once the popup closes on an
   * erroneous source, the error state shows until the source renders
   * successfully again.
   */
  preview?: ReactNode;
  /**
   * Error from rendering the preview, shown below the source in the popup.
   * Accepts arbitrary elements, so actions (e.g. a button that fixes the
   * source) can be rendered alongside the error message.
   */
  error?: ReactNode;
  /**
   * Shown in place of the preview when the source is empty. A string sets
   * the text of the default "add source" button, while an element replaces
   * the button entirely. Defaults to the editor dictionary's
   * `code_block.add_source_button_text`.
   */
  emptySourcePlaceholder?: ReactNode;
  /**
   * Shown in place of the preview when the source has an error, unless
   * there's a last-good `preview` and the error hasn't been committed yet
   * (the popup hasn't closed since it appeared). A string sets the text of
   * the default compact error state, while an element replaces it entirely.
   * The full `error` is only shown in the popup while editing.
   */
  errorPreview?: ReactNode;
  /**
   * Placeholder shown in the source input popup while the source is empty
   * (e.g. "Enter a LaTeX equation").
   */
  sourcePlaceholder?: string;
};

/**
 * Renders a preview of source content (e.g. math or diagrams), with the
 * editable source in a popup driven by the given popup controller: decides
 * what shows in place of the preview (empty state, last-good preview, or
 * error state) and opens/closes the popup on clicks.
 * `SourceBlockWithPreview` and `SourceInlineContentWithPreview` are thin
 * per-kind wrappers around this, obtaining the popup controller from their
 * respective hooks.
 */
export const SourceWithPreview = (
  props: SourceWithPreviewProps & {
    editor: BlockNoteEditor<any, any, any>;
    popup: SourcePreviewPopup;
    /**
     * Renders with `span` wrappers for inline content.
     */
    inline?: boolean;
    /**
     * Whether pressing Enter in the source popup does what the "OK" button
     * does (closing the popup). Shows the return-key icon on the "OK" button.
     */
    enterSubmits?: boolean;
  },
) => {
  const {
    editor,
    popup,
    inline,
    enterSubmits = true,
    contentRef,
    source,
    preview,
    error,
    emptySourcePlaceholder,
    errorPreview,
    sourcePlaceholder,
  } = props;

  // Whether the error has been "committed": shown while the popup was
  // closed. The last-good preview only stays up within the editing session
  // that introduced the error - once committed, the error state also shows
  // when the popup reopens, until the source renders successfully again.
  // Updated during render (rather than in an effect) so reopening doesn't
  // flash the stale preview for a frame first.
  const errorCommittedRef = useRef(false);
  if (error == null) {
    errorCommittedRef.current = false;
  } else if (!popup.isOpen) {
    errorCommittedRef.current = true;
  }

  // For both placeholder props, a string customizes the default element's
  // text while any other element replaces it entirely.
  const emptyState =
    emptySourcePlaceholder == null ||
    typeof emptySourcePlaceholder === "string" ? (
      <PreviewPlaceholder
        text={
          emptySourcePlaceholder ??
          editor.dictionary.code_block.add_source_button_text
        }
      />
    ) : (
      emptySourcePlaceholder
    );
  const errorState =
    errorPreview == null || typeof errorPreview === "string" ? (
      <PreviewPlaceholder error text={errorPreview ?? "Error"} />
    ) : (
      errorPreview
    );

  // Links the source input to the render error so screen readers announce it
  // when the input is focused.
  const errorId = useId();

  // What to show in place of the source: the empty state, the preview, or -
  // when the source has an error that's committed (or no last-good preview
  // to keep showing) - the error state.
  const previewContent =
    source.length === 0
      ? emptyState
      : error != null && (errorCommittedRef.current || preview == null)
        ? errorState
        : preview;

  // Whether the source is empty and the preview instead shows a button to edit it.
  const previewIsButton =
    editor.isEditable &&
    (source.length === 0 ||
      (error != null && (errorCommittedRef.current || preview == null)));

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

  // `span` wrappers so inline content stays valid inside a paragraph.
  const Wrapper = inline ? "span" : "div";
  const PreviewContainer = inline ? "span" : "div";

  return (
    <Wrapper
      className={
        "bn-preview-with-source-popup" +
        (popup.isSelected ? " ProseMirror-selectednode" : "")
      }
      data-open={popup.isOpen ? "true" : "false"}
    >
      <PreviewContainer
        className="bn-preview-container"
        contentEditable={false}
        // When no source code is available, the "Add source" button should have the appropriate role.
        role={previewIsButton ? "button" : undefined}
        onClick={handlePreviewClick}
      >
        {previewContent}
      </PreviewContainer>
      <div className="bn-source-block-popup">
        <div className="bn-code-block-source-popup-body">
          <pre
            className={
              source.length === 0 && sourcePlaceholder
                ? "bn-code-block-source-popup-input-empty"
                : undefined
            }
            data-placeholder={sourcePlaceholder}
            aria-hidden={popup.isOpen ? undefined : true}
          >
            <code
              ref={contentRef}
              aria-label={sourcePlaceholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
            {inline && source.length === 0 && (
              <br aria-hidden="true" contentEditable={false} />
            )}
          </pre>
          <div
            className="bn-code-block-source-popup-ok-button-wrapper"
            contentEditable={false}
            // Keeps the "OK" button out of the tab order & accessibility tree
            // while the popup is closed (it's only clipped visually, not
            // removed from the DOM).
            inert={!popup.isOpen}
          >
            <button
              // Prevents form submission when the editor is inside a `form`.
              type="button"
              className="bn-code-block-source-popup-ok-button"
              onClick={handleOkButtonClick}
            >
              {editor.dictionary.code_block.ok_button_text}
              {enterSubmits && (
                <MdKeyboardReturn
                  className="bn-code-block-source-popup-ok-button-icon"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>
        <div
          id={errorId}
          className="bn-code-block-source-error"
          contentEditable={false}
          style={{ display: error ? "block" : "none" }}
          // Announced while editing (the popup is open); silenced & removed
          // from the tree once the popup closes, where the compact error
          // preview takes over.
          role="alert"
          inert={!popup.isOpen}
        >
          {error}
        </div>
      </div>
    </Wrapper>
  );
};
