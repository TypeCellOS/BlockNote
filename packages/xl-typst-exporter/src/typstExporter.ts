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
import { corsProxyResolveFileUrl } from "@shared/api/corsProxy.js";
import {
  CHECKBOX_MARKER_DEFS,
  checkboxMarker,
  colorHex,
  strLit,
} from "./util.js";

/**
 * Constructor options: rendering/theme config that's reused across exports
 * (mirrors how the other exporters scope their constructor options). Per-document
 * options live in {@link TypstDocumentOptions} and are passed to `toTypst`.
 */
export type TypstExporterOptions = ExporterOptions & {
  /**
   * Body font family, as Typst sees it (the font's internal family name). The
   * font must be loaded into the compiler. Defaults to BlockNote's "Inter 18pt".
   *
   * Pass an array to declare a fallback list (applied in order) — the way to
   * support scripts the primary font doesn't cover, e.g. CJK: load the extra
   * font's bytes via the compile options' `fonts` and list its family here,
   * `["Inter 18pt", "Noto Sans SC"]`. (Mirrors the react-pdf exporter's
   * `fonts` + `fontFamily` options for CJK.)
   */
  fontFamily: string | string[];
  /** Monospace font family for code. Defaults to "Geist Mono". */
  monoFontFamily: string;
  /** Base font size in points. Defaults to 12 (≈ BlockNote's 16px). */
  fontSize: number;
  /**
   * Emoji font family (the font's internal name), added as a fallback after
   * {@link fontFamily}. Listing it explicitly makes a run of emoji shape as a
   * single unit in that font — so multi-codepoint sequences (ZWJ, e.g.
   * `🚶‍♀️`) form their combined glyph instead of breaking apart under
   * Typst's per-glyph automatic fallback. The bytes must still be loaded into
   * the compiler via the `emojiFont` compile option. Optional.
   */
  emojiFontFamily?: string;
};

/**
 * Per-document options applied at export time, passed to `toTypst(blocks, ...)`.
 * Mirrors how the other exporters take title/author/header/footer at the export
 * call rather than in the constructor.
 */
