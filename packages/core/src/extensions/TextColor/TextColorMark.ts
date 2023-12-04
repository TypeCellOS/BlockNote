import { Mark } from "@tiptap/core";
import { createStyleSpecFromTipTapMark } from "../../schema";

const TextColorMark = Mark.create({
  name: "textColor",

  addAttributes() {
    return {
      stringValue: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-text-color"),
        renderHTML: (attributes) => ({
          "data-text-color": attributes.stringValue,
        }),
      },
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

          if (element.hasAttribute("data-text-color")) {
            return { stringValue: element.getAttribute("data-text-color") };
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
