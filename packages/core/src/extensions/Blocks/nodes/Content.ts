import { mergeAttributes, Node } from "@tiptap/core";
import styles from "./Block.module.css";
export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export const ContentBlock = Node.create<IBlock>({
  name: "tccontent",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "div",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: styles.blockContent,
      }),
      // The extra nested div is only needed for placeholders, different solution (without extra div) would be preferable
      ["div", 0],
    ];
  },
});
