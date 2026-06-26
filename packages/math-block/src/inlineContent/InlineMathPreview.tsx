import { StyleSchema } from "@blocknote/core";
import {
  ReactCustomInlineContentRenderProps,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { TextSelection } from "prosemirror-state";
import { MouseEvent, useEffect, useRef } from "react";
import { getMathSource } from "../helpers/getMathSource.js";
import { AddSourceButton } from "../helpers/render/MathPreview.js";
import { useKatexPreview } from "../helpers/render/useKatexPreview.js";
import { inlineMathConfig } from "./inlineMathConfig.js";
import { SourceInlineContentWithPreviewExtension } from "./SourceInlineContentWithPreviewExtension.js";

export const InlineMathPreview = (
  props: ReactCustomInlineContentRenderProps<
    typeof inlineMathConfig,
    StyleSchema
  >,
) => {
  const { inlineContent, editor, contentRef, node, getPos } = props;
  const pos = getPos();

  const source = getMathSource(inlineContent);

  const { store } = useExtension(SourceInlineContentWithPreviewExtension, {
    editor,
  });
  const popupOpen = useExtensionState(SourceInlineContentWithPreviewExtension, {
    editor,
    selector: (state) => state.popupOpen === pos,
  });
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

  const { html, error } = useKatexPreview(source, true);

  // Opens the popup when clicking the preview.
  const handleMouseDown = (event: MouseEvent) => {
    if (!editor.isEditable || !pos) {
      return;
    }

    store.setState((state) => ({ ...state, popupOpen: pos }));

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
      className={"bn-inline-source-content"}
      data-open={popupOpen ? "true" : "false"}
    >
      <span
        className="bn-inline-source-preview"
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
