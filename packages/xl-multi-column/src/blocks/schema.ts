import {
  BlockNoteSchema,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "./Columns/index.js";

export const multiColumnSchema = BlockNoteSchema.create({
  blockSpecs: {
    column: ColumnBlock,
    columnList: ColumnListBlock,
  },
});

/**
 * Adds multi-column support to the given schema.
 */
export const withMultiColumn = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: BlockNoteSchema<B, I, S>,
) => {
  return schema.extend({
    blockSpecs: {
      column: ColumnBlock,
      columnList: ColumnListBlock,
    },
  });
};
