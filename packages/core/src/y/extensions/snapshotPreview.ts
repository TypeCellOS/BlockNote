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
