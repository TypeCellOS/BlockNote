import { type ChainedCommands, Extension } from "@tiptap/core";
import { Fragment } from "prosemirror-model";
import { TextSelection, Transaction } from "prosemirror-state";

import { mergeBlocksCommand } from "../../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import {
  liftItem,
  nestBlock,
  unnestBlock,
} from "../../../api/blockManipulation/commands/nestBlock/nestBlock.js";
import { fixContainersById } from "../../../api/blockManipulation/containers/fixContainer.js";
import { isContainerNode } from "../../../schema/blocks/children.js";
import { splitBlockCommand } from "../../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockCommand } from "../../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
  type BlockInfo,
  ascendToInsertablePos,
  getInsertionPos,
  getAncestorContainers,
  getFirstLeafBlock,
  getBlockInfoAt,
  getBlockInfoFromNode,
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

// Move a block across a container boundary, repair its former ancestors, and
// map the caret through any repairs that change the insertion position.
function moveBlockOutAndPlaceCaret(
  tr: Transaction,
  block: BlockInfo["block"],
  insertAt: number,
) {
  const containersToFix = getAncestorContainers(tr.doc, block.beforePos);
  tr.delete(block.beforePos, block.afterPos);
  const insertionPos = tr.mapping.map(insertAt);
  tr.insert(insertionPos, block.node);
  const stepsBeforeFix = tr.steps.length;
  fixContainersById(tr, containersToFix);
  tr.setSelection(
    TextSelection.near(
      tr.doc.resolve(tr.mapping.slice(stepsBeforeFix).map(insertionPos) + 1),
    ),
  );
}

