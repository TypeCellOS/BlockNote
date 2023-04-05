import { mergeAttributes, Node } from "@tiptap/core";
import styles from "../../Block.module.css";

export const TableContent = Node.create({
  name: "table",
  group: "blockContent",
  content: "tableRow tableRow tableRow",

  parseHTML() {
    return [
      {
        tag: "table",
        priority: 500,
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
      ["table", 0],
    ];
  },
});
