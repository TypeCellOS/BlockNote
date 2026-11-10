import type { LayoutRule } from "../util/blocks/index.js";

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
 * With `canContain`, each block also fits the child rules of its parent:
 *
 * - A block that its parent cannot hold goes to after the parent. An
 *   example is a new paragraph of a client in a column that another writer
 *   removed: the merge puts it into the column list.
 * - A column that its parent cannot hold becomes the blocks in it.
 *
 * Unlike `fixLayoutBlock`, a column with only an empty paragraph stays: the
 * target is the document as the text asks for it, thus that paragraph is a
 * block of the text. The target must fit the schema, because ProseMirror
 * fills a layout block with too few children with new empty blocks.
 *
 * Method: the rules of `fixLayoutBlock` in core, for Block JSON.
 */
export function fitLayout<T extends LayoutTree<T>>(
  blocks: readonly T[],
  ruleOf: (type: string) => LayoutRule | undefined,
  /** Returns true if a block of the type `parent` (`undefined` for the top level) can have a child of the type `child`. */
  canContain?: (parent: string | undefined, child: string) => boolean,
): T[] {
  const top = place(undefined, blocks.flatMap(fit));
  // Nothing is above the top level, thus a block goes nowhere from there.
  return [...top.held, ...top.lifted];

  /** The block, then the blocks that go out of it. */
  function fit(block: T): T[] {
    const rule = ruleOf(typeOf(block));
    // Children that are not a list (JSON of a client) stay. Then the schema
    // check gives the error for them.
    if (!Array.isArray(block.children)) {
      return [block];
    }
    const { held: children, lifted } = place(
      typeOf(block),
      block.children.flatMap(fit),
    );
    if (rule === undefined || rule.namedOnly) {
      // A column stays. Its layout parent decides if it goes.
      return [{ ...block, children }, ...lifted];
    }
    const kept = children.filter((child) => !isEmptyLayoutBlock(child));
    if (kept.length >= rule.minChildren || !rule.dissolves) {
      return [{ ...block, children: kept }, ...lifted];
    }
    return [
      ...kept.flatMap((child) =>
        ruleOf(typeOf(child))?.namedOnly ? (child.children ?? []) : [child],
      ),
      ...lifted,
    ];
  }

  /**
   * Splits the children of a parent of the type into the blocks that it can
   * hold and the blocks that go out of it. A column that it cannot hold
   * becomes the blocks in it.
   */
  function place(
    parent: string | undefined,
    children: readonly T[],
  ): { held: T[]; lifted: T[] } {
    const held: T[] = [];
    const lifted: T[] = [];
    for (const child of children) {
      if (canContain === undefined || canContain(parent, typeOf(child))) {
        held.push(child);
      } else if (ruleOf(typeOf(child))?.namedOnly) {
        const inner = place(parent, child.children ?? []);
        for (const block of inner.held) {
          held.push(block);
        }
        for (const block of inner.lifted) {
          lifted.push(block);
        }
      } else {
        lifted.push(child);
      }
    }
    return { held, lifted };
  }

  function isEmptyLayoutBlock(block: T): boolean {
    const rule = ruleOf(typeOf(block));
    return (
      rule !== undefined &&
      rule.minChildren > 0 &&
      (block.children ?? []).length === 0
    );
  }
}

function typeOf(block: { type?: string }): string {
  return block.type ?? "paragraph";
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
