import {
  BlockMapping,
  createPageBreakBlockConfig,
  DefaultBlockSchema,
  mapTableCell,
  StyledText,
} from "@blocknote/core";
import { colorHex, joinInline, PT, strLit } from "../util.js";

/**
 * Render a media block (image/video/audio/file) as a tagged Figure with a
 * placeholder body + non-empty Alt text. PDF/UA requires every figure to have
 * alt text, so we always fall back to a non-empty label.
 *
 * NOTE: this is a self-contained placeholder (a drawn rectangle). Embedding the
 * real raster is a follow-up — it would resolve the file via `exporter.resolveFile`
 * and inject the bytes (browser: `image(bytes)`, node: `compiler.mapShadow`).
 */
function mediaFigure(props: any, fallbackAlt: string): string {
  const caption: string | undefined = props?.caption;
  const alt = caption || props?.name || props?.url || fallbackAlt;
  const width = props?.previewWidth
    ? `${(props.previewWidth * PT).toFixed(1)}pt`
    : "80%";
  const captionArg = caption ? `, caption: [#${strLit(caption)}]` : "";
  return `#figure(rect(width: ${width}, height: 3cm, fill: luma(235), stroke: 0.5pt + luma(180))${captionArg}, alt: ${strLit(alt)})`;
}

export const typstBlockMappingForDefaultSchema: BlockMapping<
  DefaultBlockSchema & {
    pageBreak: ReturnType<typeof createPageBreakBlockConfig>;
  },
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
  toggleListItem: (block, exporter) => joinInline(exporter, block.content),

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

  // --- media -> Figure + Alt --------------------------------------------------
  image: (block) => mediaFigure(block.props, "Image"),
  video: (block) => mediaFigure(block.props, "Video"),
  audio: (block) => mediaFigure(block.props, "Audio"),
  file: (block) => mediaFigure(block.props, "File"),

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
      const cells = row.cells.map((c: any) => {
        const cell = mapTableCell(c);
        const inner = joinInline(exporter, cell.content);
        const tc = colorHex(exporter, cell.props?.textColor, "text");
        const bc = colorHex(
          exporter,
          cell.props?.backgroundColor,
          "background",
        );
        const body = tc
          ? `[#text(fill: rgb("${tc}"))[${inner}]]`
          : `[${inner}]`;
        const opts: string[] = [];
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
      return ri < headerRows ? `  table.header(${joined}),` : `  ${joined},`;
    });

    return `#table(\n  columns: ${colSpec},\n  stroke: 0.5pt + luma(200),\n  inset: 6pt,\n${lines.join(
      "\n",
    )}\n)`;
  },
};
