import { createBlockSpec } from "../../schema/index.js";
import { defaultProps } from "../defaultProps.js";
import { createToggleWrapper } from "../ToggleWrapper/createToggleWrapper.js";

export const ToggleHeading = createBlockSpec(
  {
    type: "toggleHeading",
    propSchema: {
      ...defaultProps,
      level: { default: 1, values: [1, 2, 3] as const },
    },
    content: "inline",
  } as const,
  {
    render: (block, editor) => {
      const contentDOM = document.createElement(`h${block.props.level}`);
      const a = createToggleWrapper(block, editor, contentDOM);

      return a;
    },
  },
);
