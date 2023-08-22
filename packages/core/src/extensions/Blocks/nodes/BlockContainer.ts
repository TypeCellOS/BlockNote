import { mergeAttributes, Node } from "@tiptap/core";
import { Fragment, Node as PMNode, Slice } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import {
  blockToNode,
  inlineContentToNodes,
} from "../../../api/nodeConversions/nodeConversions";

import {
  BlockNoteDOMAttributes,
  BlockSchema,
  PartialBlock,
} from "../api/blockTypes";
import { getBlockInfoFromPos } from "../helpers/getBlockInfoFromPos";
import { PreviousBlockTypePlugin } from "../PreviousBlockTypePlugin";
import styles from "./Block.module.css";
import BlockAttributes from "./BlockAttributes";
import { mergeCSSClasses } from "../../../shared/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    block: {
      BNCreateBlock: (pos: number) => ReturnType;
      BNDeleteBlock: (posInBlock: number) => ReturnType;
      BNMergeBlocks: (posBetweenBlocks: number) => ReturnType;
      BNSplitBlock: (posInBlock: number, keepType: boolean) => ReturnType;
      BNUpdateBlock: <BSchema extends BlockSchema>(
        posInBlock: number,
        block: PartialBlock<BSchema>
      ) => ReturnType;
      BNCreateOrUpdateBlock: <BSchema extends BlockSchema>(
        posInBlock: number,
        block: PartialBlock<BSchema>
      ) => ReturnType;
    };
  }
}

/**
 * The main "Block node" documents consist of
 */
