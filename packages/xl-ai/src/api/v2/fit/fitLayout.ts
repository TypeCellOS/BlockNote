import type { LensBlock } from "../model.js";
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
export function fitLayout(
  blocks: readonly LensBlock[],
  ruleOf: (type: string) => LayoutRule | undefined,
  /** Returns true if a block of the type `parent` (`undefined` for the top level) can have a child of the type `child`. */
  canContain?: (parent: string | undefined, child: string) => boolean,
): LensBlock[] {
  const top = place(undefined, blocks.flatMap(fit));
  // Nothing is above the top level, thus a block goes nowhere from there.
  return [...top.held, ...top.lifted];

  /** The block, then the blocks that go out of it. */
  function fit(block: LensBlock): LensBlock[] {
    const rule = ruleOf(block.type);
    const { held: children, lifted } = place(
      block.type,
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
        ruleOf(child.type)?.namedOnly ? child.children : [child],
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
    children: readonly LensBlock[],
  ): { held: LensBlock[]; lifted: LensBlock[] } {
    const held: LensBlock[] = [];
    const lifted: LensBlock[] = [];
    for (const child of children) {
      if (canContain === undefined || canContain(parent, child.type)) {
        held.push(child);
      } else if (ruleOf(child.type)?.namedOnly) {
        const inner = place(parent, child.children);
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

  function isEmptyLayoutBlock(block: LensBlock): boolean {
    const rule = ruleOf(block.type);
    return (
      rule !== undefined && rule.minChildren > 0 && block.children.length === 0
    );
  }
}
