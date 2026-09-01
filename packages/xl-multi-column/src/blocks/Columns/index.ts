import { createBlockSpec } from "@blocknote/core";

import { ColumnResizeExtension } from "../../extensions/ColumnResize/ColumnResizeExtension.js";
import { MultiColumnDropHandlerExtension } from "../../extensions/DropCursor/multiColumnHandleDropPlugin.js";

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
    children: { allow: "any" },
    placement: "containerOnly",
  },
  {
    meta: {
      draggable: false,
    },
    render: (block) => {
      const dom = document.createElement("div");
      dom.className = "bn-block-column";
      dom.style.flexGrow = String(block.props.width ?? COLUMN_WIDTH_DEFAULT);

      return {
        dom,
        contentDOM: dom,
        update: (newNode: {
          type: { name: string };
          attrs: { width?: number };
        }) => {
          if (newNode.type.name !== "column") {
            return false;
          }
          dom.style.flexGrow = String(
            newNode.attrs.width ?? COLUMN_WIDTH_DEFAULT,
          );
          return true;
        },
      };
    },
  },
  [MultiColumnDropHandlerExtension(), ColumnResizeExtension()],
)();

export const ColumnListBlock = createBlockSpec(
  {
    type: "columnList" as const,
    propSchema: {},
    content: "none",
    children: {
      allow: ["column"],
      min: 2,
      whenEmptied: "unwrap",
      // Everything crosses the column list's edge, e.g. a text selection
      // dragged across columns.
      boundary: "open",
    },
  },
  {
    meta: {
      draggable: false,
    },
    render: () => {
      const dom = document.createElement("div");
      dom.className = "bn-block-column-list";
      dom.style.display = "flex";

      return {
        dom,
        contentDOM: dom,
        update: (newNode: { type: { name: string } }) => {
          return newNode.type.name === "columnList";
        },
      };
    },
  },
)();
