import { createExternalHTMLExporter } from "../../api/exporters/html/externalHTMLExporter.js";
import { createInternalHTMLSerializer } from "../../api/exporters/html/internalHTMLSerializer.js";
import { blocksToMarkdown } from "../../api/exporters/markdown/markdownExporter.js";
import { HTMLToBlocks } from "../../api/parsers/html/parseHTML.js";
import {
  markdownToBlocks,
  markdownToHTML,
} from "../../api/parsers/markdown/parseMarkdown.js";
import {
  Block,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { BlockNoteEditor } from "../BlockNoteEditor.js";

export class ExportManager<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> {
  constructor(private editor: BlockNoteEditor<BSchema, ISchema, SSchema>) {}

  /**
   * Exports blocks into a simplified HTML string. To better conform to HTML standards, children of blocks which aren't list
   * items are un-nested in the output HTML.
   *
   * @param blocks An array of blocks that should be serialized into HTML.
   * @returns The blocks, serialized as an HTML string.
   */
  public blocksToHTMLLossy(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[] = this.editor.document,
  ): string {
    const exporter = createExternalHTMLExporter(
      this.editor.pmSchema,
      this.editor,
    );
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
  public blocksToFullHTML(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[],
  ): string {
    const exporter = createInternalHTMLSerializer(
      this.editor.pmSchema,
      this.editor,
    );
    return exporter.serializeBlocks(blocks, {});
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
    return HTMLToBlocks(html, this.editor.pmSchema);
  }

  /**
   * Serializes blocks into a Markdown string. The output is simplified as Markdown does not support all features of
   * BlockNote - children of blocks which aren't list items are un-nested and certain styles are removed.
   * @param blocks An array of blocks that should be serialized into Markdown.
   * @returns The blocks, serialized as a Markdown string.
   */
  public blocksToMarkdownLossy(
    blocks: PartialBlock<BSchema, ISchema, SSchema>[] = this.editor.document,
  ): string {
    return blocksToMarkdown(blocks, this.editor.pmSchema, this.editor, {});
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
    return markdownToBlocks(markdown, this.editor.pmSchema);
  }

  /**
   * Paste HTML into the editor. Defaults to converting HTML to BlockNote HTML.
   * @param html The HTML to paste.
   * @param raw Whether to paste the HTML as is, or to convert it to BlockNote HTML.
   */
  public pasteHTML(html: string, raw = false) {
    let htmlToPaste = html;
    if (!raw) {
      const blocks = this.tryParseHTMLToBlocks(html);
      htmlToPaste = this.blocksToFullHTML(blocks);
    }
    if (!htmlToPaste) {
      return;
    }
    this.editor.prosemirrorView?.pasteHTML(htmlToPaste);
  }

  /**
   * Paste text into the editor. Defaults to interpreting text as markdown.
   * @param text The text to paste.
   */
  public pasteText(text: string) {
    return this.editor.prosemirrorView?.pasteText(text);
  }

  /**
   * Paste markdown into the editor.
   * @param markdown The markdown to paste.
   */
  public pasteMarkdown(markdown: string) {
    const html = markdownToHTML(markdown);
    return this.pasteHTML(html);
  }
}
