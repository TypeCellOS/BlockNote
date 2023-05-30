import { mergeAttributes } from "@tiptap/core";
import { createTipTapBlock } from "../../../api/block";
import styles from "../../Block.module.css";

export const ParagraphBlockContent = createTipTapBlock<"paragraph">({
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
      ["p", { class: styles.inlineContent }, 0],
    ];
  },
});
