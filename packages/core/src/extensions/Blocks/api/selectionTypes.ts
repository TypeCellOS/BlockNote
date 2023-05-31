import { Block, BlockSchema } from "./blockTypes";

export type Selection<BSchema extends BlockSchema> = {
  blocks: Block<BSchema>[];
};
