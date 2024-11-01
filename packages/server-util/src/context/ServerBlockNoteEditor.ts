import {
  Block,
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
  blockToNode,
  blocksToMarkdown,
  createExternalHTMLExporter,
  createInternalHTMLSerializer,
  nodeToBlock,
} from "@blocknote/core";

import { BlockNoteViewRaw } from "@blocknote/react";
import { Node } from "@tiptap/pm/model";
import * as jsdom from "jsdom";
import * as React from "react";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  prosemirrorToYDoc,
  prosemirrorToYXmlFragment,
  yXmlFragmentToProseMirrorRootNode,
} from "y-prosemirror";
import type * as Y from "yjs";

/**
 * Use the ServerBlockNoteEditor to interact with BlockNote documents in a server (nodejs) environment.
 */
export class ServerBlockNoteEditor<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
> {
  /**
   * Internal BlockNoteEditor (not recommended to use directly, use the methods of this class instead)
   */
  public readonly editor: BlockNoteEditor<BSchema, ISchema, SSchema>;

  /**
   * We currently use a JSDOM instance to mock document and window methods
   *
   * A possible improvement could be to make this:
   * a) pluggable so other shims can be used as well
   * b) obsolete, but for this all blocks should be React based and we need to remove all references to document / window
   *    from the core / react package. (and even then, it's likely some custom blocks would still use document / window methods)
   */
  private jsdom = new jsdom.JSDOM();

  /**
   * Calls a function with mocking window and document using JSDOM
   *
   * We could make this obsolete by passing in a document / window object to the render / serialize methods of Blocks
   */
  public async _withJSDOM<T>(fn: () => Promise<T>) {
    const prevWindow = globalThis.window;
    const prevDocument = globalThis.document;
    globalThis.document = this.jsdom.window.document;
    (globalThis as any).window = this.jsdom.window;
    (globalThis as any).window.__TEST_OPTIONS = (
      prevWindow as any
    )?.__TEST_OPTIONS;
    try {
      return await fn();
    } finally {
      globalThis.document = prevDocument;
      globalThis.window = prevWindow;
    }
  }

  public static create<
    BSchema extends BlockSchema = DefaultBlockSchema,
    ISchema extends InlineContentSchema = DefaultInlineContentSchema,
    SSchema extends StyleSchema = DefaultStyleSchema
  >(options: Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>> = {}) {
    return new ServerBlockNoteEditor(options) as ServerBlockNoteEditor<
      BSchema,
      ISchema,
      SSchema
    >;
  }

  protected constructor(
    options: Partial<BlockNoteEditorOptions<any, any, any>>
  ) {
    this.editor = BlockNoteEditor.create({
      ...options,
      _headless: true,
    });
  }

  /** PROSEMIRROR / BLOCKNOTE conversions */

  /**
   * Turn Prosemirror JSON to BlockNote style JSON
   * @param json Prosemirror JSON
   * @returns BlockNote style JSON
   */
  public _prosemirrorNodeToBlocks(pmNode: Node) {
    const blocks: Block<BSchema, InlineContentSchema, StyleSchema>[] = [];

    // note, this code is similar to editor.document
    pmNode.firstChild!.descendants((node) => {
      blocks.push(
        nodeToBlock(
          node,
          this.editor.schema.blockSchema,
          this.editor.schema.inlineContentSchema,
          this.editor.schema.styleSchema
        )
      );

      return false;
    });

    return blocks;
  }

  /**
   * Turn Prosemirror JSON to BlockNote style JSON
   * @param json Prosemirror JSON
   * @returns BlockNote style JSON
   */
  public _prosemirrorJSONToBlocks(json: any) {
    // note: theoretically this should also be possible without creating prosemirror nodes,
    // but this is definitely the easiest way
    const doc = this.editor.pmSchema.nodeFromJSON(json);
    return this._prosemirrorNodeToBlocks(doc);
  }

  /**
   * Turn BlockNote JSON to Prosemirror node / state
   * @param blocks BlockNote blocks
   * @returns Prosemirror root node
   */
  public _blocksToProsemirrorNode(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[]
  ) {
    const pmNodes = blocks.map((b) =>
      blockToNode(b, this.editor.pmSchema, this.editor.schema.styleSchema)
    );

    const doc = this.editor.pmSchema.topNodeType.create(
      null,
      this.editor.pmSchema.nodes["blockGroup"].create(null, pmNodes)
    );
    return doc;
  }

  /** YJS / BLOCKNOTE conversions */

  /**
   * Turn a Y.XmlFragment collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
   * @returns BlockNote document (BlockNote style JSON of all blocks)
   */
  public yXmlFragmentToBlocks(xmlFragment: Y.XmlFragment) {
    const pmNode = yXmlFragmentToProseMirrorRootNode(
      xmlFragment,
      this.editor.pmSchema
    );
    return this._prosemirrorNodeToBlocks(pmNode);
  }

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
  public blocksToYXmlFragment(
    blocks: Block<BSchema, ISchema, SSchema>[],
    xmlFragment?: Y.XmlFragment
  ) {
    return prosemirrorToYXmlFragment(
      this._blocksToProsemirrorNode(blocks),
      xmlFragment
    );
  }

  /**
   * Turn a Y.Doc collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
   * @returns BlockNote document (BlockNote style JSON of all blocks)
   */
  public yDocToBlocks(ydoc: Y.Doc, xmlFragment = "prosemirror") {
    return this.yXmlFragmentToBlocks(ydoc.getXmlFragment(xmlFragment));
  }

  /**
   * This can be used when importing existing content to Y.Doc for the first time,
   * note that this should not be used to rehydrate a Y.Doc from a database once
   * collaboration has begun as all history will be lost
   *
   * @param blocks
   */
  public blocksToYDoc(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[],
    xmlFragment = "prosemirror"
  ) {
    return prosemirrorToYDoc(
      this._blocksToProsemirrorNode(blocks),
      xmlFragment
    );
  }

  /** HTML / BLOCKNOTE conversions */

  /**
   * Exports blocks into a simplified HTML string. To better conform to HTML standards, children of blocks which aren't list
   * items are un-nested in the output HTML.
   *
   * @param blocks An array of blocks that should be serialized into HTML.
   * @returns The blocks, serialized as an HTML string.
   */
  public async blocksToHTMLLossy(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[]
  ): Promise<string> {
    return this._withJSDOM(async () => {
      const exporter = createExternalHTMLExporter(
        this.editor.pmSchema,
        this.editor
      );

      return exporter.exportBlocks(blocks, {
        document: this.jsdom.window.document,
      });
    });
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
    return this._withJSDOM(async () => {
      const exporter = createInternalHTMLSerializer(
        this.editor.pmSchema,
        this.editor
      );

      return exporter.serializeBlocks(blocks, {
        document: this.jsdom.window.document,
      });
    });
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
    return this._withJSDOM(() => {
      return this.editor.tryParseHTMLToBlocks(html);
    });
  }

  /** MARKDOWN / BLOCKNOTE conversions */

  /**
   * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
   * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
   * @param blocks An array of blocks that should be serialized into Markdown.
   * @returns The blocks, serialized as a Markdown string.
   */
  public async blocksToMarkdownLossy(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[]
  ): Promise<string> {
    return this._withJSDOM(async () => {
      return blocksToMarkdown(blocks, this.editor.pmSchema, this.editor, {
        document: this.jsdom.window.document,
      });
    });
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
    return this._withJSDOM(() => {
      return this.editor.tryParseMarkdownToBlocks(markdown);
    });
  }

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
  public async withReactContext<T>(comp: React.FC<any>, fn: () => Promise<T>) {
    return this._withJSDOM(async () => {
      const tmpRoot = createRoot(
        this.jsdom.window.document.createElement("div")
      );

      flushSync(() => {
        tmpRoot.render(
          createElement(
            comp,
            {},
            createElement(BlockNoteViewRaw<any, any, any>, {
              editor: this.editor,
            })
          )
        );
      });
      try {
        return await fn();
      } finally {
        tmpRoot.unmount();
      }
    });
  }
}
