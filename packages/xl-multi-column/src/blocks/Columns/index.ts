import { Column } from "../../pm-nodes/Column.js";
import { ColumnList } from "../../pm-nodes/ColumnList.js";

import { createBlockSpecFromTiptapNode } from "@blocknote/core";

export const ColumnBlock = createBlockSpecFromTiptapNode(
  {
    node: Column,
    type: "column",
    content: "none",
  },
  {
    width: {
      default: 1,
    },
  },
);

export const ColumnListBlock = createBlockSpecFromTiptapNode(
  {
    node: ColumnList,
    type: "columnList",
    content: "none",
  },
  {},
);
