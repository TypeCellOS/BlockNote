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
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if(typeof element === "string") {
            return false;
          }

          if(element.getAttribute("node") === "block-group") {
            return null;
          }

          return false;
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: styles.blockGroup,
        node: "block-group"
      }),
      0,
    ];
  },
});
