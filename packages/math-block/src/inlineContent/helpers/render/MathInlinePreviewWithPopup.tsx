import { StyleSchema } from "@blocknote/core";
import {
  PreviewPlaceholder,
  ReactCustomInlineContentRenderProps,
  SourceInlineContentWithPreview,
} from "@blocknote/react";
import { TbMathFunction } from "react-icons/tb";

import { useLatexToMathMLString } from "../../../helpers/render/useLatexToMathML.js";
import { getMathDictionary } from "../../../i18n/dictionary.js";
import { MathInlineContentConfig } from "../../createReactMathInlineContentSpec.js";

export const MathInlinePreviewWithPopup = (
  props: ReactCustomInlineContentRenderProps<
    MathInlineContentConfig,
    StyleSchema
  >,
) => {
  const source = props.inlineContent.content.trim();
  const { mathMLString, error } = useLatexToMathMLString(source, true);
  const dict = getMathDictionary(props.editor).inline;

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
