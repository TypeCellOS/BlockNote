import {
  createBlockSpec,
  SourceBlockWithPreviewExtension,
} from "@blocknote/core";

import { createMathBlockConfig } from "../createMathBlockConfig.js";
import {
  parseBlockMathMLElement,
  parseBlockMathMLContent,
} from "../shared/parse/parseBlockMathMLElement.js";
import { createBlockMathMLElement } from "./toExternalHTML/createBlockMathMLElement.js";
import { createMathBlockPreviewWithPopup } from "./render/createMathBlockPreviewWithPopup.js";

const MATH_BLOCK_PREVIEW_KEY = "math-block-preview";

export const createMathBlockSpec = createBlockSpec(
  createMathBlockConfig,
  {
    meta: {
      code: true,
      defining: true,
      isolating: false,
    },
    parse: parseBlockMathMLElement,
    parseContent: parseBlockMathMLContent,
    render: createMathBlockPreviewWithPopup,
    toExternalHTML: createBlockMathMLElement,
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
