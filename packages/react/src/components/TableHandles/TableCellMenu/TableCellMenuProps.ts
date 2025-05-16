import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  SpecificBlock,
  StyleSchema,
} from "@blocknote/core";

export type TableCellMenuProps<
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = {
  block: SpecificBlock<{ table: DefaultBlockSchema["table"] }, "table", I, S>;
  rowIndex: number;
  colIndex: number;
};
