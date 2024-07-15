import { Plugin, PluginKey, PluginView } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { nodeToBlock } from "../../api/nodeConversions/nodeConversions";
import { checkBlockIsDefaultType } from "../../blocks/defaultBlockTypeGuards";
import { Block, DefaultBlockSchema } from "../../blocks/defaultBlocks";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockFromConfigNoChildren,
  BlockSchemaWithBlock,
  InlineContentSchema,
  StyleSchema,
} from "../../schema";
import { EventEmitter } from "../../util/EventEmitter";
import { getDraggableBlockFromElement } from "../SideMenu/SideMenuPlugin";

let dragImageElement: HTMLElement | undefined;

export type TableHandlesState<
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  show: boolean;
  referencePosCell: DOMRect;
  referencePosTable: DOMRect;

  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], I, S>;
  colIndex: number;
  rowIndex: number;

  draggingState:
    | {
        draggedCellOrientation: "row" | "col";
        originalIndex: number;
        mousePos: number;
      }
    | undefined;
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
function domCellAround(target: Element | null): Element | null {
  while (target && target.nodeName !== "TD" && target.nodeName !== "TH") {
    target =
      target.classList && target.classList.contains("ProseMirror")
        ? null
        : (target.parentNode as Element);
  }
  return target;
}

// Hides elements in the DOMwith the provided class names.
function hideElementsWithClassNames(
  classNames: string[],
  rootEl: Document | ShadowRoot
) {
  classNames.forEach((className) => {
    const elementsToHide = rootEl.querySelectorAll(className);

    for (let i = 0; i < elementsToHide.length; i++) {
      (elementsToHide[i] as HTMLElement).style.visibility = "hidden";
    }
  });
}

export class TableHandlesView<
  I extends InlineContentSchema,
  S extends StyleSchema
