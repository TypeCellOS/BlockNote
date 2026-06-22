import {
  Block,
  BlockNoteSchema,
  BlockSchema,
  COLORS_DEFAULT,
  Exporter,
  ExporterOptions,
  InlineContentSchema,
  StyleSchema,
  StyledText,
} from "@blocknote/core";
import { strLit } from "./util.js";

type Options = ExporterOptions & {
  /** Document title — required for PDF/UA (also sets `DisplayDocTitle`). */
  title: string;
  /** Document author, written to PDF metadata. */
  author: string;
  /** BCP-47 language tag, e.g. "en". Sets the document's natural language. */
  lang: string;
  /**
   * Body font family, as Typst sees it (the font's internal family name). The
   * font must be loaded into the compiler. Defaults to BlockNote's "Inter 18pt".
   */
  fontFamily: string;
  /** Monospace font family for code. Defaults to "Geist Mono". */
  monoFontFamily: string;
  /** Base font size in points. Defaults to 12 (≈ BlockNote's 16px). */
  fontSize: number;
};

const LIST_KIND: Record<string, "bullet" | "numbered" | "check"> = {
  bulletListItem: "bullet",
  numberedListItem: "numbered",
  checkListItem: "check",
};

/**
 * Exports a BlockNote document to Typst markup. The markup compiles to a
 * tagged, PDF/UA-1-conformant PDF via the Typst engine (the compile step is
 * intentionally decoupled: this class only produces the `.typ` source, so it
 * runs anywhere — browser or node — with no renderer dependency).
 */
export class TypstExporter<
  B extends BlockSchema,
  S extends StyleSchema,
  I extends InlineContentSchema,
> extends Exporter<
  B,
  I,
  S,
  string, // RB - block  -> Typst markup
  string, // RI - inline -> Typst expression
  (inner: string) => string, // RS - style -> wrapper
  string // TS - styled text -> Typst expression
