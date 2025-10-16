import {
  InlineContent,
  InlineContentSchema,
  PartialInlineContent,
} from "../../inlineContent/types.js";
import { StyleSchema } from "../../styles/types.js";

export type TableCellProps = {
  backgroundColor: string;
  textColor: string;
  textAlignment: "left" | "center" | "right" | "justify";
  colspan?: number;
  rowspan?: number;
};

export type TableCell<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema,
> = {
  type: "tableCell";
  props: TableCellProps;
  content: InlineContent<I, S>[];
};

export type TableContent<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema,
> = {
  type: "tableContent";
  columnWidths: (number | undefined)[];
  headerRows?: number;
  headerCols?: number;
  rows: {
    cells: InlineContent<I, S>[][] | TableCell<I, S>[];
  }[];
};

/** CODE FOR PARTIAL BLOCKS, analogous to above
 *
 * Partial blocks are convenience-wrappers to make it easier to
 *create/update blocks in the editor.
 *
 */

export type PartialTableCell<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema,
> = {
  type: "tableCell";
  props?: Partial<TableCellProps>;
  content?: PartialInlineContent<I, S>;
};

export type PartialTableContent<
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema,
> = {
  type: "tableContent";
  columnWidths?: (number | undefined)[];
  headerRows?: number;
  headerCols?: number;
  rows: {
    cells: PartialInlineContent<I, S>[] | PartialTableCell<I, S>[];
  }[];
};
