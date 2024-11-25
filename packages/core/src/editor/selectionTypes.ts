import { Block } from "../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema/index.js";

export type Selection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  blocks: Block<BSchema, I, S>[];
  nextBlock?: Block<BSchema, I, S>;
  prevBlock?: Block<BSchema, I, S>;
  parentBlock?: Block<BSchema, I, S>;
};
