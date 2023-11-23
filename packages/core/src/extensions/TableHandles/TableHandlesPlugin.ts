import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import {
  BlockNoteEditor,
  BlockSchema,
  getDraggableBlockFromCoords,
} from "../..";
import { EventEmitter } from "../../shared/EventEmitter";
import { Block } from "../Blocks/api/blockTypes";
import { Table } from "../Blocks/nodes/BlockContent/TableBlockContent/TableBlockContent";
import { nodeToBlock } from "../../api/nodeConversions/nodeConversions";

let dragImageElement: HTMLElement | undefined;

function setHiddenDragImage() {
  if (dragImageElement) {
    return;
  }

  dragImageElement = document.createElement("div");
  dragImageElement.innerHTML = "_";
  dragImageElement.style.visibility = "hidden";
  document.body.appendChild(dragImageElement);
}

function unsetHiddenDragImage() {
  if (dragImageElement) {
    document.body.removeChild(dragImageElement);
    dragImageElement = undefined;
  }
}

export type TableHandlesState = {
  show: boolean;
  referencePosCell: DOMRect;
  referencePosTable: DOMRect;

  block: Block<(typeof Table)["config"]>;
  colIndex: number;
  rowIndex: number;

  isDragging:
    | {
        draggedCellOrientation: "row" | "col";
        mousePos: number;
      }
    | undefined;
};

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
function hideElementsWithClassNames(classNames: string[]) {
  classNames.forEach((className) => {
    const elementsToHide = document.getElementsByClassName(className);
    for (let i = 0; i < elementsToHide.length; i++) {
      (elementsToHide[i] as HTMLElement).style.visibility = "hidden";
    }
  });
}

export class TableHandlesView {
  public state?: TableHandlesState;
  public updateState: () => void;

  public tableId: string | undefined;
  public tablePos: number | undefined;

  public menuFrozen = false;

  public prevWasEditable: boolean | null = null;

  constructor(
    private readonly editor: BlockNoteEditor<any>,
    // @ts-ignore
    private readonly pluginKey: PluginKey,
    private readonly pmView: EditorView,
    updateState: (state: TableHandlesState) => void
  ) {
    this.updateState = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized image toolbar");
      }

