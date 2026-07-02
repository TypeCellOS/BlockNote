import { createReactInlineContentSpec } from "@blocknote/react";

import { SourceInlineContentWithPreviewExtension } from "../SourceInlineContentWithPreviewExtension.js";
import { mathInlineContentConfig } from "../mathInlineContentConfig.js";
import { MathInlinePreviewWithPopup } from "./render/MathInlinePreviewWithPopup.js";
import { InlineMathMLElement } from "./toExternalHTML/InlineMathMLElement.js";
import {
  parseInlineMathMLContent,
  parseInlineMathMLElement,
} from "./parse/parseInlineMathMLElement.js";

const INLINE_MATH_PREVIEW_KEY = "inline-math-preview";

export const createReactInlineMathSpec = () =>
  createReactInlineContentSpec(
    mathInlineContentConfig,
    {
      parse: parseInlineMathMLElement,
      parseContent: parseInlineMathMLContent,
      render: MathInlinePreviewWithPopup,
      toExternalHTML: InlineMathMLElement,
    },
    [
      SourceInlineContentWithPreviewExtension({
        key: INLINE_MATH_PREVIEW_KEY,
        inlineContentType: "inlineMath",
      }),
    ],
  );
