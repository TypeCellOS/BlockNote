import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import styles from "../../../Block.module.css";
import { handleEnter } from "../ListItemKeyboardShortcuts";

export const BulletListItemBlockContent = Node.create({
  name: "bulletListItem",
  group: "blockContent",
  content: "inline*",

  addInputRules() {
    return [
      // Creates an unordered list when starting with "-", "+", or "*".
      new InputRule({
        find: new RegExp(`^[-+*]\\s$`),
        handler: ({ state, chain, range }) => {
          chain()
            .BNUpdateBlock(state.selection.from, {
              type: "bulletListItem",
              props: {},
            })
            // Removes the "-", "+", or "*" character used to set the list.
            .deleteRange({ from: range.from, to: range.to });
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => handleEnter(this.editor),
    };
  },

  parseHTML() {
    return [
      {
        tag: "li",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          // Case for BlockNote list structure.
          if (parent.getAttribute("data-content-type") === "bulletListItem") {
            return {};
          }

          // Case for regular HTML list structure.
          if (parent.tagName === "UL") {
            return {};
          }

          return false;
        },
        node: "blockContainer",
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
      ["li", 0],
    ];
  },
});
