import { createBlockSpec } from "@blocknote/core";

import { ColumnResizeExtension } from "../../extensions/ColumnResize/ColumnResizeExtension.js";
import { MultiColumnDropHandlerExtension } from "../../extensions/DropCursor/multiColumnHandleDropPlugin.js";

export const COLUMN_WIDTH_DEFAULT = 1;

export const ColumnBlock = createBlockSpec(
  {
    type: "column" as const,
    propSchema: {
      width: {
        // Why does each column have a default width of 1, i.e. 100%? Because
        // when creating a new column, we want to make sure that existing
        // column widths are preserved, while the new one also has a sensible
        // width. If we'd set it so all column widths must add up to 100%
        // instead, then each time a new column is created, we'd have to assign
        // it a width depending on the total number of columns and also adjust
        // the widths of the other columns. The same can be said for using px
        // instead of percent widths and making them add to the editor width. So
        // using this method is both simpler and computationally cheaper. This
        // is possible because we can set the `flex-grow` property to the width
        // value, which handles all the resizing for us, instead of manually
        // having to set the `width` property of each column.
        default: COLUMN_WIDTH_DEFAULT,
      },
    },
    content: "none" as const,
    // A column holds the document's ordinary blocks, and only ever exists
    // inside a column list.
    children: { allow: "any" as const },
    placement: "containerOnly" as const,
  },
  {
    render: (block) => {
      const dom = document.createElement("div");
      dom.className = "bn-block-column";
      dom.style.flexGrow = String(block.props.width ?? COLUMN_WIDTH_DEFAULT);

      return { dom, contentDOM: dom };
    },
  },
  [ColumnResizeExtension(), MultiColumnDropHandlerExtension()],
)();

export const ColumnListBlock = createBlockSpec(
  {
    type: "columnList" as const,
    propSchema: {},
    content: "none" as const,
    // A column list is made of columns, and needs at least two of them to be
    // a layout at all - with one left it dissolves into that column's blocks.
    children: { allow: ["column"] as const, min: 2 },
  },
  {
    render: () => {
      const dom = document.createElement("div");
      dom.className = "bn-block-column-list";
      dom.style.display = "flex";

      return { dom, contentDOM: dom };
    },
  },
)();
