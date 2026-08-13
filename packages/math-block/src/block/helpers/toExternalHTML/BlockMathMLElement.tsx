import { ReactCustomBlockRenderProps } from "@blocknote/react";
import type { ComponentType } from "react";

import { plainContentToString } from "@blocknote/core";
import { latexToMathMLElement } from "../../../helpers/toExternalHTML/latexToMathMLElement.js";
import { MathBlockConfig } from "../../createReactMathBlockSpec.js";

export const BlockMathMLElement = ({
  block,
}: ReactCustomBlockRenderProps<MathBlockConfig>) => {
  const source = plainContentToString(block.content);
  const { mathMLElement } = latexToMathMLElement(source);
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
      display="block"
      alttext={source}
      dangerouslySetInnerHTML={{ __html: mathMLElement.innerHTML }}
    />
  );
};
