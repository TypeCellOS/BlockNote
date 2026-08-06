import {
  createBlockSpec,
  createBlockSpecFromTiptapNode,
} from "@blocknote/core";

import { ColumnResizeExtension } from "../../extensions/ColumnResize/ColumnResizeExtension.js";
import { MultiColumnDropHandlerExtension } from "../../extensions/DropCursor/multiColumnHandleDropPlugin.js";
import { ColumnList } from "../../pm-nodes/ColumnList.js";

// Why does each column have a default width of 1, i.e. 100%? Because when
// creating a new column, we want to make sure that existing column widths are
// preserved, while the new one also has a sensible width. If we set it so all
// column widths must add up to 100% instead, then each time a new column is
// created, we'd have to assign it a width depending on the total number of
// columns and also adjust the widths of the others. The same can be said for
// using px instead of percent widths and making them add to the editor width.
// Using flex-grow on the value handles all the resizing for us, instead of
// manually having to set `width` on each column.
const COLUMN_WIDTH_DEFAULT = 1;

export const ColumnBlock = createBlockSpec(
  {
    type: "column" as const,
    propSchema: {
      width: {
        default: COLUMN_WIDTH_DEFAULT,
      },
    },
    content: "none",
    // Columns only ever live inside a `columnList` (whose content expression
    // is `column column+`). `topLevel: false` keeps column out of the
    // generic `blockGroupChild` group so it can't be inserted at the document
    // root or as a child of any other block.
    container: { topLevel: false },
  },
  {
    render: (block) => {
      const dom = document.createElement("div");
      dom.className = "bn-block-column";
      const width = block.props.width ?? COLUMN_WIDTH_DEFAULT;
      dom.style.flexGrow = String(width);
      dom.setAttribute("data-node-type", "column");
      dom.setAttribute("data-id", block.id);
      if (width !== COLUMN_WIDTH_DEFAULT) {
        dom.setAttribute("data-width", String(width));
      }

      return {
        dom,
        contentDOM: dom,
        update: (newNode: {
          type: { name: string };
          attrs: { id?: string; width?: number };
        }) => {
          if (newNode.type.name !== "column") {
            return false;
          }
          const newWidth = newNode.attrs.width ?? COLUMN_WIDTH_DEFAULT;
          dom.style.flexGrow = String(newWidth);
          if (newWidth !== COLUMN_WIDTH_DEFAULT) {
            dom.setAttribute("data-width", String(newWidth));
          } else {
            dom.removeAttribute("data-width");
          }
          if (newNode.attrs.id) {
            dom.setAttribute("data-id", newNode.attrs.id);
          }
          return true;
        },
      };
    },
  },
  [MultiColumnDropHandlerExtension(), ColumnResizeExtension()],
)();

export const ColumnListBlock = createBlockSpecFromTiptapNode(
  {
    node: ColumnList,
    type: "columnList",
    content: "none",
  },
  {},
);
