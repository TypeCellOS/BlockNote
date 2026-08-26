import type { BlockNoteEditor } from "@blocknote/core";
import {
  UniqueID,
  createExtension,
  fragmentToBlocks,
  getBlockInfoFromNode,
  isContainerNode,
  nodeToBlock,
} from "@blocknote/core";
import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { detectEdgePosition } from "./multiColumnDropCursor.js";

/**
 * Creates a ProseMirror plugin that handles drop events for multi-column layouts.
 * When a block is dropped near the left or right edge of another block, it creates
 * or modifies column layouts.
 */
export function createMultiColumnHandleDropPlugin(
  editor: BlockNoteEditor<any, any, any>,
): Plugin {
  return new Plugin({
    props: {
      handleDrop(view: EditorView, event: DragEvent, slice, _moved) {
        const edgePos = detectEdgePosition(event, view, view.state);
        if (edgePos === null) {
          return false; // Let ProseMirror handle the drop (e.g. outside editor bounds)
        }

        const blockInfo = getBlockInfoFromNode(
          edgePos.node,
          edgePos.posBeforeNode,
        );

        // Only handle edge drops (left/right)
        if (edgePos.position === "regular") {
          return false; // Let ProseMirror handle regular drops
        }

        // `fragmentToBlocks` instead of converting the fragment's children
        // directly, as multi-block selections can produce fragments where the
        // blocks are nested in e.g. a `blockGroup` node.
        const draggedBlocks = fragmentToBlocks<any, any, any>(slice.content);
        if (draggedBlocks.length === 0) {
          return false; // Let ProseMirror handle empty slice drops
        }
        const draggedBlockIds = new Set(draggedBlocks.map((block) => block.id));

        // Whether the edge target is a `columnList` (after `detectEdgePosition`
        // hoisted blocks inside a column to the column itself, the target's
        // parent is the columnList).
        const $target = view.state.doc.resolve(blockInfo.block.beforePos);
        const targetInHorizontalContainer =
          $target.node().type.name === "columnList";

        if (targetInHorizontalContainer) {
          // The user is dropping the target column's entire contents on the
          // column's own edge - the new column would just replace the
          // emptied target in the same position, so do nothing. This also
          // keeps the column's ID and width instead of resetting them.
          let allTargetChildrenDragged = true;
          // A column is a pure container: its `children` node is the column
          // node itself.
          const columnChildren =
            blockInfo.children?.node ?? blockInfo.block.node;
          columnChildren.forEach((child) => {
            if (!draggedBlockIds.has(child.attrs.id)) {
              allTargetChildrenDragged = false;
            }
          });
          if (allTargetChildrenDragged) {
            return true;
          }

          // Insert a new sibling child in the existing horizontal container
          // (e.g. a new column in the columnList).
          const parentBlock = $target.node();

          const columnList = nodeToBlock<any, any, any>(
            parentBlock,
            view.state.doc,
          );

          // Whether the horizontal container's children are typed child
          // containers (like `column`) that wrap the actual blocks, or plain
          // blocks spliced in directly.
          const targetIsChildContainer = isContainerNode(
            blockInfo.block.node.type,
          );

          // Normalize column widths to average of 1
          // In a `columnList`, we expect that the average width of each column
          // is 1. However, there are cases in which this stops being true. For
          // example, having one wider column and then removing it will cause
          // the average width to go down. This isn't really an issue until the
          // user tries to add a new column, which will, in this case, be wider
          // than expected. Therefore, we normalize the column widths to an
          // average of 1 here to avoid this issue. (Only applies to child
          // containers with a numeric `width` prop, i.e. columns.)
          if (
            columnList.children.every(
              (column) => typeof column.props.width === "number",
            )
          ) {
            let sumColumnWidthPercent = 0;
            columnList.children.forEach((column) => {
              sumColumnWidthPercent += column.props.width as number;
            });
            const avgColumnWidthPercent =
              sumColumnWidthPercent / columnList.children.length;

            // If the average column width is not 1, normalize it. We're
            // dealing with floats so we need a small margin to account for
            // precision errors.
            if (avgColumnWidthPercent < 0.99 || avgColumnWidthPercent > 1.01) {
              const scalingFactor = 1 / avgColumnWidthPercent;

              columnList.children.forEach((column) => {
                column.props.width =
                  (column.props.width as number) * scalingFactor;
              });
            }
          }

          const targetColumnId = blockInfo.block.node.attrs.id;

          // The target itself is one of the dragged blocks (only possible
          // when the container holds plain blocks directly) - the dragged
          // blocks would be re-inserted around their own position, so do
          // nothing, same as dropping a typed target's entire contents on
          // its own edge.
          if (!targetIsChildContainer && draggedBlockIds.has(targetColumnId)) {
            return true;
          }

          // Tracks which of the dragged blocks were already in the column
          // list - removing those from their old position is handled by
          // filtering the column list's children instead of `removeBlocks`.
          const blocksAlreadyInColumnList = new Set<string>();
          const remainingColumns = columnList.children
            // If any of the dragged blocks are in one of the columns, remove
            // them.
            .map((column) =>
              targetIsChildContainer
                ? {
                    ...column,
                    children: column.children.filter((block) => {
                      if (!draggedBlockIds.has(block.id)) {
                        return true;
                      }

                      blocksAlreadyInColumnList.add(block.id);
                      return false;
                    }),
                  }
                : column,
            )
            // Remove empty columns (can happen when dragged blocks are
            // removed) and, when the container holds plain blocks directly,
            // dragged direct children (which are re-inserted at the drop
            // position).
            .filter((column) => {
              if (targetIsChildContainer) {
                return column.children.length > 0;
              }
              if (!draggedBlockIds.has(column.id)) {
                return true;
              }

              blocksAlreadyInColumnList.add(column.id);
              return false;
            });

          // The insertion index is computed on the remaining columns, as
          // removing an emptied column before the drop target shifts the
          // target's position in the list.
          const targetIndex = remainingColumns.findIndex(
            (column) => column.id === targetColumnId,
          );
          if (targetIndex === -1) {
            // The target column can only be missing if the drag emptied it,
            // which is handled as a no-op above.
            throw new Error(
              "Drop target column not found in the remaining columns",
            );
          }
          const insertionIndex =
            edgePos.position === "left" ? targetIndex : targetIndex + 1;

          // Insert the dragged blocks in the correct position, wrapped in a
          // new child container (e.g. a new `column`) when the container's
          // children are typed containers, or spliced in directly otherwise.
          const insertedChildren = targetIsChildContainer
            ? [
                {
                  type: blockInfo.blockNoteType,
                  children: draggedBlocks,
                  props: {},
                  content: undefined,
                  id: UniqueID.options.generateID(),
                },
              ]
            : draggedBlocks;
          const newChildren = remainingColumns.toSpliced(
            insertionIndex,
            0,
            ...insertedChildren,
          );

          const blocksToRemove = draggedBlocks.filter(
            (block) =>
              editor.getBlock(block.id) &&
              !blocksAlreadyInColumnList.has(block.id),
          );
          if (blocksToRemove.length > 0) {
            editor.removeBlocks(blocksToRemove);
          }

          editor.updateBlock(columnList, {
            children: newChildren,
          });
        } else {
          // Create new columnList with blocks as columns
          const block = nodeToBlock(blockInfo.block.node, view.state.doc);

          // The user is dropping next to one of the blocks being dragged - do
          // nothing.
          if (draggedBlockIds.has(block.id)) {
            return true;
          }

          const columns =
            edgePos.position === "left"
              ? [draggedBlocks, [block]]
              : [[block], draggedBlocks];

          const blocksToRemove = draggedBlocks.filter((draggedBlock) =>
            editor.getBlock(draggedBlock.id),
          );
          if (blocksToRemove.length > 0) {
            editor.removeBlocks(blocksToRemove);
          }

          editor.replaceBlocks(
            [block],
            [
              {
                type: "columnList",
                children: columns.map((children) => {
                  return {
                    type: "column",
                    children,
                  };
                }),
              },
            ],
          );
        }

        return true; // Prevent default ProseMirror drop behavior
      },
    },
  });
}

/**
 * BlockNote extension that adds the multi-column drop handler plugin.
 * This should be added to the editor's extensions to enable column creation via drag-and-drop.
 */
export const MultiColumnDropHandlerExtension = createExtension(
  ({ editor }) => ({
    key: "multiColumnDropHandler",
    prosemirrorPlugins: [createMultiColumnHandleDropPlugin(editor)],
  }),
);
