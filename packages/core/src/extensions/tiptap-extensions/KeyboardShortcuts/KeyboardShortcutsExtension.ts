import { CommandProps, Extension } from "@tiptap/core";
import { Fragment, Node } from "prosemirror-model";
import { NodeSelection, TextSelection, Transaction } from "prosemirror-state";

import { mergeBlocksCommand } from "../../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import {
  liftItem,
  nestBlock,
  unnestBlock,
} from "../../../api/blockManipulation/commands/nestBlock/nestBlock.js";
import {
  fixContainersById,
  isContainerNode,
} from "../../../api/blockManipulation/containers/fixContainer.js";
import {
  ascendToInsertablePos,
  descendToInsertionPos,
  getAncestorContainers,
  getFirstLeafBlock,
} from "../../../api/blockManipulation/containers/containerNav.js";
import { isSealed } from "../../../schema/blocks/children.js";
import { splitBlockCommand } from "../../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockCommand } from "../../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
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

// Moves `node` out of its container to `insertAt` (a position in the pre-delete
// doc): deletes it from `[from, to]`, re-inserts it, repairs the containers it
// left behind (their `whenEmptied` min/unwrap/refill), and places the caret
// inside the moved block. Every position is mapped through the deletion and the
// repair, so the caret lands correctly even when the repair rewrites the source
// container. Shared by the Backspace/Delete/Enter container-boundary branches.
function moveBlockOutAndPlaceCaret(
  tr: Transaction,
  {
    from,
    to,
    node,
    insertAt,
  }: { from: number; to: number; node: Node; insertAt: number },
) {
  const containersToFix = getAncestorContainers(tr.doc, from);
  tr.delete(from, to);
  const insertionPos = tr.mapping.map(insertAt);
  tr.insert(insertionPos, node);
  const stepsBeforeFix = tr.steps.length;
  fixContainersById(tr, containersToFix);
  tr.setSelection(
    TextSelection.near(
      tr.doc.resolve(tr.mapping.slice(stepsBeforeFix).map(insertionPos) + 1),
    ),
  );
}

