import type { FlatBlock } from "../model.js";
import type { BlockIndex } from "../util/blocks/index.js";
import type { KeptRow, TargetRow } from "./types.js";

/**
 * A place in the target document: the root, the block of a row of the text (a
 * new or a kept block), or a hidden ancestor (a source block without a view
 * block, for example a column, that a kept block keeps as its ancestor).
 *
 * @internal
 */
export type Place =
  | { kind: "root" }
  | { kind: "row"; index: number }
  | { kind: "hidden"; id: string };

/**
 * A key for a place, unique in one build of the target document.
 *
 * @internal
 */
export function keyOf(place: Place): string {
  switch (place.kind) {
    case "root":
      return "root";
    case "row":
      return `row:${place.index}`;
    case "hidden":
      return `hidden:${place.id}`;
  }
}

/**
 * One step of the build: `block` goes into `parent`, after its last child.
 */
type BuildStep = { block: Place; parent: Place };

const ROOT: Place = { kind: "root" };

/**
 * The list of each list item type: numbered list items make an ordered
 * list, the other list items make a bullet list. The exporters of
 * BlockNote group the list items in this way (`createExternalHTMLExporter`
 * in core), thus markdown and HTML show such adjacent items as one list.
 */
const LISTS: ReadonlyMap<string, "ordered" | "bullet"> = new Map([
  ["numberedListItem", "ordered"],
  ["bulletListItem", "bullet"],
  ["checkListItem", "bullet"],
  ["toggleListItem", "bullet"],
]);

/**
 * Decides the parent of each block of the rows: the steps of the build, in
 * the order of the text. The blocks go into the parent that the text shows,
 * with two exceptions. A kept block keeps a nesting that the format does not
 * show (for example a paragraph in a bullet, in markdown), if the text did
 * not change its nesting and the parent is still open. A new block before
 * such a block goes into the same nesting (see `keptParent`). And list items
 * that the text shows as one list share the parent of that list (see
 * `listParent`). Hidden ancestors that a block keeps get a step too, before
 * the block.
 *
 * Method: our own design.
 *
 * @internal
 */
export function decideParents(input: NestingInput): BuildStep[] {
  return new ParentDecisions(input).decide();
}

/**
 * The open ancestors of the build, in the order of the text: a stack of the
 * last block at each depth. A block goes into an open ancestor, and closes
 * the blocks below it. Each attach is one step of the build.
 */
class OpenAncestors {
  private readonly stack: string[] = [keyOf(ROOT)];
  private readonly parents = new Map<string, Place>();
  readonly steps: BuildStep[] = [];

  attach(block: Place, parent: Place) {
    const depth = this.depthOf(parent);
    if (depth === -1) {
      throw new Error(`The place ${keyOf(parent)} is not an open ancestor`);
    }
    this.stack.length = depth + 1;
    this.stack.push(keyOf(block));
    this.parents.set(keyOf(block), parent);
    this.steps.push({ block, parent });
  }

  /** The parent of a block that has a step, or `undefined`. */
  parentOf(block: Place): Place | undefined {
    return this.parents.get(keyOf(block));
  }

  isOpen(place: Place): boolean {
    return this.depthOf(place) !== -1;
  }

  /** The depth of an open ancestor, or -1. */
  depthOf(place: Place): number {
    return this.stack.indexOf(keyOf(place));
  }
}

type NestingInput = {
  rows: readonly TargetRow[];
  /** The blocks of the text, in a flat list (for their parents and types). */
  incoming: readonly FlatBlock[];
  /** The view blocks (for their parents and types). */
  view: readonly FlatBlock[];
  source: BlockIndex;
  invisibleIds: ReadonlySet<string>;
  /** The source blocks that stay (see `Correspondence.kept`). */
  kept: ReadonlySet<string>;
};

/** The nesting rules of {@link decideParents}, with the state of the decisions. */
class ParentDecisions {
  private readonly open = new OpenAncestors();
  /** The place of each source block that is in the target: a kept block or a hidden ancestor. */
  private readonly placeOf = new Map<string, Place>();
  /** The first kept row at or after each index, with its index. */
  private readonly keptFrom: ({ index: number; row: KeptRow } | undefined)[];
  /** The index of the text block before each text block in its text parent. */
  private readonly previousSibling: (number | undefined)[];

  private readonly rows: NestingInput["rows"];
  private readonly incoming: NestingInput["incoming"];
  private readonly view: NestingInput["view"];
  private readonly source: NestingInput["source"];
  private readonly invisibleIds: NestingInput["invisibleIds"];
  private readonly kept: NestingInput["kept"];

  constructor(input: NestingInput) {
    this.rows = input.rows;
    this.incoming = input.incoming;
    this.view = input.view;
    this.source = input.source;
    this.invisibleIds = input.invisibleIds;
    this.kept = input.kept;
    const { rows } = input;
    this.keptFrom = new Array(rows.length + 1);
    for (let k = rows.length - 1; k >= 0; k--) {
      const row = rows[k];
      this.keptFrom[k] =
        row.kind === "kept" ? { index: k, row } : this.keptFrom[k + 1];
    }
    const lastChild = new Map<number | undefined, number>();
    this.previousSibling = input.incoming.map(({ parentIndex }, j) => {
      const previous = lastChild.get(parentIndex);
      lastChild.set(parentIndex, j);
      return previous;
    });
  }

