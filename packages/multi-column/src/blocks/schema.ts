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
  S extends StyleSchema
>(
  schema: BlockNoteSchema<B, I, S>
) => {
  return BlockNoteSchema.create({
    blockSpecs: {
      ...schema.blockSpecs,
      column: ColumnBlock,
      columnList: ColumnListBlock,
    },
    inlineContentSpecs: schema.inlineContentSpecs,
    styleSpecs: schema.styleSpecs,
  }) as any as BlockNoteSchema<
    // typescript needs some help here
    B & {
      column: typeof ColumnBlock.config;
      columnList: typeof ColumnListBlock.config;
    },
    I,
    S
  >;
};
