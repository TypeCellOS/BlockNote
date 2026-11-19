import { Node } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { fixTables, TableMap } from "prosemirror-tables";

/** Repair imported ProseMirror tables before projecting them to BlockNote JSON. */
export function normalizeImportedTables(doc: Node): Node {
  let state: EditorState | undefined;
  let transaction: Transaction | undefined;
  doc.descendants((node, pos) => {
    if (node.type.spec.tableRole !== "table") {
      return;
    }
    const map = TableMap.get(node);
    if (map.problems) {
      state ??= EditorState.create({ doc });
      transaction ??= state.tr;
      // Keep a wholly empty table editable. fixTables would delete the table
      // and leave its enclosing BlockNote block container without content.
      if (map.width === 0) {
        const { tableRow, tableCell } = doc.type.schema.nodes;
        transaction.replaceWith(
          transaction.mapping.map(pos),
          transaction.mapping.map(pos + node.nodeSize),
          node.type.create(
            node.attrs,
            tableRow.create(null, tableCell.createAndFill()),
            node.marks,
          ),
        );
      }
    }
    return false;
  });
  if (!state || !transaction) {
    return doc;
  }
  state = state.apply(transaction);
  // Collision repair can expose missing cells: one upstream pass is not
  // always sufficient. This state has no live editor plugins or side effects.
  for (let repair = fixTables(state); repair; repair = fixTables(state)) {
    state = state.apply(repair);
  }
  return state.doc;
}