> implements PluginView
{
  public state?: TableHandlesState<I, S>;
  public emitUpdate: () => void;

  public tableId: string | undefined;
  public tablePos: number | undefined;

  public menuFrozen = false;

  public prevWasEditable: boolean | null = null;

  constructor(
    private readonly editor: BlockNoteEditor<
      BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
      I,
      S
    >,
    private readonly pmView: EditorView,
    emitUpdate: (state: TableHandlesState<I, S>) => void
  ) {
    this.emitUpdate = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized image toolbar");
      }

      emitUpdate(this.state);
    };

    pmView.dom.addEventListener("mousemove", this.mouseMoveHandler);

    pmView.root.addEventListener(
      "dragover",
      this.dragOverHandler as EventListener
    );
    pmView.root.addEventListener("drop", this.dropHandler as EventListener);

    // Setting capture=true ensures that any parent container of the editor that
    // gets scrolled will trigger the scroll event. Scroll events do not bubble
    // and so won't propagate to the document by default.
    pmView.root.addEventListener("scroll", this.scrollHandler, true);
  }

  mouseMoveHandler = (event: MouseEvent) => {
    if (this.menuFrozen) {
      return;
    }

    const target = domCellAround(event.target as HTMLElement);

    if (!target || !this.editor.isEditable) {
      if (this.state?.show) {
        this.state.show = false;
        this.emitUpdate();
      }
      return;
    }

    const colIndex = getChildIndex(target);
    const rowIndex = getChildIndex(target.parentElement!);
    const cellRect = target.getBoundingClientRect();
    const tableRect =
      target.parentElement!.parentElement!.getBoundingClientRect();

    const blockEl = getDraggableBlockFromElement(target, this.pmView);
    if (!blockEl) {
      return;
    }

    let tableBlock: Block<any, any, any> | undefined = undefined;

    // Copied from `getBlock`. We don't use `getBlock` since we also need the PM
    // node for the table, so we would effectively be doing the same work twice.
    this.editor._tiptapEditor.state.doc.descendants((node, pos) => {
      if (typeof tableBlock !== "undefined") {
        return false;
      }

      if (node.type.name !== "blockContainer" || node.attrs.id !== blockEl.id) {
        return true;
      }

      const block = nodeToBlock(
        node,
        this.editor.schema.blockSchema,
        this.editor.schema.inlineContentSchema,
        this.editor.schema.styleSchema,
        this.editor.blockCache
      );

      if (checkBlockIsDefaultType("table", block, this.editor)) {
        this.tablePos = pos + 1;
        tableBlock = block;
      }

      return false;
    });

    if (!tableBlock) {
      return;
    }

    this.tableId = blockEl.id;

    if (
      this.state !== undefined &&
      this.state.show &&
      this.tableId === blockEl.id &&
      this.state.rowIndex === rowIndex &&
      this.state.colIndex === colIndex
    ) {
      return;
    }

    this.state = {
      show: true,
      referencePosCell: cellRect,
      referencePosTable: tableRect,

      block: tableBlock,
      colIndex: colIndex,
      rowIndex: rowIndex,

      draggingState: undefined,
    };
    this.emitUpdate();

    return false;
  };

  dragOverHandler = (event: DragEvent) => {
    if (this.state?.draggingState === undefined) {
      return;
    }

    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";

    hideElementsWithClassNames(
      [
        "column-resize-handle",
        "prosemirror-dropcursor-block",
        "prosemirror-dropcursor-inline",
      ],
      this.pmView.root
    );

    // The mouse cursor coordinates, bounded to the table's bounding box. The
    // bounding box is shrunk by 1px on each side to ensure that the bounded
    // coordinates are always inside a table cell.
    const boundedMouseCoords = {
      left: Math.min(
        Math.max(event.clientX, this.state.referencePosTable.left + 1),
        this.state.referencePosTable.right - 1
      ),
      top: Math.min(
        Math.max(event.clientY, this.state.referencePosTable.top + 1),
        this.state.referencePosTable.bottom - 1
      ),
    };

    // Gets the table cell element that the bounded mouse cursor coordinates lie
    // in.
    const tableCellElements = this.pmView.root
      .elementsFromPoint(boundedMouseCoords.left, boundedMouseCoords.top)
      .filter(
        (element) => element.tagName === "TD" || element.tagName === "TH"
      );
    if (tableCellElements.length === 0) {
      throw new Error(
        "Could not find table cell element that the mouse cursor is hovering over."
      );
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
      this.editor.dispatch(
        this.pmView.state.tr.setMeta(tableHandlesPluginKey, true)
      );
    }
  };

  dropHandler = (event: DragEvent) => {
    if (this.state === undefined || this.state.draggingState === undefined) {
      return;
    }

    event.preventDefault();

    const rows = this.state.block.content.rows;

    if (this.state.draggingState.draggedCellOrientation === "row") {
      const rowToMove = rows[this.state.draggingState.originalIndex];
      rows.splice(this.state.draggingState.originalIndex, 1);
      rows.splice(this.state.rowIndex, 0, rowToMove);
    } else {
      const cellsToMove = rows.map(
        (row) => row.cells[this.state!.draggingState!.originalIndex]
      );
      rows.forEach((row, rowIndex) => {
        row.cells.splice(this.state!.draggingState!.originalIndex, 1);
        row.cells.splice(this.state!.colIndex, 0, cellsToMove[rowIndex]);
      });
    }

    this.editor.updateBlock(this.state.block, {
      type: "table",
      content: {
        type: "tableContent",
        rows: rows,
      },
    });
  };

  scrollHandler = () => {
    if (this.state?.show) {
      const tableElement = this.pmView.root.querySelector(
        `[data-node-type="blockContainer"][data-id="${this.tableId}"] table`
      )!;
      const cellElement = tableElement.querySelector(
        `tr:nth-child(${this.state.rowIndex + 1}) > td:nth-child(${
          this.state.colIndex + 1
        })`
      )!;

      this.state.referencePosTable = tableElement.getBoundingClientRect();
      this.state.referencePosCell = cellElement.getBoundingClientRect();
      this.emitUpdate();
    }
  };

  destroy() {
    this.pmView.dom.removeEventListener("mousemove", this.mouseMoveHandler);
    this.pmView.root.removeEventListener(
      "dragover",
      this.dragOverHandler as EventListener
    );
    this.pmView.root.removeEventListener(
      "drop",
      this.dropHandler as EventListener
    );
    this.pmView.root.removeEventListener("scroll", this.scrollHandler, true);
  }
}

export const tableHandlesPluginKey = new PluginKey("TableHandlesPlugin");

