import { InputRule, mergeAttributes } from "@tiptap/core";
import { createTipTapBlock } from "../../../../api/block";
import { handleEnter } from "../ListItemKeyboardShortcuts";
import { NumberedListIndexingPlugin } from "./NumberedListIndexingPlugin";
import styles from "../../../Block.module.css";

export const NumberedListItemBlockContent =
  createTipTapBlock<"numberedListItem">({
    name: "numberedListItem",
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
        // Case for regular HTML list structure.
        // (e.g.: when pasting from other apps)
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

            if (parent.tagName === "OL") {
              return {};
            }

            return false;
          },
          node: "numberedListItem",
        },
        // Case for BlockNote list structure.
        // (e.g.: when pasting from blocknote)
        {
          tag: "p",
          getAttrs: (element) => {
            if (typeof element === "string") {
              return false;
            }

            const parent = element.parentElement;

            if (parent === null) {
              return false;
            }

            if (
              parent.getAttribute("data-content-type") === "numberedListItem"
            ) {
              return {};
            }

            return false;
          },
          priority: 300,
          node: "numberedListItem",
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
        // we use a <p> tag, because for <li> tags we'd need to add a <ul> parent for around siblings to be semantically correct,
        // which would be quite cumbersome
        ["p", { class: styles.inlineContent }, 0],
      ];
    },
  });
