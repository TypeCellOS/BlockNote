import { Editor as TiptapEditor } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { getBlockInfoFromPos } from "../extensions/Blocks/helpers/getBlockInfoFromPos";
import {
  Block,
  BlockIdentifier,
  PartialBlock,
} from "../extensions/Blocks/api/blockTypes";
import { TextCursorPosition } from "../extensions/Blocks/api/cursorPositionTypes";
import { nodeToBlock } from "./nodeConversions/nodeConversions";
import {
  insertBlocks,
  removeBlocks,
  replaceBlocks,
  updateBlock,
} from "./blockManipulation/blockManipulation";
import {
  blocksToHTML,
  blocksToMarkdown,
  HTMLToBlocks,
  markdownToBlocks,
} from "./formatConversions/formatConversions";

export class Editor {
  constructor(
    private tiptapEditor: TiptapEditor,
    private blockCache = new WeakMap<Node, Block>()
  ) {}

  /**
   * Gets a snapshot of all top-level blocks that are in the editor.
   * @returns An array containing a snapshot of all top-level (non-nested) blocks in the editor.
   */
  public get topLevelBlocks(): Block[] {
    const blocks: Block[] = [];

    this.tiptapEditor.state.doc.firstChild!.descendants((node) => {
      blocks.push(nodeToBlock(node, this.blockCache));

      return false;
    });

    return blocks;
  }

  /**
   * Retrieves a snapshot of an existing block from the editor.
   * @param block The identifier of an existing block that should be retrieved.
   * @returns The block that matches the identifier, or undefined if no matching block was found.
   */
  public getBlock(block: BlockIdentifier): Block | undefined {
    const id = typeof block === "string" ? block : block.id;
    let newBlock: Block | undefined = undefined;

    this.tiptapEditor.state.doc.firstChild!.descendants((node) => {
      if (typeof newBlock !== "undefined") {
        return false;
      }

      if (node.type.name !== "blockContainer" || node.attrs.id !== id) {
        return true;
      }

      newBlock = nodeToBlock(node, this.blockCache);

      return false;
    });

    return newBlock;
  }

  /**
   * Traverses all blocks in the editor, including all nested blocks, and executes a callback for each. The traversal is
   * depth-first, which is the same order as blocks appear in the editor by y-coordinate. Stops traversal if the callback
   * returns false;
   * @param callback The callback to execute for each block.
   * @param reverse Whether the blocks should be traversed in reverse order.
   */
  public forEachBlock(
    callback: (block: Block) => boolean,
    reverse: boolean = false
  ): void {
    let stop = false;

    function helper(blocks: Block[]) {
      if (reverse) {
        for (const block of blocks.reverse()) {
          helper(block.children);

          if (stop) {
            return;
          }

          stop = !callback(block);

          if (stop) {
            return;
          }
        }
      } else {
        for (const block of blocks) {
          stop = !callback(block);

          if (stop) {
            return;
          }

          helper(block.children);

          if (stop) {
            return;
          }
        }
      }
    }

    helper(this.topLevelBlocks);
  }

  /**
   * Gets a snapshot of the text cursor position within the editor.
   * @returns A snapshot of the text cursor position.
   */
  public get textCursorPosition(): TextCursorPosition {
    const { node } = getBlockInfoFromPos(
      this.tiptapEditor.state.doc,
      this.tiptapEditor.state.selection.from
    )!;

    return { block: nodeToBlock(node, this.blockCache) };
  }

  /**
   * Inserts multiple blocks before, after, or nested inside an existing block in the editor.
   * @param blocksToInsert An array of blocks to insert.
   * @param blockToInsertAt An existing block, marking where the new blocks should be inserted at.
   * @param placement Determines whether the blocks should be inserted just before, just after, or nested inside the
   * existing block.
   */
  public insertBlocks(
    blocksToInsert: PartialBlock[],
    blockToInsertAt: Block,
    placement: "before" | "after" | "nested" = "before"
  ): void {
    insertBlocks(blocksToInsert, blockToInsertAt, placement, this.tiptapEditor);
  }

  /**
   * Updates a block in the editor to the given specification.
   * @param blockToUpdate The block that should be updated.
   * @param updatedBlock The specification that the block should be updated to.
   */
  public updateBlock(blockToUpdate: Block, updatedBlock: PartialBlock) {
    updateBlock(blockToUpdate, updatedBlock, this.tiptapEditor);
  }

  /**
   * Removes multiple blocks from the editor. Throws an error if any of the blocks could not be found.
   * @param blocksToRemove An array of blocks that should be removed.
   */
  public removeBlocks(blocksToRemove: Block[]) {
    removeBlocks(blocksToRemove, this.tiptapEditor);
  }

  /**
   * Replaces multiple blocks in the editor with several other blocks. If the provided blocks to remove are not adjacent
   * to each other, the new blocks are inserted at the position of the first block in the array. Throws an error if any
   * of the blocks could not be found.
   * @param blocksToRemove An array of blocks that should be replaced.
   * @param blocksToInsert An array of blocks to replace the old ones with.
   */
  public replaceBlocks(
    blocksToRemove: Block[],
    blocksToInsert: PartialBlock[]
  ) {
    replaceBlocks(blocksToRemove, blocksToInsert, this.tiptapEditor);
  }

  /**
   * Executes a callback function whenever the editor's contents change.
   * @param callback The callback function to execute.
   */
  public onContentChange(callback: () => void) {
    this.tiptapEditor.on("update", callback);
  }

  /**
   * Serializes a list of blocks into an HTML string. The output is not the same as what's rendered by the editor, and
   * is simplified in order to better conform to HTML standards. Block structuring elements are removed, children of
   * blocks which aren't list items are lifted out of them, and list items blocks are wrapped in `ul`/`ol` tags.
   * @param blocks The list of blocks to serialize into HTML.
   * @returns An HTML representation of the blocks.
   */
  public async blocksToHTML(blocks: Block[]): Promise<string> {
    return blocksToHTML(blocks, this.tiptapEditor.schema);
  }

  /**
   * Creates a list of blocks from an HTML string.
   * @param htmlString The HTML string to create a list of blocks from.
   * @returns A list of blocks parsed from the HTML string.
   */
  public async HTMLToBlocks(htmlString: string): Promise<Block[]> {
    return HTMLToBlocks(htmlString, this.tiptapEditor.schema);
  }

  /**
   * Serializes a list of blocks into a Markdown string. The output is simplified as Markdown does not support all
   * features of BlockNote. Block structuring elements are removed, children of blocks which aren't list items are
   * un-nested, and certain styles are removed.
   * @param blocks The list of blocks to serialize into Markdown.
   * @returns A Markdown representation of the blocks.
   */
  public async blocksToMarkdown(blocks: Block[]): Promise<string> {
    return blocksToMarkdown(blocks, this.tiptapEditor.schema);
  }

  /**
   * Creates a list of blocks from a Markdown string.
   * @param markdownString The Markdown string to create a list of blocks from.
   * @returns A list of blocks parsed from the Markdown string.
   */
  public async markdownToBlocks(markdownString: string): Promise<Block[]> {
    return markdownToBlocks(markdownString, this.tiptapEditor.schema);
  }
}
