import { createExtension } from "@blocknote/core";
import { tableHandlesPluginKey } from "@blocknote/core/extensions";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const SOURCE_ROW_CLASS = "bn-table-drag-source-row";
const SOURCE_COL_CLASS = "bn-table-drag-source-col";

type DragSourceMeta = {
  draggedCellOrientation: "row" | "col";
  originalIndex: number;
  tablePos: number;
};

const pluginKey = new PluginKey<DragSourceMeta | null>(
  "tableDragSourceHighlight",
);

/**
 * BlockNote's TableHandlesExtension decorates the drop *target* while
 * dragging a row/column (the `bn-table-drop-cursor` widget), but has no
 * equivalent for the row/column being dragged *from*, which makes it hard to
 * tell what's actually moving. This mirrors that mechanism for the source
 * side: it reads the same `tableHandlesPluginKey` transaction meta
 * (`{draggedCellOrientation, originalIndex, tablePos}` on drag start, `null`
 * on drag end, a bare `true` "redraw the decorations" ping while hovering)
 * and applies a node decoration - not a direct DOM class mutation, which
 * ProseMirror's table NodeView can silently discard on redraw - so the
 * highlight survives every dragover-triggered decoration recompute.
 */
export const TableDragSourceExtension = createExtension(() => ({
  key: "tableDragSourceHighlight",
  prosemirrorPlugins: [
    new Plugin<DragSourceMeta | null>({
      key: pluginKey,
      state: {
        init: () => null,
        apply(tr, prev) {
          const meta = tr.getMeta(tableHandlesPluginKey);
          if (meta === null) {
            return null;
          }
          if (
            meta &&
            typeof meta === "object" &&
            typeof (meta as DragSourceMeta).tablePos === "number" &&
            typeof (meta as DragSourceMeta).originalIndex === "number"
          ) {
            return meta as DragSourceMeta;
          }
          if (!prev || !tr.docChanged) {
            return prev;
          }
          // A transaction changed the document without setting our meta -
          // e.g. a concurrent local or collaborative edit elsewhere in the
          // doc while a drag is in progress. Remap the stored position
          // through it instead of letting it go stale, so the highlight
          // keeps tracking the table rather than just disappearing on the
          // next `decorations()` call.
          return { ...prev, tablePos: tr.mapping.map(prev.tablePos) };
        },
      },
      props: {
        decorations(state) {
          const dragState = pluginKey.getState(state);
          if (!dragState) {
            return null;
          }

          const { draggedCellOrientation, originalIndex, tablePos } = dragState;

          // `tablePos` is captured once at drag-start and isn't remapped
          // against later transactions (matching BlockNote's own drop-cursor
          // decoration, which has the same limitation). If a concurrent edit
          // - locally or from another collaborator - shifts or removes the
          // table while a drag is in progress, this resolve() would throw
          // instead of just skipping the decoration; bail out safely instead.
          let tableResolvedPos;
          try {
            tableResolvedPos = state.doc.resolve(tablePos + 1);
          } catch {
            return null;
          }
          const tableNode = tableResolvedPos.node();
          if (tableNode.type.name !== "table") {
            return null;
          }
          const decorations: Decoration[] = [];

          if (draggedCellOrientation === "row") {
            const rowNode = tableNode.maybeChild(originalIndex);
            if (rowNode) {
              const rowStart = tableResolvedPos.posAtIndex(originalIndex);
              decorations.push(
                Decoration.node(rowStart, rowStart + rowNode.nodeSize, {
                  class: SOURCE_ROW_CLASS,
                }),
              );
            }
          } else {
            for (let row = 0; row < tableNode.childCount; row++) {
              const rowNode = tableNode.child(row);
              const cellNode = rowNode.maybeChild(originalIndex);
              if (!cellNode) {
                continue;
              }
              const rowStart = tableResolvedPos.posAtIndex(row);
              const rowResolvedPos = state.doc.resolve(rowStart + 1);
              const cellStart = rowResolvedPos.posAtIndex(originalIndex);
              decorations.push(
                Decoration.node(cellStart, cellStart + cellNode.nodeSize, {
                  class: SOURCE_COL_CLASS,
                }),
              );
            }
          }

          return DecorationSet.create(state.doc, decorations);
        },
      },
    }),
  ],
}));
