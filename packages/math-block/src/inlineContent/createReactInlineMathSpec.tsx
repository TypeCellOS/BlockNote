import { createReactInlineContentSpec } from "@blocknote/react";
import { InlineMathML } from "./InlineMathML.js";
import { InlineMathPreview } from "./InlineMathPreview.js";
import { inlineMathConfig } from "./inlineMathConfig.js";
import { SourceInlineContentWithPreviewExtension } from "./SourceInlineContentWithPreviewExtension.js";

const INLINE_MATH_PREVIEW_KEY = "inline-math-preview";

/**
 * Inline equivalent of the Math block, implemented with React. Renders a KaTeX
 * preview inline that can be clicked (or navigated into with the keyboard) to
 * edit its LaTeX source in a popup.
 */
export const createReactInlineMathSpec = () =>
  createReactInlineContentSpec(
    inlineMathConfig,
    {
      render: InlineMathPreview,
      toExternalHTML: InlineMathML,
    },
    [
      SourceInlineContentWithPreviewExtension({
        key: INLINE_MATH_PREVIEW_KEY,
        inlineContentType: "inlineMath",
      }),
    ],
  );
