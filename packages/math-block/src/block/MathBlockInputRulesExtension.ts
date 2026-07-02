import { createExtension } from "@blocknote/core";

/**
 * Converts the current block into a math block when a LaTeX display-math
 * delimiter is typed at its start:
 * - `$$ ` (TeX display math)
 * - `\[ ` (LaTeX display math)
 *
 * The matched delimiter is removed and the block is replaced with an empty
 * math block, ready for the LaTeX source to be typed in.
 */
export const MathBlockInputRulesExtension = createExtension({
  key: "math-block-input-rules",
  inputRules: [
    {
      find: /^\$\$\s$/,
      replace: () => ({ type: "math", props: {}, content: [] }),
    },
    {
      find: /^\\\[\s$/,
      replace: () => ({ type: "math", props: {}, content: [] }),
    },
  ],
});
