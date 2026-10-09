import { configureYProsemirror } from "@y/prosemirror";
import * as Y from "@y/y";
import { diff } from "lib0/diff/patience";

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
  | "implicitDeleteAttribution"
  /**
   * A block that a type change or a move re-created shows once: a type change
   * between text blocks as a formatting change, a move (including indenting)
   * as a move, and a copy in the same place (its children changed) as
   * unchanged. Its content keeps its authors.
   */
  | "recreatedBlocks";

/**
 * Experimental fixes of how a diff between two versions is shown, each
 * including the ones before it. They only change what a diff shows, never
 * what is stored, so they can be turned on or off at any time.
 */
export type VersionDiffFixes =
  | "implicitDeleteAttribution"
  | "implicitDeleteAttributionAndRecreatedBlocks";

/** The fixes each option turns on. */
export const versionDiffFixesIncluded: Record<
  VersionDiffFixes,
  VersionDiffFix[]
> = {
  implicitDeleteAttribution: ["implicitDeleteAttribution"],
  implicitDeleteAttributionAndRecreatedBlocks: [
    "implicitDeleteAttribution",
    "recreatedBlocks",
  ],
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

  /**
   * Show `unchanged` content as unchanged (or not at all, if deleted), credit
   * each copied item to the authors that inserted its original, and mark the
   * `moved` blocks' insertion as a move.
   */
  adjust(
    unchanged: Y.IdSet,
    credits: Array<[original: Y.ID, copy: Y.ID]>,
    moved: Y.ID[],
    movedFrom: Y.Item[],
  ) {
    this.inserts = Y.diffIdMap(this.inserts, unchanged);
    this.deletes = Y.diffIdMap(this.deletes, unchanged);
    this.attributed = Y.diffIdSet(this.attributed, unchanged);
    const credited = Y.createIdSet();
    const credit: Y.IdMap<any> = Y.createIdMap();
    for (const [original, copy] of credits) {
      const attrs = this.inserts.slice(original.client, original.clock, 1)[0]
        ?.attrs;
      const ids = Y.createIdSet();
      ids.add(copy.client, copy.clock, 1);
      credited.add(copy.client, copy.clock, 1);
      Y.insertIntoIdMap(credit, Y.createIdMapFromIdSet(ids, attrs ?? []));
    }
    for (const id of moved) {
      const attrs = this.inserts.slice(id.client, id.clock, 1)[0]?.attrs ?? [];
      const ids = Y.createIdSet();
      ids.add(id.client, id.clock, 1);
      credited.add(id.client, id.clock, 1);
      Y.insertIntoIdMap(
        credit,
        Y.createIdMapFromIdSet(ids, [
          ...attrs,
          Y.createContentAttribute("moved", true),
        ]),
      );
    }
    this.inserts = Y.mergeIdMaps([Y.diffIdMap(this.inserts, credited), credit]);
    // The struck-through originals of moved blocks: their deletion is a move.
    const relabeled = Y.createIdSet();
    const relabel: Y.IdMap<any> = Y.createIdMap();
    for (const item of movedFrom) {
      const { client } = item.id;
      for (const range of this.deletes.slice(
        client,
        item.id.clock,
        item.length,
      )) {
        if (range.attrs) {
          const ids = Y.createIdSet();
          ids.add(client, range.clock, range.len);
          relabeled.add(client, range.clock, range.len);
          Y.insertIntoIdMap(
            relabel,
            Y.createIdMapFromIdSet(ids, [
              ...range.attrs,
              Y.createContentAttribute("moved", true),
            ]),
          );
        }
      }
    }
    this.deletes = Y.mergeIdMaps([
      Y.diffIdMap(this.deletes, relabeled),
      relabel,
    ]);
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

/**
 * The items of a block's content, one unit per character, mark or node. Text
 * the old binding wrapped in anonymous nodes is included.
 */
function units(
  node: Y.Node,
  out: Array<{ id: Y.ID; key: string }> = [],
): Array<{ id: Y.ID; key: string }> {
  for (let item = node._start; item !== null; item = item.right) {
    const content = item.content;
    if (content instanceof Y.ContentType && content.type.name == null) {
      out.push({ id: item.id, key: "n" });
      units(content.type, out);
      continue;
    }
    for (let i = 0; i < item.length; i++) {
      out.push({
        id: Y.createID(item.id.client, item.id.clock + i),
        key:
          content instanceof Y.ContentString
            ? `s${content.str[i]}`
            : content instanceof Y.ContentFormat
              ? `f${content.key}=${JSON.stringify(content.value)}`
              : content instanceof Y.ContentType
                ? `n${content.type.name}`
                : `e${JSON.stringify(content.getContent()[i] ?? null)}`,
      });
    }
  }
  return out;
}

/** Pairs of equal units, in order. */
function matchUnits(
  a: Array<{ id: Y.ID; key: string }>,
  b: Array<{ id: Y.ID; key: string }>,
  pairs: Array<[Y.ID, Y.ID]>,
) {
  let i = 0;
  let j = 0;
  const pairUntil = (end: number) => {
    for (; i < end; i++, j++) {
      pairs.push([a[i].id, b[j].id]);
    }
  };
  for (const change of diff(
    a.map((unit) => unit.key),
    b.map((unit) => unit.key),
  )) {
    pairUntil(change.index);
    i += change.remove.length;
    j += change.insert.length;
  }
  pairUntil(a.length);
}

/** The attribute items of `a` and `b` that hold equal values. */
function matchAttributes(a: Y.Node, b: Y.Node, pairs: Array<[Y.ID, Y.ID]>) {
  for (const [key, copy] of b._map) {
    const original = a._map.get(key);
    if (
      original &&
      JSON.stringify(original.content.getContent()) ===
        JSON.stringify(copy.content.getContent())
    ) {
      pairs.push([original.id, copy.id]);
    }
  }
}

/** A node's child nodes, deleted ones included. */
function childNodes(node: Y.Node): Y.Node[] {
  const out: Y.Node[] = [];
  for (let item = node._start; item !== null; item = item.right) {
    if (item.content instanceof Y.ContentType) {
      out.push(item.content.type);
    }
  }
  return out;
}

/**
 * A block's content node (paragraph, heading, ...). A block from the old
 * binding can hold several after a type change: prefer the one in `baseline`.
 */
function contentOf(block: Y.Node, baseline: Y.Doc): Y.Node | undefined {
  const contents = childNodes(block).filter((n) => n.name !== "blockGroup");
  return (
    contents.find((n) => inBaseline(baseline, n._item!.id)) ??
    contents.find((n) => !n._item!.deleted) ??
    contents[0]
  );
}

/**
 * Pair a block's copy with its original: the blocks, their content, and their
 * children (by id). A reformatted block's own content attributes are left
 * unpaired, so they show as the change.
 */
function matchCopy(
  original: Y.Node,
  copy: Y.Node,
  baseline: Y.Doc,
  pairs: Array<[Y.ID, Y.ID]>,
  reformatted: boolean,
) {
  pairs.push([original._item!.id, copy._item!.id]);
  matchAttributes(original, copy, pairs);
  const originalContent = contentOf(original, baseline);
  const copyContent = contentOf(copy, baseline);
  if (originalContent && copyContent) {
    pairs.push([originalContent._item!.id, copyContent._item!.id]);
    if (!reformatted) {
      matchAttributes(originalContent, copyContent, pairs);
    }
    matchUnits(units(originalContent), units(copyContent), pairs);
  }
  const originalGroup = childNodes(original).find(
    (n) => n.name === "blockGroup",
  );
  const copyGroup = childNodes(copy).find((n) => n.name === "blockGroup");
  if (originalGroup && copyGroup) {
    pairs.push([originalGroup._item!.id, copyGroup._item!.id]);
    const originals = new Map(
      childNodes(originalGroup).map((child) => [blockId(child), child]),
    );
    for (const child of childNodes(copyGroup)) {
      const match = originals.get(blockId(child));
      if (match) {
        matchCopy(match, child, baseline, pairs, false);
      }
    }
  }
}

/**
 * Blocks that were copied since `baseline`, with the original they copy.
 *
 * Changing a block's type or moving it (including indenting it) deletes the
 * block and inserts a copy with the same id: a Yjs node can't change its name
 * or position. The copy's content is then credited to whoever made the change,
 * and the diff shows the block twice. The pairs let the diff show the block
 * once, as a formatting change or a move, and credit copied content to its
 * authors.
 */
function copiedBlocks(
  doc: Y.Doc,
  baseline: Y.Doc,
  attributions: Y.ContentMap,
  holdsText: (type: string | undefined) => boolean,
): Array<{
  original: Y.Node;
  intermediates: Y.Node[];
  copy: Y.Node;
  typeChanged: boolean;
}> {
  const { inserted, deleted } = changesSince(doc, baseline);
  // A block copied several times since `baseline` (e.g. indented, then
  // outdented) leaves intermediate copies, deleted too.
  const candidates = new Map<unknown, Y.Node[]>();
  for (const item of itemsIn(doc, deleted)) {
    if (isBlock(item)) {
      const id = blockId(item.content.type);
      candidates.set(id, [...(candidates.get(id) ?? []), item.content.type]);
    }
  }
  const copies = itemsIn(doc, inserted).flatMap((item) =>
    isBlock(item) && !item.deleted ? [item.content.type] : [],
  );
  return copies.flatMap((copy) => {
    const blocks = candidates.get(blockId(copy)) ?? [];
    // Concurrent changes can leave several copies: showing each as the
    // original would hide that the block is now there more than once.
    if (copies.filter((other) => blockId(other) === blockId(copy)).length > 1) {
      return [];
    }
    // The copies before this one, oldest first. The block that was in
    // `baseline` is the original; without one, the oldest copy is, if the
    // order is known.
    const chain = copyChain(copy, blocks, attributions);
    const inEarlier = blocks.find((block) =>
      inBaseline(baseline, block._item!.id),
    );
    const original =
      inEarlier ?? chain[0] ?? (blocks.length === 1 ? blocks[0] : undefined);
    if (!original) {
      return [];
    }
    // Without a known order back to the original, intermediates aren't used.
    const intermediates = chain[0] === original ? chain.slice(1) : [];
    const from = contentOf(original, baseline)?.name;
    const to = contentOf(copy, baseline)?.name;
    // Only text blocks change type in place: an image turned into a paragraph
    // has lost the image.
    if (from !== to && !(holdsText(from) && holdsText(to))) {
      return [];
    }
    return [{ original, intermediates, copy, typeChanged: from !== to }];
  });
}

/**
 * The deleted copies `copy` was made from, oldest first. A change that copies
 * a block inserts the copy and deletes the block it copies, in one update: so
 * the copy before is the one whose deletion has the same users and times as
 * this copy's insertion. Stops where that isn't exactly one block.
 */
function copyChain(
  copy: Y.Node,
  blocks: Y.Node[],
  attributions: Y.ContentMap,
): Y.Node[] {
  const chain: Y.Node[] = [];
  const left = new Set(blocks);
  for (let current = copy; ;) {
    const change = changeOf(current._item!, attributions.inserts, "insert");
    let previous = [...left].filter(
      (block) =>
        change !== undefined &&
        changeOf(block._item!, attributions.deletes, "delete") === change,
    );
    // One update can copy a block more than once (e.g. retype, then indent):
    // of its deleted copies, the newer one was also made by that update.
    if (previous.length > 1) {
      previous = previous.filter(
        (block) =>
          changeOf(block._item!, attributions.inserts, "insert") === change,
      );
    }
    if (previous.length !== 1) {
      return chain;
    }
    chain.unshift(previous[0]);
    left.delete(previous[0]);
    current = previous[0];
  }
}

/**
 * Pair the copy's content that the original doesn't have with the
 * intermediate copy it was typed into: the oldest one holding it.
 */
function matchTypedInCopies(
  intermediates: Y.Node[],
  copy: Y.Node,
  baseline: Y.Doc,
  pairs: Array<[Y.ID, Y.ID]>,
) {
  const copyContent = contentOf(copy, baseline);
  if (!copyContent) {
    return;
  }
  const paired = Y.createIdSet();
  for (const [, b] of pairs) {
    paired.add(b.client, b.clock, 1);
  }
  const unpaired = units(copyContent).filter(
    ({ id }) => !paired.has(id.client, id.clock),
  );
  for (const intermediate of intermediates) {
    const content = contentOf(intermediate, baseline);
    if (!content) {
      continue;
    }
    const found: Array<[Y.ID, Y.ID]> = [];
    matchUnits(units(content), unpaired, found);
    for (const [a, b] of found) {
      if (!paired.has(b.client, b.clock)) {
        pairs.push([a, b]);
        paired.add(b.client, b.clock, 1);
      }
    }
  }
}

/** The users and times of an item's insertion or deletion, as a key. */
function changeOf(
  item: Y.Item,
  map: Y.IdMap<any>,
  kind: "insert" | "delete",
): string | undefined {
  const attrs = map.slice(item.id.client, item.id.clock, 1)[0]?.attrs ?? [];
  function values(name: string) {
    return attrs
      .filter((attr) => attr.name === name)
      .map((attr) => String(attr.val))
      .sort()
      .join(",");
  }
  const users = values(kind);
  return users ? `${users}@${values(`${kind}At`)}` : undefined;
}

/** Whether some unit of `item` is in `lost` but not in `kept`. */
function losesUnit(item: Y.Item, lost: Y.IdSet, kept: Y.IdSet): boolean {
  for (let i = 0; i < item.length; i++) {
    const clock = item.id.clock + i;
    if (lost.has(item.id.client, clock) && !kept.has(item.id.client, clock)) {
      return true;
    }
  }
  return false;
}

/**
 * Whether `copy` replaced `original` where it stood: in the same list, with
 * only deleted items between them. Changing a block's children does that.
 */
function inPlace(original: Y.Node, copy: Y.Node): boolean {
  for (const side of ["left", "right"] as const) {
    for (let item = copy._item?.[side]; item; item = item[side]) {
      if (item === original._item) {
        return true;
      }
      if (!item.deleted) {
        break;
      }
    }
  }
  return false;
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
 * Show each copied block (see {@link copiedBlocks}) once: when the earlier
 * version has the original, render the copy as the original plus the change
 * (formatting change or move); otherwise credit the copied content to the
 * original's authors.
 */
function showCopiesOnce(
  editor: BlockNoteEditor<any, any, any>,
  snapshot: { doc: Y.Doc; fragment: Y.Node },
  earlier: { doc: Y.Doc; fragment: Y.Node },
  renderer: SnapshotDiffRenderer,
) {
  const doc = snapshot.doc;
  const baseline = earlier.doc;
  // Deleted content that was in the earlier version.
  const { inserted, deleted } = changesSince(doc, baseline);
  const removed = Y.diffIdSet(deleted, inserted);
  const removedContent = itemsIn(doc, removed).filter(
    // Content only: not attributes, nor structure (child groups, whose
    // children are checked themselves, and the old binding's anonymous text
    // wrappers).
    (item) =>
      item.parentSub === null &&
      !(
        item.content instanceof Y.ContentType &&
        (item.content.type.name == null ||
          item.content.type.name === "blockGroup")
      ),
  );
  const matches = copiedBlocks(
    doc,
    baseline,
    Y.createContentMap(renderer.inserts, renderer.deletes),
    (type) =>
      type !== undefined &&
      editor.schema.blockSpecs[type]?.config.content === "inline",
  ).map(({ original, intermediates, copy, typeChanged }) => {
    const pairs: Array<[Y.ID, Y.ID]> = [];
    matchCopy(original, copy, baseline, pairs, typeChanged);
    matchTypedInCopies(intermediates, copy, baseline, pairs);
    return { original, copy, typeChanged, pairs };
  });

  // An original in the earlier version is shown as its copy, so only the
  // change shows. Unless content it had made it into no copy (it was lost
  // with the original): then show both, so the loss shows too. Content that
  // moved out (into another shown copy) isn't lost.
  let shown = matches.filter((match) =>
    inBaseline(baseline, match.original._item!.id),
  );
  const removedFrom = new Map<Y.Node, Y.Item[]>();
  const originals = new Set(shown.map(({ original }) => original));
  for (const item of removedContent) {
    for (const block of within(item, originals)) {
      removedFrom.set(block, [...(removedFrom.get(block) ?? []), item]);
    }
  }
  for (let changed = true; changed;) {
    const kept = Y.createIdSet();
    for (const { pairs } of shown) {
      for (const [a] of pairs) {
        kept.add(a.client, a.clock, 1);
      }
    }
    const next = shown.filter(
      ({ original }) =>
        // Per unit: a deleted item can span content deleted before.
        !removedFrom
          .get(original)
          ?.some((item) => losesUnit(item, removed, kept)),
    );
    changed = next.length !== shown.length;
    shown = next;
  }
  const shownMatches = new Set(shown);

  // A block that moved elsewhere also shows its original, struck through, at
  // the old place. One indented or outdented keeps its place in reading
  // order, so it only shows at the new place. Blocks moved with a parent are
  // struck through with it.
  const before = readingOrder(earlier.fragment);
  const after = readingOrder(snapshot.fragment);
  const above = blocksAbove(before, new Set(after));
  const aboveNow = blocksAbove(after, new Set(before));
  function isMove({ original, copy, typeChanged }: (typeof matches)[number]) {
    return !typeChanged && !inPlace(original, copy);
  }
  // Another block above it than before: not only indented or outdented.
  const reorderedOriginals = new Set(
    shown
      .filter(
        (match) =>
          isMove(match) &&
          above.get(blockId(match.copy)) !== aboveNow.get(blockId(match.copy)),
      )
      .map(({ original }) => original),
  );
  function struck(original: Y.Node) {
    return within(original._item!, reorderedOriginals).length > 0;
  }

  const unchanged = Y.createIdSet();
  const credits: Array<[Y.ID, Y.ID]> = [];
  const moved: Y.ID[] = [];
  for (const match of matches) {
    const { original, copy, pairs } = match;
    if (!inBaseline(baseline, original._item!.id)) {
      credits.push(...pairs);
      continue;
    }
    if (!shownMatches.has(match)) {
      continue;
    }
    // A block that moved stays marked, as a move. One copied in place (its
    // children changed) shows unchanged.
    const move = isMove(match);
    for (const [a, b] of pairs) {
      // Content added to the original after the earlier version isn't
      // unchanged: the copy is credited to whoever added it.
      if (!inBaseline(baseline, a)) {
        credits.push([a, b]);
        continue;
      }
      if (!(move && struck(original))) {
        unchanged.add(a.client, a.clock, 1);
      }
      if (!move || b !== copy._item!.id) {
        unchanged.add(b.client, b.clock, 1);
      }
    }
    if (move) {
      moved.push(copy._item!.id);
    }
  }
  const movedFrom = itemsIn(doc, removed).filter(
    (item) => within(item, reorderedOriginals).length > 0,
  );
  renderer.adjust(unchanged, credits, moved, movedFrom);
}

/** The blocks among `blocks` that are `item`'s node or hold it. */
function within(item: Y.Item, blocks: Set<Y.Node>): Y.Node[] {
  const found: Y.Node[] = [];
  let node: Y.Node | null =
    item.content instanceof Y.ContentType
      ? item.content.type
      : (item.parent as Y.Node);
  while (node) {
    if (blocks.has(node)) {
      found.push(node);
    }
    node = (node._item?.parent as Y.Node | undefined) ?? null;
  }
  return found;
}

/** The ids of the blocks under `node`, top to bottom, nesting ignored. */
function readingOrder(node: Y.Node, out: unknown[] = []): unknown[] {
  for (let item = node._start; item !== null; item = item.right) {
    if (!item.deleted && item.content instanceof Y.ContentType) {
      if (isBlock(item)) {
        out.push(blockId(item.content.type));
      }
      readingOrder(item.content.type, out);
    }
  }
  return out;
}

/**
 * For each block id in `order`, the block above it, counting only blocks in
 * `other` too. An indent or outdent keeps it.
 */
function blocksAbove(
  order: unknown[],
  other: Set<unknown>,
): Map<unknown, unknown> {
  const above = new Map<unknown, unknown>();
  let previous: unknown = undefined;
  for (const id of order) {
    if (other.has(id)) {
      above.set(id, previous);
      previous = id;
    }
  }
  return above;
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
      let renderer: Y.DiffRenderer | undefined;
      if (baseline && keepDeleted) {
        const snapshotRenderer = new SnapshotDiffRenderer(
          baseline.doc,
          snapshot.doc,
          options,
        );
        if (hasFix(experimental, "recreatedBlocks")) {
          showCopiesOnce(editor, snapshot, baseline, snapshotRenderer);
        }
        renderer = snapshotRenderer;
      } else if (baseline) {
        renderer = Y.createDiffRenderer(baseline.doc, snapshot.doc, options);
      }
      editor.exec(
        configureYProsemirror({ ytype: snapshot.fragment, renderer }),
      );
    } finally {
      destroyDecodedFragment(snapshot);
    }
  } finally {
    destroyDecodedFragment(baseline);
  }
}
