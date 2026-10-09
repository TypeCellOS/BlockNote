import { configureYProsemirror } from "@y/prosemirror";
import * as Y from "@y/y";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { findTypeInOtherYdoc } from "../utils.js";
import { blockMatchNodes } from "./blockMatchNodes.js";
import {
  decodeFragmentUpdate,
  destroyDecodedFragment,
} from "./snapshotCodec.js";

/** Whether the item with this id was already in `baseline`. */
function inBaseline(baseline: Y.Doc, id: Y.ID): boolean {
  const last = baseline.store.clients.get(id.client)?.at(-1);
  return last !== undefined && id.clock < last.id.clock + last.length;
}

/**
 * The attributions of what changed `block`'s structure since `baseline`: its
 * content nodes and child groups that are new, or deleted, since then. Its
 * other content (e.g. text typed in it) doesn't make the change.
 */
function structuralAttributions(
  block: Y.Node,
  baseline: Y.Doc,
  attributions: Y.ContentMap,
): { inserted: Y.ContentAttribute<any>[]; deleted: Y.ContentAttribute<any>[] } {
  const inserted = new Map<string, Y.ContentAttribute<any>>();
  const deleted = new Map<string, Y.ContentAttribute<any>>();
  for (let item = block._start; item !== null; item = item.right) {
    const isNew = !inBaseline(baseline, item.id);
    if (!isNew && !item.deleted) {
      continue;
    }
    const [found, map] = isNew
      ? [inserted, attributions.inserts]
      : [deleted, attributions.deletes];
    for (const range of map.slice(item.id.client, item.id.clock, item.length)) {
      for (const attr of range.attrs ?? []) {
        found.set(`${attr.name}:${String(attr.val)}`, attr);
      }
    }
  }
  return { inserted: [...inserted.values()], deleted: [...deleted.values()] };
}

/**
 * The units of a node's live content, in order: one per character or embed,
 * and one per child node.
 */
function liveUnits(node: Y.Node): Array<{ id: Y.ID; node?: Y.Node }> {
  const units: Array<{ id: Y.ID; node?: Y.Node }> = [];
  for (let item = node._start; item !== null; item = item.right) {
    if (item.deleted) {
      continue;
    }
    if (item.content instanceof Y.ContentType) {
      units.push({ id: item.id, node: item.content.type });
      continue;
    }
    for (let i = 0; i < item.length; i++) {
      units.push({ id: Y.createID(item.id.client, item.id.clock + i) });
    }
  }
  return units;
}

/**
 * Pair each unit and attribute of `original` with the same one in `copy`, its
 * clone. Returns false if they don't line up, which a clone always should.
 */
function pairClone(
  original: Y.Node,
  copy: Y.Node,
  pairs: Array<[Y.ID, Y.ID]>,
): boolean {
  for (const [key, item] of original._map) {
    const cloned = copy._map.get(key);
    if (!item.deleted) {
      if (!cloned) {
        return false;
      }
      pairs.push([item.id, cloned.id]);
    }
  }
  const a = liveUnits(original);
  const b = liveUnits(copy);
  if (a.length !== b.length) {
    return false;
  }
  return a.every((unit, i) => {
    const other = b[i];
    pairs.push([unit.id, other.id]);
    return unit.node && other.node
      ? pairClone(unit.node, other.node, pairs)
      : !unit.node && !other.node;
  });
}

/** Attributions as the other kind: `insert`/`insertAt` as `delete`/`deleteAt`. */
function asKind(
  attrs: Y.ContentAttribute<any>[],
  kind: "insert" | "delete",
): Y.ContentAttribute<any>[] {
  return attrs.map((attr) =>
    Y.createContentAttribute(
      attr.name.replace(/^(insert|delete)/, kind),
      attr.val,
    ),
  );
}

/**
 * Replace each block that changed structurally since `baseline` with a fresh
 * copy, where "structurally" is what `blockMatchNodes` treats as a different
 * block (e.g. a type change). The old collaboration binding stored such changes
 * inside the same container, which a diff renders as schema-invalid content
 * that is then dropped. A fresh container diffs as a deleted block next to an
 * inserted one, as the current binding stores it. The copy and the deletion
 * are credited to whoever changed the block's structure (see
 * {@link structuralAttributions}).
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
        const { inserted, deleted } = attributions
          ? structuralAttributions(child, baseline, attributions)
          : { inserted: [], deleted: [] };
        // `node` is a decoded snapshot's, never the live document, so the split
        // doesn't reach the stored document.
        const doc = child.doc!;
        // A change that only inserted (or only deleted) still credits both
        // sides of the split, under that side's attribution kind.
        const insertedAs = inserted.length
          ? inserted
          : asKind(deleted, "insert");
        const deletedAs = deleted.length ? deleted : asKind(inserted, "delete");
        // Copied content added after the baseline keeps its own author (e.g.
        // text typed after the structural change).
        const own: Y.IdMap<any> = Y.createIdMap();
        const owned = Y.createIdSet();
        function record(tr: Y.Transaction) {
          if (insertedAs.length) {
            Y.insertIntoIdMap(
              added.inserts,
              Y.mergeIdMaps([
                Y.diffIdMap(
                  Y.createIdMapFromIdSet(tr.insertSet, insertedAs),
                  owned,
                ),
                own,
              ]),
            );
            Y.insertIntoIdMap(
              added.deletes,
              Y.createIdMapFromIdSet(tr.deleteSet, deletedAs),
            );
          }
        }
        doc.on("beforeObserverCalls", record);
        try {
          doc.transact(() => {
            const copy = child.clone();
            node.insert(index + 1, [copy]);
            // Paired while the original is still live.
            const pairs: Array<[Y.ID, Y.ID]> = [];
            if (attributions && pairClone(child, copy, pairs)) {
              for (const [original, cloned] of pairs) {
                const attrs = inBaseline(baseline, original)
                  ? undefined
                  : attributions.inserts.slice(
                      original.client,
                      original.clock,
                      1,
                    )[0]?.attrs;
                if (attrs) {
                  const ids = Y.createIdSet();
                  ids.add(cloned.client, cloned.clock, 1);
                  owned.add(cloned.client, cloned.clock, 1);
                  Y.insertIntoIdMap(own, Y.createIdMapFromIdSet(ids, attrs));
                }
              }
            }
            node.delete(index);
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
          renderAttributions = Y.createContentMap(
            Y.mergeIdMaps([attributions.inserts, added.inserts]),
            Y.mergeIdMaps([attributions.deletes, added.deletes]),
          );
        }
      }
      editor.exec(
        configureYProsemirror({
          ytype: snapshot.fragment,
          renderer: baseline
            ? Y.createDiffRenderer(
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
