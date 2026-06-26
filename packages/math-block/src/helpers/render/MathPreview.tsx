import { SourceBlockWithPreviewExtension } from "@blocknote/core";
import {
  ReactCustomBlockRenderProps,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { MouseEvent, useEffect, useRef } from "react";
import type { MathBlockConfig } from "../../block.js";
import { getMathSource } from "../getMathSource.js";
import { useKatexPreview } from "./useKatexPreview.js";

// Shown in place of the preview when the math content has no source yet.
export const AddSourceButton = (props: { text: string }) => (
  <div className="bn-add-source-code-button" contentEditable={false}>
    <div className="bn-add-source-code-button-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M24 12l-5.657 5.657-1.414-1.414L21.172 12l-4.243-4.243 1.414-1.414L24 12zM2.828 12l4.243 4.243-1.414 1.414L0 12l5.657-5.657 1.414 1.414L2.828 12z"></path>
      </svg>
    </div>
    <p className="bn-add-source-code-button-text">{props.text}</p>
  </div>
);

export const MathPreview = (
  props: ReactCustomBlockRenderProps<MathBlockConfig>,
) => {
  const { block, editor, contentRef } = props;

  const source = getMathSource(block);

  const { store } = useExtension(SourceBlockWithPreviewExtension, { editor });
  const popupOpen = useExtensionState(SourceBlockWithPreviewExtension, {
    editor,
    selector: (state) => state.popupOpen === block.id,
  });
  const selected = useExtensionState(SourceBlockWithPreviewExtension, {
    editor,
    selector: (state) => state.selected === block.id,
  });

  // The source is hidden, so highlight the whole block while the cursor is in
  // it. Mirrors the vanilla `createSourceBlockWithPreview` store sync.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current
      ?.closest(".bn-block-content")
      ?.classList.toggle("ProseMirror-selectednode", selected);
  }, [selected]);

  const { html, error } = useKatexPreview(source, true);

  // Opens the popup when clicking the preview.
  const handleMouseDown = (event: MouseEvent) => {
    if (!editor.isEditable) {
      return;
    }

    store.setState((state) => ({ ...state, popupOpen: block.id }));

    event.preventDefault();
    event.stopPropagation();

    editor.setTextCursorPosition(block.id, "end");
    editor.focus();
  };

  return (
    <div
      ref={rootRef}
      className="bn-preview-with-source-popup"
      data-open={popupOpen ? "true" : "false"}
    >
      <div
        className="bn-preview-container"
        contentEditable={false}
        onMouseDown={handleMouseDown}
      >
        {source.length > 0 ? (
          <span dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <AddSourceButton
            text={editor.dictionary.code_block.add_source_button_text}
          />
        )}
      </div>
      <div className="bn-source-block-popup">
        <pre>
          <code ref={contentRef} />
        </pre>
        <div
          className="bn-code-block-source-error"
          contentEditable={false}
          style={{ display: error ? "block" : "none" }}
        >
          {error}
        </div>
      </div>
    </div>
  );
};
