var l = Object.defineProperty;
var h = (t, o, r) => o in t ? l(t, o, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[o] = r;
var i = (t, o, r) => h(t, typeof o != "symbol" ? o + "" : o, r);
import { BlockNoteEditor as u, nodeToBlock as T, blockToNode as p, createExternalHTMLExporter as w, createInternalHTMLSerializer as y, blocksToMarkdown as k } from "@blocknote/core";
import { BlockNoteViewRaw as _ } from "@blocknote/react";
import * as S from "jsdom";
import { createElement as c } from "react";
import N, { flushSync as b } from "react-dom";
import { yXmlFragmentToProseMirrorRootNode as M, prosemirrorToYXmlFragment as O, prosemirrorToYDoc as B } from "y-prosemirror";
var n, s = N;
if (process.env.NODE_ENV === "production")
  n = s.createRoot, s.hydrateRoot;
else {
  var m = s.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  n = function(t, o) {
    m.usingClientEntryPoint = !0;
    try {
      return s.createRoot(t, o);
    } finally {
      m.usingClientEntryPoint = !1;
    }
  };
}
class a {
  constructor(o) {
    /**
     * Internal BlockNoteEditor (not recommended to use directly, use the methods of this class instead)
     */
    i(this, "editor");
    /**
     * We currently use a JSDOM instance to mock document and window methods
     *
     * A possible improvement could be to make this:
     * a) pluggable so other shims can be used as well
     * b) obsolete, but for this all blocks should be React based and we need to remove all references to document / window
     *    from the core / react package. (and even then, it's likely some custom blocks would still use document / window methods)
     */
    i(this, "jsdom", new S.JSDOM());
    this.editor = u.create({
      ...o,
      _headless: !0
    });
  }
  /**
   * Calls a function with mocking window and document using JSDOM
   *
   * We could make this obsolete by passing in a document / window object to the render / serialize methods of Blocks
   */
  async _withJSDOM(o) {
    const r = globalThis.window, e = globalThis.document;
    globalThis.document = this.jsdom.window.document, globalThis.window = this.jsdom.window, globalThis.window.__TEST_OPTIONS = r == null ? void 0 : r.__TEST_OPTIONS;
    try {
      return await o();
    } finally {
      globalThis.document = e, globalThis.window = r;
    }
  }
  static create(o = {}) {
    return new a(o);
  }
  /** PROSEMIRROR / BLOCKNOTE conversions */
  /**
   * Turn Prosemirror JSON to BlockNote style JSON
   * @param json Prosemirror JSON
   * @returns BlockNote style JSON
   */
  _prosemirrorNodeToBlocks(o) {
    const r = [];
    return o.firstChild.descendants((e) => (r.push(
      T(
        e,
        this.editor.schema.blockSchema,
        this.editor.schema.inlineContentSchema,
        this.editor.schema.styleSchema
      )
    ), !1)), r;
  }
  /**
   * Turn Prosemirror JSON to BlockNote style JSON
   * @param json Prosemirror JSON
   * @returns BlockNote style JSON
   */
  _prosemirrorJSONToBlocks(o) {
    const r = this.editor.pmSchema.nodeFromJSON(o);
    return this._prosemirrorNodeToBlocks(r);
  }
  /**
   * Turn BlockNote JSON to Prosemirror node / state
   * @param blocks BlockNote blocks
   * @returns Prosemirror root node
   */
  _blocksToProsemirrorNode(o) {
    const r = o.map(
      (d) => p(d, this.editor.pmSchema, this.editor.schema.styleSchema)
    );
    return this.editor.pmSchema.topNodeType.create(
      null,
      this.editor.pmSchema.nodes.blockGroup.create(null, r)
    );
  }
  /** YJS / BLOCKNOTE conversions */
  /**
   * Turn a Y.XmlFragment collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
   * @returns BlockNote document (BlockNote style JSON of all blocks)
   */
  yXmlFragmentToBlocks(o) {
    const r = M(
      o,
      this.editor.pmSchema
    );
    return this._prosemirrorNodeToBlocks(r);
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
  blocksToYXmlFragment(o, r) {
    return O(
      this._blocksToProsemirrorNode(o),
      r
    );
  }
  /**
   * Turn a Y.Doc collaborative doc into a BlockNote document (BlockNote style JSON of all blocks)
   * @returns BlockNote document (BlockNote style JSON of all blocks)
   */
  yDocToBlocks(o, r = "prosemirror") {
    return this.yXmlFragmentToBlocks(o.getXmlFragment(r));
  }
  /**
   * This can be used when importing existing content to Y.Doc for the first time,
   * note that this should not be used to rehydrate a Y.Doc from a database once
   * collaboration has begun as all history will be lost
   *
   * @param blocks
   */
  blocksToYDoc(o, r = "prosemirror") {
    return B(
      this._blocksToProsemirrorNode(o),
      r
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
  async blocksToHTMLLossy(o) {
    return this._withJSDOM(async () => w(
      this.editor.pmSchema,
      this.editor
    ).exportBlocks(o, {
      document: this.jsdom.window.document
    }));
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
  async blocksToFullHTML(o) {
    return this._withJSDOM(async () => y(
      this.editor.pmSchema,
      this.editor
    ).serializeBlocks(o, {
      document: this.jsdom.window.document
    }));
  }
  /**
   * Parses blocks from an HTML string. Tries to create `Block` objects out of any HTML block-level elements, and
   * `InlineNode` objects from any HTML inline elements, though not all element types are recognized. If BlockNote
   * doesn't recognize an HTML element's tag, it will parse it as a paragraph or plain text.
   * @param html The HTML string to parse blocks from.
   * @returns The blocks parsed from the HTML string.
   */
  async tryParseHTMLToBlocks(o) {
    return this._withJSDOM(() => this.editor.tryParseHTMLToBlocks(o));
  }
  /** MARKDOWN / BLOCKNOTE conversions */
  /**
   * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
   * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
   * @param blocks An array of blocks that should be serialized into Markdown.
   * @returns The blocks, serialized as a Markdown string.
   */
  async blocksToMarkdownLossy(o) {
    return this._withJSDOM(async () => k(o, this.editor.pmSchema, this.editor, {
      document: this.jsdom.window.document
    }));
  }
  /**
   * Creates a list of blocks from a Markdown string. Tries to create `Block` and `InlineNode` objects based on
   * Markdown syntax, though not all symbols are recognized. If BlockNote doesn't recognize a symbol, it will parse it
   * as text.
   * @param markdown The Markdown string to parse blocks from.
   * @returns The blocks parsed from the Markdown string.
   */
  async tryParseMarkdownToBlocks(o) {
    return this._withJSDOM(() => this.editor.tryParseMarkdownToBlocks(o));
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
  async withReactContext(o, r) {
    return this._withJSDOM(async () => {
      const e = n(
        this.jsdom.window.document.createElement("div")
      );
      b(() => {
        e.render(
          c(
            o,
            {},
            c(_, {
              editor: this.editor
            })
          )
        );
      });
      try {
        return await r();
      } finally {
        e.unmount();
      }
    });
  }
}
export {
  a as ServerBlockNoteEditor
};
//# sourceMappingURL=blocknote-server-util.js.map
