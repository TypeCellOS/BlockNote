import { StyleSchema } from "@blocknote/core";
import {
  ReactCustomInlineContentRenderProps,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { TextSelection } from "prosemirror-state";
import { MouseEvent, useEffect, useRef } from "react";

import { MathInlineContentConfig } from "../../mathInlineContentConfig.js";
import { SourceInlineContentWithPreviewExtension } from "../../SourceInlineContentWithPreviewExtension.js";
import { getMathPlainTextContent } from "../../../shared/getMathPlainTextContent.js";
import { AddSourceButton } from "../../../shared/react/AddSourceButton.js";
import { useLatexToMathMLString } from "../../../shared/react/useLatexToMathML.js";

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

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current
      ?.closest(".bn-inline-content-section")
      ?.classList.toggle("ProseMirror-selectednode", selected);
  }, [selected]);

  const { mathMLString, error } = useLatexToMathMLString(source, true);

  // Opens the popup when clicking the preview.
  const handleMouseDown = (event: MouseEvent) => {
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

  return (
    <span
      ref={rootRef}
      className="bn-preview-with-source-popup"
      data-open={selected ? "true" : "false"}
    >
      <span
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
      </span>
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
    </span>
  );
};
