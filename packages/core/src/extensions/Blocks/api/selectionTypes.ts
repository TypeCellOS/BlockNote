import { Block, BlockSchema } from "./blockTypes";
import { InlineContentSchema } from "./inlineContentTypes";
import { StyleSchema } from "./styles";

export type Selection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  blocks: Block<BSchema, I, S>[];
};
