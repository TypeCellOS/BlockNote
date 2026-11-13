import type { EditorView } from "prosemirror-view";
import { RelativeCellIndices } from "../../api/blockManipulation/tables/tables.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  DRAG_SOURCE_COL_CLASS,
  DRAG_SOURCE_ROW_CLASS,
  DROP_CURSOR_CLASS,
} from "./dragDecorations.js";

const previews = new WeakMap<EditorView, Element>();

export function removeDragPreview(view: EditorView) {
  previews.get(view)?.remove();
  previews.delete(view);
}

export function attachDragPreview(view: EditorView, preview: Element) {
  removeDragPreview(view);
  const parent = view.dom.parentElement;
  const root = view.root;
  const previewParent = parent?.isConnected
    ? parent
    : root instanceof ShadowRoot
      ? root
      : root.body;
  previewParent.appendChild(preview);
  previews.set(view, preview);
}

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
    "selectedCell",
  );
  clone
    .querySelectorAll(".ProseMirror-selectednode, .selectedCell")
    .forEach((node) => {
      node.classList.remove("ProseMirror-selectednode", "selectedCell");
    });
  clone
    // Editing widgets and embeds are not part of the cell's content snapshot.
    // As with whole-block previews, an embed can prevent native drag capture.
    .querySelectorAll(
      `.${DROP_CURSOR_CLASS}, .column-resize-handle, .ProseMirror-gapcursor, iframe, embed, object`,
    )
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
 * column. Like whole-block previews, it keeps the editor's DOM/style context
 * rather than approximating its appearance with a second set of table styles.
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
  editor: BlockNoteEditor<any, any, any>,
  // The block container element for the table, i.e. `TableHandlesView`'s
  // `tableElement`.
  blockElement: HTMLElement,
  cells: RelativeCellIndices[],
  orientation: "row" | "col",
): HTMLElement | undefined {
  const sourceTable = blockElement.querySelector("table");
  const tableBody = sourceTable?.querySelector("tbody");

  if (!sourceTable || !tableBody) {
    return undefined;
  }

  const table = sourceTable.cloneNode(false) as HTMLTableElement;
  // The original width/colgroup describe the whole table, not this subset.
  table.style.removeProperty("width");
  table.style.removeProperty("min-width");
  const tableBodyClone = tableBody.cloneNode(false) as HTMLElement;

  for (const { row, col } of cells) {
    // Relative cell indices line up with the DOM here for the same reason they
    // line up with the ProseMirror node tree: one `<tr>` per row node, one
    // cell element per cell node.
    const rowElement = tableBody.children[row];
    const cell = rowElement?.children[col];

    if (cell && rowElement) {
      // Row previews share one row; column previews keep each cell's own row.
      const rowClone =
        (orientation === "row" && tableBodyClone.firstElementChild) ||
        tableBodyClone.appendChild(rowElement.cloneNode(false));
      rowClone.appendChild(cloneCellWithSize(cell));
    }
  }

  if (tableBodyClone.childElementCount === 0) {
    return undefined;
  }

  table.appendChild(tableBodyClone);

  // Copy the actual ancestor chain through the editor. It carries inherited
  // block colors/line height and selectors such as `.bn-editor
  // [data-content-type="table"]`, including app overrides and custom frames.
  // Only layout constraints are reset: this is a snapshot of a subset, not a
  // second editor viewport or table scroller.
  let content: HTMLElement = table;
  const view = editor.prosemirrorView;
  let ancestor = sourceTable.parentElement;
  while (ancestor && view.dom.contains(ancestor)) {
    const clone = ancestor.cloneNode(false) as HTMLElement;
    clone.classList.remove("ProseMirror-selectednode");
    clone.removeAttribute("id");
    clone.removeAttribute("contenteditable");
    clone.removeAttribute("tabindex");
    Object.assign(clone.style, {
      width: "max-content",
      minWidth: "0",
      maxWidth: "none",
      height: "auto",
      minHeight: "0",
      maxHeight: "none",
      margin: "0",
      padding: "0",
      overflow: "visible",
    });
    clone.appendChild(content);
    content = clone;
    if (ancestor === view.dom) {
      break;
    }
    ancestor = ancestor.parentElement;
  }

  // Same themed outer wrapper and off-screen capture strategy as SideMenu's
  // whole-block preview (#3235). Do not hide with opacity: Firefox/Safari also
  // apply it to the native drag bitmap.
  const container = view.dom.parentElement?.closest(".bn-root");
  const wrapper =
    (container?.cloneNode(false) as HTMLElement | undefined) ??
    document.createElement("div");
  wrapper.removeAttribute("id");
  wrapper.classList.add("bn-drag-preview", "bn-table-drag-preview");
  wrapper.setAttribute("aria-hidden", "true");
  Object.assign(wrapper.style, {
    background: "transparent",
    position: "absolute",
    top: "-10000px",
    left: "0",
    width: "max-content",
    maxWidth: "none",
    margin: "0",
    padding: "10px",
    height: "auto",
    minHeight: "0",
    maxHeight: "75vh",
    overflow: "hidden",
    pointerEvents: "none",
  });
  wrapper.appendChild(content);

  // dataTransfer.setDragImage(element) only works if element is attached to the
  // DOM.
  // Keep the off-screen image attached until drag end: Firefox/Safari may
  // capture after dragstart. Attach beside the editor to inherit its theme.
  attachDragPreview(view, wrapper);

  return wrapper;
}
