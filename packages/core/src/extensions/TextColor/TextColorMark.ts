import { Mark } from "@tiptap/core";

export const TextColorMark = Mark.create({
  name: "textColor",

  addAttributes() {
    return {
      color: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-text-color"),
        renderHTML: (attributes) => ({
          "data-text-color": attributes.color,
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
            return { color: element.getAttribute("data-text-color") };
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
