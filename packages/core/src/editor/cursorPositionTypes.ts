import { Block } from "../blocks/defaultBlocks.js";
import { Point, Range } from "../locations/types.js";
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
  /**
   * Meta information about the current selection.
   */
  meta: {
    /**
     * The underlying location of the current selection.
     *
     * If the selection is a single cursor, this will be a {@link Point}.
     * If the selection is a selection range, this will be a {@link Range}.
     */
    location: Point | Range;
  };
  /**
   * The range of the current selection.
   * @note This is the same as the {@link meta.location} but normalized to a {@link Range}.
   */
  range: Range;
  /**
   * The block that the current text cursor is in.
   */
  block: Block<BSchema, I, S>;
  /**
   * The previous block at the same nesting level.
   */
  prevBlock: Block<BSchema, I, S> | undefined;
  /**
   * The next block at the same nesting level.
   */
  nextBlock: Block<BSchema, I, S> | undefined;
  /**
   * The parent block of the current text cursor.
   */
  parentBlock: Block<BSchema, I, S> | undefined;
};
