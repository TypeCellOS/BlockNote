import type { LensBlock } from "../model.js";
import { BlockTree } from "../util/blocks/index.js";

/**
 * Returns `target`, where each block that changes between a layout block (a
 * block that is its own node and holds its children, for example a column
 * or a column list) and a block with content gets a new ID. Thus, the diff
 * gives a removal of the old block and an insert of the new block. An update
 * cannot change such a block in place: no valid document has the new type at
 * the old place, or with the old children. The children of the block keep
 * their IDs: the diff moves them out of the old block before it removes it.
 *
 * The cost: the block loses its ID, thus a comment or a link to the ID loses
 * its block.
 *
 * Alternative (not chosen; revisit if a client needs the ID): keep the ID,
 * and let the apply build the new node of the block in the structure step,
 * in the step that places it. That needs a special case in
 * `applyStructure`. Note that a removal and an insert with the same ID do
 * not work for an editor with a Y.Doc: the steps go to the editor in groups
 * (see `dispatchSteps`), and between two groups two blocks have the ID.
 */
export function newIdsForLayoutChanges(
  current: readonly LensBlock[],
  target: readonly LensBlock[],
  isLayoutType: (type: string) => boolean,
  newId: () => string,
): LensBlock[] {
  const before = new BlockTree(current);
  function fix(block: LensBlock): LensBlock {
    const old = before.byId.get(block.id);
    const changesKind =
      old !== undefined && isLayoutType(old.type) !== isLayoutType(block.type);
    return {
      ...block,
      id: changesKind ? newId() : block.id,
      children: block.children.map(fix),
    };
  }
  return target.map(fix);
}
