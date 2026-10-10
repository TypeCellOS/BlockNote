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
    container: true,
    placeable: "namedOnly",
    // Column lists don't nest in columns, as on `main` and in Notion.
    children: { allow: "blocks", exclude: ["columnList"] },
  },
  {
    // Enter in an empty column block adds another block, as in Notion:
    // columns are layout, and people add space with Enter. Other containers
    // keep the default, where an empty last block leaves the container.
    experimental_keyboard: { emptyChildEnter: "stay" },
    render: (block) => {
      const dom = document.createElement("div");
      dom.className = "bn-block-column";
      dom.style.flexGrow = String(block.props.width ?? COLUMN_WIDTH_DEFAULT);

      return {
        dom,
        contentDOM: dom,
        update: (newBlock) => {
          dom.style.flexGrow = String(
            newBlock.attrs.width ?? COLUMN_WIDTH_DEFAULT,
          );
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
    container: true,
    children: {
      allow: ["column"],
      min: 2,
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
      };
    },
  },
)();
