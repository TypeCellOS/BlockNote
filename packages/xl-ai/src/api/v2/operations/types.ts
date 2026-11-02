import type { BlockPlacement } from "@blocknote/core";

import type { LensBlock, LensPartialBlock } from "../blocks/types.js";

/** The position of a block, relative to the block `reference` (see `BlockNoteEditor.insertBlocks`). */
export type BlockPosition = { reference: string; placement: BlockPlacement };

/**
 * A change to the document, with block IDs. The operations run in sequence.
 * When an operation runs, the blocks that it refers to exist. A new block
 * has its ID before its insert operation runs. Thus, later operations can
 * refer to it.
 */
export type BlockOperation =
  /** Changes the given fields of a block: type, props, content, or a mix. */
  | { type: "update"; id: string; update: LensPartialBlock }
  /** Inserts a block without children. Later operations insert the children. */
  | ({ type: "insert"; block: LensBlock } & BlockPosition)
  /** Moves a block, with its children. */
  | ({ type: "move"; id: string } & BlockPosition)
  /** Removes a block, with the children that stay in it. */
  | { type: "delete"; id: string };
