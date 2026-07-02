import { ReactCustomBlockRenderProps } from "@blocknote/react";
import type { ComponentType } from "react";

import { MathBlockConfig } from "../../createMathBlockConfig.js";
import { getMathPlainTextContent } from "../../../shared/getMathPlainTextContent.js";
import { latexToMathMLElement } from "../../../shared/vanilla/toExternalHTML/latexToMathMLElement.js";

export const BlockMathMLElement = ({
  block,
}: ReactCustomBlockRenderProps<MathBlockConfig>) => {
  const { mathMLElement } = latexToMathMLElement(
    getMathPlainTextContent(block.content),
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
      display="block"
      dangerouslySetInnerHTML={{ __html: mathMLElement.innerHTML }}
    />
  );
};
