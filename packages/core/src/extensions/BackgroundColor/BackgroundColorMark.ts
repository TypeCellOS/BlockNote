import { Mark } from "@tiptap/core";
import { createStyleSpecFromTipTapMark } from "../../schema/index.js";
import { getBackgroundColorAttribute } from "../../blocks/defaultProps.js";

const BackgroundColorMark = Mark.create({
  name: "backgroundColor",

  addAttributes() {
    return {
      stringValue: getBackgroundColorAttribute("stringValue"),
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
            return {
              stringValue: element.getAttribute("data-background-color"),
            };
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
