import { Block } from "../blocks/defaultBlocks.js";
import {
  BlockIdentifier,
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
  prevBlock: Block<BSchema, I, S> | undefined;
  nextBlock: Block<BSchema, I, S> | undefined;
  parentBlock: Block<BSchema, I, S> | undefined;
};

export type PartialSelection =
  | BlockIdentifier
  | {
      block: BlockIdentifier;
      selectionType: "span" | "collapsedStart" | "collapsedEnd";
    }
  | {
      startBlock: BlockIdentifier;
      endBlock: BlockIdentifier;
    };
