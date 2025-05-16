import {
  Exporter,
  InlineContentSchema,
  mapTableCell,
  StyleSchema,
  TableContent,
} from "@blocknote/core";
import { StyleSheet, View } from "@react-pdf/renderer";
const PIXELS_PER_POINT = 0.75;

// ( impossible?) to make tables with flex that don't have a fixed / 100% width?
// we'd need to measure the width of every column manually
const styles = StyleSheet.create({
  tableContainer: {
    // width: "100%",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    // width: "100%",
    // justifyContent: "space-between",
    display: "flex",
  },
  cell: {
    paddingHorizontal: 5 * PIXELS_PER_POINT,
    paddingTop: 3 * PIXELS_PER_POINT,
    // paddingBottom: 1 * PIXELS_PER_POINT, should be 3px but looks odd, better with no padding Bottom
    borderLeft: "1px solid #ddd",
    borderTop: "1px solid #ddd",
    wordWrap: "break-word",
    whiteSpace: "pre-wrap",
  },
  headerCell: {
    fontWeight: "bold",
  },
  bottomCell: {
    borderBottom: "1px solid #ddd",
  },
  rightCell: {
    borderRight: "1px solid #ddd",
  },
});

export const Table = (props: {
  data: TableContent<InlineContentSchema>;
  transformer: Exporter<
    any,
    InlineContentSchema,
    StyleSchema,
    any,
    any,
    any,
    any
  >;
}) => {
  // If headerRows is 1, then the first row is a header row
  const headerRows = new Array(props.data.headerRows ?? 0).fill(true);
  // If headerCols is 1, then the first column is a header column
  const headerCols = new Array(props.data.headerCols ?? 0).fill(true);

  return (
    <View style={styles.tableContainer} wrap={false}>
      {props.data.rows.map((row, rowIndex) => (
        <View
          style={[
            styles.row,
            rowIndex === props.data.rows.length - 1 ? styles.bottomCell : {},
          ]}
          key={rowIndex}
        >
          {row.cells.map((c, colIndex) => {
            const cell = mapTableCell(c);

            const isHeaderRow = headerRows[rowIndex];
            const isHeaderCol = headerCols[colIndex];

            // TODO we need to support for colspan and rowspan, but at the moment are blocked by react-pdf
            return (
              <View
                style={[
                  styles.cell,
                  isHeaderRow || isHeaderCol ? styles.headerCell : {},
                  colIndex === row.cells.length - 1 ? styles.rightCell : {},
                  props.data.columnWidths[colIndex]
                    ? { width: props.data.columnWidths[colIndex] }
                    : { flex: 1 },
                  {
                    color:
                      cell.props.textColor === "default"
                        ? undefined
                        : props.transformer.options.colors[
                            cell.props
                              .textColor as keyof typeof props.transformer.options.colors
                          ].text,
                    backgroundColor:
                      cell.props.backgroundColor === "default"
                        ? undefined
                        : props.transformer.options.colors[
                            cell.props
                              .backgroundColor as keyof typeof props.transformer.options.colors
                          ].background,
                    textAlign: cell.props.textAlignment,
                  },
                ]}
                key={colIndex}
              >
                {props.transformer.transformInlineContent(cell.content)}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};
