import { Block, BlockSchema } from "../schema/blocks/types";
import { InlineContentSchema } from "../schema/inlineContent/types";
import { StyleSchema } from "../schema/styles/types";

export type Selection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  blocks: Block<BSchema, I, S>[];
};
