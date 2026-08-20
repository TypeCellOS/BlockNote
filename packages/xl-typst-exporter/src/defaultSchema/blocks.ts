import {
  BlockMapping,
  createPageBreakBlockConfig,
  DefaultBlockSchema,
  getColspan,
  getRowspan,
  mapTableCell,
  StyledText,
  TableContent,
} from "@blocknote/core";
import { multiColumnSchema } from "@blocknote/xl-multi-column";
import type { TypstExporter } from "../typstExporter.js";
import { colorHex, joinInline, PT, strLit, TOGGLE_CHEVRON } from "../util.js";

/** The props the media helpers read - a structural subset of the default
 * file-block props (the mapping's `BlockMapping` typing checks call sites). */
type MediaProps = {
  url?: string;
  caption?: string;
  name?: string;
  previewWidth?: number;
  textAlignment?: string;
};

/** Figure width from a media block's `previewWidth` (px -> pt), else 80%. */
function figureWidth(props: MediaProps): string {
  return props.previewWidth
    ? `${(props.previewWidth * PT).toFixed(1)}pt`
    : "80%";
}

/**
 * Render an image block that has no URL yet (nothing to embed) as a tagged
 * Figure with a placeholder body. PDF/UA requires every figure to have
 * non-empty alt text, so the caption/name fall back to a fixed label.
 */
function imagePlaceholderFigure(props: MediaProps): string {
  const caption = props.caption;
  const alt = caption || props.name || "Image";
  const captionArg = caption ? `, caption: [#${strLit(caption)}]` : "";
  return `#figure(rect(width: ${figureWidth(props)}, height: 3cm, fill: luma(235), stroke: 0.5pt + luma(180))${captionArg}, alt: ${strLit(alt)})`;
}

/**
 * Render a non-embeddable media block (video / audio / file) as a link to the
 * source, with the caption beneath — mirroring the editor (and the react-pdf
 * exporter), which show an "Open …" link rather than the media itself. A link
 * with descriptive text is also better for PDF/UA than a blank rectangle.
 */
function mediaLink(props: MediaProps, fallback: string): string {
  const { url, caption, name } = props;
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
 * Render an image block as a tagged Figure containing the *real* embedded
 * image. The bytes are resolved + registered as a Typst shadow file by the
 * exporter and referenced here by virtual path. A URL that fails to resolve
 * is an environment failure and fails the export loudly (the throw from
 * `resolveFile` propagates) — see the error-handling conventions in
 * AGENTS.md; only an image with no URL at all renders a placeholder.
 */
async function imageFigure(
  props: MediaProps,
  exporter: TypstExporter<any, any, any>,
): Promise<string> {
  const { url, caption } = props;
  if (!url) {
    return imagePlaceholderFigure(props);
  }
  const alt = caption || props.name || url;
  const path = await exporter.registerImage(url);
  const captionArg = caption ? `, caption: [#${strLit(caption)}]` : "";
  // Typst figures ignore an *outer* `align`; the mechanism that works
  // (typst PR #4276) is `show figure: set align(...)`, scoped per image —
  // this aligns the image and its caption together, defaulting to left.
  const a = props.textAlignment;
  const align = a === "center" || a === "right" ? a : "left";
  return `#[#show figure: set align(${align}); #figure(image(${strLit(
    path,
  )}, width: ${figureWidth(props)})${captionArg}, alt: ${strLit(alt)})]`;
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
  // An empty paragraph is a blank line in the editor. Its mapping result must
  // not be empty - `applyBlockProps` drops the block wrapper for empty results
  // (so empty math/diagram blocks stay invisible) - so an empty string literal
  // stands in as the "blank line" content.
  paragraph: (block, exporter) => joinInline(exporter, block.content) || '#""',

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
    const lang = block.props.language || "";
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
    const data = block.content as TableContent<any, any>;
    // Cells normalized once up front (a cell may be a bare content array);
    // the track count and the rendered cells both read from this.
    const rows = (data.rows ?? []).map((row) =>
      row.cells.map((c) => mapTableCell(c)),
    );
    // The track count must count *spanned* tracks, not cells - a merged
    // first-row cell covers several columns.
    const ncol =
      data.columnWidths?.length ||
      Math.max(
        1,
        ...rows.map((cells) => cells.reduce((n, c) => n + getColspan(c), 0)),
      );
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

    function renderCell(
      cell: (typeof rows)[number][number],
      isHeader: boolean,
    ) {
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
      // Merged cells span extra tracks; Typst then flows the remaining cells
      // into the correct columns (the covered cells are absent from the row).
      if (getColspan(cell) > 1) {
        opts.push(`colspan: ${getColspan(cell)}`);
      }
      if (getRowspan(cell) > 1) {
        opts.push(`rowspan: ${getRowspan(cell)}`);
      }
      const bc = colorHex(exporter, cell.props?.backgroundColor, "background");
      if (bc) {
        opts.push(`fill: rgb("${bc}")`);
      }
      const align = cell.props?.textAlignment;
      if (align === "center" || align === "right") {
        opts.push(`align: ${align}`);
      }
      return opts.length ? `table.cell(${opts.join(", ")})${body}` : body;
    }

    // Typst allows at most ONE table.header, which may span several rows -
    // all header-row cells go into a single call (tagged TH), body rows
    // follow as plain cell lists.
    const headerCells = rows
      .slice(0, headerRows)
      .flatMap((cells) => cells.map((c) => renderCell(c, true)));
    const lines = [
      ...(headerCells.length
        ? [`  table.header(${headerCells.join(", ")}),`]
        : []),
      ...rows
        .slice(headerRows)
        .map(
          (cells) => `  ${cells.map((c) => renderCell(c, false)).join(", ")},`,
        ),
    ];

    return `#table(\n  columns: ${colSpec},\n  stroke: 0.5pt + luma(200),\n  inset: 6pt,\n${lines.join(
      "\n",
    )}\n)`;
  },
};
