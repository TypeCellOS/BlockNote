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
  /**
   * Offset from the start of the block’s inline content to the current cursor position.
   *
   * For inline blocks this value is the number of characters from the start of the
   * block’s content (i.e. `0` when the cursor is at the very beginning). For block
   * types that do not contain inline content (e.g. empty blocks or structural
   * wrappers) this value will be `0`.
   */
  offset: number;
};
