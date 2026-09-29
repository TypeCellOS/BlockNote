import type { Node, ResolvedPos } from "prosemirror-model";
import {
  NodeSelection,
  Plugin,
  TextSelection,
  type EditorState,
  type Transaction,
} from "prosemirror-state";
import {
  CellSelection,
  TableMap,
  cellAround,
  fixTables,
  inSameTable,
  tableEditing,
  tableEditingKey,
} from "prosemirror-tables";
import type { EditorView } from "prosemirror-view";

import { getTableContentRange } from "../../api/blockManipulation/selections/selection.js";

/**
 * `tableEditing` plugin that still does cell selection, copy/paste, and table
 * fixing, but does **not** trap selections that leave the table.
 *
 * Upstream `normalizeSelection` treats any `TextSelection` with one endpoint
 * in a cell and `$to.parentOffset === 0` as an accidental intra-table span
 * and clamps it back to a single cell. That also matches:
 * - mouse-selecting from a table into the next paragraph
 * - select-all in a document that starts with a table and ends on an empty
 *   block
 *
 * `handleMouseDown` similarly refuses to update once the pointer leaves the
 * table (`inSameTable`). Both are why tables could not be selected alongside
 * other blocks.
 */
export function tableEditingWithCrossBlockSelection(options?: {
  allowTableNodeSelection?: boolean;
}) {
  const allowTableNodeSelection = options?.allowTableNodeSelection ?? false;
  const stock = tableEditing({ allowTableNodeSelection });
  const stockMouseDown = stock.spec.props?.handleDOMEvents?.mousedown as
    | ((view: EditorView, event: MouseEvent) => boolean | void)
    | undefined;

  return new Plugin({
    key: tableEditingKey,
    state: stock.spec.state,
    props: {
      decorations: stock.spec.props?.decorations,
      handleTripleClick: stock.spec.props?.handleTripleClick,
      handleKeyDown: stock.spec.props?.handleKeyDown,
      handlePaste: stock.spec.props?.handlePaste,
      handleDOMEvents: {
        mousedown: handleMouseDownAllowingTableEscape(stockMouseDown),
      },
      createSelectionBetween(view) {
        // Only freeze the selection while a cell-drag is still inside the
        // table. Once it has escaped (we converted it to a TextSelection),
        // let ProseMirror map the DOM selection as usual.
        if (tableEditingKey.getState(view.state) == null) {
          return null;
        }
        if (view.state.selection instanceof CellSelection) {
          return view.state.selection;
        }
        return null;
      },
    },
    appendTransaction(_, oldState, state) {
      return normalizeSelectionAllowingCrossBlock(
        state,
        fixTables(state, oldState),
        allowTableNodeSelection,
      );
    },
  });
}

function handleMouseDownAllowingTableEscape(
  stockMouseDown:
    | ((view: EditorView, event: MouseEvent) => boolean | void)
    | undefined,
) {
  return function onMouseDown(view: EditorView, event: MouseEvent) {
    stockMouseDown?.(view, event);

    if (event.button !== 0 || event.ctrlKey || event.metaKey) {
      return;
    }

    function move(rawEvent: Event) {
      const mouseEvent = rawEvent as MouseEvent;
      if (mouseEvent.buttons !== 1) {
        return;
      }

      const dragAnchor = tableEditingKey.getState(view.state);
      if (dragAnchor == null) {
        return;
      }

      const mousePos = view.posAtCoords({
        left: mouseEvent.clientX,
        top: mouseEvent.clientY,
      });
      if (!mousePos) {
        return;
      }

      const $mouse = view.state.doc.resolve(
        mousePos.inside >= 0 ? mousePos.inside : mousePos.pos,
      );
      const $mouseCell = cellAround($mouse);
      const $anchorCell = view.state.doc.resolve(dragAnchor);

      if ($mouseCell && inSameTable($anchorCell, $mouseCell)) {
        return;
      }

      const next = textSelectionLeavingTable(
        view.state.doc,
        $anchorCell,
        mousePos.pos,
      );
      if (!next || next.eq(view.state.selection)) {
        return;
      }

      view.dispatch(view.state.tr.setSelection(next));
    }

    function stop() {
      view.root.removeEventListener("mousemove", move);
      view.root.removeEventListener("mouseup", stop);
      view.root.removeEventListener("dragstart", stop);
    }

    view.root.addEventListener("mousemove", move);
    view.root.addEventListener("mouseup", stop);
    view.root.addEventListener("dragstart", stop);
  };
}

