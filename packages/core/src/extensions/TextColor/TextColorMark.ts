import { Mark } from "@tiptap/core";
import { createStyleSpecFromTipTapMark } from "../../schema/index.js";
import { getTextColorAttribute } from "../../blocks/defaultProps.js";

const TextColorMark = Mark.create({
  name: "textColor",

  addAttributes() {
    return {
      stringValue: getTextColorAttribute("stringValue"),
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

          if (element.hasAttribute("data-text-color") || element.style.color) {
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

export const TextColor = createStyleSpecFromTipTapMark(TextColorMark, "string");
