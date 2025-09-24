import { insertBlocks } from "../../api/blockManipulation/commands/insertBlocks/insertBlocks.js";
import {
  moveBlocksDown,
  moveBlocksUp,
} from "../../api/blockManipulation/commands/moveBlocks/moveBlocks.js";
import {
  canNestBlock,
  canUnnestBlock,
  nestBlock,
  unnestBlock,
} from "../../api/blockManipulation/commands/nestBlock/nestBlock.js";
import { removeAndInsertBlocks } from "../../api/blockManipulation/commands/replaceBlocks/replaceBlocks.js";
import { updateBlock } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
  getBlock,
  getNextBlock,
  getParentBlock,
  getPrevBlock,
} from "../../api/blockManipulation/getBlock/getBlock.js";
import { docToBlocks } from "../../api/nodeConversions/nodeToBlock.js";
import {
  Block,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "../../blocks/defaultBlocks.js";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { BlockNoteEditor } from "../BlockNoteEditor.js";

export class BlockManager<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> {
  constructor(private editor: BlockNoteEditor<BSchema, ISchema, SSchema>) {}

  /**
   * Gets a snapshot of all top-level (non-nested) blocks in the editor.
   * @returns A snapshot of all top-level (non-nested) blocks in the editor.
   */
  public get document(): Block<BSchema, ISchema, SSchema>[] {
    return this.editor.transact((tr) => {
      return docToBlocks(tr.doc, this.editor.pmSchema);
    });
  }

  /**
   * Gets a snapshot of an existing block from the editor.
   * @param blockIdentifier The identifier of an existing block that should be
   * retrieved.
   * @returns The block that matches the identifier, or `undefined` if no
   * matching block was found.
   */
  public getBlock(
    blockIdentifier: BlockIdentifier,
  ): Block<BSchema, ISchema, SSchema> | undefined {
    return this.editor.transact((tr) => getBlock(tr.doc, blockIdentifier));
  }

  /**
   * Gets a snapshot of the previous sibling of an existing block from the
   * editor.
   * @param blockIdentifier The identifier of an existing block for which the
   * previous sibling should be retrieved.
   * @returns The previous sibling of the block that matches the identifier.
   * `undefined` if no matching block was found, or it's the first child/block
   * in the document.
   */
  public getPrevBlock(
    blockIdentifier: BlockIdentifier,
  ): Block<BSchema, ISchema, SSchema> | undefined {
    return this.editor.transact((tr) => getPrevBlock(tr.doc, blockIdentifier));
  }

  /**
   * Gets a snapshot of the next sibling of an existing block from the editor.
   * @param blockIdentifier The identifier of an existing block for which the
   * next sibling should be retrieved.
   * @returns The next sibling of the block that matches the identifier.
   * `undefined` if no matching block was found, or it's the last child/block in
   * the document.
   */
  public getNextBlock(
    blockIdentifier: BlockIdentifier,
  ): Block<BSchema, ISchema, SSchema> | undefined {
    return this.editor.transact((tr) => getNextBlock(tr.doc, blockIdentifier));
  }

  /**
   * Gets a snapshot of the parent of an existing block from the editor.
   * @param blockIdentifier The identifier of an existing block for which the
   * parent should be retrieved.
   * @returns The parent of the block that matches the identifier. `undefined`
   * if no matching block was found, or the block isn't nested.
   */
  public getParentBlock(
    blockIdentifier: BlockIdentifier,
  ): Block<BSchema, ISchema, SSchema> | undefined {
    return this.editor.transact((tr) =>
      getParentBlock(tr.doc, blockIdentifier),
    );
  }

  /**
   * Traverses all blocks in the editor depth-first, and executes a callback for each.
   * @param callback The callback to execute for each block. Returning `false` stops the traversal.
   * @param reverse Whether the blocks should be traversed in reverse order.
   */
  public forEachBlock(
    callback: (block: Block<BSchema, ISchema, SSchema>) => boolean,
    reverse = false,
  ): void {
    const blocks = this.document.slice();

    if (reverse) {
      blocks.reverse();
    }

    function traverseBlockArray(
      blockArray: Block<BSchema, ISchema, SSchema>[],
    ): boolean {
      for (const block of blockArray) {
        if (callback(block) === false) {
          return false;
        }

        const children = reverse
          ? block.children.slice().reverse()
          : block.children;

        if (!traverseBlockArray(children)) {
          return false;
        }
      }

      return true;
    }

    traverseBlockArray(blocks);
  }

  /**
   * Inserts new blocks into the editor. If a block's `id` is undefined, BlockNote generates one automatically. Throws an
   * error if the reference block could not be found.
   * @param blocksToInsert An array of partial blocks that should be inserted.
   * @param referenceBlock An identifier for an existing block, at which the new blocks should be inserted.
   * @param placement Whether the blocks should be inserted just before, just after, or nested inside the
   * `referenceBlock`.
   */
  public insertBlocks(
    blocksToInsert: PartialBlock<BSchema, ISchema, SSchema>[],
    referenceBlock: BlockIdentifier,
    placement: "before" | "after" = "before",
  ) {
    return this.editor.transact((tr) =>
      insertBlocks(tr, blocksToInsert, referenceBlock, placement),
    );
  }

  /**
   * Updates an existing block in the editor. Since updatedBlock is a PartialBlock object, some fields might not be
   * defined. These undefined fields are kept as-is from the existing block. Throws an error if the block to update could
   * not be found.
   * @param blockToUpdate The block that should be updated.
   * @param update A partial block which defines how the existing block should be changed.
   */
  public updateBlock(
    blockToUpdate: BlockIdentifier,
    update: PartialBlock<BSchema, ISchema, SSchema>,
  ) {
    return this.editor.transact((tr) => updateBlock(tr, blockToUpdate, update));
  }

  /**
   * Removes existing blocks from the editor. Throws an error if any of the blocks could not be found.
   * @param blocksToRemove An array of identifiers for existing blocks that should be removed.
   */
  public removeBlocks(blocksToRemove: BlockIdentifier[]) {
    return this.editor.transact(
      (tr) => removeAndInsertBlocks(tr, blocksToRemove, []).removedBlocks,
    );
  }

  /**
   * Replaces existing blocks in the editor with new blocks. If the blocks that should be removed are not adjacent or
   * are at different nesting levels, `blocksToInsert` will be inserted at the position of the first block in
   * `blocksToRemove`. Throws an error if any of the blocks to remove could not be found.
   * @param blocksToRemove An array of blocks that should be replaced.
   * @param blocksToInsert An array of partial blocks to replace the old ones with.
   */
  public replaceBlocks(
    blocksToRemove: BlockIdentifier[],
    blocksToInsert: PartialBlock<BSchema, ISchema, SSchema>[],
  ) {
    return this.editor.transact((tr) =>
      removeAndInsertBlocks(tr, blocksToRemove, blocksToInsert),
    );
  }

  /**
   * Checks if the block containing the text cursor can be nested.
   */
  public canNestBlock() {
    return canNestBlock(this.editor);
  }

  /**
   * Nests the block containing the text cursor into the block above it.
   */
  public nestBlock() {
    nestBlock(this.editor);
  }

  /**
   * Checks if the block containing the text cursor is nested.
   */
  public canUnnestBlock() {
    return canUnnestBlock(this.editor);
  }

  /**
   * Lifts the block containing the text cursor out of its parent.
   */
  public unnestBlock() {
    unnestBlock(this.editor);
  }

  /**
   * Moves the selected blocks up. If the previous block has children, moves
   * them to the end of its children. If there is no previous block, but the
   * current blocks share a common parent, moves them out of & before it.
   */
  public moveBlocksUp() {
    return moveBlocksUp(this.editor);
  }

  /**
   * Moves the selected blocks down. If the next block has children, moves
   * them to the start of its children. If there is no next block, but the
   * current blocks share a common parent, moves them out of & after it.
   */
  public moveBlocksDown() {
    return moveBlocksDown(this.editor);
  }
}
