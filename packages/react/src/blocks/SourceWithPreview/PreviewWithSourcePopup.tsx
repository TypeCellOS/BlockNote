import { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export type PreviewWithSourcePopupProps = {
  /**
   * Renders with `span` wrappers so the shell can be used for inline content.
   * Defaults to `false`, which renders with `div` wrappers for blocks.
   */
  inline?: boolean;
  /**
   * Whether the source popup is shown.
   */
  isOpen: boolean;
  /**
   * Whether the preview is highlighted as selected.
   */
  isSelected: boolean;
  /**
   * The rendered preview (e.g. a formula or diagram). Rendered inside a
   * non-editable container that opens the source popup on click.
   */
  preview: ReactNode;
  /**
   * Error from rendering the preview, shown below the source in the popup.
   * Accepts arbitrary elements, so actions (e.g. a button that fixes the
   * source) can be rendered alongside the error message.
   */
  error?: ReactNode;
  /**
   * Ref for the element holding the editable source content.
   */
  contentRef: (node: HTMLElement | null) => void;
  /**
   * Additional props for the preview container, e.g. a mouse handler that
   * opens the popup. `className` is merged with the container's own, and
   * `contentEditable` can't be overridden.
   */
  previewContainerProps?: HTMLAttributes<HTMLElement>;
  /**
   * Additional props for the "OK" button, e.g. a mouse handler that closes
   * the popup. `className` is merged with the button's own.
   */
  okButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
};

/**
 * Presentational shell for blocks & inline content that render a preview of
 * their source content (e.g. math or diagrams): shows the preview, with the
 * editable source in a popup. Purely visual - opening/closing the popup and
 * keyboard handling are driven by the caller, typically via
 * `useSourceBlockPreviewPopup`/`useSourceInlineContentPreviewPopup` (see
 * `SourceBlockWithPreview` and `SourceInlineContentWithPreview`).
 */
export const PreviewWithSourcePopup = (props: PreviewWithSourcePopupProps) => {
  const Wrapper = props.inline ? "span" : "div";
  const PreviewContainer = props.inline ? "span" : "div";

  return (
    <Wrapper
      className={
        "bn-preview-with-source-popup" +
        (props.isSelected ? " ProseMirror-selectednode" : "")
      }
      data-open={props.isOpen ? "true" : "false"}
    >
      <PreviewContainer
        {...props.previewContainerProps}
        className={
          "bn-preview-container" +
          (props.previewContainerProps?.className
            ? " " + props.previewContainerProps.className
            : "")
        }
        contentEditable={false}
      >
        {props.preview}
      </PreviewContainer>
      <div className="bn-source-block-popup">
        <div className="bn-code-block-source-popup-body">
          <pre>
            <code ref={props.contentRef} />
          </pre>
          <div
            className="bn-code-block-source-popup-ok-button-wrapper"
            contentEditable={false}
          >
            <button
              // Prevents form submission when the editor is inside a `form`.
              type="button"
              {...props.okButtonProps}
              className={
                "bn-code-block-source-popup-ok-button" +
                (props.okButtonProps?.className
                  ? " " + props.okButtonProps.className
                  : "")
              }
            >
              OK
            </button>
          </div>
        </div>
        <div
          className="bn-code-block-source-error"
          contentEditable={false}
          style={{ display: props.error ? "block" : "none" }}
        >
          {props.error}
        </div>
      </div>
    </Wrapper>
  );
};
