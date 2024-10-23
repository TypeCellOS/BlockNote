import { InlineContentSchema, TableContent } from "@blocknote/core";
import {
  Table as DocxTable,
  Paragraph,
  ParagraphChild,
  TableCell,
  TableRow,
} from "docx";
import { Transformer } from "../../Transformer.js";

export const Table = (
  data: TableContent<InlineContentSchema>["rows"],
  t: Transformer<any, any, any, any, ParagraphChild, any, any>
) => {
  return new DocxTable({
    rows: data.map(
      (row) =>
        new TableRow({
          children: row.cells.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: t.transformInlineContent(cell),
                  }),
                ],
              })
          ),
        })
    ),
  });
};
