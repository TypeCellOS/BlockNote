import { Block } from "../blocks/defaultBlocks.js";
import { PMLocation, Point, Range } from "../locations/types.js";
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
  /**
   * Meta information about the current selection.
   */
  meta: PMLocation & {
    /**
     * The lower bound of the current selection as a {@link PMLocation}.
     */
    from: PMLocation["anchor"];
    /**
     * The upper bound of the current selection as a {@link PMLocation}.
     */
    to: PMLocation["head"];
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
   * The blocks that the current selection spans across.
   */
  blocks: Block<BSchema, I, S>[];

  /**
   * The content of the current selection
   * If the selection starts / ends halfway through a block, the returned block will be
   * only the part of the block that is included in the selection.
   */
  content: Block<BSchema, I, S>[];
};
