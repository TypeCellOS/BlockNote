import type { TreePosition } from "../blocks/tree.js";
import type { LensBlock, LensPartialBlock } from "../blocks/types.js";

/**
 * The position of a block: relative to the block `reference` (see
 * `BlockNoteEditor.insertBlocks`), or the start of the document.
 */
export type BlockPosition = TreePosition;

/**
 * A change to the document, with block IDs. The operations run in sequence.
 * When an operation runs, the blocks that it refers to exist. A new block
 * has its ID before its insert operation runs. Thus, later operations can
 * refer to it.
 */
export type BlockOperation =
  /** Changes the given fields of a block: type, props, content, or a mix. */
  | { type: "update"; id: string; update: LensPartialBlock }
  /**
   * Inserts a block. If all the blocks in it are new, they come with it, as
   * its children. Else, it has no children, and later operations insert or
   * move its children.
   */
  | ({ type: "insert"; block: LensBlock } & BlockPosition)
  /** Moves a block, with its children. */
  | ({ type: "move"; id: string } & BlockPosition)
  /** Removes a block, with the children that stay in it. */
  | { type: "delete"; id: string };
