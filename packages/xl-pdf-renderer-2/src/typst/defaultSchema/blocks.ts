import {
  BlockMapping,
  createPageBreakBlockConfig,
  DefaultBlockSchema,
  mapTableCell,
  StyledText,
} from "@blocknote/core";
import { multiColumnSchema } from "@blocknote/xl-multi-column";
import type { TypstExporter } from "../typstExporter.js";
import { colorHex, joinInline, PT, strLit, TOGGLE_CHEVRON } from "../util.js";

/** Figure width from a media block's `previewWidth` (px -> pt), else 80%. */
function figureWidth(props: any): string {
  return props?.previewWidth
    ? `${(props.previewWidth * PT).toFixed(1)}pt`
    : "80%";
}

/**
 * Render a media block (video/audio/file, or an image we couldn't resolve) as a
 * tagged Figure with a placeholder body + non-empty Alt text. PDF/UA requires
 * every figure to have alt text, so we always fall back to a non-empty label.
 *
 * These media types have no raster to embed (Typst is a document, not a player),
 * so a drawn rectangle stands in for them. Images are embedded for real — see
 * {@link imageFigure}.
 */
function mediaFigure(props: any, fallbackAlt: string): string {
  const caption: string | undefined = props?.caption;
  const alt = caption || props?.name || props?.url || fallbackAlt;
  const captionArg = caption ? `, caption: [#${strLit(caption)}]` : "";
  return `#figure(rect(width: ${figureWidth(props)}, height: 3cm, fill: luma(235), stroke: 0.5pt + luma(180))${captionArg}, alt: ${strLit(alt)})`;
}

/**
 * Render a non-embeddable media block (video / audio / file) as a link to the
 * source, with the caption beneath — mirroring the editor (and the react-pdf
 * exporter), which show an "Open …" link rather than the media itself. A link
 * with descriptive text is also better for PDF/UA than a blank rectangle.
 */
function mediaLink(props: any, fallback: string): string {
  const url: string | undefined = props?.url;
  const caption: string | undefined = props?.caption;
  const name: string | undefined = props?.name;
  const label = name || fallback;
  const main = url
    ? `#link(${strLit(url)})[#${strLit(label)}]`
    : `#${strLit(label)}`;
  return caption
    ? `${main}#linebreak()#text(size: 9.6pt, fill: luma(110))[#${strLit(
        caption,
      )}]`
    : main;
}

/**
 * Render an image block as a tagged Figure containing the *real* embedded image.
 * The bytes are resolved + registered as a Typst shadow file by the exporter and
 * referenced here by virtual path. Falls back to a placeholder rectangle if the
 * file can't be resolved (offline, bad URL, no resolver).
 */
async function imageFigure(
  props: any,
  exporter: TypstExporter<any, any, any>,
): Promise<string> {
  const url: string | undefined = props?.url;
  const caption: string | undefined = props?.caption;
  const alt = caption || props?.name || url || "Image";
  if (url) {
    try {
      const path = await exporter.registerImage(url);
      const captionArg = caption ? `, caption: [#${strLit(caption)}]` : "";
      // Typst figures ignore an *outer* `align`; the mechanism that works
      // (typst PR #4276) is `show figure: set align(...)`, scoped per image —
      // this aligns the image and its caption together, defaulting to left.
      const a = props?.textAlignment;
      const align = a === "center" || a === "right" ? a : "left";
      return `#[#show figure: set align(${align}); #figure(image(${strLit(
        path,
      )}, width: ${figureWidth(props)})${captionArg}, alt: ${strLit(alt)})]`;
    } catch {
      // fall through to the placeholder if the image can't be resolved
    }
  }
  return mediaFigure(props, "Image");
}

export const typstBlockMappingForDefaultSchema: BlockMapping<
  DefaultBlockSchema & {
    pageBreak: ReturnType<typeof createPageBreakBlockConfig>;
  } & typeof multiColumnSchema.blockSchema,
  any,
  any,
  string,
  string
