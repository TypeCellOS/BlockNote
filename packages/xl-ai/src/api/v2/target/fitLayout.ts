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
export function fitLayout<T extends LayoutTree<T>>(
  blocks: readonly T[],
  ruleOf: (type: string) => LayoutRule | undefined,
): T[] {
  return blocks.flatMap(fit);

  function fit(block: T): T[] {
    const rule = ruleOf(block.type ?? "paragraph");
    // Children that are not a list (JSON of a client) stay. Then the schema
    // check gives the error for them.
    if (!Array.isArray(block.children)) {
      return [block];
    }
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
      ruleOf(child.type ?? "paragraph")?.namedOnly
        ? (child.children ?? [])
        : [child],
    );
  }

  function isEmptyLayoutBlock(block: T): boolean {
    const rule = ruleOf(block.type ?? "paragraph");
    return (
      rule !== undefined &&
      rule.minChildren > 0 &&
      (block.children ?? []).length === 0
    );
  }
}

/**
 * The shape that the layout rule needs: a block type and children. Blocks of
 * the lens and partial blocks of a JSON client both have it. A missing type
 * is a paragraph.
 */
export type LayoutTree<T> = {
  type?: string;
  children?: readonly T[] | null;
};
