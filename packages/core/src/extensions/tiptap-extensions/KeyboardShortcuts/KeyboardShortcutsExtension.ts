import { Extension } from "@tiptap/core";
import { Fragment, Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";

import {
  getBottomNestedBlockInfo,
  getNextBlockInfo,
  getParentBlockInfo,
  getPrevBlockInfo,
  compartmentOwnerInfo,
  mergeBlockPairCommand,
  mergeBlocksCommand,
} from "../../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import {
  liftItem,
  nestBlock,
  unnestBlock,
} from "../../../api/blockManipulation/commands/nestBlock/nestBlock.js";
import {
  containerAncestorIds,
  fixContainersById,
} from "../../../api/blockManipulation/containers/fixContainer.js";
import {
  ascendToInsertablePos,
  compartmentBody,
  descendToBlockPos,
  isCompartment,
  isContainerNode,
} from "../../../schema/blocks/containers.js";
import { splitBlockCommand } from "../../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockCommand } from "../../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
  getBlockInfoFromResolvedPos,
  getBlockInfoFromSelection,
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
          commands.command(({ state, tr }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { blockContent } = blockInfo;

            const selectionAtBlockStart =
              state.selection.from === blockContent.beforePos + 1;

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
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { bnBlock: blockContainer, blockContent } = blockInfo;

            // The block before this one: its previous sibling, or - for the
            // first block of a compartment - the block that owns it, so a
            // callout's first body block merges into its title.
            const prevSibling = getPrevBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );
            const prevBlockInfo =
              prevSibling ??
              compartmentOwnerInfo(state.doc, blockInfo.bnBlock.beforePos);
            // If the previous block has no inline content, it can't be merged.
            // It's instead deleted, which is done later in the chan, so we
            // return early here.
            if (
              !prevBlockInfo ||
              !prevBlockInfo.isBlockContainer ||
              prevBlockInfo.blockContent.node.type.spec.content !== "inline*"
            ) {
              return false;
            }

            // The sibling before this one owns a compartment, so this block
            // moves into it whole rather than having its text merged across
            // the compartment's edge. Handled by the branch below.
            if (
              prevSibling &&
              compartmentBody(
                prevSibling.bnBlock.node,
                prevSibling.bnBlock.beforePos,
              )
            ) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockContent.beforePos + 1;
            const selectionEmpty = state.selection.empty;

            const posBetweenBlocks = blockContainer.beforePos;

            if (selectionAtBlockStart && selectionEmpty) {
              return chain()
                .command(
                  prevSibling
                    ? mergeBlocksCommand(posBetweenBlocks)
                    : mergeBlockPairCommand(prevBlockInfo, blockInfo),
                )
                .scrollIntoView()
                .run();
            }

            return false;
          }),
        // If the previous block is a container, moves the current block into
        // it, at the end of the last of its children that holds blocks (the
        // last column of a column list).
        () =>
          commands.command(({ state, tr, dispatch }) => {
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
            if (
              !prevBlockInfo ||
              !compartmentBody(
                prevBlockInfo.bnBlock.node,
                prevBlockInfo.bnBlock.beforePos,
              )
            ) {
              return false;
            }

            const insertPos = descendToBlockPos(
              state.doc,
              prevBlockInfo.bnBlock.beforePos,
              "end",
            );
            if (insertPos === undefined) {
              return false;
            }

            if (dispatch) {
              tr.delete(
                blockInfo.bnBlock.beforePos,
                blockInfo.bnBlock.afterPos,
              );
              tr.insert(insertPos, blockInfo.bnBlock.node);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve(insertPos + 1)),
              );

              return true;
            }

            return false;
          }),
        // If the block is the first one in a container, moves it out: into the
        // end of the container's previous sibling (the previous column), or
        // above the container it sits in when there is none.
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
            if (!isContainerNode(parentBlock.type)) {
              return false;
            }

            const $parentPos = tr.doc.resolve($pos.before());
            const grandParent = $parentPos.node();
            // Where the block lands: the end of the container's previous
            // sibling if it has one, otherwise just before the outermost
            // container it is leaving.
            const outerPos = isContainerNode(grandParent.type)
              ? $parentPos.before()
              : undefined;
            const isFirstChild =
              outerPos === undefined || $parentPos.pos === outerPos + 1;
            const repairId = parentBlock.attrs.id;

            if (dispatch) {
              tr.delete(
                blockInfo.bnBlock.beforePos,
                blockInfo.bnBlock.afterPos,
              );
              if (repairId) {
                fixContainersById(tr, [repairId]);
              }
              if (outerPos !== undefined) {
                fixContainersById(
                  tr,
                  containerAncestorIds(
                    tr.doc,
                    Math.min(outerPos + 1, tr.doc.content.size),
                  ),
                );
              }

              const insertPos = isFirstChild
                ? (outerPos ?? $parentPos.pos)
                : $parentPos.pos - 1;

              tr.insert(insertPos, blockInfo.bnBlock.node);
              tr.setSelection(
                TextSelection.near(
                  tr.doc.resolve(isFirstChild ? insertPos : insertPos + 1),
                ),
              );
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
              if (!prevBlockInfo) {
                return false;
              }
              const bottomNestedPrevBlockInfo = getBottomNestedBlockInfo(
                state.doc,
                prevBlockInfo,
              );
              if (!bottomNestedPrevBlockInfo.isBlockContainer) {
                return false;
              }
              if (
                !bottomNestedPrevBlockInfo ||
                !bottomNestedPrevBlockInfo.isBlockContainer
              ) {
                return false;
              }

              let chainedCommands = chain();

              // Moves the children the current block.
              if (blockInfo.childContainer) {
                chainedCommands.insertContentAt(
                  blockInfo.bnBlock.afterPos,
                  blockInfo.childContainer?.node.content,
                );
              }

              if (
                bottomNestedPrevBlockInfo.blockContent.node.type.spec
                  .content === "tableRow+"
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
                bottomNestedPrevBlockInfo.blockContent.node.type.spec
                  .content === ""
              ) {
                chainedCommands = chainedCommands.setNodeSelection(
                  bottomNestedPrevBlockInfo.blockContent.beforePos,
                );
              } else {
                const blockContentEndPos =
                  bottomNestedPrevBlockInfo.blockContent.afterPos - 1;

                chainedCommands =
                  chainedCommands.setTextSelection(blockContentEndPos);
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
        // If the next block is a container, moves the first block out of it (the
        // first block of a column list's first column) to after the current
        // block.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }

            const selectionAtBlockEnd =
              state.selection.from === blockInfo.blockContent.afterPos - 1;
            if (!selectionAtBlockEnd) {
              return false;
            }

            const nextBlockInfo = getNextBlockInfo(
              state.doc,
              blockInfo.bnBlock.beforePos,
            );
            if (!nextBlockInfo || nextBlockInfo.isBlockContainer) {
              return false;
            }

            const firstBlockPos = descendToBlockPos(
              state.doc,
              nextBlockInfo.bnBlock.beforePos,
              "start",
            );
            if (firstBlockPos === undefined) {
              return false;
            }
            const $firstBlockPos = tr.doc.resolve(firstBlockPos);
            const firstBlock = $firstBlockPos.nodeAfter;
            if (!firstBlock) {
              return false;
            }

            if (dispatch) {
              const containerId = nextBlockInfo.bnBlock.node.attrs.id;

              tr.delete(firstBlockPos, firstBlockPos + firstBlock.nodeSize);
              fixContainersById(tr, [
                ...containerAncestorIds(tr.doc, firstBlockPos),
                ...(containerId ? [containerId] : []),
              ]);
              tr.insert(blockInfo.bnBlock.afterPos, firstBlock);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve(blockInfo.bnBlock.afterPos)),
              );

              return true;
            }

            return false;
          }),
        // If the block is the last one in a container, pulls in the block that
        // follows the container: the first block of the next sibling (the next
        // column), or the block after the container it sits in.
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
            if (!isContainerNode(parentBlock.type)) {
              return false;
            }

            const $blockEndPos = tr.doc.resolve(blockInfo.bnBlock.afterPos);
            const $parentEndPos = tr.doc.resolve($blockEndPos.after());
            const grandParent = $parentEndPos.node();
            const outerEndPos = isContainerNode(grandParent.type)
              ? $parentEndPos.after()
              : undefined;
            // The block after the container: the start of its next sibling, or
            // the first block past the outermost container it is in.
            const isLastChild =
              outerEndPos === undefined ||
              $parentEndPos.pos === outerEndPos - 1;
            const nextBlockBeforePos = isLastChild
              ? (outerEndPos ?? $parentEndPos.pos)
              : $parentEndPos.pos + 1;
            if (nextBlockBeforePos >= tr.doc.content.size) {
              return false;
            }

            if (dispatch) {
              const nextBlockInfo = getBlockInfoFromResolvedPos(
                tr.doc.resolve(nextBlockBeforePos),
              );
              const repairIds = containerAncestorIds(
                tr.doc,
                nextBlockInfo.bnBlock.beforePos,
              );

              tr.delete(
                nextBlockInfo.bnBlock.beforePos,
                nextBlockInfo.bnBlock.afterPos,
              );
              fixContainersById(tr, repairIds);
              tr.insert($blockEndPos.pos, nextBlockInfo.bnBlock.node);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve($blockEndPos.pos)),
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
                const childBlocks =
                  nextBlockInfo.bnBlock.node.lastChild!.content;
                return chain()
                  .deleteRange({
                    from: nextBlockInfo.bnBlock.beforePos,
                    to: nextBlockInfo.bnBlock.afterPos,
                  })
                  .insertContentAt(
                    blockInfo.bnBlock.afterPos,
                    nextBlockInfo.bnBlock.node.childCount === 2
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
        // Leaves a compartment: an empty block at the end of a callout's body
        // (or a column's) moves out below it, so a second Enter gets you out
        // the way it gets you out of a list. The first block of a body stays
        // put - it is where the body begins, not a way out of it.
        () =>
          commands.command(({ state, dispatch, tr }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { bnBlock, blockContent } = blockInfo;

            if (blockContent.node.childCount !== 0 || !state.selection.empty) {
              return false;
            }
            if (blockInfo.childContainer) {
              return false;
            }

            const $pos = state.doc.resolve(bnBlock.beforePos);
            if ($pos.depth < 1) {
              return false;
            }
            const body = $pos.node();
            const isLast = $pos.index() === body.childCount - 1;
            const hasPrevious = $pos.index() > 0;
            if (!isLast || !hasPrevious) {
              return false;
            }

            const ownerDepth = isContainerNode(body.type)
              ? $pos.depth
              : $pos.depth - 1;
            if (ownerDepth < 1 || !isCompartment($pos.node(ownerDepth))) {
              return false;
            }

            if (dispatch) {
              const afterOwner = $pos.after(ownerDepth);
              tr.delete(bnBlock.beforePos, bnBlock.afterPos);

              const insertPos = ascendToInsertablePos(
                tr.doc,
                tr.mapping.map(afterOwner),
                bnBlock.node.type,
              );
              if (insertPos === undefined) {
                return false;
              }

              tr.insert(insertPos, bnBlock.node);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve(insertPos + 1)),
              ).scrollIntoView();
            }

            return true;
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
        // Enter in a compartment's own content (a callout's title) starts its
        // body rather than splitting the block in two: whatever follows the
        // cursor becomes the body's first block, and the body the callout
        // already had stays where it is.
        () =>
          commands.command(({ state, dispatch, tr }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.isBlockContainer) {
              return false;
            }
            const { bnBlock, blockContent } = blockInfo;

            if (!isCompartment(bnBlock.node)) {
              return false;
            }
            if (!state.selection.empty) {
              return false;
            }
            const contentEnd = blockContent.afterPos - 1;
            if (
              state.selection.from < blockContent.beforePos + 1 ||
              state.selection.from > contentEnd
            ) {
              return false;
            }

            if (dispatch) {
              // Everything after the cursor moves into the new block, so
              // splitting the title mid-way puts its tail at the top of the
              // body instead of handing the body to a new sibling.
              const tail = blockContent.node.cut(
                state.selection.from - (blockContent.beforePos + 1),
              );
              const newBlock = state.schema.nodes["blockContainer"].create(
                undefined,
                state.schema.nodes["paragraph"].create(undefined, tail.content),
              );

              tr.delete(state.selection.from, contentEnd);

              const body = compartmentBody(
                tr.doc.resolve(bnBlock.beforePos).nodeAfter!,
                bnBlock.beforePos,
              );
              // Without a body yet, one is created around the new block.
              const insertPos = body
                ? body.beforePos + 1
                : tr.mapping.map(blockContent.afterPos);
              tr.insert(
                insertPos,
                body
                  ? newBlock
                  : state.schema.nodes["blockGroup"].create(
                      undefined,
                      newBlock,
                    ),
              )
                .setSelection(
                  new TextSelection(tr.doc.resolve(insertPos + (body ? 2 : 3))),
                )
                .scrollIntoView();
            }

            return true;
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
