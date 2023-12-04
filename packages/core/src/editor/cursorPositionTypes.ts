import { Block, BlockSchema } from "../schema/blocks/types";
import { InlineContentSchema } from "../schema/inlineContent/types";
import { StyleSchema } from "../schema/styles/types";

export type TextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  block: Block<BSchema, I, S>;
  prevBlock: Block<BSchema, I, S> | undefined;
  nextBlock: Block<BSchema, I, S> | undefined;
};
