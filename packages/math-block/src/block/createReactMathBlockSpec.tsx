import {
  createBlockConfig,
  SourceBlockWithPreviewExtension,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import { MathBlockInputRulesExtension } from "./helpers/extensions/MathBlockInputRulesExtension.js";
import {
  parseBlockMathMLElement,
  parseBlockMathMLContent,
} from "./helpers/parse/parseBlockMathMLElement.js";
import { MathBlockPreviewWithPopup } from "./helpers/render/MathBlockPreviewWithPopup.js";
import { BlockMathMLElement } from "./helpers/toExternalHTML/BlockMathMLElement.js";

const MATH_BLOCK_PREVIEW_KEY = "math-block-preview";

export const createMathBlockConfig = createBlockConfig(
  () =>
    ({
      type: "math" as const,
      propSchema: {},
      content: "inline" as const,
    }) as const,
);

export type MathBlockConfig = ReturnType<typeof createMathBlockConfig>;

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
      blockType: createMathBlockConfig().type,
      hasPreview: () => true,
    }),
    MathBlockInputRulesExtension,
  ],
);
