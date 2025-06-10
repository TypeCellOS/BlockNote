import { Block } from "../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema/index.js";

export type TextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = {
  block: Block<BSchema, I, S>;
  prevBlock: Block<BSchema, I, S> | undefined;
  nextBlock: Block<BSchema, I, S> | undefined;
  parentBlock: Block<BSchema, I, S> | undefined;
};
