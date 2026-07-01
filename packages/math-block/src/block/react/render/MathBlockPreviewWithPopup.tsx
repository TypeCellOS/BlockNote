import { SourceBlockWithPreviewExtension } from "@blocknote/core";
import {
  ReactCustomBlockRenderProps,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { MouseEvent } from "react";

import { MathBlockConfig } from "../../createMathBlockConfig.js";
import { getMathPlainTextContent } from "../../../shared/getMathPlainTextContent.js";
import { AddSourceButton } from "../../../shared/react/render/AddSourceButton.js";
import { useLatexToMathMLString } from "../../../shared/react/render/useLatexToMathML.js";

export const MathBlockPreviewWithPopup = (
  props: ReactCustomBlockRenderProps<MathBlockConfig>,
) => {
  const { block, editor, contentRef } = props;

  const source = getMathPlainTextContent(block.content);

  const { store } = useExtension(SourceBlockWithPreviewExtension, { editor });
  const popupOpen = useExtensionState(SourceBlockWithPreviewExtension, {
    editor,
    selector: (state) => state.popupOpen === block.id,
  });
  const selected = useExtensionState(SourceBlockWithPreviewExtension, {
    editor,
    selector: (state) => state.selected === block.id,
  });

  const { mathMLString, error } = useLatexToMathMLString(source);

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
      className={
        "bn-preview-with-source-popup" +
        (selected ? " ProseMirror-selectednode" : "")
      }
      data-open={popupOpen ? "true" : "false"}
    >
      <div
        className="bn-preview-container"
        contentEditable={false}
        onMouseDown={handleMouseDown}
      >
        {source.length > 0 ? (
          <span dangerouslySetInnerHTML={{ __html: mathMLString }} />
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
