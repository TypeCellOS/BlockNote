import { createExtension } from "@blocknote/core";

import { mathInlineContentConfig } from "../../createReactMathInlineContentSpec.js";

/**
 * Converts text wrapped in LaTeX inline-math delimiters into inline math
 * content as it's typed:
 * - `$...$` (TeX inline math)
 * - `\(...\)` (LaTeX inline math)
 *
 * The delimiters are removed and the enclosed source becomes the inline math's
 * content.
 */
export const MathInlineInputRulesExtension = createExtension({
  key: "math-inline-input-rules",
  inputRules: [/\$([^$]+)\$$/, /\\\((.+?)\\\)$/].map((find) => ({
    find,
    replace: ({ editor, match }) => {
      const source = match[1]?.trim();
      return source &&
        editor.schema.inlineContentSchema[mathInlineContentConfig.type]
        ? [{ type: mathInlineContentConfig.type, content: source }]
        : undefined;
    },
  })),
});
