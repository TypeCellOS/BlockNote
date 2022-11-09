import { mergeAttributes, Node } from "@tiptap/core";
import { Selection, TextSelection } from "prosemirror-state";
import { joinBackward } from "../commands/joinBackward";
import { findBlock } from "../helpers/findBlock";
import { setBlockHeading } from "../helpers/setBlockHeading";
import { OrderedListPlugin } from "../OrderedListPlugin";
import { PreviousBlockTypePlugin } from "../PreviousBlockTypePlugin";
import { textblockTypeInputRuleSameNodeType } from "../rule";
import styles from "./Block.module.css";
import BlockAttributes from "../BlockAttributes";

export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export type Level = "1" | "2" | "3";
export type ListType = "li" | "oli";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockHeading: {
      /**
       * Set a heading node
       */
      setBlockHeading: (attributes: { level: Level }) => ReturnType;
      /**
       * Unset a heading node
       */
      unsetBlockHeading: () => ReturnType;

      unsetList: () => ReturnType;

      addNewBlockAsSibling: (attributes?: {
        headingType?: Level;
        listType?: ListType;
      }) => ReturnType;

      setBlockList: (type: ListType) => ReturnType;
    };
  }
}

/**
 * The main "Block node" documents consist of
 */
export const Block = Node.create<IBlock>({
  name: "block",
  group: "block",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "content blockgroup?",

  defining: true,

  addAttributes() {
    return {
      listType: {
        default: undefined,
      },
      blockColor: {
        default: undefined,
      },
      blockStyle: {
        default: undefined,
      },
      headingType: {
        default: undefined,
        keepOnSplit: false,
      },
    };
  },

  parseHTML() {
    return [
      // For parsing blocks within the editor.
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const attrs: Record<string, string> = {};
          for (let [nodeAttr, HTMLAttr] of Object.entries(BlockAttributes)) {
            if (element.getAttribute(HTMLAttr)) {
              attrs[nodeAttr] = element.getAttribute(HTMLAttr)!;
            }
          }

          if (element.getAttribute("data-node-type") === "block") {
            return attrs;
          }

          return false;
        },
      },
      // For parsing headings & paragraphs copied from outside the editor.
      {
        tag: "p",
        priority: 100,
      },
      {
        tag: "h1",
        attrs: { headingType: "1" },
      },
      {
        tag: "h2",
        attrs: { headingType: "2" },
      },
      {
        tag: "h3",
        attrs: { headingType: "3" },
      },
      // For parsing list items copied from outside the editor.
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
            return { listType: "li" };
          }

          if (parent.tagName === "OL") {
            return { listType: "oli" };
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs: Record<string, string> = {};
    for (let [nodeAttr, HTMLAttr] of Object.entries(BlockAttributes)) {
      if (HTMLAttributes[nodeAttr]) {
        attrs[HTMLAttr] = HTMLAttributes[nodeAttr];
      }
    }

    return [
      "div",
      mergeAttributes(attrs, {
        class: styles.blockOuter,
        "data-node-type": "block-outer",
      }),
      [
        "div",
        mergeAttributes(attrs, {
          class: styles.block,
          "data-node-type": "block",
        }),
        0,
      ],
    ];
  },

  addInputRules() {
    return [
      ...["1", "2", "3"].map((level) => {
        // Create a heading when starting with "#", "##", or "###""
        return textblockTypeInputRuleSameNodeType({
          find: new RegExp(`^(#{1,${level}})\\s$`),
          type: this.type,
          getAttributes: {
            headingType: level,
          },
        });
      }),
      // Create a list when starting with "-"
      textblockTypeInputRuleSameNodeType({
        find: /^\s*([-+*])\s$/,
        type: this.type,
        getAttributes: {
          listType: "li",
        },
      }),
      textblockTypeInputRuleSameNodeType({
        find: new RegExp(/^1.\s/),
        type: this.type,
        getAttributes: {
          listType: "oli",
        },
      }),
    ];
  },

  addCommands() {
    return {
      setBlockHeading:
        (attributes) =>
        ({ tr, dispatch }) => {
          return setBlockHeading(tr, dispatch, attributes.level);
        },
      unsetBlockHeading:
        () =>
        ({ tr, dispatch }) => {
          return setBlockHeading(tr, dispatch, undefined);
        },
      unsetList:
        () =>
        ({ tr, dispatch }) => {
          const node = tr.selection.$anchor.node(-1);
          const nodePos = tr.selection.$anchor.posAtIndex(0, -1) - 1;

          // const node2 = tr.doc.nodeAt(nodePos);
          if (node.type.name === "block" && node.attrs["listType"]) {
            if (dispatch) {
              tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                listType: undefined,
              });
              return true;
            }
          }
          return false;
        },

      addNewBlockAsSibling:
        (attributes) =>
        ({ tr, dispatch, state }) => {
          // Get current block
          const currentBlock = findBlock(tr.selection);
          if (!currentBlock) {
            return false;
          }

          // If current blocks content is empty dont create a new block
          if (currentBlock.node.firstChild?.textContent.length === 0) {
            if (dispatch) {
              tr.setNodeMarkup(currentBlock.pos, undefined, attributes);
            }
            return true;
          }

          // Create new block after current block
          const endOfBlock = currentBlock.pos + currentBlock.node.nodeSize;
          let newBlock = state.schema.nodes["block"].createAndFill(attributes)!;
          if (dispatch) {
            tr.insert(endOfBlock, newBlock);
            tr.setSelection(new TextSelection(tr.doc.resolve(endOfBlock + 1)));
          }
          return true;
        },
      setBlockList:
        (type) =>
        ({ tr, dispatch }) => {
          const node = tr.selection.$anchor.node(-1);
          const nodePos = tr.selection.$anchor.posAtIndex(0, -1) - 1;

          // const node2 = tr.doc.nodeAt(nodePos);
          if (node.type.name === "block") {
            if (dispatch) {
              tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                listType: type,
              });
            }
            return true;
          }
          return false;
        },
      joinBackward:
        () =>
        ({ view, dispatch, state }) =>
          joinBackward(state, dispatch, view), // Override default joinBackward with edited command
    };
  },
  addProseMirrorPlugins() {
    return [PreviousBlockTypePlugin(), OrderedListPlugin()];
  },
  addKeyboardShortcuts() {
    // handleBackspace is partially adapted from https://github.com/ueberdosis/tiptap/blob/ed56337470efb4fd277128ab7ef792b37cfae992/packages/core/src/extensions/keymap.ts
    const handleBackspace = () =>
      this.editor.commands.first(({ commands }) => [
        // Maybe the user wants to undo an auto formatting input rule (e.g.: - or #, and then hit backspace) (source: tiptap)
        () => commands.undoInputRule(),
        // maybe convert first text block node to default node (source: tiptap)
        () =>
          commands.command(({ tr }) => {
            const { selection, doc } = tr;
            const { empty, $anchor } = selection;
            const { pos, parent } = $anchor;
            const isAtStart = Selection.atStart(doc).from === pos;

            if (
              !empty ||
              !isAtStart ||
              !parent.type.isTextblock ||
              parent.textContent.length
            ) {
              return false;
            }

            return commands.clearNodes();
          }),
        () => commands.deleteSelection(), // (source: tiptap)
        () =>
          commands.command(({ tr }) => {
            const isAtStartOfNode = tr.selection.$anchor.parentOffset === 0;
            const node = tr.selection.$anchor.node(-1);
            if (isAtStartOfNode && node.type.name === "block") {
              // we're at the start of the block, so we're trying to "backspace" the bullet or indentation
              return commands.first([
                () => commands.unsetList(), // first try to remove the "list" property
                () => commands.liftListItem("block"), // then try to remove a level of indentation
              ]);
            }
            return false;
          }),
        ({ chain }) =>
          // we are at the start of a block at the root level. The user hits backspace to "merge it" to the end of the block above
          //
          // BlockA
          // BlockB

          // Becomes:

          // BlockABlockB

          chain()
            .command(({ tr, state, dispatch }) => {
              const isAtStartOfNode = tr.selection.$anchor.parentOffset === 0;
              const anchor = tr.selection.$anchor;
              const node = anchor.node(-1);
              if (isAtStartOfNode && node.type.name === "block") {
                if (node.childCount === 2) {
                  // BlockB has children. We want to go from this:
                  //
                  // BlockA
                  // BlockB
                  //    BlockC
                  //        BlockD
                  //
                  // to:
                  //
                  // BlockABlockB
                  // BlockC
                  //     BlockD

                  // This parts moves the children of BlockB to the top level
                  const startSecondChild = anchor.posAtIndex(1, -1) + 1; // start of blockgroup
                  const endSecondChild = anchor.posAtIndex(2, -1) - 1;
                  const range = state.doc
                    .resolve(startSecondChild)
                    .blockRange(state.doc.resolve(endSecondChild));

                  if (dispatch) {
                    tr.lift(range!, anchor.depth - 2);
                  }
                }
                return true;
              }
              return false;
            })
            // use joinBackward to merge BlockB to BlockA (i.e.: turn it into BlockABlockB)
            // The standard JoinBackward would break here, and would turn it into:
            // BlockA
            //     BlockB
            //
            // joinBackward has been patched with our custom version to fix this (see commands/joinBackward)
            .joinBackward()
            .run(),

        () => commands.selectNodeBackward(), // (source: tiptap)
      ]);

    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        // Try to split the current block into 2 items:
        () => commands.splitListItem("block"),
        // Otherwise, maybe we are in an empty list item. "Enter" should remove the list bullet
        ({ tr, dispatch }) => {
          const $from = tr.selection.$from;
          if ($from.depth !== 3) {
            // only needed at root level, at deeper levels it should be handled already by splitListItem
            return false;
          }
          const node = tr.selection.$anchor.node(-1);
          const nodePos = tr.selection.$anchor.posAtIndex(0, -1) - 1;

          if (node.type.name === "block" && node.attrs["listType"]) {
            if (dispatch) {
              tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                listType: undefined,
              });
            }
            return true;
          }
          return false;
        },
        // Otherwise, we might be on an empty line and hit "Enter" to create a new line:
        ({ tr, dispatch }) => {
          const $from = tr.selection.$from;

          if (dispatch) {
            tr.split($from.pos, 2).scrollIntoView();
          }
          return true;
        },
      ]);

    return {
      Backspace: handleBackspace,
      Enter: handleEnter,
      Tab: () => this.editor.commands.sinkListItem("block"),
      "Shift-Tab": () => {
        return this.editor.commands.liftListItem("block");
      },
      "Mod-Alt-0": () =>
        this.editor.chain().unsetList().unsetBlockHeading().run(),
      "Mod-Alt-1": () => this.editor.commands.setBlockHeading({ level: "1" }),
      "Mod-Alt-2": () => this.editor.commands.setBlockHeading({ level: "2" }),
      "Mod-Alt-3": () => this.editor.commands.setBlockHeading({ level: "3" }),
      "Mod-Shift-7": () => this.editor.commands.setBlockList("li"),
      "Mod-Shift-8": () => this.editor.commands.setBlockList("oli"),
      // TODO: Add shortcuts for numbered and bullet list
    };
  },
});
