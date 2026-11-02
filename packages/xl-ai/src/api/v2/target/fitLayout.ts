import type { LensBlock } from "../blocks/types.js";

/**
 * The child rule of a layout block (a block with `layoutOnly: true` in its
 * config, for example a column list or a column).
 */
export type LayoutRule = {
  /** The minimum number of children. */
  minChildren: number;
  /**
   * True if the block can only be a child of its layout parent, for example a
   * column (`placeable: "namedOnly"`).
   */
  namedOnly: boolean;
  /**
   * True if the block with too few children becomes the blocks in it, for
   * example a column list with one column (`children.dissolve`).
   */
  dissolves: boolean;
};

/**
 * Returns the blocks with each layout block changed to fit its child rule,
 * as `fixLayoutBlock` in core does in the editor:
 *
 * - A layout child without children (for example a column whose blocks the
 *   text removed or moved out) goes.
 * - A layout block with too few children becomes the blocks in it. A child
 *   that can only be in its layout parent (a column) becomes the blocks in
 *   it. Thus, a column list with one column becomes the blocks of that
 *   column.
 *
 * Unlike `fixLayoutBlock`, a column with only an empty paragraph stays: the
 * target is the document as the text asks for it, thus that paragraph is a
 * block of the text. The target must fit the schema, because ProseMirror
 * fills a layout block with too few children with new empty blocks.
 */
export function fitLayout(
  blocks: readonly LensBlock[],
  ruleOf: (type: string) => LayoutRule | undefined,
): LensBlock[] {
  return blocks.flatMap(fit);

  function fit(block: LensBlock): LensBlock[] {
    const rule = ruleOf(block.type);
    const children = block.children.flatMap(fit);
    if (rule === undefined || rule.namedOnly) {
      // A column stays. Its layout parent decides if it goes.
      return [{ ...block, children }];
    }
    const kept = children.filter((child) => !isEmptyLayoutBlock(child));
    if (kept.length >= rule.minChildren || !rule.dissolves) {
      return [{ ...block, children: kept }];
    }
    return kept.flatMap((child) =>
      ruleOf(child.type)?.namedOnly ? child.children : [child],
    );
  }

  function isEmptyLayoutBlock(block: LensBlock): boolean {
    const rule = ruleOf(block.type);
    return (
      rule !== undefined && rule.minChildren > 0 && block.children.length === 0
    );
  }
}
