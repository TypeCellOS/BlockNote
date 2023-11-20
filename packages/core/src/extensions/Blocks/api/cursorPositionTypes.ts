import { Block, BlockSchema } from "./blockTypes";
import { StyleSchema } from "./styles";

export type TextCursorPosition<
  BSchema extends BlockSchema,
  S extends StyleSchema
> = {
  block: Block<BSchema, S>;
  prevBlock: Block<BSchema, S> | undefined;
  nextBlock: Block<BSchema, S> | undefined;
};
