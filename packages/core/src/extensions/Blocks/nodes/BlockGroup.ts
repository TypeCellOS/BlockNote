import { mergeAttributes, Node } from "@tiptap/core";
import styles from "./Block.module.css";

export const BlockGroup = Node.create({
  name: "blockgroup",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "block+",

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
