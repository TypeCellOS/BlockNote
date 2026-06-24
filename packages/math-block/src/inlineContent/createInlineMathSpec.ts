import {
  CodeBlockPreview,
  createInlineContentSpec,
  createSourceInlineContentWithPreview,
} from "@blocknote/core";
import { getMathSource } from "../helpers/getMathSource.js";
import { renderKatex } from "../helpers/render/renderKatex.js";
import { katexToMathML } from "../helpers/toExternalHTML/createMathML.js";

// Renders the inline preview - the same KaTeX rendering as the Math block, but
// in inline (non-display) mode.
const createInlineMathPreview: CodeBlockPreview = (block) =>
  renderKatex(getMathSource(block), false);

export const inlineMathConfig = {
  type: "inlineMath" as const,
  propSchema: {},
  content: "styled" as const,
};

/**
 * Inline equivalent of the Math block. Reuses the Math block's
 * preview-with-source-popup UX via `createSourceInlineContentWithPreview`,
 * rendering a KaTeX preview inline that can be clicked (or navigated into with
 * the keyboard) to edit its LaTeX source.
 */
export const createInlineMathSpec = () =>
  createInlineContentSpec(inlineMathConfig, {
    render: (inlineContent, _updateInlineContent, editor) =>
      createSourceInlineContentWithPreview(inlineContent, editor as any, {
        createPreview: createInlineMathPreview,
      }),
    toExternalHTML: (inlineContent) =>
      katexToMathML(getMathSource(inlineContent), false),
  });
