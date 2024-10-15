import { Column } from "../../pm-nodes/Column.js";
import { ColumnList } from "../../pm-nodes/ColumnList.js";

import { createBlockSpecFromStronglyTypedTiptapNode } from "../../schema/blocks/internal.js";

export const ColumnBlock = createBlockSpecFromStronglyTypedTiptapNode(
  Column,
  {}
);

export const ColumnListBlock = createBlockSpecFromStronglyTypedTiptapNode(
  ColumnList,
  {}
);
