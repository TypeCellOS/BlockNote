import { Extension } from "@tiptap/core";

import { TextSelection } from "prosemirror-state";
import { ReplaceAroundStep } from "prosemirror-transform";
import {
  getBottomNestedBlockInfo,
  getParentBlockInfo,
  getPrevBlockInfo,
  mergeBlocksCommand,
} from "../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import { nestBlock } from "../../api/blockManipulation/commands/nestBlock/nestBlock.js";
import { splitBlockCommand } from "../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

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
        () =>
          commands.command(({ state, dispatch }) => {
            // when at the start of a first block in a column
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockInfo.blockContent.beforePos + 1;

            if (!selectionAtBlockStart) {
              return false;
            }

            const prevBlockInfo = getPrevBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );

            if (prevBlockInfo) {
              // should be no previous block
              return false;
            }

            const parentBlockInfo = getParentBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );

            if (parentBlockInfo?.blockNoteType !== "column") {
              return false;
            }

            const column = parentBlockInfo;

            const columnList = getParentBlockInfo(
              state.doc,
              column.bnBlock.beforePos,
            );
            if (columnList?.blockNoteType !== "columnList") {
              throw new Error("parent of column is not a column list");
            }

            const shouldRemoveColumn =
              column.childContainer!.node.childCount === 1;

            const shouldRemoveColumnList =
              shouldRemoveColumn &&
              columnList.childContainer!.node.childCount === 2;

            const isFirstColumn =
              columnList.childContainer!.node.firstChild ===
              column.bnBlock.node;

            if (dispatch) {
              const blockToMove = state.doc.slice(
                blockInfo.bnBlock.beforePos,
                blockInfo.bnBlock.afterPos,
                false,
              );

              /*
              There are 3 different cases:
              a) remove entire column list (if no columns would be remaining)
              b) remove just a column (if no blocks inside a column would be remaining)
              c) keep columns (if there are blocks remaining inside a column)

              Each of these 3 cases has 2 sub-cases, depending on whether the backspace happens at the start of the first (most-left) column,
              or at the start of a non-first column.
              */
              if (shouldRemoveColumnList) {
                if (isFirstColumn) {
                  state.tr.step(
                    new ReplaceAroundStep(
                      // replace entire column list
                      columnList.bnBlock.beforePos,
                      columnList.bnBlock.afterPos,
                      // select content of remaining column:
                      column.bnBlock.afterPos + 1,
                      columnList.bnBlock.afterPos - 2,
                      blockToMove,
                      blockToMove.size, // append existing content to blockToMove
                      false,
                    ),
                  );
                  const pos = state.tr.doc.resolve(column.bnBlock.beforePos);
                  state.tr.setSelection(TextSelection.between(pos, pos));
                } else {
                  // replaces the column list with the blockToMove slice, prepended with the content of the remaining column
                  state.tr.step(
                    new ReplaceAroundStep(
                      // replace entire column list
                      columnList.bnBlock.beforePos,
                      columnList.bnBlock.afterPos,
                      // select content of existing column:
                      columnList.bnBlock.beforePos + 2,
                      column.bnBlock.beforePos - 1,
                      blockToMove,
                      0, // prepend existing content to blockToMove
                      false,
                    ),
                  );
                  const pos = state.tr.doc.resolve(
                    state.tr.mapping.map(column.bnBlock.beforePos - 1),
                  );
                  state.tr.setSelection(TextSelection.between(pos, pos));
                }
              } else if (shouldRemoveColumn) {
                if (isFirstColumn) {
                  // delete column
                  state.tr.delete(
                    column.bnBlock.beforePos,
                    column.bnBlock.afterPos,
                  );

                  // move before columnlist
                  state.tr.insert(
                    columnList.bnBlock.beforePos,
                    blockToMove.content,
                  );

                  const pos = state.tr.doc.resolve(
                    columnList.bnBlock.beforePos,
                  );
                  state.tr.setSelection(TextSelection.between(pos, pos));
                } else {
                  // just delete the </column><column> closing and opening tags to merge the columns
                  state.tr.delete(
                    column.bnBlock.beforePos - 1,
                    column.bnBlock.beforePos + 1,
                  );
                }
              } else {
                // delete block
                state.tr.delete(
                  blockInfo.bnBlock.beforePos,
                  blockInfo.bnBlock.afterPos,
                );
                if (isFirstColumn) {
                  // move before columnlist
                  state.tr.insert(
                    columnList.bnBlock.beforePos - 1,
                    blockToMove.content,
                  );
                } else {
                  // append block to previous column
                  state.tr.insert(
                    column.bnBlock.beforePos - 1,
                    blockToMove.content,
                  );
                }
                const pos = state.tr.doc.resolve(column.bnBlock.beforePos - 1);
                state.tr.setSelection(TextSelection.between(pos, pos));
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
                const nonEditableBlockContentStartPos =
                  prevBlockInfo.blockContent.afterPos -
                  prevBlockInfo.blockContent.node.nodeSize;

                chainedCommands = chainedCommands.setNodeSelection(
                  nonEditableBlockContentStartPos,
                );
              } else {
                const blockContentStartPos =
                  prevBlockInfo.blockContent.afterPos -
                  prevBlockInfo.blockContent.node.nodeSize;

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
              // TODO
              throw new Error(`todo`);
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
                // TODO
                throw new Error(`todo`);
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
      this.editor.commands.first(({ commands }) => [
        // Deletes the selection if it's not empty.
        () => commands.deleteSelection(),
        // Merges block with the next one (at the same nesting level or lower),
        // if one exists, the block has no children, and the selection is at the
        // end of the block.
        () =>
          commands.command(({ state }) => {
            // TODO: Change this to not rely on offsets & schema assumptions
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const {
              bnBlock: blockContainer,
              blockContent,
              childContainer,
            } = blockInfo;

            const { depth } = state.doc.resolve(blockContainer.beforePos);
            const blockAtDocEnd =
              blockContainer.afterPos === state.doc.nodeSize - 3;
            const selectionAtBlockEnd =
              state.selection.from === blockContent.afterPos - 1;
            const selectionEmpty = state.selection.empty;
            const hasChildBlocks = childContainer !== undefined;

            if (
              !blockAtDocEnd &&
              selectionAtBlockEnd &&
              selectionEmpty &&
              !hasChildBlocks
            ) {
              let oldDepth = depth;
              let newPos = blockContainer.afterPos + 1;
              let newDepth = state.doc.resolve(newPos).depth;

              while (newDepth < oldDepth) {
                oldDepth = newDepth;
                newPos += 2;
                newDepth = state.doc.resolve(newPos).depth;
              }

              return commands.command(mergeBlocksCommand(newPos - 1));
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

            const blockHardBreakShortcut: "shift+enter" | "enter" | "none" =
              this.options.editor.schema.blockSchema[blockInfo.blockNoteType]
                .hardBreakShortcut ?? "shift+enter";

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
          commands.command(({ state, dispatch }) => {
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
                const newBlock =
                  state.schema.nodes["blockContainer"].createAndFill()!;

                state.tr
                  .insert(newBlockInsertionPos, newBlock)
                  .scrollIntoView();
                state.tr.setSelection(
                  new TextSelection(state.doc.resolve(newBlockContentPos)),
                );
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
          (this.options.editor.formattingToolbar?.shown ||
            this.options.editor.linkToolbar?.shown ||
            this.options.editor.filePanel?.shown)
        ) {
          // don't handle tabs if a toolbar is shown, so we can tab into / out of it
          return false;
        }
        return nestBlock(this.options.editor);
        // return true;
      },
      "Shift-Tab": () => {
        if (
          this.options.tabBehavior !== "prefer-indent" &&
          (this.options.editor.formattingToolbar?.shown ||
            this.options.editor.linkToolbar?.shown ||
            this.options.editor.filePanel?.shown)
        ) {
          // don't handle tabs if a toolbar is shown, so we can tab into / out of it
          return false;
        }
        this.editor.commands.liftListItem("blockContainer");
        return true;
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
