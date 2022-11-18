import { Node, NodeViewRendererProps } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { getBlockFromPos } from "../helpers/getBlockFromPos";
import styles from "./Block.module.css";

export type ListItemBlockAttributes = {
  type: string;
};

export const ListItemBlock = Node.create({
  name: "listItemBlock",
  content: "inline*",

  addAttributes() {
    return {
      type: { default: "unordered" },
      index: { default: null },
    };
  },

  addNodeView() {
    return (_props: NodeViewRendererProps) => {
      const element = document.createElement("div");
      element.setAttribute("data-node-type", "block-content");
      element.setAttribute("data-content-type", this.name);
      element.className = styles.blockContent;

      const editableElement = document.createElement("li");
      element.appendChild(editableElement);

      return {
        dom: element,
        contentDOM: editableElement,
      };
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

          // Gets type of list item (ordered/unordered) based on parent element's tag ("ol"/"ul").
          if (parent.tagName === "UL") {
            return { type: "unordered" };
          }

          if (parent.tagName === "OL") {
            return { type: "ordered" };
          }

          return false;
        },
      },
    ];
  },

  renderHTML() {
    return [
      "div",
      {
        "data-node-type": "block-content",
        "data-content-type": this.name,
        class: styles.blockContent,
      },
      ["li", 0],
    ];
  },
});

// ProseMirror Plugin which automatically assigns
const PLUGIN_KEY = new PluginKey(`ordered-list-item-index`);
const OrderedListItemIndexPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    appendTransaction: (_transactions, _oldState, newState) => {
      const tr = newState.tr;
      let modified = false;

      // Traverses each node the doc using DFS, so blocks which are on the same nesting level will be traversed in the
      // same order they appear. This means the index of each list item block can be calculated by incrementing the
      // index of the previous list item block.
      newState.doc.descendants((node, pos) => {
        if (
          node.type.name === "block" &&
          node.firstChild!.type.name === "listItemBlock" &&
          node.firstChild!.attrs["type"] === "ordered"
        ) {
          let isFirstListItem = true;

          const isFirstBlockInDoc = pos === 1;

          if (!isFirstBlockInDoc) {
            const block = getBlockFromPos(tr.doc, pos + 1);
            if (block === undefined) return;

            const prevBlock = getBlockFromPos(tr.doc, pos - 2);
            if (prevBlock === undefined) return;

            const isFirstBlockInNestingLevel = block.depth !== prevBlock.depth;

            if (!isFirstBlockInNestingLevel) {
              const prevNode = prevBlock.node;

              const isPrevBlockOrderedListItem =
                prevNode.type.name === "block" &&
                prevNode.firstChild!.type.name === "listItemBlock" &&
                prevNode.firstChild!.attrs["type"] === "ordered";

              if (isPrevBlockOrderedListItem) {
                isFirstListItem = false;
              }
            }
          }

          const index = node.attrs["index"];
          let newIndex = "0";

          if (!isFirstListItem) {
            const prevBlock = getBlockFromPos(tr.doc, pos - 2);
            if (prevBlock === undefined) return;

            const prevBlockIndex = parseInt(
              prevBlock.node.firstChild!.attrs["index"]
            );

            newIndex = (prevBlockIndex + 1).toString();
          }

          if (!index || index !== newIndex) {
            modified = true;

            tr.setNodeMarkup(pos + 1, undefined, {
              type: "ordered",
              index: newIndex,
            });
          }
        }
      });

      return modified ? tr : null;
    },
  });
};