      updateState(this.state);
    };

    pmView.dom.addEventListener("mousemove", this.mouseMoveHandler);
    document.addEventListener("dragover", this.dragOverHandler);

    // document.addEventListener("scroll", this.scrollHandler);
  }

  mouseMoveHandler = (event: MouseEvent) => {
    if (this.menuFrozen) {
      return;
    }

    const target = domCellAround(event.target as HTMLElement);

    if (!target) {
      if (this.state?.show) {
        this.state.show = false;
        this.updateState();
      }
      return;
    }

    const colIndex = getChildIndex(target);
    const rowIndex = getChildIndex(target.parentElement!);
    const cellRect = target.getBoundingClientRect();
    const tableRect =
      target.parentElement!.parentElement!.getBoundingClientRect();

    const blockEl = getDraggableBlockFromCoords(cellRect, this.pmView);
    if (!blockEl) {
      throw new Error(
        "Found table cell element, but could not find surrounding blockContent element."
      );
    }
    this.tableId = blockEl.id;

    if (
      this.state !== undefined &&
      this.tableId === blockEl.id &&
      this.state.rowIndex === rowIndex &&
      this.state.colIndex === colIndex
    ) {
      return;
    }

    let block: Block<any> | undefined = undefined;

    // Copied from `getBlock`. We don't use `getBlock` since we also need the PM
    // node for the table, so we would effectively be doing the same work twice.
    this.editor._tiptapEditor.state.doc.descendants((node, pos) => {
      if (typeof block !== "undefined") {
        return false;
      }

      if (node.type.name !== "blockContainer" || node.attrs.id !== blockEl.id) {
        return true;
      }

      block = nodeToBlock(node, this.editor.schema, this.editor.blockCache);
      this.tablePos = pos + 1;

      return false;
    });

    this.state = {
      show: true,
      referencePosCell: cellRect,
      referencePosTable: tableRect,

      block: block! as Block<(typeof Table)["config"]>,
      colIndex: colIndex,
      rowIndex: rowIndex,

      isDragging: undefined,
    };
    this.updateState();

    return false;
  };

  dragOverHandler = (event: DragEvent) => {
    if (this.state?.isDragging === undefined) {
      return;
    }

    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";

    hideElementsWithClassNames([
      "column-resize-handle",
      "prosemirror-dropcursor-block",
      "prosemirror-dropcursor-inline",
    ]);

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
    const tableCellElements = document
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

    // Checks if the drop cursor needs to be updated and updates it. This
    // affects decorations only so it doesn't trigger a state update.
    const oldIndex =
      this.state.isDragging.draggedCellOrientation === "row"
        ? this.state.rowIndex
        : this.state.colIndex;
    const newIndex =
      this.state.isDragging.draggedCellOrientation === "row"
        ? rowIndex
        : colIndex;
    if (oldIndex !== newIndex) {
      this.pmView.dispatch(
        this.pmView.state.tr.setMeta(tableHandlesPluginKey, {
          newIndex: newIndex,
        })
      );
    }

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
      this.state.isDragging.draggedCellOrientation === "row"
        ? boundedMouseCoords.top
        : boundedMouseCoords.left;
    if (this.state.isDragging.mousePos !== mousePos) {
      this.state.isDragging.mousePos = mousePos;

      emitStateUpdate = true;
    }

    // Emits a state update if any of the fields have changed.
    if (emitStateUpdate) {
      this.updateState();
    }
  };

  // scrollHandler = () => {
  //   if (this.imageToolbarState?.show) {
  //     const blockElement = document.querySelector(
  //       `[data-node-type="blockContainer"][data-id="${this.imageToolbarState.block.id}"]`
  //     )!;

  //     this.imageToolbarState.referencePos =
  //       blockElement.getBoundingClientRect();
  //     this.updateImageToolbar();
  //   }
  // };

  // update(view: EditorView, prevState: EditorState) {
  //   const pluginState: {
  //     block: Block<(typeof Image)["config"]>;
  //   } = this.pluginKey.getState(view.state);
  //
  // if (!this.imageToolbarState?.show && pluginState.block) {
  //   const blockElement = document.querySelector(
  //     `[data-node-type="blockContainer"][data-id="${pluginState.block.id}"]`
  //   )!;
  //
  //   this.imageToolbarState = {
  //     show: true,
  //     referencePos: blockElement.getBoundingClientRect(),
  //     block: pluginState.block,
  //   };
  //
  //   this.updateImageToolbar();
  //
  //   return;
  // }

  // if (
  //   !view.state.selection.eq(prevState.selection) ||
  //   !view.state.doc.eq(prevState.doc)
  // ) {
  //   if (this.imageToolbarState?.show) {
  //     this.imageToolbarState.show = false;

  //     this.updateImageToolbar();
  //   }
  // }
  // }

  destroy() {
    this.pmView.dom.removeEventListener("mousedown", this.mouseMoveHandler);
    document.removeEventListener("dragover", this.dragOverHandler);

    // document.removeEventListener("scroll", this.scrollHandler);
  }
}

export const tableHandlesPluginKey = new PluginKey("TableHandlesPlugin");

export class TableHandlesProsemirrorPlugin<
  BSchema extends BlockSchema
