import { EditorState, Plugin, PluginKey, PluginView } from "prosemirror-state";
import {
  CellSelection,
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  mergeCells,
  splitCell,
} from "prosemirror-tables";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import {
  RelativeCellIndices,
  addRowsOrColumns,
  areInSameColumn,
  canColumnBeDraggedInto,
  canRowBeDraggedInto,
  cropEmptyRowsOrColumns,
  getCellsAtColumnHandle,
  getCellsAtRowHandle,
  getDimensionsOfTable,
  moveColumn,
  moveRow,
} from "../../api/blockManipulation/tables/tables.js";
import { nodeToBlock } from "../../api/nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../api/nodeUtil.js";
import {
  editorHasBlockWithType,
  isTableCellSelection,
} from "../../blocks/defaultBlockTypeGuards.js";
import { DefaultBlockSchema } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import {
  BlockFromConfigNoChildren,
  BlockSchemaWithBlock,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { getDraggableBlockFromElement } from "../getDraggableBlockFromElement.js";

let dragImageElement: HTMLElement | undefined;

// TODO consider switching this to jotai, it is a bit messy and noisy
export type TableHandlesState<
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  show: boolean;
  showAddOrRemoveRowsButton: boolean;
  showAddOrRemoveColumnsButton: boolean;
  referencePosCell: DOMRect | undefined;
  referencePosTable: DOMRect;

  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], I, S>;
  colIndex: number | undefined;
  rowIndex: number | undefined;

  draggingState:
    | {
        draggedCellOrientation: "row" | "col";
        originalIndex: number;
        mousePos: number;
      }
    | undefined;

  widgetContainer: HTMLElement | undefined;
};

function setHiddenDragImage(rootEl: Document | ShadowRoot) {
  if (dragImageElement) {
    return;
  }

  dragImageElement = document.createElement("div");
  dragImageElement.innerHTML = "_";
  dragImageElement.style.opacity = "0";
  dragImageElement.style.height = "1px";
  dragImageElement.style.width = "1px";
  if (rootEl instanceof Document) {
    rootEl.body.appendChild(dragImageElement);
  } else {
    rootEl.appendChild(dragImageElement);
  }
}

function unsetHiddenDragImage(rootEl: Document | ShadowRoot) {
  if (dragImageElement) {
    if (rootEl instanceof Document) {
      rootEl.body.removeChild(dragImageElement);
    } else {
      rootEl.removeChild(dragImageElement);
    }
    dragImageElement = undefined;
  }
}

function getChildIndex(node: Element) {
  return Array.prototype.indexOf.call(node.parentElement!.childNodes, node);
}

// Finds the DOM element corresponding to the table cell that the target element
// is currently in. If the target element is not in a table cell, returns null.
function domCellAround(target: Element) {
  let currentTarget: Element | undefined = target;
  while (
    currentTarget &&
    currentTarget.nodeName !== "TD" &&
    currentTarget.nodeName !== "TH" &&
    !currentTarget.classList.contains("tableWrapper")
  ) {
    if (currentTarget.classList.contains("ProseMirror")) {
      return undefined;
    }
    const parent: ParentNode | null = currentTarget.parentNode;

    if (!parent || !(parent instanceof Element)) {
      return undefined;
    }
    currentTarget = parent;
  }

  return currentTarget.nodeName === "TD" || currentTarget.nodeName === "TH"
    ? {
        type: "cell",
        domNode: currentTarget,
        tbodyNode: currentTarget.closest("tbody"),
      }
    : {
        type: "wrapper",
        domNode: currentTarget,
        tbodyNode: currentTarget.querySelector("tbody"),
      };
}

// Hides elements in the DOMwith the provided class names.
function hideElements(selector: string, rootEl: Document | ShadowRoot) {
  const elementsToHide = rootEl.querySelectorAll(selector);

  for (let i = 0; i < elementsToHide.length; i++) {
    (elementsToHide[i] as HTMLElement).style.visibility = "hidden";
  }
}

export class TableHandlesView<
  I extends InlineContentSchema,
  S extends StyleSchema,
