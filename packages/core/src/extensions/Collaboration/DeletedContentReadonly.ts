import { ySyncPluginKey } from "@y/prosemirror";
import { Node as PMNode } from "prosemirror-model";
import { Plugin, PluginKey, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { createExtension } from "../../editor/BlockNoteExtension.js";

/**
 * The mark name the y-prosemirror binding emits for attributed (suggested /
 * diffed) deletions. See AttributionMarks.ts — this name is part of the
 * binding's contract and must not be renamed.
 */
const DELETE_MARK_NAME = "y-attributed-delete";

const PLUGIN_KEY = new PluginKey("blocknote-deleted-content-readonly");

/**
 * Whether `mark` is the attributed-delete mark.
 */
function isDeleteMark(mark: { type: { name: string } }): boolean {
  return mark.type.name === DELETE_MARK_NAME;
}

/**
 * Whether `node` carries the attributed-delete mark (inline leaf/text node or a
 * block node that the binding marked as deleted).
 */
function hasDeleteMark(node: PMNode): boolean {
  return node.marks.some(isDeleteMark);
}

/**
 * Build the inline decorations that make every `y-attributed-delete` range
 * non-editable. `contenteditable="false"` keeps the caret / typing out of the
 * range; `user-select: text` (set via the decoration's inline style) keeps the
 * content copyable.
 */
function buildDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!hasDeleteMark(node)) {
      return;
    }

    decorations.push(
      Decoration.inline(
        pos,
        pos + node.nodeSize,
        {
          contenteditable: "false",
          // Keep deleted content selectable so it can still be copied.
          style: "user-select: text; -webkit-user-select: text;",
        },
        // `inclusiveStart/End: false` so the decoration does not bleed onto
        // adjacent (editable) content when the user types at the boundary.
        { inclusiveStart: false, inclusiveEnd: false },
      ),
    );
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * Whether a transaction was produced by the y-prosemirror sync plugin (the
 * Y<->PM reconcile pass) rather than by a user edit. Those transactions are how
 * the binding renders/removes attributed-delete content in the first place and
 * must never be blocked.
 *
 * The sync plugin tags its PM reconcile transactions with the
 * `y-sync-transaction` meta and `addToHistory: false` (see
 * @y/prosemirror sync-plugin.js). It also stamps the Y-side origin with the
 * value of `ySyncPluginKey.get(state)`; we treat a matching `tr` origin as a
 * sync transaction as well, for robustness across binding versions.
 */
function isSyncTransaction(tr: Transaction, syncOrigin: unknown): boolean {
  if (tr.getMeta("y-sync-transaction") !== undefined) {
    return true;
  }
  if (tr.getMeta(ySyncPluginKey) !== undefined) {
    return true;
  }
  // Transactions explicitly opting out of history are reconcile/programmatic
  // transactions (the binding sets this on every reconcile). User edits go
  // through history, so this is a safe allow-list signal.
  if (tr.getMeta("addToHistory") === false) {
    return true;
  }
  if (syncOrigin !== undefined && (tr as any).origin === syncOrigin) {
    return true;
  }
  return false;
}

/**
 * Whether any of `tr`'s steps would modify (insert / delete / replace) content
 * that lies inside a `y-attributed-delete` range in the document the
 * transaction started from (`tr.before`).
 *
 * Each step's `StepMap` reports its changed range in the coordinates of the doc
 * *before that step* (i.e. after steps `0..i-1`). We map that range back to
 * `tr.before` by inverting the composed mapping of the preceding steps, then
 * inspect the original content for the delete mark.
 */
function touchesDeletedRange(tr: Transaction): boolean {
  const before = tr.before;
  const size = before.content.size;
  let touched = false;

  for (let i = 0; i < tr.steps.length && !touched; i++) {
    const stepMap = tr.steps[i].getMap();
    // Maps positions in the doc *before step i* back to `tr.before`.
    const toBefore = tr.mapping.slice(0, i).invert();

    stepMap.forEach((oldStart, oldEnd) => {
      if (touched) {
        return;
      }
      const from = Math.max(0, Math.min(toBefore.map(oldStart), size));
      const to = Math.max(from, Math.min(toBefore.map(oldEnd), size));

      if (rangeHasDeleteMark(before, from, to)) {
        touched = true;
      }
    });
  }

  return touched;
}

/**
 * Whether the content of `doc` in `[from, to)` (or, for a pure-insertion step
 * where `from === to`, the position `from`) is inside / adjacent-within a
 * `y-attributed-delete` range.
 *
 * For collapsed ranges (insertions) we check the marks present *at* the
 * position — i.e. the node immediately before and after — and only treat it as
 * "inside" when the delete mark is present on both sides, so that inserting at
 * the boundary right after a deleted run is still allowed.
 */
function rangeHasDeleteMark(doc: PMNode, from: number, to: number): boolean {
  if (from > to || from < 0 || to > doc.content.size) {
    return false;
  }

  if (from === to) {
    // Pure insertion at position `from`: block it only when we are strictly
    // *inside* a deleted run (delete mark on both the preceding and following
    // inline content), not merely touching its edge.
    const $pos = doc.resolve(from);
    const before = $pos.nodeBefore;
    const after = $pos.nodeAfter;
    const beforeDeleted = before ? hasDeleteMark(before) : false;
    const afterDeleted = after ? hasDeleteMark(after) : false;
    return beforeDeleted && afterDeleted;
  }

  let found = false;
  doc.nodesBetween(from, to, (node) => {
    if (found) {
      return false;
    }
    // Only leaf/text content actually carries the inline delete mark; ignore
    // pure container traversal but keep descending into them.
    if ((node.isText || node.isLeaf) && hasDeleteMark(node)) {
      found = true;
      return false;
    }
    // Block nodes the binding marked as deleted (block-level delete mark).
    if (!node.isText && hasDeleteMark(node)) {
      found = true;
      return false;
    }
    return true;
  });

  return found;
}

/**
 * ProseMirror plugin that:
 *  (a) decorates every `y-attributed-delete` range as `contenteditable=false`
 *      (while keeping it selectable for copy), and
 *  (b) rejects, via `filterTransaction`, any *user* transaction whose steps
 *      would edit inside a deleted range. Sync-plugin reconcile transactions
 *      (and any `addToHistory: false` transaction) are exempt so the binding can
 *      still add/remove/accept/reject deleted content.
 */
export function createDeletedContentReadonlyPlugin(): Plugin {
  return new Plugin({
    key: PLUGIN_KEY,
    props: {
      decorations(state) {
        return buildDecorations(state.doc);
      },
    },
    filterTransaction(tr, state) {
      // Nothing to guard if the doc isn't changing.
      if (!tr.docChanged) {
        return true;
      }

      // Always allow the binding's own reconcile transactions.
      const syncOrigin = ySyncPluginKey.get(state);
      if (isSyncTransaction(tr, syncOrigin)) {
        return true;
      }

      // Reject user edits that reach into a deleted range.
      return !touchesDeletedRange(tr);
    },
  });
}

/**
 * BlockNote extension wrapping {@link createDeletedContentReadonlyPlugin}. It is
 * registered as part of the collaboration flow (see Collaboration.ts) so deleted
 * (attributed) content rendered by the y-prosemirror binding cannot be edited by
 * the user, only by the binding's own reconcile pass.
 */
export const DeletedContentReadonlyExtension = createExtension(() => {
  return {
    key: "deletedContentReadonly",
    prosemirrorPlugins: [createDeletedContentReadonlyPlugin()],
  } as const;
});
