import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import { NumberedListIndexingPlugin } from "./NumberedListIndexingPlugin";
import styles from "../../../Block.module.css";
import { handleEnter } from "../ListItemKeyboardShortcuts";

export const NumberedListItemBlockContent = Node.create({
  name: "numberedListItem",
  group: "blockContent",
  content: "inline*",

  addAttributes() {
    return {
      index: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-index"),
        renderHTML: (attributes) => {
          return {
            "data-index": attributes.index,
          };
        },
      },
    };
  },

  addInputRules() {
    return [
      // Creates an ordered list when starting with "1.".
      new InputRule({
        find: new RegExp(`^1\\.\\s$`),
        handler: ({ state, chain, range }) => {
          chain()
            .BNUpdateBlock(state.selection.from, {
              type: "numberedListItem",
              props: {},
            })
            // Removes the "1." characters used to set the list.
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

  addProseMirrorPlugins() {
    return [NumberedListIndexingPlugin()];
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
          if (parent.getAttribute("data-content-type") === "numberedListItem") {
            return {};
          }

          // Case for regular HTML list structure.
          if (parent.tagName === "OL") {
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
