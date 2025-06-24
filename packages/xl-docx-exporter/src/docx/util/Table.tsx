import {
  Exporter,
  InlineContentSchema,
  mapTableCell,
  TableContent,
  UnreachableCaseError,
} from "@blocknote/core";
import {
  Table as DocxTable,
  Paragraph,
  ParagraphChild,
  ShadingType,
  TableCell,
  TableRow,
} from "docx";

export const Table = (
  data: TableContent<InlineContentSchema>,
  t: Exporter<any, any, any, any, ParagraphChild, any, any>,
) => {
  const DEFAULT_COLUMN_WIDTH = 120;

  // If headerRows is 1, then the first row is a header row
  const headerRows = new Array(data.headerRows ?? 0).fill(true);
  // If headerCols is 1, then the first column is a header column
  const headerCols = new Array(data.headerCols ?? 0).fill(true);

  return new DocxTable({
    layout: "autofit",
    columnWidths: data.columnWidths.map(
      (w) =>
        (w ?? DEFAULT_COLUMN_WIDTH) * /* to points */ 0.75 * /* to twips */ 20,
    ),
    rows: data.rows.map((row, rowIndex) => {
      const isHeaderRow = headerRows[rowIndex];
      return new TableRow({
        tableHeader: isHeaderRow,
        children: row.cells.map((c, colIndex) => {
          const width = data.columnWidths?.[colIndex];
          const cell = mapTableCell(c);
          const isHeaderColumn = headerCols[colIndex];

          return new TableCell({
            width: width
              ? {
                  size: `${width * 0.75}pt`,
                  type: "dxa",
                }
              : undefined,
            columnSpan: cell.props.colspan,
            rowSpan: cell.props.rowspan,
            shading:
              cell.props.backgroundColor === "default" ||
              !cell.props.backgroundColor
                ? undefined
                : {
                    type: ShadingType.SOLID,
                    color:
                      t.options.colors[
                        cell.props
                          .backgroundColor as keyof typeof t.options.colors
                      ].background.slice(1),
                  },
            children: [
              new Paragraph({
                children: t.transformInlineContent(cell.content),

                alignment:
                  !cell.props.textAlignment ||
                  cell.props.textAlignment === "left"
                    ? undefined
                    : cell.props.textAlignment === "center"
                      ? "center"
                      : cell.props.textAlignment === "right"
                        ? "right"
                        : cell.props.textAlignment === "justify"
                          ? "distribute"
                          : (() => {
                              throw new UnreachableCaseError(
                                cell.props.textAlignment,
                              );
                            })(),
                run: {
                  // TODO add support for table headers exporting, bolding seems to not be working at the moment
                  bold: isHeaderRow || isHeaderColumn,
                  // TODO table paragraph color seems to not be working at the moment
                  // Probably because the runs are setting their own color
                  color:
                    cell.props.textColor === "default" || !cell.props.textColor
                      ? undefined
                      : t.options.colors[
                          cell.props.textColor as keyof typeof t.options.colors
                        ].text.slice(1),
                },
              }),
            ],
          });
        }),
      });
    }),
  });
};
