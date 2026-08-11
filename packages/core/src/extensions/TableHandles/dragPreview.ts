import { EditorView } from "prosemirror-view";

import { RelativeCellIndices } from "../../api/blockManipulation/tables/tables.js";
import {
  DRAG_SOURCE_COL_CLASS,
  DRAG_SOURCE_ROW_CLASS,
  DROP_CURSOR_CLASS,
} from "./dragDecorations.js";

let dragImageElement: HTMLElement | undefined;

// Clones a single table cell for use in the drag preview. The clone is pulled
// out of the real table, so it loses everything the table's own layout was
// giving it.
function cloneCellWithSize(cell: Element): HTMLElement {
  // Read the size before cloning: column widths live on the table's
  // `<colgroup>` and row heights are implied by the tallest cell in the row,
  // neither of which survives into a table built from a handful of cells.
  const { width, height } = cell.getBoundingClientRect();

  const clone = cell.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.boxSizing = "border-box";

  // The snapshot is taken after the drag decorations have been applied, so the
  // cell being cloned is already marked up as the drag source (and may contain
  // a drop cursor widget). The preview should look like the row/column itself,
  // not like its drag state.
  clone.classList.remove(
    DRAG_SOURCE_ROW_CLASS,
    DRAG_SOURCE_COL_CLASS,
    "ProseMirror-selectednode",
  );
  clone
    .querySelectorAll(`.${DROP_CURSOR_CLASS}`)
    .forEach((widget) => widget.remove());

  // The preview only holds the dragged row (or column), so a span pointing at
  // cells that aren't in it would stretch the clone out of shape. The size set
  // above already accounts for the space the span was taking up.
  clone.removeAttribute("colspan");
  clone.removeAttribute("rowspan");

  return clone;
}

/**
 * Builds the image shown next to the cursor while dragging a table row or
 * column: a snapshot of the row/column itself, styled like a lifted card, so
 * the drag actually looks like you're carrying it to its new position.
 *
 * `cells` are the cells making up the dragged row/column, as returned by
 * `getCellsAtRowHandle` / `getCellsAtColumnHandle` - using those (rather than
 * indexing the DOM directly) means merged cells resolve to the right elements.
 *
 * Returns the element to hand to `DataTransfer.setDragImage`, or `undefined`
 * if the table's DOM couldn't be read, in which case the caller should fall
 * back to the hidden drag image.
 */
export function setTableDragImage(
  view: EditorView,
  // The block container element for the table, i.e. `TableHandlesView`'s
  // `tableElement`.
  blockElement: HTMLElement,
  cells: RelativeCellIndices[],
  orientation: "row" | "col",
): HTMLElement | undefined {
  const tableBody = blockElement.querySelector("tbody");

  if (!tableBody) {
    return undefined;
  }

  const cellClones: HTMLElement[] = [];
  for (const { row, col } of cells) {
    // Relative cell indices line up with the DOM here for the same reason they
    // line up with the ProseMirror node tree: one `<tr>` per row node, one
    // cell element per cell node.
    const cell = tableBody.children[row]?.children[col];

    if (cell) {
      cellClones.push(cloneCellWithSize(cell));
    }
  }

  if (cellClones.length === 0) {
    return undefined;
  }

  const table = document.createElement("table");
  const tableBodyClone = document.createElement("tbody");

  if (orientation === "row") {
    const rowClone = document.createElement("tr");
    cellClones.forEach((cell) => rowClone.appendChild(cell));
    tableBodyClone.appendChild(rowClone);
  } else {
    cellClones.forEach((cell) => {
      const rowClone = document.createElement("tr");
      rowClone.appendChild(cell);
      tableBodyClone.appendChild(rowClone);
    });
  }

  table.appendChild(tableBodyClone);

  const wrapper = document.createElement("div");
  wrapper.appendChild(table);

  // The preview is appended outside the editor, so the theme variables (which
  // `@blocknote/react` defines on `.bn-root`) only resolve if it carries the
  // class, and the colour scheme, itself.
  const colorScheme = view.dom
    .closest(".bn-root")
    ?.getAttribute("data-color-scheme");
  if (colorScheme) {
    wrapper.setAttribute("data-color-scheme", colorScheme);
  }

  // TODO: This is hacky, need a better way of assigning classes to the editor
  //  so that they can also be applied to the drag preview. Same caveat as the
  //  equivalent code in `SideMenu/dragging.ts`.
  const inheritedClasses = view.dom.className
    .split(" ")
    .filter(
      (className) =>
        className !== "ProseMirror" &&
        className !== "bn-root" &&
        className !== "bn-editor",
    )
    .join(" ");

  wrapper.className =
    `bn-root bn-drag-preview bn-table-drag-preview ${inheritedClasses}`.trim();

  // dataTransfer.setDragImage(element) only works if element is attached to the
  // DOM.
  unsetTableDragImage();
  dragImageElement = wrapper;

  if (view.root instanceof ShadowRoot) {
    view.root.appendChild(wrapper);
  } else {
    view.root.body.appendChild(wrapper);
  }

  return wrapper;
}

export function unsetTableDragImage() {
  // `remove()` rather than `removeChild()` on the root the element was added
  // to: the preview outlives a single drag only when something went wrong (a
  // missed `dragend`, an editor unmounting mid-drag), and in those cases the
  // root it was attached to may no longer be its parent.
  dragImageElement?.remove();
  dragImageElement = undefined;
}
