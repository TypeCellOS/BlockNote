import { BlockNoteEditor, getNodeById } from "@blocknote/core";
import { Extension } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { Plugin, PluginKey, PluginView } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

type ColumnData = {
  element: HTMLElement;
  id: string;
  node: Node;
  posBeforeNode: number;
};

type ColumnDataWithWidths = ColumnData & {
  widthPx: number;
  widthPercent: number;
};

type ColumnDefaultState = {
  type: "default";
};

type ColumnHoverState = {
  type: "hover";
  leftColumn: ColumnData;
  rightColumn: ColumnData;
};

type ColumnResizeState = {
  type: "resize";
  startPos: number;
  leftColumn: ColumnDataWithWidths;
  rightColumn: ColumnDataWithWidths;
};

type ColumnState = ColumnDefaultState | ColumnHoverState | ColumnResizeState;

const columnResizePluginKey = new PluginKey<ColumnState>("ColumnResizePlugin");

class ColumnResizePluginView implements PluginView {
  editor: BlockNoteEditor<any, any, any>;
  view: EditorView;

  readonly RESIZE_MARGIN_WIDTH_PX = 20;
  readonly COLUMN_MIN_WIDTH_PERCENT = 0.5;

  constructor(editor: BlockNoteEditor<any, any, any>, view: EditorView) {
    this.editor = editor;
    this.view = view;

    this.view.dom.addEventListener("mousedown", this.mouseDownHandler);
    document.body.addEventListener("mousemove", this.mouseMoveHandler);
    document.body.addEventListener("mouseup", this.mouseUpHandler);
  }

  getColumnHoverOrDefaultState = (
    event: MouseEvent
  ): ColumnDefaultState | ColumnHoverState => {
    if (!this.editor.isEditable) {
      return { type: "default" };
    }

    const target = event.target as HTMLElement;

    // Do nothing if the event target is outside the editor.
    if (!this.view.dom.contains(target)) {
      return { type: "default" };
    }

    const columnElement = target.closest(
      ".bn-block-column"
    ) as HTMLElement | null;

    // Do nothing if a column element does not exist in the event target's
    // ancestors.
    if (!columnElement) {
      return { type: "default" };
    }

    const startPos = event.clientX;
    const columnElementDOMRect = columnElement.getBoundingClientRect();

    // Whether the cursor is within the width margin to trigger a resize.
    const cursorElementSide =
      startPos < columnElementDOMRect.left + this.RESIZE_MARGIN_WIDTH_PX
        ? "left"
        : startPos > columnElementDOMRect.right - this.RESIZE_MARGIN_WIDTH_PX
        ? "right"
        : "none";

    // The column element before or after the one hovered by the cursor,
    // depending on which side the cursor is on.
    const adjacentColumnElement =
      cursorElementSide === "left"
        ? columnElement.previousElementSibling
        : cursorElementSide === "right"
        ? columnElement.nextElementSibling
        : undefined;

    // Do nothing if the cursor is not within the resize margin or if there
    // is no column before or after the one hovered by the cursor, depending
    // on which side the cursor is on.
    if (!adjacentColumnElement) {
      return { type: "default" };
    }

    const leftColumnElement =
      cursorElementSide === "left"
        ? (adjacentColumnElement as HTMLElement)
        : columnElement;

    const rightColumnElement =
      cursorElementSide === "left"
        ? columnElement
        : (adjacentColumnElement as HTMLElement);

    const leftColumnId = leftColumnElement.getAttribute("data-id")!;
    const rightColumnId = rightColumnElement.getAttribute("data-id")!;

    const leftColumnNodeAndPos = getNodeById(leftColumnId, this.view.state.doc);

    const rightColumnNodeAndPos = getNodeById(
      rightColumnId,
      this.view.state.doc
    );

    if (
      !leftColumnNodeAndPos ||
      !rightColumnNodeAndPos ||
      !leftColumnNodeAndPos.posBeforeNode
    ) {
      throw new Error("Column not found");
    }

    return {
      type: "hover",
      leftColumn: {
        element: leftColumnElement,
        id: leftColumnId,
        ...leftColumnNodeAndPos,
      },
      rightColumn: {
        element: rightColumnElement,
        id: rightColumnId,
        ...rightColumnNodeAndPos,
      },
    };
  };

  // When the user mouses down near the boundary between two columns, we
  // want to set the plugin state to resize, so the columns can be resized
  // by moving the mouse.
  mouseDownHandler = (event: MouseEvent) => {
    let newState: ColumnState = this.getColumnHoverOrDefaultState(event);
    if (newState.type === "default") {
      return;
    }

    event.preventDefault();

    const startPos = event.clientX;

    const leftColumnWidthPx =
      newState.leftColumn.element.getBoundingClientRect().width;
    const rightColumnWidthPx =
      newState.rightColumn.element.getBoundingClientRect().width;

    const leftColumnWidthPercent = newState.leftColumn.node.attrs
      .width as number;
    const rightColumnWidthPercent = newState.rightColumn.node.attrs
      .width as number;

    newState = {
      type: "resize",
      startPos,
      leftColumn: {
        ...newState.leftColumn,
        widthPx: leftColumnWidthPx,
        widthPercent: leftColumnWidthPercent,
      },
      rightColumn: {
        ...newState.rightColumn,
        widthPx: rightColumnWidthPx,
        widthPercent: rightColumnWidthPercent,
      },
    };

    this.view.dispatch(
      this.view.state.tr.setMeta(columnResizePluginKey, newState)
    );

    this.editor.sideMenu.freezeMenu();
  };

