import { SourceBlockWithPreviewExtension } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import { createMathBlockConfig } from "../createMathBlockConfig.js";
import {
  parseBlockMathMLElement,
  parseBlockMathMLContent,
} from "../shared/parse/parseBlockMathMLElement.js";
import { MathBlockPreviewWithPopup } from "./render/MathBlockPreviewWithPopup.js";
import { BlockMathMLElement } from "./toExternalHTML/BlockMathMLElement.js";

const MATH_BLOCK_PREVIEW_KEY = "math-block-preview";

export const createReactMathBlockSpec = createReactBlockSpec(
  createMathBlockConfig,
  {
    meta: {
      code: true,
      defining: true,
      isolating: false,
    },
    parse: parseBlockMathMLElement,
    parseContent: parseBlockMathMLContent,
    render: MathBlockPreviewWithPopup,
    toExternalHTML: BlockMathMLElement,
  },
  [
    // Math blocks always render a preview.
    SourceBlockWithPreviewExtension({
      key: MATH_BLOCK_PREVIEW_KEY,
      blockType: "math",
      hasPreview: () => true,
    }),
  ],
);