> = {
  // --- text blocks -> P / Hn / BlockQuote -------------------------------------
  paragraph: (block, exporter) => joinInline(exporter, block.content),

  heading: (block, exporter) =>
    `#heading(level: ${block.props.level ?? 1}, outlined: true)[${joinInline(
      exporter,
      block.content,
    )}]`,

  quote: (block, exporter) =>
    `#quote(block: true)[${joinInline(exporter, block.content)}]`,

  // --- list items: return only the item BODY; transformBlocks groups runs of
  // consecutive items into a single Typst list()/enum() so the tag tree is a
  // proper L > LI structure. -------------------------------------------------
  bulletListItem: (block, exporter) => joinInline(exporter, block.content),
  numberedListItem: (block, exporter) => joinInline(exporter, block.content),
  checkListItem: (block, exporter) => joinInline(exporter, block.content),
  // toggle has no list semantics in PDF; render its label like a paragraph
  // (children are appended generically by transformBlocks).
  toggleListItem: (block, exporter) =>
    `${TOGGLE_CHEVRON}${joinInline(exporter, block.content)}`,

  // --- code -> Code -----------------------------------------------------------
  codeBlock: (block) => {
    const text = (block.content as StyledText<any>[])
      .map((c) => c.text)
      .join("");
    const lang = (block.props as any)?.language || "";
    return `#raw(${strLit(text)}, block: true, lang: ${strLit(lang)})`;
  },

  // --- structural -------------------------------------------------------------
  divider: () => `#line(length: 100%, stroke: 0.5pt + luma(200))`,
  pageBreak: () => `#pagebreak(weak: true)`,

  // Multi-column layout is assembled by TypstExporter.transformBlocks (columns
  // become grid cells). These entries exist only to satisfy the BlockMapping
  // type — they are never invoked.
  column: () => "",
  columnList: () => "",

  // --- media -> Figure + Alt --------------------------------------------------
  image: (block, exporter) =>
    imageFigure(
      block.props,
      exporter as unknown as TypstExporter<any, any, any>,
    ),
  video: (block) => mediaLink(block.props, "Open video file"),
  audio: (block) => mediaLink(block.props, "Open audio file"),
  file: (block) => mediaLink(block.props, "Open file"),

  // --- table -> Table > TR > (TH|TD) -----------------------------------------
  table: (block, exporter) => {
    const data: any = block.content;
    const rows: any[] = data.rows ?? [];
    const ncol = data.columnWidths?.length || rows[0]?.cells.length || 1;
    const colSpec = data.columnWidths?.length
      ? "(" +
        data.columnWidths
          .map((w: number | undefined) =>
            w ? `${(w * PT).toFixed(1)}pt` : "auto",
          )
          .join(", ") +
        ")"
      : String(ncol);
    const headerRows: number = data.headerRows ?? 0;

    const lines = rows.map((row: any, ri: number) => {
      const isHeader = ri < headerRows;
      const cells = row.cells.map((c: any) => {
        const cell = mapTableCell(c);
        let inner = joinInline(exporter, cell.content);
        const tc = colorHex(exporter, cell.props?.textColor, "text");
        if (tc) {
          inner = `#text(fill: rgb("${tc}"))[${inner}]`;
        }
        // Header cells are bold, matching the editor.
        if (isHeader) {
          inner = `#strong[${inner}]`;
        }
        const body = `[${inner}]`;
        const opts: string[] = [];
        const bc = colorHex(
          exporter,
          cell.props?.backgroundColor,
          "background",
        );
        if (bc) {
          opts.push(`fill: rgb("${bc}")`);
        }
        const align = cell.props?.textAlignment;
        if (align === "center" || align === "right") {
          opts.push(`align: ${align}`);
        }
        return opts.length ? `table.cell(${opts.join(", ")})${body}` : body;
      });
      const joined = cells.join(", ");
      return isHeader ? `  table.header(${joined}),` : `  ${joined},`;
    });

    return `#table(\n  columns: ${colSpec},\n  stroke: 0.5pt + luma(200),\n  inset: 6pt,\n${lines.join(
      "\n",
    )}\n)`;
  },
};
