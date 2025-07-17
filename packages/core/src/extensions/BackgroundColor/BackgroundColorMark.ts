import { Mark } from "@tiptap/core";

import { getAttributeFromDefaultProps } from "../../blocks/defaultProps.js";
import { createStyleSpecFromTipTapMark } from "../../schema/index.js";

const BackgroundColorMark = Mark.create({
  name: "backgroundColor",

  addAttributes() {
    return {
      stringValue:
        getAttributeFromDefaultProps["backgroundColor"]("stringValue"),
    };
  },

  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if (
            element.hasAttribute("data-background-color") ||
            element.style.backgroundColor
          ) {
            return {};
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

export const BackgroundColor = createStyleSpecFromTipTapMark(
  BackgroundColorMark,
  "string",
);
