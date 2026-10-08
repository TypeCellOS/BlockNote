import { configureYProsemirror } from "@y/prosemirror";
import * as Y from "@y/y";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { findTypeInOtherYdoc } from "../utils.js";
import { blockMatchNodes } from "./blockMatchNodes.js";
import {
  decodeFragmentUpdate,
  destroyDecodedFragment,
} from "./snapshotCodec.js";

/** A fix of how a diff between two versions is shown. */
export type VersionDiffFix =
  /**
   * Content deleted without anyone deleting it (with a concurrently deleted
   * block, or with a moved block's lost copy) isn't credited to the user whose
   * change removed it.
   */
  "implicitDeleteAttribution";

/**
 * Experimental fixes of how a diff between two versions is shown, each
 * including the ones before it. They only change what a diff shows, never
 * what is stored, so they can be turned on or off at any time.
 */
export type VersionDiffFixes = "implicitDeleteAttribution";

/** The fixes each option turns on. */
export const versionDiffFixesIncluded: Record<
  VersionDiffFixes,
  VersionDiffFix[]
> = {
  implicitDeleteAttribution: ["implicitDeleteAttribution"],
};

export type ExperimentalVersionDiffs = { versionDiffFixes?: VersionDiffFixes };

function hasFix(
  experimental: ExperimentalVersionDiffs,
  fix: VersionDiffFix,
): boolean {
  return (
    experimental.versionDiffFixes !== undefined &&
    versionDiffFixesIncluded[experimental.versionDiffFixes].includes(fix)
  );
}

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
        } else if (this.deletedWithParent(client, contents[i])) {
          // Shown inside the parent's deletion, as without `gc: false`.
          contents[i].deleted = false;
          contents[i].attrs = null;
        }
      }
    }
  }

  /** Whether the content's deletion is the same as its deleted parent's. */
  private deletedWithParent(
    client: number,
    {
      clock,
      attrs,
    }: { clock: number; attrs: Y.ContentAttribute<any>[] | null },
  ): boolean {
    const structs = this._nextDoc.store.clients.get(client);
    const item = structs?.[Y.findIndexSS(structs, clock)];
    const parent = item instanceof Y.Item ? item.parent?._item : null;
    if (!parent?.deleted) {
      return false;
    }
    const [own] = this.deletes.slice(parent.id.client, parent.id.clock, 1);
    return sameAttributes(own?.attrs ?? null, attrs);
  }
}

/** Whether two attributions show the same, ignoring timestamps (`deleteAt`, ...). */
function sameAttributes(
  a: Y.ContentAttribute<any>[] | null,
  b: Y.ContentAttribute<any>[] | null,
): boolean {
  function shown(attrs: Y.ContentAttribute<any>[] | null) {
    return (attrs ?? []).filter((attr) => !attr.name.endsWith("At"));
  }
  const [x, y] = [shown(a), shown(b)];
  return (
    (a === null) === (b === null) &&
    x.length === y.length &&
    x.every((p) => y.some((q) => p.name === q.name && p.val === q.val))
  );
}

/**
 * The delete attributions of moved blocks that are gone, with their content,
 * without the movers.
 *
 * A move (indenting, dragging, a type change, ...) deletes a block and inserts
 * a copy with the same id. While a copy is shown, the diff shows the move as
 * is. Once every copy is gone, only the original's deletion is shown, and
 * that names the mover, who may not have deleted it: the copy can be lost
 * with a concurrently deleted parent, or deleted later by someone else. So the
 * movers are left out; whoever else deleted the original (e.g. with its
 * parent) still is. With nobody left, it's shown without an author.
 */