> implements PluginView
{
  public state?: TableHandlesState<I, S>;
  public emitUpdate: () => void;

  public tableId: string | undefined;
  public tablePos: number | undefined;
  public tableElement: HTMLElement | undefined;

  public menuFrozen = false;

  public mouseState: "up" | "down" | "selecting" = "up";

  public prevWasEditable: boolean | null = null;

  constructor(
    private readonly editor: BlockNoteEditor<
      BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
      I,
      S
    >,
    private readonly pmView: EditorView,
    emitUpdate: (state: TableHandlesState<I, S>) => void,
  ) {
    this.emitUpdate = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized image toolbar");
      }

      emitUpdate(this.state);
    };

    pmView.dom.addEventListener("mousemove", this.mouseMoveHandler);
    pmView.dom.addEventListener("mousedown", this.viewMousedownHandler);
    window.addEventListener("mouseup", this.mouseUpHandler);

    pmView.root.addEventListener(
      "dragover",
      this.dragOverHandler as EventListener,
    );
    pmView.root.addEventListener(
      "drop",
      this.dropHandler as unknown as EventListener,
    );
  }

  viewMousedownHandler = () => {
    this.mouseState = "down";
  };

  mouseUpHandler = (event: MouseEvent) => {
    this.mouseState = "up";
    this.mouseMoveHandler(event);
  };

  mouseMoveHandler = (event: MouseEvent) => {
    if (this.menuFrozen) {
      return;
    }

    if (this.mouseState === "selecting") {
      return;
    }

    if (
      !(event.target instanceof Element) ||
      !this.pmView.dom.contains(event.target)
    ) {
      return;
    }

    const target = domCellAround(event.target);

    if (
      target?.type === "cell" &&
      this.mouseState === "down" &&
      !this.state?.draggingState
    ) {
      // hide draghandles when selecting text as they could be in the way of the user
      this.mouseState = "selecting";

      if (this.state?.show) {
        this.state.show = false;
        this.state.showAddOrRemoveRowsButton = false;
        this.state.showAddOrRemoveColumnsButton = false;
        this.emitUpdate();
      }
      return;
    }

    if (!target || !this.editor.isEditable) {
      if (this.state?.show) {
        this.state.show = false;
        this.state.showAddOrRemoveRowsButton = false;
        this.state.showAddOrRemoveColumnsButton = false;
        this.emitUpdate();
      }
      return;
    }

    if (!target.tbodyNode) {
      return;
    }

    const tableRect = target.tbodyNode.getBoundingClientRect();

    const blockEl = getDraggableBlockFromElement(target.domNode, this.pmView);
    if (!blockEl) {
      return;
    }
    this.tableElement = blockEl.node;

    let tableBlock:
      | BlockFromConfigNoChildren<DefaultBlockSchema["table"], I, S>
      | undefined;

    const pmNodeInfo = this.editor.transact((tr) =>
      getNodeById(blockEl.id, tr.doc),
    );
    if (!pmNodeInfo) {
      throw new Error(`Block with ID ${blockEl.id} not found`);
    }

    const block = nodeToBlock(
      pmNodeInfo.node,
      this.editor.pmSchema,
      this.editor.schema.blockSchema,
      this.editor.schema.inlineContentSchema,
      this.editor.schema.styleSchema,
    );

    if (editorHasBlockWithType(this.editor, "table")) {
      this.tablePos = pmNodeInfo.posBeforeNode + 1;
      tableBlock = block;
    }

    if (!tableBlock) {
      return;
    }

    this.tableId = blockEl.id;
    const widgetContainer = target.domNode
      .closest(".tableWrapper")
      ?.querySelector(".table-widgets-container") as HTMLElement;

    if (target?.type === "wrapper") {
      // if we're just to the right or below the table, show the extend buttons
      // (this is a bit hacky. It would probably be cleaner to render the extend buttons in the Table NodeView instead)
      const belowTable =
        event.clientY >= tableRect.bottom - 1 && // -1 to account for fractions of pixels in "bottom"
        event.clientY < tableRect.bottom + 20;
      const toRightOfTable =
        event.clientX >= tableRect.right - 1 &&
        event.clientX < tableRect.right + 20;

      // without this check, we'd also hide draghandles when hovering over them
      const hideHandles =
        event.clientX > tableRect.right || event.clientY > tableRect.bottom;

      this.state = {
        ...this.state!,
        show: true,
        showAddOrRemoveRowsButton: belowTable,
        showAddOrRemoveColumnsButton: toRightOfTable,
        referencePosTable: tableRect,
        block: tableBlock,
        widgetContainer,
        colIndex: hideHandles ? undefined : this.state?.colIndex,
        rowIndex: hideHandles ? undefined : this.state?.rowIndex,
        referencePosCell: hideHandles
          ? undefined
          : this.state?.referencePosCell,
      };
    } else {
      const colIndex = getChildIndex(target.domNode);
      const rowIndex = getChildIndex(target.domNode.parentElement!);
      const cellRect = target.domNode.getBoundingClientRect();

      if (
        this.state !== undefined &&
        this.state.show &&
        this.tableId === blockEl.id &&
        this.state.rowIndex === rowIndex &&
        this.state.colIndex === colIndex
      ) {
        // no update needed
        return;
      }

      this.state = {
        show: true,
        showAddOrRemoveColumnsButton:
          colIndex === tableBlock.content.rows[0].cells.length - 1,
        showAddOrRemoveRowsButton:
          rowIndex === tableBlock.content.rows.length - 1,
        referencePosTable: tableRect,

        block: tableBlock,
        draggingState: undefined,
        referencePosCell: cellRect,
        colIndex: colIndex,
        rowIndex: rowIndex,

        widgetContainer,
      };
    }
    this.emitUpdate();

    return false;
  };

  dragOverHandler = (event: DragEvent) => {
    if (this.state?.draggingState === undefined) {
      return;
    }

    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";

    hideElements(
      ".prosemirror-dropcursor-block, .prosemirror-dropcursor-inline",
      this.pmView.root,
    );

    // The mouse cursor coordinates, bounded to the table's bounding box. The
    // bounding box is shrunk by 1px on each side to ensure that the bounded
    // coordinates are always inside a table cell.
    const boundedMouseCoords = {
      left: Math.min(
        Math.max(event.clientX, this.state.referencePosTable.left + 1),
        this.state.referencePosTable.right - 1,
      ),
      top: Math.min(
        Math.max(event.clientY, this.state.referencePosTable.top + 1),
        this.state.referencePosTable.bottom - 1,
      ),
    };

    // Gets the table cell element that the bounded mouse cursor coordinates lie
    // in.
    const tableCellElements = this.pmView.root
      .elementsFromPoint(boundedMouseCoords.left, boundedMouseCoords.top)
      .filter(
        (element) => element.tagName === "TD" || element.tagName === "TH",
      );
    if (tableCellElements.length === 0) {
      return;
    }
    const tableCellElement = tableCellElements[0];

    let emitStateUpdate = false;

    // Gets current row and column index.
    const rowIndex = getChildIndex(tableCellElement.parentElement!);
    const colIndex = getChildIndex(tableCellElement);

    // Checks if the drop cursor needs to be updated. This affects decorations
    // only so it doesn't trigger a state update.
    const oldIndex =
      this.state.draggingState.draggedCellOrientation === "row"
        ? this.state.rowIndex
        : this.state.colIndex;
    const newIndex =
      this.state.draggingState.draggedCellOrientation === "row"
        ? rowIndex
        : colIndex;
    const dispatchDecorationsTransaction = newIndex !== oldIndex;

    // Checks if either the hovered cell has changed and updates the row and
    // column index. Also updates the reference DOMRect.
    if (this.state.rowIndex !== rowIndex || this.state.colIndex !== colIndex) {
      this.state.rowIndex = rowIndex;
      this.state.colIndex = colIndex;

      this.state.referencePosCell = tableCellElement.getBoundingClientRect();

      emitStateUpdate = true;
    }

    // Checks if the mouse cursor position along the axis that the user is
    // dragging on has changed and updates it.
    const mousePos =
      this.state.draggingState.draggedCellOrientation === "row"
        ? boundedMouseCoords.top
        : boundedMouseCoords.left;
    if (this.state.draggingState.mousePos !== mousePos) {
      this.state.draggingState.mousePos = mousePos;

      emitStateUpdate = true;
    }

    // Emits a state update if any of the fields have changed.
    if (emitStateUpdate) {
      this.emitUpdate();
    }

    // Dispatches a dummy transaction to force a decorations update if
    // necessary.
    if (dispatchDecorationsTransaction) {
      this.editor.transact((tr) => tr.setMeta(tableHandlesPluginKey, true));
    }
  };

  dropHandler = (event: DragEvent) => {
    this.mouseState = "up";
    if (this.state === undefined || this.state.draggingState === undefined) {
      return false;
    }

    if (
      this.state.rowIndex === undefined ||
      this.state.colIndex === undefined
    ) {
      throw new Error(
        "Attempted to drop table row or column, but no table block was hovered prior.",
      );
    }

    event.preventDefault();

    const { draggingState, colIndex, rowIndex } = this.state;

    const columnWidths = this.state.block.content.columnWidths;

    if (draggingState.draggedCellOrientation === "row") {
      if (
        !canRowBeDraggedInto(
          this.state.block,
          draggingState.originalIndex,
          rowIndex,
        )
      ) {
        // If the target row is invalid, don't move the row
        return false;
      }
      const newTable = moveRow(
        this.state.block,
        draggingState.originalIndex,
        rowIndex,
      );
      this.editor.updateBlock(this.state.block, {
        type: "table",
        content: {
          ...this.state.block.content,
          rows: newTable as any,
        },
      });
    } else {
      if (
        !canColumnBeDraggedInto(
          this.state.block,
          draggingState.originalIndex,
          colIndex,
        )
      ) {
        // If the target column is invalid, don't move the column
        return false;
      }
      const newTable = moveColumn(
        this.state.block,
        draggingState.originalIndex,
        colIndex,
      );
      const [columnWidth] = columnWidths.splice(draggingState.originalIndex, 1);
      columnWidths.splice(colIndex, 0, columnWidth);
      this.editor.updateBlock(this.state.block, {
        type: "table",
        content: {
          ...this.state.block.content,
          columnWidths,
          rows: newTable as any,
        },
      });
    }

    // Have to reset text cursor position to the block as `updateBlock` moves
    // the existing selection out of the block.
    this.editor.setTextCursorPosition(this.state.block.id);

    return true;
  };
  // Updates drag handles when the table is modified or removed.
  update() {
    if (!this.state || !this.state.show) {
      return;
    }

    // Hide handles if the table block has been removed.
    this.state.block = this.editor.getBlock(this.state.block.id)!;
    if (
      !this.state.block ||
      this.state.block.type !== "table" ||
      // when collaborating, the table element might be replaced and out of date
      // because yjs replaces the element when for example you change the color via the side menu
      !this.tableElement?.isConnected
    ) {
      this.state.show = false;
      this.state.showAddOrRemoveRowsButton = false;
      this.state.showAddOrRemoveColumnsButton = false;
      this.emitUpdate();

      return;
    }

    const { height: rowCount, width: colCount } = getDimensionsOfTable(
      this.state.block,
    );

    if (
      this.state.rowIndex !== undefined &&
      this.state.colIndex !== undefined
    ) {
      // If rows or columns are deleted in the update, the hovered indices for
      // those may now be out of bounds. If this is the case, they are moved to
      // the new last row or column.
      if (this.state.rowIndex >= rowCount) {
        this.state.rowIndex = rowCount - 1;
      }
      if (this.state.colIndex >= colCount) {
        this.state.colIndex = colCount - 1;
      }
    }

    // Update bounding boxes.
    const tableBody = this.tableElement!.querySelector("tbody");

    if (!tableBody) {
      throw new Error(
        "Table block does not contain a 'tbody' HTML element. This should never happen.",
      );
    }

    if (
      this.state.rowIndex !== undefined &&
      this.state.colIndex !== undefined
    ) {
      const row = tableBody.children[this.state.rowIndex];
      const cell = row.children[this.state.colIndex];
      if (cell) {
        this.state.referencePosCell = cell.getBoundingClientRect();
      } else {
        this.state.rowIndex = undefined;
        this.state.colIndex = undefined;
      }
    }
    this.state.referencePosTable = tableBody.getBoundingClientRect();

    this.emitUpdate();
  }

  destroy() {
    this.pmView.dom.removeEventListener("mousemove", this.mouseMoveHandler);
    window.removeEventListener("mouseup", this.mouseUpHandler);
    this.pmView.dom.removeEventListener("mousedown", this.viewMousedownHandler);
    this.pmView.root.removeEventListener(
      "dragover",
      this.dragOverHandler as EventListener,
    );
    this.pmView.root.removeEventListener(
      "drop",
      this.dropHandler as unknown as EventListener,
    );
  }
}

