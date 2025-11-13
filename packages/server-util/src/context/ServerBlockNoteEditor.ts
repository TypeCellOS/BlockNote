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

/**
 * Globals that a DOM shim should provide
 */
export type DomGlobals = { window: any; document: any };

/**
 * Interface for DOM shims that can be used with ServerBlockNoteEditor.
 *
 * Example with jsdom:
 * ```ts
 * import { JSDOM } from 'jsdom';
 * const jsdomShim: DomShim = {
 *   acquire() {
 *     const dom = new JSDOM();
 *     return { window: dom.window as any, document: dom.window.document as any };
 *   },
 * };
 * ```
 *
 * Example with happydom:
 * ```ts
 * import { Window } from 'happy-dom';
 * const happydomShim: DomShim = {
 *   acquire() {
 *     const window = new Window();
 *     return { window: window as any, document: window.document as any };
 *   },
 * };
 * ```
 */
export interface DomShim {
  /**
   * Acquire DOM globals (window and document) for use during the operation.
   * Can return synchronously or asynchronously.
   */
  acquire(): Promise<DomGlobals> | DomGlobals;
  /**
   * Optional cleanup method called after the operation completes.
   * Can be synchronous or asynchronous.
   */
  release?(globals: DomGlobals): Promise<void> | void;
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
   * Optional DOM shim for providing window and document in server environments.
   * If not provided, methods that require DOM will throw errors when accessed.
   */
  private readonly domShim?: DomShim;

  /**
   * Calls a function with DOM globals (window and document) provided by the shim.
   * If no shim is provided and globals don't exist, throws errors on access rather than immediately.
   * The callback receives document and window as arguments for easier access.
   */
  public async _withDOM<T>(
    fn: (globals: DomGlobals) => Promise<T>,
  ): Promise<T> {
    const prevWindow = globalThis.window;
    const prevDocument = globalThis.document;

    let acquiredGlobals: DomGlobals | undefined;
    let document: any;
    let window: any;

    if (this.domShim) {
      const result = this.domShim.acquire();
      acquiredGlobals = result instanceof Promise ? await result : result;
      document = acquiredGlobals.document;
      window = acquiredGlobals.window;
      globalThis.document = document;
      (globalThis as any).window = window;
      // Preserve __TEST_OPTIONS if it existed
      (globalThis as any).window.__TEST_OPTIONS = (
        prevWindow as any
      )?.__TEST_OPTIONS;
    } else if (prevWindow && prevDocument) {
      // Globals already exist, use them as-is
      document = prevDocument;
      window = prevWindow;
    } else {
      // No shim and no globals - create proxy objects that throw on access
      const errorMessage =
        "DOM globals (window/document) are required but not available. " +
        "Please provide a DomShim when creating ServerBlockNoteEditor, " +
        "or ensure window/document are available globally.";

      const throwingProxy = new Proxy(
        {},
        {
          get() {
            throw new Error(errorMessage);
          },
          set() {
            throw new Error(errorMessage);
          },
          has() {
            throw new Error(errorMessage);
          },
          ownKeys() {
            throw new Error(errorMessage);
          },
          getOwnPropertyDescriptor() {
            throw new Error(errorMessage);
          },
        },
      );

      document = throwingProxy as any;
      window = throwingProxy as any;
      globalThis.document = document;
      (globalThis as any).window = window;
    }

    try {
      return await fn({ document, window });
    } finally {
      globalThis.document = prevDocument;
      globalThis.window = prevWindow;

      if (this.domShim && acquiredGlobals && this.domShim.release) {
        const releaseResult = this.domShim.release(acquiredGlobals);
        if (releaseResult instanceof Promise) {
          await releaseResult;
        }
      }
    }
  }

  public static create<
    BSchema extends BlockSchema = DefaultBlockSchema,
    ISchema extends InlineContentSchema = DefaultInlineContentSchema,
    SSchema extends StyleSchema = DefaultStyleSchema,
  >(
    options: Partial<BlockNoteEditorOptions<BSchema, ISchema, SSchema>> = {},
    domShim?: DomShim,
  ) {
    return new ServerBlockNoteEditor(options, domShim) as ServerBlockNoteEditor<
      BSchema,
      ISchema,
      SSchema
    >;
  }

  protected constructor(
    options: Partial<BlockNoteEditorOptions<any, any, any>>,
    domShim?: DomShim,
  ) {
    this.editor = BlockNoteEditor.create(options) as any;
    this.domShim = domShim;
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
    return this._withDOM(async ({ document }) => {
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
    return this._withDOM(async ({ document }) => {
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
    return this._withDOM(async ({ document }) => {
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
    return this._withDOM(async ({ document }) => {
      const tmpRoot = createRoot(document.createElement("div"));

      flushSync(() => {
        tmpRoot.render(
          createElement(
            comp,
            {},
            createElement(BlockNoteViewRaw<any, any, any>, {
              editor: this.editor,
            }),
          ),
        );
      });
      try {
        return await fn();
      } finally {
        tmpRoot.unmount();
        await new Promise((resolve) => setTimeout(resolve, 3));
      }
    });
  }
}
