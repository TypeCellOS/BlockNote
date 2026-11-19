import { DOMSerializer, Node } from "prosemirror-model";
import {
  applyCellHeaders,
  applyHeaderId,
  applyHeaderScope,
} from "./cellAttributes.js";

/** Give cell serializers the table position that ProseMirror's toDOM omits. */
export function createTableSerializer(
  serializer: DOMSerializer,
  table: Node,
  tableId: string,
  document: Document,
) {
  const positions = new Map<Node, number>();
  table.forEach((row, rowOffset) => {
    row.forEach((cell, cellOffset) => {
      positions.set(cell, rowOffset + cellOffset + 1);
    });
  });

  function renderCell(cell: Node) {
    const position = positions.get(cell);
    if (position === undefined) {
      throw new Error("Cannot serialize a cell outside its table");
    }
    const attributes: Record<string, string> = {};
    if (cell.type.spec.tableRole === "header_cell") {
      applyHeaderScope(attributes, table, position);
      applyHeaderId(attributes, table, tableId, position);
    } else {
      applyCellHeaders(attributes, table, tableId, position);
    }

    // Preserve the existing renderer's spans, styles, and content hole. The
    // serializer will fill that hole with the cell's content after this returns.
    const output = DOMSerializer.renderSpec(
      document,
      serializer.nodes[cell.type.name](cell),
    );
    if (!(output.dom instanceof HTMLElement)) {
      throw new Error("Table cells must render an HTML element");
    }
    for (const [name, value] of Object.entries(attributes)) {
      output.dom.setAttribute(name, value);
    }
    return output;
  }

  return new DOMSerializer(
    { ...serializer.nodes, tableHeader: renderCell, tableCell: renderCell },
    serializer.marks,
  );
}
