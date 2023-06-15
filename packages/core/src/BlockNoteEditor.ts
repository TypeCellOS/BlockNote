import { Editor, EditorOptions } from "@tiptap/core";
import { Node } from "prosemirror-model";
// import "./blocknote.css";
import { Editor as TiptapEditor } from "@tiptap/core/dist/packages/core/src/Editor";
import * as Y from "yjs";
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
  BlockSchema,
  PartialBlock,
} from "./extensions/Blocks/api/blockTypes";
import { TextCursorPosition } from "./extensions/Blocks/api/cursorPositionTypes";
import {
  DefaultBlockSchema,
  defaultBlockSchema,
} from "./extensions/Blocks/api/defaultBlocks";
import {
  ColorStyle,
  Styles,
  ToggledStyle,
} from "./extensions/Blocks/api/inlineContentTypes";
import { Selection } from "./extensions/Blocks/api/selectionTypes";
import { getBlockInfoFromPos } from "./extensions/Blocks/helpers/getBlockInfoFromPos";
import {
  BaseSlashMenuItem,
  defaultSlashMenuItems,
} from "./extensions/SlashMenu";

export type BlockNoteEditorOptions<BSchema extends BlockSchema> = {
  // TODO: Figure out if enableBlockNoteExtensions/disableHistoryExtension are needed and document them.
  enableBlockNoteExtensions: boolean;

  /**
   * UI element factories for creating a custom UI, including custom positioning
   * & rendering.
   */
  uiFactories: UiFactories<BSchema>;
  /**
   * TODO: why is this called slashCommands and not slashMenuItems?
   *
   * (couldn't fix any type, see https://github.com/TypeCellOS/BlockNote/pull/191#discussion_r1210708771)
   *
   * @default defaultSlashMenuItems from `./extensions/SlashMenu`
   */
  slashCommands: BaseSlashMenuItem<any>[];

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
  onEditorReady: (editor: BlockNoteEditor<BSchema>) => void;
  /**
   * A callback function that runs whenever the editor's contents change.
   */
  onEditorContentChange: (editor: BlockNoteEditor<BSchema>) => void;
  /**
   * A callback function that runs whenever the text cursor position changes.
   */
  onTextCursorPositionChange: (editor: BlockNoteEditor<BSchema>) => void;
  /**
   * Locks the editor from being editable by the user if set to `false`.
   */
  editable: boolean;
  /**
   * The content that should be in the editor when it's created, represented as an array of partial block objects.
   */
  initialContent: PartialBlock<BSchema>[];
  /**
   * Use default BlockNote font and reset the styles of <p> <li> <h1> elements etc., that are used in BlockNote.
   *
   * @default true
   */
  defaultStyles: boolean;
  /**
   * Whether to use the light or dark theme.
   *
   * @default "light"
   */
  theme: "light" | "dark";

  /**
   * A list of block types that should be available in the editor.
   */
  blockSchema: BSchema;

  /**
   * When enabled, allows for collaboration between multiple users.
   */
  collaboration: {
    /**
     * The Yjs XML fragment that's used for collaboration.
     */
    fragment: Y.XmlFragment;
    /**
     * The user info for the current user that's shown to other collaborators.
     */
    user: {
      name: string;
      color: string;
    };
    /**
     * A Yjs provider (used for awareness / cursor information)
     */
    provider: any;
    /**
     * Optional function to customize how cursors of users are rendered
     */
    renderCursor?: (user: any) => HTMLElement;
  };

  // tiptap options, undocumented
  _tiptapOptions: any;
};

const blockNoteTipTapOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export class BlockNoteEditor<BSchema extends BlockSchema = DefaultBlockSchema> {
  public readonly _tiptapEditor: TiptapEditor & { contentComponent: any };
  public blockCache = new WeakMap<Node, Block<BSchema>>();
  public readonly schema: BSchema;

  public get domElement() {
    return this._tiptapEditor.view.dom as HTMLDivElement;
  }

  public isFocused() {
    return this._tiptapEditor.view.hasFocus();
  }

  public focus() {
    this._tiptapEditor.view.focus();
  }

  constructor(
    private readonly options: Partial<BlockNoteEditorOptions<BSchema>> = {}
  ) {
    // apply defaults
    const newOptions: Omit<typeof options, "defaultStyles" | "blockSchema"> & {
      defaultStyles: boolean;
      blockSchema: BSchema;
    } = {
      defaultStyles: true,
      // TODO: There's a lot of annoying typing stuff to deal with here. If
      //  BSchema is specified, then options.blockSchema should also be required.
      //  If BSchema is not specified, then options.blockSchema should also not
      //  be defined. Unfortunately, trying to implement these constraints seems
      //  to be a huge pain, hence the `as any` casts.
      blockSchema: options.blockSchema || (defaultBlockSchema as any),
      ...options,
    };

    const extensions = getBlockNoteExtensions<BSchema>({
      editor: this,
      uiFactories: newOptions.uiFactories || {},
      slashCommands: newOptions.slashCommands || defaultSlashMenuItems,
      blockSchema: newOptions.blockSchema,
      collaboration: newOptions.collaboration,
    });

    this.schema = newOptions.blockSchema;

    const tiptapOptions: EditorOptions = {
      // TODO: This approach to setting initial content is "cleaner" but requires the PM editor schema, which is only
      //  created after initializing the TipTap editor. Not sure it's feasible.
      // content:
      //   options.initialContent &&
      //   options.initialContent.map((block) =>
      //     blockToNode(block, this._tiptapEditor.schema).toJSON()
      //   ),
      ...blockNoteTipTapOptions,
      ...newOptions._tiptapOptions,
      onCreate: () => {
        newOptions.onEditorReady?.(this);
        newOptions.initialContent &&
          this.replaceBlocks(this.topLevelBlocks, newOptions.initialContent);
      },
      onUpdate: () => {
        newOptions.onEditorContentChange?.(this);
      },
      onSelectionUpdate: () => {
        newOptions.onTextCursorPositionChange?.(this);
      },
      editable: options.editable === undefined ? true : options.editable,
      extensions:
        newOptions.enableBlockNoteExtensions === false
          ? newOptions._tiptapOptions?.extensions
          : [...(newOptions._tiptapOptions?.extensions || []), ...extensions],
      editorProps: {
        attributes: {
          "data-theme": options.theme || "light",
          ...(newOptions.editorDOMAttributes || {}),
          class: [
            styles.bnEditor,
            styles.bnRoot,
            newOptions.defaultStyles ? styles.defaultStyles : "",
            newOptions.editorDOMAttributes?.class || "",
          ].join(" "),
        },
      },
    };

    if (newOptions.parentElement) {
      tiptapOptions.element = newOptions.parentElement;
    }

    this._tiptapEditor = new Editor(tiptapOptions) as Editor & {
      contentComponent: any;
    };
  }

  /**
   * Gets a snapshot of all top-level (non-nested) blocks in the editor.
   * @returns A snapshot of all top-level (non-nested) blocks in the editor.
   */
  public get topLevelBlocks(): Block<BSchema>[] {
    const blocks: Block<BSchema>[] = [];

    this._tiptapEditor.state.doc.firstChild!.descendants((node) => {
      blocks.push(nodeToBlock(node, this.schema, this.blockCache));

      return false;
    });

    return blocks;
  }

  /**
   * Gets a snapshot of an existing block from the editor.
   * @param blockIdentifier The identifier of an existing block that should be retrieved.
   * @returns The block that matches the identifier, or `undefined` if no matching block was found.
   */
  public getBlock(
    blockIdentifier: BlockIdentifier
  ): Block<BSchema> | undefined {
    const id =
      typeof blockIdentifier === "string"
        ? blockIdentifier
        : blockIdentifier.id;
    let newBlock: Block<BSchema> | undefined = undefined;

    this._tiptapEditor.state.doc.firstChild!.descendants((node) => {
      if (typeof newBlock !== "undefined") {
        return false;
      }

      if (node.type.name !== "blockContainer" || node.attrs.id !== id) {
        return true;
      }

      newBlock = nodeToBlock(node, this.schema, this.blockCache);

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
    callback: (block: Block<BSchema>) => boolean,
    reverse: boolean = false
  ): void {
    const blocks = this.topLevelBlocks.slice();

    if (reverse) {
      blocks.reverse();
    }

    function traverseBlockArray(blockArray: Block<BSchema>[]): boolean {
      for (const block of blockArray) {
        if (!callback(block)) {
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
   * Executes a callback whenever the editor's contents change.
   * @param callback The callback to execute.
   */
  public onEditorContentChange(callback: () => void) {
    this._tiptapEditor.on("update", callback);
  }

  /**
   * Gets a snapshot of the current text cursor position.
   * @returns A snapshot of the current text cursor position.
   */
  public getTextCursorPosition(): TextCursorPosition<BSchema> {
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
      block: nodeToBlock(node, this.schema, this.blockCache),
      prevBlock:
        prevNode === undefined
          ? undefined
          : nodeToBlock(prevNode, this.schema, this.blockCache),
      nextBlock:
        nextNode === undefined
          ? undefined
          : nodeToBlock(nextNode, this.schema, this.blockCache),
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
   * Gets a snapshot of the current selection.
   */
  public getSelection(): Selection<BSchema> | undefined {
    if (
      this._tiptapEditor.state.selection.from ===
      this._tiptapEditor.state.selection.to
    ) {
      return undefined;
    }

    const blocks: Block<BSchema>[] = [];

    this._tiptapEditor.state.doc.descendants((node, pos) => {
      if (node.type.spec.group !== "blockContent") {
        return true;
      }

      if (
        pos + node.nodeSize < this._tiptapEditor.state.selection.from ||
        pos > this._tiptapEditor.state.selection.to
      ) {
        return true;
      }

      blocks.push(
        nodeToBlock(
          this._tiptapEditor.state.doc.resolve(pos).node(),
          this.schema,
          this.blockCache
        )
      );

      return false;
    });

    return { blocks: blocks };
  }

  /**
   * Checks if the editor is currently editable, or if it's locked.
   * @returns True if the editor is editable, false otherwise.
   */
  public get isEditable(): boolean {
    return this._tiptapEditor.isEditable;
  }

  /**
   * Makes the editor editable or locks it, depending on the argument passed.
   * @param editable True to make the editor editable, or false to lock it.
   */
  public set isEditable(editable: boolean) {
    this._tiptapEditor.setEditable(editable);
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
    blocksToInsert: PartialBlock<BSchema>[],
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
  public updateBlock(
    blockToUpdate: BlockIdentifier,
    update: PartialBlock<BSchema>
  ) {
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
    blocksToInsert: PartialBlock<BSchema>[]
  ) {
    replaceBlocks(blocksToRemove, blocksToInsert, this._tiptapEditor);
  }

  /**
   * Gets the active text styles at the text cursor position or at the end of the current selection if it's active.
   */
  public getActiveStyles() {
    const styles: Styles = {};
    const marks = this._tiptapEditor.state.selection.$to.marks();

    const toggleStyles = new Set<ToggledStyle>([
      "bold",
      "italic",
      "underline",
      "strike",
      "code",
    ]);
    const colorStyles = new Set<ColorStyle>(["textColor", "backgroundColor"]);

    for (const mark of marks) {
      if (toggleStyles.has(mark.type.name as ToggledStyle)) {
        styles[mark.type.name as ToggledStyle] = true;
      } else if (colorStyles.has(mark.type.name as ColorStyle)) {
        styles[mark.type.name as ColorStyle] = mark.attrs.color;
      }
    }

    return styles;
  }

  /**
   * Adds styles to the currently selected content.
   * @param styles The styles to add.
   */
  public addStyles(styles: Styles) {
    const toggleStyles = new Set<ToggledStyle>([
      "bold",
      "italic",
      "underline",
      "strike",
      "code",
    ]);
    const colorStyles = new Set<ColorStyle>(["textColor", "backgroundColor"]);

    this._tiptapEditor.view.focus();

    for (const [style, value] of Object.entries(styles)) {
      if (toggleStyles.has(style as ToggledStyle)) {
        this._tiptapEditor.commands.setMark(style);
      } else if (colorStyles.has(style as ColorStyle)) {
        this._tiptapEditor.commands.setMark(style, { color: value });
      }
    }
  }

  /**
   * Removes styles from the currently selected content.
   * @param styles The styles to remove.
   */
  public removeStyles(styles: Styles) {
    this._tiptapEditor.view.focus();

    for (const style of Object.keys(styles)) {
      this._tiptapEditor.commands.unsetMark(style);
    }
  }

  /**
   * Toggles styles on the currently selected content.
   * @param styles The styles to toggle.
   */
  public toggleStyles(styles: Styles) {
    const toggleStyles = new Set<ToggledStyle>([
      "bold",
      "italic",
      "underline",
      "strike",
      "code",
    ]);
    const colorStyles = new Set<ColorStyle>(["textColor", "backgroundColor"]);

    this._tiptapEditor.view.focus();

    for (const [style, value] of Object.entries(styles)) {
      if (toggleStyles.has(style as ToggledStyle)) {
        this._tiptapEditor.commands.toggleMark(style);
      } else if (colorStyles.has(style as ColorStyle)) {
        this._tiptapEditor.commands.toggleMark(style, { color: value });
      }
    }
  }

  /**
   * Gets the currently selected text.
   */
  public getSelectedText() {
    return this._tiptapEditor.state.doc.textBetween(
      this._tiptapEditor.state.selection.from,
      this._tiptapEditor.state.selection.to
    );
  }

  /**
   * Gets the URL of the last link in the current selection, or `undefined` if there are no links in the selection.
   */
  public getSelectedLinkUrl() {
    return this._tiptapEditor.getAttributes("link").href as string | undefined;
  }

  /**
   * Creates a new link to replace the selected content.
   * @param url The link URL.
   * @param text The text to display the link with.
   */
  public createLink(url: string, text?: string) {
    if (url === "") {
      return;
    }

    let { from, to } = this._tiptapEditor.state.selection;

    if (!text) {
      text = this._tiptapEditor.state.doc.textBetween(from, to);
    }

    const mark = this._tiptapEditor.schema.mark("link", { href: url });

    this._tiptapEditor.view.dispatch(
      this._tiptapEditor.view.state.tr
        .insertText(text, from, to)
        .addMark(from, from + text.length, mark)
    );
  }

  /**
   * Checks if the block containing the text cursor can be nested.
   */
  public canNestBlock() {
    const { startPos, depth } = getBlockInfoFromPos(
      this._tiptapEditor.state.doc,
      this._tiptapEditor.state.selection.from
    )!;

    return this._tiptapEditor.state.doc.resolve(startPos).index(depth - 1) > 0;
  }

  /**
   * Nests the block containing the text cursor into the block above it.
   */
  public nestBlock() {
    this._tiptapEditor.commands.sinkListItem("blockContainer");
  }

  /**
   * Checks if the block containing the text cursor is nested.
   */
  public canUnnestBlock() {
    const { depth } = getBlockInfoFromPos(
      this._tiptapEditor.state.doc,
      this._tiptapEditor.state.selection.from
    )!;

    return depth > 2;
  }

  /**
   * Lifts the block containing the text cursor out of its parent.
   */
  public unnestBlock() {
    this._tiptapEditor.commands.liftListItem("blockContainer");
  }

  /**
   * Serializes blocks into an HTML string. To better conform to HTML standards, children of blocks which aren't list
   * items are un-nested in the output HTML.
   * @param blocks An array of blocks that should be serialized into HTML.
   * @returns The blocks, serialized as an HTML string.
   */
  public async blocksToHTML(blocks: Block<BSchema>[]): Promise<string> {
    return blocksToHTML(blocks, this._tiptapEditor.schema);
  }

  /**
   * Parses blocks from an HTML string. Tries to create `Block` objects out of any HTML block-level elements, and
   * `InlineNode` objects from any HTML inline elements, though not all element types are recognized. If BlockNote
   * doesn't recognize an HTML element's tag, it will parse it as a paragraph or plain text.
   * @param html The HTML string to parse blocks from.
   * @returns The blocks parsed from the HTML string.
   */
  public async HTMLToBlocks(html: string): Promise<Block<BSchema>[]> {
    return HTMLToBlocks(html, this.schema, this._tiptapEditor.schema);
  }

  /**
   * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
   * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
   * @param blocks An array of blocks that should be serialized into Markdown.
   * @returns The blocks, serialized as a Markdown string.
   */
  public async blocksToMarkdown(blocks: Block<BSchema>[]): Promise<string> {
    return blocksToMarkdown(blocks, this._tiptapEditor.schema);
  }

  /**
   * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
   * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
   * as text.
   * @param markdown The Markdown string to parse blocks from.
   * @returns The blocks parsed from the Markdown string.
   */
  public async markdownToBlocks(markdown: string): Promise<Block<BSchema>[]> {
    return markdownToBlocks(markdown, this.schema, this._tiptapEditor.schema);
  }

  /**
   * Updates the user info for the current user that's shown to other collaborators.
   */
  public updateCollaborationUserInfo(user: { name: string; color: string }) {
    if (!this.options.collaboration) {
      throw new Error(
        "Cannot update collaboration user info when collaboration is disabled."
      );
    }
    this._tiptapEditor.commands.updateUser(user);
  }
}
