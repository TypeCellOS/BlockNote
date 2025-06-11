import { createBlockSpec } from "../../schema/index.js";
import {
  headingConfig,
  headingImplementation,
} from "../HeadingBlockContent/HeadingBlockContent.js";
import { createToggleWrapper } from "../ToggleWrapper/createToggleWrapper.js";

export const ToggleHeading = createBlockSpec(
  {
    ...headingConfig,
    type: "toggleHeading",
  },
  {
    ...headingImplementation,
    render: (block, editor) =>
      createToggleWrapper(
        block,
        editor,
        headingImplementation.render(block, editor),
      ),
  },
);
