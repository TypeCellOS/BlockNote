import { BlockNoteEditor } from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
import { useEffect } from "react";

const DRAG_IMAGE_STYLE = `
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: rotate(-1deg);
  overflow: hidden;
`;

const cloneCellWithSize = (cell: Element): HTMLElement => {
  const rect = cell.getBoundingClientRect();
  const clone = cell.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.boxSizing = "border-box";
  // This clone is detached from the table's own stylesheet scope, so its
  // cell borders need to be set inline.
  clone.style.border = "1.5px solid #5e5cd0";
  // Same reason as the border above: regular cells lose the real table's
  // padding once detached, leaving text flush against the left edge.
  if (clone.tagName === "TD") {
    clone.style.paddingLeft = "16px";
  }
  // Header cells lose their muted background for the same reason; copy the
  // real, already-rendered color instead of guessing which token backs it.
  if (clone.tagName === "TH") {
    clone.style.backgroundColor = getComputedStyle(cell).backgroundColor;
  }
  return clone;
};

const buildRowDragImage = (sourceRow: HTMLTableRowElement): HTMLElement => {
  const table = document.createElement("table");
  table.style.cssText = DRAG_IMAGE_STYLE;
  const tbody = document.createElement("tbody");
  const rowClone = document.createElement("tr");
  Array.from(sourceRow.children).forEach((cell) => {
    rowClone.appendChild(cloneCellWithSize(cell));
  });
  tbody.appendChild(rowClone);
  table.appendChild(tbody);
  return table;
};

const buildColumnDragImage = (
  rows: HTMLTableRowElement[],
  colIndex: number,
): HTMLElement => {
  const table = document.createElement("table");
  table.style.cssText = DRAG_IMAGE_STYLE;
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const cell = row.children[colIndex];
    if (!cell) {
      return;
    }
    const rowClone = document.createElement("tr");
    rowClone.appendChild(cloneCellWithSize(cell));
    tbody.appendChild(rowClone);
  });
  table.appendChild(tbody);
  return table;
};

/**
 * BlockNote drags table rows/columns with a hidden 1x1 native drag image
 * (see TableHandlesExtension), so nothing visibly follows the cursor - the
 * only feedback is the drop-cursor line and (with TableDragSourceExtension)
 * a tint on the source. This adds a real drag image: a cloned snapshot of
 * the row/column, styled like a lifted card, so the drag actually looks like
 * you're carrying the row/column to its new position (Loop/Notion-style).
 *
 * It has to live on `document` in the bubble phase: BlockNote's own
 * `dragstart` handler (which sets the hidden image and populates
 * `draggingState`) runs when the native event reaches React's root, and a
 * later `setDragImage` call always wins over an earlier one in the same
 * `dragstart` - so this must observe the event *after* React's handler,
 * which "after everything else, at the top of the bubble chain" guarantees
 * regardless of where React's root happens to sit in the DOM.
 */
export const useTableDragImage = (editor: BlockNoteEditor<any, any, any>) => {
  useEffect(() => {
    const handleDragStart = (event: DragEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.closest(".bn-table-handle") ||
        !event.dataTransfer
      ) {
        return;
      }

      const tableHandles = editor.getExtension(TableHandlesExtension);
      const state = tableHandles?.store?.state;
      const draggingState = state?.draggingState;
      if (!state || !draggingState) {
        return;
      }

      const anchorEl = document.elementFromPoint(
        state.referencePosTable.x + 1,
        state.referencePosTable.y + 1,
      );
      const table = anchorEl?.closest("table");
      if (!table) {
        return;
      }

      const rows = Array.from(table.rows);
      const { draggedCellOrientation, originalIndex } = draggingState;

      const dragImage =
        draggedCellOrientation === "row"
          ? rows[originalIndex] &&
            buildRowDragImage(rows[originalIndex] as HTMLTableRowElement)
          : buildColumnDragImage(rows as HTMLTableRowElement[], originalIndex);
      if (!dragImage) {
        return;
      }

      dragImage.style.position = "fixed";
      dragImage.style.top = "-9999px";
      dragImage.style.left = "-9999px";
      dragImage.style.pointerEvents = "none";
      document.body.appendChild(dragImage);

      event.dataTransfer.setDragImage(dragImage, 16, 16);

      setTimeout(() => {
        dragImage.remove();
      }, 0);
    };

    document.addEventListener("dragstart", handleDragStart);
    return () => {
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, [editor]);
};
