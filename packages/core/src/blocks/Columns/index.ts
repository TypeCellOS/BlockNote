import { Column, ColumnList } from "../../pm-nodes/Columns";
import { createBlockSpecFromStronglyTypedTiptapNode } from "../../schema";

export const ColumnBlock = createBlockSpecFromStronglyTypedTiptapNode(
  Column,
  {}
);

export const ColumnListBlock = createBlockSpecFromStronglyTypedTiptapNode(
  ColumnList,
  {}
);
