import {
  PreviewPlaceholder,
  ReactCustomBlockRenderProps,
  SourceBlockWithPreview,
} from "@blocknote/react";
import { TbMathFunction } from "react-icons/tb";

import { MathBlockConfig } from "../../createReactMathBlockSpec.js";
import { getMathPlainTextContent } from "../../../helpers/getMathPlainTextContent.js";
import { useLatexToMathMLString } from "../../../helpers/render/useLatexToMathML.js";

export const MathBlockPreviewWithPopup = (
  props: ReactCustomBlockRenderProps<MathBlockConfig>,
) => {
  const source = getMathPlainTextContent(props.block.content).trim();
  const { mathMLString, error } = useLatexToMathMLString(source);

  return (
    <SourceBlockWithPreview
      block={props.block}
      editor={props.editor}
      contentRef={props.contentRef}
      source={source}
      // `undefined` while nothing has rendered successfully, so an error
      // shows the error state instead of an empty preview.
      preview={
        mathMLString ? (
          <span dangerouslySetInnerHTML={{ __html: mathMLString }} />
        ) : undefined
      }
      error={error}
      errorPreview={error}
      emptySourcePlaceholder={
        <PreviewPlaceholder
          icon={<TbMathFunction />}
          text={props.editor.dictionary.code_block.add_source_button_text}
        />
      }
    />
  );
};
