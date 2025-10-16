import type {
  BlockFromConfig,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

export type TableHandleMenuProps<
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
> = {
  orientation: "row" | "column";
  block: BlockFromConfig<DefaultBlockSchema["table"], I, S>;
  index: number;
};
