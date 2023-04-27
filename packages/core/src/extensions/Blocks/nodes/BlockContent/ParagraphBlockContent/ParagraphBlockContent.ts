import { mergeAttributes } from "@tiptap/core";
import styles from "../../Block.module.css";
import { createTipTapNode } from "../../../api/block";

export const ParagraphBlockContent = createTipTapNode({
  name: "paragraph",
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
