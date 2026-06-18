import type { Node } from "prosemirror-model";
import { NodeSelection, Selection, TextSelection } from "prosemirror-state";
import { cellAround, nextCell } from "prosemirror-tables";
import type { EditorView } from "prosemirror-view";
import {
  getNextBlockInfo,
  getPrevBlockInfo,
} from "../../../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import {
  type BlockInfo,
  getBlockInfoFromResolvedPos,
  getBlockInfoFromSelection,
  getBlockInfoFromTransaction,
} from "../../../../api/getBlockInfoFromPos.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { createExtension } from "../../../../editor/BlockNoteExtension.js";

type Direction = "left" | "right" | "up" | "down";

// Checks whether moving the text cursor in a given direction should move it out of the block.
const endOfBlock = (view: EditorView, direction: Direction): boolean => {
  const { selection } = view.state;

  const blockInfo = getBlockInfoFromSelection(view.state);

  // Always moves selection to previous/next block when whole block is selected.
  if (
    selection instanceof NodeSelection &&
    selection.node.type.spec.group === "blockContent"
  ) {
    return true;
  }

  // Left/right arrows always collapse selection to it's start/end (default behaviour) - never move
  // selection out of the block.
  if (!selection.empty && (direction === "left" || direction === "right")) {
    return false;
  }

  // Navigating within text content never moves the selection outside the block.
  if (!view.endOfTextblock(direction)) {
    return false;
  }

  // If there is a cell to move into for the given direction, the selection moves into it.
  // Otherwise, it moves out of the block.
  if (blockInfo.isBlockContainer && blockInfo.blockNoteType === "table") {
    const cell = cellAround(selection.$head);

    if (
      !cell ||
      nextCell(
        cell,
        direction === "up" || direction === "down" ? "vert" : "horiz",
        direction === "down" || direction === "right" ? 1 : -1,
      )
    ) {
      return false;
    }
  }

  return true;
};

// Gets the block info of the first or last `blockContainer` in a `column`/`columnList`.
const getEdgeBlockContainerInfo = (
  doc: Node,
  blockInfo: BlockInfo,
  forward: boolean,
): BlockInfo => {
  while (!blockInfo.isBlockContainer) {
    const group = blockInfo.childContainer.node;
    const childPos = doc
      .resolve(blockInfo.childContainer.beforePos + 1)
      .posAtIndex(forward ? 0 : group.childCount - 1);
    blockInfo = getBlockInfoFromResolvedPos(doc.resolve(childPos));
  }

  return blockInfo;
};

// Handles arrow key presses.
const createArrowHandler =
  (blockType: string, direction: Direction) =>
  ({ editor }: { editor: BlockNoteEditor<any, any, any> }) => {
    const view = editor.prosemirrorView;

    return editor.transact((tr) => {
      if (!endOfBlock(view, direction)) {
        return false;
      }

      const forward = direction === "right" || direction === "down";
      const vertical = direction === "up" || direction === "down";

      const blockInfo = getBlockInfoFromTransaction(tr);
      if (!blockInfo.isBlockContainer) {
        return false;
      }

      let adjacentBlockInfo = forward
        ? getNextBlockInfo(tr.doc, blockInfo.bnBlock.beforePos)
        : getPrevBlockInfo(tr.doc, blockInfo.bnBlock.beforePos);

      if (adjacentBlockInfo && !adjacentBlockInfo.isBlockContainer) {
        // Edge case for when the adjacent block is a `column`/`columnList` - use the first or last
        // `blockContainer` in it depending on direction.
        adjacentBlockInfo = getEdgeBlockContainerInfo(
          tr.doc,
          adjacentBlockInfo,
          forward,
        );
      }

      // Use default handling when no adjacent block exists.
      if (!adjacentBlockInfo || !adjacentBlockInfo.isBlockContainer) {
        return false;
      }

      // Navigating onto a preview-source block selects the whole node.
      if (adjacentBlockInfo.blockNoteType === blockType) {
        tr.setSelection(
          NodeSelection.create(
            tr.doc,
            adjacentBlockInfo.blockContent.beforePos,
          ),
        ).scrollIntoView();

        return true;
      }

      // Leaving a preview-source block via a vertical arrow emulates the behavior of a horizontal
      // arrow press at the block's boundary. This is because vertical arrow presses move selection
      // based on DOM layout, which causes slightly weird UX when done from the source popup.
      if (vertical && blockInfo.blockNoteType === blockType) {
        const target = Selection.findFrom(
          tr.doc.resolve(
            forward
              ? adjacentBlockInfo.bnBlock.beforePos
              : adjacentBlockInfo.bnBlock.afterPos,
          ),
          forward ? 1 : -1,
          false,
        );

        if (target) {
          tr.setSelection(target).scrollIntoView();

          return true;
        }
      }

      return false;
    });
  };

/**
 * This extension is necessary for graceful keyboard navigation around blocks which use
 * `createPreviewWithSourcePopup` to render their content. It's important to have this context as
 * the source code popup with the block's inline content only becomes visible when the selection is
 * moved somewhere into this inline content. This means we cannot rely of default keyboard
 * navigation as while the block has content, that content is hidden while the selection is outside
 * of it, so the default handling skips it.
 */
export const createPreviewSourceNavigationExtension = (
  key: string,
  blockType: string,
) =>
  createExtension({
    key,
    keyboardShortcuts: {
      // Toggles between opening and closing the source code popup by setting the selection on the
      // whole block content node (hiding popup) or at the start of the inline content node
      // (showing popup).
      Enter: ({ editor }) =>
        editor.transact((tr) => {
          const blockInfo = getBlockInfoFromTransaction(tr);
          if (
            !blockInfo.isBlockContainer ||
            blockInfo.blockNoteType !== blockType
          ) {
            return false;
          }

          if (tr.selection instanceof NodeSelection) {
            tr.setSelection(
              TextSelection.create(
                tr.doc,
                blockInfo.blockContent.beforePos + 1,
              ),
            );
          } else {
            tr.setSelection(
              NodeSelection.create(tr.doc, blockInfo.blockContent.beforePos),
            );
          }

          return true;
        }),
      // Closes the source code popup by setting the selection on the whole block content node.
      Escape: ({ editor }) =>
        editor.transact((tr) => {
          const blockInfo = getBlockInfoFromTransaction(tr);

          if (
            !blockInfo.isBlockContainer ||
            blockInfo.blockNoteType !== blockType ||
            tr.selection instanceof NodeSelection
          ) {
            return false;
          }

          tr.setSelection(
            NodeSelection.create(tr.doc, blockInfo.blockContent.beforePos),
          );

          return true;
        }),
      ArrowRight: createArrowHandler(blockType, "right"),
      ArrowDown: createArrowHandler(blockType, "down"),
      ArrowLeft: createArrowHandler(blockType, "left"),
      ArrowUp: createArrowHandler(blockType, "up"),
    },
  });
