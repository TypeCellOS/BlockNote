import { StyleSchema } from "@blocknote/core";
import {
  ReactCustomInlineContentRenderProps,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { TextSelection } from "prosemirror-state";
import { MouseEvent } from "react";

import { MathInlineContentConfig } from "../../mathInlineContentConfig.js";
import { SourceInlineContentWithPreviewExtension } from "../../SourceInlineContentWithPreviewExtension.js";
import { getMathPlainTextContent } from "../../../shared/getMathPlainTextContent.js";
import { AddSourceButton } from "../../../shared/react/render/AddSourceButton.js";
import { useLatexToMathMLString } from "../../../shared/react/render/useLatexToMathML.js";

export const MathInlinePreviewWithPopup = (
  props: ReactCustomInlineContentRenderProps<
    MathInlineContentConfig,
    StyleSchema
  >,
) => {
  const { inlineContent, editor, contentRef, node, getPos } = props;
  const pos = getPos();

  const source = getMathPlainTextContent(inlineContent.content);

  const { store } = useExtension(SourceInlineContentWithPreviewExtension, {
    editor,
  });
  // The popup is open exactly when the selection is inside this inline content,
  // which is the same condition that marks it as selected.
  const selected = useExtensionState(SourceInlineContentWithPreviewExtension, {
    editor,
    selector: (state) => state.selected === pos,
  });

  const { mathMLString, error } = useLatexToMathMLString(source, true);

  // Opens the popup when clicking the preview.
  const handlePreviewMouseDown = (event: MouseEvent) => {
    if (!editor.isEditable || !pos) {
      return;
    }

    store.setState({ selected: pos });

    event.preventDefault();
    event.stopPropagation();

    const view = editor.prosemirrorView!;
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.tr.doc, pos + node.nodeSize - 1),
      ),
    );
    editor.focus();
  };

  // Closes the popup by moving the selection to just after the inline content.
  const handleOkButtonMouseDown = (event: MouseEvent) => {
    if (!editor.isEditable || !pos) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const view = editor.prosemirrorView!;
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.tr.doc, pos + node.nodeSize),
      ),
    );
    editor.focus();
  };

  return (
    <span
      // The source is hidden, so highlight the whole inline content while the
      // cursor is in it.
      className={
        "bn-preview-with-source-popup" +
        (selected ? " ProseMirror-selectednode" : "")
      }
      data-open={selected ? "true" : "false"}
    >
      <span
        className="bn-preview-container"
        contentEditable={false}
        onMouseDown={handlePreviewMouseDown}
      >
        {source.length > 0 ? (
          <span dangerouslySetInnerHTML={{ __html: mathMLString }} />
        ) : (
          <AddSourceButton
            text={editor.dictionary.code_block.add_source_button_text}
          />
        )}
      </span>
      <div className="bn-source-block-popup">
        <div className="bn-code-block-source-popup-body">
          <pre>
            <code ref={contentRef} />
          </pre>
          <div
            className="bn-code-block-source-popup-ok-button-wrapper"
            contentEditable={false}
          >
            <button
              className="bn-code-block-source-popup-ok-button"
              onMouseDown={handleOkButtonMouseDown}
            >
              OK
            </button>
          </div>
        </div>
        <div
          className="bn-code-block-source-error"
          contentEditable={false}
          style={{ display: error ? "block" : "none" }}
        >
          {error}
        </div>
      </div>
    </span>
  );
};
