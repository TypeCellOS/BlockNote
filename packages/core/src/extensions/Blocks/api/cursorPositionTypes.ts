import { Block } from "./blockTypes";

export type MouseCursorPosition = {
  block: Block;
  // prevBlock: Block | undefined;
  // nextBlock: Block | undefined;
};

export type TextCursorPosition = {
  block: Block;
  prevBlock: Block | undefined;
  nextBlock: Block | undefined;
};
