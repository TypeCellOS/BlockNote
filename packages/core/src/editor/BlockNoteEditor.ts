import {
  AnyExtension,
  createDocument,
  EditorOptions,
  Extension,
  FocusPosition,
  getSchema,
  InputRule,
  Mark,
  Editor as TiptapEditor,
  Node as TipTapNode,
} from "@tiptap/core";
import { type Command, type Plugin, type Transaction } from "@tiptap/pm/state";
import { dropCursor } from "prosemirror-dropcursor";
import { Node, Schema } from "prosemirror-model";
import * as Y from "yjs";

import type { BlocksChanged } from "../api/getBlocksChangedByTransaction.js";
import { editorHasBlockWithType } from "../blocks/defaultBlockTypeGuards.js";
import {
  Block,
  BlockNoteSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "../blocks/index.js";
import type { ThreadStore, User } from "../comments/index.js";
import type { CommentsPlugin } from "../extensions/Comments/CommentsPlugin.js";
import type { FilePanelProsemirrorPlugin } from "../extensions/FilePanel/FilePanelPlugin.js";
import type { FormattingToolbarProsemirrorPlugin } from "../extensions/FormattingToolbar/FormattingToolbarPlugin.js";
import type { LinkToolbarProsemirrorPlugin } from "../extensions/LinkToolbar/LinkToolbarPlugin.js";
import type { ShowSelectionPlugin } from "../extensions/ShowSelection/ShowSelectionPlugin.js";
import type { SideMenuProsemirrorPlugin } from "../extensions/SideMenu/SideMenuPlugin.js";
import type { SuggestionMenuProseMirrorPlugin } from "../extensions/SuggestionMenu/SuggestionPlugin.js";
import type { TableHandlesProsemirrorPlugin } from "../extensions/TableHandles/TableHandlesPlugin.js";
import { UniqueID } from "../extensions/UniqueID/UniqueID.js";
import type { Dictionary } from "../i18n/dictionary.js";
import { en } from "../i18n/locales/index.js";
import type {
  BlockIdentifier,
  BlockNoteDOMAttributes,
  BlockSchema,
  BlockSpecs,
  CustomBlockNoteSchema,
  InlineContentSchema,
  InlineContentSpecs,
  PartialInlineContent,
  Styles,
  StyleSchema,
  StyleSpecs,
} from "../schema/index.js";
import { mergeCSSClasses } from "../util/browser.js";
import { EventEmitter } from "../util/EventEmitter.js";
import type { NoInfer } from "../util/typescript.js";
import { BlockNoteExtension } from "./BlockNoteExtension.js";
import { getBlockNoteExtensions } from "./BlockNoteExtensions.js";
import type { TextCursorPosition } from "./cursorPositionTypes.js";
import {
  BlockManager,
  CollaborationManager,
  type CollaborationOptions,
  EventManager,
  ExportManager,
  ExtensionManager,
  SelectionManager,
  StateManager,
  StyleManager,
} from "./managers/index.js";
import type { Selection } from "./selectionTypes.js";
import { transformPasted } from "./transformPasted.js";

import { updateBlockTr } from "../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../api/getBlockInfoFromPos.js";
import { blockToNode } from "../api/nodeConversions/blockToNode.js";
import "../style.css";

/**
 * A factory function that returns a BlockNoteExtension
 * This is useful so we can create extensions that require an editor instance
 * in the constructor
 */
export type BlockNoteExtensionFactory = (
  editor: BlockNoteEditor<any, any, any>,
) => BlockNoteExtension;

/**
 * We support Tiptap extensions and BlockNoteExtension based extensions
 */
export type SupportedExtension = AnyExtension | BlockNoteExtension;

export type BlockCache<
  BSchema extends BlockSchema = any,
  ISchema extends InlineContentSchema = any,
  SSchema extends StyleSchema = any,
> = WeakMap<Node, Block<BSchema, ISchema, SSchema>>;

export type BlockNoteEditorOptions<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
> = {
  /**
   * Whether changes to blocks (like indentation, creating lists, changing headings) should be animated or not. Defaults to `true`.
   *
   * @default true
   */
  animations?: boolean;

  /**
   * Whether the editor should be focused automatically when it's created.
   *
   * @default false
   */
  autofocus?: FocusPosition;

  /**
   * When enabled, allows for collaboration between multiple users.
   * See [Real-time Collaboration](https://www.blocknotejs.org/docs/advanced/real-time-collaboration) for more info.
   *
   * @remarks `CollaborationOptions`
   */
  collaboration?: {
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
   * Configuration for the comments feature, requires a `threadStore`.
   *
   * See [Comments](https://www.blocknotejs.org/docs/features/collaboration/comments) for more info.
   * @remarks `CommentsOptions`
   */
  comments?: {
    schema?: BlockNoteSchema<any, any, any>;
    threadStore: ThreadStore;
  };

  /**
   * Use default BlockNote font and reset the styles of <p> <li> <h1> elements etc., that are used in BlockNote.
   *
   * @default true
   */
  defaultStyles?: boolean;

  /**
   * A dictionary object containing translations for the editor.
   *
   * See [Localization / i18n](https://www.blocknotejs.org/docs/advanced/localization) for more info.
   *
   * @remarks `Dictionary` is a type that contains all the translations for the editor.
   */
  dictionary?: Dictionary & Record<string, any>;

  /**
   * Disable internal extensions (based on keys / extension name)
   *
   * @note Advanced
   */
  disableExtensions?: string[];

  /**
   * An object containing attributes that should be added to HTML elements of the editor.
   *
   * See [Adding DOM Attributes](https://www.blocknotejs.org/docs/theming#adding-dom-attributes) for more info.
   *
   * @example { editor: { class: "my-editor-class" } }
   * @remarks `Record<string, Record<string, string>>`
   */
  domAttributes?: Partial<BlockNoteDOMAttributes>;

  /**
   * A replacement indicator to use when dragging and dropping blocks. Uses the [ProseMirror drop cursor](https://github.com/ProseMirror/prosemirror-dropcursor), or a modified version when [Column Blocks](https://www.blocknotejs.org/docs/document-structure#column-blocks) are enabled.
   * @remarks `() => Plugin`
   */
  dropCursor?: (opts: {
    editor: BlockNoteEditor<
      NoInfer<BSchema>,
      NoInfer<ISchema>,
      NoInfer<SSchema>
    >;
    color?: string | false;
    width?: number;
    class?: string;
  }) => Plugin;

  /**
   * The content that should be in the editor when it's created, represented as an array of {@link PartialBlock} objects.
   *
   * See [Partial Blocks](https://www.blocknotejs.org/docs/editor-api/manipulating-blocks#partial-blocks) for more info.
   *
   * @remarks `PartialBlock[]`
   */
  initialContent?: PartialBlock<
    NoInfer<BSchema>,
    NoInfer<ISchema>,
    NoInfer<SSchema>
  >[];

  /**
   * @deprecated, provide placeholders via dictionary instead
   * @internal
   */
  placeholders?: Record<
    string | "default" | "emptyDocument",
    string | undefined
  >;

  /**
   * Custom paste handler that can be used to override the default paste behavior.
   *
   * See [Paste Handling](https://www.blocknotejs.org/docs/advanced/paste-handling) for more info.
   *
   * @remarks `PasteHandler`
   * @returns The function should return `true` if the paste event was handled, otherwise it should return `false` if it should be canceled or `undefined` if it should be handled by another handler.
   *
   * @example
   * ```ts
   * pasteHandler: ({ defaultPasteHandler }) => {
   *   return defaultPasteHandler({ pasteBehavior: "prefer-html" });
   * }
   * ```
   */
  pasteHandler?: (context: {
    event: ClipboardEvent;
    editor: BlockNoteEditor<
      NoInfer<BSchema>,
      NoInfer<ISchema>,
      NoInfer<SSchema>
    >;
    /**
     * The default paste handler
     * @param context The context object
     * @returns Whether the paste event was handled or not
     */
    defaultPasteHandler: (context?: {
      /**
       * Whether to prioritize Markdown content in `text/plain` over `text/html` when pasting from the clipboard.
       * @default true
       */
      prioritizeMarkdownOverHTML?: boolean;
      /**
       * Whether to parse `text/plain` content from the clipboard as Markdown content.
       * @default true
       */
      plainTextAsMarkdown?: boolean;
    }) => boolean | undefined;
  }) => boolean | undefined;

  /**
   * Resolve a URL of a file block to one that can be displayed or downloaded. This can be used for creating authenticated URL or
   * implementing custom protocols / schemes
   * @returns The URL that's
   */
  resolveFileUrl?: (url: string) => Promise<string>;

  /**
   * Resolve user information for comments.
   *
   * See [Comments](https://www.blocknotejs.org/docs/features/collaboration/comments) for more info.
   */
  resolveUsers?: (userIds: string[]) => Promise<User[]>;

  /**
   * The schema of the editor. The schema defines which Blocks, InlineContent, and Styles are available in the editor.
   *
   * See [Custom Schemas](https://www.blocknotejs.org/docs/custom-schemas) for more info.
   * @remarks `BlockNoteSchema`
   */
  schema: CustomBlockNoteSchema<BSchema, ISchema, SSchema>;

  /**
   * A flag indicating whether to set an HTML ID for every block
   *
   * When set to `true`, on each block an id attribute will be set with the block id
   * Otherwise, the HTML ID attribute will not be set.
   *
   * (note that the id is always set on the `data-id` attribute)
   */
  setIdAttribute?: boolean;

  /**
   * Determines behavior when pressing Tab (or Shift-Tab) while multiple blocks are selected and a toolbar is open.
   * - `"prefer-navigate-ui"`: Changes focus to the toolbar. User must press Escape to close toolbar before indenting blocks. Better for keyboard accessibility.
   * - `"prefer-indent"`: Always indents selected blocks, regardless of toolbar state. Keyboard navigation of toolbars not possible.
   * @default "prefer-navigate-ui"
   */
  tabBehavior?: "prefer-navigate-ui" | "prefer-indent";

  /**
   * Allows enabling / disabling features of tables.
   *
   * See [Tables](https://www.blocknotejs.org/docs/editor-basics/document-structure#tables) for more info.
   *
   * @remarks `TableConfig`
   */
  tables?: {
    /**
     * Whether to allow splitting and merging cells within a table.
     *
     * @default false
     */
    splitCells?: boolean;
    /**
     * Whether to allow changing the background color of cells.
     *
     * @default false
     */
    cellBackgroundColor?: boolean;
    /**
     * Whether to allow changing the text color of cells.
     *
     * @default false
     */
    cellTextColor?: boolean;
    /**
     * Whether to allow changing cells into headers.
     *
     * @default false
     */
    headers?: boolean;
  };

  /**
   * An option which user can pass with `false` value to disable the automatic creation of a trailing new block on the next line when the user types or edits any block.
   *
   * @default true
   */
  trailingBlock?: boolean;

  /**
   * The `uploadFile` method is what the editor uses when files need to be uploaded (for example when selecting an image to upload).
   * This method should set when creating the editor as this is application-specific.
   *
   * `undefined` means the application doesn't support file uploads.
   *
   * @param file The file that should be uploaded.
   * @returns The URL of the uploaded file OR an object containing props that should be set on the file block (such as an id)
   * @remarks `(file: File) => Promise<UploadFileResult>`
   */
  uploadFile?: (
    file: File,
    blockId?: string,
  ) => Promise<string | Record<string, any>>;

  /**
   * additional tiptap options, undocumented
   * @internal
   */
  _tiptapOptions?: Partial<EditorOptions>;

  /**
   * (experimental) add extra extensions to the editor
   *
   * @deprecated, should use `extensions` instead
   * @internal
   */
  _extensions?: Record<
    string,
    | { plugin: Plugin; priority?: number }
    | ((editor: BlockNoteEditor<any, any, any>) => {
        plugin: Plugin;
        priority?: number;
      })
  >;

  /**
   * Register extensions to the editor.
   *
   * See [Extensions](/docs/features/extensions) for more info.
   *
   * @remarks `BlockNoteExtension[]`
   */
  extensions?: Array<BlockNoteExtension | BlockNoteExtensionFactory>;
};

const blockNoteTipTapOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export class BlockNoteEditor<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> extends EventEmitter<{
  create: void;
}> {
  /**
   * The underlying prosemirror schema
   */
  public readonly pmSchema: Schema;

  /**
   * extensions that are added to the editor, can be tiptap extensions or prosemirror plugins
   */
  public extensions: Record<string, SupportedExtension> = {};

  public readonly _tiptapEditor: TiptapEditor & {
    contentComponent: any;
  };

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
  public blockCache: BlockCache = new WeakMap();

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

  public get formattingToolbar(): FormattingToolbarProsemirrorPlugin {
    return this._extensionManager.formattingToolbar;
  }

  public get linkToolbar(): LinkToolbarProsemirrorPlugin<
    BSchema,
    ISchema,
    SSchema
  > {
    return this._extensionManager.linkToolbar;
  }

  public get sideMenu(): SideMenuProsemirrorPlugin<BSchema, ISchema, SSchema> {
    return this._extensionManager.sideMenu;
  }

  public get suggestionMenus(): SuggestionMenuProseMirrorPlugin<
    BSchema,
    ISchema,
    SSchema
  > {
    return this._extensionManager.suggestionMenus;
  }

  public get filePanel():
    | FilePanelProsemirrorPlugin<ISchema, SSchema>
    | undefined {
    return this._extensionManager.filePanel;
  }

  public get tableHandles():
    | TableHandlesProsemirrorPlugin<ISchema, SSchema>
    | undefined {
    return this._extensionManager.tableHandles;
  }

  public get comments(): CommentsPlugin | undefined {
    return this._collaborationManager?.comments;
  }

  public get showSelectionPlugin(): ShowSelectionPlugin {
    return this._extensionManager.showSelectionPlugin;
  }

  /**
   * The plugin for forking a document, only defined if in collaboration mode
   */
  public get forkYDocPlugin() {
    return this._collaborationManager?.forkYDocPlugin;
  }
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
  public readonly resolveUsers?: (userIds: string[]) => Promise<User[]>;
  /**
   * Editor settings
   */
  public readonly settings: {
    tables: {
      splitCells: boolean;
      cellBackgroundColor: boolean;
      cellTextColor: boolean;
      headers: boolean;
    };
  };
  public static create<
    Options extends Partial<BlockNoteEditorOptions<any, any, any>> | undefined,
  >(
    options?: Options,
  ): Options extends {
    schema: CustomBlockNoteSchema<infer BSchema, infer ISchema, infer SSchema>;
  }
    ? BlockNoteEditor<BSchema, ISchema, SSchema>
    : BlockNoteEditor<
        DefaultBlockSchema,
        DefaultInlineContentSchema,
        DefaultStyleSchema
      > {
    return new BlockNoteEditor(options ?? {}) as any;
  }

  protected constructor(
    protected readonly options: Partial<
      BlockNoteEditorOptions<BSchema, ISchema, SSchema>
    >,
  ) {
    super();
    const anyOpts = options as any;
    if (anyOpts.onEditorContentChange) {
      throw new Error(
        "onEditorContentChange initialization option is deprecated, use <BlockNoteView onChange={...} />, the useEditorChange(...) hook, or editor.onChange(...)",
      );
    }

    if (anyOpts.onTextCursorPositionChange) {
      throw new Error(
        "onTextCursorPositionChange initialization option is deprecated, use <BlockNoteView onSelectionChange={...} />, the useEditorSelectionChange(...) hook, or editor.onSelectionChange(...)",
      );
    }

    if (anyOpts.onEditorReady) {
      throw new Error(
        "onEditorReady is deprecated. Editor is immediately ready for use after creation.",
      );
    }

    if (anyOpts.editable) {
      throw new Error(
        "editable initialization option is deprecated, use <BlockNoteView editable={true/false} />, or alternatively editor.isEditable = true/false",
      );
    }

    this.dictionary = options.dictionary || en;
    this.settings = {
      tables: {
        splitCells: options?.tables?.splitCells ?? false,
        cellBackgroundColor: options?.tables?.cellBackgroundColor ?? false,
        cellTextColor: options?.tables?.cellTextColor ?? false,
        headers: options?.tables?.headers ?? false,
      },
    };

    // apply defaults
    const newOptions = {
      defaultStyles: true,
      schema:
        options.schema ||
        (BlockNoteSchema.create() as unknown as CustomBlockNoteSchema<
          BSchema,
          ISchema,
          SSchema
        >),
      ...options,
      placeholders: {
        ...this.dictionary.placeholders,
        ...options.placeholders,
      },
    };

    // Initialize CollaborationManager if collaboration is enabled or if comments are configured
    if (newOptions.collaboration || newOptions.comments) {
      const collaborationOptions: CollaborationOptions = {
        // Use collaboration options if available, otherwise provide defaults
        fragment: newOptions.collaboration?.fragment || new Y.XmlFragment(),
        user: newOptions.collaboration?.user || {
          name: "User",
          color: "#FF0000",
        },
        provider: newOptions.collaboration?.provider || null,
        renderCursor: newOptions.collaboration?.renderCursor,
        showCursorLabels: newOptions.collaboration?.showCursorLabels,
        comments: newOptions.comments,
        resolveUsers: newOptions.resolveUsers,
      };
      this._collaborationManager = new CollaborationManager(
        this as any,
        collaborationOptions,
      );
    } else {
      this._collaborationManager = undefined;
    }

    if (newOptions.comments && !newOptions.resolveUsers) {
      throw new Error("resolveUsers is required when using comments");
    }

    // @ts-ignore
    this.schema = newOptions.schema;
    this.blockImplementations = newOptions.schema.blockSpecs;
    this.inlineContentImplementations = newOptions.schema.inlineContentSpecs;
    this.styleImplementations = newOptions.schema.styleSpecs;

    this.extensions = {
      ...getBlockNoteExtensions({
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
        tableHandles: editorHasBlockWithType(this, "table"),
        dropCursor: this.options.dropCursor ?? dropCursor,
        placeholders: newOptions.placeholders,
        tabBehavior: newOptions.tabBehavior,
        pasteHandler: newOptions.pasteHandler,
      }),
      ...this._collaborationManager?.initExtensions(),
    } as any;

    // add extensions from _tiptapOptions
    (newOptions._tiptapOptions?.extensions || []).forEach((ext) => {
      this.extensions[ext.name] = ext;
    });

    // add extensions from options
    for (let ext of newOptions.extensions || []) {
      if (typeof ext === "function") {
        // factory
        ext = ext(this);
      }
      const key = (ext as any).key ?? (ext.constructor as any).key();
      if (!key) {
        throw new Error(
          `Extension ${ext.constructor.name} does not have a key method`,
        );
      }
      if (this.extensions[key]) {
        throw new Error(
          `Extension ${ext.constructor.name} already exists with key ${key}`,
        );
      }
      this.extensions[key] = ext;
    }

    // (when passed in via the deprecated `_extensions` option)
    Object.entries(newOptions._extensions || {}).forEach(([key, ext]) => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const editor = this;

      const instance = typeof ext === "function" ? ext(editor) : ext;
      if (!("plugin" in instance)) {
        // Assume it is an Extension/Mark/Node
        this.extensions[key] = instance;
        return;
      }

      this.extensions[key] = new (class extends BlockNoteExtension {
        public static key() {
          return key;
        }
        constructor() {
          super();
          this.addProsemirrorPlugin(instance.plugin);
        }
        public get priority() {
          return instance.priority;
        }
      })();
    });

    if (newOptions.uploadFile) {
      const uploadFile = newOptions.uploadFile;
      this.uploadFile = async (file, blockId) => {
        this.onUploadStartCallbacks.forEach((callback) =>
          callback.apply(this, [blockId]),
        );
        try {
          return await uploadFile(file, blockId);
        } finally {
          this.onUploadEndCallbacks.forEach((callback) =>
            callback.apply(this, [blockId]),
          );
        }
      };
    }

    this.resolveFileUrl = newOptions.resolveFileUrl;

    const collaborationEnabled =
      "ySyncPlugin" in this.extensions ||
      "liveblocksExtension" in this.extensions;

    if (collaborationEnabled && newOptions.initialContent) {
      // eslint-disable-next-line no-console
      console.warn(
        "When using Collaboration, initialContent might cause conflicts, because changes should come from the collaboration provider",
      );
    }

    const blockExtensions = Object.fromEntries(
      Object.values(this.schema.blockSpecs)
        .map((block) => (block as any).extensions as any)
        .filter((ext) => ext !== undefined)
        .flat()
        .map((ext) => [ext.key ?? ext.constructor.key(), ext]),
    );
    const tiptapExtensions = [
      ...Object.entries({ ...this.extensions, ...blockExtensions }).map(
        ([key, ext]) => {
          if (
            ext instanceof Extension ||
            ext instanceof TipTapNode ||
            ext instanceof Mark
          ) {
            // tiptap extension
            return ext;
          }

          if (ext instanceof BlockNoteExtension) {
            if (
              !ext.plugins.length &&
              !ext.keyboardShortcuts &&
              !ext.inputRules &&
              !ext.tiptapExtensions
            ) {
              return undefined;
            }
            // "blocknote" extensions (prosemirror plugins)
            return Extension.create({
              name: key,
              priority: ext.priority,
              addProseMirrorPlugins: () => ext.plugins,
              addExtensions: () => ext.tiptapExtensions || [],
              // TODO maybe collect all input rules from all extensions into one plugin
              // TODO consider using the prosemirror-inputrules package instead
              addInputRules: ext.inputRules
                ? () =>
                    ext.inputRules!.map(
                      (inputRule) =>
                        new InputRule({
                          find: inputRule.find,
                          handler: ({ range, match, state }) => {
                            const replaceWith = inputRule.replace({
                              match,
                              range,
                              editor: this,
                            });
                            if (replaceWith) {
                              const cursorPosition =
                                this.getTextCursorPosition();

                              if (
                                this.schema.blockSchema[
                                  cursorPosition.block.type
                                ].content !== "inline"
                              ) {
                                return undefined;
                              }

                              const blockInfo = getBlockInfoFromTransaction(
                                state.tr,
                              );
                              const tr = state.tr.deleteRange(
                                range.from,
                                range.to,
                              );

                              updateBlockTr(
                                tr,
                                blockInfo.bnBlock.beforePos,
                                replaceWith,
                              );
                              return undefined;
                            }
                            return null;
                          },
                        }),
                    )
                : undefined,
              addKeyboardShortcuts: ext.keyboardShortcuts
                ? () => {
                    return Object.fromEntries(
                      Object.entries(ext.keyboardShortcuts!).map(
                        ([key, value]) => [
                          key,
                          () => value({ editor: this as any }),
                        ],
                      ),
                    );
                  }
                : undefined,
            });
          }

          return undefined;
        },
      ),
    ].filter((ext): ext is Extension => ext !== undefined);
    const tiptapOptions: EditorOptions = {
      ...blockNoteTipTapOptions,
      ...newOptions._tiptapOptions,
      element: null,
      autofocus: newOptions.autofocus ?? false,
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
            newOptions.domAttributes?.editor?.class || "",
          ),
        },
        transformPasted,
      },
    } as any;

    try {
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
            initialContent,
        );
      }
      const schema = getSchema(tiptapOptions.extensions!);
      const pmNodes = initialContent.map((b) =>
        blockToNode(b, schema, this.schema.styleSchema).toJSON(),
      );
      const doc = createDocument(
        {
          type: "doc",
          content: [
            {
              type: "blockGroup",
              content: pmNodes,
            },
          ],
        },
        schema,
        tiptapOptions.parseOptions,
      );

      this._tiptapEditor = new TiptapEditor({
        ...tiptapOptions,
        content: doc.toJSON(),
      }) as any;
      this.pmSchema = this._tiptapEditor.schema;
    } catch (e) {
      throw new Error(
        "Error creating document from blocks passed as `initialContent`",
        { cause: e },
      );
    }

    this.pmSchema.cached.blockNoteEditor = this;

    // Initialize managers
    this._blockManager = new BlockManager(this as any);

    this._eventManager = new EventManager(this as any);
    this._exportManager = new ExportManager(this as any);
    this._extensionManager = new ExtensionManager(this as any);
    this._selectionManager = new SelectionManager(this as any);
    this._stateManager = new StateManager(
      this as any,
      collaborationEnabled
        ? {
            undo: this._collaborationManager?.getUndoCommand(),
            redo: this._collaborationManager?.getRedoCommand(),
          }
        : undefined,
    );
    this._styleManager = new StyleManager(this as any);

    this.emit("create");
  }

  // Manager instances
  private readonly _blockManager: BlockManager<any, any, any>;
  private readonly _collaborationManager?: CollaborationManager;
  private readonly _eventManager: EventManager<any>;
  private readonly _exportManager: ExportManager<any, any, any>;
  private readonly _extensionManager: ExtensionManager;
  private readonly _selectionManager: SelectionManager<any, any, any>;
  private readonly _stateManager: StateManager;
  private readonly _styleManager: StyleManager<any, any, any>;

  /**
   * Execute a prosemirror command. This is mostly for backwards compatibility with older code.
   *
   * @note You should prefer the {@link transact} method when possible, as it will automatically handle the dispatching of the transaction and work across blocknote transactions.
   *
   * @example
   * ```ts
   * editor.exec((state, dispatch, view) => {
   *   dispatch(state.tr.insertText("Hello, world!"));
   * });
   * ```
   */
  public exec(command: Command) {
    return this._stateManager.exec(command);
  }

  /**
   * Check if a command can be executed. A command should return `false` if it is not valid in the current state.
   *
   * @example
   * ```ts
   * if (editor.canExec(command)) {
   *   // show button
   * } else {
   *   // hide button
   * }
   * ```
   */
  public canExec(command: Command): boolean {
    return this._stateManager.canExec(command);
  }

  /**
   * Execute a function within a "blocknote transaction".
   * All changes to the editor within the transaction will be grouped together, so that
   * we can dispatch them as a single operation (thus creating only a single undo step)
   *
   * @note There is no need to dispatch the transaction, as it will be automatically dispatched when the callback is complete.
   *
   * @example
   * ```ts
   * // All changes to the editor will be grouped together
   * editor.transact((tr) => {
   *   tr.insertText("Hello, world!");
   * // These two operations will be grouped together in a single undo step
   *   editor.transact((tr) => {
   *     tr.insertText("Hello, world!");
   *   });
   * });
   * ```
   */
  public transact<T>(
    callback: (
      /**
       * The current active transaction, this will automatically be dispatched to the editor when the callback is complete
       * If another `transact` call is made within the callback, it will be passed the same transaction as the parent call.
       */
      tr: Transaction,
    ) => T,
  ): T {
    return this._stateManager.transact(callback);
  }

  // TO DISCUSS
  /**
   * Shorthand to get a typed extension from the editor, by
   * just passing in the extension class.
   *
   * @param ext - The extension class to get
   * @param key - optional, the key of the extension in the extensions object (defaults to the extension name)
   * @returns The extension instance
   */
  public extension<T extends BlockNoteExtension>(
    ext: { new (...args: any[]): T } & typeof BlockNoteExtension,
    key = ext.key(),
  ): T {
    return this._extensionManager.extension(ext, key);
  }

  /**
   * Mount the editor to a DOM element.
   *
   * @warning Not needed to call manually when using React, use BlockNoteView to take care of mounting
   */
  public mount = (element: HTMLElement) => {
    // TODO: Fix typing for this in a TipTap PR
    this._tiptapEditor.mount({ mount: element } as any);
  };

  /**
   * Unmount the editor from the DOM element it is bound to
   */
  public unmount = () => {
    this._tiptapEditor.unmount();
  };

  /**
   * Get the underlying prosemirror state
   * @note Prefer using `editor.transact` to read the current editor state, as that will ensure the state is up to date
   * @see https://prosemirror.net/docs/ref/#state.EditorState
   */
  public get prosemirrorState() {
    return this._stateManager.prosemirrorState;
  }

  /**
   * Get the underlying prosemirror view
   * @see https://prosemirror.net/docs/ref/#view.EditorView
   */
  public get prosemirrorView() {
    return this._stateManager.prosemirrorView;
  }

  public get domElement() {
    return this.prosemirrorView?.dom as HTMLDivElement | undefined;
  }

  public isFocused() {
    return this.prosemirrorView?.hasFocus() || false;
  }

  public get headless() {
    return !this._tiptapEditor.isInitialized;
  }

  public focus() {
    if (this.headless) {
      return;
    }
    this.prosemirrorView.focus();
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
    return this._blockManager.document;
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
    return this._blockManager.getBlock(blockIdentifier);
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
    return this._blockManager.getPrevBlock(blockIdentifier);
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
    return this._blockManager.getNextBlock(blockIdentifier);
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
    return this._blockManager.getParentBlock(blockIdentifier);
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
    this._blockManager.forEachBlock(callback, reverse);
  }

  /**
   * Executes a callback whenever the editor's contents change.
   * @param callback The callback to execute.
   *
   * @deprecated use {@link BlockNoteEditor.onChange} instead
   */
  public onEditorContentChange(callback: () => void) {
    this._tiptapEditor.on("update", callback);
  }

  /**
   * Executes a callback whenever the editor's selection changes.
   * @param callback The callback to execute.
   *
   * @deprecated use `onSelectionChange` instead
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
    return this._selectionManager.getTextCursorPosition();
  }

  /**
   * Sets the text cursor position to the start or end of an existing block. Throws an error if the target block could
   * not be found.
   * @param targetBlock The identifier of an existing block that the text cursor should be moved to.
   * @param placement Whether the text cursor should be placed at the start or end of the block.
   */
  public setTextCursorPosition(
    targetBlock: BlockIdentifier,
    placement: "start" | "end" = "start",
  ) {
    return this._selectionManager.setTextCursorPosition(targetBlock, placement);
  }

  /**
   * Gets a snapshot of the current selection. This contains all blocks (included nested blocks)
   * that the selection spans across.
   *
   * If the selection starts / ends halfway through a block, the returned data will contain the entire block.
   */
  public getSelection(): Selection<BSchema, ISchema, SSchema> | undefined {
    return this._selectionManager.getSelection();
  }

  /**
   * Gets a snapshot of the current selection. This contains all blocks (included nested blocks)
   * that the selection spans across.
   *
   * If the selection starts / ends halfway through a block, the returned block will be
   * only the part of the block that is included in the selection.
   */
  public getSelectionCutBlocks() {
    return this._selectionManager.getSelectionCutBlocks();
  }

  /**
   * Sets the selection to a range of blocks.
   * @param startBlock The identifier of the block that should be the start of the selection.
   * @param endBlock The identifier of the block that should be the end of the selection.
   */
  public setSelection(startBlock: BlockIdentifier, endBlock: BlockIdentifier) {
    return this._selectionManager.setSelection(startBlock, endBlock);
  }

  /**
   * Checks if the editor is currently editable, or if it's locked.
   * @returns True if the editor is editable, false otherwise.
   */
  public get isEditable(): boolean {
    return this._stateManager.isEditable;
  }

  /**
   * Makes the editor editable or locks it, depending on the argument passed.
   * @param editable True to make the editor editable, or false to lock it.
   */
  public set isEditable(editable: boolean) {
    this._stateManager.isEditable = editable;
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
    return this._blockManager.insertBlocks(
      blocksToInsert,
      referenceBlock,
      placement,
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
    return this._blockManager.updateBlock(blockToUpdate, update);
  }

  /**
   * Removes existing blocks from the editor. Throws an error if any of the blocks could not be found.
   * @param blocksToRemove An array of identifiers for existing blocks that should be removed.
   */
  public removeBlocks(blocksToRemove: BlockIdentifier[]) {
    return this._blockManager.removeBlocks(blocksToRemove);
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
    return this._blockManager.replaceBlocks(blocksToRemove, blocksToInsert);
  }

  /**
   * Undo the last action.
   */
  public undo() {
    return this._stateManager.undo();
  }

  /**
   * Redo the last action.
   */
  public redo() {
    return this._stateManager.redo();
  }

  /**
   * Insert a piece of content at the current cursor position.
   *
   * @param content can be a string, or array of partial inline content elements
   */
  public insertInlineContent(
    content: PartialInlineContent<ISchema, SSchema>,
    { updateSelection = false }: { updateSelection?: boolean } = {},
  ) {
    this._styleManager.insertInlineContent(content, { updateSelection });
  }

  /**
   * Gets the active text styles at the text cursor position or at the end of the current selection if it's active.
   */
  public getActiveStyles(): Styles<SSchema> {
    return this._styleManager.getActiveStyles();
  }

  /**
   * Adds styles to the currently selected content.
   * @param styles The styles to add.
   */
  public addStyles(styles: Styles<SSchema>) {
    this._styleManager.addStyles(styles);
  }

  /**
   * Removes styles from the currently selected content.
   * @param styles The styles to remove.
   */
  public removeStyles(styles: Styles<SSchema>) {
    this._styleManager.removeStyles(styles);
  }

  /**
   * Toggles styles on the currently selected content.
   * @param styles The styles to toggle.
   */
  public toggleStyles(styles: Styles<SSchema>) {
    this._styleManager.toggleStyles(styles);
  }

  /**
   * Gets the currently selected text.
   */
  public getSelectedText() {
    return this._styleManager.getSelectedText();
  }

  /**
   * Gets the URL of the last link in the current selection, or `undefined` if there are no links in the selection.
   */
  public getSelectedLinkUrl() {
    return this._styleManager.getSelectedLinkUrl();
  }

  /**
   * Creates a new link to replace the selected content.
   * @param url The link URL.
   * @param text The text to display the link with.
   */
  public createLink(url: string, text?: string) {
    this._styleManager.createLink(url, text);
  }

  /**
   * Checks if the block containing the text cursor can be nested.
   */
  public canNestBlock() {
    return this._blockManager.canNestBlock();
  }

  /**
   * Nests the block containing the text cursor into the block above it.
   */
  public nestBlock() {
    this._blockManager.nestBlock();
  }

  /**
   * Checks if the block containing the text cursor is nested.
   */
  public canUnnestBlock() {
    return this._blockManager.canUnnestBlock();
  }

  /**
   * Lifts the block containing the text cursor out of its parent.
   */
  public unnestBlock() {
    this._blockManager.unnestBlock();
  }

  /**
   * Moves the selected blocks up. If the previous block has children, moves
   * them to the end of its children. If there is no previous block, but the
   * current blocks share a common parent, moves them out of & before it.
   */
  public moveBlocksUp() {
    return this._blockManager.moveBlocksUp();
  }

  /**
   * Moves the selected blocks down. If the next block has children, moves
   * them to the start of its children. If there is no next block, but the
   * current blocks share a common parent, moves them out of & after it.
   */
  public moveBlocksDown() {
    return this._blockManager.moveBlocksDown();
  }

  /**
   * Exports blocks into a simplified HTML string. To better conform to HTML standards, children of blocks which aren't list
   * items are un-nested in the output HTML.
   *
   * @param blocks An array of blocks that should be serialized into HTML.
   * @returns The blocks, serialized as an HTML string.
   */
  public blocksToHTMLLossy(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[] = this.document,
  ): string {
    return this._exportManager.blocksToHTMLLossy(blocks);
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
  public blocksToFullHTML(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[],
  ): string {
    return this._exportManager.blocksToFullHTML(blocks);
  }
  /**
   * Parses blocks from an HTML string. Tries to create `Block` objects out of any HTML block-level elements, and
   * `InlineNode` objects from any HTML inline elements, though not all element types are recognized. If BlockNote
   * doesn't recognize an HTML element's tag, it will parse it as a paragraph or plain text.
   * @param html The HTML string to parse blocks from.
   * @returns The blocks parsed from the HTML string.
   */
  public tryParseHTMLToBlocks(
    html: string,
  ): Block<BSchema, ISchema, SSchema>[] {
    return this._exportManager.tryParseHTMLToBlocks(html);
  }

  /**
   * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
   * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
   * @param blocks An array of blocks that should be serialized into Markdown.
   * @returns The blocks, serialized as a Markdown string.
   */
  public blocksToMarkdownLossy(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[] = this.document,
  ): string {
    return this._exportManager.blocksToMarkdownLossy(blocks);
  }

  /**
   * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
   * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
   * as text.
   * @param markdown The Markdown string to parse blocks from.
   * @returns The blocks parsed from the Markdown string.
   */
  public tryParseMarkdownToBlocks(
    markdown: string,
  ): Block<BSchema, ISchema, SSchema>[] {
    return this._exportManager.tryParseMarkdownToBlocks(markdown);
  }

  /**
   * Updates the user info for the current user that's shown to other collaborators.
   */
  public updateCollaborationUserInfo(user: { name: string; color: string }) {
    if (!this._collaborationManager) {
      throw new Error(
        "Cannot update collaboration user info when collaboration is disabled.",
      );
    }

    this._collaborationManager.updateUserInfo(user);
  }

  /**
   * A callback function that runs whenever the editor's contents change.
   *
   * @param callback The callback to execute.
   * @returns A function to remove the callback.
   */
  public onChange(
    callback: (
      editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
      context: {
        /**
         * Returns the blocks that were inserted, updated, or deleted by the change that occurred.
         */
        getChanges(): BlocksChanged<BSchema, ISchema, SSchema>;
      },
    ) => void,
  ) {
    return this._eventManager.onChange(callback);
  }

  /**
   * A callback function that runs whenever the text cursor position or selection changes.
   *
   * @param callback The callback to execute.
   * @returns A function to remove the callback.
   */
  public onSelectionChange(
    callback: (editor: BlockNoteEditor<BSchema, ISchema, SSchema>) => void,
    includeSelectionChangedByRemote?: boolean,
  ) {
    return this._eventManager.onSelectionChange(
      callback,
      includeSelectionChangedByRemote,
    );
  }

  /**
   * A callback function that runs when the editor has been initialized.
   *
   * This can be useful for plugins to initialize themselves after the editor has been initialized.
   *
   * @param callback The callback to execute.
   * @returns A function to remove the callback.
   */
  public onCreate(callback: () => void) {
    this.on("create", callback);

    return () => {
      this.off("create", callback);
    };
  }

  /**
   * A callback function that runs when the editor has been mounted.
   *
   * This can be useful for plugins to initialize themselves after the editor has been mounted.
   *
   * @param callback The callback to execute.
   * @returns A function to remove the callback.
   */
  public onMount(
    callback: (ctx: {
      editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
    }) => void,
  ) {
    this._eventManager.onMount(callback);
  }

  /**
   * A callback function that runs when the editor has been unmounted.
   *
   * This can be useful for plugins to clean up themselves after the editor has been unmounted.
   *
   * @param callback The callback to execute.
   * @returns A function to remove the callback.
   */
  public onUnmount(
    callback: (ctx: {
      editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
    }) => void,
  ) {
    this._eventManager.onUnmount(callback);
  }

  /**
   * Gets the bounding box of the current selection.
   * @returns The bounding box of the current selection.
   */
  public getSelectionBoundingBox() {
    return this._selectionManager.getSelectionBoundingBox();
  }

  public get isEmpty() {
    const doc = this.document;
    // Note: only works for paragraphs as default blocks (but for now this is default in blocknote)
    // checking prosemirror directly might be faster
    return (
      doc.length === 0 ||
      (doc.length === 1 &&
        doc[0].type === "paragraph" &&
        (doc[0].content as any).length === 0)
    );
  }

  public openSuggestionMenu(
    triggerCharacter: string,
    pluginState?: {
      deleteTriggerCharacter?: boolean;
      ignoreQueryLength?: boolean;
    },
  ) {
    if (!this.prosemirrorView) {
      return;
    }

    this.focus();
    this.transact((tr) => {
      if (pluginState?.deleteTriggerCharacter) {
        tr.insertText(triggerCharacter);
      }
      tr.scrollIntoView().setMeta(this.suggestionMenus.plugins[0], {
        triggerCharacter: triggerCharacter,
        deleteTriggerCharacter: pluginState?.deleteTriggerCharacter || false,
        ignoreQueryLength: pluginState?.ignoreQueryLength || false,
      });
    });
  }

  // `forceSelectionVisible` determines whether the editor selection is shows
  // even when the editor is not focused. This is useful for e.g. creating new
  // links, so the user still sees the affected content when an input field is
  // focused.
  // TODO: Reconsider naming?
  public getForceSelectionVisible() {
    return this.showSelectionPlugin.getEnabled();
  }

  public setForceSelectionVisible(forceSelectionVisible: boolean) {
    this.showSelectionPlugin.setEnabled(forceSelectionVisible);
  }

  /**
   * Paste HTML into the editor. Defaults to converting HTML to BlockNote HTML.
   * @param html The HTML to paste.
   * @param raw Whether to paste the HTML as is, or to convert it to BlockNote HTML.
   */
  public pasteHTML(html: string, raw = false) {
    this._exportManager.pasteHTML(html, raw);
  }

  /**
   * Paste text into the editor. Defaults to interpreting text as markdown.
   * @param text The text to paste.
   */
  public pasteText(text: string) {
    return this._exportManager.pasteText(text);
  }

  /**
   * Paste markdown into the editor.
   * @param markdown The markdown to paste.
   */
  public pasteMarkdown(markdown: string) {
    return this._exportManager.pasteMarkdown(markdown);
  }
}