  decide(): BuildStep[] {
    this.rows.forEach((row, j) => {
      const place: Place = { kind: "row", index: j };
      switch (row.kind) {
        case "skipped":
          return;
        case "new":
          this.open.attach(place, this.asNew(j));
          return;
        case "kept":
          this.open.attach(place, this.keptParent(j, row));
          this.placeOf.set(row.id, place);
          return;
      }
    });
    return this.open.steps;
  }

  /** The type of the block at a place. */
  private typeOf(place: Place): string {
    switch (place.kind) {
      case "root":
        return "";
      case "row": {
        const row = this.rows[place.index];
        return row.kind === "skipped" ? "" : row.fields.type;
      }
      case "hidden":
        return this.source.block(place.id).type;
    }
  }

  /** The place of the nearest text ancestor of text block `j` that is in the target, or the root. */
  private textParent(j: number): Place {
    for (
      let p = this.incoming[j].parentIndex;
      p !== undefined;
      p = this.incoming[p].parentIndex
    ) {
      if (this.rows[p].kind !== "skipped") {
        return { kind: "row", index: p };
      }
    }
    return ROOT;
  }

  /**
   * Returns true if the text shows kept text block `j` with the nesting
   * of its view block: the same parent, with the same type. A format can
   * show the children of different types in different ways (for example
   * HTML, the children of a toggle and of a bullet). Thus, after a change of
   * the parent type, a nesting that the view did not show can show.
   */
  private nestingUnchanged(j: number, row: KeptRow): boolean {
    const textParentIndex = this.incoming[j].parentIndex;
    const viewParentIndex = this.view[row.viewIndex].parentIndex;
    return textParentIndex === undefined
      ? viewParentIndex === undefined
      : this.rows[textParentIndex].viewIndex === viewParentIndex &&
          viewParentIndex !== undefined &&
          this.view[viewParentIndex].block.type ===
            this.incoming[textParentIndex].block.type;
  }

  /**
   * Returns the place of the source parent of kept block `id`, if the block
   * can stay in it: the parent and the ancestors stay, the parent is an open
   * ancestor, and the parent keeps its type. Hidden ancestors that are not in
   * the target yet get a step here. If not, returns `undefined`.
   */
  private sourceParent(id: string): Place | undefined {
    const hidden = this.hiddenAncestors(id);
    const visible = this.source.parent(hidden.at(-1) ?? id);
    let parent = visible === undefined ? ROOT : this.placeOf.get(visible);
    if (
      parent === undefined ||
      !this.open.isOpen(parent) ||
      hidden.some((ancestor) => !this.kept.has(ancestor)) ||
      // The format did not show the nesting under the type of the source
      // parent. Under a new type (for example a bullet instead of a
      // paragraph), the format can show it, thus the text decides.
      (visible !== undefined &&
        this.typeOf(parent) !== this.source.block(visible).type)
    ) {
      return undefined;
    }
    for (const ancestor of hidden.reverse()) {
      let place = this.placeOf.get(ancestor);
      if (place === undefined) {
        place = { kind: "hidden", id: ancestor };
        this.open.attach(place, parent);
        this.placeOf.set(ancestor, place);
      } else if (!this.open.isOpen(place)) {
        return undefined;
      }
      parent = place;
    }
    return parent;
  }

  /**
   * The parent of a new block `j`: the parent of its list (see
   * {@link listParent}), else the nesting of the next kept block, else the
   * parent of the text.
   */
  private asNew(j: number): Place {
    return this.listParent(j) ?? this.nestingOfNext(j) ?? this.textParent(j);
  }

  /**
   * List items that the text shows as one list share the parent of that
   * list. Returns that parent for text block `j`: the parent of the block
   * before it in its text parent, if both are list items of the same list,
   * and that parent is still open. The parent can be a nesting that the
   * format does not show (for example a paragraph with a list in it, in
   * markdown). Else, returns `undefined`.
   */
  private listParent(j: number): Place | undefined {
    const previous = this.previousSibling[j];
    const list = LISTS.get(this.incoming[j].block.type);
    if (
      previous === undefined ||
      list === undefined ||
      LISTS.get(this.incoming[previous].block.type) !== list
    ) {
      return undefined;
    }
    const parent = this.open.parentOf({ kind: "row", index: previous });
    return parent !== undefined && this.open.isOpen(parent)
      ? parent
      : undefined;
  }

  /**
   * Returns the source parent of the next kept block after new block `j`, if
   * that block has the same text parent and keeps a nesting that the text
   * does not show. The new block then goes into the same nesting, before it.
   */
  private nestingOfNext(j: number): Place | undefined {
    const next = this.nextKept(j);
    return next !== undefined ? this.sourceParent(next.row.id) : undefined;
  }

