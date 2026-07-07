import { createExtension } from "@blocknote/core";
import {
  InputRule,
  inputRules as inputRulesPlugin,
} from "@handlewithcare/prosemirror-inputrules";

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
  // Cannot use the `inputRules` field as it only allows for converting matched
  // content to blocks.
  prosemirrorPlugins: [
    inputRulesPlugin({
      rules: [/\$([^$]+)\$$/, /\\\((.+?)\\\)$/].map(
        (find) =>
          new InputRule(find, (state, match, start, end) => {
            const source = match[1]?.trim();
            const nodeType = state.schema.nodes[mathInlineContentConfig.type];
            if (!source || !nodeType) {
              return null;
            }

            return state.tr.replaceRangeWith(
              start,
              end,
              nodeType.create(null, state.schema.text(source)),
            );
          }),
      ),
    }),
  ],
});