function textSelectionLeavingTable(
  doc: Node,
  $anchorCell: ResolvedPos,
  outsidePos: number,
): TextSelection | undefined {
  const tableNode = $anchorCell.node(-1);
  if (tableNode.type.spec.tableRole !== "table") {
    return undefined;
  }

  const tableStart = $anchorCell.start(-1);
  const tableRange = getTableContentRange(doc, {
    node: tableNode,
    beforePos: tableStart - 1,
  });
  const clampedOutside = Math.max(0, Math.min(outsidePos, doc.content.size));

  if (clampedOutside < tableStart) {
    return TextSelection.create(doc, clampedOutside, tableRange.to);
  }
  return TextSelection.create(doc, tableRange.from, clampedOutside);
}

/**
 * Copy of prosemirror-tables' `normalizeSelection`, except
 * `isTextSelectionAcrossCells` only fires when **both** endpoints are in
 * cells of the same table. See the file-level comment.
 */
function normalizeSelectionAllowingCrossBlock(
  state: EditorState,
  tr: Transaction | undefined,
  allowTableNodeSelection: boolean,
): Transaction | undefined {
  const sel = (tr || state).selection;
  const doc = (tr || state).doc;
  let normalize: NodeSelection | TextSelection | CellSelection | undefined;
  let role: string | undefined;

  if (sel instanceof NodeSelection && (role = sel.node.type.spec.tableRole)) {
    if (role === "cell" || role === "header_cell") {
      normalize = CellSelection.create(doc, sel.from);
    } else if (role === "row") {
      const $cell = doc.resolve(sel.from + 1);
      normalize = CellSelection.rowSelection($cell, $cell);
    } else if (!allowTableNodeSelection) {
      const map = TableMap.get(sel.node);
      const start = sel.from + 1;
      const lastCell = start + map.map[map.width * map.height - 1];
      normalize = CellSelection.create(doc, start + 1, lastCell);
    }
  } else if (sel instanceof TextSelection && isCellBoundarySelection(sel)) {
    normalize = TextSelection.create(doc, sel.from);
  } else if (
    sel instanceof TextSelection &&
    isTextSelectionAcrossCellsInSameTable(sel)
  ) {
    normalize = TextSelection.create(doc, sel.$from.start(), sel.$from.end());
  }

  if (normalize) {
    (tr || (tr = state.tr)).setSelection(normalize);
  }
  return tr;
}

function isCellBoundarySelection({ $from, $to }: TextSelection) {
  if ($from.pos === $to.pos || $from.pos < $to.pos - 6) {
    return false;
  }
  let afterFrom = $from.pos;
  let depth = $from.depth;
  for (; depth >= 0; depth--, afterFrom++) {
    if ($from.after(depth + 1) < $from.end(depth)) {
      break;
    }
  }
  let beforeTo = $to.pos;
  for (let d = $to.depth; d >= 0; d--, beforeTo--) {
    if ($to.before(d + 1) > $to.start(d)) {
      break;
    }
  }
  return (
    afterFrom === beforeTo &&
    /row|table/.test($from.node(depth).type.spec.tableRole ?? "")
  );
}

function isTextSelectionAcrossCellsInSameTable({ $from, $to }: TextSelection) {
  const $fromCell = cellAround($from);
  const $toCell = cellAround($to);
  if (!$fromCell || !$toCell || !inSameTable($fromCell, $toCell)) {
    return false;
  }
  return $fromCell.pos !== $toCell.pos && $to.parentOffset === 0;
}
