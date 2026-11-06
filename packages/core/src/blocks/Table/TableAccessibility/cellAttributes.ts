import { TableMap } from "prosemirror-tables";
import { Node } from "prosemirror-model";

function getHeaderScope(table: Node, position: number) {
  const map = TableMap.get(table);
  const { top, left } = map.findCell(position);
  const isHeader = (position: number) =>
    table.nodeAt(position)?.type.spec.tableRole === "header_cell";

  // A full header row identifies column headers, including intersections with
  // header columns. TableMap includes slots covered by merged cells.
  if (map.map.slice(top * map.width, (top + 1) * map.width).every(isHeader)) {
    return "col";
  }
  for (let row = 0; row < map.height; row++) {
    if (!isHeader(map.map[row * map.width + left])) {
      return undefined;
    }
  }
  return "row";
}

function getHeaderId(
  tableId: string,
  scope: "row" | "col",
  row: number,
  col: number,
) {
  // Both coordinates distinguish headers in multiple header rows or columns.
  return `bn-table-${tableId}-${scope}-header-${row}-${col}`;
}

export function applyCellHeaders(
  attributes: Record<string, string>,
  table: Node,
  tableId: string,
  cellPosition: number,
) {
  const ids = new Set<string>();
  const map = TableMap.get(table);
  const rect = map.findCell(cellPosition);

  function addHeader(position: number, scope: "row" | "col") {
    if (
      table.nodeAt(position)?.type.spec.tableRole !== "header_cell" ||
      getHeaderScope(table, position) !== scope
    ) {
      return;
    }
    const { top, left } = map.findCell(position);
    ids.add(getHeaderId(tableId, scope, top, left));
  }

  // Search every header row/column along the cell's covered grid indices.
  // A merged header may occupy several slots; the Set keeps one reference.
  for (let row = 0; row < map.height; row++) {
    for (let col = rect.left; col < rect.right; col++) {
      addHeader(map.map[row * map.width + col], "col");
    }
  }
  for (let row = rect.top; row < rect.bottom; row++) {
    for (let col = 0; col < map.width; col++) {
      addHeader(map.map[row * map.width + col], "row");
    }
  }
  if (ids.size) {
    attributes.headers = [...ids].join(" ");
  } else {
    delete attributes.headers;
  }
}

export function applyHeaderScope(
  attributes: Record<string, string>,
  table: Node,
  position: number,
) {
  const scope = getHeaderScope(table, position);
  if (scope) {
    attributes.scope = scope;
  } else {
    delete attributes.scope;
  }
}

export function applyHeaderId(
  attributes: Record<string, string>,
  table: Node,
  tableId: string,
  position: number,
) {
  const scope = getHeaderScope(table, position);
  if (scope) {
    const { top, left } = TableMap.get(table).findCell(position);
    attributes.id = getHeaderId(tableId, scope, top, left);
  } else {
    delete attributes.id;
  }
}
