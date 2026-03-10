import type { BlockNoteEditor } from "@blocknote/core";
import {
  UniqueID,
  createExtension,
  getBlockInfo,
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

        const blockInfo = getBlockInfo(edgePos);

        // Only handle edge drops (left/right)
        if (edgePos.position === "regular") {
          return false; // Let ProseMirror handle regular drops
        }

        if (slice.content.childCount === 0) {
          return false; // Let ProseMirror handle empty slice drops
        }

        const draggedBlock = nodeToBlock(
          slice.content.child(0),
          editor.pmSchema,
        );

        if (blockInfo.blockNoteType === "column") {
          // Insert new column in existing columnList
          const parentBlock = view.state.doc
            .resolve(blockInfo.bnBlock.beforePos)
            .node();

          const columnList = nodeToBlock<any, any, any>(
            parentBlock,
            editor.pmSchema,
          );

          // Normalize column widths to average of 1
          // In a `columnList`, we expect that the average width of each column
          // is 1. However, there are cases in which this stops being true. For
          // example, having one wider column and then removing it will cause
          // the average width to go down. This isn't really an issue until the
          // user tries to add a new column, which will, in this case, be wider
          // than expected. Therefore, we normalize the column widths to an
          // average of 1 here to avoid this issue.
          let sumColumnWidthPercent = 0;
          columnList.children.forEach((column) => {
            sumColumnWidthPercent += column.props.width as number;
          });
          const avgColumnWidthPercent =
            sumColumnWidthPercent / columnList.children.length;

          // If the average column width is not 1, normalize it. We're dealing
          // with floats so we need a small margin to account for precision
          // errors.
          if (avgColumnWidthPercent < 0.99 || avgColumnWidthPercent > 1.01) {
            const scalingFactor = 1 / avgColumnWidthPercent;

            columnList.children.forEach((column) => {
              column.props.width =
                (column.props.width as number) * scalingFactor;
            });
          }

          const index = columnList.children.findIndex(
            (b) => b.id === blockInfo.bnBlock.node.attrs.id,
          );

          const newChildren = columnList.children
            // If the dragged block is in one of the columns, remove it.
            .map((column) => ({
              ...column,
              children: column.children.filter(
                (block) => block.id !== draggedBlock.id,
              ),
            }))
            // Remove empty columns (can happen when dragged block is removed).
            .filter((column) => column.children.length > 0)
            // Insert the dragged block in the correct position.
            .toSpliced(edgePos.position === "left" ? index : index + 1, 0, {
              type: "column",
              children: [draggedBlock],
              props: {},
              content: undefined,
              id: UniqueID.options.generateID(),
            });

          if (editor.getBlock(draggedBlock.id)) {
            editor.removeBlocks([draggedBlock]);
          }

          editor.updateBlock(columnList, {
            children: newChildren,
          });
        } else {
          // Create new columnList with blocks as columns
          const block = nodeToBlock(blockInfo.bnBlock.node, editor.pmSchema);

          // The user is dropping next to the original block being dragged - do
          // nothing.
          if (block.id === draggedBlock.id) {
            return true;
          }

          const blocks =
            edgePos.position === "left"
              ? [draggedBlock, block]
              : [block, draggedBlock];

          if (editor.getBlock(draggedBlock.id)) {
            editor.removeBlocks([draggedBlock]);
          }

          editor.replaceBlocks(
            [block],
            [
              {
                type: "columnList",
                children: blocks.map((b) => {
                  return {
                    type: "column",
                    children: [b],
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
