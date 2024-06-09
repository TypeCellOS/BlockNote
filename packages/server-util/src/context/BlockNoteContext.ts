import {
  Block,
  BlockSchema,
  BlockSchemaFromSpecs,
  BlockSpecs,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  HTMLToBlocks,
  InlineContentSchema,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  StyleSchema,
  StyleSchemaFromSpecs,
  StyleSpecs,
  blocksToMarkdown,
  createExternalHTMLExporter,
  createInternalHTMLSerializer,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  getBlockNoteExtensions,
  getBlockSchemaFromSpecs,
  getInlineContentSchemaFromSpecs,
  getStyleSchemaFromSpecs,
  markdownToBlocks,
  nodeToBlock,
} from "@blocknote/core";

import { getSchema } from "@tiptap/core";
import { Schema as PMSchema } from "@tiptap/pm/model";
import * as jsdom from "jsdom";
import * as Y from "yjs";
import { yXmlFragmentToProsemirrorJSON } from "../yjs";

export type BlockNoteEditorOptions<
  BSpecs extends BlockSpecs,
  ISpecs extends InlineContentSpecs,
  SSpecs extends StyleSpecs
> = {
  blockSpecs: BSpecs;

  styleSpecs: SSpecs;

  inlineContentSpecs: ISpecs;
};

// TODO: naming, what's a good name for this?
export class BlockNoteContext<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
> {
  public readonly blockSchema: BSchema;
  public readonly inlineContentSchema: ISchema;
  public readonly styleSchema: SSchema;

  public readonly blockImplementations: BlockSpecs;
  public readonly inlineContentImplementations: InlineContentSpecs;
  public readonly styleImplementations: StyleSpecs;

  public readonly pmSchema: PMSchema;

  public static create<
    BSpecs extends BlockSpecs = typeof defaultBlockSpecs,
    ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
    SSpecs extends StyleSpecs = typeof defaultStyleSpecs
  >(options: Partial<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>> = {}) {
    return new BlockNoteContext(options) as BlockNoteContext<
      BlockSchemaFromSpecs<BSpecs>,
      InlineContentSchemaFromSpecs<ISpecs>,
      StyleSchemaFromSpecs<SSpecs>
    >;
  }

  private constructor(options: Partial<BlockNoteEditorOptions<any, any, any>>) {
    // apply defaults
    const newOptions = {
      blockSpecs: options.blockSpecs || defaultBlockSpecs,
      styleSpecs: options.styleSpecs || defaultStyleSpecs,
      inlineContentSpecs:
        options.inlineContentSpecs || defaultInlineContentSpecs,
      ...options,
    };

    this.blockSchema = getBlockSchemaFromSpecs(newOptions.blockSpecs);
    this.inlineContentSchema = getInlineContentSchemaFromSpecs(
      newOptions.inlineContentSpecs
    );
    this.styleSchema = getStyleSchemaFromSpecs(newOptions.styleSpecs);
    this.blockImplementations = newOptions.blockSpecs;
    this.inlineContentImplementations = newOptions.inlineContentSpecs;
    this.styleImplementations = newOptions.styleSpecs;

    const exts = getBlockNoteExtensions({
      blockSpecs: newOptions.blockSpecs,
      inlineContentSpecs: newOptions.inlineContentSpecs,
      styleSpecs: newOptions.styleSpecs,
      editor: {} as any, // TODO, how to go about this?
      domAttributes: {} as any, // TODO, necessary / can we remove this?
      trailingBlock: false,
    });

    this.pmSchema = getSchema(exts);
  }

  // TODO: is there a way to do this without creating prosemirror nodes?
  // This would reduce quite some dependencies (at least for this operation), as we wouldn't have to instantiate the schema and extensions
  // i.e.: can we directly transform the JSON to blocknote JSON instead?
  public prosemirrorJSONToBlocks(json: any) {
    const doc = this.pmSchema.nodeFromJSON(json);

    const blocks: Block<BSchema, InlineContentSchema, StyleSchema>[] = [];

    // duplicate from editor.topLevelBlocks
    doc.firstChild!.descendants((node) => {
      blocks.push(
        nodeToBlock(
          node,
          this.blockSchema,
          this.inlineContentSchema,
          this.styleSchema
        )
      );

      return false;
    });

    return blocks;
  }

  public yDocToBlocks(ydoc: Y.Doc, xmlFragment = "prosemirror") {
    return this.yXmlFragmentToBlocks(ydoc.getXmlFragment(xmlFragment));
  }

  public yXmlFragmentToBlocks(xmlFragment: Y.XmlFragment) {
    const pmJSON = yXmlFragmentToProsemirrorJSON(xmlFragment);
    return this.prosemirrorJSONToBlocks(pmJSON);
  }

  /**
   * Serializes blocks into an HTML string. To better conform to HTML standards, children of blocks which aren't list
   * items are un-nested in the output HTML.
   * @param blocks An array of blocks that should be serialized into HTML.
   * @returns The blocks, serialized as an HTML string.
   */
  public async blocksToHTMLLossy(
    blocks: Block<BSchema, ISchema, SSchema>[]
  ): Promise<string> {
    const dom = new jsdom.JSDOM();

    globalThis.document = dom.window.document;
    const exporter = createExternalHTMLExporter(this.pmSchema, this as any); // TODO: passing blockNoteContext as editor might cause issues

    try {
      return exporter.exportBlocks(blocks as any, {
        document: dom.window.document,
      });
    } finally {
      globalThis.document = undefined as any;
    }
  }

  /**
   * Serializes blocks into an HTML string in the format that it would be rendered by the editor.
   *
   * Use this method if you want to server-side render HTML (for example, a blog post that has been edited in BlockNote)
   * and serve it to users without loading the editor on the client (i.e.: displaying the blog post)
   */
  public async blocksToBlockNoteStyleHTML(
    blocks: Block<BSchema, ISchema, SSchema>[]
  ): Promise<string> {
    const dom = new jsdom.JSDOM();

    globalThis.document = dom.window.document;

    const exporter = createInternalHTMLSerializer(this.pmSchema, this as any);
    try {
      return exporter.serializeBlocks(blocks as any, {
        document: dom.window.document,
      }); // TODO: passing blockNoteContext as editor might cause issues
    } finally {
      globalThis.document = undefined as any;
    }
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
      this.blockSchema,
      this.inlineContentSchema,
      this.styleSchema,
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
    blocks: Block<BSchema, ISchema, SSchema>[]
  ): Promise<string> {
    const dom = new jsdom.JSDOM();

    globalThis.document = dom.window.document;

    try {
      return blocksToMarkdown(blocks, this.pmSchema, this as any, {
        document: dom.window.document,
      }); // TODO: passing blockNoteContext as editor might cause issues
    } finally {
      globalThis.document = undefined as any;
    }
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
      this.blockSchema,
      this.inlineContentSchema,
      this.styleSchema,
      this.pmSchema
    );
  }
}
