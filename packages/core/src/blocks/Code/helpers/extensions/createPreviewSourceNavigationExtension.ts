import { Plugin, PluginKey, Selection, TextSelection } from "prosemirror-state";
import {
  getBlockInfo,
  getBlockInfoFromSelection,
  getNearestBlockPos,
} from "../../../../api/getBlockInfoFromPos.js";
import { createExtension } from "../../../../editor/BlockNoteExtension.js";

/**
 * Blocks like the math block render their content as a preview and hide the
 * editable source unless the block is selected. Because the source has no
 * visible size while hidden, the browser (and so ProseMirror's default arrow
 * key handling) skips straight over the block when navigating from an adjacent
 * block - there's nowhere visible for the cursor to land.
 *
 * This extension restores that navigation: when an arrow key would move the
 * cursor across one of these blocks, we instead place the cursor inside its
 * (now revealed) source content.
 *
 * - Forward keys (ArrowRight/ArrowDown) from the end of the previous block move
 *   to the start of the block's content.
 * - Backward keys (ArrowLeft/ArrowUp) from the start of the next block move to
 *   the end of the block's content.
 *
 * It only ever moves *into* the block - leaving it works by default since the
 * source is visible while the block is selected.
 */
export const createPreviewSourceNavigationExtension = (
  key: string,
  blockType: string,
) =>
  createExtension({
    key,
    prosemirrorPlugins: [
      new Plugin({
        key: new PluginKey(`${key}-plugin`),
        props: {
          handleKeyDown: (view, event) => {
            const forward =
              event.key === "ArrowRight" || event.key === "ArrowDown";
            const backward =
              event.key === "ArrowLeft" || event.key === "ArrowUp";
            const vertical =
              event.key === "ArrowUp" || event.key === "ArrowDown";

            if (!forward && !backward) {
              return false;
            }

            // Modifier-held arrows (selection extension, word jumps, etc.) and
            // IME composition are left to their default behaviour.
            if (
              event.shiftKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.altKey ||
              event.isComposing
            ) {
              return false;
            }

            const { state } = view;
            const { selection, doc } = state;

            // Only collapsed text cursors and node selections (e.g. images)
            // can navigate into an adjacent block. Anything else (cell
            // selections, ranged selections) is left to the default handler.
            const isNodeSelection = "node" in selection;
            if (!isNodeSelection && !selection.empty) {
              return false;
            }

            // If we're already inside one of these blocks, leaving it is
            // handled by the default behaviour - don't hijack it.
            const currentBlock = getBlockInfoFromSelection(state);
            if (
              currentBlock.isBlockContainer &&
              currentBlock.blockNoteType === blockType
            ) {
              return false;
            }

            // Moves the cursor into the block adjacent to the current one in
            // the move direction - but only if it's one of the blocks this
            // extension handles. Searching outwards from the block boundary
            // (whose parent isn't inline content, so `findFrom` steps into the
            // neighbour rather than returning the boundary unchanged) lands on
            // the nearest selectable position: the neighbour's content start
            // when moving forward, or its end when moving back. `textOnly` is
            // false so leaf-node neighbours (e.g. images) are stopped at rather
            // than skipped over. Returns whether it moved.
            const moveIntoSibling = () => {
              const boundaryPos = forward
                ? currentBlock.bnBlock.afterPos
                : currentBlock.bnBlock.beforePos;
              const target = Selection.findFrom(
                doc.resolve(boundaryPos),
                forward ? 1 : -1,
                false,
              );

              if (!target) {
                return false;
              }

              const targetBlock = getBlockInfo(
                getNearestBlockPos(doc, target.from),
              );
              if (
                !targetBlock.isBlockContainer ||
                targetBlock.blockNoteType !== blockType
              ) {
                return false;
              }

              view.dispatch(state.tr.setSelection(target).scrollIntoView());

              return true;
            };

            // Determines whether the cursor sits at the very end (forward) or
            // start (backward) of the current block. We search for the
            // nearest text position from *outside* the block's boundary
            // inwards - this avoids `findFrom`'s habit of returning the given
            // position unchanged when it's already inside inline content, and
            // naturally handles tables (the inner position is in the last /
            // first cell).
            const atBlockEdge = () => {
              // A selected node (e.g. an image) has no inner cursor positions,
              // so any arrow key exits it.
              if (isNodeSelection) {
                return true;
              }

              const innermost = Selection.findFrom(
                doc.resolve(
                  forward
                    ? currentBlock.bnBlock.afterPos
                    : currentBlock.bnBlock.beforePos,
                ),
                forward ? -1 : 1,
                true,
              );
              if (!innermost) {
                return false;
              }

              return forward
                ? selection.$to.pos >= innermost.from
                : selection.$from.pos <= innermost.from;
            };

            // Primary case: the cursor is at the edge of its block and the
            // sibling block in the move direction is the target block. This
            // covers inline blocks (paragraphs, headings), node-selected
            // blocks (images), and the document-order edge of a table (its
            // last / first cell).
            if (atBlockEdge() && moveIntoSibling()) {
              return true;
            }

            // Tables navigate cell-by-cell, so vertical keys from the bottom
            // row (down) or top row (up) - other than at the document-order
            // corner handled above - aren't caught by the search above. Detect
            // that we're at the table's vertical edge and check the sibling
            // block directly.
            if (
              vertical &&
              currentBlock.isBlockContainer &&
              currentBlock.blockNoteType === "table"
            ) {
              const { $head } = selection as TextSelection;

              let rowDepth = $head.depth;
              while (
                rowDepth > 0 &&
                $head.node(rowDepth).type.name !== "tableRow"
              ) {
                rowDepth--;
              }

              if (rowDepth > 0) {
                const tableNode = $head.node(rowDepth - 1);
                const rowIndex = $head.index(rowDepth - 1);
                const atVerticalEdge = forward
                  ? rowIndex === tableNode.childCount - 1
                  : rowIndex === 0;

                // Only exit when the cursor is on the last/first visual line of
                // the cell, so multi-line cells still navigate internally.
                if (
                  atVerticalEdge &&
                  view.endOfTextblock(forward ? "down" : "up") &&
                  moveIntoSibling()
                ) {
                  return true;
                }
              }
            }

            return false;
          },
        },
      }),
    ],
  });
