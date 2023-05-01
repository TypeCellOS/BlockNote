import { Block, BlockSchema } from "./blockTypes";

export type MouseCursorPosition<BSchema extends BlockSchema> = {
  block: Block<BSchema>;
  // prevBlock: Block | undefined;
  // nextBlock: Block | undefined;
};

export type TextCursorPosition<BSchema extends BlockSchema> = {
  block: Block<BSchema>;
  prevBlock: Block<BSchema> | undefined;
  nextBlock: Block<BSchema> | undefined;
};
