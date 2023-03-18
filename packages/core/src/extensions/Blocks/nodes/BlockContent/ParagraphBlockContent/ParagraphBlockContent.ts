import { mergeAttributes, Node } from "@tiptap/core";
import styles from "../../Block.module.css";

export const ParagraphBlockContent = Node.create({
  name: "paragraph",
  group: "blockContent",
  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "p",
        priority: 200,
        node: "paragraph",
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
