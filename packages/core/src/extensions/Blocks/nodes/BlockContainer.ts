import { mergeAttributes, Node } from "@tiptap/core";
import { Slice } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { BlockUpdate } from "../apiTypes";
import { getBlockInfoFromPos } from "../helpers/getBlockInfoFromPos";
import { PreviousBlockTypePlugin } from "../PreviousBlockTypePlugin";
import styles from "./Block.module.css";
import BlockAttributes from "./BlockAttributes";

// TODO
export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    block: {
      BNCreateBlock: (pos: number) => ReturnType;
      BNDeleteBlock: (posInBlock: number) => ReturnType;
      BNMergeBlocks: (posBetweenBlocks: number) => ReturnType;
      BNSplitBlock: (posInBlock: number, keepType: boolean) => ReturnType;
      BNUpdateBlock: (
        posInBlock: number,
        blockUpdate: BlockUpdate
      ) => ReturnType;
      BNCreateOrUpdateBlock: (
        posInBlock: number,
        blockUpdate: BlockUpdate
      ) => ReturnType;
    };
  }
}

/**
 * The main "Block node" documents consist of
 */
export const BlockContainer = Node.create<IBlock>({
  name: "blockContainer",
  group: "blockContainer",
  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "blockContent blockGroup?",
  // Ensures content-specific keyboard handlers trigger first.
  priority: 50,
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      blockColor: {
        default: undefined,
      },
      blockStyle: {
        default: undefined,
      },
    };
  },

  parseHTML() {
    return [
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

          if (element.getAttribute("data-node-type") === "blockContainer") {
            return attrs;
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: styles.blockOuter,
        "data-node-type": "block-outer",
      }),
      [
        "div",
        mergeAttributes(HTMLAttributes, {
          // TODO: maybe remove html attributes from inner block
          class: styles.block,
          "data-node-type": this.name,
        }),
        0,
      ],
    ];
  },

  addCommands() {
    return {
      // Creates a new text block at a given position.
      BNCreateBlock:
        (pos) =>
        ({ state, dispatch }) => {
          const newBlock =
            state.schema.nodes["blockContainer"].createAndFill()!;

          if (dispatch) {
            state.tr.insert(pos, newBlock);
          }

          return true;
        },
      // Deletes a block at a given position and sets the selection to where the block was.
      BNDeleteBlock:
        (posInBlock) =>
        ({ state, view, dispatch }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { startPos, endPos } = blockInfo;

          if (dispatch) {
            state.tr.deleteRange(startPos, endPos);
            state.tr.setSelection(
              new TextSelection(state.doc.resolve(startPos + 1))
            );
            view.focus();
          }

          return true;
        },
      // Appends the text contents of a block to the nearest previous block, given a position between them. Children of
      // the merged block are moved out of it first, rather than also being merged.
      //
      // In the example below, the position passed into the function is between Block1 and Block2.
      //
      // Block1
      //    Block2
      // Block3
      //    Block4
      //        Block5
      //
      // Becomes:
      //
      // Block1
      //    Block2Block3
      // Block4
      //     Block5
      BNMergeBlocks:
        (posBetweenBlocks) =>
        ({ state, dispatch }) => {
          const nextNodeIsBlock =
            state.doc.resolve(posBetweenBlocks + 1).node().type.name ===
            "blockContainer";
          const prevNodeIsBlock =
            state.doc.resolve(posBetweenBlocks - 1).node().type.name ===
            "blockContainer";

          if (!nextNodeIsBlock || !prevNodeIsBlock) {
            return false;
          }

          const nextBlockInfo = getBlockInfoFromPos(
            state.doc,
            posBetweenBlocks + 1
          );

          const { node, contentNode, startPos, endPos, depth } = nextBlockInfo!;

          // Removes a level of nesting all children of the next block by 1 level, if it contains both content and block
          // group nodes.
          if (node.childCount === 2) {
            const childBlocksStart = state.doc.resolve(
              startPos + contentNode.nodeSize + 1
            );
            const childBlocksEnd = state.doc.resolve(endPos - 1);
            const childBlocksRange =
              childBlocksStart.blockRange(childBlocksEnd);

            // Moves the block group node inside the block into the block group node that the current block is in.
            if (dispatch) {
              state.tr.lift(childBlocksRange!, depth - 1);
            }
          }

          let prevBlockEndPos = posBetweenBlocks - 1;
          let prevBlockInfo = getBlockInfoFromPos(state.doc, prevBlockEndPos);

          // Finds the nearest previous block, regardless of nesting level.
          while (prevBlockInfo!.numChildBlocks > 0) {
            prevBlockEndPos--;
            prevBlockInfo = getBlockInfoFromPos(state.doc, prevBlockEndPos);
            if (prevBlockInfo === undefined) {
              return false;
            }
          }

          // Deletes next block and adds its text content to the nearest previous block.
          // TODO: Is there any situation where we need the whole block content, not just text? Implementation for this
          //  is trickier.
          if (dispatch) {
            state.tr.deleteRange(startPos, startPos + contentNode.nodeSize);
            state.tr.insertText(contentNode.textContent, prevBlockEndPos - 1);
            state.tr.setSelection(
              new TextSelection(state.doc.resolve(prevBlockEndPos - 1))
            );
          }

          return true;
        },
      // Splits a block at a given position. Content after the position is moved to a new block below, at the same
      // nesting level.
      BNSplitBlock:
        (posInBlock, keepType) =>
        ({ state, dispatch }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { contentNode, contentType, startPos, endPos, depth } =
            blockInfo;

          const newBlockInsertionPos = endPos + 1;

          // Creates new block first, otherwise positions get changed due to the original block's content changing.
          // Only text content is transferred to the new block.
          const secondBlockContent = state.doc.textBetween(posInBlock, endPos);

          const newBlock =
            state.schema.nodes["blockContainer"].createAndFill()!;
          const newBlockContentPos = newBlockInsertionPos + 2;

          if (dispatch) {
            state.tr.insert(newBlockInsertionPos, newBlock);
            state.tr.insertText(secondBlockContent, newBlockContentPos);

            if (keepType) {
              state.tr.setBlockType(
                newBlockContentPos,
                newBlockContentPos,
                state.schema.node(contentType).type,
                contentNode.attrs
              );
            }
          }

          // Updates content of original block.
          const firstBlockContent = state.doc.content.cut(startPos, posInBlock);

          if (dispatch) {
            state.tr.replace(
              startPos,
              endPos,
              new Slice(firstBlockContent, depth, depth)
            );
          }

          return true;
        },
      // Changes the content of a block at a given position to a given type.
      BNUpdateBlock:
        (posInBlock, blockUpdate) =>
        ({ state, dispatch }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { node, startPos, contentNode } = blockInfo;

          if (dispatch) {
            state.tr.setBlockType(
              startPos + 1,
              startPos + contentNode.nodeSize + 1,
              state.schema.node(blockUpdate.type).type,
              {
                ...node.attrs,
                ...blockUpdate.props,
              }
            );
          }

          return true;
        },
      // Changes the block at a given position to a given content type if it's empty, otherwise creates a new block of
      // that type below it.
      BNCreateOrUpdateBlock:
        (posInBlock, blockUpdate) =>
        ({ state, chain }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { node, startPos, endPos } = blockInfo;

          if (node.textContent.length === 0) {
            const oldBlockContentPos = startPos + 1;

            return chain()
              .BNUpdateBlock(posInBlock, blockUpdate)
              .setTextSelection(oldBlockContentPos)
              .run();
          } else {
            const newBlockInsertionPos = endPos + 1;
            const newBlockContentPos = newBlockInsertionPos + 1;

            return chain()
              .BNCreateBlock(newBlockInsertionPos)
              .BNUpdateBlock(newBlockContentPos, blockUpdate)
              .setTextSelection(newBlockContentPos)
              .run();
          }
        },
    };
  },

  addProseMirrorPlugins() {
    return [PreviousBlockTypePlugin()];
  },

  addKeyboardShortcuts() {
    // handleBackspace is partially adapted from https://github.com/ueberdosis/tiptap/blob/ed56337470efb4fd277128ab7ef792b37cfae992/packages/core/src/extensions/keymap.ts
    const handleBackspace = () =>
      this.editor.commands.first(({ commands }) => [
        // Deletes the selection if it's not empty.
        () => commands.deleteSelection(),
        // Undoes an input rule if one was triggered in the last editor state change.
        () => commands.undoInputRule(),
        // Reverts block content type to a paragraph if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const { contentType } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const isParagraph = contentType.name === "paragraph";

            if (selectionAtBlockStart && !isParagraph) {
              return commands.BNUpdateBlock(state.selection.from, {
                type: "paragraph",
                props: {},
              });
            }

            return false;
          }),
        // Removes a level of nesting if the block is indented if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;

            if (selectionAtBlockStart) {
              return commands.liftListItem("blockContainer");
            }

            return false;
          }),
        // Merges block with the previous one if it isn't indented, isn't the first block in the doc, and the selection
        // is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const { depth, startPos } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockAtDocStart = startPos === 2;

            const posBetweenBlocks = startPos - 1;

            if (
              !blockAtDocStart &&
              selectionAtBlockStart &&
              selectionEmpty &&
              depth === 2
            ) {
              return commands.BNMergeBlocks(posBetweenBlocks);
            }

            return false;
          }),
      ]);

    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        // Removes a level of nesting if the block is empty & indented, while the selection is also empty & at the start
        // of the block.
        () =>
          commands.command(({ state }) => {
            const { node, depth } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = node.textContent.length === 0;
            const blockIndented = depth > 2;

            if (
              selectionAtBlockStart &&
              selectionEmpty &&
              blockEmpty &&
              blockIndented
            ) {
              return commands.liftListItem("blockContainer");
            }

            return false;
          }),
        // Creates a new block and moves the selection to it if the current one is empty, while the selection is also
        // empty & at the start of the block.
        () =>
          commands.command(({ state, chain }) => {
            const { node, endPos } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = node.textContent.length === 0;

            if (selectionAtBlockStart && selectionEmpty && blockEmpty) {
              const newBlockInsertionPos = endPos + 1;
              const newBlockContentPos = newBlockInsertionPos + 2;

              chain()
                .BNCreateBlock(newBlockInsertionPos)
                .setTextSelection(newBlockContentPos)
                .run();

              return true;
            }

            return false;
          }),
        // Splits the current block, moving content inside that's after the cursor to a new text block below. Also
        // deletes the selection beforehand, if it's not empty.
        () =>
          commands.command(({ state, chain }) => {
            const { node } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const blockEmpty = node.textContent.length === 0;

            if (!blockEmpty) {
              chain()
                .deleteSelection()
                .BNSplitBlock(state.selection.from, false)
                .run();

              return true;
            }

            return false;
          }),
      ]);

    return {
      Backspace: handleBackspace,
      Enter: handleEnter,
      // Always returning true for tab key presses ensures they're not captured by the browser. Otherwise, they blur the
      // editor since the browser will try to use tab for keyboard navigation.
      Tab: () => {
        this.editor.commands.sinkListItem("blockContainer");
        return true;
      },
      "Shift-Tab": () => {
        this.editor.commands.liftListItem("blockContainer");
        return true;
      },
      "Mod-Alt-0": () =>
        this.editor.commands.BNCreateBlock(
          this.editor.state.selection.anchor + 2
        ),
      "Mod-Alt-1": () =>
        this.editor.commands.BNUpdateBlock(this.editor.state.selection.anchor, {
          type: "heading",
          props: {
            level: "1",
          },
        }),
      "Mod-Alt-2": () =>
        this.editor.commands.BNUpdateBlock(this.editor.state.selection.anchor, {
          type: "heading",
          props: {
            level: "2",
          },
        }),
      "Mod-Alt-3": () =>
        this.editor.commands.BNUpdateBlock(this.editor.state.selection.anchor, {
          type: "heading",
          props: {
            level: "3",
          },
        }),
      "Mod-Shift-7": () =>
        this.editor.commands.BNUpdateBlock(this.editor.state.selection.anchor, {
          type: "bulletListItem",
          props: {},
        }),
      "Mod-Shift-8": () =>
        this.editor.commands.BNUpdateBlock(this.editor.state.selection.anchor, {
          type: "numberedListItem",
          props: {},
        }),
    };
  },
});
