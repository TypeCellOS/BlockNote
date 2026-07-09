import { StyleSchema } from "@blocknote/core";
import {
  PreviewPlaceholder,
  ReactCustomInlineContentRenderProps,
  SourceInlineContentWithPreview,
} from "@blocknote/react";
import { TbMathFunction } from "react-icons/tb";

import { getMathPlainTextContent } from "../../../helpers/getMathPlainTextContent.js";
import { useLatexToMathMLString } from "../../../helpers/render/useLatexToMathML.js";
import { MathInlineContentConfig } from "../../createReactMathInlineContentSpec.js";

export const MathInlinePreviewWithPopup = (
  props: ReactCustomInlineContentRenderProps<
    MathInlineContentConfig,
    StyleSchema
  >,
) => {
  const source = getMathPlainTextContent(props.inlineContent.content).trim();
  const { mathMLString, error } = useLatexToMathMLString(source, true);

  return (
    <SourceInlineContentWithPreview
      editor={props.editor}
      contentRef={props.contentRef}
      node={props.node}
      getPos={props.getPos}
      source={source}
      // `undefined` while nothing has rendered successfully, so an error
      // shows the error state instead of an empty preview.
      preview={
        mathMLString ? (
          <span dangerouslySetInnerHTML={{ __html: mathMLString }} />
        ) : undefined
      }
      error={error}
      emptySourcePlaceholder={
        <PreviewPlaceholder
          icon={<TbMathFunction />}
          text={props.editor.dictionary.code_block.add_source_button_text}
        />
      }
    />
  );
};