// Delete a following block, retaining its children and any compatible text.
// A sole child also removes its child group instead of leaving an empty body.
function deleteBlockAndAppendContent(
  chain: ChainedCommands,
  current: Extract<BlockInfo, { hasContent: true }>,
  next: Extract<BlockInfo, { hasContent: true }>,
  remove: Pick<BlockInfo["block"], "beforePos" | "afterPos"> = next.block,
) {
  return chain
    .insertContentAt(
      next.block.afterPos,
      next.children?.node.content || Fragment.empty,
    )
    .deleteRange({ from: remove.beforePos, to: remove.afterPos })
    .insertContentAt(
      current.contentEnd,
      current.contentKind === "inline" && next.contentKind === "inline"
        ? next.content.node.content
        : null,
    )
    .setTextSelection(current.contentEnd)
    .scrollIntoView()
    .run();
}

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
              state.selection.from === blockInfo.contentStart;
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

            const selectionAtBlockStart =
              state.selection.from === blockInfo.contentStart;

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
            const { block: blockContainer } = blockInfo;

            const prevSibling = getPrevBlockInfo(
              state.doc,
              blockInfo.block.beforePos,
            );
            // A preceding container or owned body takes the move branch below.
            // With no sibling, mergeBlocksCommand checks for an owning title.
            if (
              prevSibling &&
              (!prevSibling.hasContent ||
                prevSibling.contentKind !== "inline" ||
                (prevSibling.children && prevSibling.hasOwnedChildren))
            ) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockInfo.contentStart;
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
        // Move into the preceding container's trailing slot, or out of the
        // current container when this is its first block.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (
              !blockInfo.hasContent ||
              state.selection.from !== blockInfo.contentStart
            ) {
              return false;
            }

            const blockType = blockInfo.block.node.type;
            let target = getPrevBlockInfo(tr.doc, blockInfo.block.beforePos);
            let insertionPos: number | undefined;
            if (target) {
              if (
                target.hasContent &&
                !(target.children && target.hasOwnedChildren)
              ) {
                return false;
              }
            } else {
              const $pos = tr.doc.resolve(blockInfo.block.beforePos);
              if (!isContainerNode($pos.parent.type)) {
                return false;
              }
              const $containerPos = tr.doc.resolve($pos.before());
              // Between columns, move into the previous column. Outside a
              // container, move above the closest boundary that accepts us.
              const prevSibling = $containerPos.nodeBefore;
              if (
                isContainerNode($containerPos.parent.type) &&
                prevSibling &&
                isContainerNode(prevSibling.type)
              ) {
                target = getBlockInfoFromNode(
                  prevSibling,
                  $containerPos.pos - prevSibling.nodeSize,
                );
              } else {
                insertionPos = ascendToInsertablePos(
                  tr.doc,
                  $containerPos.pos,
                  blockType,
                );
              }
            }
            if (target) {
              insertionPos = getInsertionPos(
                tr.doc,
                target,
                "last-child",
                blockType,
              )?.pos;
            }
            if (insertionPos === undefined) {
              return false;
            }
            if (dispatch) {
              moveBlockOutAndPlaceCaret(tr, blockInfo.block, insertionPos);
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
              blockInfo.isContentEmpty && blockInfo.contentKind === "inline";

            if (blockEmpty) {
              const prevBlockInfo = getPrevBlockInfo(
                state.doc,
                blockInfo.block.beforePos,
              );
              if (!prevBlockInfo) {
                return false;
              }
              const bottomNestedPrevBlockInfo =
                getLastDescendantBlockInfo(prevBlockInfo);
              if (!bottomNestedPrevBlockInfo.hasContent) {
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

              if (bottomNestedPrevBlockInfo.contentKind === "table") {
                chainedCommands = chainedCommands.setTextSelection(
                  tableContentCaretPos(
                    bottomNestedPrevBlockInfo.content,
                    "end",
                  ),
                );
              } else if (bottomNestedPrevBlockInfo.contentKind === "none") {
                chainedCommands = chainedCommands.setNodeSelection(
                  bottomNestedPrevBlockInfo.content.beforePos,
                );
              } else {
                const blockContentEndPos = bottomNestedPrevBlockInfo.contentEnd;

                chainedCommands =
                  chainedCommands.setTextSelection(blockContentEndPos);
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
              state.selection.from === blockInfo.contentStart;
            const selectionEmpty = state.selection.empty;

            const prevBlockInfo = getPrevBlockInfo(
              state.doc,
              blockInfo.block.beforePos,
            );

            if (prevBlockInfo && selectionAtBlockStart && selectionEmpty) {
              // An emptied container has no content to merge with, so the
              // guard below rejects it — the merge branch above only fires
              // for a previous block with content of its own.
              const bottomBlock = getLastDescendantBlockInfo(prevBlockInfo);

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
            const { children } = blockInfo;

            // A container allowed to hold no children still has a child
            // container node, but no first child to pull anything out of.
            if (children.node.childCount === 0) {
              return false;
            }

            const selectionAtBlockEnd =
              state.selection.from === blockInfo.contentEnd;
            const selectionEmpty = state.selection.empty;

            const firstChildBlockInfo = getBlockInfoAt(
              state.doc,
              children.childrenStart,
            );
            if (!firstChildBlockInfo.hasContent) {
              return false;
            }

            if (selectionAtBlockEnd && selectionEmpty) {
              return deleteBlockAndAppendContent(
                chain(),
                blockInfo,
                firstChildBlockInfo,
                children.node.childCount === 1
                  ? children
                  : firstChildBlockInfo.block,
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
            const { block: blockContainer } = blockInfo;

            const nextBlockInfo = getNextBlockInfo(
              state.doc,
              blockInfo.block.beforePos,
            );
            if (!nextBlockInfo || !nextBlockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockEnd =
              state.selection.from === blockInfo.contentEnd;
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
        // Pull the next leaf across a container boundary. It may be inside
        // the next sibling container, or follow the containers we're leaving.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (
              !blockInfo.hasContent ||
              state.selection.from !== blockInfo.contentEnd
            ) {
              return false;
            }

            let $boundary = tr.doc.resolve(blockInfo.block.afterPos);
            while (
              !$boundary.nodeAfter &&
              $boundary.depth > 0 &&
              isContainerNode($boundary.parent.type)
            ) {
              $boundary = tr.doc.resolve($boundary.after());
            }
            const nextNode = $boundary.nodeAfter;
            if (!nextNode) {
              return false;
            }

            const crossedBoundary = $boundary.pos !== blockInfo.block.afterPos;
            if (!crossedBoundary && !isContainerNode(nextNode.type)) {
              return false;
            }
            const target = getFirstLeafBlock(
              getBlockInfoFromNode(nextNode, $boundary.pos),
            );
            if (!target) {
              return false;
            }

            if (dispatch) {
              moveBlockOutAndPlaceCaret(
                tr,
                target.block,
                blockInfo.block.afterPos,
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

            const selectionAtBlockEnd =
              state.selection.from === blockInfo.contentEnd;
            const selectionEmpty = state.selection.empty;

            if (selectionAtBlockEnd && selectionEmpty) {
              let nextBlockInfo: BlockInfo | undefined;
              let ancestor: BlockInfo | undefined = blockInfo;
              while (ancestor) {
                nextBlockInfo = getNextBlockInfo(
                  state.doc,
                  ancestor.block.beforePos,
                );
                if (nextBlockInfo) {
                  break;
                }
                ancestor = getParentBlockInfo(
                  state.doc,
                  ancestor.block.beforePos,
                );
              }
              if (!nextBlockInfo || !nextBlockInfo.hasContent) {
                return false;
              }

              return deleteBlockAndAppendContent(
                chain(),
                blockInfo,
                nextBlockInfo,
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
              blockInfo.isContentEmpty && blockInfo.contentKind === "inline";

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
                  nextBlockInfo.contentStart,
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
              state.selection.from === blockInfo.contentEnd;
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
                return chain()
                  .deleteRange({
                    from: nextBlockInfo.block.beforePos,
                    to: nextBlockInfo.block.afterPos,
                  })
                  .insertContentAt(
                    blockInfo.block.afterPos,
                    nextBlockInfo.children?.node.content ?? null,
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
            const { block: blockContainer } = blockInfo;

            const { depth } = state.doc.resolve(blockContainer.beforePos);

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = blockInfo.isContentEmpty;
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
        // If the block is empty and the last child of a container or an
        // owned-children body, moves the block out (double Enter exits the
        // container). The block lands at the nearest enclosing position that
        // accepts it. E.g. out of a column it skips the columnList, which
        // holds only columns, and lands below it. Without this, Enter only
        // ever creates new blocks within the container, so the cursor could
        // never leave a trailing container. Shift+Enter still adds spacing
        // inside a container. The first block of a body stays put: it is
        // where the body begins, not a way out of it.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = blockInfo.isContentEmpty;
            if (!selectionEmpty || !blockEmpty) {
              return false;
            }

            const $pos = tr.doc.resolve(blockInfo.block.beforePos);
            // Only fires on the container's last child.
            if (tr.doc.resolve(blockInfo.block.afterPos).nodeAfter !== null) {
              return false;
            }

            const owner = getParentBlockInfo(tr.doc, blockInfo.block.beforePos);
            if (!owner || !owner.hasOwnedChildren) {
              return false;
            }
            // The first block of a body stays put: it is where the body
            // begins, not a way out of it. (A container's own first child has
            // no such role, so it may still leave.)
            if ($pos.index() === 0 && owner.hasContent) {
              return false;
            }

            const ownerAfterPos = ascendToInsertablePos(
              tr.doc,
              owner.block.afterPos,
              state.schema.nodes["blockContainer"],
              "after",
            );
            if (ownerAfterPos === undefined) {
              return false;
            }

            if (dispatch) {
              moveBlockOutAndPlaceCaret(tr, blockInfo.block, ownerAfterPos);
              tr.scrollIntoView();
            }

            return true;
          }),
        // Creates a new block and moves the selection to it if the current one is empty, while the selection is also
        // empty & at the start of the block.
        () =>
          commands.command(({ state, dispatch, tr }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }
            const { block: blockContainer } = blockInfo;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = blockInfo.isContentEmpty;

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
        // Enter in a titled block's own content (a callout's title) starts its
        // body rather than splitting the block in two: whatever follows the
        // cursor becomes the body's first block, and the body the callout
        // already had stays where it is.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }

            if (!blockInfo.hasOwnedChildren) {
              return false;
            }
            if (!state.selection.empty) {
              return false;
            }
            if (
              state.selection.from < blockInfo.contentStart ||
              state.selection.from > blockInfo.contentEnd
            ) {
              return false;
            }

            if (dispatch) {
              // Everything after the cursor moves into the new block, so
              // splitting the title mid-way puts its tail at the top of the
              // body instead of handing the body to a new sibling.
              const tail = blockInfo.content.node.cut(
                state.selection.from - blockInfo.contentStart,
              );
              const newBlock = state.schema.nodes["blockContainer"].create(
                undefined,
                state.schema.nodes["paragraph"].create(undefined, tail.content),
              );

              tr.delete(state.selection.from, blockInfo.contentEnd);

              const body = getBlockInfoAt(
                tr.doc,
                blockInfo.block.beforePos,
              ).children;
              // Without a body yet, one is created around the new block.
              const insertPos = body
                ? body.childrenStart
                : tr.mapping.map(blockInfo.content.afterPos);
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
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const blockEmpty = blockInfo.isContentEmpty;

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
