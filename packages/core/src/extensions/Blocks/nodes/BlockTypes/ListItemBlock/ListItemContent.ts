import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import { OrderedListItemIndexPlugin } from "./OrderedListItemIndexPlugin";
import { getBlockInfoFromPos } from "../../../helpers/getBlockInfoFromPos";
import styles from "../../Block.module.css";

export type ListItemContentType = {
  name: "listItemContent";
  attrs?: {
    listItemType: string;
  };
};

export const ListItemContent = Node.create({
  name: "listItemContent",
  group: "blockContent",
  content: "inline*",

  addAttributes() {
    return {
      listItemType: {
        default: "unordered",
        parseHTML: (element) => element.getAttribute("data-list-item-type"),
        renderHTML: (attributes) => {
          return {
            "data-list-item-type": attributes.listItemType,
          };
        },
      },
      listItemIndex: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-list-item-index"),
        renderHTML: (attributes) => {
          return {
            "data-list-item-index": attributes.listItemIndex,
          };
        },
      },
    };
  },

  addInputRules() {
    return [
      // Creates an unordered list when starting with "-", "+", or "*".
      new InputRule({
        find: new RegExp(`^[-+*]\\s$`),
        handler: ({ state, chain, range }) => {
          chain()
            .BNSetContentType(state.selection.from, {
              name: "listItemContent",
              attrs: {
                listItemType: "unordered",
              },
            })
            // Removes the "-", "+", or "*" character used to set the list.
            .deleteRange({ from: range.from, to: range.to });
        },
      }),
      // Creates an ordered list when starting with "1.".
      new InputRule({
        find: new RegExp(`^1\\.\\s$`),
        handler: ({ state, chain, range }) => {
          chain()
            .BNSetContentType(state.selection.from, {
              name: "listItemContent",
              attrs: {
                listItemType: "ordered",
              },
            })
            // Removes the "1." characters used to set the list.
            .deleteRange({ from: range.from, to: range.to });
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    const handleEnter = () => {
      const { node, contentType } = getBlockInfoFromPos(
        this.editor.state.doc,
        this.editor.state.selection.from
      )!;

      const selectionEmpty =
        this.editor.state.selection.anchor === this.editor.state.selection.head;

      if (contentType.name !== "listItemContent" || !selectionEmpty) {
        return false;
      }

      return this.editor.commands.first(({ state, chain, commands }) => [
        () =>
          // Changes list item block to a text block if both the content is empty.
          commands.command(() => {
            if (node.textContent.length === 0) {
              return commands.BNSetContentType(state.selection.from, {
                name: "textContent",
              });
            }

            return false;
          }),

        () =>
          // Splits the current block, moving content inside that's after the cursor to a new block of the same type
          // below.
          commands.command(() => {
            if (node.textContent.length > 0) {
              chain()
                .deleteSelection()
                .BNSplitBlock(state.selection.from, true)
                .run();

              return true;
            }

            return false;
          }),
      ]);
    };

    return {
      Enter: handleEnter,
    };
  },

  addProseMirrorPlugins() {
    return [OrderedListItemIndexPlugin()];
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
          // Gets type of list item (ordered/unordered) based on the block content's listItemType attribute.
          if (parent.getAttribute("data-content-type") === "listItemContent") {
            return { listItemType: parent.getAttribute("data-list-item-type") };
          }

          // Case for regular HTML list structure.
          // Gets type of list item (ordered/unordered) based on parent element's tag ("ol"/"ul").
          if (parent.tagName === "UL") {
            return { listItemType: "unordered" };
          }
          if (parent.tagName === "OL") {
            return { listItemType: "ordered" };
          }

          return false;
        },
        node: "block",
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