export const tableHandlesPluginKey = new PluginKey("TableHandlesPlugin");

export class TableHandlesProsemirrorPlugin<
  I extends InlineContentSchema,
  S extends StyleSchema,
> extends BlockNoteExtension {
  public static key() {
    return "tableHandles";
  }

  private view: TableHandlesView<I, S> | undefined;

  constructor(
    private readonly editor: BlockNoteEditor<
      BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
      I,
      S
    >,
  ) {
    super();
    this.addProsemirrorPlugin(
      new Plugin({
        key: tableHandlesPluginKey,
        view: (editorView) => {
          this.view = new TableHandlesView(editor, editorView, (state) => {
            this.emit("update", state);
          });
          return this.view;
        },
        // We use decorations to render the drop cursor when dragging a table row
        // or column. The decorations are updated in the `dragOverHandler` method.
        props: {
          decorations: (state) => {
            if (
              this.view === undefined ||
              this.view.state === undefined ||
              this.view.state.draggingState === undefined ||
              this.view.tablePos === undefined
            ) {
              return;
            }

            const newIndex =
              this.view.state.draggingState.draggedCellOrientation === "row"
                ? this.view.state.rowIndex
                : this.view.state.colIndex;

            if (newIndex === undefined) {
              return;
            }

            const decorations: Decoration[] = [];
            const { block, draggingState } = this.view.state;
            const { originalIndex, draggedCellOrientation } = draggingState;

            // Return empty decorations if:
            // - Dragging to same position
            // - No block exists
            // - Row drag not allowed
            // - Column drag not allowed
            if (
              newIndex === originalIndex ||
              !block ||
              (draggedCellOrientation === "row" &&
                !canRowBeDraggedInto(block, originalIndex, newIndex)) ||
              (draggedCellOrientation === "col" &&
                !canColumnBeDraggedInto(block, originalIndex, newIndex))
            ) {
              return DecorationSet.create(state.doc, decorations);
            }

            // Gets the table to show the drop cursor in.
            const tableResolvedPos = state.doc.resolve(this.view.tablePos + 1);

            if (
              this.view.state.draggingState.draggedCellOrientation === "row"
            ) {
              const cellsInRow = getCellsAtRowHandle(
                this.view.state.block,
                newIndex,
              );

              cellsInRow.forEach(({ row, col }) => {
                // Gets each row in the table.
                const rowResolvedPos = state.doc.resolve(
                  tableResolvedPos.posAtIndex(row) + 1,
                );

                // Gets the cell within the row.
                const cellResolvedPos = state.doc.resolve(
                  rowResolvedPos.posAtIndex(col) + 1,
                );
                const cellNode = cellResolvedPos.node();
                // Creates a decoration at the start or end of each cell,
                // depending on whether the new index is before or after the
                // original index.
                const decorationPos =
                  cellResolvedPos.pos +
                  (newIndex > originalIndex ? cellNode.nodeSize - 2 : 0);
                decorations.push(
                  // The widget is a small bar which spans the width of the cell.
                  Decoration.widget(decorationPos, () => {
                    const widget = document.createElement("div");
                    widget.className = "bn-table-drop-cursor";
                    widget.style.left = "0";
                    widget.style.right = "0";
                    // This is only necessary because the drop indicator's height
                    // is an even number of pixels, whereas the border between
                    // table cells is an odd number of pixels. So this makes the
                    // positioning slightly more consistent regardless of where
                    // the row is being dropped.
                    if (newIndex > originalIndex) {
                      widget.style.bottom = "-2px";
                    } else {
                      widget.style.top = "-3px";
                    }
                    widget.style.height = "4px";

                    return widget;
                  }),
                );
              });
            } else {
              const cellsInColumn = getCellsAtColumnHandle(
                this.view.state.block,
                newIndex,
              );

              cellsInColumn.forEach(({ row, col }) => {
                // Gets each row in the table.
                const rowResolvedPos = state.doc.resolve(
                  tableResolvedPos.posAtIndex(row) + 1,
                );

                // Gets the cell within the row.
                const cellResolvedPos = state.doc.resolve(
                  rowResolvedPos.posAtIndex(col) + 1,
                );
                const cellNode = cellResolvedPos.node();

                // Creates a decoration at the start or end of each cell,
                // depending on whether the new index is before or after the
                // original index.
                const decorationPos =
                  cellResolvedPos.pos +
                  (newIndex > originalIndex ? cellNode.nodeSize - 2 : 0);

                decorations.push(
                  // The widget is a small bar which spans the height of the cell.
                  Decoration.widget(decorationPos, () => {
                    const widget = document.createElement("div");
                    widget.className = "bn-table-drop-cursor";
                    widget.style.top = "0";
                    widget.style.bottom = "0";
                    // This is only necessary because the drop indicator's width
                    // is an even number of pixels, whereas the border between
                    // table cells is an odd number of pixels. So this makes the
                    // positioning slightly more consistent regardless of where
                    // the column is being dropped.
                    if (newIndex > originalIndex) {
                      widget.style.right = "-2px";
                    } else {
                      widget.style.left = "-3px";
                    }
                    widget.style.width = "4px";

                    return widget;
                  }),
                );
              });
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    );
  }

  public onUpdate(callback: (state: TableHandlesState<I, S>) => void) {
    return this.on("update", callback);
  }

  /**
   * Callback that should be set on the `dragStart` event for whichever element
   * is used as the column drag handle.
   */
  colDragStart = (event: {
    dataTransfer: DataTransfer | null;
    clientX: number;
  }) => {
    if (
      this.view!.state === undefined ||
      this.view!.state.colIndex === undefined
    ) {
      throw new Error(
        "Attempted to drag table column, but no table block was hovered prior.",
      );
    }

    this.view!.state.draggingState = {
      draggedCellOrientation: "col",
      originalIndex: this.view!.state.colIndex,
      mousePos: event.clientX,
    };
    this.view!.emitUpdate();

    this.editor.transact((tr) =>
      tr.setMeta(tableHandlesPluginKey, {
        draggedCellOrientation:
          this.view!.state!.draggingState!.draggedCellOrientation,
        originalIndex: this.view!.state!.colIndex,
        newIndex: this.view!.state!.colIndex,
        tablePos: this.view!.tablePos,
      }),
    );

    if (this.editor.headless) {
      return;
    }

    setHiddenDragImage(this.editor.prosemirrorView.root);
    event.dataTransfer!.setDragImage(dragImageElement!, 0, 0);
    event.dataTransfer!.effectAllowed = "move";
  };

  /**
   * Callback that should be set on the `dragStart` event for whichever element
   * is used as the row drag handle.
   */
  rowDragStart = (event: {
    dataTransfer: DataTransfer | null;
    clientY: number;
  }) => {
    if (
      this.view!.state === undefined ||
      this.view!.state.rowIndex === undefined
    ) {
      throw new Error(
        "Attempted to drag table row, but no table block was hovered prior.",
      );
    }

    this.view!.state.draggingState = {
      draggedCellOrientation: "row",
      originalIndex: this.view!.state.rowIndex,
      mousePos: event.clientY,
    };
    this.view!.emitUpdate();

    this.editor.transact((tr) =>
      tr.setMeta(tableHandlesPluginKey, {
        draggedCellOrientation:
          this.view!.state!.draggingState!.draggedCellOrientation,
        originalIndex: this.view!.state!.rowIndex,
        newIndex: this.view!.state!.rowIndex,
        tablePos: this.view!.tablePos,
      }),
    );

    if (this.editor.headless) {
      return;
    }

    setHiddenDragImage(this.editor.prosemirrorView.root);
    event.dataTransfer!.setDragImage(dragImageElement!, 0, 0);
    event.dataTransfer!.effectAllowed = "copyMove";
  };

  /**
   * Callback that should be set on the `dragEnd` event for both the element
   * used as the row drag handle, and the one used as the column drag handle.
   */
  dragEnd = () => {
    if (this.view!.state === undefined) {
      throw new Error(
        "Attempted to drag table row, but no table block was hovered prior.",
      );
    }

    this.view!.state.draggingState = undefined;
    this.view!.emitUpdate();

    this.editor.transact((tr) => tr.setMeta(tableHandlesPluginKey, null));

    if (this.editor.headless) {
      return;
    }

    unsetHiddenDragImage(this.editor.prosemirrorView.root);
  };

  /**
   * Freezes the drag handles. When frozen, they will stay attached to the same
   * cell regardless of which cell is hovered by the mouse cursor.
   */
  freezeHandles = () => {
    this.view!.menuFrozen = true;
  };

  /**
   * Unfreezes the drag handles. When frozen, they will stay attached to the
   * same cell regardless of which cell is hovered by the mouse cursor.
   */
  unfreezeHandles = () => {
    this.view!.menuFrozen = false;
  };

  getCellsAtRowHandle = (
    block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
    relativeRowIndex: RelativeCellIndices["row"],
  ) => {
    return getCellsAtRowHandle(block, relativeRowIndex);
  };

  /**
   * Get all the cells in a column of the table block.
   */
  getCellsAtColumnHandle = (
    block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
    relativeColumnIndex: RelativeCellIndices["col"],
  ) => {
    return getCellsAtColumnHandle(block, relativeColumnIndex);
  };

  /**
   * Sets the selection to the given cell or a range of cells.
   * @returns The new state after the selection has been set.
   */
  private setCellSelection = (
    state: EditorState,
    relativeStartCell: RelativeCellIndices,
    relativeEndCell: RelativeCellIndices = relativeStartCell,
  ) => {
    const view = this.view;

    if (!view) {
      throw new Error("Table handles view not initialized");
    }

    const tableResolvedPos = state.doc.resolve(view.tablePos! + 1);
    const startRowResolvedPos = state.doc.resolve(
      tableResolvedPos.posAtIndex(relativeStartCell.row) + 1,
    );
    const startCellResolvedPos = state.doc.resolve(
      // No need for +1, since CellSelection expects the position before the cell
      startRowResolvedPos.posAtIndex(relativeStartCell.col),
    );
    const endRowResolvedPos = state.doc.resolve(
      tableResolvedPos.posAtIndex(relativeEndCell.row) + 1,
    );
    const endCellResolvedPos = state.doc.resolve(
      // No need for +1, since CellSelection expects the position before the cell
      endRowResolvedPos.posAtIndex(relativeEndCell.col),
    );

    // Begin a new transaction to set the selection
    const tr = state.tr;

    // Set the selection to the given cell or a range of cells
    tr.setSelection(
      new CellSelection(startCellResolvedPos, endCellResolvedPos),
    );

    // Quickly apply the transaction to get the new state to update the selection before splitting the cell
    return state.apply(tr);
  };

  /**
   * Adds a row or column to the table using prosemirror-table commands
   */
  addRowOrColumn = (
    index: RelativeCellIndices["row"] | RelativeCellIndices["col"],
    direction:
      | { orientation: "row"; side: "above" | "below" }
      | { orientation: "column"; side: "left" | "right" },
  ) => {
    this.editor.exec((beforeState, dispatch) => {
      const state = this.setCellSelection(
        beforeState,
        direction.orientation === "row"
          ? { row: index, col: 0 }
          : { row: 0, col: index },
      );

      if (direction.orientation === "row") {
        if (direction.side === "above") {
          return addRowBefore(state, dispatch);
        } else {
          return addRowAfter(state, dispatch);
        }
      } else {
        if (direction.side === "left") {
          return addColumnBefore(state, dispatch);
        } else {
          return addColumnAfter(state, dispatch);
        }
      }
    });
  };

  /**
   * Removes a row or column from the table using prosemirror-table commands
   */
  removeRowOrColumn = (
    index: RelativeCellIndices["row"] | RelativeCellIndices["col"],
    direction: "row" | "column",
  ) => {
    if (direction === "row") {
      return this.editor.exec((beforeState, dispatch) => {
        const state = this.setCellSelection(beforeState, {
          row: index,
          col: 0,
        });
        return deleteRow(state, dispatch);
      });
    } else {
      return this.editor.exec((beforeState, dispatch) => {
        const state = this.setCellSelection(beforeState, {
          row: 0,
          col: index,
        });
        return deleteColumn(state, dispatch);
      });
    }
  };

  /**
   * Merges the cells in the table block.
   */
  mergeCells = (cellsToMerge?: {
    relativeStartCell: RelativeCellIndices;
    relativeEndCell: RelativeCellIndices;
  }) => {
    return this.editor.exec((beforeState, dispatch) => {
      const state = cellsToMerge
        ? this.setCellSelection(
            beforeState,
            cellsToMerge.relativeStartCell,
            cellsToMerge.relativeEndCell,
          )
        : beforeState;

      return mergeCells(state, dispatch);
    });
  };

  /**
   * Splits the cell in the table block.
   * If no cell is provided, the current cell selected will be split.
   */
  splitCell = (relativeCellToSplit?: RelativeCellIndices) => {
    return this.editor.exec((beforeState, dispatch) => {
      const state = relativeCellToSplit
        ? this.setCellSelection(beforeState, relativeCellToSplit)
        : beforeState;

      return splitCell(state, dispatch);
    });
  };

  /**
   * Gets the start and end cells of the current cell selection.
   * @returns The start and end cells of the current cell selection.
   */
  getCellSelection = ():
    | undefined
    | {
        from: RelativeCellIndices;
        to: RelativeCellIndices;
        /**
         * All of the cells that are within the selected range.
         */
        cells: RelativeCellIndices[];
      } => {
    // Based on the current selection, find the table cells that are within the selected range

    return this.editor.transact((tr) => {
      const selection = tr.selection;

      let $fromCell = selection.$from;
      let $toCell = selection.$to;
      if (isTableCellSelection(selection)) {
        // When the selection is a table cell selection, we can find the
        // from and to cells by iterating over the ranges in the selection
        const { ranges } = selection;
        ranges.forEach((range) => {
          $fromCell = range.$from.min($fromCell ?? range.$from);
          $toCell = range.$to.max($toCell ?? range.$to);
        });
      } else {
        // When the selection is a normal text selection
        // Assumes we are within a tableParagraph
        // And find the from and to cells by resolving the positions
        $fromCell = tr.doc.resolve(
          selection.$from.pos - selection.$from.parentOffset - 1,
        );
        $toCell = tr.doc.resolve(
          selection.$to.pos - selection.$to.parentOffset - 1,
        );

        // Opt-out when the selection is not pointing into cells
        if ($fromCell.pos === 0 || $toCell.pos === 0) {
          return undefined;
        }
      }

      // Find the row and table that the from and to cells are in
      const $fromRow = tr.doc.resolve(
        $fromCell.pos - $fromCell.parentOffset - 1,
      );
      const $toRow = tr.doc.resolve($toCell.pos - $toCell.parentOffset - 1);

      // Find the table
      const $table = tr.doc.resolve($fromRow.pos - $fromRow.parentOffset - 1);

      // Find the column and row indices of the from and to cells
      const fromColIndex = $fromCell.index($fromRow.depth);
      const fromRowIndex = $fromRow.index($table.depth);
      const toColIndex = $toCell.index($toRow.depth);
      const toRowIndex = $toRow.index($table.depth);

      const cells: RelativeCellIndices[] = [];
      for (let row = fromRowIndex; row <= toRowIndex; row++) {
        for (let col = fromColIndex; col <= toColIndex; col++) {
          cells.push({ row, col });
        }
      }

      return {
        from: {
          row: fromRowIndex,
          col: fromColIndex,
        },
        to: {
          row: toRowIndex,
          col: toColIndex,
        },
        cells,
      };
    });
  };

  /**
   * Gets the direction of the merge based on the current cell selection.
   *
   * Returns undefined when there is no cell selection, or the selection is not within a table.
   */
  getMergeDirection = (
    block:
      | BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>
      | undefined,
  ) => {
    return this.editor.transact((tr) => {
      const isSelectingTableCells = isTableCellSelection(tr.selection)
        ? tr.selection
        : undefined;

      if (
        !isSelectingTableCells ||
        !block ||
        // Only offer the merge button if there is more than one cell selected.
        isSelectingTableCells.ranges.length <= 1
      ) {
        return undefined;
      }

      const cellSelection = this.getCellSelection();

      if (!cellSelection) {
        return undefined;
      }

      if (areInSameColumn(cellSelection.from, cellSelection.to, block)) {
        return "vertical";
      }

      return "horizontal";
    });
  };

  cropEmptyRowsOrColumns = (
    block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
    removeEmpty: "columns" | "rows",
  ) => {
    return cropEmptyRowsOrColumns(block, removeEmpty);
  };

  addRowsOrColumns = (
    block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
    addType: "columns" | "rows",
    numToAdd: number,
  ) => {
    return addRowsOrColumns(block, addType, numToAdd);
  };
}
