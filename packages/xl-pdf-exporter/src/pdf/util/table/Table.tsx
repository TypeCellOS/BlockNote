import {
  Exporter,
  InlineContentSchema,
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
}) => (
  <View style={styles.tableContainer} wrap={false}>
    {props.data.rows.map((row, index) => (
      <View
        style={[
          styles.row,
          index === props.data.rows.length - 1 ? styles.bottomCell : {},
        ]}
        key={index}>
        {row.cells.map((cell, index) => (
          <View
            style={[
              styles.cell,
              index === row.cells.length - 1 ? styles.rightCell : {},
              props.data.columnWidths[index]
                ? { width: props.data.columnWidths[index] }
                : { flex: 1 },
            ]}
            key={index}>
            {props.transformer.transformInlineContent(cell)}
          </View>
        ))}
      </View>
    ))}
  </View>
);
