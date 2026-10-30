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
  blocksToMarkdown,
  createExternalHTMLExporter,
  createInternalHTMLSerializer,
  docToBlocks,
} from "@blocknote/core";
import {
  _blocksToProsemirrorNode as blocksToProsemirrorNodeUtil,
  _prosemirrorJSONToBlocks as prosemirrorJSONToBlocksUtil,
  blocksToYDoc as blocksToYDocUtil,
  blocksToYXmlFragment as blocksToYXmlFragmentUtil,
  yDocToBlocks as yDocToBlocksUtil,
  yXmlFragmentToBlocks as yXmlFragmentToBlocksUtil,
} from "@blocknote/core/yjs";

import { BlockNoteViewRaw } from "@blocknote/react";
import { Node } from "@tiptap/pm/model";
import * as React from "react";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type * as Y from "yjs";

function getDOMDocument(document?: Document): Document {
  document ??= globalThis.document;
  const window = document?.defaultView;
  if (!window) {
    throw new Error(
      "ServerBlockNoteEditor requires a document with a window (defaultView). Pass a document, such as getDocument() from @blocknote/server-util/dom, or define matching window and document globals.",
    );
  }

  // React can access globals after an export returns. Bind once, never swap.
  if (
    typeof globalThis.window === "undefined" &&
    typeof globalThis.document === "undefined"
  ) {
    Object.assign(globalThis, { window, document });
  }
  if (globalThis.window !== window || globalThis.document !== document) {
    throw new Error(
      "ServerBlockNoteEditor found partial or conflicting DOM globals. Use one document consistently, or remove partial or conflicting globals before initializing the rendering environment.",
    );
  }
  return document;
}

/**
 * Use the ServerBlockNoteEditor to interact with BlockNote documents in a server (nodejs) environment.
 */
export class ServerBlockNoteEditor<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> {
  /**
   * Internal BlockNoteEditor (not recommended to use directly, use the methods of this class instead)
   */
  public readonly editor: BlockNoteEditor<BSchema, ISchema, SSchema>;

  /**
   * Calls a function with the supplied document, falling back to the global DOM.
   * Nested and concurrent exports use the same globals without swapping them.
   */
  public async _withDOM<T>(fn: (document: Document) => Promise<T>) {
    return fn(getDOMDocument(this.document));
  }

  public static create<
    BSchema extends BlockSchema = DefaultBlockSchema,
    ISchema extends InlineContentSchema = DefaultInlineContentSchema,
    SSchema extends StyleSchema = DefaultStyleSchema,
  >(
    options: Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>> = {},
    document?: Document,
  ) {
    return new ServerBlockNoteEditor(
      options,
      document,
    ) as ServerBlockNoteEditor<BSchema, ISchema, SSchema>;
  }

  protected constructor(
    options: Partial<BlockNoteEditorOptions<any, any, any>>,
    private readonly document?: Document,
  ) {
    this.editor = BlockNoteEditor.create(options) as any;
  }

  /** PROSEMIRROR / BLOCKNOTE conversions */

  /**
   * Turn Prosemirror JSON to BlockNote style JSON
   * @param json Prosemirror JSON
   * @returns BlockNote style JSON
   */
  public _prosemirrorNodeToBlocks(pmNode: Node) {
    return docToBlocks(pmNode);
  }

  /**
   * Turn Prosemirror JSON to BlockNote style JSON
   * @param json Prosemirror JSON
   * @returns BlockNote style JSON
   */
  public _prosemirrorJSONToBlocks(json: any) {
    return prosemirrorJSONToBlocksUtil(this.editor, json);
  }

  /**
   * Turn BlockNote JSON to Prosemirror node / state
   * @param blocks BlockNote blocks
   * @returns Prosemirror root node
   */
  public _blocksToProsemirrorNode(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[],
  ) {
    return blocksToProsemirrorNodeUtil(this.editor, blocks);
  }

  /** YJS / BLOCKNOTE conversions */

  /**
   * Turn a Y.XmlFragment collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
   * @returns BlockNote document (BlockNote style JSON of all blocks)
   */
  public yXmlFragmentToBlocks(xmlFragment: Y.XmlFragment) {
    return yXmlFragmentToBlocksUtil(this.editor, xmlFragment);
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
    xmlFragment?: Y.XmlFragment,
  ) {
    return blocksToYXmlFragmentUtil(this.editor, blocks, xmlFragment);
  }

  /**
   * Turn a Y.Doc collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
   * @returns BlockNote document (BlockNote style JSON of all blocks)
   */
  public yDocToBlocks(ydoc: Y.Doc, xmlFragment = "prosemirror") {
    return yDocToBlocksUtil(this.editor, ydoc, xmlFragment);
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
    xmlFragment = "prosemirror",
  ) {
    return blocksToYDocUtil(this.editor, blocks, xmlFragment);
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
    blocks: PartialBlock<BSchema, ISchema, SSchema>[],
  ): Promise<string> {
    return this._withDOM(async (document) => {
      const exporter = createExternalHTMLExporter(
        this.editor.pmSchema,
        this.editor,
      );

      return exporter.exportBlocks(blocks, {
        document,
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
    blocks: PartialBlock<BSchema, ISchema, SSchema>[],
  ): Promise<string> {
    return this._withDOM(async (document) => {
      const exporter = createInternalHTMLSerializer(
        this.editor.pmSchema,
        this.editor,
      );

      return exporter.serializeBlocks(blocks, {
        document,
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
    html: string,
  ): Promise<Block<BSchema, ISchema, SSchema>[]> {
    return this._withDOM(async () => {
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
    blocks: PartialBlock<BSchema, ISchema, SSchema>[],
  ): Promise<string> {
    return this._withDOM(async (document) => {
      return blocksToMarkdown(blocks, this.editor.pmSchema, this.editor, {
        document,
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
    markdown: string,
  ): Promise<Block<BSchema, ISchema, SSchema>[]> {
    return this._withDOM(async () => {
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
    return this._withDOM(async (document) => {
      const tmpRoot = createRoot(document.createElement("div"));

      flushSync(() => {
        tmpRoot.render(
          createElement(
            comp,
            {},
            createElement(BlockNoteViewRaw<any, any, any>, {
              editor: this.editor,
              // Skip UI components to avoid rendering them in the server environment
              formattingToolbar: false,
              linkToolbar: false,
              slashMenu: false,
              emojiPicker: false,
              sideMenu: false,
              filePanel: false,
              tableHandles: false,
              comments: false,
            }),
          ),
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
