import { Block, BlockSchema } from "./blocks/types";
import { InlineContentSchema } from "./inlineContent/types";
import { StyleSchema } from "./styles/types";

export type TextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  block: Block<BSchema, I, S>;
  prevBlock: Block<BSchema, I, S> | undefined;
  nextBlock: Block<BSchema, I, S> | undefined;
};
