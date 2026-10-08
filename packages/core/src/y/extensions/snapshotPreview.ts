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
 * Moved blocks that are gone, with their content.
 *
 * A move (indenting, dragging, a type change, ...) deletes a block and inserts
 * a copy with the same id. While a copy is shown, the diff shows the move as
 * is. Once every copy is gone, only the original's deletion is shown, and
 * that names the mover, who may not have deleted it: the copy can be lost
 * with a concurrently deleted parent, or deleted later by someone else. Such
 * deletions are shown without an author.
 */
function lostMoves(doc: Y.Doc, baseline: Y.Doc): Y.IdSet {
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
  const lost = Y.createIdSet();
  for (const [id, blocks] of originals) {
    if (!copies.get(id)?.every((copy) => copy.deleted)) {
      continue;
    }
    for (const structs of doc.store.clients.values()) {
      for (const item of structs) {
        if (
          item instanceof Y.Item &&
          blocks.some(
            (block) => item === block._item || Y.isParentOf(block, item),
          )
        ) {
          lost.add(item.id.client, item.id.clock, item.length);
        }
      }
    }
  }
  return lost;
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
              Y.diffIdMap(
                attributions.deletes,
                lostMoves(snapshot.doc, baseline.doc),
              ),
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