export class TableHandlesProsemirrorPlugin<
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  private view: TableHandlesView<I, S> | undefined;
  public readonly plugin: Plugin;

  constructor(
    private readonly editor: BlockNoteEditor<
      BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
      I,
      S
    >
  ) {
    super();
    this.plugin = new Plugin({
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

          const decorations: Decoration[] = [];

          if (newIndex === this.view.state.draggingState.originalIndex) {
            return DecorationSet.create(state.doc, decorations);
          }

          // Gets the table to show the drop cursor in.
          const tableResolvedPos = state.doc.resolve(this.view.tablePos + 1);
          const tableNode = tableResolvedPos.node();

          if (this.view.state.draggingState.draggedCellOrientation === "row") {
            // Gets the row at the new index.
            const rowResolvedPos = state.doc.resolve(
              tableResolvedPos.posAtIndex(newIndex) + 1
            );
            const rowNode = rowResolvedPos.node();

            // Iterates over all cells in the row.
            for (let i = 0; i < rowNode.childCount; i++) {
              // Gets each cell in the row.
              const cellResolvedPos = state.doc.resolve(
                rowResolvedPos.posAtIndex(i) + 1
              );
              const cellNode = cellResolvedPos.node();

              // Creates a decoration at the start or end of each cell,
              // depending on whether the new index is before or after the
              // original index.
              const decorationPos =
                cellResolvedPos.pos +
                (newIndex > this.view.state.draggingState.originalIndex
                  ? cellNode.nodeSize - 2
                  : 0);
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
                  if (
                    newIndex > this.view!.state!.draggingState!.originalIndex
                  ) {
                    widget.style.bottom = "-2px";
                  } else {
                    widget.style.top = "-3px";
                  }
                  widget.style.height = "4px";

                  return widget;
                })
              );
            }
          } else {
            // Iterates over all rows in the table.
            for (let i = 0; i < tableNode.childCount; i++) {
              // Gets each row in the table.
              const rowResolvedPos = state.doc.resolve(
                tableResolvedPos.posAtIndex(i) + 1
              );

              // Gets the cell at the new index in the row.
              const cellResolvedPos = state.doc.resolve(
                rowResolvedPos.posAtIndex(newIndex) + 1
              );
              const cellNode = cellResolvedPos.node();

              // Creates a decoration at the start or end of each cell,
              // depending on whether the new index is before or after the
              // original index.
              const decorationPos =
                cellResolvedPos.pos +
                (newIndex > this.view.state.draggingState.originalIndex
                  ? cellNode.nodeSize - 2
                  : 0);
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
                  if (
                    newIndex > this.view!.state!.draggingState!.originalIndex
                  ) {
                    widget.style.right = "-2px";
                  } else {
                    widget.style.left = "-3px";
                  }
                  widget.style.width = "4px";

                  return widget;
                })
              );
            }
          }

          return DecorationSet.create(state.doc, decorations);
        },
      },
    });
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
    if (this.view!.state === undefined) {
      throw new Error(
        "Attempted to drag table column, but no table block was hovered prior."
      );
    }

    this.view!.state.draggingState = {
      draggedCellOrientation: "col",
      originalIndex: this.view!.state.colIndex,
      mousePos: event.clientX,
    };
    this.view!.emitUpdate();

    this.editor.dispatch(
      this.editor._tiptapEditor.state.tr.setMeta(tableHandlesPluginKey, {
        draggedCellOrientation:
          this.view!.state.draggingState.draggedCellOrientation,
        originalIndex: this.view!.state.colIndex,
        newIndex: this.view!.state.colIndex,
        tablePos: this.view!.tablePos,
      })
    );

    setHiddenDragImage(this.editor._tiptapEditor.view.root);
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
    if (this.view!.state === undefined) {
      throw new Error(
        "Attempted to drag table row, but no table block was hovered prior."
      );
    }

    this.view!.state.draggingState = {
      draggedCellOrientation: "row",
      originalIndex: this.view!.state.rowIndex,
      mousePos: event.clientY,
    };
    this.view!.emitUpdate();

    this.editor.dispatch(
      this.editor._tiptapEditor.state.tr.setMeta(tableHandlesPluginKey, {
        draggedCellOrientation:
          this.view!.state.draggingState.draggedCellOrientation,
        originalIndex: this.view!.state.rowIndex,
        newIndex: this.view!.state.rowIndex,
        tablePos: this.view!.tablePos,
      })
    );

    setHiddenDragImage(this.editor._tiptapEditor.view.root);
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
        "Attempted to drag table row, but no table block was hovered prior."
      );
    }

    this.view!.state.draggingState = undefined;
    this.view!.emitUpdate();

    this.editor.dispatch(
      this.editor._tiptapEditor.state.tr.setMeta(tableHandlesPluginKey, null)
    );

    unsetHiddenDragImage(this.editor._tiptapEditor.view.root);
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
}
