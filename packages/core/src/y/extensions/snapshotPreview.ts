import { configureYProsemirror } from "@y/prosemirror";
import * as Y from "@y/y";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { findTypeInOtherYdoc } from "../utils.js";
import { blockMatchNodes } from "./blockMatchNodes.js";
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
 * Blocks whose deletion was a move whose copy was lost, with their content.
 *
 * A move (indenting, dragging, ...) deletes a block and inserts a copy with the
 * same id. When the copy lands in a block another user concurrently deletes,
 * it's removed without anyone deleting it. The original's deletion would then
 * read as "Deleted by <mover>", though the mover only moved it.
 */
function lostMoves(doc: Y.Doc, baseline: Y.Doc, deletes: Y.IdMap<any>) {
  function attributed(item: Y.Item) {
    return deletes
      .slice(item.id.client, item.id.clock, 1)
      .some((range) => range.attrs?.length);
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
      if (inBaseline(baseline, item.id)) {
        originals.set(id, [...(originals.get(id) ?? []), item.content.type]);
      } else {
        copies.set(id, [...(copies.get(id) ?? []), item]);
      }
    }
  }
  const lost = Y.createIdSet();
  for (const [id, blocks] of originals) {
    const moved = copies.get(id);
    // A copy that's still there, or that someone deleted, keeps the author.
    if (!moved?.every((copy) => copy.deleted && !attributed(copy))) {
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

/** The distinct attributions recorded for `node` and its descendants. */
function subtreeAttributions(
  node: Y.Node,
  map: Y.IdMap<any>,
): Y.ContentAttribute<any>[] {
  const found = new Map<string, Y.ContentAttribute<any>>();
  for (const structs of node.doc!.store.clients.values()) {
    for (const item of structs) {
      if (
        item instanceof Y.Item &&
        (item === node._item || Y.isParentOf(node, item))
      ) {
        for (const range of map.slice(
          item.id.client,
          item.id.clock,
          item.length,
        )) {
          for (const attr of range.attrs ?? []) {
            found.set(`${attr.name}:${String(attr.val)}`, attr);
          }
        }
      }
    }
  }
  return [...found.values()];
}

/**
 * Replace each block that changed structurally since `baseline` with a fresh
 * copy, where "structurally" is what `blockMatchNodes` treats as a different
 * block (e.g. a type change). The old collaboration binding stored such changes
 * inside the same container, which a diff renders as schema-invalid content
 * that is then dropped. A fresh container diffs as a deleted block next to an
 * inserted one, as the current binding stores it. The copy and the deletion
 * take over the original's attributions, so the change keeps its author.
 */
function splitChangedBlocks(
  node: Y.Node,
  baseline: Y.Doc,
  attributions: Y.ContentMap | undefined,
  added: Y.ContentMap,
): void {
  for (let index = 0; index < node.length; index++) {
    const child = node.get(index);
    if (!(child instanceof Y.Node)) {
      continue;
    }
    if (child.name === "blockContainer" && child._item) {
      // A block created after the baseline has no previous version.
      const before = inBaseline(baseline, child._item.id)
        ? findTypeInOtherYdoc(child, baseline)
        : undefined;
      if (
        before &&
        !blockMatchNodes(before.toDeltaDeep(), child.toDeltaDeep())
      ) {
        const inserted = attributions
          ? subtreeAttributions(child, attributions.inserts)
          : [];
        const deleted = attributions
          ? subtreeAttributions(child, attributions.deletes)
          : [];
        const doc = child.doc!;
        // A change that only inserted (or only deleted) still has one author
        // for both sides of the split, under that side's attribution kind.
        function as(
          kind: "insert" | "delete",
          attrs: Y.ContentAttribute<any>[],
        ) {
          return attrs.map((attr) => Y.createContentAttribute(kind, attr.val));
        }
        const authors = inserted.length ? inserted : deleted;
        function record(tr: Y.Transaction) {
          if (authors.length) {
            Y.insertIntoIdMap(
              added.inserts,
              Y.createIdMapFromIdSet(tr.insertSet, as("insert", authors)),
            );
            Y.insertIntoIdMap(
              added.deletes,
              Y.createIdMapFromIdSet(
                tr.deleteSet,
                as("delete", deleted.length ? deleted : authors),
              ),
            );
          }
        }
        doc.on("beforeObserverCalls", record);
        try {
          doc.transact(() => {
            const copy = child.clone();
            node.delete(index);
            node.insert(index, [copy]);
          });
        } finally {
          doc.off("beforeObserverCalls", record);
        }
        continue;
      }
    }
    splitChangedBlocks(child, baseline, attributions, added);
  }
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
      let renderAttributions = attributions;
      if (baseline) {
        const added = Y.createContentMap();
        splitChangedBlocks(
          snapshot.fragment,
          baseline.doc,
          attributions,
          added,
        );
        if (attributions) {
          const deletes = Y.mergeIdMaps([attributions.deletes, added.deletes]);
          renderAttributions = Y.createContentMap(
            Y.mergeIdMaps([attributions.inserts, added.inserts]),
            Y.diffIdMap(
              deletes,
              lostMoves(snapshot.doc, baseline.doc, deletes),
            ),
          );
        }
      }
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
