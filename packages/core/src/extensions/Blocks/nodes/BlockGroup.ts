import { mergeAttributes, Node } from "@tiptap/core";
import styles from "./Block.module.css";

export const BlockGroup = Node.create({
  name: "blockGroup",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "tcblock+",

  parseHTML() {
    return [{ tag: "div" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: styles.blockGroup,
      }),
      0,
    ];
  },
});