> extends EventEmitter<any> {
  private view: TableHandlesView | undefined;
  public readonly plugin: Plugin;

  constructor(private readonly editor: BlockNoteEditor<BSchema>) {
    super();
    this.plugin = new Plugin({
      key: tableHandlesPluginKey,
      view: (editorView) => {
        this.view = new TableHandlesView(
          editor,
          tableHandlesPluginKey,
          editorView,
          (state) => {
            this.emit("update", state);
          }
        );
        return this.view;
      },
      // We use decorations to render the drop cursor when dragging a table row
      // or column. The decorations are updated in the `dragOverHandler` method.
      props: {
        decorations: (state) => {
          const pluginState = tableHandlesPluginKey.getState(state);

          if (pluginState === undefined) {
            return;
          }

          const decorations: Decoration[] = [];

          if (pluginState.newIndex === pluginState.originalIndex) {
            return DecorationSet.create(state.doc, decorations);
          }

          // Gets the table to show the drop cursor in.
          const tableResolvedPos = state.doc.resolve(pluginState.tablePos + 1);
          const tableNode = tableResolvedPos.node();

          if (pluginState.draggedCellOrientation === "row") {
            // Gets the row at the new index.
            const rowResolvedPos = state.doc.resolve(
              tableResolvedPos.posAtIndex(pluginState.newIndex) + 1
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
                (pluginState.newIndex > pluginState.originalIndex
                  ? cellNode.nodeSize - 2
                  : 0);
              decorations.push(
                // The widget is a small bar which spans the width of the cell.
                Decoration.widget(decorationPos, () => {
                  const widget = document.createElement("div");
                  widget.className = "bn-table-drop-cursor";
                  widget.style.left = "0";
                  widget.style.right = "0";
                  if (pluginState.newIndex > pluginState.originalIndex) {
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
                rowResolvedPos.posAtIndex(pluginState.newIndex) + 1
              );
              const cellNode = cellResolvedPos.node();

              // Creates a decoration at the start or end of each cell,
              // depending on whether the new index is before or after the
              // original index.
              const decorationPos =
                cellResolvedPos.pos +
                (pluginState.newIndex > pluginState.originalIndex
                  ? cellNode.nodeSize - 2
                  : 0);
              decorations.push(
                // The widget is a small bar which spans the height of the cell.
                Decoration.widget(decorationPos, () => {
                  const widget = document.createElement("div");
                  widget.className = "bn-table-drop-cursor";
                  widget.style.top = "0";
                  widget.style.bottom = "0";
                  if (pluginState.newIndex > pluginState.originalIndex) {
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
      // For the view to be able to pass data to update the decorations, we need
      // to use a state field, where we store drag & drop information.
      state: {
        init() {
          return undefined;
        },
        apply(transaction, prev) {
          const isDragging = transaction.getMeta(tableHandlesPluginKey);

          // If the transaction contains new table drag & drop information, we
          // update the existing state with the new information.
          if (isDragging) {
            return {
              // The state may be undefined
              ...(prev || {}),
              ...isDragging,
            };
          }

          // If the transaction contains null table drag & drop information, we
          // clear the state.
          if (isDragging === null) {
            return undefined;
          }

          return prev;
        },
      },
    });
  }

  public onUpdate(callback: (state: TableHandlesState) => void) {
    return this.on("update", callback);
  }

  colDragStart = (event: {
    dataTransfer: DataTransfer | null;
    clientX: number;
  }) => {
    if (this.view!.state === undefined) {
      throw new Error(
        "Attempted to drag table column, but no table block was hovered prior."
      );
    }

    this.view!.state.isDragging = {
      draggedCellOrientation: "col",
      mousePos: event.clientX,
    };
    this.view!.updateState();

    this.editor._tiptapEditor.view.dispatch(
      this.editor._tiptapEditor.state.tr.setMeta(tableHandlesPluginKey, {
        draggedCellOrientation:
          this.view!.state.isDragging.draggedCellOrientation,
        originalIndex: this.view!.state.colIndex,
        newIndex: this.view!.state.colIndex,
        tablePos: this.view!.tablePos,
      })
    );

    setHiddenDragImage();
    event.dataTransfer!.setDragImage(dragImageElement!, 0, 0);
    event.dataTransfer!.effectAllowed = "move";
  };

  rowDragStart = (event: {
    dataTransfer: DataTransfer | null;
    clientY: number;
  }) => {
    if (this.view!.state === undefined) {
      throw new Error(
        "Attempted to drag table row, but no table block was hovered prior."
      );
    }

    this.view!.state.isDragging = {
      draggedCellOrientation: "row",
      mousePos: event.clientY,
    };
    this.view!.updateState();

    this.editor._tiptapEditor.view.dispatch(
      this.editor._tiptapEditor.state.tr.setMeta(tableHandlesPluginKey, {
        draggedCellOrientation:
          this.view!.state.isDragging.draggedCellOrientation,
        originalIndex: this.view!.state.rowIndex,
        newIndex: this.view!.state.rowIndex,
        tablePos: this.view!.tablePos,
      })
    );

    setHiddenDragImage();
    event.dataTransfer!.setDragImage(dragImageElement!, 0, 0);
    event.dataTransfer!.effectAllowed = "copyMove";
  };

  dragEnd = () => {
    if (this.view!.state === undefined) {
      throw new Error(
        "Attempted to drag table row, but no table block was hovered prior."
      );
    }

    this.view!.state.isDragging = undefined;
    this.view!.updateState();

    this.editor._tiptapEditor.view.dispatch(
      this.editor._tiptapEditor.state.tr.setMeta(tableHandlesPluginKey, null)
    );

    unsetHiddenDragImage();
  };

  freezeMenu = () => (this.view!.menuFrozen = true);

  unfreezeMenu = () => (this.view!.menuFrozen = false);
}