function withoutLostMovers(
  doc: Y.Doc,
  baseline: Y.Doc,
  attributions: Y.ContentMap,
  deletes: Y.IdMap<any>,
): Y.IdMap<any> {
  const { inserted, deleted } = changesSince(doc, baseline);
  const copies = new Map<unknown, Y.Item[]>();
  for (const item of itemsIn(doc, inserted)) {
    if (isBlock(item)) {
      const id = blockId(item.content.type);
      copies.set(id, [...(copies.get(id) ?? []), item]);
    }
  }
  // Deleted content that was in the earlier version.
  const removed = itemsIn(doc, Y.diffIdSet(deleted, inserted));
  const lost = removed.filter(isBlock).flatMap((item) => {
    const id = blockId(item.content.type);
    const moved = id == null ? undefined : copies.get(id);
    if (!moved?.every((copy) => copy.deleted)) {
      return [];
    }
    const movers = new Set(
      moved.flatMap((copy) =>
        (
          attributions.inserts.slice(copy.id.client, copy.id.clock, 1)[0]
            ?.attrs ?? []
        )
          .filter((attr) => attr.name === "insert")
          .map((attr) => attr.val),
      ),
    );
    return [{ block: item.content.type, movers }];
  });
  const replaced = Y.createIdSet();
  const replacement: Y.IdMap<any> = Y.createIdMap();
  for (const item of removed) {
    const { movers } =
      lost.find(
        ({ block }) => item === block._item || Y.isParentOf(block, item),
      ) ?? {};
    if (!movers) {
      continue;
    }
    const { client } = item.id;
    for (const range of deletes.slice(client, item.id.clock, item.length)) {
      if (!range.attrs) {
        continue;
      }
      const ids = Y.createIdSet();
      ids.add(client, range.clock, range.len);
      replaced.add(client, range.clock, range.len);
      const kept = range.attrs.filter(
        (attr) => !(attr.name === "delete" && movers.has(attr.val)),
      );
      if (kept.some((attr) => attr.name === "delete")) {
        Y.insertIntoIdMap(replacement, Y.createIdMapFromIdSet(ids, kept));
      }
    }
  }
  return Y.mergeIdMaps([Y.diffIdMap(deletes, replaced), replacement]);
}

/** The ids inserted, and the ids deleted, in `doc` since `baseline`. */
function changesSince(doc: Y.Doc, baseline: Y.Doc) {
  return {
    inserted: Y.diffIdSet(
      Y.createInsertSetFromStructStore(doc.store, false),
      Y.createInsertSetFromStructStore(baseline.store, false),
    ),
    deleted: Y.diffIdSet(
      Y.createDeleteSetFromStructStore(doc.store),
      Y.createDeleteSetFromStructStore(baseline.store),
    ),
  };
}

/** The items of `doc` that `ids` covers. */
function itemsIn(doc: Y.Doc, ids: Y.IdSet): Y.Item[] {
  const items: Y.Item[] = [];
  // A transaction only because the iteration may split items; content is unchanged.
  doc.transact((tr) =>
    Y.iterateStructsByIdSet(tr, ids, (struct) => {
      if (struct instanceof Y.Item) {
        items.push(struct);
      }
    }),
  );
  return items;
}

function isBlock(item: Y.Item): item is Y.Item & { content: Y.ContentType } {
  return (
    item.content instanceof Y.ContentType &&
    item.content.type.name === "blockContainer"
  );
}

/** A block's id, also when the block is deleted (its attributes read as unset). */
function blockId(block: Y.Node): unknown {
  return block._map.get("id")?.content.getContent().at(-1);
}

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
        function record(tr: Y.Transaction) {
          if (insertedAs.length) {
            Y.insertIntoIdMap(
              added.inserts,
              Y.createIdMapFromIdSet(tr.insertSet, insertedAs),
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
  experimental: ExperimentalVersionDiffs = {},
): void {
  // Deleted content is needed to tell what a user deleted from what was lost
  // with something else.
  const keepDeleted = hasFix(experimental, "implicitDeleteAttribution");
  const baseline = compareToContent
    ? decodeFragmentUpdate(fragment, compareToContent, {
        suggestionDoc: true,
        keepDeleted,
      })
    : undefined;
  try {
    const snapshot = decodeFragmentUpdate(fragment, snapshotContent, {
      keepDeleted,
    });
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
            hasFix(experimental, "implicitDeleteAttribution")
              ? withoutLostMovers(
                  snapshot.doc,
                  baseline.doc,
                  attributions,
                  deletes,
                )
              : deletes,
          );
        }
      }
      const options = renderAttributions
        ? { attributions: renderAttributions }
        : undefined;
      editor.exec(
        configureYProsemirror({
          ytype: snapshot.fragment,
          renderer: baseline
            ? keepDeleted
              ? new SnapshotDiffRenderer(baseline.doc, snapshot.doc, options)
              : Y.createDiffRenderer(baseline.doc, snapshot.doc, options)
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
