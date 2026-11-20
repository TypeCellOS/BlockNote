import type { BlockPlacement } from "@blocknote/core";

import type { LensBlock, LensPartialBlock } from "../model.js";

/**
 * The position of a block: relative to the block `reference` (see
 * `BlockNoteEditor.insertBlocks`), or the start of the document.
 */
export type BlockPosition =
  | { reference: string; placement: BlockPlacement }
  | { placement: "start" };

/**
 * A change to the document, with block IDs. The operations of a list do not
 * all run in the sequence of the list (see `applyOperations`):
 *
 * - An update refers to a block of the current document (the document
 *   before the operations of the list). All updates apply first. Thus, an
 *   update of a block that an insert of the same list adds throws ("is not
 *   in the document"). `diffDocuments` gives an update only for a block of
 *   the current document.
 * - The structure operations (the inserts, the moves and the removals) run
 *   after the updates, in sequence. When a structure operation runs, the
 *   blocks that it refers to exist. A new block has its ID before its insert
 *   operation runs. Thus, later structure operations can refer to it.
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

/**
 * An operation that changes the fields of one block, and not the structure
 * of the document.
 *
 * @internal
 */
export type UpdateOperation = Extract<BlockOperation, { type: "update" }>;

/**
 * An operation that changes the structure of the document: an insert, a
 * move or a removal.
 *
 * @internal
 */
export type StructureOperation = Exclude<BlockOperation, { type: "update" }>;
