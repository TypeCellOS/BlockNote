import { BlockFromConfig } from "@blocknote/core";

import { MathBlockConfig } from "../../createMathBlockConfig.js";
import { getMathPlainTextContent } from "../../../shared/getMathPlainTextContent.js";
import { latexToMathMLElement } from "../../../shared/vanilla/toExternalHTML/latexToMathMLElement.js";

export const createBlockMathMLElement = (
  block: BlockFromConfig<MathBlockConfig, any, any>,
) => ({
  dom: latexToMathMLElement(getMathPlainTextContent(block))
    .mathMLElement as HTMLElement,
});
