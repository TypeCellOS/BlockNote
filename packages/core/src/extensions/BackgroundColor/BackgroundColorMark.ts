import { Mark } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    backgroundColor: {
      setBackgroundColor: (color: string) => ReturnType;
    };
  }
}

export const BackgroundColorMark = Mark.create({
  name: "backgroundColor",

  addAttributes() {
    return {
      color: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => ({
          "data-background-color": attributes.color,
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

          if (element.hasAttribute("data-background-color")) {
            return { color: element.getAttribute("data-background-color") };
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setBackgroundColor:
        (color) =>
        ({ commands }) => {
          if (color !== "default") {
            return commands.setMark(this.name, { color: color });
          }

          return commands.unsetMark(this.name);
        },
    };
  },
});
