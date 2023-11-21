import { Block, BlockSchema } from "./blockTypes";
import { InlineContentSchema } from "./inlineContentTypes";
import { StyleSchema } from "./styles";

export type TextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  block: Block<BSchema, I, S>;
  prevBlock: Block<BSchema, I, S> | undefined;
  nextBlock: Block<BSchema, I, S> | undefined;
};
