import { AnyExtension, EditorOptions } from "@tiptap/core";
import { Node, Schema } from "prosemirror-model";
import * as Y from "yjs";
import { Block, DefaultBlockSchema, DefaultInlineContentSchema, DefaultStyleSchema, PartialBlock } from "../blocks/defaultBlocks.js";
import { FilePanelProsemirrorPlugin } from "../extensions/FilePanel/FilePanelPlugin.js";
import { FormattingToolbarProsemirrorPlugin } from "../extensions/FormattingToolbar/FormattingToolbarPlugin.js";
import { LinkToolbarProsemirrorPlugin } from "../extensions/LinkToolbar/LinkToolbarPlugin.js";
import { SideMenuProsemirrorPlugin } from "../extensions/SideMenu/SideMenuPlugin.js";
import { SuggestionMenuProseMirrorPlugin } from "../extensions/SuggestionMenu/SuggestionPlugin.js";
import { TableHandlesProsemirrorPlugin } from "../extensions/TableHandles/TableHandlesPlugin.js";
import { BlockIdentifier, BlockNoteDOMAttributes, BlockSchema, BlockSpecs, InlineContentSchema, InlineContentSpecs, PartialInlineContent, Styles, StyleSchema, StyleSpecs } from "../schema/index.js";
import { NoInfer } from "../util/typescript.js";
import { TextCursorPosition } from "./cursorPositionTypes.js";
import { Selection } from "./selectionTypes.js";
import { BlockNoteSchema } from "./BlockNoteSchema.js";
import { BlockNoteTipTapEditor } from "./BlockNoteTipTapEditor.js";
import { Dictionary } from "../i18n/dictionary.js";
import { Plugin, Transaction } from "@tiptap/pm/state";
import { EditorView } from "prosemirror-view";
import "../style.css";
export type BlockNoteExtension = AnyExtension | {
    plugin: Plugin;
};
export type BlockNoteEditorOptions<BSchema extends BlockSchema, ISchema extends InlineContentSchema, SSchema extends StyleSchema> = {
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
    initialContent: PartialBlock<NoInfer<BSchema>, NoInfer<ISchema>, NoInfer<SSchema>>[];
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
    uploadFile: (file: File, blockId?: string) => Promise<string | Record<string, any>>;
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
    _extensions: Record<string, BlockNoteExtension>;
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
export declare class BlockNoteEditor<BSchema extends BlockSchema = DefaultBlockSchema, ISchema extends InlineContentSchema = DefaultInlineContentSchema, SSchema extends StyleSchema = DefaultStyleSchema> {
    protected readonly options: Partial<BlockNoteEditorOptions<any, any, any>>;
    private readonly _pmSchema;
    /**
     * extensions that are added to the editor, can be tiptap extensions or prosemirror plugins
     */
    readonly extensions: Record<string, BlockNoteExtension>;
    /**
     * Boolean indicating whether the editor is in headless mode.
     * Headless mode means we can use features like importing / exporting blocks,
     * but there's no underlying editor (UI) instantiated.
     *
     * You probably don't need to set this manually, but use the `server-util` package instead that uses this option internally
     */
    readonly headless: boolean;
    readonly _tiptapEditor: Omit<BlockNoteTipTapEditor, "view"> & {
        view: EditorView | undefined;
        contentComponent: any;
    };
    /**
     * Used by React to store a reference to an `ElementRenderer` helper utility to make sure we can render React elements
     * in the correct context (used by `ReactRenderUtil`)
     */
    elementRenderer: ((node: any, container: HTMLElement) => void) | null;
    /**
     * Cache of all blocks. This makes sure we don't have to "recompute" blocks if underlying Prosemirror Nodes haven't changed.
     * This is especially useful when we want to keep track of the same block across multiple operations,
     * with this cache, blocks stay the same object reference (referential equality with ===).
     */
    blockCache: WeakMap<Node, Block<any, any, any>>;
    /**
     * The dictionary contains translations for the editor.
     */
    readonly dictionary: Dictionary & Record<string, any>;
    /**
     * The schema of the editor. The schema defines which Blocks, InlineContent, and Styles are available in the editor.
     */
    readonly schema: BlockNoteSchema<BSchema, ISchema, SSchema>;
    readonly blockImplementations: BlockSpecs;
    readonly inlineContentImplementations: InlineContentSpecs;
    readonly styleImplementations: StyleSpecs;
    readonly formattingToolbar: FormattingToolbarProsemirrorPlugin;
    readonly linkToolbar: LinkToolbarProsemirrorPlugin<BSchema, ISchema, SSchema>;
    readonly sideMenu: SideMenuProsemirrorPlugin<BSchema, ISchema, SSchema>;
    readonly suggestionMenus: SuggestionMenuProseMirrorPlugin<BSchema, ISchema, SSchema>;
    readonly filePanel?: FilePanelProsemirrorPlugin<ISchema, SSchema>;
    readonly tableHandles?: TableHandlesProsemirrorPlugin<ISchema, SSchema>;
    /**
     * The `uploadFile` method is what the editor uses when files need to be uploaded (for example when selecting an image to upload).
     * This method should set when creating the editor as this is application-specific.
     *
     * `undefined` means the application doesn't support file uploads.
     *
     * @param file The file that should be uploaded.
     * @returns The URL of the uploaded file OR an object containing props that should be set on the file block (such as an id)
     */
    readonly uploadFile: ((file: File, blockId?: string) => Promise<string | Record<string, any>>) | undefined;
    private onUploadStartCallbacks;
    private onUploadEndCallbacks;
    readonly resolveFileUrl?: (url: string) => Promise<string>;
    get pmSchema(): Schema<any, any>;
    static create<BSchema extends BlockSchema = DefaultBlockSchema, ISchema extends InlineContentSchema = DefaultInlineContentSchema, SSchema extends StyleSchema = DefaultStyleSchema>(options?: Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>>): BlockNoteEditor<BSchema, ISchema, SSchema>;
    protected constructor(options: Partial<BlockNoteEditorOptions<any, any, any>>);
    dispatch(tr: Transaction): void;
    /**
     * Mount the editor to a parent DOM element. Call mount(undefined) to clean up
     *
     * @warning Not needed to call manually when using React, use BlockNoteView to take care of mounting
     */
    mount: (parentElement?: HTMLElement | null) => void;
    get prosemirrorView(): EditorView | undefined;
    get domElement(): HTMLDivElement | undefined;
    isFocused(): boolean;
    focus(): void;
    onUploadStart(callback: (blockId?: string) => void): () => void;
    onUploadEnd(callback: (blockId?: string) => void): () => void;
    /**
     * @deprecated, use `editor.document` instead
     */
    get topLevelBlocks(): Block<BSchema, ISchema, SSchema>[];
    /**
     * Gets a snapshot of all top-level (non-nested) blocks in the editor.
     * @returns A snapshot of all top-level (non-nested) blocks in the editor.
     */
    get document(): Block<BSchema, ISchema, SSchema>[];
    /**
     * Gets a snapshot of an existing block from the editor.
     * @param blockIdentifier The identifier of an existing block that should be
     * retrieved.
     * @returns The block that matches the identifier, or `undefined` if no
     * matching block was found.
     */
    getBlock(blockIdentifier: BlockIdentifier): Block<BSchema, ISchema, SSchema> | undefined;
    /**
     * Gets a snapshot of the previous sibling of an existing block from the
     * editor.
     * @param blockIdentifier The identifier of an existing block for which the
     * previous sibling should be retrieved.
     * @returns The previous sibling of the block that matches the identifier.
     * `undefined` if no matching block was found, or it's the first child/block
     * in the document.
     */
    getPrevBlock(blockIdentifier: BlockIdentifier): Block<BSchema, ISchema, SSchema> | undefined;
    /**
     * Gets a snapshot of the next sibling of an existing block from the editor.
     * @param blockIdentifier The identifier of an existing block for which the
     * next sibling should be retrieved.
     * @returns The next sibling of the block that matches the identifier.
     * `undefined` if no matching block was found, or it's the last child/block in
     * the document.
     */
    getNextBlock(blockIdentifier: BlockIdentifier): Block<BSchema, ISchema, SSchema> | undefined;
    /**
     * Gets a snapshot of the parent of an existing block from the editor.
     * @param blockIdentifier The identifier of an existing block for which the
     * parent should be retrieved.
     * @returns The parent of the block that matches the identifier. `undefined`
     * if no matching block was found, or the block isn't nested.
     */
    getParentBlock(blockIdentifier: BlockIdentifier): Block<BSchema, ISchema, SSchema> | undefined;
    /**
     * Traverses all blocks in the editor depth-first, and executes a callback for each.
     * @param callback The callback to execute for each block. Returning `false` stops the traversal.
     * @param reverse Whether the blocks should be traversed in reverse order.
     */
    forEachBlock(callback: (block: Block<BSchema, ISchema, SSchema>) => boolean, reverse?: boolean): void;
    /**
     * Executes a callback whenever the editor's contents change.
     * @param callback The callback to execute.
     */
    onEditorContentChange(callback: () => void): void;
    /**
     * Executes a callback whenever the editor's selection changes.
     * @param callback The callback to execute.
     */
    onEditorSelectionChange(callback: () => void): void;
    /**
     * Gets a snapshot of the current text cursor position.
     * @returns A snapshot of the current text cursor position.
     */
    getTextCursorPosition(): TextCursorPosition<BSchema, ISchema, SSchema>;
    /**
     * Sets the text cursor position to the start or end of an existing block. Throws an error if the target block could
     * not be found.
     * @param targetBlock The identifier of an existing block that the text cursor should be moved to.
     * @param placement Whether the text cursor should be placed at the start or end of the block.
     */
    setTextCursorPosition(targetBlock: BlockIdentifier, placement?: "start" | "end"): void;
    getDocumentWithSelectionMarkers(): Block<BSchema, ISchema, SSchema>[];
    getSelectedBlocksWithSelectionMarkers(): Block<BSchema, ISchema, SSchema>[];
    getSelection2(): {
        blocks: import("../api/nodeConversions/nodeToBlock.js").SlicedBlock<any, any, any>[];
    };
    /**
     * Gets a snapshot of the current selection.
     */
    getSelection(): Selection<BSchema, ISchema, SSchema> | undefined;
    setSelection(startBlock: BlockIdentifier, endBlock: BlockIdentifier): void;
    /**
     * Checks if the editor is currently editable, or if it's locked.
     * @returns True if the editor is editable, false otherwise.
     */
    get isEditable(): boolean;
    /**
     * Makes the editor editable or locks it, depending on the argument passed.
     * @param editable True to make the editor editable, or false to lock it.
     */
    set isEditable(editable: boolean);
    /**
     * Inserts new blocks into the editor. If a block's `id` is undefined, BlockNote generates one automatically. Throws an
     * error if the reference block could not be found.
     * @param blocksToInsert An array of partial blocks that should be inserted.
     * @param referenceBlock An identifier for an existing block, at which the new blocks should be inserted.
     * @param placement Whether the blocks should be inserted just before, just after, or nested inside the
     * `referenceBlock`.
     */
    insertBlocks(blocksToInsert: PartialBlock<BSchema, ISchema, SSchema>[], referenceBlock: BlockIdentifier, placement?: "before" | "after"): Block<BSchema, ISchema, SSchema>[];
    /**
     * Updates an existing block in the editor. Since updatedBlock is a PartialBlock object, some fields might not be
     * defined. These undefined fields are kept as-is from the existing block. Throws an error if the block to update could
     * not be found.
     * @param blockToUpdate The block that should be updated.
     * @param update A partial block which defines how the existing block should be changed.
     */
    updateBlock(blockToUpdate: BlockIdentifier, update: PartialBlock<BSchema, ISchema, SSchema>): Block<BSchema, ISchema, SSchema>;
    /**
     * Removes existing blocks from the editor. Throws an error if any of the blocks could not be found.
     * @param blocksToRemove An array of identifiers for existing blocks that should be removed.
     */
    removeBlocks(blocksToRemove: BlockIdentifier[]): Block<BSchema, ISchema, SSchema>[];
    /**
     * Replaces existing blocks in the editor with new blocks. If the blocks that should be removed are not adjacent or
     * are at different nesting levels, `blocksToInsert` will be inserted at the position of the first block in
     * `blocksToRemove`. Throws an error if any of the blocks to remove could not be found.
     * @param blocksToRemove An array of blocks that should be replaced.
     * @param blocksToInsert An array of partial blocks to replace the old ones with.
     */
    replaceBlocks(blocksToRemove: BlockIdentifier[], blocksToInsert: PartialBlock<BSchema, ISchema, SSchema>[]): {
        insertedBlocks: Block<BSchema, ISchema, SSchema>[];
        removedBlocks: Block<BSchema, ISchema, SSchema>[];
    };
    /**
     * Insert a piece of content at the current cursor position.
     *
     * @param content can be a string, or array of partial inline content elements
     */
    insertInlineContent(content: PartialInlineContent<ISchema, SSchema>): void;
    /**
     * Gets the active text styles at the text cursor position or at the end of the current selection if it's active.
     */
    getActiveStyles(): Styles<SSchema>;
    /**
     * Adds styles to the currently selected content.
     * @param styles The styles to add.
     */
    addStyles(styles: Styles<SSchema>): void;
    /**
     * Removes styles from the currently selected content.
     * @param styles The styles to remove.
     */
    removeStyles(styles: Styles<SSchema>): void;
    /**
     * Toggles styles on the currently selected content.
     * @param styles The styles to toggle.
     */
    toggleStyles(styles: Styles<SSchema>): void;
    /**
     * Gets the currently selected text.
     */
    getSelectedText(): string;
    /**
     * Gets the URL of the last link in the current selection, or `undefined` if there are no links in the selection.
     */
    getSelectedLinkUrl(): string | undefined;
    /**
     * Creates a new link to replace the selected content.
     * @param url The link URL.
     * @param text The text to display the link with.
     */
    createLink(url: string, text?: string): void;
    /**
     * Checks if the block containing the text cursor can be nested.
     */
    canNestBlock(): boolean;
    /**
     * Nests the block containing the text cursor into the block above it.
     */
    nestBlock(): void;
    /**
     * Checks if the block containing the text cursor is nested.
     */
    canUnnestBlock(): boolean;
    /**
     * Lifts the block containing the text cursor out of its parent.
     */
    unnestBlock(): void;
    /**
     * Moves the selected blocks up. If the previous block has children, moves
     * them to the end of its children. If there is no previous block, but the
     * current blocks share a common parent, moves them out of & before it.
     */
    moveBlocksUp(): void;
    /**
     * Moves the selected blocks down. If the next block has children, moves
     * them to the start of its children. If there is no next block, but the
     * current blocks share a common parent, moves them out of & after it.
     */
    moveBlocksDown(): void;
    /**
     * Exports blocks into a simplified HTML string. To better conform to HTML standards, children of blocks which aren't list
     * items are un-nested in the output HTML.
     *
     * @param blocks An array of blocks that should be serialized into HTML.
     * @returns The blocks, serialized as an HTML string.
     */
    blocksToHTMLLossy(blocks?: PartialBlock<BSchema, ISchema, SSchema>[]): Promise<string>;
    /**
     * Serializes blocks into an HTML string in the format that would normally be rendered by the editor.
     *
     * Use this method if you want to server-side render HTML (for example, a blog post that has been edited in BlockNote)
     * and serve it to users without loading the editor on the client (i.e.: displaying the blog post)
     *
     * @param blocks An array of blocks that should be serialized into HTML.
     * @returns The blocks, serialized as an HTML string.
     */
    blocksToFullHTML(blocks: PartialBlock<BSchema, ISchema, SSchema>[]): Promise<string>;
    /**
     * Parses blocks from an HTML string. Tries to create `Block` objects out of any HTML block-level elements, and
     * `InlineNode` objects from any HTML inline elements, though not all element types are recognized. If BlockNote
     * doesn't recognize an HTML element's tag, it will parse it as a paragraph or plain text.
     * @param html The HTML string to parse blocks from.
     * @returns The blocks parsed from the HTML string.
     */
    tryParseHTMLToBlocks(html: string): Promise<Block<BSchema, ISchema, SSchema>[]>;
    /**
     * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
     * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
     * @param blocks An array of blocks that should be serialized into Markdown.
     * @returns The blocks, serialized as a Markdown string.
     */
    blocksToMarkdownLossy(blocks?: PartialBlock<BSchema, ISchema, SSchema>[]): Promise<string>;
    /**
     * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
     * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
     * as text.
     * @param markdown The Markdown string to parse blocks from.
     * @returns The blocks parsed from the Markdown string.
     */
    tryParseMarkdownToBlocks(markdown: string): Promise<Block<BSchema, ISchema, SSchema>[]>;
    /**
     * Updates the user info for the current user that's shown to other collaborators.
     */
    updateCollaborationUserInfo(user: {
        name: string;
        color: string;
    }): void;
    /**
     * A callback function that runs whenever the editor's contents change.
     *
     * @param callback The callback to execute.
     * @returns A function to remove the callback.
     */
    onChange(callback: (editor: BlockNoteEditor<BSchema, ISchema, SSchema>) => void): (() => void) | undefined;
    /**
     * A callback function that runs whenever the text cursor position or selection changes.
     *
     * @param callback The callback to execute.
     * @returns A function to remove the callback.
     */
    onSelectionChange(callback: (editor: BlockNoteEditor<BSchema, ISchema, SSchema>) => void): (() => void) | undefined;
    openSuggestionMenu(triggerCharacter: string, pluginState?: {
        deleteTriggerCharacter?: boolean;
        ignoreQueryLength?: boolean;
    }): void;
}
