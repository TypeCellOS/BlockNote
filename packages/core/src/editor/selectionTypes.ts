import { Block } from "../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema/index.js";

export type Selection<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  blocks: Block<BSchema, I, S>[];
  cutBlocks: Block<BSchema, I, S>[];
  blocksCutAtStart: string | undefined;
  blocksCutAtEnd: string | undefined;
  _meta: {
    startPos: number;
    endPos: number;
  };
};
