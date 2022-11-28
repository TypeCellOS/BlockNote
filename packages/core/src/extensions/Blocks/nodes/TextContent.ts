import { Node } from "@tiptap/core";
import styles from "./Block.module.css";

export const TextContent = Node.create({
  name: "textContent",
  group: "blockContent",
  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "p",
        priority: 100,
      },
    ];
  },

  renderHTML() {
    return [
      "div",
      {
        "data-node-type": "block-content", // TODO: only for testing? if so, rename to data-test-*?
        "data-content-type": this.name,
        class: styles.blockContent,
      },
      ["p", 0],
    ];
  },
});
