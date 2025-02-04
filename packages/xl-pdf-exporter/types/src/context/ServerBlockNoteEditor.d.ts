import { Block, BlockNoteEditor, BlockNoteEditorOptions, BlockSchema, DefaultBlockSchema, DefaultInlineContentSchema, DefaultStyleSchema, InlineContentSchema, PartialBlock, StyleSchema } from "@blocknote/core";
import { Node } from "@tiptap/pm/model";
import * as React from "react";
import type * as Y from "yjs";
/**
 * Use the ServerBlockNoteEditor to interact with BlockNote documents in a server (nodejs) environment.
 */
export declare class ServerBlockNoteEditor<BSchema extends BlockSchema = DefaultBlockSchema, ISchema extends InlineContentSchema = DefaultInlineContentSchema, SSchema extends StyleSchema = DefaultStyleSchema> {
    /**
     * Internal BlockNoteEditor (not recommended to use directly, use the methods of this class instead)
     */
    readonly editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
    /**
     * We currently use a JSDOM instance to mock document and window methods
     *
     * A possible improvement could be to make this:
     * a) pluggable so other shims can be used as well
     * b) obsolete, but for this all blocks should be React based and we need to remove all references to document / window
     *    from the core / react package. (and even then, it's likely some custom blocks would still use document / window methods)
     */
    private jsdom;
    /**
     * Calls a function with mocking window and document using JSDOM
     *
     * We could make this obsolete by passing in a document / window object to the render / serialize methods of Blocks
     */
    _withJSDOM<T>(fn: () => Promise<T>): Promise<T>;
    static create<BSchema extends BlockSchema = DefaultBlockSchema, ISchema extends InlineContentSchema = DefaultInlineContentSchema, SSchema extends StyleSchema = DefaultStyleSchema>(options?: Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>>): ServerBlockNoteEditor<BSchema, ISchema, SSchema>;
    protected constructor(options: Partial<BlockNoteEditorOptions<any, any, any>>);
    /** PROSEMIRROR / BLOCKNOTE conversions */
    /**
     * Turn Prosemirror JSON to BlockNote style JSON
     * @param json Prosemirror JSON
     * @returns BlockNote style JSON
     */
    _prosemirrorNodeToBlocks(pmNode: Node): Block<BSchema, InlineContentSchema, StyleSchema>[];
    /**
     * Turn Prosemirror JSON to BlockNote style JSON
     * @param json Prosemirror JSON
     * @returns BlockNote style JSON
     */
    _prosemirrorJSONToBlocks(json: any): Block<BSchema, InlineContentSchema, StyleSchema>[];
    /**
     * Turn BlockNote JSON to Prosemirror node / state
     * @param blocks BlockNote blocks
     * @returns Prosemirror root node
     */
    _blocksToProsemirrorNode(blocks: PartialBlock<BSchema, ISchema, SSchema>[]): Node;
    /** YJS / BLOCKNOTE conversions */
    /**
     * Turn a Y.XmlFragment collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
     * @returns BlockNote document (BlockNote style JSON of all blocks)
     */
    yXmlFragmentToBlocks(xmlFragment: Y.XmlFragment): Block<BSchema, InlineContentSchema, StyleSchema>[];
    /**
     * Convert blocks to a Y.XmlFragment
     *
     * This can be used when importing existing content to Y.Doc for the first time,
     * note that this should not be used to rehydrate a Y.Doc from a database once
     * collaboration has begun as all history will be lost
     *
     * @param blocks the blocks to convert
     * @returns Y.XmlFragment
     */
    blocksToYXmlFragment(blocks: Block<BSchema, ISchema, SSchema>[], xmlFragment?: Y.XmlFragment): Y.XmlFragment;
    /**
     * Turn a Y.Doc collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
     * @returns BlockNote document (BlockNote style JSON of all blocks)
     */
    yDocToBlocks(ydoc: Y.Doc, xmlFragment?: string): Block<BSchema, InlineContentSchema, StyleSchema>[];
    /**
     * This can be used when importing existing content to Y.Doc for the first time,
     * note that this should not be used to rehydrate a Y.Doc from a database once
     * collaboration has begun as all history will be lost
     *
     * @param blocks
     */
    blocksToYDoc(blocks: PartialBlock<BSchema, ISchema, SSchema>[], xmlFragment?: string): Y.Doc;
    /** HTML / BLOCKNOTE conversions */
    /**
     * Exports blocks into a simplified HTML string. To better conform to HTML standards, children of blocks which aren't list
     * items are un-nested in the output HTML.
     *
     * @param blocks An array of blocks that should be serialized into HTML.
     * @returns The blocks, serialized as an HTML string.
     */
    blocksToHTMLLossy(blocks: PartialBlock<BSchema, ISchema, SSchema>[]): Promise<string>;
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
    /** MARKDOWN / BLOCKNOTE conversions */
    /**
     * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
     * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
     * @param blocks An array of blocks that should be serialized into Markdown.
     * @returns The blocks, serialized as a Markdown string.
     */
    blocksToMarkdownLossy(blocks: PartialBlock<BSchema, ISchema, SSchema>[]): Promise<string>;
    /**
     * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
     * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
     * as text.
     * @param markdown The Markdown string to parse blocks from.
     * @returns The blocks parsed from the Markdown string.
     */
    tryParseMarkdownToBlocks(markdown: string): Promise<Block<BSchema, ISchema, SSchema>[]>;
    /**
     * If you're using React Context in your blocks, you can use this method to wrap editor calls for importing / exporting / block manipulation
     * with the React Context Provider.
     *
     * Example:
     *
     * ```tsx
        const html = await editor.withReactContext(
        ({ children }) => (
          <YourContext.Provider value={true}>{children}</YourContext.Provider>
        ),
        async () => editor.blocksToFullHTML(blocks)
      );
     */
    withReactContext<T>(comp: React.FC<any>, fn: () => Promise<T>): Promise<T>;
}
