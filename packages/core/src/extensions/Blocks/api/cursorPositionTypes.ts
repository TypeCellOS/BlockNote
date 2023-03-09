import { Block } from "./blockTypes";

export type TextCursorPosition = {
  block: Block;
  prevBlock: Block | undefined;
  nextBlock: Block | undefined;
};
