import { Editor, EditorOptions } from "@tiptap/core";
import { Node } from "prosemirror-model";
// import "./blocknote.css";
import { Editor as TiptapEditor } from "@tiptap/core/dist/packages/core/src/Editor";
import {
  insertBlocks,
  removeBlocks,
  replaceBlocks,
  updateBlock,
} from "./api/blockManipulation/blockManipulation";
import {
  blocksToHTML,
  blocksToMarkdown,
  HTMLToBlocks,
  markdownToBlocks,
} from "./api/formatConversions/formatConversions";
import { nodeToBlock } from "./api/nodeConversions/nodeConversions";
import { getNodeById } from "./api/util/nodeUtil";
import { getBlockNoteExtensions, UiFactories } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import {
  Block,
  BlockIdentifier,
  PartialBlock,
} from "./extensions/Blocks/api/blockTypes";
import { TextCursorPosition } from "./extensions/Blocks/api/cursorPositionTypes";
import { getBlockInfoFromPos } from "./extensions/Blocks/helpers/getBlockInfoFromPos";
import {
  BaseSlashMenuItem,
  defaultSlashMenuItems,
} from "./extensions/SlashMenu";

export type BlockNoteEditorOptions = {
  // TODO: Figure out if enableBlockNoteExtensions/disableHistoryExtension are needed and document them.
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
  /**
   * Factories used to create a custom UI for BlockNote
   */
  uiFactories: UiFactories;
  /**
   * TODO: why is this called slashCommands and not slashMenuItems?
   *
   * @default defaultSlashMenuItems from `./extensions/SlashMenu`
   */
  slashCommands: BaseSlashMenuItem[];

  /**
   * The HTML element that should be used as the parent element for the editor.
   *
   * @default: undefined, the editor is not attached to the DOM
   */
  parentElement: HTMLElement;
  /**
   * An object containing attributes that should be added to the editor's HTML element.
   *
   * @example { class: "my-editor-class" }
   */
  editorDOMAttributes: Record<string, string>;
  /**
   *  A callback function that runs when the editor is ready to be used.
   */
  onEditorReady: (editor: BlockNoteEditor) => void;
  /**
   * A callback function that runs whenever the editor's contents change.
   */
  onEditorContentChange: (editor: BlockNoteEditor) => void;
  /**
   * A callback function that runs whenever the text cursor position changes.
   */
  onTextCursorPositionChange: (editor: BlockNoteEditor) => void;
  initialContent: PartialBlock[];

  /**
   * Use default BlockNote font and reset the styles of <p> <li> <h1> elements etc., that are used in BlockNote.
   *
   * @default true
   */
  defaultStyles: boolean;

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
    // apply defaults
    options = {
      defaultStyles: true,
      ...options,
    };

    const blockNoteExtensions = getBlockNoteExtensions({
      editor: this,
      uiFactories: options.uiFactories || {},
      slashCommands: options.slashCommands || defaultSlashMenuItems,
    });

    let extensions = options.disableHistoryExtension
      ? blockNoteExtensions.filter((e) => e.name !== "history")
      : blockNoteExtensions;

    const tiptapOptions: EditorOptions = {
      // TODO: This approach to setting initial content is "cleaner" but requires the PM editor schema, which is only
      //  created after initializing the TipTap editor. Not sure it's feasible.
      // content:
      //   options.initialContent &&
      //   options.initialContent.map((block) =>
      //     blockToNode(block, this._tiptapEditor.schema).toJSON()
      //   ),
      ...blockNoteTipTapOptions,
      ...options._tiptapOptions,
      onCreate: () => {
        options.onEditorReady?.(this);
        options.initialContent &&
          this.replaceBlocks(this.topLevelBlocks, options.initialContent);
      },
      onUpdate: () => {
        options.onEditorContentChange?.(this);
      },
      onSelectionUpdate: () => {
        options.onTextCursorPositionChange?.(this);
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
            options.defaultStyles ? styles.defaultStyles : "",
            options.editorDOMAttributes?.class || "",
          ].join(" "),
        },
      },
    };

    if (options.parentElement) {
      tiptapOptions.element = options.parentElement;
    }

    this._tiptapEditor = new Editor(tiptapOptions) as Editor & {
      contentComponent: any;
    };
  }

  /**
   * Gets a snapshot of all top-level (non-nested) blocks in the editor.
   * @returns A snapshot of all top-level (non-nested) blocks in the editor.
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
   * Gets a snapshot of an existing block from the editor.
   * @param blockIdentifier The identifier of an existing block that should be retrieved.
   * @returns The block that matches the identifier, or `undefined` if no matching block was found.
   */
  public getBlock(blockIdentifier: BlockIdentifier): Block | undefined {
    const id =
      typeof blockIdentifier === "string"
        ? blockIdentifier
        : blockIdentifier.id;
    let newBlock: Block | undefined = undefined;

    this._tiptapEditor.state.doc.firstChild!.descendants((node) => {
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
   * Traverses all blocks in the editor depth-first, and executes a callback for each.
   * @param callback The callback to execute for each block. Returning `false` stops the traversal.
   * @param reverse Whether the blocks should be traversed in reverse order.
   */
  public forEachBlock(
    callback: (block: Block) => boolean,
    reverse: boolean = false
  ): void {
    const blocks = this.topLevelBlocks.slice();

    if (reverse) {
      blocks.reverse();
    }

    function traverseBlockArray(blockArray: Block[]): boolean {
      for (const block of blockArray) {
        if (callback(block) === false) {
          return false;
        }

        const children = reverse
          ? block.children.slice().reverse()
          : block.children;

        if (traverseBlockArray(children) === false) {
          return false;
        }
      }

      return true;
    }

    traverseBlockArray(blocks);
  }

  /**
   * Gets a snapshot of the current text cursor position.
   * @returns A snapshot of the current text cursor position.
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

  /**
   * Sets the text cursor position to the start or end of an existing block. Throws an error if the target block could
   * not be found.
   * @param targetBlock The identifier of an existing block that the text cursor should be moved to.
   * @param placement Whether the text cursor should be placed at the start or end of the block.
   */
  public setTextCursorPosition(
    targetBlock: BlockIdentifier,
    placement: "start" | "end" = "start"
  ) {
    const id = typeof targetBlock === "string" ? targetBlock : targetBlock.id;

    const { posBeforeNode } = getNodeById(id, this._tiptapEditor.state.doc);
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
   * Inserts new blocks into the editor. If a block's `id` is undefined, BlockNote generates one automatically. Throws an
   * error if the reference block could not be found.
   * @param blocksToInsert An array of partial blocks that should be inserted.
   * @param referenceBlock An identifier for an existing block, at which the new blocks should be inserted.
   * @param placement Whether the blocks should be inserted just before, just after, or nested inside the
   * `referenceBlock`. Inserts the blocks at the start of the existing block's children if "nested" is used.
   */
  public insertBlocks(
    blocksToInsert: PartialBlock[],
    referenceBlock: BlockIdentifier,
    placement: "before" | "after" | "nested" = "before"
  ): void {
    insertBlocks(blocksToInsert, referenceBlock, placement, this._tiptapEditor);
  }

  /**
   * Updates an existing block in the editor. Since updatedBlock is a PartialBlock object, some fields might not be
   * defined. These undefined fields are kept as-is from the existing block. Throws an error if the block to update could
   * not be found.
   * @param blockToUpdate The block that should be updated.
   * @param update A partial block which defines how the existing block should be changed.
   */
  public updateBlock(blockToUpdate: BlockIdentifier, update: PartialBlock) {
    updateBlock(blockToUpdate, update, this._tiptapEditor);
  }

  /**
   * Removes existing blocks from the editor. Throws an error if any of the blocks could not be found.
   * @param blocksToRemove An array of identifiers for existing blocks that should be removed.
   */
  public removeBlocks(blocksToRemove: BlockIdentifier[]) {
    removeBlocks(blocksToRemove, this._tiptapEditor);
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
    blocksToInsert: PartialBlock[]
  ) {
    replaceBlocks(blocksToRemove, blocksToInsert, this._tiptapEditor);
  }

  /**
   * Serializes blocks into an HTML string. To better conform to HTML standards, children of blocks which aren't list
   * items are un-nested in the output HTML.
   * @param blocks An array of blocks that should be serialized into HTML.
   * @returns The blocks, serialized as an HTML string.
   */
  public async blocksToHTML(blocks: Block[]): Promise<string> {
    return blocksToHTML(blocks, this._tiptapEditor.schema);
  }

  /**
   * Parses blocks from an HTML string. Tries to create `Block` objects out of any HTML block-level elements, and
   * `InlineNode` objects from any HTML inline elements, though not all element types are recognized. If BlockNote
   * doesn't recognize an HTML element's tag, it will parse it as a paragraph or plain text.
   * @param html The HTML string to parse blocks from.
   * @returns The blocks parsed from the HTML string.
   */
  public async HTMLToBlocks(html: string): Promise<Block[]> {
    return HTMLToBlocks(html, this._tiptapEditor.schema);
  }

  /**
   * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
   * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
   * @param blocks An array of blocks that should be serialized into Markdown.
   * @returns The blocks, serialized as a Markdown string.
   */
  public async blocksToMarkdown(blocks: Block[]): Promise<string> {
    return blocksToMarkdown(blocks, this._tiptapEditor.schema);
  }

  /**
   * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
   * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
   * as text.
   * @param markdown The Markdown string to parse blocks from.
   * @returns The blocks parsed from the Markdown string.
   */
  public async markdownToBlocks(markdown: string): Promise<Block[]> {
    return markdownToBlocks(markdown, this._tiptapEditor.schema);
  }
}
