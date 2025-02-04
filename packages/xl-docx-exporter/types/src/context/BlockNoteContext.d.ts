import { Block, BlockSchema, BlockSchemaFromSpecs, BlockSpecs, DefaultBlockSchema, DefaultInlineContentSchema, DefaultStyleSchema, InlineContentSchema, InlineContentSchemaFromSpecs, InlineContentSpecs, StyleSchema, StyleSchemaFromSpecs, StyleSpecs, defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs } from "@blocknote/core";
import { Schema as PMSchema } from "@tiptap/pm/model";
import * as Y from "yjs";
export type BlockNoteEditorOptions<BSpecs extends BlockSpecs, ISpecs extends InlineContentSpecs, SSpecs extends StyleSpecs> = {
    blockSpecs: BSpecs;
    styleSpecs: SSpecs;
    inlineContentSpecs: ISpecs;
};
export declare class BlockNoteContext<BSchema extends BlockSchema = DefaultBlockSchema, ISchema extends InlineContentSchema = DefaultInlineContentSchema, SSchema extends StyleSchema = DefaultStyleSchema> {
    readonly blockSchema: BSchema;
    readonly inlineContentSchema: ISchema;
    readonly styleSchema: SSchema;
    readonly blockImplementations: BlockSpecs;
    readonly inlineContentImplementations: InlineContentSpecs;
    readonly styleImplementations: StyleSpecs;
    readonly pmSchema: PMSchema;
    static create<BSpecs extends BlockSpecs = typeof defaultBlockSpecs, ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs, SSpecs extends StyleSpecs = typeof defaultStyleSpecs>(options?: Partial<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>>): BlockNoteContext<BlockSchemaFromSpecs<BSpecs>, InlineContentSchemaFromSpecs<ISpecs>, StyleSchemaFromSpecs<SSpecs>>;
    private constructor();
    prosemirrorJSONToBlocks(json: any): Block<BSchema, InlineContentSchema, StyleSchema>[];
    yDocToBlocks(ydoc: Y.Doc, xmlFragment?: string): Block<BSchema, InlineContentSchema, StyleSchema>[];
    yXmlFragmentToBlocks(xmlFragment: Y.XmlFragment): Block<BSchema, InlineContentSchema, StyleSchema>[];
    /**
     * Serializes blocks into an HTML string. To better conform to HTML standards, children of blocks which aren't list
     * items are un-nested in the output HTML.
     * @param blocks An array of blocks that should be serialized into HTML.
     * @returns The blocks, serialized as an HTML string.
     */
    blocksToHTMLLossy(blocks: Block<BSchema, ISchema, SSchema>[]): Promise<string>;
    /**
     * Serializes blocks into an HTML string in the format that it would be rendered by the editor.
     *
     * Use this method if you want to server-side render HTML (for example, a blog post that has been edited in BlockNote)
     * and serve it to users without loading the editor on the client (i.e.: displaying the blog post)
     */
    blocksToBlockNoteStyleHTML(blocks: Block<BSchema, ISchema, SSchema>[]): Promise<string>;
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
    blocksToMarkdownLossy(blocks: Block<BSchema, ISchema, SSchema>[]): Promise<string>;
    /**
     * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
     * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
     * as text.
     * @param markdown The Markdown string to parse blocks from.
     * @returns The blocks parsed from the Markdown string.
     */
    tryParseMarkdownToBlocks(markdown: string): Promise<Block<BSchema, ISchema, SSchema>[]>;
}