  // If the plugin isn't in a resize state, we want to update it to either a
  // hover state if the mouse is near the boundary between two columns, or
  // default otherwise. If the plugin is in a resize state, we want to
  // update the column widths based on the horizontal mouse movement.
  mouseMoveHandler = (event: MouseEvent) => {
    const pluginState = columnResizePluginKey.getState(this.view.state);
    if (!pluginState) {
      return;
    }

    // If the user isn't currently resizing columns, we want to update the
    // plugin state to maybe show or hide the resize border between columns.
    if (pluginState.type !== "resize") {
      const newState = this.getColumnHoverOrDefaultState(event);

      // Prevent unnecessary state updates (when the state before and after
      // is the same).
      const bothDefaultStates =
        pluginState.type === "default" && newState.type === "default";
      const sameColumnIds =
        pluginState.type !== "default" &&
        newState.type !== "default" &&
        pluginState.leftColumn.id === newState.leftColumn.id &&
        pluginState.rightColumn.id === newState.rightColumn.id;
      if (bothDefaultStates || sameColumnIds) {
        return;
      }

      // Since the resize bar overlaps the side menu, we don't want to show it
      // if the side menu is already open.
      if (newState.type === "hover" && this.editor.sideMenu.view?.state?.show) {
        return;
      }

      // Update the plugin state.
      this.view.dispatch(
        this.view.state.tr.setMeta(columnResizePluginKey, newState)
      );

      return;
    }

    const widthChangePx = event.clientX - pluginState.startPos;
    // We need to scale the width change by the left column's width in
    // percent, otherwise the rate at which the resizing happens will change
    // based on the width of the left column.
    const scaledWidthChangePx =
      widthChangePx * pluginState.leftColumn.widthPercent;
    const widthChangePercent =
      (pluginState.leftColumn.widthPx + scaledWidthChangePx) /
        pluginState.leftColumn.widthPx -
      1;

    let newLeftColumnWidth =
      pluginState.leftColumn.widthPercent + widthChangePercent;
    let newRightColumnWidth =
      pluginState.rightColumn.widthPercent - widthChangePercent;

    // Ensures that the column widths do not go below the minimum width.
    // There is no maximum width, the user can resize the columns as much as
    // they want provided the others don't go below the minimum width.
    if (newLeftColumnWidth < this.COLUMN_MIN_WIDTH_PERCENT) {
      newRightColumnWidth -= this.COLUMN_MIN_WIDTH_PERCENT - newLeftColumnWidth;
      newLeftColumnWidth = this.COLUMN_MIN_WIDTH_PERCENT;
    } else if (newRightColumnWidth < this.COLUMN_MIN_WIDTH_PERCENT) {
      newLeftColumnWidth -= this.COLUMN_MIN_WIDTH_PERCENT - newRightColumnWidth;
      newRightColumnWidth = this.COLUMN_MIN_WIDTH_PERCENT;
    }

    // possible improvement: only dispatch on mouse up, and use a different way
    // to update the column widths while dragging.
    // this prevents a lot of document updates
    this.view.dispatch(
      this.view.state.tr
        .setNodeAttribute(
          pluginState.leftColumn.posBeforeNode,
          "width",
          newLeftColumnWidth
        )
        .setNodeAttribute(
          pluginState.rightColumn.posBeforeNode,
          "width",
          newRightColumnWidth
        )
        .setMeta("addToHistory", false)
    );
  };

  // If the plugin is in a resize state, we want to revert it to a default
  // or hover, depending on where the mouse cursor is, when the user
  // releases the mouse button.
  mouseUpHandler = (event: MouseEvent) => {
    const pluginState = columnResizePluginKey.getState(this.view.state);
    if (!pluginState || pluginState.type !== "resize") {
      return;
    }

    const newState = this.getColumnHoverOrDefaultState(event);

    // Revert plugin state to default or hover, depending on where the mouse
    // cursor is.
    this.view.dispatch(
      this.view.state.tr.setMeta(columnResizePluginKey, newState)
    );

    this.editor.sideMenu.unfreezeMenu();
  };

  destroy() {
    this.view.dom.removeEventListener("mousedown", this.mouseDownHandler);
    document.body.removeEventListener("mousemove", this.mouseMoveHandler);
    document.body.removeEventListener("mouseup", this.mouseUpHandler);
  }
}

const createColumnResizePlugin = (editor: BlockNoteEditor<any, any, any>) =>
  new Plugin({
    key: columnResizePluginKey,
    props: {
      // This adds a border between the columns when the user is
      // resizing them or when the cursor is near their boundary.
      decorations: (state) => {
        const pluginState = columnResizePluginKey.getState(state);
        if (!pluginState || pluginState.type === "default") {
          return DecorationSet.empty;
        }

        return DecorationSet.create(state.doc, [
          Decoration.node(
            pluginState.leftColumn.posBeforeNode,
            pluginState.leftColumn.posBeforeNode +
              pluginState.leftColumn.node.nodeSize,
            {
              style: "box-shadow: 4px 0 0 #ccc; cursor: col-resize",
            }
          ),
          Decoration.node(
            pluginState.rightColumn.posBeforeNode,
            pluginState.rightColumn.posBeforeNode +
              pluginState.rightColumn.node.nodeSize,
            {
              style: "cursor: col-resize",
            }
          ),
        ]);
      },
    },
    state: {
      init: () => ({ type: "default" } as ColumnState),
      apply: (tr, oldPluginState) => {
        const newPluginState = tr.getMeta(columnResizePluginKey) as
          | ColumnState
          | undefined;

        return newPluginState === undefined ? oldPluginState : newPluginState;
      },
    },
    view: (view) => new ColumnResizePluginView(editor, view),
  });

export const createColumnResizeExtension = (
  editor: BlockNoteEditor<any, any, any>
) =>
  Extension.create({
    name: "columnResize",
    addProseMirrorPlugins() {
      return [createColumnResizePlugin(editor)];
    },
  });
