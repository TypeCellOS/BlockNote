import { StyleSchema } from "@blocknote/core";
import { ReactCustomInlineContentRenderProps } from "@blocknote/react";
import type { ComponentType } from "react";

import { getMathPlainTextContent } from "../../../shared/getMathPlainTextContent.js";
import { latexToMathMLElement } from "../../../shared/vanilla/latexToMathML.js";
import { MathInlineContentConfig } from "../../mathInlineContentConfig.js";

export const InlineMathMLElement = ({
  inlineContent,
}: ReactCustomInlineContentRenderProps<
  MathInlineContentConfig,
  StyleSchema
>) => {
  const { mathMLElement } = latexToMathMLElement(
    getMathPlainTextContent(inlineContent.content),
    true,
  );
  if (!mathMLElement) {
    return null;
  }

  // `math` isn't part of React's built-in JSX types, so we alias it to a
  // component type to render it as a JSX element.
  const Math = "math" as unknown as ComponentType<{
    xmlns: string;
    display: string;
    dangerouslySetInnerHTML: { __html: string };
  }>;

  return (
    <Math
      xmlns="http://www.w3.org/1998/Math/MathML"
      display="inline"
      dangerouslySetInnerHTML={{ __html: mathMLElement.innerHTML }}
    />
  );
};
