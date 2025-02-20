import {
  AnyExtension,
  EditorOptions,
  Extension,
  getSchema,
  Mark,
  Node as TipTapNode,
} from "@tiptap/core";
import { Node, Schema } from "prosemirror-model";
// import "./blocknote.css";
import * as Y from "yjs";
import { insertBlocks } from "../api/blockManipulation/commands/insertBlocks/insertBlocks.js";
import {
  moveBlocksDown,
  moveBlocksUp,
} from "../api/blockManipulation/commands/moveBlocks/moveBlocks.js";
import {
  canNestBlock,
  canUnnestBlock,
  nestBlock,
  unnestBlock,
} from "../api/blockManipulation/commands/nestBlock/nestBlock.js";
import { removeBlocks } from "../api/blockManipulation/commands/removeBlocks/removeBlocks.js";
import { replaceBlocks } from "../api/blockManipulation/commands/replaceBlocks/replaceBlocks.js";
import { updateBlock } from "../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
  getBlock,
  getNextBlock,
  getParentBlock,
  getPrevBlock,
} from "../api/blockManipulation/getBlock/getBlock.js";
import { insertContentAt } from "../api/blockManipulation/insertContentAt.js";
import {
  getSelection,
  setSelection,
} from "../api/blockManipulation/selections/selection.js";
import {
  getTextCursorPosition,
  setTextCursorPosition,
} from "../api/blockManipulation/selections/textCursorPosition/textCursorPosition.js";
import { createExternalHTMLExporter } from "../api/exporters/html/externalHTMLExporter.js";
import { blocksToMarkdown } from "../api/exporters/markdown/markdownExporter.js";
import { HTMLToBlocks } from "../api/parsers/html/parseHTML.js";
import { markdownToBlocks } from "../api/parsers/markdown/parseMarkdown.js";
import {
  Block,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "../blocks/defaultBlocks.js";
import { FilePanelProsemirrorPlugin } from "../extensions/FilePanel/FilePanelPlugin.js";
import { FormattingToolbarProsemirrorPlugin } from "../extensions/FormattingToolbar/FormattingToolbarPlugin.js";
import { LinkToolbarProsemirrorPlugin } from "../extensions/LinkToolbar/LinkToolbarPlugin.js";
import { SideMenuProsemirrorPlugin } from "../extensions/SideMenu/SideMenuPlugin.js";
import { SuggestionMenuProseMirrorPlugin } from "../extensions/SuggestionMenu/SuggestionPlugin.js";
import { TableHandlesProsemirrorPlugin } from "../extensions/TableHandles/TableHandlesPlugin.js";
import { UniqueID } from "../extensions/UniqueID/UniqueID.js";
import {
  BlockIdentifier,
  BlockNoteDOMAttributes,
  BlockSchema,
  BlockSpecs,
  InlineContentSchema,
  InlineContentSpecs,
  PartialInlineContent,
  Styles,
  StyleSchema,
  StyleSpecs,
} from "../schema/index.js";
import { mergeCSSClasses } from "../util/browser.js";
import { NoInfer, UnreachableCaseError } from "../util/typescript.js";

import { getBlockNoteExtensions } from "./BlockNoteExtensions.js";
import { TextCursorPosition } from "./cursorPositionTypes.js";

import { Selection } from "./selectionTypes.js";
import { transformPasted } from "./transformPasted.js";

import { checkDefaultBlockTypeInSchema } from "../blocks/defaultBlockTypeGuards.js";
import { BlockNoteSchema } from "./BlockNoteSchema.js";
import {
  BlockNoteTipTapEditor,
  BlockNoteTipTapEditorOptions,
} from "./BlockNoteTipTapEditor.js";

import { Dictionary } from "../i18n/dictionary.js";
import { en } from "../i18n/locales/index.js";

import { Plugin, Transaction } from "@tiptap/pm/state";
import { dropCursor } from "prosemirror-dropcursor";
import { EditorView } from "prosemirror-view";
import { createInternalHTMLSerializer } from "../api/exporters/html/internalHTMLSerializer.js";
import { inlineContentToNodes } from "../api/nodeConversions/blockToNode.js";
import { nodeToBlock } from "../api/nodeConversions/nodeToBlock.js";
import "../style.css";

export type BlockNoteExtensionFactory = (
  editor: BlockNoteEditor<any, any, any>
) => BlockNoteExtension;

export type BlockNoteExtension =
  | AnyExtension
  | {
      plugin: Plugin;
    };

export type BlockNoteEditorOptions<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
> = {
  /**
   * Whether changes to blocks (like indentation, creating lists, changing headings) should be animated or not. Defaults to `true`.
   *
   * @default true
   */
  animations?: boolean;

  /**
   * Disable internal extensions (based on keys / extension name)
   */
  disableExtensions: string[];

  /**
   * A dictionary object containing translations for the editor.
   */
  dictionary?: Dictionary & Record<string, any>;

  /**
   * @deprecated, provide placeholders via dictionary instead
   */
  placeholders: Record<
    string | "default" | "emptyDocument",
    string | undefined
  >;

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
  uploadFile: (
    file: File,
    blockId?: string
  ) => Promise<string | Record<string, any>>;

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
    /**
     * Optional flag to set when the user label should be shown with the default
     * collaboration cursor. Setting to "always" will always show the label,
     * while "activity" will only show the label when the user moves the cursor
     * or types. Defaults to "activity".
     */
    showCursorLabels?: "always" | "activity";
  };

  /**
   * additional tiptap options, undocumented
   */
  _tiptapOptions: Partial<EditorOptions>;

  /**
   * (experimental) add extra prosemirror plugins or tiptap extensions to the editor
   */
  _extensions: Record<string, BlockNoteExtension | BlockNoteExtensionFactory>;

  trailingBlock?: boolean;

  /**
   * Boolean indicating whether the editor is in headless mode.
   * Headless mode means we can use features like importing / exporting blocks,
   * but there's no underlying editor (UI) instantiated.
   *
   * You probably don't need to set this manually, but use the `server-util` package instead that uses this option internally
   */
  _headless: boolean;

  /**
   * A flag indicating whether to set an HTML ID for every block
   *
   * When set to `true`, on each block an id attribute will be set with the block id
   * Otherwise, the HTML ID attribute will not be set.
   *
   * (note that the id is always set on the `data-id` attribute)
   */
  setIdAttribute?: boolean;

  dropCursor?: (opts: any) => Plugin;

  /**
   Select desired behavior when pressing `Tab` (or `Shift-Tab`). Specifically,
   what should happen when a user has selected multiple blocks while a toolbar
   is open:
   - `"prefer-navigate-ui"`: Change focus to the toolbar. The user needs to
   first press `Escape` to close the toolbar, and can then indent multiple
   blocks. Better for keyboard accessibility.
   - `"prefer-indent"`: Regardless of whether toolbars are open, indent the
   selection of blocks. In this case, it's not possible to navigate toolbars
   with the keyboard.

   @default "prefer-navigate-ui"
   */
  tabBehavior: "prefer-navigate-ui" | "prefer-indent";

  /**
   * The detection mode for showing the side menu - "viewport" always shows the
   * side menu for the block next to the mouse cursor, while "editor" only shows
   * it when hovering the editor or the side menu itself.
   *
   * @default "viewport"
   */
  sideMenuDetection: "viewport" | "editor";
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
   * extensions that are added to the editor, can be tiptap extensions or prosemirror plugins
   */
  public readonly extensions: Record<string, BlockNoteExtension> = {};

  /**
   * Boolean indicating whether the editor is in headless mode.
   * Headless mode means we can use features like importing / exporting blocks,
   * but there's no underlying editor (UI) instantiated.
   *
   * You probably don't need to set this manually, but use the `server-util` package instead that uses this option internally
   */
  public readonly headless: boolean = false;

  public readonly _tiptapEditor:
    | Omit<BlockNoteTipTapEditor, "view"> & {
        view: EditorView | undefined;
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
  public readonly dictionary: Dictionary & Record<string, any>;

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
    | ((file: File, blockId?: string) => Promise<string | Record<string, any>>)
    | undefined;

  private onUploadStartCallbacks: ((blockId?: string) => void)[] = [];
  private onUploadEndCallbacks: ((blockId?: string) => void)[] = [];

  public readonly resolveFileUrl?: (url: string) => Promise<string>;

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
    protected readonly options: Partial<BlockNoteEditorOptions<any, any, any>>
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

    this.extensions = getBlockNoteExtensions({
      editor: this,
      domAttributes: newOptions.domAttributes || {},
      blockSpecs: this.schema.blockSpecs,
      styleSpecs: this.schema.styleSpecs,
      inlineContentSpecs: this.schema.inlineContentSpecs,
      collaboration: newOptions.collaboration,
      trailingBlock: newOptions.trailingBlock,
      disableExtensions: newOptions.disableExtensions,
      setIdAttribute: newOptions.setIdAttribute,
      animations: newOptions.animations ?? true,
      tableHandles: checkDefaultBlockTypeInSchema("table", this),
      dropCursor: this.options.dropCursor ?? dropCursor,
      placeholders: newOptions.placeholders,
      tabBehavior: newOptions.tabBehavior,
      sideMenuDetection: newOptions.sideMenuDetection || "viewport",
    });

    // add extensions from _tiptapOptions
    (newOptions._tiptapOptions?.extensions || []).forEach((ext) => {
      this.extensions[ext.name] = ext;
    });

    // add extensions from options
    Object.entries(newOptions._extensions || {}).forEach(([key, ext]) => {
      if (typeof ext === "function") {
        // factory
        ext = ext(this);
      }
      this.extensions[key] = ext;
    });

    this.formattingToolbar = this.extensions["formattingToolbar"] as any;
    this.linkToolbar = this.extensions["linkToolbar"] as any;
    this.sideMenu = this.extensions["sideMenu"] as any;
    this.suggestionMenus = this.extensions["suggestionMenus"] as any;
    this.filePanel = this.extensions["filePanel"] as any;
    this.tableHandles = this.extensions["tableHandles"] as any;

    if (newOptions.uploadFile) {
      const uploadFile = newOptions.uploadFile;
      this.uploadFile = async (file, block) => {
        this.onUploadStartCallbacks.forEach((callback) =>
          callback.apply(this, [block])
        );
        try {
          return await uploadFile(file, block);
        } finally {
          this.onUploadEndCallbacks.forEach((callback) =>
            callback.apply(this, [block])
          );
        }
      };
    }

    this.resolveFileUrl = newOptions.resolveFileUrl;
    this.headless = newOptions._headless;

    const collaborationEnabled =
      "collaboration" in this.extensions ||
      "liveblocksExtension" in this.extensions;

    if (collaborationEnabled && newOptions.initialContent) {
      // eslint-disable-next-line no-console
      console.warn(
        "When using Collaboration, initialContent might cause conflicts, because changes should come from the collaboration provider"
      );
    }

    const initialContent =
      newOptions.initialContent ||
      (collaborationEnabled
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

    const tiptapExtensions = [
      ...Object.entries(this.extensions).map(([key, ext]) => {
        if (
          ext instanceof Extension ||
          ext instanceof TipTapNode ||
          ext instanceof Mark
        ) {
          // tiptap extension
          return ext;
        }

        if (!ext.plugin) {
          throw new Error(
            "Extension should either be a TipTap extension or a ProseMirror plugin in a plugin property"
          );
        }

        // "blocknote" extensions (prosemirror plugins)
        return Extension.create({
          name: key,
          addProseMirrorPlugins: () => [ext.plugin],
        });
      }),
    ];
    const tiptapOptions: BlockNoteTipTapEditorOptions = {
      ...blockNoteTipTapOptions,
      ...newOptions._tiptapOptions,
      content: initialContent,
      extensions: tiptapExtensions,
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
      this._tiptapEditor = BlockNoteTipTapEditor.create(
        tiptapOptions,
        this.schema.styleSchema
      ) as BlockNoteTipTapEditor & {
        view: any;
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
  public mount = (
    parentElement?: HTMLElement | null,
    contentComponent?: any
  ) => {
    this._tiptapEditor.mount(parentElement, contentComponent);
  };

  public get prosemirrorView() {
    return this._tiptapEditor.view;
  }

  public get domElement() {
    return this.prosemirrorView?.dom as HTMLDivElement | undefined;
  }

  public isFocused() {
    return this.prosemirrorView?.hasFocus() || false;
  }

  public focus() {
    this.prosemirrorView?.focus();
  }

  public onUploadStart(callback: (blockId?: string) => void) {
    this.onUploadStartCallbacks.push(callback);

    return () => {
      const index = this.onUploadStartCallbacks.indexOf(callback);
      if (index > -1) {
        this.onUploadStartCallbacks.splice(index, 1);
      }
    };
  }

  public onUploadEnd(callback: (blockId?: string) => void) {
    this.onUploadEndCallbacks.push(callback);

    return () => {
      const index = this.onUploadEndCallbacks.indexOf(callback);
      if (index > -1) {
        this.onUploadEndCallbacks.splice(index, 1);
      }
    };
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
   * @param blockIdentifier The identifier of an existing block that should be
   * retrieved.
   * @returns The block that matches the identifier, or `undefined` if no
   * matching block was found.
   */
  public getBlock(
    blockIdentifier: BlockIdentifier
  ): Block<BSchema, ISchema, SSchema> | undefined {
    return getBlock(this, blockIdentifier);
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
    blockIdentifier: BlockIdentifier
  ): Block<BSchema, ISchema, SSchema> | undefined {
    return getPrevBlock(this, blockIdentifier);
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
    blockIdentifier: BlockIdentifier
  ): Block<BSchema, ISchema, SSchema> | undefined {
    return getNextBlock(this, blockIdentifier);
  }

  /**
   * Gets a snapshot of the parent of an existing block from the editor.
   * @param blockIdentifier The identifier of an existing block for which the
   * parent should be retrieved.
   * @returns The parent of the block that matches the identifier. `undefined`
   * if no matching block was found, or the block isn't nested.
   */
  public getParentBlock(
    blockIdentifier: BlockIdentifier
  ): Block<BSchema, ISchema, SSchema> | undefined {
    return getParentBlock(this, blockIdentifier);
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
    return getTextCursorPosition(this);
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
    setTextCursorPosition(this, targetBlock, placement);
  }

  /**
   * Gets a snapshot of the current selection.
   */
  public getSelection(): Selection<BSchema, ISchema, SSchema> | undefined {
    return getSelection(this);
  }

  public setSelection(startBlock: BlockIdentifier, endBlock: BlockIdentifier) {
    setSelection(this, startBlock, endBlock);
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
   * `referenceBlock`.
   */
  public insertBlocks(
    blocksToInsert: PartialBlock<BSchema, ISchema, SSchema>[],
    referenceBlock: BlockIdentifier,
    placement: "before" | "after" = "before"
  ) {
    return insertBlocks(this, blocksToInsert, referenceBlock, placement);
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
    return updateBlock(this, blockToUpdate, update);
  }

  /**
   * Removes existing blocks from the editor. Throws an error if any of the blocks could not be found.
   * @param blocksToRemove An array of identifiers for existing blocks that should be removed.
   */
  public removeBlocks(blocksToRemove: BlockIdentifier[]) {
    return removeBlocks(this, blocksToRemove);
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
    return replaceBlocks(this, blocksToRemove, blocksToInsert);
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
        if (
          // Links are not considered styles in blocknote
          mark.type.name !== "link" &&
          // "blocknoteIgnore" tagged marks (such as comments) are also not considered BlockNote "styles"
          !mark.type.spec.blocknoteIgnore
        ) {
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
    return canNestBlock(this);
  }

  /**
   * Nests the block containing the text cursor into the block above it.
   */
  public nestBlock() {
    nestBlock(this);
  }

  /**
   * Checks if the block containing the text cursor is nested.
   */
  public canUnnestBlock() {
    return canUnnestBlock(this);
  }

  /**
   * Lifts the block containing the text cursor out of its parent.
   */
  public unnestBlock() {
    unnestBlock(this);
  }

  /**
   * Moves the selected blocks up. If the previous block has children, moves
   * them to the end of its children. If there is no previous block, but the
   * current blocks share a common parent, moves them out of & before it.
   */
  public moveBlocksUp() {
    moveBlocksUp(this);
  }

  /**
   * Moves the selected blocks down. If the next block has children, moves
   * them to the start of its children. If there is no next block, but the
   * current blocks share a common parent, moves them out of & after it.
   */
  public moveBlocksDown() {
    moveBlocksDown(this);
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
    const tr = this.prosemirrorView?.state.tr;
    if (!tr) {
      return;
    }

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
