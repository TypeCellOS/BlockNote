import {
  BlockFromConfig,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

export type TableCellMenuProps<
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = {
  block: BlockFromConfig<DefaultBlockSchema["table"], I, S>;
  rowIndex: number;
  colIndex: number;
};
