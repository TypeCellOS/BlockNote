import { mergeAttributes, Node } from "@tiptap/core";
import { Selection, TextSelection } from "prosemirror-state";
import styles from "./Block.module.css";
import { PreviousBlockTypePlugin } from "../PreviousBlockTypePlugin";
import { textblockTypeInputRuleSameNodeType } from "../rule";
import { findBlock } from "../helpers/findBlock";
import { OrderedListPlugin } from "../OrderedListPlugin";
import { setBlockHeading } from "../helpers/setBlockHeading";

export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export type Level = 1 | 2 | 3;
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
  name: "tcblock",
  group: "block",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "tccontent blockGroup?",

  defining: true,

  addAttributes() {
    return {
      listType: {
        default: undefined,
        renderHTML: (attributes) => {
          return {
            "data-listType": attributes.listType,
          };
        },
        parseHTML: (element) => element.getAttribute("data-listType"),
      },
      blockColor: {
        default: undefined,
        renderHTML: (attributes) => {
          return {
            "data-blockColor": attributes.blockColor,
          };
        },
        parseHTML: (element) => element.getAttribute("data-blockColor"),
      },
      blockStyle: {
        default: undefined,
        renderHTML: (attributes) => {
          return {
            "data-blockStyle": attributes.blockStyle,
          };
        },
        parseHTML: (element) => element.getAttribute("data-blockStyle"),
      },
      headingType: {
        default: undefined,
        keepOnSplit: false,
        renderHTML: (attributes) => {
          return {
            "data-headingType": attributes.headingType,
          };
        },
        parseHTML: (element) => element.getAttribute("data-headingType"),
      },
    };
  },

  // TODO: should we parse <li>, <ol>, <h1>, etc?
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
        class: styles.blockOuter,
      }),
      [
        "div",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: styles.block,
        }),
        0,
      ],
    ];
  },

  addInputRules() {
    return [
      ...[1, 2, 3].map((level) => {
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
          if (node.type.name === "tcblock" && node.attrs["listType"]) {
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
          let newBlock =
            state.schema.nodes["tcblock"].createAndFill(attributes);
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
          if (node.type.name === "tcblock") {
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
            if (isAtStartOfNode && node.type.name === "tcblock") {
              // we're at the start of the block, so we're trying to "backspace" the bullet or indentation
              return commands.first([
                () => commands.unsetList(), // first try to remove the "list" property
                () => commands.liftListItem("tcblock"), // then try to remove a level of indentation
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
              if (isAtStartOfNode && node.type.name === "tcblock") {
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
            // joinBackward has been patched with patch-package (see /patches) to prevent this behaviour
            .joinBackward()
            .run(),

        () => commands.selectNodeBackward(), // (source: tiptap)
      ]);

    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        // Try to split the current block into 2 items:
        () => commands.splitListItem("tcblock"),
        // Otherwise, maybe we are in an empty list item. "Enter" should remove the list bullet
        ({ tr, dispatch }) => {
          const $from = tr.selection.$from;
          if ($from.depth !== 3) {
            // only needed at root level, at deeper levels it should be handled already by splitListItem
            return false;
          }
          const node = tr.selection.$anchor.node(-1);
          const nodePos = tr.selection.$anchor.posAtIndex(0, -1) - 1;

          if (node.type.name === "tcblock" && node.attrs["listType"]) {
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
      Tab: () => this.editor.commands.sinkListItem("tcblock"),
      "Shift-Tab": () => {
        return this.editor.commands.liftListItem("tcblock");
      },
      "Mod-Alt-0": () =>
        this.editor.chain().unsetList().unsetBlockHeading().run(),
      "Mod-Alt-1": () => this.editor.commands.setBlockHeading({ level: 1 }),
      "Mod-Alt-2": () => this.editor.commands.setBlockHeading({ level: 2 }),
      "Mod-Alt-3": () => this.editor.commands.setBlockHeading({ level: 3 }),
      "Mod-Shift-7": () => this.editor.commands.setBlockList("li"),
      "Mod-Shift-8": () => this.editor.commands.setBlockList("oli"),
      // TODO: Add shortcuts for numbered and bullet list
    };
  },
});
