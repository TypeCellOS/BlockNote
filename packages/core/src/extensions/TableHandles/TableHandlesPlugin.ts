import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import {
  BaseUiElementCallbacks,
  BlockNoteEditor,
  BlockSchema,
  getDraggableBlockFromCoords,
} from "../..";
import { EventEmitter } from "../../shared/EventEmitter";
import { Block } from "../Blocks/api/blockTypes";
import { Table } from "../Blocks/nodes/BlockContent/TableBlockContent/TableBlockContent";
import { nodeToBlock } from "../../api/nodeConversions/nodeConversions";
export type TableHandlesCallbacks = BaseUiElementCallbacks;

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

function getChildIndex(node: HTMLElement) {
  return Array.prototype.indexOf.call(node.parentElement!.childNodes, node);
}

// Finds the DOM element corresponding to the table cell that the target element
// is currently in. If the target element is not in a table cell, returns null.
function domCellAround(target: HTMLElement | null): HTMLElement | null {
  while (target && target.nodeName !== "TD" && target.nodeName !== "TH") {
    target =
      target.classList && target.classList.contains("ProseMirror")
        ? null
        : (target.parentNode as HTMLElement);
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

    hideElementsWithClassNames([
      "column-resize-handle",
      "prosemirror-dropcursor-block",
      "prosemirror-dropcursor-inline",
    ]);

    // The mouse coordinates, bounded to the table's bounding box.
    const boundedMouseCoords = {
      left: Math.min(
        Math.max(event.clientX, this.state.referencePosTable.left),
        this.state.referencePosTable.right
      ),
      top: Math.min(
        Math.max(event.clientY, this.state.referencePosTable.top),
        this.state.referencePosTable.bottom
      ),
    };
    const mousePos =
      this.state.isDragging.draggedCellOrientation === "row"
        ? boundedMouseCoords.top
        : boundedMouseCoords.left;

    // Gets the ProseMirror position corresponding to the projected mouse
    // coordinates.
    let proseMirrorPos = this.pmView.posAtCoords(boundedMouseCoords)!.pos;
    let resolvedPos = this.pmView.state.doc.resolve(proseMirrorPos);

    // Gets the ProseMirror node type at `proseMirrorPos`. This node will always
    // be either a `tableParagraph` or `tableCell`.
    let nodeType = resolvedPos.node().type.name;

    // If the node type is `tableParagraph`, we need to get a position in its
    // parent node (the `tableCell`). We use `before()` to get this position.
    if (nodeType === "tableParagraph") {
      proseMirrorPos = resolvedPos.before();
      resolvedPos = this.pmView.state.doc.resolve(proseMirrorPos);
      nodeType = resolvedPos.node().type.name;
    }

    // Finally, we get the row/column index corresponding to the mouse position.
    const rowIndex = resolvedPos.index(resolvedPos.depth - 2);
    const colIndex = resolvedPos.index(resolvedPos.depth - 1);
    const newIndex =
      this.state.isDragging.draggedCellOrientation === "row"
        ? rowIndex
        : colIndex;

    const referencePosCell = (
      this.pmView.nodeDOM(resolvedPos.before()) as HTMLElement
    ).getBoundingClientRect();

    // Since `dragOver` events continually fire, we want to make sure that
    // updates only trigger when the fields actually change.
    const needsUpdate =
      this.state.rowIndex !== rowIndex ||
      this.state.colIndex !== colIndex ||
      this.state.isDragging.mousePos !== mousePos;

    if (needsUpdate) {
      // TODO: This should always be `tableCell`, but sometimes it's `table`.
      //  This happens in the topmost and leftmost cells, in the gap between the
      //  text and the edge of the table. This is a bit of a hack to prevent it
      //  from making the reference DOMRect incorrect.
      if (nodeType === "tableCell") {
        this.state.referencePosCell = referencePosCell;
      }
      this.state.rowIndex = rowIndex;
      this.state.colIndex = colIndex;

      this.state.isDragging.mousePos = mousePos;

      this.updateState();

      this.pmView.dispatch(
        this.pmView.state.tr.setMeta(tableHandlesPluginKey, {
          newIndex: newIndex,
        })
      );
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
  };

  // /**
  //  * Freezes the side menu. When frozen, the side menu will stay
  //  * attached to the same block regardless of which block is hovered by the
  //  * mouse cursor.
  //  */
  // freezeMenu = () => (this.sideMenuView!.menuFrozen = true);
  // /**
  //  * Unfreezes the side menu. When frozen, the side menu will stay
  //  * attached to the same block regardless of which block is hovered by the
  //  * mouse cursor.
  //  */
  // unfreezeMenu = () => (this.sideMenuView!.menuFrozen = false);
}
