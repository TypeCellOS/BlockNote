import type {
  InlineContentSchema,
  StyleSchema,
  PartialInlineContent,
  InlineContent,
} from "../schema";
import { PartialTableCell, TableCell } from "../schema/blocks/types.js";

/**
 * This will map a table cell to a TableCell object.
 * This is useful for when we want to get the full table cell object from a partial table cell.
 * It is guaranteed to return a new TableCell object.
 */
export function mapTableCell<
  T extends InlineContentSchema,
  S extends StyleSchema,
>(
  content:
    | PartialInlineContent<T, S>
    | PartialTableCell<T, S>
    | TableCell<T, S>,
): TableCell<T, S> {
  return isTableCell(content)
    ? { ...content }
    : isPartialTableCell(content)
      ? {
          type: "tableCell",
          content: ([] as InlineContent<T, S>[]).concat(content.content as any),
          props: {
            backgroundColor: content.props?.backgroundColor ?? "default",
            textColor: content.props?.textColor ?? "default",
            textAlignment: content.props?.textAlignment ?? "left",
            colspan: content.props?.colspan ?? 1,
            rowspan: content.props?.rowspan ?? 1,
          },
        }
      : {
          type: "tableCell",
          content: ([] as InlineContent<T, S>[]).concat(content as any),
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
            colspan: 1,
            rowspan: 1,
          },
        };
}

export function isPartialTableCell<
  T extends InlineContentSchema,
  S extends StyleSchema,
>(
  content:
    | TableCell<T, S>
    | PartialInlineContent<T, S>
    | PartialTableCell<T, S>
    | undefined
    | null,
): content is PartialTableCell<T, S> {
  return (
    content !== undefined &&
    content !== null &&
    typeof content !== "string" &&
    !Array.isArray(content) &&
    content.type === "tableCell"
  );
}

export function isTableCell<
  T extends InlineContentSchema,
  S extends StyleSchema,
>(
  content:
    | TableCell<T, S>
    | PartialInlineContent<T, S>
    | PartialTableCell<T, S>
    | undefined
    | null,
): content is TableCell<T, S> {
  return (
    isPartialTableCell(content) &&
    content.props !== undefined &&
    content.content !== undefined
  );
}

export function getColspan(
  cell:
    | TableCell<any, any>
    | PartialTableCell<any, any>
    | PartialInlineContent<any, any>,
): number {
  if (isTableCell(cell)) {
    return cell.props.colspan ?? 1;
  }
  return 1;
}

export function getRowspan(
  cell:
    | TableCell<any, any>
    | PartialTableCell<any, any>
    | PartialInlineContent<any, any>,
): number {
  if (isTableCell(cell)) {
    return cell.props.rowspan ?? 1;
  }
  return 1;
}
