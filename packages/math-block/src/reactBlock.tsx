import { SourceBlockWithPreviewExtension } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { createMathBlockConfig } from "./block.js";
import {
  parseMathML,
  parseMathMLContent,
} from "./helpers/parse/parseMathML.js";
import { MathPreview } from "./helpers/render/MathPreview.js";
import { MathML } from "./helpers/toExternalHTML/MathML.js";

const MATH_BLOCK_PREVIEW_KEY = "math-block-preview";

// React equivalent of `createMathBlockSpec`. Renders the preview and external
// HTML with React components (`MathPreview` and `MathML`) via
// `createReactBlockSpec`, but is otherwise identical.
export const createReactMathBlockSpec = createReactBlockSpec(
  createMathBlockConfig,
  {
    meta: {
      code: true,
      defining: true,
      isolating: false,
    },
    parse: (el) => parseMathML(el),
    parseContent: ({ el, schema }) => parseMathMLContent({ el, schema }),
    render: MathPreview,
    toExternalHTML: MathML,
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
