import type { Block } from "@blocknote/core";
import { UniqueID } from "@blocknote/core";

/**
 * Computes the new `children` array for a `columnList` after a block (or a
 * whole column) is dropped onto the left/right edge of one of its columns.
 *
 * The dragged item is removed from wherever it currently sits (either as a
 * top-level column, or as a block nested inside one of the columns), any
 * column left empty by that removal is dropped, and a new column wrapping
 * the dragged item is inserted next to the target column.
 *
 * The index of the target column is resolved against the already-filtered
 * list, so removing a column ahead of the target doesn't shift where the new
 * column ends up.
 */
export function computeColumnListChildrenAfterDrop(
  columnList: Block<any, any, any>,
  draggedBlock: Block<any, any, any>,
  targetColumnId: string,
  position: "left" | "right",
): Block<any, any, any>[] {
  const draggedIsColumn = draggedBlock.type === "column";

  const withDraggedRemoved = columnList.children
    .filter((column) => !draggedIsColumn || column.id !== draggedBlock.id)
    .map((column) =>
      draggedIsColumn
        ? column
        : {
            ...column,
            children: column.children.filter(
              (block) => block.id !== draggedBlock.id,
            ),
          },
    )
    .filter((column) => column.children.length > 0);

  const targetIndex = withDraggedRemoved.findIndex(
    (column) => column.id === targetColumnId,
  );

  const newColumn = {
    type: "column" as const,
    children: draggedIsColumn ? draggedBlock.children : [draggedBlock],
    props: {},
    content: undefined,
    id: UniqueID.options.generateID(),
  };

  return withDraggedRemoved.toSpliced(
    position === "left" ? targetIndex : targetIndex + 1,
    0,
    newColumn,
  );
}
