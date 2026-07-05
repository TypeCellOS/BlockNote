import { StyleSchema } from "@blocknote/core";
import {
  ReactCustomInlineContentRenderProps,
  SourceInlineContentWithPreview,
} from "@blocknote/react";

import { MathInlineContentConfig } from "../../mathInlineContentConfig.js";
import { getMathPlainTextContent } from "../../../shared/getMathPlainTextContent.js";
import { useLatexToMathMLString } from "../../../shared/react/render/useLatexToMathML.js";

export const MathInlinePreviewWithPopup = (
  props: ReactCustomInlineContentRenderProps<
    MathInlineContentConfig,
    StyleSchema
  >,
) => {
  const source = getMathPlainTextContent(props.inlineContent.content);
  const { mathMLString, error } = useLatexToMathMLString(source, true);

  return (
    <SourceInlineContentWithPreview
      editor={props.editor}
      contentRef={props.contentRef}
      node={props.node}
      getPos={props.getPos}
      source={source}
      preview={<span dangerouslySetInnerHTML={{ __html: mathMLString }} />}
      error={error}
    />
  );
};
