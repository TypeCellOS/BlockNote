import { Node as PMNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import {
  applyCellHeaders,
  applyHeaderId,
  applyHeaderScope,
} from "./cellAttributes.js";

export function TableAccessibilityPlugin() {
  const accessibilityKey = new PluginKey<DecorationSet>("tableAccessibility");

  function createAccessibilityDecorations(doc: PMNode) {
    const decorations: Decoration[] = [];
    doc.descendants((table, tablePosition, parent) => {
      if (table.type.spec.tableRole !== "table") {
        return;
      }
      const tableId = parent!.attrs.id;
      table.forEach((row, rowOffset) => {
        row.forEach((cell, cellOffset) => {
          // TableMap positions start at table content; decorations use
          // absolute document positions, including the table's opening token.
          const position = rowOffset + cellOffset + 1;
          const attributes: Record<string, string> = {};
          if (cell.type.spec.tableRole === "header_cell") {
            applyHeaderScope(attributes, table, position);
            applyHeaderId(attributes, table, tableId, position);
          } else {
            applyCellHeaders(attributes, table, tableId, position);
          }
          const from = tablePosition + 1 + position;
          decorations.push(
            Decoration.node(from, from + cell.nodeSize, attributes),
          );
        });
      });
      return false;
    });
    return DecorationSet.create(doc, decorations);
  }

  return new Plugin<DecorationSet>({
    key: accessibilityKey,
    state: {
      init: (_, state) => createAccessibilityDecorations(state.doc),
      // Recompute relationships after edits; selection changes reuse them.
      apply: (transaction, decorations) =>
        transaction.docChanged
          ? createAccessibilityDecorations(transaction.doc)
          : decorations,
    },
    props: {
      decorations: (state) => accessibilityKey.getState(state),
    },
  });
}
