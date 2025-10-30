import { createBlockSpecFromTiptapNode, createPropSchemaFromZod } from "@blocknote/core";
import * as z from "zod/v4";
import { Column } from "../../pm-nodes/Column.js";
import { ColumnList } from "../../pm-nodes/ColumnList.js";

export const ColumnBlock = createBlockSpecFromTiptapNode(
  {
    node: Column,
    type: "column",
    content: "none",
  },
  createPropSchemaFromZod(z.object({
    width: z.number().default(1),
  })),
);

export const ColumnListBlock = createBlockSpecFromTiptapNode(
  {
    node: ColumnList,
    type: "columnList",
    content: "none",
  },
  createPropSchemaFromZod(z.object({})),
);
