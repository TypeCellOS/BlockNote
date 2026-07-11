import { createBlockConfig } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import { MathBlockInputRulesExtension } from "./helpers/extensions/MathBlockInputRulesExtension.js";
import {
  parseBlockMathMLElement,
  parseBlockMathMLContent,
} from "./helpers/parse/parseBlockMathMLElement.js";
import { MathBlockPreviewWithPopup } from "./helpers/render/MathBlockPreviewWithPopup.js";
import { BlockMathMLElement } from "./helpers/toExternalHTML/BlockMathMLElement.js";

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
      highlight: () => "latex",
      // Math blocks always render a preview (single-line source, so Enter
      // commits/closes the popup - no `hardBreakShortcut` needed).
      hasPreview: true,
    },
    parse: parseBlockMathMLElement,
    parseContent: parseBlockMathMLContent,
    render: MathBlockPreviewWithPopup,
    toExternalHTML: BlockMathMLElement,
  },
  [MathBlockInputRulesExtension],
);