> {
  public readonly options: Options;

  public constructor(
    schema: BlockNoteSchema<B, I, S>,
    mappings: Exporter<
      NoInfer<B>,
      NoInfer<I>,
      NoInfer<S>,
      string,
      string,
      (inner: string) => string,
      string
    >["mappings"],
    options?: Partial<Options>,
  ) {
    const defaults = {
      title: "Document",
      author: "",
      lang: "en",
      fontFamily: "Inter 18pt",
      monoFontFamily: "Geist Mono",
      fontSize: 12,
      colors: COLORS_DEFAULT,
    } satisfies Partial<Options>;
    const newOptions = { ...defaults, ...options };
    super(schema, mappings, newOptions);
    this.options = newOptions;
  }

  /** Render a single styled-text run to a Typst expression. */
  public transformStyledText(styledText: StyledText<S>): string {
    const styles = styledText.styles as any;
    // `code` text is emitted as raw(...) instead of a plain string literal.
    let expr = styles.code
      ? `raw(${strLit(styledText.text)})`
      : strLit(styledText.text);
    for (const wrap of this.mapStyles(styledText.styles)) {
      expr = (wrap as (s: string) => string)(expr);
    }
    return expr;
  }

  /**
   * Transform a list of sibling blocks to Typst, grouping consecutive list
   * items into a single list()/enum() so the PDF tag tree is a proper L > LI.
   */
  public async transformBlocks(
    blocks: Block<B, I, S>[],
    nestingLevel = 0,
  ): Promise<string[]> {
    const out: string[] = [];
    let i = 0;
    while (i < blocks.length) {
      const b = blocks[i];
      const kind = LIST_KIND[b.type];

      if (kind) {
        const items: string[] = [];
        let start: number | undefined;
        while (i < blocks.length && LIST_KIND[blocks[i].type] === kind) {
          const item = blocks[i];
          if (kind === "numbered" && start === undefined) {
            start = (item.props as any).start ?? 1;
          }
          items.push(await this.renderListItem(item, nestingLevel));
          i++;
        }
        out.push(this.wrapList(kind, items, start));
        continue;
      }

      const children = await this.transformBlocks(b.children, nestingLevel + 1);
      const self = (await this.mapBlock(
        b as any,
        nestingLevel,
        0,
        [],
      )) as string;
      out.push(this.wrapBlock(b, self, children));
      i++;
    }
    return out;
  }

  private async renderListItem(
    block: Block<B, I, S>,
    nestingLevel: number,
  ): Promise<string> {
    const body = (await this.mapBlock(
      block as any,
      nestingLevel,
      0,
      [],
    )) as string;
    const children = await this.transformBlocks(
      block.children,
      nestingLevel + 1,
    );
    let content = body;
    if (block.type === "checkListItem") {
      const checked = (block.props as any)?.checked;
      content = "#" + strLit(checked ? "[x] " : "[ ] ") + content;
    }
    if (children.length) {
      // nested lists already carry their own indentation
      content += "\n" + children.join("\n\n");
    }
    return this.applyBlockProps(block.props as any, content);
  }

  private wrapList(
    kind: "bullet" | "numbered" | "check",
    items: string[],
    start?: number,
  ): string {
    const body = items.map((it) => `[${it}]`).join(",\n  ");
    if (kind === "numbered") {
      const startArg = start && start !== 1 ? `start: ${start},\n  ` : "";
      return `#enum(\n  ${startArg}${body}\n)`;
    }
    if (kind === "check") {
      return `#list(marker: none,\n  ${body}\n)`;
    }
    return `#list(\n  ${body}\n)`;
  }

  private wrapBlock(
    block: Block<B, I, S>,
    self: string,
    children: string[],
  ): string {
    let inner = self;
    if (children.length) {
      inner += "\n#pad(left: 1.5em)[\n" + children.join("\n\n") + "\n]";
    }
    return this.applyBlockProps(block.props as any, inner);
  }

  /** Apply block-level props (alignment, text/background color) as Typst wrappers. */
  private applyBlockProps(props: any, s: string): string {
    if (!s) {
      return s;
    }
    const colors = this.options.colors as any;
    const tc =
      props?.textColor && props.textColor !== "default"
        ? colors?.[props.textColor]?.text
        : undefined;
    const bc =
      props?.backgroundColor && props.backgroundColor !== "default"
        ? colors?.[props.backgroundColor]?.background
        : undefined;
    if (tc) {
      s = `#text(fill: rgb("${tc}"))[${s}]`;
    }
    if (bc) {
      s = `#block(fill: rgb("${bc}"), inset: 6pt, radius: 2pt, width: 100%)[${s}]`;
    }
    const align = props?.textAlignment;
    if (align === "right" || align === "center") {
      s = `#align(${align})[${s}]`;
    } else if (align === "justify") {
      s = `#par(justify: true)[${s}]`;
    }
    return s;
  }

  private preamble(): string {
    const { title, author, lang, fontFamily, monoFontFamily, fontSize } =
      this.options;
    return [
      `#set document(title: ${strLit(title)}, author: ${strLit(author)})`,
      `#set text(font: ${strLit(fontFamily)}, size: ${fontSize}pt, lang: ${strLit(
        lang,
      )})`,
      // Margins mirror the old react-pdf exporter (35 / 65 pt, larger bottom).
      `#set page(paper: "a4", margin: (top: 35pt, bottom: 65pt, x: 35pt))`,
      `#set par(leading: 0.75em, spacing: 1.1em, justify: false)`,
      `#set heading(numbering: none)`,
      // Heading scale mirrors the editor's h1–h6 em sizes (2 / 1.5 / 1.17 / 1 /
      // 0.83 / 0.67 of 16px), bold.
      `#show heading: set text(weight: 700)`,
      `#show heading.where(level: 1): set text(size: 24pt)`,
      `#show heading.where(level: 2): set text(size: 18pt)`,
      `#show heading.where(level: 3): set text(size: 14pt)`,
      `#show heading.where(level: 4): set text(size: 12pt)`,
      `#show heading.where(level: 5): set text(size: 10pt)`,
      `#show heading.where(level: 6): set text(size: 8pt)`,
      // Code: monospace, in a light boxed block.
      `#show raw: set text(font: ${strLit(monoFontFamily)})`,
      `#show raw.where(block: true): it => block(width: 100%, inset: 12pt, radius: 3pt, fill: luma(248), stroke: 0.5pt + luma(210), it)`,
      // Quote: grey text with a left rule.
      `#show quote.where(block: true): it => block(inset: (left: 12pt), stroke: (left: 2pt + rgb("#7D797A")), text(fill: rgb("#7D797A"), it.body))`,
      // Figure captions: smaller, muted.
      `#show figure.caption: set text(size: 9.6pt, fill: luma(110))`,
      // Links: BlockNote blue.
      `#show link: set text(fill: rgb("#0b6e99"))`,
    ].join("\n");
  }

  /** Convert a BlockNote document to a full Typst source string. */
  public async toTypst(blocks: Block<B, I, S>[]): Promise<string> {
    const body = (await this.transformBlocks(blocks)).join("\n\n");
    return this.preamble() + "\n\n" + body + "\n";
  }
}
