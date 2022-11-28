import { mergeAttributes, Node } from "@tiptap/core";
import { Slice } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import BlockAttributes from "../BlockAttributes";
import { getBlockInfoFromPos } from "../helpers/getBlockInfoFromPos";
import { PreviousBlockTypePlugin } from "../PreviousBlockTypePlugin";
import styles from "./Block.module.css";
import { HeadingContentAttributes } from "./HeadingContent";
import { ListItemContentAttributes } from "./ListItemContent";

export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export type BlockContentAttributes =
  | HeadingContentAttributes
  | ListItemContentAttributes;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    block: {
      BNCreateBlock: (pos: number) => ReturnType;
      BNDeleteBlock: (posInBlock: number) => ReturnType;
      BNMergeBlocks: (posBetweenBlocks: number) => ReturnType;
      BNSplitBlock: (posInBlock: number, keepType: boolean) => ReturnType;
      BNSetContentType: (
        posInBlock: number,
        type: string,
        attributes?: BlockContentAttributes
      ) => ReturnType;
      BNCreateBlockOrSetContentType: (
        posInBlock: number,
        type: string,
        attributes?: BlockContentAttributes
      ) => ReturnType;
    };
  }
}

/**
 * The main "Block node" documents consist of
 */
export const Block = Node.create<IBlock>({
  name: "block",
  group: "block",
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

          if (element.getAttribute("data-node-type") === "block") {
            return attrs;
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
        ({ state }) => {
          const newBlock = state.schema.nodes["block"].createAndFill()!;

          state.tr.insert(pos, newBlock);

          return true;
        },
      // Deletes a block at a given position.
      BNDeleteBlock:
        (posInBlock) =>
        ({ state }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { startPos, endPos } = blockInfo;

          state.tr.deleteRange(startPos, endPos);

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
        ({ state }) => {
          const nextBlockInfo = getBlockInfoFromPos(
            state.doc,
            posBetweenBlocks + 1
          );
          if (nextBlockInfo === undefined) {
            return false;
          }

          const { node, contentNode, startPos, endPos, depth } = nextBlockInfo;

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
            state.tr.lift(childBlocksRange!, depth - 1);
          }

          let prevBlockEndPos = posBetweenBlocks - 1;
          let prevBlockInfo = getBlockInfoFromPos(state.doc, prevBlockEndPos);
          if (prevBlockInfo === undefined) {
            return false;
          }

          // Finds the nearest previous block, prioritizing higher nesting levels.
          while (prevBlockInfo.numChildBlocks > 0) {
            prevBlockEndPos--;
            prevBlockInfo = getBlockInfoFromPos(state.doc, prevBlockEndPos);
            if (prevBlockInfo === undefined) {
              return false;
            }
          }

          // Deletes next block and adds its text content to the nearest previous block.
          // TODO: Is there any situation where we need the whole block content, not just text? Implementation for this
          //  is trickier.
          state.tr.deleteRange(startPos, startPos + contentNode.nodeSize);
          state.tr.insertText(contentNode.textContent, prevBlockEndPos - 1);
          state.tr.setSelection(
            new TextSelection(state.doc.resolve(prevBlockEndPos - 1))
          );

          return true;
        },
      // Splits a block at a given position. Content after the position is moved to a new block below, at the same
      // nesting level.
      BNSplitBlock:
        (posInBlock, keepType) =>
        ({ state }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { startPos, endPos, depth } = blockInfo;

          const newBlockInsertionPos = endPos + 1;

          // Creates new block first, otherwise positions get changed due to the original block's content changing.
          // Only text content is transferred if the content type shouldn't be kept.
          if (keepType) {
            const secondBlockContent = state.doc.content.cut(
              posInBlock,
              endPos
            );

            state.tr.replace(
              newBlockInsertionPos,
              newBlockInsertionPos,
              new Slice(secondBlockContent, depth, depth)
            );
          } else {
            const secondBlockContent = state.doc.textBetween(
              posInBlock,
              endPos
            );

            const newBlock = state.schema.nodes["block"].createAndFill()!;
            const newBlockContentPos = newBlockInsertionPos + 2;

            state.tr.insert(newBlockInsertionPos, newBlock);
            state.tr.insertText(secondBlockContent, newBlockContentPos);
          }

          // Updates content of original block.
          const firstBlockContent = state.doc.content.cut(startPos, posInBlock);

          state.tr.replace(
            startPos,
            endPos,
            new Slice(firstBlockContent, depth, depth)
          );

          return true;
        },
      // Changes the block at a given position to a given content type.
      BNSetContentType:
        (posInBlock, type, attributes) =>
        ({ state }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { startPos, endPos } = blockInfo;

          state.tr.setBlockType(
            startPos + 1,
            endPos - 1,
            state.schema.node(type).type,
            attributes
          );

          return true;
        },
      // Changes the block at a given position to a given content type if it's empty, otherwise creates a new block of
      // that type below it.
      BNCreateBlockOrSetContentType:
        (posInBlock, type, attributes) =>
        ({ state, chain }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { node, startPos, endPos } = blockInfo;

          if (node.textContent.length === 0) {
            const oldBlockContentPos = startPos + 1;

            return chain()
              .BNSetContentType(posInBlock, type, attributes)
              .setTextSelection(oldBlockContentPos)
              .run();
          } else {
            const newBlockInsertionPos = endPos + 1;
            const newBlockContentPos = newBlockInsertionPos + 1;

            return chain()
              .BNCreateBlock(newBlockInsertionPos)
              .BNSetContentType(newBlockContentPos, type, attributes)
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
        // Removes a level of nesting if the block is indented and the selection is empty at the start of the block.
        () =>
          commands.command(({ state }) => {
            const { depth } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;

            if (selectionAtBlockStart && selectionEmpty && depth > 2) {
              return commands.liftListItem("block");
            }

            return false;
          }),
        // Merges block with the previous one if it isn't indented, isn't the first block in the doc, and the selection
        // is at the start of the block.
        () =>
          commands.command(({ state, commands }) => {
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
        // Creates a new block and moves the selection to it, if the current one is empty.
        () =>
          commands.command(({ state, chain }) => {
            const { node, endPos } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            if (node.textContent.length === 0) {
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
        // Splits the current block, moving content inside that's after the cursor to a new text block below.
        () =>
          commands.command(({ state, chain }) => {
            const { node } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            if (node.textContent.length > 0) {
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
      Tab: () => this.editor.commands.sinkListItem("block"),
      "Shift-Tab": () => this.editor.commands.liftListItem("block"),
      "Mod-Alt-0": () =>
        this.editor.commands.BNSetContentType(
          this.editor.state.selection.anchor,
          "textContent"
        ),
      "Mod-Alt-1": () =>
        this.editor.commands.BNSetContentType(
          this.editor.state.selection.anchor,
          "headingContent",
          {
            level: "1",
          }
        ),
      "Mod-Alt-2": () =>
        this.editor.commands.BNSetContentType(
          this.editor.state.selection.anchor,
          "headingContent",
          {
            level: "2",
          }
        ),
      "Mod-Alt-3": () =>
        this.editor.commands.BNSetContentType(
          this.editor.state.selection.anchor,
          "headingContent",
          {
            level: "3",
          }
        ),
      "Mod-Shift-7": () =>
        this.editor.commands.BNSetContentType(
          this.editor.state.selection.anchor,
          "listItemContent",
          {
            type: "unordered",
          }
        ),
      "Mod-Shift-8": () =>
        this.editor.commands.BNSetContentType(
          this.editor.state.selection.anchor,
          "listItemContent",
          {
            type: "ordered",
          }
        ),
    };
  },
});
