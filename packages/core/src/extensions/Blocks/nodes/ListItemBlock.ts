import { Node, NodeViewRendererProps } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { getBlockInfoFromPos } from "../helpers/getBlockInfoFromPos";
import styles from "./Block.module.css";

export type ListItemBlockAttributes = {
  type: string;
};

export const ListItemBlock = Node.create({
  name: "listItemBlock",
  content: "inline*",
  priority: 200,

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

  addKeyboardShortcuts() {
    const handleBackspace = () =>
      this.editor.commands.first(({ commands }) => [
        // Changes list item block to a text block if the selection is empty and at the start of the block.
        () =>
          commands.command(({ state }) => {
            const { contentType } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            if (contentType.name !== "listItemBlock") return false;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;

            if (selectionAtBlockStart && selectionEmpty) {
              return commands.BNSetContentType(
                state.selection.from,
                "textBlock"
              );
            }

            return false;
          }),
        // Regular backspace behaviour.
        () => commands.deleteSelection(),
      ]);

    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        () =>
          // Changes list item block to a text block if both the content and selection are empty.
          commands.command(({ state }) => {
            const { node, contentType } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            if (contentType.name !== "listItemBlock") return false;

            const selectionEmpty =
              state.selection.anchor === state.selection.head;

            if (selectionEmpty && node.textContent.length === 0) {
              return commands.BNSetContentType(
                state.selection.from,
                "textBlock"
              );
            }

            return false;
          }),

        () =>
          // Splits the current block, moving content inside that's after the cursor to a new block of the same type
          // below.
          commands.command(({ state, chain }) => {
            const { node, contentType } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            if (contentType.name !== "listItemBlock") return false;

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

    return {
      Backspace: handleBackspace,
      Enter: handleEnter,
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
            const blockInfo = getBlockInfoFromPos(tr.doc, pos + 1)!;
            if (blockInfo === undefined) return;

            const prevBlockInfo = getBlockInfoFromPos(tr.doc, pos - 2)!;
            if (prevBlockInfo === undefined) return;

            const isFirstBlockInNestingLevel =
              blockInfo.depth !== prevBlockInfo.depth;

            if (!isFirstBlockInNestingLevel) {
              const prevBlockContentNode = prevBlockInfo.contentNode;
              const prevBlockContentType = prevBlockInfo.contentType;

              const isPrevBlockOrderedListItem =
                prevBlockContentType.name === "listItemBlock" &&
                prevBlockContentNode.attrs["type"] === "ordered";

              if (isPrevBlockOrderedListItem) {
                isFirstListItem = false;
              }
            }
          }

          const index = node.attrs["index"];
          let newIndex = "0";

          if (!isFirstListItem) {
            const prevBlockInfo = getBlockInfoFromPos(tr.doc, pos - 2);
            if (prevBlockInfo === undefined) return;

            const prevBlockContentNode = prevBlockInfo.contentNode;

            const prevBlockIndex = parseInt(
              prevBlockContentNode.attrs["index"]
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
