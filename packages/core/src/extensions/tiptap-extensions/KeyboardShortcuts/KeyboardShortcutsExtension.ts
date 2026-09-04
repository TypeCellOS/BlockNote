import { Extension } from "@tiptap/core";
import { Fragment, Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";

import { mergeBlocksCommand } from "../../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import {
  liftItem,
  nestBlock,
  unnestBlock,
} from "../../../api/blockManipulation/commands/nestBlock/nestBlock.js";
import { fixColumnList } from "../../../api/blockManipulation/commands/replaceBlocks/util/fixColumnList.js";
import { splitBlockCommand } from "../../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockCommand } from "../../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
  getBlockInfoAt,
  getBlockInfoFromSelection,
  getLastDescendantBlockInfo,
  getNextBlockInfo,
  getParentBlockInfo,
  getPrevBlockInfo,
  tableContentCaretPos,
} from "../../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { FilePanelExtension } from "../../FilePanel/FilePanel.js";
import { FormattingToolbarExtension } from "../../FormattingToolbar/FormattingToolbar.js";

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
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockInfo.content.beforePos + 1;
            const isParagraph =
              blockInfo.content.node.type.name === "paragraph";

            if (selectionAtBlockStart && !isParagraph) {
              return commands.command(
                updateBlockCommand(blockInfo.block.beforePos, {
                  type: "paragraph",
                  props: {},
                }),
              );
            }

            return false;
          }),
        // Removes a level of nesting if the block is indented if the selection is at the start of the block.
        () =>
          commands.command(({ state, tr }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }
            const { content } = blockInfo;

            const selectionAtBlockStart =
              state.selection.from === content.beforePos + 1;

            if (selectionAtBlockStart) {
              return liftItem(
                tr,
                tr.doc.type.schema.nodes["blockContainer"],
                tr.doc.type.schema.nodes["blockGroup"],
              );
            }

            return false;
          }),
        // Merges block with the previous one if it isn't indented, and the selection is at the start of the
        // block. The target block for merging must contain inline content.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }
            const { block, content } = blockInfo;

            const prevBlockInfo = getPrevBlockInfo(
              state.doc,
              blockInfo.block.beforePos,
            );
            // If the previous block has no inline content, it can't be merged.
            // It's instead deleted, which is done later in the chan, so we
            // return early here.
            if (
              !prevBlockInfo ||
              !prevBlockInfo.hasContent ||
              prevBlockInfo.contentKind !== "inline"
            ) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === content.beforePos + 1;
            const selectionEmpty = state.selection.empty;

            const posBetweenBlocks = block.beforePos;

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
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockInfo.content.beforePos + 1;
            if (!selectionAtBlockStart) {
              return false;
            }

            const prevBlockInfo = getPrevBlockInfo(
              state.doc,
              blockInfo.block.beforePos,
            );
            if (!prevBlockInfo || prevBlockInfo.hasContent) {
              return false;
            }

            if (dispatch) {
              const columnAfterPos = prevBlockInfo.block.afterPos - 1;
              const $blockAfterPos = tr.doc.resolve(columnAfterPos - 1);

              tr.delete(blockInfo.block.beforePos, blockInfo.block.afterPos);
              tr.insert($blockAfterPos.pos, blockInfo.block.node);
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
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockStart =
              tr.selection.from === blockInfo.content.beforePos + 1;
            if (!selectionAtBlockStart) {
              return false;
            }

            const $pos = tr.doc.resolve(blockInfo.block.beforePos);

            const prevBlock = $pos.nodeBefore;
            if (prevBlock) {
              return false;
            }

            const parentBlock = $pos.node();
            if (parentBlock.type.name !== "column") {
              return false;
            }

            const $blockPos = tr.doc.resolve(blockInfo.block.beforePos);
            const $columnPos = tr.doc.resolve($blockPos.before());
            const columnListPos = $columnPos.before();

            if (dispatch) {
              tr.delete(blockInfo.block.beforePos, blockInfo.block.afterPos);
              fixColumnList(tr, columnListPos);

              if ($columnPos.pos === columnListPos + 1) {
                tr.insert(columnListPos, blockInfo.block.node);
                tr.setSelection(
                  TextSelection.near(tr.doc.resolve(columnListPos)),
                );
              } else {
                tr.insert($columnPos.pos - 1, blockInfo.block.node);
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
            if (!blockInfo.hasContent) {
              return false;
            }

            const blockEmpty =
              blockInfo.content.node.childCount === 0 &&
              blockInfo.contentKind === "inline";

            if (blockEmpty) {
              const prevBlockInfo = getPrevBlockInfo(
                state.doc,
                blockInfo.block.beforePos,
              );
              if (!prevBlockInfo) {
                return false;
              }
              const bottomNestedPrevBlockInfo = getLastDescendantBlockInfo(
                state.doc,
                prevBlockInfo,
              );
              if (!bottomNestedPrevBlockInfo.hasContent) {
                return false;
              }
              if (
                !bottomNestedPrevBlockInfo ||
                !bottomNestedPrevBlockInfo.hasContent
              ) {
                return false;
              }

              let chainedCommands = chain();

              // Moves the children the current block.
              if (blockInfo.children) {
                chainedCommands.insertContentAt(
                  blockInfo.block.afterPos,
                  blockInfo.children?.node.content,
                );
              }

              if (
                bottomNestedPrevBlockInfo.content.node.type.spec.content ===
                "tableRow+"
              ) {
                const tableBlockEndPos = blockInfo.block.beforePos - 1;
                const tableBlockContentEndPos = tableBlockEndPos - 1;
                const lastRowEndPos = tableBlockContentEndPos - 1;
                const lastCellEndPos = lastRowEndPos - 1;
                const lastCellParagraphEndPos = lastCellEndPos - 1;

                chainedCommands = chainedCommands.setTextSelection(
                  lastCellParagraphEndPos,
                );
              } else if (
                bottomNestedPrevBlockInfo.content.node.type.spec.content === ""
              ) {
                chainedCommands = chainedCommands.setNodeSelection(
                  bottomNestedPrevBlockInfo.content.beforePos,
                );
              } else {
                const contentEndPos =
                  bottomNestedPrevBlockInfo.content.afterPos - 1;

                chainedCommands =
                  chainedCommands.setTextSelection(contentEndPos);
              }

              return chainedCommands
                .deleteRange({
                  from: blockInfo.block.beforePos,
                  to: blockInfo.block.afterPos,
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

            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockInfo.content.beforePos + 1;
            const selectionEmpty = state.selection.empty;

            const prevBlockInfo = getPrevBlockInfo(
              state.doc,
              blockInfo.block.beforePos,
            );

            if (prevBlockInfo && selectionAtBlockStart && selectionEmpty) {
              const bottomBlock = getLastDescendantBlockInfo(
                state.doc,
                prevBlockInfo,
              );

              if (!bottomBlock.hasContent) {
                return false;
              }

              const prevBlockNotTableAndNoContent =
                bottomBlock.contentKind === "none" ||
                (bottomBlock.contentKind === "inline" &&
                  bottomBlock.isContentEmpty);

              if (prevBlockNotTableAndNoContent) {
                return chain()
                  .cut(
                    {
                      from: blockInfo.block.beforePos,
                      to: blockInfo.block.afterPos,
                    },
                    bottomBlock.block.afterPos,
                  )
                  .deleteRange({
                    from: bottomBlock.block.beforePos,
                    to: bottomBlock.block.afterPos,
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
            if (!blockInfo.hasContent || !blockInfo.children) {
              return false;
            }
            const { content, children } = blockInfo;

            const selectionAtBlockEnd =
              state.selection.from === content.afterPos - 1;
            const selectionEmpty = state.selection.empty;

            const firstChildBlockInfo = getBlockInfoAt(
              state.doc,
              children.beforePos + 1,
            );
            if (!firstChildBlockInfo.hasContent) {
              return false;
            }

            if (selectionAtBlockEnd && selectionEmpty) {
              const firstChildBlockContent = firstChildBlockInfo.content.node;
              const firstChildBlockHasInlineContent =
                firstChildBlockInfo.contentKind === "inline";
              const blockHasInlineContent = blockInfo.contentKind === "inline";

              return (
                chain()
                  // Un-nests child block's children if necessary.
                  .insertContentAt(
                    firstChildBlockInfo.block.afterPos,
                    firstChildBlockInfo.children?.node.content ||
                      Fragment.empty,
                  )
                  .deleteRange(
                    // Deletes whole child container if there's only one child.
                    children.node.childCount === 1
                      ? {
                          from: children.beforePos,
                          to: children.afterPos,
                        }
                      : {
                          from: firstChildBlockInfo.block.beforePos,
                          to: firstChildBlockInfo.block.afterPos,
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
            if (!blockInfo.hasContent) {
              return false;
            }
            const { block, content } = blockInfo;

            const nextBlockInfo = getNextBlockInfo(
              state.doc,
              blockInfo.block.beforePos,
            );
            if (!nextBlockInfo || !nextBlockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockEnd =
              state.selection.from === content.afterPos - 1;
            const selectionEmpty = state.selection.empty;

            const posBetweenBlocks = block.afterPos;

            if (selectionAtBlockEnd && selectionEmpty) {
              return chain()
                .command(mergeBlocksCommand(posBetweenBlocks))
                .scrollIntoView()
                .run();
            }

            return false;
          }),
        // If the next block is a columnList, moves the first block from its
        // first column to after the current block.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockEnd =
              state.selection.from === blockInfo.content.afterPos - 1;
            if (!selectionAtBlockEnd) {
              return false;
            }

            const nextBlockInfo = getNextBlockInfo(
              state.doc,
              blockInfo.block.beforePos,
            );
            if (!nextBlockInfo || nextBlockInfo.hasContent) {
              return false;
            }

            if (dispatch) {
              const columnBeforePos = nextBlockInfo.block.beforePos + 1;
              const $blockBeforePos = tr.doc.resolve(columnBeforePos + 1);

              tr.delete(
                $blockBeforePos.pos,
                $blockBeforePos.pos + $blockBeforePos.nodeAfter!.nodeSize,
              );
              fixColumnList(tr, nextBlockInfo.block.beforePos);
              tr.insert(blockInfo.block.afterPos, $blockBeforePos.nodeAfter!);
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
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockEnd =
              tr.selection.from === blockInfo.content.afterPos - 1;
            if (!selectionAtBlockEnd) {
              return false;
            }

            const $pos = tr.doc.resolve(blockInfo.block.afterPos);

            const nextBlock = $pos.nodeAfter;
            if (nextBlock) {
              return false;
            }

            const parentBlock = $pos.node();
            if (parentBlock.type.name !== "column") {
              return false;
            }

            const $blockEndPos = tr.doc.resolve(blockInfo.block.afterPos);
            const $columnEndPos = tr.doc.resolve($blockEndPos.after());
            const columnListEndPos = $columnEndPos.after();

            if (dispatch) {
              // Position before first block in next column, or first block
              // after columnList if there is no next column.
              const nextBlockBeforePos =
                $columnEndPos.pos === columnListEndPos - 1
                  ? columnListEndPos
                  : $columnEndPos.pos + 1;
              const nextBlockInfo = getBlockInfoAt(tr.doc, nextBlockBeforePos);

              tr.delete(
                nextBlockInfo.block.beforePos,
                nextBlockInfo.block.afterPos,
              );
              fixColumnList(
                tr,
                columnListEndPos - $columnEndPos.node().nodeSize,
              );
              tr.insert($blockEndPos.pos, nextBlockInfo.block.node);
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
            if (!blockInfo.hasContent) {
              return false;
            }
            const { content } = blockInfo;

            const selectionAtBlockEnd =
              state.selection.from === content.afterPos - 1;
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
                  parentBlockInfo.block.beforePos,
                );
              };

              const nextBlockInfo = getNextBlockInfoAtAnyLevel(
                state.doc,
                blockInfo.block.beforePos,
              );
              if (!nextBlockInfo || !nextBlockInfo.hasContent) {
                return false;
              }

              const nextBlockHasInlineContent =
                nextBlockInfo.contentKind === "inline";
              const blockHasInlineContent = blockInfo.contentKind === "inline";

              return (
                chain()
                  // Un-nests next block's children if necessary.
                  .insertContentAt(
                    nextBlockInfo.block.afterPos,
                    nextBlockInfo.children?.node.content || Fragment.empty,
                  )
                  .deleteRange({
                    from: nextBlockInfo.block.beforePos,
                    to: nextBlockInfo.block.afterPos,
                  })
                  // Appends inline content from child block if possible.
                  .insertContentAt(
                    state.selection.from,
                    nextBlockHasInlineContent && blockHasInlineContent
                      ? nextBlockInfo.content.node.content
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
            if (!blockInfo.hasContent) {
              return false;
            }

            const blockEmpty =
              blockInfo.content.node.childCount === 0 &&
              blockInfo.contentKind === "inline";

            if (blockEmpty) {
              const nextBlockInfo = getNextBlockInfo(
                state.doc,
                blockInfo.block.beforePos,
              );
              if (!nextBlockInfo || !nextBlockInfo.hasContent) {
                return false;
              }

              let chainedCommands = chain();

              if (nextBlockInfo.contentKind === "table") {
                chainedCommands = chainedCommands.setTextSelection(
                  tableContentCaretPos(nextBlockInfo.content, "start"),
                );
              } else if (nextBlockInfo.contentKind === "none") {
                chainedCommands = chainedCommands.setNodeSelection(
                  nextBlockInfo.content.beforePos,
                );
              } else {
                chainedCommands = chainedCommands.setTextSelection(
                  nextBlockInfo.content.beforePos + 1,
                );
              }

              return chainedCommands
                .deleteRange({
                  from: blockInfo.block.beforePos,
                  to: blockInfo.block.afterPos,
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

            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockEnd =
              state.selection.from === blockInfo.content.afterPos - 1;
            const selectionEmpty = state.selection.empty;

            const nextBlockInfo = getNextBlockInfo(
              state.doc,
              blockInfo.block.beforePos,
            );
            if (!nextBlockInfo) {
              return false;
            }
            if (!nextBlockInfo.hasContent) {
              return false;
            }

            if (nextBlockInfo && selectionAtBlockEnd && selectionEmpty) {
              const nextBlockNotTableAndNoContent =
                nextBlockInfo.contentKind === "none" ||
                (nextBlockInfo.contentKind === "inline" &&
                  nextBlockInfo.isContentEmpty);

              if (nextBlockNotTableAndNoContent) {
                const childBlocks = nextBlockInfo.block.node.lastChild!.content;
                return chain()
                  .deleteRange({
                    from: nextBlockInfo.block.beforePos,
                    to: nextBlockInfo.block.afterPos,
                  })
                  .insertContentAt(
                    blockInfo.block.afterPos,
                    nextBlockInfo.block.node.childCount === 2
                      ? childBlocks
                      : null,
                  )
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
          commands.command(({ state, tr }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }
            const { block, content } = blockInfo;

            const { depth } = state.doc.resolve(block.beforePos);

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = content.node.childCount === 0;
            const blockIndented = depth > 1;

            if (
              selectionAtBlockStart &&
              selectionEmpty &&
              blockEmpty &&
              blockIndented
            ) {
              return liftItem(
                tr,
                tr.doc.type.schema.nodes["blockContainer"],
                tr.doc.type.schema.nodes["blockGroup"],
              );
            }

            return false;
          }),
        // Creates a hard break if block is configured to do so.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);

            const blockSpec =
              this.options.editor.schema.blockSpecs[blockInfo.blockNoteType];

            // NOTE: This likely doesn't work as intended - `blockSchema[type]`
            // holds the block *config* (type/propSchema/content), which carries
            // no `meta`, so `meta?.hardBreakShortcut` is always `undefined` and
            // this falls back to the default. It should read from the block
            // spec's implementation instead (i.e.
            // `editor.schema.blockSpecs[type].implementation.meta`), the way the
            // syntax-highlighting extension reads `meta.highlight`. Left as-is
            // for a follow-up pass.
            const blockHardBreakShortcut =
              blockSpec?.implementation?.meta?.hardBreakShortcut ??
              "shift+enter";

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
              // "plain" blocks (e.g. code/math/diagram source) hold text only
              // (their content is `text*`), which can't contain a `hardBreak`
              // node - inserting one would split the block into a new one.
              // They represent line breaks as literal newline characters.
              if (blockSpec?.config?.content === "plain") {
                tr.insertText("\n", tr.selection.head);
                return true;
              }

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
            if (!blockInfo.hasContent) {
              return false;
            }
            const { block, content } = blockInfo;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = content.node.childCount === 0;

            if (selectionAtBlockStart && selectionEmpty && blockEmpty) {
              const newBlockInsertionPos = block.afterPos;
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
                    blockInfo.children?.node,
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
                if (blockInfo.children) {
                  tr.delete(
                    blockInfo.children.beforePos,
                    blockInfo.children.afterPos,
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
            if (!blockInfo.hasContent) {
              return false;
            }
            const { content } = blockInfo;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const blockEmpty = content.node.childCount === 0;

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
                .scrollIntoView()
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
        return unnestBlock(this.options.editor);
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
