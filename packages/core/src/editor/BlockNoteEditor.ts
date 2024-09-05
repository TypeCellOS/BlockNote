import { EditorOptions, Extension, getSchema } from "@tiptap/core";
import { Node, Schema } from "prosemirror-model";
// import "./blocknote.css";
import * as Y from "yjs";
import {
  insertBlocks,
  insertContentAt,
  removeBlocks,
  replaceBlocks,
  updateBlock,
} from "../api/blockManipulation/blockManipulation";
import { createExternalHTMLExporter } from "../api/exporters/html/externalHTMLExporter";
import { blocksToMarkdown } from "../api/exporters/markdown/markdownExporter";
import { getBlockInfoFromPos } from "../api/getBlockInfoFromPos";
import {
  inlineContentToNodes,
  nodeToBlock,
} from "../api/nodeConversions/nodeConversions";
import { getNodeById } from "../api/nodeUtil";
import { HTMLToBlocks } from "../api/parsers/html/parseHTML";
import { markdownToBlocks } from "../api/parsers/markdown/parseMarkdown";
import {
  Block,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "../blocks/defaultBlocks";
import { FilePanelProsemirrorPlugin } from "../extensions/FilePanel/FilePanelPlugin";
import { FormattingToolbarProsemirrorPlugin } from "../extensions/FormattingToolbar/FormattingToolbarPlugin";
import { LinkToolbarProsemirrorPlugin } from "../extensions/LinkToolbar/LinkToolbarPlugin";
import { SideMenuProsemirrorPlugin } from "../extensions/SideMenu/SideMenuPlugin";
import { SuggestionMenuProseMirrorPlugin } from "../extensions/SuggestionMenu/SuggestionPlugin";
import { TableHandlesProsemirrorPlugin } from "../extensions/TableHandles/TableHandlesPlugin";
import { UniqueID } from "../extensions/UniqueID/UniqueID";
import {
  BlockIdentifier,
  BlockNoteDOMAttributes,
  BlockSchema,
  BlockSpecs,
  InlineContentSchema,
  InlineContentSpecs,
  PartialInlineContent,
  StyleSchema,
  StyleSpecs,
  Styles,
} from "../schema";
import { mergeCSSClasses } from "../util/browser";
import { NoInfer, UnreachableCaseError } from "../util/typescript";

import { getBlockNoteExtensions } from "./BlockNoteExtensions";
import { TextCursorPosition } from "./cursorPositionTypes";

import { Selection } from "./selectionTypes";
import { transformPasted } from "./transformPasted";

import { checkDefaultBlockTypeInSchema } from "../blocks/defaultBlockTypeGuards";
import { BlockNoteSchema } from "./BlockNoteSchema";
import {
  BlockNoteTipTapEditor,
  BlockNoteTipTapEditorOptions,
} from "./BlockNoteTipTapEditor";

import { PlaceholderPlugin } from "../extensions/Placeholder/PlaceholderPlugin";
import { Dictionary } from "../i18n/dictionary";
import { en } from "../i18n/locales";

import { Transaction } from "@tiptap/pm/state";
import { createInternalHTMLSerializer } from "../api/exporters/html/internalHTMLSerializer";
import "../style.css";
import { initializeESMDependencies } from "../util/esmDependencies";

export type BlockNoteEditorOptions<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
> = {
  disableExtensions: string[];
  /**
   * A dictionary object containing translations for the editor.
   */
  dictionary?: Dictionary;

  /**
   * @deprecated, provide placeholders via dictionary instead
   */
  placeholders: Record<string | "default", string>;

  /**
   * An object containing attributes that should be added to HTML elements of the editor.
   *
   * @example { editor: { class: "my-editor-class" } }
   */
  domAttributes: Partial<BlockNoteDOMAttributes>;

  /**
   * The content that should be in the editor when it's created, represented as an array of partial block objects.
   */
  initialContent: PartialBlock<
    NoInfer<BSchema>,
    NoInfer<ISchema>,
    NoInfer<SSchema>
  >[];
  /**
   * Use default BlockNote font and reset the styles of <p> <li> <h1> elements etc., that are used in BlockNote.
   *
   * @default true
   */
  defaultStyles: boolean;

  schema: BlockNoteSchema<BSchema, ISchema, SSchema>;

  /**
   * The `uploadFile` method is what the editor uses when files need to be uploaded (for example when selecting an image to upload).
   * This method should set when creating the editor as this is application-specific.
   *
   * `undefined` means the application doesn't support file uploads.
   *
   * @param file The file that should be uploaded.
   * @returns The URL of the uploaded file OR an object containing props that should be set on the file block (such as an id)
   */
  uploadFile: (file: File) => Promise<string | Record<string, any>>;

  /**
   * Resolve a URL of a file block to one that can be displayed or downloaded. This can be used for creating authenticated URL or
   * implementing custom protocols / schemes
   * @returns The URL that's
   */
  resolveFileUrl: (url: string) => Promise<string>;

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
  _tiptapOptions: Partial<EditorOptions>;

  trailingBlock?: boolean;

  /**
   * Boolean indicating whether the editor is in headless mode.
   * Headless mode means we can use features like importing / exporting blocks,
   * but there's no underlying editor (UI) instantiated.
   *
   * You probably don't need to set this manually, but use the `server-util` package instead that uses this option internally
   */
  _headless: boolean;
};

const blockNoteTipTapOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export class BlockNoteEditor<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
> {
  private readonly _pmSchema: Schema;

  /**
   * Boolean indicating whether the editor is in headless mode.
   * Headless mode means we can use features like importing / exporting blocks,
   * but there's no underlying editor (UI) instantiated.
   *
   * You probably don't need to set this manually, but use the `server-util` package instead that uses this option internally
   */
  public readonly headless: boolean = false;

  public readonly _tiptapEditor:
    | BlockNoteTipTapEditor & {
        contentComponent: any;
      } = undefined as any; // TODO: Type should actually reflect that it can be `undefined` in headless mode

  /**
   * Used by React to store a reference to an `ElementRenderer` helper utility to make sure we can render React elements
   * in the correct context (used by `ReactRenderUtil`)
   */
  public elementRenderer: ((node: any, container: HTMLElement) => void) | null =
    null;

  /**
   * Cache of all blocks. This makes sure we don't have to "recompute" blocks if underlying Prosemirror Nodes haven't changed.
   * This is especially useful when we want to keep track of the same block across multiple operations,
   * with this cache, blocks stay the same object reference (referential equality with ===).
   */
  public blockCache = new WeakMap<Node, Block<any, any, any>>();

  /**
   * The dictionary contains translations for the editor.
   */
  public readonly dictionary: Dictionary;

  /**
   * The schema of the editor. The schema defines which Blocks, InlineContent, and Styles are available in the editor.
   */
  public readonly schema: BlockNoteSchema<BSchema, ISchema, SSchema>;

  public readonly blockImplementations: BlockSpecs;
  public readonly inlineContentImplementations: InlineContentSpecs;
  public readonly styleImplementations: StyleSpecs;

  public readonly formattingToolbar: FormattingToolbarProsemirrorPlugin;
  public readonly linkToolbar: LinkToolbarProsemirrorPlugin<
    BSchema,
    ISchema,
    SSchema
  >;
  public readonly sideMenu: SideMenuProsemirrorPlugin<
    BSchema,
    ISchema,
    SSchema
  >;
  public readonly suggestionMenus: SuggestionMenuProseMirrorPlugin<
    BSchema,
    ISchema,
    SSchema
  >;
  public readonly filePanel?: FilePanelProsemirrorPlugin<ISchema, SSchema>;
  public readonly tableHandles?: TableHandlesProsemirrorPlugin<
    ISchema,
    SSchema
  >;

  /**
   * The `uploadFile` method is what the editor uses when files need to be uploaded (for example when selecting an image to upload).
   * This method should set when creating the editor as this is application-specific.
   *
   * `undefined` means the application doesn't support file uploads.
   *
   * @param file The file that should be uploaded.
   * @returns The URL of the uploaded file OR an object containing props that should be set on the file block (such as an id)
   */
  public readonly uploadFile:
    | ((file: File) => Promise<string | Record<string, any>>)
    | undefined;

  public readonly resolveFileUrl: (url: string) => Promise<string>;

  public get pmSchema() {
    return this._pmSchema;
  }

  public static create<
    BSchema extends BlockSchema = DefaultBlockSchema,
    ISchema extends InlineContentSchema = DefaultInlineContentSchema,
    SSchema extends StyleSchema = DefaultStyleSchema
  >(options: Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>> = {}) {
    return new BlockNoteEditor<BSchema, ISchema, SSchema>(options);
  }

  protected constructor(
    private readonly options: Partial<BlockNoteEditorOptions<any, any, any>>
  ) {
    const anyOpts = options as any;
    if (anyOpts.onEditorContentChange) {
      throw new Error(
        "onEditorContentChange initialization option is deprecated, use <BlockNoteView onChange={...} />, the useEditorChange(...) hook, or editor.onChange(...)"
      );
    }

    if (anyOpts.onTextCursorPositionChange) {
      throw new Error(
        "onTextCursorPositionChange initialization option is deprecated, use <BlockNoteView onSelectionChange={...} />, the useEditorSelectionChange(...) hook, or editor.onSelectionChange(...)"
      );
    }

    if (anyOpts.onEditorReady) {
      throw new Error(
        "onEditorReady is deprecated. Editor is immediately ready for use after creation."
      );
    }

    if (anyOpts.editable) {
      throw new Error(
        "editable initialization option is deprecated, use <BlockNoteView editable={true/false} />, or alternatively editor.isEditable = true/false"
      );
    }

    this.dictionary = options.dictionary || en;

    // apply defaults
    const newOptions = {
      defaultStyles: true,
      schema: options.schema || BlockNoteSchema.create(),
      _headless: false,
      ...options,
      placeholders: {
        ...this.dictionary.placeholders,
        ...options.placeholders,
      },
    };

    // @ts-ignore
    this.schema = newOptions.schema;
    this.blockImplementations = newOptions.schema.blockSpecs;
    this.inlineContentImplementations = newOptions.schema.inlineContentSpecs;
    this.styleImplementations = newOptions.schema.styleSpecs;

    this.formattingToolbar = new FormattingToolbarProsemirrorPlugin(this);
    this.linkToolbar = new LinkToolbarProsemirrorPlugin(this);
    this.sideMenu = new SideMenuProsemirrorPlugin(this);
    this.suggestionMenus = new SuggestionMenuProseMirrorPlugin(this);
    this.filePanel = new FilePanelProsemirrorPlugin(this as any);

    if (checkDefaultBlockTypeInSchema("table", this)) {
      this.tableHandles = new TableHandlesProsemirrorPlugin(this as any);
    }

    const extensions = getBlockNoteExtensions({
      editor: this,
      domAttributes: newOptions.domAttributes || {},
      blockSpecs: this.schema.blockSpecs,
      styleSpecs: this.schema.styleSpecs,
      inlineContentSpecs: this.schema.inlineContentSpecs,
      collaboration: newOptions.collaboration,
      trailingBlock: newOptions.trailingBlock,
      disableExtensions: newOptions.disableExtensions,
    });

    const blockNoteUIExtension = Extension.create({
      name: "BlockNoteUIExtension",

      addProseMirrorPlugins: () => {
        return [
          this.formattingToolbar.plugin,
          this.linkToolbar.plugin,
          this.sideMenu.plugin,
          this.suggestionMenus.plugin,
          ...(this.filePanel ? [this.filePanel.plugin] : []),
          ...(this.tableHandles ? [this.tableHandles.plugin] : []),
          PlaceholderPlugin(this, newOptions.placeholders),
        ];
      },
    });
    extensions.push(blockNoteUIExtension);

    this.uploadFile = newOptions.uploadFile;
    this.resolveFileUrl = newOptions.resolveFileUrl || (async (url) => url);
    this.headless = newOptions._headless;

    if (newOptions.collaboration && newOptions.initialContent) {
      // eslint-disable-next-line no-console
      console.warn(
        "When using Collaboration, initialContent might cause conflicts, because changes should come from the collaboration provider"
      );
    }

    const initialContent =
      newOptions.initialContent ||
      (options.collaboration
        ? [
            {
              type: "paragraph",
              id: "initialBlockId",
            },
          ]
        : [
            {
              type: "paragraph",
              id: UniqueID.options.generateID(),
            },
          ]);

    if (!Array.isArray(initialContent) || initialContent.length === 0) {
      throw new Error(
        "initialContent must be a non-empty array of blocks, received: " +
          initialContent
      );
    }

    const tiptapOptions: BlockNoteTipTapEditorOptions = {
      ...blockNoteTipTapOptions,
      ...newOptions._tiptapOptions,
      content: initialContent,
      extensions: [
        ...(newOptions._tiptapOptions?.extensions || []),
        ...extensions,
      ],
      editorProps: {
        ...newOptions._tiptapOptions?.editorProps,
        attributes: {
          // As of TipTap v2.5.0 the tabIndex is removed when the editor is not
          // editable, so you can't focus it. We want to revert this as we have
          // UI behaviour that relies on it.
          tabIndex: "0",
          ...newOptions._tiptapOptions?.editorProps?.attributes,
          ...newOptions.domAttributes?.editor,
          class: mergeCSSClasses(
            "bn-editor",
            newOptions.defaultStyles ? "bn-default-styles" : "",
            newOptions.domAttributes?.editor?.class || ""
          ),
        },
        transformPasted,
      },
    };

    if (!this.headless) {
      this._tiptapEditor = new BlockNoteTipTapEditor(
        tiptapOptions,
        this.schema.styleSchema
      ) as BlockNoteTipTapEditor & {
        contentComponent: any;
      };
      this._pmSchema = this._tiptapEditor.schema;
    } else {
      // In headless mode, we don't instantiate an underlying TipTap editor,
      // but we still need the schema
      this._pmSchema = getSchema(tiptapOptions.extensions!);
    }
  }

  dispatch(tr: Transaction) {
    this._tiptapEditor.dispatch(tr);
  }

  /**
   * Mount the editor to a parent DOM element. Call mount(undefined) to clean up
   *
   * @warning Not needed to call manually when using React, use BlockNoteView to take care of mounting
   */
  public mount = (parentElement?: HTMLElement | null) => {
    this._tiptapEditor.mount(parentElement);
  };

  public get prosemirrorView() {
    return this._tiptapEditor.view;
  }

  public get domElement() {
    return this._tiptapEditor.view.dom as HTMLDivElement;
  }

  public isFocused() {
    return this._tiptapEditor.view.hasFocus();
  }

  public focus() {
    this._tiptapEditor.view.focus();
  }

  /**
   * @deprecated, use `editor.document` instead
   */
  public get topLevelBlocks(): Block<BSchema, ISchema, SSchema>[] {
    return this.document;
  }

  /**
   * Gets a snapshot of all top-level (non-nested) blocks in the editor.
   * @returns A snapshot of all top-level (non-nested) blocks in the editor.
   */
  public get document(): Block<BSchema, ISchema, SSchema>[] {
    const blocks: Block<BSchema, ISchema, SSchema>[] = [];

    this._tiptapEditor.state.doc.firstChild!.descendants((node) => {
      blocks.push(
        nodeToBlock(
          node,
          this.schema.blockSchema,
          this.schema.inlineContentSchema,
          this.schema.styleSchema,
          this.blockCache
        )
      );

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
  ): Block<BSchema, ISchema, SSchema> | undefined {
    const id =
      typeof blockIdentifier === "string"
        ? blockIdentifier
        : blockIdentifier.id;
    let newBlock: Block<BSchema, ISchema, SSchema> | undefined = undefined;

    this._tiptapEditor.state.doc.firstChild!.descendants((node) => {
      if (typeof newBlock !== "undefined") {
        return false;
      }

      if (node.type.name !== "blockContainer" || node.attrs.id !== id) {
        return true;
      }

      newBlock = nodeToBlock(
        node,
        this.schema.blockSchema,
        this.schema.inlineContentSchema,
        this.schema.styleSchema,
        this.blockCache
      );

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
    callback: (block: Block<BSchema, ISchema, SSchema>) => boolean,
    reverse = false
  ): void {
    const blocks = this.document.slice();

    if (reverse) {
      blocks.reverse();
    }

    function traverseBlockArray(
      blockArray: Block<BSchema, ISchema, SSchema>[]
    ): boolean {
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
   * Executes a callback whenever the editor's selection changes.
   * @param callback The callback to execute.
   */
  public onEditorSelectionChange(callback: () => void) {
    this._tiptapEditor.on("selectionUpdate", callback);
  }

  /**
   * Gets a snapshot of the current text cursor position.
   * @returns A snapshot of the current text cursor position.
   */
  public getTextCursorPosition(): TextCursorPosition<
    BSchema,
    ISchema,
    SSchema
  > {
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
      block: nodeToBlock(
        node,
        this.schema.blockSchema,
        this.schema.inlineContentSchema,
        this.schema.styleSchema,
        this.blockCache
      ),
      prevBlock:
        prevNode === undefined
          ? undefined
          : nodeToBlock(
              prevNode,
              this.schema.blockSchema,
              this.schema.inlineContentSchema,
              this.schema.styleSchema,
              this.blockCache
            ),
      nextBlock:
        nextNode === undefined
          ? undefined
          : nodeToBlock(
              nextNode,
              this.schema.blockSchema,
              this.schema.inlineContentSchema,
              this.schema.styleSchema,
              this.blockCache
            ),
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

    const contentType: "none" | "inline" | "table" =
      this.schema.blockSchema[contentNode.type.name]!.content;

    if (contentType === "none") {
      this._tiptapEditor.commands.setNodeSelection(startPos);
      return;
    }

    if (contentType === "inline") {
      if (placement === "start") {
        this._tiptapEditor.commands.setTextSelection(startPos + 1);
      } else {
        this._tiptapEditor.commands.setTextSelection(
          startPos + contentNode.nodeSize - 1
        );
      }
    } else if (contentType === "table") {
      if (placement === "start") {
        // Need to offset the position as we have to get through the `tableRow`
        // and `tableCell` nodes to get to the `tableParagraph` node we want to
        // set the selection in.
        this._tiptapEditor.commands.setTextSelection(startPos + 4);
      } else {
        this._tiptapEditor.commands.setTextSelection(
          startPos + contentNode.nodeSize - 4
        );
      }
    } else {
      throw new UnreachableCaseError(contentType);
    }
  }

  /**
   * Gets a snapshot of the current selection.
   */
  public getSelection(): Selection<BSchema, ISchema, SSchema> | undefined {
    // Either the TipTap selection is empty, or it's a node selection. In either
    // case, it only spans one block, so we return undefined.
    if (
      this._tiptapEditor.state.selection.from ===
        this._tiptapEditor.state.selection.to ||
      "node" in this._tiptapEditor.state.selection
    ) {
      return undefined;
    }

    const blocks: Block<BSchema, ISchema, SSchema>[] = [];

    // TODO: This adds all child blocks to the same array. Needs to find min
    //  depth and only add blocks at that depth.
    this._tiptapEditor.state.doc.descendants((node, pos) => {
      if (node.type.spec.group !== "blockContent") {
        return true;
      }

      // Fixed the block pos and size
      // all block is wrapped with a blockContent wrapper
      // and blockContent wrapper pos = inner block pos - 1
      // blockContent wrapper end = inner block pos + nodeSize + 1
      // need to add 1 to start and -1 to end
      const end = pos + node.nodeSize - 1;
      const start = pos + 1;
      if (
        end <= this._tiptapEditor.state.selection.from ||
        start >= this._tiptapEditor.state.selection.to
      ) {
        return true;
      }

      blocks.push(
        nodeToBlock(
          this._tiptapEditor.state.doc.resolve(pos).node(),
          this.schema.blockSchema,
          this.schema.inlineContentSchema,
          this.schema.styleSchema,
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
    if (!this._tiptapEditor) {
      if (!this.headless) {
        throw new Error("no editor, but also not headless?");
      }
      return false;
    }
    return this._tiptapEditor.isEditable === undefined
      ? true
      : this._tiptapEditor.isEditable;
  }

  /**
   * Makes the editor editable or locks it, depending on the argument passed.
   * @param editable True to make the editor editable, or false to lock it.
   */
  public set isEditable(editable: boolean) {
    if (!this._tiptapEditor) {
      if (!this.headless) {
        throw new Error("no editor, but also not headless?");
      }
      // not relevant on headless
      return;
    }
    if (this._tiptapEditor.options.editable !== editable) {
      this._tiptapEditor.setEditable(editable);
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
    blocksToInsert: PartialBlock<BSchema, ISchema, SSchema>[],
    referenceBlock: BlockIdentifier,
    placement: "before" | "after" | "nested" = "before"
  ) {
    return insertBlocks(blocksToInsert, referenceBlock, placement, this);
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
    update: PartialBlock<BSchema, ISchema, SSchema>
  ) {
    return updateBlock(blockToUpdate, update, this);
  }

  /**
   * Removes existing blocks from the editor. Throws an error if any of the blocks could not be found.
   * @param blocksToRemove An array of identifiers for existing blocks that should be removed.
   */
  public removeBlocks(blocksToRemove: BlockIdentifier[]) {
    return removeBlocks(blocksToRemove, this);
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
    blocksToInsert: PartialBlock<BSchema, ISchema, SSchema>[]
  ) {
    return replaceBlocks(blocksToRemove, blocksToInsert, this);
  }

  /**
   * Insert a piece of content at the current cursor position.
   *
   * @param content can be a string, or array of partial inline content elements
   */
  public insertInlineContent(content: PartialInlineContent<ISchema, SSchema>) {
    const nodes = inlineContentToNodes(
      content,
      this.pmSchema,
      this.schema.styleSchema
    );

    insertContentAt(
      {
        from: this._tiptapEditor.state.selection.from,
        to: this._tiptapEditor.state.selection.to,
      },
      nodes,
      this
    );
  }

  /**
   * Gets the active text styles at the text cursor position or at the end of the current selection if it's active.
   */
  public getActiveStyles() {
    const styles: Styles<SSchema> = {};
    const marks = this._tiptapEditor.state.selection.$to.marks();

    for (const mark of marks) {
      const config = this.schema.styleSchema[mark.type.name];
      if (!config) {
        if (mark.type.name !== "link") {
          // eslint-disable-next-line no-console
          console.warn("mark not found in styleschema", mark.type.name);
        }

        continue;
      }
      if (config.propSchema === "boolean") {
        (styles as any)[config.type] = true;
      } else {
        (styles as any)[config.type] = mark.attrs.stringValue;
      }
    }

    return styles;
  }

  /**
   * Adds styles to the currently selected content.
   * @param styles The styles to add.
   */
  public addStyles(styles: Styles<SSchema>) {
    for (const [style, value] of Object.entries(styles)) {
      const config = this.schema.styleSchema[style];
      if (!config) {
        throw new Error(`style ${style} not found in styleSchema`);
      }
      if (config.propSchema === "boolean") {
        this._tiptapEditor.commands.setMark(style);
      } else if (config.propSchema === "string") {
        this._tiptapEditor.commands.setMark(style, { stringValue: value });
      } else {
        throw new UnreachableCaseError(config.propSchema);
      }
    }
  }

  /**
   * Removes styles from the currently selected content.
   * @param styles The styles to remove.
   */
  public removeStyles(styles: Styles<SSchema>) {
    for (const style of Object.keys(styles)) {
      this._tiptapEditor.commands.unsetMark(style);
    }
  }

  /**
   * Toggles styles on the currently selected content.
   * @param styles The styles to toggle.
   */
  public toggleStyles(styles: Styles<SSchema>) {
    for (const [style, value] of Object.entries(styles)) {
      const config = this.schema.styleSchema[style];
      if (!config) {
        throw new Error(`style ${style} not found in styleSchema`);
      }
      if (config.propSchema === "boolean") {
        this._tiptapEditor.commands.toggleMark(style);
      } else if (config.propSchema === "string") {
        this._tiptapEditor.commands.toggleMark(style, { stringValue: value });
      } else {
        throw new UnreachableCaseError(config.propSchema);
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

    const { from, to } = this._tiptapEditor.state.selection;

    if (!text) {
      text = this._tiptapEditor.state.doc.textBetween(from, to);
    }

    const mark = this.pmSchema.mark("link", { href: url });

    this.dispatch(
      this._tiptapEditor.state.tr
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
   * Exports blocks into a simplified HTML string. To better conform to HTML standards, children of blocks which aren't list
   * items are un-nested in the output HTML.
   *
   * @param blocks An array of blocks that should be serialized into HTML.
   * @returns The blocks, serialized as an HTML string.
   */
  public async blocksToHTMLLossy(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[] = this.document
  ): Promise<string> {
    await initializeESMDependencies();
    const exporter = createExternalHTMLExporter(this.pmSchema, this);
    return exporter.exportBlocks(blocks, {});
  }

  /**
   * Serializes blocks into an HTML string in the format that would normally be rendered by the editor.
   *
   * Use this method if you want to server-side render HTML (for example, a blog post that has been edited in BlockNote)
   * and serve it to users without loading the editor on the client (i.e.: displaying the blog post)
   *
   * @param blocks An array of blocks that should be serialized into HTML.
   * @returns The blocks, serialized as an HTML string.
   */
  public async blocksToFullHTML(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[]
  ): Promise<string> {
    const exporter = createInternalHTMLSerializer(this.pmSchema, this);
    return exporter.serializeBlocks(blocks, {});
  }
  /**
   * Parses blocks from an HTML string. Tries to create `Block` objects out of any HTML block-level elements, and
   * `InlineNode` objects from any HTML inline elements, though not all element types are recognized. If BlockNote
   * doesn't recognize an HTML element's tag, it will parse it as a paragraph or plain text.
   * @param html The HTML string to parse blocks from.
   * @returns The blocks parsed from the HTML string.
   */
  public async tryParseHTMLToBlocks(
    html: string
  ): Promise<Block<BSchema, ISchema, SSchema>[]> {
    return HTMLToBlocks(
      html,
      this.schema.blockSchema,
      this.schema.inlineContentSchema,
      this.schema.styleSchema,
      this.pmSchema
    );
  }

  /**
   * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
   * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
   * @param blocks An array of blocks that should be serialized into Markdown.
   * @returns The blocks, serialized as a Markdown string.
   */
  public async blocksToMarkdownLossy(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[] = this.document
  ): Promise<string> {
    return blocksToMarkdown(blocks, this.pmSchema, this, {});
  }

  /**
   * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
   * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
   * as text.
   * @param markdown The Markdown string to parse blocks from.
   * @returns The blocks parsed from the Markdown string.
   */
  public async tryParseMarkdownToBlocks(
    markdown: string
  ): Promise<Block<BSchema, ISchema, SSchema>[]> {
    return markdownToBlocks(
      markdown,
      this.schema.blockSchema,
      this.schema.inlineContentSchema,
      this.schema.styleSchema,
      this.pmSchema
    );
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

  /**
   * A callback function that runs whenever the editor's contents change.
   *
   * @param callback The callback to execute.
   * @returns A function to remove the callback.
   */
  public onChange(
    callback: (editor: BlockNoteEditor<BSchema, ISchema, SSchema>) => void
  ) {
    if (this.headless) {
      // Note: would be nice if this is possible in headless mode as well
      return;
    }

    const cb = () => {
      callback(this);
    };

    this._tiptapEditor.on("update", cb);

    return () => {
      this._tiptapEditor.off("update", cb);
    };
  }

  /**
   * A callback function that runs whenever the text cursor position or selection changes.
   *
   * @param callback The callback to execute.
   * @returns A function to remove the callback.
   */
  public onSelectionChange(
    callback: (editor: BlockNoteEditor<BSchema, ISchema, SSchema>) => void
  ) {
    if (this.headless) {
      return;
    }

    const cb = () => {
      callback(this);
    };

    this._tiptapEditor.on("selectionUpdate", cb);

    return () => {
      this._tiptapEditor.off("selectionUpdate", cb);
    };
  }

  public openSuggestionMenu(
    triggerCharacter: string,
    pluginState?: {
      deleteTriggerCharacter?: boolean;
      ignoreQueryLength?: boolean;
    }
  ) {
    const tr = this.prosemirrorView.state.tr;
    const transaction =
      pluginState && pluginState.deleteTriggerCharacter
        ? tr.insertText(triggerCharacter)
        : tr;

    this.prosemirrorView.focus();
    this.prosemirrorView.dispatch(
      transaction.scrollIntoView().setMeta(this.suggestionMenus.plugin, {
        triggerCharacter: triggerCharacter,
        deleteTriggerCharacter: pluginState?.deleteTriggerCharacter || false,
        ignoreQueryLength: pluginState?.ignoreQueryLength || false,
      })
    );
  }
}