  /**
   * The next kept block after block `j`, if it has the same text parent and
   * keeps the nesting of its view block. Else `undefined`.
   */
  private nextKept(j: number): { index: number; row: KeptRow } | undefined {
    const next = this.keptFrom[j + 1];
    if (next === undefined) {
      return undefined;
    }
    const { index, row } = next;
    return this.incoming[index].parentIndex === this.incoming[j].parentIndex &&
      this.nestingUnchanged(index, row)
      ? next
      : undefined;
  }

  /**
   * The parent of kept block `j` in the target:
   *
   * - If the text changed the nesting of the block, the parent of the text.
   *   There are two exceptions: if the text moved the block together with
   *   its hidden parent, the block stays in that parent (see
   *   {@link parentMovedAlong}), and a list item goes into the parent of
   *   its list (see {@link listParent}).
   * - Else, the source parent, with the nesting that the format does not
   *   show (for example a column). There are two exceptions. A block that
   *   the text moved to a place outside its hidden blocks (none of them is
   *   open, and the next kept block is not in one of them) does not keep
   *   that nesting. A block between two blocks of an open hidden block (for
   *   example the blocks of two columns) does not close it.
   * - In these cases, and if the source parent is not open any more, the
   *   block goes where a new block goes (see {@link asNew}).
   */
  private keptParent(j: number, row: KeptRow): Place {
    if (!this.nestingUnchanged(j, row)) {
      return (
        this.parentMovedAlong(j, row) ??
        this.listParent(j) ??
        this.textParent(j)
      );
    }
    if (row.moved && !this.isNearHiddenAncestor(j, row.id)) {
      return this.asNew(j);
    }
    const parent = this.sourceParent(row.id);
    if (parent === undefined) {
      return this.asNew(j);
    }
    return this.nextNeedsOpenHiddenBlock(j, parent)
      ? (this.nestingOfNext(j) ?? parent)
      : parent;
  }

  /**
   * Returns the place of the source parent of kept block `j`, if the format
   * does not show that nesting and the text moved the block together with
   * that parent. The view shows the block as a later sibling of its parent
   * (for example a paragraph in a paragraph, in markdown), and the text
   * shows the two blocks as siblings too, in a different parent (for
   * example after a change of the type of the list item around them, or
   * after an indent of the two blocks). The parent stays, keeps its type,
   * and is open. Else, returns `undefined`.
   */
  private parentMovedAlong(j: number, row: KeptRow): Place | undefined {
    const parentId = this.source.parent(row.id);
    const place =
      parentId === undefined ? undefined : this.placeOf.get(parentId);
    if (place?.kind !== "row" || !this.open.isOpen(place)) {
      return undefined;
    }
    const parentRow = this.rows[place.index];
    return parentRow.kind === "kept" &&
      parentRow.fields.type === this.source.block(parentRow.id).type &&
      this.view[parentRow.viewIndex].parentIndex ===
        this.view[row.viewIndex].parentIndex &&
      this.incoming[place.index].parentIndex === this.incoming[j].parentIndex
      ? place
      : undefined;
  }

  /** The hidden ancestors of a source block: the ancestors up to the first visible one. */
  private hiddenAncestors(id: string): string[] {
    const ancestors: string[] = [];
    for (
      let ancestor = this.source.parent(id);
      ancestor !== undefined && this.invisibleIds.has(ancestor);
      ancestor = this.source.parent(ancestor)
    ) {
      ancestors.push(ancestor);
    }
    return ancestors;
  }

  /**
   * Returns true if a hidden ancestor of kept block `j` is at its new place:
   * the ancestor is open, or the next kept block is also in it. A block
   * without hidden ancestors can have a visible parent that the format does
   * not show as its parent (for example a paragraph with a list in it, in
   * markdown). That block is near its nesting if that parent is open, or if
   * the block is at the top level.
   */
  private isNearHiddenAncestor(j: number, id: string): boolean {
    const own = this.hiddenAncestors(id);
    if (own.length === 0) {
      const parent = this.source.parent(id);
      return parent === undefined || this.isOpenSource(parent);
    }
    if (own.some((ancestor) => this.isOpenSource(ancestor))) {
      return true;
    }
    const next = this.nextKept(j);
    const ofNext = new Set(
      next === undefined ? [] : this.hiddenAncestors(next.row.id),
    );
    return own.some((ancestor) => ofNext.has(ancestor));
  }

  /** Returns true if the source block is in the target, and is an open ancestor. */
  private isOpenSource(id: string): boolean {
    const place = this.placeOf.get(id);
    return place !== undefined && this.open.isOpen(place);
  }

  /**
   * Returns true if the next kept block after block `j` needs a hidden block
   * that is open below `parent`. If block `j` went into `parent`, it would
   * close that hidden block, and the next block cannot go back into it.
   * An example is a top-level block that the text puts between the blocks
   * of two columns. This does not change the target.
   */
  private nextNeedsOpenHiddenBlock(j: number, parent: Place): boolean {
    const next = this.nextKept(j);
    const depth = this.open.depthOf(parent);
    return (
      next !== undefined &&
      this.hiddenAncestors(next.row.id).some((ancestor) => {
        const place = this.placeOf.get(ancestor);
        return place !== undefined && this.open.depthOf(place) > depth;
      })
    );
  }
}