// If the sibling in `direction` of the current block is a sealed container,
// selects it (a NodeSelection) instead of merging across its sealed boundary,
// so a second Backspace/Delete can delete the container explicitly. Returns a
// command: `false` when nothing to select, `true` once handled. Shared by the
// Backspace (prev) and Delete (next) boundary branches.
function selectSealedSiblingCommand(direction: "prev" | "next") {
  return ({ state, tr, dispatch }: CommandProps) => {
    const blockInfo = getBlockInfoFromSelection(state);
    if (!blockInfo.hasContent) {
      return false;
    }

    const atEdge =
      direction === "prev"
        ? state.selection.from === blockInfo.contentStart
        : state.selection.from === blockInfo.contentEnd;
    if (!atEdge || !state.selection.empty) {
      return false;
    }

    const sibling = (
      direction === "prev" ? getPrevBlockInfo : getNextBlockInfo
    )(state.doc, blockInfo.block.beforePos);
    if (!sibling || !isSealed(sibling.block.node)) {
      return false;
    }

    if (dispatch && NodeSelection.isSelectable(sibling.block.node)) {
      tr.setSelection(
        NodeSelection.create(tr.doc, sibling.block.beforePos),
      ).scrollIntoView();
    }
    return true;
  };
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
        // If the previous sibling is a sealed container, selects it instead
        // of merging into it.
        () => commands.command(selectSealedSiblingCommand("prev")),
        // Merges block with the previous one if it isn't indented, and the selection is at the start of the
        // block. The target block for merging must contain inline content.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }
            const { block: blockContainer } = blockInfo;

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
        // If the previous block is a container (e.g. a columnList or a
        // callout), moves the current block to its deepest trailing insertion
        // slot, descending through nested containers (e.g. to the end of the
        // last column).
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockStart =
              state.selection.from === blockInfo.contentStart;
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

            const blockContainerType = state.schema.nodes["blockContainer"];
            const insertionPos = descendToInsertionPos(
              prevBlockInfo,
              blockContainerType,
              "last",
              { respectSealed: true },
            );
            if (insertionPos === null) {
              // When only a sealed boundary blocked the descent (a seal-blind
              // walk does find a slot), the container can't be entered, so
              // it's selected instead, and a second Backspace deletes it
              // explicitly. A container with nowhere a `blockContainer` can
              // land falls through as before.
              if (
                descendToInsertionPos(
                  prevBlockInfo,
                  blockContainerType,
                  "last",
                ) !== null &&
                NodeSelection.isSelectable(prevBlockInfo.block.node)
              ) {
                if (dispatch) {
                  tr.setSelection(
                    NodeSelection.create(tr.doc, prevBlockInfo.block.beforePos),
                  ).scrollIntoView();
                }
                return true;
              }
              return false;
            }

            if (dispatch) {
              tr.delete(blockInfo.block.beforePos, blockInfo.block.afterPos);
              tr.insert(insertionPos, blockInfo.block.node);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve(insertionPos + 1)),
              );

              return true;
            }

            return false;
          }),
        // If the block is the first in a container (e.g. a column or a
        // callout), moves it out: to the end of the previous sibling
        // container if there is one (e.g. the previous column), otherwise to
        // just before the closest enclosing boundary that accepts it (e.g.
        // above the columnList / callout).
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockStart =
              tr.selection.from === blockInfo.contentStart;
            if (!selectionAtBlockStart) {
              return false;
            }

            const $pos = tr.doc.resolve(blockInfo.block.beforePos);

            const prevBlock = $pos.nodeBefore;
            if (prevBlock) {
              return false;
            }

            const parentBlock = $pos.node();
            if (!isContainerNode(parentBlock.type)) {
              return false;
            }

            // A sealed container swallows Backspace at its first block:
            // moving the block out would cross the boundary.
            if (isSealed(parentBlock)) {
              return true;
            }

            const blockContainerType = state.schema.nodes["blockContainer"];
            const containerBeforePos = $pos.before();
            const $containerPos = tr.doc.resolve(containerBeforePos);

            // A previous sibling inside an enclosing container (e.g. the
            // previous column) is a target to descend into. A sibling at a
            // regular block position is not; there the block moves out to
            // before the container instead.
            const prevSibling =
              isContainerNode($containerPos.node().type) &&
              $containerPos.nodeBefore &&
              isContainerNode($containerPos.nodeBefore.type)
                ? $containerPos.nodeBefore
                : null;

            // A gesture move respects seals: a descent blocked by one has
            // nowhere to land.
            const insertionPos = prevSibling
              ? descendToInsertionPos(
                  getBlockInfoFromNode(
                    prevSibling,
                    containerBeforePos - prevSibling.nodeSize,
                  ),
                  blockContainerType,
                  "last",
                  { respectSealed: true },
                )
              : ascendToInsertablePos(
                  tr.doc,
                  containerBeforePos,
                  blockContainerType,
                  { respectSealed: true },
                );
            if (insertionPos === null) {
              return false;
            }

            if (dispatch) {
              moveBlockOutAndPlaceCaret(tr, {
                from: blockInfo.block.beforePos,
                to: blockInfo.block.afterPos,
                node: blockInfo.block.node,
                insertAt: insertionPos,
              });
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
              const bottomNestedPrevBlockInfo = getLastDescendantBlockInfo(
                state.doc,
                prevBlockInfo,
              );
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

              if (
                bottomNestedPrevBlockInfo.content.node.type.spec.content ===
                "tableRow+"
              ) {
                chainedCommands = chainedCommands.setTextSelection(
                  tableContentCaretPos(
                    bottomNestedPrevBlockInfo.content,
                    "end",
                  ),
                );
              } else if (
                bottomNestedPrevBlockInfo.content.node.type.spec.content === ""
              ) {
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
              // The sealed-aware descent stops at a sealed container instead
              // of finding an (empty) block inside it, so the current block
              // is never cut in across the boundary.
              const bottomBlock = getLastDescendantBlockInfo(
                state.doc,
                prevBlockInfo,
                { stopAtSealed: true },
              );

              if (!bottomBlock.hasContent) {
                return false;
              }
              // A sealed content container also stops the descent; deleting
              // it here would take its children with it.
              if (isSealed(bottomBlock.block.node)) {
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
                    // Deletes whole child container if there's only one
                    // child.
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
        // If the next sibling is a sealed container, selects it instead of
        // merging it in. Delete counterpart of the sealed-previous-sibling
        // Backspace case.
        () => commands.command(selectSealedSiblingCommand("next")),
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
        // If the next block is a container (e.g. a columnList or a callout),
        // moves its first leaf block out, to after the current block.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockEnd =
              state.selection.from === blockInfo.contentEnd;
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

            const firstLeaf = getFirstLeafBlock(nextBlockInfo, {
              respectSealed: true,
            });
            if (!firstLeaf) {
              return false;
            }

            if (dispatch) {
              moveBlockOutAndPlaceCaret(tr, {
                from: firstLeaf.block.beforePos,
                to: firstLeaf.block.afterPos,
                node: firstLeaf.block.node,
                insertAt: blockInfo.block.afterPos,
              });

              return true;
            }

            return false;
          }),
        // If the block is the last in a container (e.g. a column or a
        // callout), moves the next block to after it. The next block is the
        // first leaf of the next sibling container, or the block following
        // the enclosing containers.
        () =>
          commands.command(({ state, tr, dispatch }) => {
            const blockInfo = getBlockInfoFromSelection(state);
            if (!blockInfo.hasContent) {
              return false;
            }

            const selectionAtBlockEnd =
              tr.selection.from === blockInfo.contentEnd;
            if (!selectionAtBlockEnd) {
              return false;
            }

            const $pos = tr.doc.resolve(blockInfo.block.afterPos);

            const nextBlock = $pos.nodeAfter;
            if (nextBlock) {
              return false;
            }

            const parentBlock = $pos.node();
            if (!isContainerNode(parentBlock.type)) {
              return false;
            }

            // Climbs out of the containers the block is the last child of,
            // to the first position with a following node.
            let $boundary = $pos;
            while (
              $boundary.nodeAfter === null &&
              $boundary.depth > 0 &&
              isContainerNode($boundary.node().type)
            ) {
              // Pulling a block in from past a sealed boundary would cross
              // it, so the keystroke is swallowed instead.
              if (isSealed($boundary.node())) {
                return true;
              }
              $boundary = tr.doc.resolve($boundary.after());
            }

            const nextNode = $boundary.nodeAfter;
            if (!nextNode) {
              return false;
            }

            // The block to pull in: the next node itself, or its first leaf
            // block when it's a container.
            const target = getFirstLeafBlock(
              getBlockInfoFromNode(nextNode, $boundary.pos),
              { respectSealed: true },
            );
            if (!target) {
              return false;
            }

            if (dispatch) {
              moveBlockOutAndPlaceCaret(tr, {
                from: target.block.beforePos,
                to: target.block.afterPos,
                node: target.block.node,
                insertAt: blockInfo.block.afterPos,
              });
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
              const getNextBlockInfoAtAnyLevel = (
                doc: Node,
                beforePos: number,
              ) => {
                const nextBlockInfo = getNextBlockInfo(doc, beforePos);
                if (nextBlockInfo) {
                  return nextBlockInfo;
                }

                const parentBlockInfo = getParentBlockInfo(doc, beforePos);
                if (
                  !parentBlockInfo ||
                  // Never climbs past a sealed boundary. A block found
                  // there would be pulled in across it.
                  isSealed(parentBlockInfo.block.node)
                ) {
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

              const nextBlockContent = nextBlockInfo.content.node;
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
        // If the block is empty and the last child of a non-sealed container,
        // moves the block out (double Enter exits the container). The block
        // lands at the nearest enclosing position that accepts it. E.g. out
        // of a column it skips the columnList, which holds only columns, and
        // lands below it. Without this, Enter only ever creates new blocks
        // within the container, so the cursor could never leave a trailing
        // container. Shift+Enter still adds spacing inside a container.
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
            const parentBlock = $pos.node();
            if (!isContainerNode(parentBlock.type)) {
              return false;
            }

            // Only fires on the container's last child.
            if (tr.doc.resolve(blockInfo.block.afterPos).nodeAfter !== null) {
              return false;
            }

            // A sealed boundary means Enter never moves content out.
            if (isSealed(parentBlock)) {
              return false;
            }

            const containerAfterPos = ascendToInsertablePos(
              tr.doc,
              $pos.after(),
              state.schema.nodes["blockContainer"],
              { respectSealed: true },
              "after",
            );
            if (containerAfterPos === null) {
              return false;
            }

            if (dispatch) {
              moveBlockOutAndPlaceCaret(tr, {
                from: blockInfo.block.beforePos,
                to: blockInfo.block.afterPos,
                node: blockInfo.block.node,
                insertAt: containerAfterPos,
              });
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
