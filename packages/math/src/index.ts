import {
  createBlockConfig,
  createBlockSpec,
  createBlockNoteExtension,
} from "@blocknote/core";
import { KatexOptions, render } from "katex";

export type MathOptions = {
  katexOptions?: KatexOptions;
};

export const createMathBlockConfig = createBlockConfig(
  (_options: MathOptions) =>
    ({
      type: "math",
      propSchema: {
        expression: {
          default: "",
        },
      },
      content: "none",
    }) as const,
);

export const createMathBlockSpec = createBlockSpec(
  createMathBlockConfig,
  (options) => ({
    parse(element) {
      if (element.tagName === "div" && element.dataset.expression) {
        return {
          expression: element.dataset.expression,
        };
      }

      return undefined;
    },
    render(block) {
      const math = document.createElement("div");

      render(block.props.expression, math, {
        displayMode: true,
        throwOnError: false,
        ...options.katexOptions,
      });

      return {
        dom: math,
      };
    },
    toExternalHTML(block) {
      const math = document.createElement("div");
      math.dataset.expression = block.props.expression;
      render(block.props.expression, math, {
        displayMode: true,
        throwOnError: false,
        output: "mathml",
        ...options.katexOptions,
      });
      return {
        dom: math,
      };
    },
  }),
  [
    createBlockNoteExtension({
      key: "math-block-input-rules",
      inputRules: [
        {
          find: /^\$\$\$([^$]+)\$\$\$$/,
          replace({ match }) {
            return {
              type: "math",
              props: {
                expression: match[1],
              },
            };
          },
        },
      ],
    }),
  ],
);
