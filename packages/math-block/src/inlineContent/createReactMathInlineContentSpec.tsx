import {
  CustomInlineContentConfig,
  SourceInlineContentWithPreviewExtension,
} from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";

import { MathInlineInputRulesExtension } from "./helpers/extensions/MathInlineInputRulesExtension.js";
import {
  parseInlineMathMLContent,
  parseInlineMathMLElement,
} from "./helpers/parse/parseInlineMathMLElement.js";
import { MathInlinePreviewWithPopup } from "./helpers/render/MathInlinePreviewWithPopup.js";
import { InlineMathMLElement } from "./helpers/toExternalHTML/InlineMathMLElement.js";

const INLINE_MATH_PREVIEW_KEY = "inline-math-preview";

export const mathInlineContentConfig = {
  type: "inlineMath" as const,
  propSchema: {},
  content: "styled" as const,
} satisfies CustomInlineContentConfig;

export type MathInlineContentConfig = typeof mathInlineContentConfig;

export const createReactInlineMathSpec = () =>
  createReactInlineContentSpec(
    mathInlineContentConfig,
    {
      meta: {
        code: true,
      },
      parse: parseInlineMathMLElement,
      parseContent: parseInlineMathMLContent,
      render: MathInlinePreviewWithPopup,
      toExternalHTML: InlineMathMLElement,
    },
    [
      SourceInlineContentWithPreviewExtension({
        key: INLINE_MATH_PREVIEW_KEY,
        inlineContentType: mathInlineContentConfig.type,
      }),
      MathInlineInputRulesExtension,
    ],
  );
