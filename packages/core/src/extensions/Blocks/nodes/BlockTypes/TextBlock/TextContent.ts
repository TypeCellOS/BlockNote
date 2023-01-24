import { mergeAttributes, Node } from "@tiptap/core";
import styles from "../../Block.module.css";

export type TextContentType = {
  name: "textContent";
  attrs?: {
    textAlignment: string;
  };
};

export const TextContent = Node.create({
  name: "textContent",
  group: "blockContent",
  content: "inline*",

  addAttributes() {
    return {
      textAlignment: {
        default: "left",
        parseHTML: (element) => element.getAttribute("align"),
        renderHTML: (attributes) =>
          attributes.textAlignment !== "left"
            ? { align: attributes.textAlignment }
            : { align: attributes.textAlignment },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "p",
        priority: 200,
        node: "block",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: styles.blockContent,
        "data-content-type": this.name,
      }),
      ["p", 0],
    ];
  },
});
