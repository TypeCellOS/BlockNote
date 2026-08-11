import { StyleSchema } from "@blocknote/core";
import { ReactCustomInlineContentRenderProps } from "@blocknote/react";
import type { ComponentType } from "react";

import { MathInlineContentConfig } from "../../createReactMathInlineContentSpec.js";
import { getMathPlainTextContent } from "../../../helpers/getMathPlainTextContent.js";
import { latexToMathMLElement } from "../../../helpers/toExternalHTML/latexToMathMLElement.js";

export const InlineMathMLElement = ({
  inlineContent,
}: ReactCustomInlineContentRenderProps<
  MathInlineContentConfig,
  StyleSchema
>) => {
  const source = getMathPlainTextContent(inlineContent.content);
  const { mathMLElement } = latexToMathMLElement(source, true);
  if (!mathMLElement) {
    return null;
  }

  // `math` isn't part of React's built-in JSX types, so we alias it to a
  // component type to render it as a JSX element.
  const Math = "math" as unknown as ComponentType<{
    xmlns: string;
    display: string;
    alttext: string;
    dangerouslySetInnerHTML: { __html: string };
  }>;

  return (
    <Math
      xmlns="http://www.w3.org/1998/Math/MathML"
      display="inline"
      alttext={source}
      dangerouslySetInnerHTML={{ __html: mathMLElement.innerHTML }}
    />
  );
};
