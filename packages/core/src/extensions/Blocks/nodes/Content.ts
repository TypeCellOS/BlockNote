import { mergeAttributes, Node } from "@tiptap/core";
import styles from "./Block.module.css";
export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export const ContentBlock = Node.create<IBlock>({
  name: "content",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      position: {
        default: undefined,
        renderHTML: (attributes) => {
          return {
            "data-position": attributes.position,
          };
        },
        parseHTML: (element) => element.getAttribute("data-position"),
      },
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
      // TODO: The extra nested div is only needed for placeholders, different solution (without extra div) would be preferable
      // We can't use the other div because the ::before attribute on that one is already reserved for list-bullets
      ["div", 0],
    ];
  },
});
