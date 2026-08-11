import {
  PreviewPlaceholder,
  ReactCustomBlockRenderProps,
  SourceBlockWithPreview,
} from "@blocknote/react";
import { TbMathFunction } from "react-icons/tb";

import { MathBlockConfig } from "../../createReactMathBlockSpec.js";
import { plainContentToString } from "@blocknote/core";
import { useLatexToMathMLString } from "../../../helpers/render/useLatexToMathML.js";
import { getMathDictionary } from "../../../i18n/dictionary.js";

export const MathBlockPreviewWithPopup = (
  props: ReactCustomBlockRenderProps<MathBlockConfig>,
) => {
  const source = plainContentToString(props.block.content).trim();
  const { mathMLString, error } = useLatexToMathMLString(source);
  const dict = getMathDictionary(props.editor).block;

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
      errorPreview={
        <PreviewPlaceholder
          error
          icon={<TbMathFunction />}
          text={dict.preview_error_text}
        />
      }
      emptySourcePlaceholder={
        <PreviewPlaceholder
          icon={<TbMathFunction />}
          text={dict.add_source_text}
        />
      }
      sourcePlaceholder={dict.input_placeholder}
    />
  );
};
