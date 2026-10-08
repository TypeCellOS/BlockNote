import { configureYProsemirror } from "@y/prosemirror";
import * as Y from "@y/y";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  decodeFragmentUpdate,
  destroyDecodedFragment,
} from "./snapshotCodec.js";

/**
 * Snapshots are decoded with `gc: false`, so content inside a deleted block keeps
 * its own attribution: content swept away with a concurrently deleted block shows
 * no author instead of inheriting the deleter. The stock renderer hides content
 * that was inserted and deleted between the two versions only once it has been
 * garbage collected; hide it here too.
 */
class SnapshotDiffRenderer extends Y.DiffRenderer {
  override readContent(
    ...[contents, client, clock, deleted, content, shouldRender]: Parameters<
      Y.DiffRenderer["readContent"]
    >
  ) {
    const start = contents.length;
    super.readContent(contents, client, clock, deleted, content, shouldRender);
    if (deleted) {
      for (let i = contents.length - 1; i >= start; i--) {
        if (this.inserts.has(client, contents[i].clock)) {
          contents.splice(i, 1);
        }
      }
    }
  }
}

/** Whether the item with this id was already in `baseline`. */
function inBaseline(baseline: Y.Doc, id: Y.ID): boolean {
  const last = baseline.store.clients.get(id.client)?.at(-1);
  return last !== undefined && id.clock < last.id.clock + last.length;
}

/**
 * Credit a moved block's deletion to whoever removed it, not to whoever moved
 * it, returning the adjusted delete attributions.
 *
 * A move (indenting, dragging, a type change, ...) deletes a block and inserts
 * a copy with the same id. While a copy is shown, the diff shows the move as
 * is. Once every copy is gone, only the original's deletion is shown, so:
 * - whoever inserted a copy (a mover) is removed from it;
 * - whoever deleted a copy, other than by moving it on, is added to it.
 * A copy lost with a concurrently deleted parent has no deleter, so a block
 * moved into it shows as deleted without an author. Without insert
 * attributions the movers are unknown, so no author is shown.
 */
function creditMoves(
  doc: Y.Doc,
  baseline: Y.Doc,
  attributions: Y.ContentMap,
): Y.IdMap<any> {
  // Attributions hold the author under the change's kind ("insert" or
  // "delete"), next to its time ("insertAt" or "deleteAt").
  function users(map: Y.IdMap<any>, item: Y.Item, kind: string): unknown[] {
    return map
      .slice(item.id.client, item.id.clock, 1)
      .flatMap((range) => range.attrs ?? [])
      .filter((attr) => attr.name === kind)
      .map((attr) => attr.val);
  }
  const originals = new Map<unknown, Y.Node[]>();
  const copies = new Map<unknown, Y.Item[]>();
  for (const structs of doc.store.clients.values()) {
    for (const item of structs) {
      if (
        !(item instanceof Y.Item) ||
        !(item.content instanceof Y.ContentType) ||
        item.content.type.name !== "blockContainer"
      ) {
        continue;
      }
      // Read the id directly: a deleted block's attributes read as unset.
      const idItem = item.content.type._map.get("id");
      const id = idItem?.content.getContent().at(-1);
      if (id == null) {
        continue;
      }
      if (inBaseline(baseline, item.id)) {
        originals.set(id, [...(originals.get(id) ?? []), item.content.type]);
      } else {
        copies.set(id, [...(copies.get(id) ?? []), item]);
      }
    }
  }
  const replaced = Y.createIdSet();
  const credited: Y.IdMap<any> = Y.createIdMap();
  for (const [id, blocks] of originals) {
    const moved = copies.get(id);
    if (!moved || moved.some((copy) => !copy.deleted)) {
      continue;
    }
    const inserters = moved.map((copy) =>
      users(attributions.inserts, copy, "insert"),
    );
    const movers = new Set(inserters.flat());
    const known = inserters.every((inserter) => inserter.length > 0);
    const deleters = new Set(
      moved.flatMap((copy, i) =>
        users(attributions.deletes, copy, "delete").filter(
          (user) =>
            !inserters.some((other, j) => j !== i && other.includes(user)),
        ),
      ),
    );
    for (const structs of doc.store.clients.values()) {
      for (const item of structs) {
        if (
          !(item instanceof Y.Item) ||
          !blocks.some(
            (block) => item === block._item || Y.isParentOf(block, item),
          )
        ) {
          continue;
        }
        const { client, clock } = item.id;
        for (const range of attributions.deletes.slice(
          client,
          clock,
          item.length,
        )) {
          const attrs = range.attrs ?? [];
          const movedBy = attrs.filter(
            (attr) =>
              attr.name === "delete" && (!known || movers.has(attr.val)),
          );
          if (!movedBy.length) {
            continue;
          }
          const kept = attrs.filter((attr) => !movedBy.includes(attr));
          const added = known
            ? [...deleters]
                .filter(
                  (user) =>
                    !kept.some(
                      (attr) => attr.name === "delete" && attr.val === user,
                    ),
                )
                .map((user) => Y.createContentAttribute("delete", user))
            : [];
          const ids = Y.createIdSet();
          ids.add(client, range.clock, range.len);
          replaced.add(client, range.clock, range.len);
          Y.insertIntoIdMap(
            credited,
            Y.createIdMapFromIdSet(ids, [...kept, ...added]),
          );
        }
      }
    }
  }
  return Y.mergeIdMaps([Y.diffIdMap(attributions.deletes, replaced), credited]);
}

/**
 * Decode a snapshot, diff it against a baseline if given, and render it.
 *
 * Snapshots are decoded into throwaway documents, so pointing the binding at
 * one is already an isolated state: the live fragment stops receiving view
 * updates, and nothing typed into the preview reaches the live document.
 * {@link configureYProsemirror} rebuilds the binding against the decoded
 * fragment through the same `customCompare`/attribution pipeline the live
 * binding uses; passing the `renderer` keeps the attribution tooltips
 * ("who/when") working.
 */
export function showSnapshotPreview(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  snapshotContent: Uint8Array,
  compareToContent?: Uint8Array,
  attributions?: Y.ContentMap,
): void {
  const baseline = compareToContent
    ? decodeFragmentUpdate(fragment, compareToContent, {
        suggestionDoc: true,
      })
    : undefined;
  try {
    const snapshot = decodeFragmentUpdate(fragment, snapshotContent);
    try {
      const renderAttributions =
        baseline && attributions
          ? Y.createContentMap(
              attributions.inserts,
              creditMoves(snapshot.doc, baseline.doc, attributions),
            )
          : attributions;
      editor.exec(
        configureYProsemirror({
          ytype: snapshot.fragment,
          renderer: baseline
            ? new SnapshotDiffRenderer(
                baseline.doc,
                snapshot.doc,
                renderAttributions
                  ? { attributions: renderAttributions }
                  : undefined,
              )
            : undefined,
        }),
      );
    } finally {
      destroyDecodedFragment(snapshot);
    }
  } finally {
    destroyDecodedFragment(baseline);
  }
}
