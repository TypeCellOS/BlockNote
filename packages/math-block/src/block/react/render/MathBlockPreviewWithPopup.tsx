import {
  ReactCustomBlockRenderProps,
  SourceBlockWithPreview,
} from "@blocknote/react";

import { MathBlockConfig } from "../../createMathBlockConfig.js";
import { getMathPlainTextContent } from "../../../shared/getMathPlainTextContent.js";
import { useLatexToMathMLString } from "../../../shared/react/render/useLatexToMathML.js";

export const MathBlockPreviewWithPopup = (
  props: ReactCustomBlockRenderProps<MathBlockConfig>,
) => {
  const source = getMathPlainTextContent(props.block.content);
  const { mathMLString, error } = useLatexToMathMLString(source);

  return (
    <SourceBlockWithPreview
      block={props.block}
      editor={props.editor}
      contentRef={props.contentRef}
      source={source}
      preview={<span dangerouslySetInnerHTML={{ __html: mathMLString }} />}
      error={error}
    />
  );
};
