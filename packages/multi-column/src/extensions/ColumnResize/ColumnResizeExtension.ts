import { Plugin, PluginKey, PluginView } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { getNodeById } from "@blocknote/core";
import { Extension } from "@tiptap/core";
import { Node } from "prosemirror-model";

type ColumnData = {
  element: HTMLElement;
  id: string;
  node: Node;
  pos: number;
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
  view: EditorView;

  readonly RESIZE_MARGIN_WIDTH_PX = 100;
  readonly COLUMN_MIN_WIDTH_PERCENT = 0.5;

  constructor(view: EditorView) {
    this.view = view;

    this.view.dom.addEventListener("mousedown", this.mouseDownHandler);
    document.body.addEventListener("mousemove", this.mouseMoveHandler);
    document.body.addEventListener("mouseup", this.mouseUpHandler);
  }

  getColumnHoverOrDefaultState = (
    event: MouseEvent
  ): ColumnDefaultState | ColumnHoverState => {
    let columnElement = event.target as HTMLElement;

    // Do nothing if the event target is outside the editor.
    if (!this.view.dom.contains(columnElement)) {
      return { type: "default" };
    }

    // Traverse ancestors of event target until a column element is found.
    while (
      !columnElement.className.includes("bn-block-column") &&
      columnElement.parentElement !== null
    ) {
      columnElement = columnElement.parentElement;
    }

    // Do nothing if a column element does not exist in the event target's
    // ancestors.
    if (!columnElement.className.includes("bn-block-column")) {
      return { type: "default" };
    }

    const startPos = event.clientX;
    const columnElementDOMRect = columnElement.getBoundingClientRect();

    // Which side of the column the cursor is on.
    const cursorElementSide: "left" | "right" =
      startPos < columnElementDOMRect.left + columnElementDOMRect.width / 2
        ? "left"
        : "right";
    // Whether the cursor is within the width margin to trigger a resize.
    const cursorWithinResizeMargin =
      cursorElementSide === "left"
        ? startPos - columnElementDOMRect.left < this.RESIZE_MARGIN_WIDTH_PX
        : columnElementDOMRect.right - startPos < this.RESIZE_MARGIN_WIDTH_PX;
    // The column element before or after the one hovered by the cursor,
    // depending on which side the cursor is on.
    const adjacentColumnElement =
      cursorElementSide === "left"
        ? columnElement.previousElementSibling
        : columnElement.nextElementSibling;

    // Do nothing if the cursor is not within the resize margin or if there
    // is no column before or after the one hovered by the cursor, depending
    // on which side the cursor is on.
    if (!cursorWithinResizeMargin || !adjacentColumnElement) {
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

    const leftColumnNodeAndPos = getNodeById(
      leftColumnId,
      this.view.state.doc
    )!;
    const rightColumnNodeAndPos = getNodeById(
      rightColumnId,
      this.view.state.doc
    )!;

    const leftColumnNode = leftColumnNodeAndPos.node;
    const rightColumnNode = rightColumnNodeAndPos.node;

    const leftColumnPos = leftColumnNodeAndPos.posBeforeNode;
    const rightColumnPos = rightColumnNodeAndPos.posBeforeNode;

    return {
      type: "hover",
      leftColumn: {
        element: leftColumnElement,
        id: leftColumnId,
        node: leftColumnNode,
        pos: leftColumnPos,
      },
      rightColumn: {
        element: rightColumnElement,
        id: rightColumnId,
        node: rightColumnNode,
        pos: rightColumnPos,
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

    console.log(newState);
    this.view.dispatch(
      this.view.state.tr.setMeta(columnResizePluginKey, newState)
    );
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

      // Update the plugin state.
      console.log(newState);
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

    console.log("newLeftColumnWidth", newLeftColumnWidth);
    console.log("newRightColumnWidth", newRightColumnWidth);
    this.view.dispatch(
      this.view.state.tr
        .setNodeAttribute(
          pluginState.leftColumn.pos,
          "width",
          newLeftColumnWidth
        )
        .setNodeAttribute(
          pluginState.rightColumn.pos,
          "width",
          newRightColumnWidth
        )
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
    console.log(newState);
    this.view.dispatch(
      this.view.state.tr.setMeta(columnResizePluginKey, newState)
    );
  };

  // In a `columnList` node, we expect that the average width of each column
  // is 1. However, there are cases in which this stops being true. For
  // example, making one really wide column and then removing it will cause
  // the width average to go down. This isn't really an issue until the user
  // tries to add a new column, which will, in this case, be wider than
  // expected. Therefore, this function traverses the document and
  // normalizes the average column width to 1 whenever and wherever
  // necessary.
  update = (view: EditorView) => {
    let tr = view.state.tr;

    view.state.doc.descendants((node, pos) => {
      if (node.type.name !== "columnList") {
        return true;
      }

      let sumColumnWidthPercent = 0;
      node.forEach((node) => {
        sumColumnWidthPercent += node.attrs.width as number;
      });
      const avgColumnWidthPercent = sumColumnWidthPercent / node.childCount;

      // If the average column width is not 1, normalize it. We're dealing
      // with floats so we need a small margin to account for precision
      // errors.
      if (avgColumnWidthPercent < 0.99 || avgColumnWidthPercent > 1.01) {
        const scalingFactor = 1 / avgColumnWidthPercent;

        node.forEach((node, offset) => {
          tr = tr.setNodeAttribute(
            pos + offset + 1,
            "width",
            node.attrs.width * scalingFactor
          );
        });

        view.dispatch(tr);
      }

      return false;
    });
  };
}

const columnResizePlugin = new Plugin({
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
          pluginState.leftColumn.pos,
          pluginState.rightColumn.pos,
          {
            style: "border-right: 1px solid blue",
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
  view: (view) => new ColumnResizePluginView(view),
});

export const ColumnResizeExtension = Extension.create({
  addProseMirrorPlugins() {
    return [columnResizePlugin];
  },
});
