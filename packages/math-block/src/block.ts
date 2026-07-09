import {
  createBlockConfig,
  createBlockSpec,
  createSourceBlockWithPreview,
  SourceBlockWithPreviewExtension,
} from "@blocknote/core";
import {
  parseMathML,
  parseMathMLContent,
} from "./helpers/parse/parseMathML.js";
import { createMathPreview } from "./helpers/render/createMathPreview.js";
import { createMathML } from "./helpers/toExternalHTML/createMathML.js";

const MATH_BLOCK_PREVIEW_KEY = "math-block-preview";

export type MathBlockConfig = ReturnType<typeof createMathBlockConfig>;

export const createMathBlockConfig = createBlockConfig(
  () =>
    ({
      type: "math" as const,
      propSchema: {},
      content: "inline" as const,
    }) as const,
);

export const createMathBlockSpec = createBlockSpec(
  createMathBlockConfig,
  {
    meta: {
      code: true,
      defining: true,
      isolating: false,
      highlight: () => "latex",
    },
    parse: (el) => parseMathML(el),
    parseContent: ({ el, schema }) => parseMathMLContent({ el, schema }),
    render: (block, editor) =>
      createSourceBlockWithPreview(block, editor, {
        createPreview: createMathPreview,
      }),
    toExternalHTML: (block) => createMathML(block),
  },
  () => [
    // Math blocks always render a preview.
    SourceBlockWithPreviewExtension({
      key: MATH_BLOCK_PREVIEW_KEY,
      blockType: "math",
      hasPreview: () => true,
    }),
  ],
);
