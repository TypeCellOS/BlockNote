import { Extension } from "@tiptap/core";
import { Fragment, Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";

import {
  getBottomNestedBlockInfo,
  getNextBlockInfo,
  getParentBlockInfo,
  getPrevBlockInfo,
  mergeBlocksCommand,
} from "../../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import { nestBlock } from "../../../api/blockManipulation/commands/nestBlock/nestBlock.js";
import { fixColumnList } from "../../../api/blockManipulation/commands/replaceBlocks/util/fixColumnList.js";
import { splitBlockCommand } from "../../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockCommand } from "../../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
  getBlockInfoFromResolvedPos,
  getBlockInfoFromSelection,
} from "../../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { FormattingToolbarExtension } from "../../FormattingToolbar/FormattingToolbar.js";
import { FilePanelExtension } from "../../FilePanel/FilePanel.js";

export const KeyboardShortcutsExtension = Extension.create<{
  editor: BlockNoteEditor<any, any, any>;
  tabBehavior: "prefer-navigate-ui" | "prefer-indent";
}>({
  priority: 50,

  // TODO: The shortcuts need a refactor. Do we want to use a command priority
  //  design as there is now, or clump the logic into a single function?
  addKeyboardShortcuts() {
    // handleBackspace is partially adapted from https://github.com/ueberdosis/tiptap/blob/ed56337470efb4fd277128ab7ef792b37cfae992/packages/core/src/extensions/keymap.ts
    const handleBackspace = () =>
      this.editor.commands.first(({ chain, commands }) => [
        // Deletes the selection if it's not empty.
        () => commands.deleteSelection(),
        // Undoes an input rule if one was triggered in the last editor state change.
        () => commands.undoInputRule(),
        // Reverts block content type to a paragraph if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockInfo.blockContent.beforePos + 1;
            const isParagraph =
              blockInfo.blockContent.node.type.name === "paragraph";

            if (selectionAtBlockStart && !isParagraph) {
              return commands.command(
                updateBlockCommand(blockInfo.bnBlock.beforePos, {
                  type: "paragraph",
                  props: {},
                }),
              );
            }

            return false;
          }),
        // Removes a level of nesting if the block is indented if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { blockContent } = blockInfo;

            const selectionAtBlockStart =
              state.selection.from === blockContent.beforePos + 1;

            if (selectionAtBlockStart) {
              return commands.liftListItem("blockContainer");
            }

            return false;
          }),
        // Merges block with the previous one if it isn't indented, and the selection is at the start of the
        // block. The target block for merging must contain inline content.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { bnBlock: blockContainer, blockContent } = blockInfo;

            const prevBlockInfo = getPrevBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );
            if (
              !prevBlockInfo ||
              !prevBlockInfo.isBlockContainer ||
              prevBlockInfo.blockContent.node.type.spec.content !== "inline*"
            ) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockContent.beforePos + 1;
            const selectionEmpty = state.selection.empty;

            const posBetweenBlocks = blockContainer.beforePos;

            if (selectionAtBlockStart && selectionEmpty) {
              return chain()
                .command(mergeBlocksCommand(posBetweenBlocks))
                .scrollIntoView()
                .run();
            }

            return false;
          }),
        // If the previous block is a columnList, moves the current block to
        // the end of the last column in it.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const prevBlockInfo = getPrevBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );
            if (!prevBlockInfo || prevBlockInfo.isBlockContainer) {
              return false;
            }

            if (dispatch) {
              const columnAfterPos = prevBlockInfo.bnBlock.afterPos - 1;
              const $blockAfterPos = tr.doc.resolve(columnAfterPos - 1);

              tr.delete(
                blockInfo.bnBlock.beforePos,
                blockInfo.bnBlock.afterPos,
              );
              tr.insert($blockAfterPos.pos, blockInfo.bnBlock.node);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve($blockAfterPos.pos + 1)),
              );

              return true;
            }

            return false;
          }),
        // If the block is the first in a column, moves it to the end of the
        // previous column. If there is no previous column, moves it above the
        // columnList.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const selectionAtBlockStart =
              tr.selection.from === blockInfo.blockContent.beforePos + 1;
            if (!selectionAtBlockStart) {
              return false;
            }

            const $pos = tr.doc.resolve(blockInfo.bnBlock.beforePos);

            const prevBlock = $pos.nodeBefore;
            if (prevBlock) {
              return false;
            }

            const parentBlock = $pos.node();
            if (parentBlock.type.name !== "column") {
              return false;
            }

            const $blockPos = tr.doc.resolve(blockInfo.bnBlock.beforePos);
            const $columnPos = tr.doc.resolve($blockPos.before());
            const columnListPos = $columnPos.before();

            if (dispatch) {
              tr.delete(
                blockInfo.bnBlock.beforePos,
                blockInfo.bnBlock.afterPos,
              );
              fixColumnList(tr, columnListPos);

              if ($columnPos.pos === columnListPos + 1) {
                tr.insert(columnListPos, blockInfo.bnBlock.node);
                tr.setSelection(
                  TextSelection.near(tr.doc.resolve(columnListPos)),
                );
              } else {
                tr.insert($columnPos.pos - 1, blockInfo.bnBlock.node);
                tr.setSelection(
                  TextSelection.near(tr.doc.resolve($columnPos.pos)),
                );
              }
            }

            return true;
          }),
        // Deletes the current block if it's an empty block with inline content,
        // and moves the selection to the previous block.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const blockEmpty =
              blockInfo.blockContent.node.childCount === 0 &&
              blockInfo.blockContent.node.type.spec.content === "inline*";

            if (blockEmpty) {
              const prevBlockInfo = getPrevBlockInfo(
                state.doc,
                blockInfo.bnBlock.beforePos,
              );
              if (!prevBlockInfo || !prevBlockInfo.isBlockContainer) {
                return false;
              }

              let chainedCommands = chain();

              // Moves the children of the current block to the previous one.
              if (blockInfo.childContainer) {
                chainedCommands.insertContentAt(
                  blockInfo.bnBlock.afterPos,
                  blockInfo.childContainer?.node.content,
                );
              }

              if (
                prevBlockInfo.blockContent.node.type.spec.content ===
                "tableRow+"
              ) {
                const tableBlockEndPos = blockInfo.bnBlock.beforePos - 1;
                const tableBlockContentEndPos = tableBlockEndPos - 1;
                const lastRowEndPos = tableBlockContentEndPos - 1;
                const lastCellEndPos = lastRowEndPos - 1;
                const lastCellParagraphEndPos = lastCellEndPos - 1;

                chainedCommands = chainedCommands.setTextSelection(
                  lastCellParagraphEndPos,
                );
              } else if (
                prevBlockInfo.blockContent.node.type.spec.content === ""
              ) {
                chainedCommands = chainedCommands.setNodeSelection(
                  prevBlockInfo.blockContent.beforePos,
                );
              } else {
                const blockContentStartPos =
                  prevBlockInfo.blockContent.afterPos - 1;

                chainedCommands =
                  chainedCommands.setTextSelection(blockContentStartPos);
              }

              return chainedCommands
                .deleteRange({
                  from: blockInfo.bnBlock.beforePos,
                  to: blockInfo.bnBlock.afterPos,
                })
                .scrollIntoView()
                .run();
            }

            return false;
          }),
        // Deletes previous block if it contains no content and isn't a table,
        // when the selection is empty and at the start of the block. Moves the
        // current block into the deleted block's place.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);

            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockInfo.blockContent.beforePos + 1;
            const selectionEmpty = state.selection.empty;

            const prevBlockInfo = getPrevBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );

            if (prevBlockInfo && selectionAtBlockStart && selectionEmpty) {
              const bottomBlock = getBottomNestedBlockInfo(
                state.doc,
                prevBlockInfo,
              );

              if (!bottomBlock.isBlockContainer) {
                return false;
              }

              const prevBlockNotTableAndNoContent =
                bottomBlock.blockContent.node.type.spec.content === "" ||
                (bottomBlock.blockContent.node.type.spec.content ===
                  "inline*" &&
                  bottomBlock.blockContent.node.childCount === 0);

              if (prevBlockNotTableAndNoContent) {
                return chain()
                  .cut(
                    {
                      from: blockInfo.bnBlock.beforePos,
                      to: blockInfo.bnBlock.afterPos,
                    },
                    bottomBlock.bnBlock.afterPos,
                  )
                  .deleteRange({
                    from: bottomBlock.bnBlock.beforePos,
                    to: bottomBlock.bnBlock.afterPos,
                  })
                  .run();
              }
            }

            return false;
          }),
      ]);

    const handleDelete = () =>
      this.editor.commands.first(({ chain, commands }) => [
        // Deletes the selection if it's not empty.
        () => commands.deleteSelection(),
        // Deletes the first child block and un-nests its children, if the
        // selection is empty and at the end of the current block. If both the
        // parent and child blocks have inline content, the child block's
        // content is appended to the parent's. The child block's own children
        // are unindented before it's deleted.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer || !blockInfo.childContainer) {
              return false;
            }
            const { blockContent, childContainer } = blockInfo;

            const selectionAtBlockEnd =
              state.selection.from === blockContent.afterPos - 1;
            const selectionEmpty = state.selection.empty;

            const firstChildBlockInfo = getBlockInfoFromResolvedPos(
              state.doc.resolve(childContainer.beforePos + 1),
            );
            if (!firstChildBlockInfo.isBlockContainer) {
              return false;
            }

            if (selectionAtBlockEnd && selectionEmpty) {
              const firstChildBlockContent =
                firstChildBlockInfo.blockContent.node;
              const firstChildBlockHasInlineContent =
                firstChildBlockContent.type.spec.content === "inline*";
              const blockHasInlineContent =
                blockContent.node.type.spec.content === "inline*";

              return (
                chain()
                  // Un-nests child block's children if necessary.
                  .insertContentAt(
                    firstChildBlockInfo.bnBlock.afterPos,
                    firstChildBlockInfo.childContainer?.node.content ||
                      Fragment.empty,
                  )
                  .deleteRange(
                    // Deletes whole child container if there's only one child.
                    childContainer.node.childCount === 1
                      ? {
                          from: childContainer.beforePos,
                          to: childContainer.afterPos,
                        }
                      : {
                          from: firstChildBlockInfo.bnBlock.beforePos,
                          to: firstChildBlockInfo.bnBlock.afterPos,
                        },
                  )
                  // Appends inline content from child block if possible.
                  .insertContentAt(
                    state.selection.from,
                    firstChildBlockHasInlineContent && blockHasInlineContent
                      ? firstChildBlockContent.content
                      : null,
                  )
                  .setTextSelection(state.selection.from)
                  .scrollIntoView()
                  .run()
              );
            }

            return false;
          }),
        // Merges block with the next one (at the same nesting level or lower),
        // if one exists, the block has no children, and the selection is at the
        // end of the block.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { bnBlock: blockContainer, blockContent } = blockInfo;

            const nextBlockInfo = getNextBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );
            if (!nextBlockInfo || !nextBlockInfo.isBlockContainer) {
              return false;
            }

            const selectionAtBlockEnd =
              state.selection.from === blockContent.afterPos - 1;
            const selectionEmpty = state.selection.empty;

            const posBetweenBlocks = blockContainer.afterPos;

            if (selectionAtBlockEnd && selectionEmpty) {
              return chain()
                .command(mergeBlocksCommand(posBetweenBlocks))
                .scrollIntoView()
                .run();
            }

            return false;
          }),
        // If the previous block is a columnList, moves the current block to
        // the end of the last column in it.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const nextBlockInfo = getNextBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );
            if (!nextBlockInfo || nextBlockInfo.isBlockContainer) {
              return false;
            }

            if (dispatch) {
              const columnBeforePos = nextBlockInfo.bnBlock.beforePos + 1;
              const $blockBeforePos = tr.doc.resolve(columnBeforePos + 1);

              tr.delete(
                $blockBeforePos.pos,
                $blockBeforePos.pos + $blockBeforePos.nodeAfter!.nodeSize,
              );
              fixColumnList(tr, nextBlockInfo.bnBlock.beforePos);
              tr.insert(blockInfo.bnBlock.afterPos, $blockBeforePos.nodeAfter!);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve($blockBeforePos.pos)),
              );

              return true;
            }

            return false;
          }),
        // If the block is the last in a column, moves it to the start of the
        // next column. If there is no next column, moves it below the
        // columnList.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const selectionAtBlockEnd =
              tr.selection.from === blockInfo.blockContent.afterPos - 1;
            if (!selectionAtBlockEnd) {
              return false;
            }

            const $pos = tr.doc.resolve(blockInfo.bnBlock.afterPos);

            const nextBlock = $pos.nodeAfter;
            if (nextBlock) {
              return false;
            }

            const parentBlock = $pos.node();
            if (parentBlock.type.name !== "column") {
              return false;
            }

            const $blockEndPos = tr.doc.resolve(blockInfo.bnBlock.afterPos);
            const $columnEndPos = tr.doc.resolve($blockEndPos.after());
            const columnListEndPos = $columnEndPos.after();

            if (dispatch) {
              // Position before first block in next column, or first block
              // after columnList if there is no next column.
              const nextBlockBeforePos =
                $columnEndPos.pos === columnListEndPos - 1
                  ? columnListEndPos
                  : $columnEndPos.pos + 1;
              const nextBlockInfo = getBlockInfoFromResolvedPos(
                tr.doc.resolve(nextBlockBeforePos),
              );

              tr.delete(
                nextBlockInfo.bnBlock.beforePos,
                nextBlockInfo.bnBlock.afterPos,
              );
              fixColumnList(
                tr,
                columnListEndPos - $columnEndPos.node().nodeSize,
              );
              tr.insert($blockEndPos.pos, nextBlockInfo.bnBlock.node);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve(nextBlockBeforePos)),
              );
            }

            return true;
          }),
        // Deletes the next block at either the same or lower nesting level, if
        // the selection is empty and at the end of the block. If both the
        // current and next blocks have inline content, the next block's
        // content is appended to the current block's. The next block's own 
        // children are unindented before it's deleted.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { blockContent } = blockInfo;

            const selectionAtBlockEnd =
              state.selection.from === blockContent.afterPos - 1;
            const selectionEmpty = state.selection.empty;

            if (selectionAtBlockEnd && selectionEmpty) {
              const getNextBlockInfoAtAnyLevel = (
                doc: Node,
                beforePos: number,
              ) => {
                const nextBlockInfo = getNextBlockInfo(doc, beforePos);
                if (nextBlockInfo) {
                  return nextBlockInfo;
                }

                const parentBlockInfo = getParentBlockInfo(doc, beforePos);
                if (!parentBlockInfo) {
                  return undefined;
                }

                return getNextBlockInfoAtAnyLevel(
                  doc,
                  parentBlockInfo.bnBlock.beforePos,
                );
              };

              const nextBlockInfo = getNextBlockInfoAtAnyLevel(
                state.doc,
                blockInfo.bnBlock.beforePos,
              );
              if (!nextBlockInfo || !nextBlockInfo.isBlockContainer) {
                return false;
              }

              const nextBlockContent = nextBlockInfo.blockContent.node;
              const nextBlockHasInlineContent =
                nextBlockContent.type.spec.content === "inline*";
              const blockHasInlineContent =
                blockContent.node.type.spec.content === "inline*";

              return (
                chain()
                  // Un-nests next block's children if necessary.
                  .insertContentAt(
                    nextBlockInfo.bnBlock.afterPos,
                    nextBlockInfo.childContainer?.node.content ||
                      Fragment.empty,
                  )
                  .deleteRange({
                    from: nextBlockInfo.bnBlock.beforePos,
                    to: nextBlockInfo.bnBlock.afterPos,
                  })
                  // Appends inline content from child block if possible.
                  .insertContentAt(
                    state.selection.from,
                    nextBlockHasInlineContent && blockHasInlineContent
                      ? nextBlockContent.content
                      : null,
                  )
                  .setTextSelection(state.selection.from)
                  .scrollIntoView()
                  .run()
              );
            }

            return false;
          }),
        // Deletes the current block if it's an empty block with inline content,
        // and moves the selection to the next block.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const blockEmpty =
              blockInfo.blockContent.node.childCount === 0 &&
              blockInfo.blockContent.node.type.spec.content === "inline*";

            if (blockEmpty) {
              const nextBlockInfo = getNextBlockInfo(
                state.doc,
                blockInfo.bnBlock.beforePos,
              );
              if (!nextBlockInfo || !nextBlockInfo.isBlockContainer) {
                return false;
              }

              let chainedCommands = chain();

              if (
                nextBlockInfo.blockContent.node.type.spec.content ===
                "tableRow+"
              ) {
                const tableBlockStartPos = blockInfo.bnBlock.afterPos + 1;
                const tableBlockContentStartPos = tableBlockStartPos + 1;
                const firstRowStartPos = tableBlockContentStartPos + 1;
                const firstCellStartPos = firstRowStartPos + 1;
                const firstCellParagraphStartPos = firstCellStartPos + 1;

                chainedCommands = chainedCommands.setTextSelection(
                  firstCellParagraphStartPos,
                );
              } else if (
                nextBlockInfo.blockContent.node.type.spec.content === ""
              ) {
                chainedCommands = chainedCommands.setNodeSelection(
                  nextBlockInfo.blockContent.beforePos,
                );
              } else {
                chainedCommands = chainedCommands.setTextSelection(
                  nextBlockInfo.blockContent.beforePos + 1,
                );
              }

              return chainedCommands
                .deleteRange({
                  from: blockInfo.bnBlock.beforePos,
                  to: blockInfo.bnBlock.afterPos,
                })
                .scrollIntoView()
                .run();
            }

            return false;
          }),
        // Deletes next block if it contains no content and isn't a table,
        // when the selection is empty and at the end of the block. Moves the
        // current block into the deleted block's place.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);

            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const selectionAtBlockEnd =
              state.selection.from === blockInfo.blockContent.afterPos - 1;
            const selectionEmpty = state.selection.empty;

            const nextBlockInfo = getNextBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );
            if (!nextBlockInfo) {
              return false;
            }
            if (!nextBlockInfo.isBlockContainer) {
              return false;
            }

            if (nextBlockInfo && selectionAtBlockEnd && selectionEmpty) {
              const nextBlockNotTableAndNoContent =
                nextBlockInfo.blockContent.node.type.spec.content === "" ||
                (nextBlockInfo.blockContent.node.type.spec.content ===
                  "inline*" &&
                  nextBlockInfo.blockContent.node.childCount === 0);

              if (nextBlockNotTableAndNoContent) {
                if (nextBlockInfo.bnBlock.node.childCount === 2) {
                  const childBlocks =
                    nextBlockInfo.bnBlock.node.lastChild!.content;
                  return chain()
                    .deleteRange({
                      from: nextBlockInfo.bnBlock.beforePos,
                      to: nextBlockInfo.bnBlock.afterPos,
                    })
                    .insertContentAt(blockInfo.bnBlock.afterPos, childBlocks)
                    .run();
                }

                return chain()
                  .deleteRange({
                    from: nextBlockInfo.bnBlock.beforePos,
                    to: nextBlockInfo.bnBlock.afterPos,
                  })
                  .run();
              }
            }

            return false;
          }),
      ]);

    const handleEnter = (withShift = false) => {
      return this.editor.commands.first(({ commands, tr }) => [
        // Removes a level of nesting if the block is empty & indented, while the selection is also empty & at the start
        // of the block.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { bnBlock: blockContainer, blockContent } = blockInfo;

            const { depth } = state.doc.resolve(blockContainer.beforePos);

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = blockContent.node.childCount === 0;
            const blockIndented = depth > 1;

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
        // Creates a hard break if block is configured to do so.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);

            const blockHardBreakShortcut =
              this.options.editor.schema.blockSchema[
                blockInfo.blockNoteType as keyof typeof this.options.editor.schema.blockSchema
              ].meta?.hardBreakShortcut ?? "shift+enter";

            if (blockHardBreakShortcut === "none") {
              return false;
            }

            if (
              // If shortcut is not configured, or is configured as "shift+enter",
              // create a hard break for shift+enter, but not for enter.
              (blockHardBreakShortcut === "shift+enter" && withShift) ||
              // If shortcut is configured as "enter", create a hard break for
              // both enter and shift+enter.
              blockHardBreakShortcut === "enter"
            ) {
              const marks =
                tr.storedMarks ||
                tr.selection.$head
                  .marks()
                  .filter((m) =>
                    this.editor.extensionManager.splittableMarks.includes(
                      m.type.name,
                    ),
                  );

              tr.insert(
                tr.selection.head,
                tr.doc.type.schema.nodes.hardBreak.create(),
              ).ensureMarks(marks);
              return true;
            }

            return false;
          }),
        // Creates a new block and moves the selection to it if the current one is empty, while the selection is also
        // empty & at the start of the block.
        () =>
          commands.command(({ state, dispatch, tr }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { bnBlock: blockContainer, blockContent } = blockInfo;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = blockContent.node.childCount === 0;

            if (selectionAtBlockStart && selectionEmpty && blockEmpty) {
              const newBlockInsertionPos = blockContainer.afterPos;
              const newBlockContentPos = newBlockInsertionPos + 2;

              if (dispatch) {
                // Creates a new block with the children of the current block,
                // if it has any.
                const newBlock = state.schema.nodes[
                  "blockContainer"
                ].createAndFill(
                  undefined,
                  [
                    state.schema.nodes["paragraph"].createAndFill() ||
                      undefined,
                    blockInfo.childContainer?.node,
                  ].filter((node) => node !== undefined),
                )!;

                // Inserts the new block and moves the selection to it.
                tr.insert(newBlockInsertionPos, newBlock)
                  .setSelection(
                    new TextSelection(tr.doc.resolve(newBlockContentPos)),
                  )
                  .scrollIntoView();

                // Deletes old block's children, as they have been moved to
                // the new one.
                if (blockInfo.childContainer) {
                  tr.delete(
                    blockInfo.childContainer.beforePos,
                    blockInfo.childContainer.afterPos,
                  );
                }
              }

              return true;
            }

            return false;
          }),
        // Splits the current block, moving content inside that's after the cursor to a new text block below. Also
        // deletes the selection beforehand, if it's not empty.
        () =>
          commands.command(({ state, chain }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { blockContent } = blockInfo;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const blockEmpty = blockContent.node.childCount === 0;

            if (!blockEmpty) {
              chain()
                .deleteSelection()
                .command(
                  splitBlockCommand(
                    state.selection.from,
                    selectionAtBlockStart,
                    selectionAtBlockStart,
                  ),
                )
                .run();

              return true;
            }

            return false;
          }),
      ]);
    };

    return {
      Backspace: handleBackspace,
      Delete: handleDelete,
      Enter: () => handleEnter(),
      "Shift-Enter": () => handleEnter(true),
      // Always returning true for tab key presses ensures they're not captured by the browser. Otherwise, they blur the
      // editor since the browser will try to use tab for keyboard navigation.
      Tab: () => {
        if (
          this.options.tabBehavior !== "prefer-indent" &&
          (this.options.editor.getExtension(FormattingToolbarExtension)?.store
            .state ||
            this.options.editor.getExtension(FilePanelExtension)?.store
              .state !== undefined)
          // TODO need to check if the link toolbar is open or another alternative entirely
        ) {
          // don't handle tabs if a toolbar is shown, so we can tab into / out of it
          return false;
        }
        return nestBlock(this.options.editor);
      },
      "Shift-Tab": () => {
        if (
          this.options.tabBehavior !== "prefer-indent" &&
          (this.options.editor.getExtension(FormattingToolbarExtension)?.store
            .state ||
            this.options.editor.getExtension(FilePanelExtension)?.store
              .state !== undefined)
          // TODO need to check if the link toolbar is open or another alternative entirely
          // other menu types?
        ) {
          // don't handle tabs if a toolbar is shown, so we can tab into / out of it
          return false;
        }
        return this.editor.commands.liftListItem("blockContainer");
      },
      "Shift-Mod-ArrowUp": () => {
        this.options.editor.moveBlocksUp();
        return true;
      },
      "Shift-Mod-ArrowDown": () => {
        this.options.editor.moveBlocksDown();
        return true;
      },
      "Mod-z": () => this.options.editor.undo(),
      "Mod-y": () => this.options.editor.redo(),
      "Shift-Mod-z": () => this.options.editor.redo(),
    };
  },
});
