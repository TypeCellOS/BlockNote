import { Editor, EditorOptions } from "@tiptap/core";
import { Node } from "prosemirror-model";
// import "./blocknote.css";
import { Block, PartialBlock } from "./extensions/Blocks/api/blockTypes";
import { getBlockNoteExtensions, UiFactories } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import {
  defaultSlashMenuItems,
  BaseSlashMenuItem,
} from "./extensions/SlashMenu";
import { Editor as TiptapEditor } from "@tiptap/core/dist/packages/core/src/Editor";
import { nodeToBlock } from "./api/nodeConversions/nodeConversions";
import { TextCursorPosition } from "./extensions/Blocks/api/cursorPositionTypes";
import { getBlockInfoFromPos } from "./extensions/Blocks/helpers/getBlockInfoFromPos";
import { getNodeById } from "./api/util/nodeUtil";
import {
  insertBlocks,
  updateBlock,
  removeBlocks,
  replaceBlocks,
} from "./api/blockManipulation/blockManipulation";
import {
  blocksToHTML,
  HTMLToBlocks,
  blocksToMarkdown,
  markdownToBlocks,
} from "./api/formatConversions/formatConversions";

export type BlockNoteEditorOptions = {
  // TODO: Figure out if enableBlockNoteExtensions/disableHistoryExtension are needed and document them.
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
  uiFactories: UiFactories;
  slashCommands: BaseSlashMenuItem[];
  parentElement: HTMLElement;
  editorDOMAttributes: Record<string, string>;
  onUpdate: (editor: BlockNoteEditor) => void;
  onCreate: (editor: BlockNoteEditor) => void;

  // tiptap options, undocumented
  _tiptapOptions: any;
};

const blockNoteTipTapOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export class BlockNoteEditor {
  public readonly _tiptapEditor: TiptapEditor & { contentComponent: any };
  private blockCache = new WeakMap<Node, Block>();

  public get domElement() {
    return this._tiptapEditor.view.dom as HTMLDivElement;
  }

  constructor(options: Partial<BlockNoteEditorOptions> = {}) {
    const blockNoteExtensions = getBlockNoteExtensions({
      editor: this,
      uiFactories: options.uiFactories || {},
      slashCommands: options.slashCommands || defaultSlashMenuItems,
    });

    let extensions = options.disableHistoryExtension
      ? blockNoteExtensions.filter((e) => e.name !== "history")
      : blockNoteExtensions;

    const tiptapOptions: EditorOptions = {
      ...blockNoteTipTapOptions,
      ...options._tiptapOptions,
      onUpdate: () => {
        options.onUpdate?.(this);
      },
      onCreate: () => {
        options.onCreate?.(this);
      },
      extensions:
        options.enableBlockNoteExtensions === false
          ? options._tiptapOptions?.extensions
          : [...(options._tiptapOptions?.extensions || []), ...extensions],
      editorProps: {
        attributes: {
          ...(options.editorDOMAttributes || {}),
          class: [
            styles.bnEditor,
            styles.bnRoot,
            options.editorDOMAttributes?.class || "",
          ].join(" "),
        },
      },
    };

    this._tiptapEditor = new Editor(tiptapOptions) as Editor & {
      contentComponent: any;
    };
  }

  /**
   * Gets a list of all top-level blocks that are in the editor.
   */
  public get topLevelBlocks(): Block[] {
    const blocks: Block[] = [];

    this._tiptapEditor.state.doc.firstChild!.descendants((node) => {
      blocks.push(nodeToBlock(node, this.blockCache));

      return false;
    });

    return blocks;
  }

  /**
   * Traverses all blocks in the editor, including all nested blocks, and executes a callback for each. The traversal is
   * depth-first, which is the same order as blocks appear in the editor by y-coordinate.
   * @param callback The callback to execute for each block.
   * @param reverse Whether the blocks should be traversed in reverse order.
   */
  public allBlocks(
    callback: (block: Block) => void,
    reverse: boolean = false
  ): void {
    function helper(blocks: Block[]) {
      if (reverse) {
        for (const block of blocks.reverse()) {
          helper(block.children);
          callback(block);
        }
      } else {
        for (const block of blocks) {
          callback(block);
          helper(block.children);
        }
      }
    }

    helper(this.topLevelBlocks);
  }

  /**
   * Gets information regarding the position of the text cursor in the editor.
   */
  public getTextCursorPosition(): TextCursorPosition {
    const { node, depth, startPos, endPos } = getBlockInfoFromPos(
      this._tiptapEditor.state.doc,
      this._tiptapEditor.state.selection.from
    )!;

    // Index of the current blockContainer node relative to its parent blockGroup.
    const nodeIndex = this._tiptapEditor.state.doc
      .resolve(endPos)
      .index(depth - 1);
    // Number of the parent blockGroup's child blockContainer nodes.
    const numNodes = this._tiptapEditor.state.doc
      .resolve(endPos + 1)
      .node().childCount;

    // Gets previous blockContainer node at the same nesting level, if the current node isn't the first child.
    let prevNode: Node | undefined = undefined;
    if (nodeIndex > 0) {
      prevNode = this._tiptapEditor.state.doc.resolve(startPos - 2).node();
    }

    // Gets next blockContainer node at the same nesting level, if the current node isn't the last child.
    let nextNode: Node | undefined = undefined;
    if (nodeIndex < numNodes - 1) {
      nextNode = this._tiptapEditor.state.doc.resolve(endPos + 2).node();
    }

    return {
      block: nodeToBlock(node, this.blockCache),
      prevBlock:
        prevNode === undefined
          ? undefined
          : nodeToBlock(prevNode, this.blockCache),
      nextBlock:
        nextNode === undefined
          ? undefined
          : nodeToBlock(nextNode, this.blockCache),
    };
  }

  public setTextCursorPosition(
    block: Block,
    placement: "start" | "end" = "start"
  ) {
    const { posBeforeNode } = getNodeById(
      block.id,
      this._tiptapEditor.state.doc
    );
    const { startPos, contentNode } = getBlockInfoFromPos(
      this._tiptapEditor.state.doc,
      posBeforeNode + 2
    )!;

    if (placement === "start") {
      this._tiptapEditor.commands.setTextSelection(startPos + 1);
    } else {
      this._tiptapEditor.commands.setTextSelection(
        startPos + contentNode.nodeSize - 1
      );
    }
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
    insertBlocks(
      blocksToInsert,
      blockToInsertAt,
      placement,
      this._tiptapEditor
    );
  }

  /**
   * Updates a block in the editor to the given specification.
   * @param blockToUpdate The block that should be updated.
   * @param updatedBlock The specification that the block should be updated to.
   */
  public updateBlock(blockToUpdate: Block, updatedBlock: PartialBlock) {
    updateBlock(blockToUpdate, updatedBlock, this._tiptapEditor);
  }

  /**
   * Removes multiple blocks from the editor. Throws an error if any of the blocks could not be found.
   * @param blocksToRemove An array of blocks that should be removed.
   */
  public removeBlocks(blocksToRemove: Block[]) {
    removeBlocks(blocksToRemove, this._tiptapEditor);
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
    replaceBlocks(blocksToRemove, blocksToInsert, this._tiptapEditor);
  }

  /**
   * Executes a callback function whenever the editor's content changes.
   * @param callback The callback function to execute.
   */
  public onContentChange(callback: () => void) {
    this._tiptapEditor.on("update", callback);
  }

  /**
   * Serializes a list of blocks into an HTML string. The output is not the same as what's rendered by the editor, and
   * is simplified in order to better conform to HTML standards. Block structuring elements are removed, children of
   * blocks which aren't list items are lifted out of them, and list items blocks are wrapped in `ul`/`ol` tags.
   * @param blocks The list of blocks to serialize into HTML.
   */
  public async blocksToHTML(blocks: Block[]): Promise<string> {
    return blocksToHTML(blocks, this._tiptapEditor.schema);
  }

  /**
   * Creates a list of blocks from an HTML string.
   * @param htmlString The HTML string to create a list of blocks from.
   */
  public async HTMLToBlocks(htmlString: string): Promise<Block[]> {
    return HTMLToBlocks(htmlString, this._tiptapEditor.schema);
  }

  /**
   * Serializes a list of blocks into a Markdown string. The output is simplified as Markdown does not support all
   * features of BlockNote. Block structuring elements are removed, children of blocks which aren't list items are
   * lifted out of them, and certain styles are removed.
   * @param blocks The list of blocks to serialize into Markdown.
   */
  public async blocksToMarkdown(blocks: Block[]): Promise<string> {
    return blocksToMarkdown(blocks, this._tiptapEditor.schema);
  }

  /**
   * Creates a list of blocks from a Markdown string.
   * @param markdownString The Markdown string to create a list of blocks from.
   */
  public async markdownToBlocks(markdownString: string): Promise<Block[]> {
    return markdownToBlocks(markdownString, this._tiptapEditor.schema);
  }
}