export type TypstDocumentOptions = {
  /**
   * Document title — required for PDF/UA (also sets `DisplayDocTitle`).
   * @default "Document"
   */
  title?: string;
  /**
   * Document author, written to PDF metadata.
   * @default ""
   */
  author?: string;
  /**
   * BCP-47 language tag, e.g. "en". Sets the document's natural language.
   * @default "en"
   */
  lang?: string;
  /**
   * Typst paper name, e.g. `"a4"`, `"us-letter"`.
   * @default "a4"
   */
  paper?: string;
  /**
   * Page margin as a Typst length, e.g. `"48pt"`, `"2cm"`.
   * @default "48pt" (≈ the editor's horizontal padding applied to A4)
   */
  margin?: string;
  /**
   * Raw Typst markup placed in the running page header, e.g. `"My Document"` or
   * `"#context counter(page).display()"`. Typst tags it as a pagination
   * artifact, so it stays out of the document's reading order. Omitted when
   * undefined.
   */
  header?: string;
  /** Raw Typst markup placed in the running page footer. Omitted when undefined. */
  footer?: string;
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
  public readonly options: TypstExporterOptions;

  /**
   * Image bytes registered so far, keyed by content key (source URL or e.g.
   * a diagram source). Typst can't inline raster bytes, so each image is
   * referenced by a virtual path in the markup and its bytes must be mapped
   * into the compiler's filesystem (see {@link assetFiles}; e.g.
   * @blocknote/xl-pdf-exporter's `PDFExporter.toBytes` does this).
   * Append-only for the exporter's lifetime - which keeps
   * overlapping exports and pre-registered assets safe (paths never dangle
   * or get reassigned). The flip side: re-exporting *changing* content on
   * one long-lived exporter accumulates every asset it has ever rendered
   * (e.g. one SVG per diagram edit), so create a fresh exporter per export
   * instead - construction is cheap. Mirrors the ODT exporter's picture
   * collection.
   */
  private readonly assets = new Map<
    string,
    { path: string; bytes: Uint8Array }
  >();

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
    options?: Partial<TypstExporterOptions>,
  ) {
    // Defaulted per key (not a bare spread of `options` over defaults):
    // `Partial` admits explicitly-undefined entries - typically a caller
    // forwarding its own optional, e.g. `{ colors: maybeColors }` - and a
    // spread would let those erase the default, crashing later lookups like
    // `options.colors[name]` whose types promise a value.
    const newOptions = {
      ...options,
      fontFamily: options?.fontFamily ?? "Inter 18pt",
      monoFontFamily: options?.monoFontFamily ?? "Geist Mono",
      fontSize: options?.fontSize ?? 12,
      colors: options?.colors ?? COLORS_DEFAULT,
      // Proxy cross-origin image fetches so any host works in the browser, not
      // only CORS-enabled ones (mirrors the pdf/docx exporters).
      resolveFileUrl: options?.resolveFileUrl ?? corsProxyResolveFileUrl,
    };
    super(schema, mappings, newOptions);
    this.options = newOptions;
  }

  /**
   * The resolved body font list, in fallback order - `fontFamily` normalized
   * to an array with `emojiFontFamily` appended last, so emoji runs (incl.
   * ZWJ sequences) shape as a unit in that font rather than per-glyph
   * auto-fallback. The single source for font resolution: the preamble and
   * font-sensitive mappings (e.g. diagram labels) must agree on it.
   */
  public get fontFamilies(): string[] {
    const { fontFamily, emojiFontFamily } = this.options;
    const families = Array.isArray(fontFamily) ? [...fontFamily] : [fontFamily];
    if (emojiFontFamily) {
      families.push(emojiFontFamily);
    }
    return families;
  }

  /** Render a single styled-text run to a Typst expression. */
  public transformStyledText(styledText: StyledText<S>): string {
    const styles = styledText.styles;
    // `code` is applied here (not via the style mapping, whose `code` entry is
    // a no-op) because `raw()` takes a *string*, so it must wrap the innermost
    // text literal — `raw("x")` is valid, `raw(strong("x"))` is not. Style-key
    // iteration order isn't guaranteed, so doing it before the wrapper loop is
    // the only way to keep `raw()` underneath wrappers like `strong(...)`.
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
        // Only the first item's `start` matters (matching the editor's
        // numbering); the traversal is generic over the schema, so the prop
        // read is shaped. `wrapList` treats undefined as the default.
        const start =
          kind === "numbered"
            ? (b.props as { start?: number }).start
            : undefined;
        const items: string[] = [];
        while (i < blocks.length && LIST_KIND[blocks[i].type] === kind) {
          items.push(await this.renderListItem(blocks[i], nestingLevel));
          i++;
        }
        out.push(this.wrapList(kind, items, start));
        continue;
      }

      // A columnList lays its column children out side-by-side. transformBlocks
      // owns this (rather than the block mapping) because the columns must
      // become grid cells, not the generic indented-children wrapper.
      if (b.type === "columnList") {
        out.push(await this.renderColumnList(b, nestingLevel));
        i++;
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
    if (children.length) {
      // As in `wrapBlock`: the item's alignment wraps its own body only, so
      // nested children keep their own alignment (matching the editor).
      content = this.applyOwnAlignment(block.props, content);
      // Separate the item body from its children with a blank line so a child
      // *paragraph* becomes its own block (a single "\n" is only a soft break in
      // Typst markup); nested lists carry their own indentation either way.
      content += "\n\n" + children.join("\n\n");
    }
    if (block.type === "checkListItem") {
      const checked = (block.props as { checked?: boolean }).checked;
      // Use the checkbox as the item's list marker (so wrapped lines hang under
      // the text) via a single-item inner list; wrapList groups these under one
      // outer marker-less list, keeping a proper L > LI structure. The body and
      // any nested children are wrapped together so children nest under the item.
      content = `#list(marker: ${checkboxMarker(checked ?? false)}, [${content}])`;
    }
    return this.applyBlockProps(
      children.length
        ? { ...block.props, textAlignment: undefined }
        : block.props,
      content,
    );
  }

  /**
   * Render a columnList as a Typst `grid`: each child column becomes a grid
   * cell, its `width` prop mapped to a fractional (`fr`) track so relative
   * column sizes are preserved. `grid` is a layout primitive (not a `table`),
   * so it isn't tagged as a data table in the PDF.
   */
  private async renderColumnList(
    block: Block<B, I, S>,
    nestingLevel: number,
  ): Promise<string> {
    const columns = block.children;
    const tracks = columns
      .map((c) => `${(c.props as { width?: number }).width ?? 1}fr`)
      .join(", ");
    const cells: string[] = [];
    for (const col of columns) {
      const inner = (
        await this.transformBlocks(col.children, nestingLevel)
      ).join("\n\n");
      cells.push(`[${inner}]`);
    }
    return `#grid(\n  columns: (${tracks}),\n  column-gutter: 1em,\n  ${cells.join(
      ",\n  ",
    )}\n)`;
  }

  private wrapList(
    kind: "bullet" | "numbered" | "check",
    items: string[],
    start?: number,
  ): string {
    const body = items.map((it) => `[${it}]`).join(",\n  ");
    if (kind === "numbered") {
      // `start: 0` is a valid value (e.g. from pasted <ol start="0">).
      const startArg =
        start !== undefined && start !== 1 ? `start: ${start},\n  ` : "";
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
    // A page break is a control element and can't live inside a block container
    // (it has no props/children), so emit it bare without the padding wrapper.
    if (block.type === "pageBreak") {
      return self;
    }
    let inner = self;
    if (children.length) {
      // Alignment scopes to the block's *own* content: Typst's `align`/`par`
      // style everything in their scope, but in the editor nested children
      // keep their own alignment. So with children present the alignment
      // wraps `self` here, and is withheld from the outer wrapper below.
      inner = this.applyOwnAlignment(block.props, inner);
      inner += "\n#pad(left: 1.5em)[\n" + children.join("\n\n") + "\n]";
    }
    // Headings get extra top padding (the editor's ~18px heading top spacing).
    const extraTop = block.type === "heading" ? "8pt" : undefined;
    return this.applyBlockProps(
      children.length
        ? { ...block.props, textAlignment: undefined }
        : block.props,
      inner,
      { extraTop },
    );
  }

  /**
   * The alignment part of `applyBlockProps`, for wrapping a parent's own
   * content when its children must stay outside the alignment scope.
   */
  private applyOwnAlignment(
    props: { textAlignment?: string },
    s: string,
  ): string {
    if (props?.textAlignment === "justify") {
      return `#par(justify: true)[${s}]`;
    }
    const align = props?.textAlignment;
    if (align === "right" || align === "center") {
      return `#align(${align})[${s}]`;
    }
    return s;
  }

  /**
   * Apply block-level props (alignment, text/background color) and the block's
   * vertical spacing. Spacing is rendered as *padding* (inset) on the block, not
   * margin — so a background fills it and consecutive same-background blocks abut
   * with no gap (page-level margin spacing is zeroed in the preamble). `VPAD` is
   * half the block-to-block gap; `extraTop` adds space above headings.
   */
  private applyBlockProps(
    props: {
      textColor?: string;
      backgroundColor?: string;
      textAlignment?: string;
    },
    s: string,
    opts?: { extraTop?: string },
  ): string {
    // A mapping that rendered nothing stays invisible (an empty math or
    // diagram block must not become a stray padded box) - the paragraph
    // mapping itself emits a sentinel for the blank-line case.
    if (!s) {
      return s;
    }
    // Same color resolution the style mapping uses for inline text/highlight.
    const tc = colorHex(this, props?.textColor, "text");
    const bc = colorHex(this, props?.backgroundColor, "background");
    if (tc) {
      s = `#text(fill: rgb("${tc}"))[${s}]`;
    }
    if (props?.textAlignment === "justify") {
      s = `#par(justify: true)[${s}]`;
    }
    const VPAD = "6.9pt";
    const top = opts?.extraTop ? `(${opts.extraTop} + ${VPAD})` : VPAD;
    const inset = bc
      ? `(x: 6pt, top: ${top}, bottom: ${VPAD})`
      : `(top: ${top}, bottom: ${VPAD})`;
    const fill = bc ? `fill: rgb("${bc}"), ` : "";
    s = `#block(width: 100%, ${fill}inset: ${inset})[${s}]`;
    const align = props?.textAlignment;
    if (align === "right" || align === "center") {
      s = `#align(${align})[${s}]`;
    }
    return s;
  }

  private preamble(doc: TypstDocumentOptions): string {
    const { monoFontFamily, fontSize } = this.options;
    const families = this.fontFamilies;
    const fontArg =
      families.length === 1
        ? strLit(families[0])
        : `(${families.map(strLit).join(", ")})`;
    const title = doc.title ?? "Document";
    const author = doc.author ?? "";
    const lang = doc.lang ?? "en";
    const { header, footer } = doc;
    // Default margins ≈ the editor's 8% horizontal padding (54px / 670px)
    // applied to A4.
    const pageArgs = [
      `paper: ${strLit(doc.paper ?? "a4")}`,
      `margin: ${doc.margin ?? "48pt"}`,
    ];
    if (header) {
      pageArgs.push(`header: [${header}]`);
    }
    if (footer) {
      pageArgs.push(`footer: [${footer}]`);
    }
    return [
      `#set document(title: ${strLit(title)}, author: ${strLit(author)})`,
      `#set text(font: ${fontArg}, size: ${fontSize}pt, lang: ${strLit(lang)})`,
      `#set page(${pageArgs.join(", ")})`,
      // Line height ≈ the editor's 1.5 (≈18pt at 12pt). Block spacing is applied
      // as *padding* on each block (see applyBlockProps), not margin — so a
      // background fills it and consecutive same-bg blocks abut with no gap
      // (mirroring the editor). All margin-style spacing is therefore zeroed.
      // (List markers stay baseline-aligned with padded items via typst PR #7895.)
      `#set par(leading: 0.78em, spacing: 0pt, justify: false)`,
      `#set block(spacing: 0pt)`,
      `#set list(spacing: 0pt)`,
      `#set enum(spacing: 0pt)`,
      `#set heading(numbering: none)`,
      // Heading sizes match the editor (3 / 2 / 1.3 / 1 / 0.9 / 0.8 × 12pt), bold.
      // Extra top padding for headings is added in applyBlockProps.
      `#show heading: set text(weight: 700)`,
      `#show heading.where(level: 1): set text(size: 36pt)`,
      `#show heading.where(level: 2): set text(size: 24pt)`,
      `#show heading.where(level: 3): set text(size: 15.6pt)`,
      `#show heading.where(level: 4): set text(size: 12pt)`,
      `#show heading.where(level: 5): set text(size: 10.8pt)`,
      `#show heading.where(level: 6): set text(size: 9.6pt)`,
      // Code: monospace, in a light boxed block.
      `#show raw: set text(font: ${strLit(monoFontFamily)})`,
      `#show raw.where(block: true): it => block(width: 100%, inset: 12pt, radius: 3pt, fill: luma(248), stroke: 0.5pt + luma(210), it)`,
      // Quote: grey text with a left rule. Vertical inset makes the rule span
      // the full line height (like the editor), not just the glyph ink.
      `#show quote.where(block: true): it => block(inset: (left: 14pt, y: 4pt), stroke: (left: 2pt + rgb("#7D797A")), text(fill: rgb("#7D797A"), it.body))`,
      // Figures (images) are not auto-numbered, matching the editor. Alignment
      // is handled inside the figure body (a full-width box), since Typst
      // figures ignore outer/scoped `align`.
      `#set figure(numbering: none)`,
      // A figure taller than the remaining space moves to the next page whole
      // instead of being sliced at the page boundary (react-pdf's wrap=false).
      `#show figure: set block(breakable: false)`,
      // Figure captions: smaller, muted.
      `#show figure.caption: set text(size: 9.6pt, fill: luma(110))`,
      // Links: BlockNote blue.
      `#show link: set text(fill: rgb("#0b6e99"))`,
      // Check-list marker symbols (used as per-item list markers).
      CHECKBOX_MARKER_DEFS,
    ].join("\n");
  }

  /**
   * Resolve an image URL to bytes and register it as a Typst shadow file,
   * returning the virtual path to reference via `image("...")`. Cached per URL.
   * The bytes are exposed through {@link assetFiles} and must be mapped into the
   * compiler before the markup is compiled.
   */
  public async registerImage(url: string): Promise<string> {
    const cached = this.assets.get(url);
    if (cached) {
      return cached.path;
    }
    const blob = await this.resolveFile(url);
    return this.registerImageBytes(
      url,
      new Uint8Array(await blob.arrayBuffer()),
    );
  }

  /**
   * Register already-resolved image bytes as a Typst shadow file, returning the
   * virtual path to reference via `image("...")`. Cached per `key` — pass a key
   * that identifies the rendered content (e.g. the source it was rendered
   * from). For images that live at a URL, use {@link registerImage} instead.
   *
   * The path carries no file extension on purpose: Typst detects the format
   * from the bytes when the extension doesn't assert one, and a *wrongly
   * guessed* known extension (a lying content-type, an extensionless URL) is
   * the only way to make it misdecode good bytes — while genuinely
   * undecodable bytes fail the compile with Typst's own error (verified
   * against the engine).
   */
  public registerImageBytes(key: string, bytes: Uint8Array): string {
    const cached = this.assets.get(key);
    if (cached) {
      return cached.path;
    }
    const path = `/assets/asset-${this.assets.size}`;
    this.assets.set(key, { path, bytes });
    return path;
  }

  /**
   * Image bytes collected by `toTypst`, keyed by the virtual path referenced in
   * the markup. Map these into the compiler's filesystem (browser:
   * `$typst.mapShadow`, node: `compiler.mapShadow`) before compiling.
   */
  public get assetFiles(): Map<string, Uint8Array> {
    return new Map(
      [...this.assets.values()].map(({ path, bytes }) => [path, bytes]),
    );
  }

  /** Convert a BlockNote document to a full Typst source string. */
  public async toTypst(
    blocks: Block<B, I, S>[],
    documentOptions: TypstDocumentOptions = {},
  ): Promise<string> {
    const body = (await this.transformBlocks(blocks)).join("\n\n");
    return this.preamble(documentOptions) + "\n\n" + body + "\n";
  }
}