export const BlockContainer = Node.create<{
  domAttributes?: BlockNoteDOMAttributes;
}>({
  name: "blockContainer",
  group: "blockContainer",
  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "blockContent blockGroup?",
  // Ensures content-specific keyboard handlers trigger first.
  priority: 50,
  defining: true,

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const attrs: Record<string, string> = {};
          for (const [nodeAttr, HTMLAttr] of Object.entries(BlockAttributes)) {
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
    const domAttributes = this.options.domAttributes?.blockContainer || {};

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: styles.blockOuter,
        "data-node-type": "block-outer",
      }),
      [
        "div",
        mergeAttributes(
          {
            ...domAttributes,
            class: mergeCSSClasses(styles.block, domAttributes.class),
            "data-node-type": this.name,
          },
          HTMLAttributes
        ),
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
      // Deletes a block at a given position.
      BNDeleteBlock:
        (posInBlock) =>
        ({ state, dispatch }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { startPos, endPos } = blockInfo;

          if (dispatch) {
            state.tr.deleteRange(startPos, endPos);
          }

          return true;
        },
      // Updates a block at a given position.
      BNUpdateBlock:
        (posInBlock, block) =>
        ({ state, dispatch }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          const { startPos, endPos, node, contentNode } = blockInfo;

          if (dispatch) {
            // Creates `inlineContent` nodes for the updated block's inline
            // content.
            const inlineContentNodes: PMNode[] =
              // Checks if inline content is provided.
              block.content !== undefined
                ? // Checks if the provided inline content is a string or
                  // InlineContent[] type.
                  typeof block.content === "string"
                  ? // Adds a single text node with no marks.
                    [state.schema.text(block.content)]
                  : // Converts the provided inline content into PM nodes.
                    inlineContentToNodes(block.content, state.schema)
                : // Adds no `inlineContent` nodes.
                  [];

            // Gets the type of the updated block and whether it supports inline
            // content.
            const blockType = block.type || contentNode.type.name;
            const blockContentType =
              state.schema.nodes[blockType].spec.content!;

            // Creates a `blockContent` node to place the updated block's inline
            // content in.
            const finalContentNode: PMNode = state.schema.nodes[
              blockType
            ].create(
              // Both the existing attributes and provided props are added.
              {
                ...contentNode.attrs,
                ...block.props,
              },
              // Checks if the updated block supports inline content.
              blockContentType === "inline*"
                ? // Checks if inline content is provided.
                  inlineContentNodes.length > 0
                  ? // Adds the provided inline content.
                    inlineContentNodes
                  : // Adds the existing inline content.
                    contentNode.firstChild!
                : // Adds no inline content.
                  undefined
            )!;

            // Creates `blockContainer` nodes for the updated block's children.
            const finalChildNodes: PMNode[] =
              // Checks if children are provided.
              block.children !== undefined
                ? // Converts the provided children into `blockContainer` nodes.
                  block.children.map((child) =>
                    blockToNode(child, state.schema)
                  )
                : // Adds no child nodes.
                  [];

            // Creates a `blockGroup` node to place the block's children in.
            const finalBlockGroupNode: PMNode | undefined =
              // Checks if children are provided.
              finalChildNodes.length > 0
                ? // Creates a `blockGroup` node with the provided children.
                  state.schema.nodes["blockGroup"].create({}, finalChildNodes)
                : // Checks if the existing block contains a `blockGroup` node.
                node.childCount === 2
                ? // Adds the existing `blockGroup` node.
                  node.lastChild!
                : // Adds no `blockGroup` node.
                  undefined;

            // Creates a `blockContainer` node to place the updated block's
            // content and children in.
            const finalBlockNode: PMNode = state.schema.nodes[
              "blockContainer"
            ].create(
              // Both the existing attributes and provided props are added.
              {
                ...node.attrs,
                ...block.props,
              },
              // Checks if the updated block contains a `blockGroup` node.
              finalBlockGroupNode
                ? // Adds both the `blockContent` and `blockGroup` nodes.
                  [finalContentNode, finalBlockGroupNode]
                : // Adds only the `blockContent` node.
                  finalContentNode
            );

            state.tr.replaceWith(startPos - 1, endPos + 1, finalBlockNode);
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

          if (dispatch) {
            dispatch(
              state.tr
                .deleteRange(startPos, startPos + contentNode.nodeSize)
                .replace(
                  prevBlockEndPos - 1,
                  startPos,
                  new Slice(contentNode.content, 0, 0)
                )
                .scrollIntoView()
            );

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

          const originalBlockContent = state.doc.cut(startPos + 1, posInBlock);
          const newBlockContent = state.doc.cut(posInBlock, endPos - 1);

          const newBlock =
            state.schema.nodes["blockContainer"].createAndFill()!;

          const newBlockInsertionPos = endPos + 1;
          const newBlockContentPos = newBlockInsertionPos + 2;

          if (dispatch) {
            // Creates a new block. Since the schema requires it to have a content node, a paragraph node is created
            // automatically, spanning newBlockContentPos to newBlockContentPos + 1.
            state.tr.insert(newBlockInsertionPos, newBlock);

            // Replaces the content of the newly created block's content node. Doesn't replace the whole content node so
            // its type doesn't change.
            state.tr.replace(
              newBlockContentPos,
              newBlockContentPos + 1,
              newBlockContent.content.size > 0
                ? new Slice(
                    Fragment.from(newBlockContent),
                    depth + 2,
                    depth + 2
                  )
                : undefined
            );

            // Changes the type of the content node. The range doesn't matter as long as both from and to positions are
            // within the content node.
            if (keepType) {
              state.tr.setBlockType(
                newBlockContentPos,
                newBlockContentPos,
                state.schema.node(contentType).type,
                contentNode.attrs
              );
            }

            // Sets the selection to the start of the new block's content node.
            state.tr.setSelection(
              new TextSelection(state.doc.resolve(newBlockContentPos))
            );

            // Replaces the content of the original block's content node. Doesn't replace the whole content node so its
            // type doesn't change.
            state.tr.replace(
              startPos + 1,
              endPos - 1,
              originalBlockContent.content.size > 0
                ? new Slice(
                    Fragment.from(originalBlockContent),
                    depth + 2,
                    depth + 2
                  )
                : undefined
            );
          }

          return true;
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
