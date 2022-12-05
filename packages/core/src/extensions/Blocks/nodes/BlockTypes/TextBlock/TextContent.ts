import { Node } from "@tiptap/core";
import styles from "../../Block.module.css";

export const TextContent = Node.create({
  name: "textContent",
  group: "blockContent",
  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "p",
        priority: 200,
        node: "block",
      },
    ];
  },

  renderHTML() {
    return [
      "div",
      {
        class: styles.blockContent,
        "data-content-type": this.name,
      },
      ["p", 0],
    ];
  },
});
