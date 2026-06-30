import {
  BlockFromConfig,
  BlockNoteEditor,
  createSourceBlockWithPreview,
} from "@blocknote/core";

import { MathBlockConfig } from "../../createMathBlockConfig.js";
import { getMathPlainTextContent } from "../../../shared/getMathPlainTextContent.js";
import { latexToMathMLElement } from "../../../shared/vanilla/toExternalHTML/latexToMathMLElement.js";

export const createMathBlockPreviewWithPopup = (
  block: BlockFromConfig<MathBlockConfig, any, any>,
  editor: BlockNoteEditor<{ math: MathBlockConfig }, any, any>,
) =>
  createSourceBlockWithPreview(block, editor, {
    createPreview: (block) => ({
      dom: latexToMathMLElement(getMathPlainTextContent(block), true)
        .mathMLElement as HTMLElement,
    }),
  });
