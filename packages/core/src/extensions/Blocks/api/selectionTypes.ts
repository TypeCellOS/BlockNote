import { Block, BlockSchema } from "./blocks/types";
import { InlineContentSchema } from "./inlineContent/types";
import { StyleSchema } from "./styles/types";

export type Selection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  blocks: Block<BSchema, I, S>[];
};
