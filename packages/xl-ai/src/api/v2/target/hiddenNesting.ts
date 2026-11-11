import type { FlatBlock } from "../model.js";
import type { BlockIndex } from "../util/blocks/index.js";
import type { KeptRow, TreeRow } from "./types.js";

/**
 * A place in the target tree: the root, the block of a row of the text (a
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
 * A key for a place, unique in one build of the target tree.
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
 * Decides the parent of each block of the rows: the steps of the build, in
 * the order of the text. The blocks go into the parent that the text shows,
 * with one exception: a kept block keeps a nesting that the format does not
 * show (for example a paragraph in a bullet, in markdown), if the text did
 * not change its nesting and the parent is still open. A new block before
 * such a block goes into the same nesting (see `keptParent`). Hidden
 * ancestors that a block keeps get a step too, before the block.
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
  readonly steps: BuildStep[] = [];

  attach(block: Place, parent: Place) {
    const depth = this.depthOf(parent);
    if (depth === -1) {
      throw new Error(`The place ${keyOf(parent)} is not an open ancestor`);
    }
    this.stack.length = depth + 1;
    this.stack.push(keyOf(block));
    this.steps.push({ block, parent });
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
  rows: readonly TreeRow[];
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
  /** The place of each source block that is in the tree: a kept block or a hidden ancestor. */
  private readonly placeOf = new Map<string, Place>();
  /** The first kept row at or after each index, with its index. */
  private readonly keptFrom: ({ index: number; row: KeptRow } | undefined)[];

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
  }

  decide(): BuildStep[] {
    this.rows.forEach((row, j) => {
      const place: Place = { kind: "row", index: j };
      switch (row.kind) {
        case "skipped":
          return;
        case "new":
          this.open.attach(place, this.nestingOfNext(j) ?? this.textParent(j));
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

  /** The place of the nearest text ancestor of text block `j` that is in the tree, or the root. */
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
   * the tree yet get a step here. If not, returns `undefined`.
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
   * - Else, the source parent, with the nesting that the format does not
   *   show (for example a column). There are two exceptions. A block that
   *   the text moved to a place outside its hidden blocks (none of them is
   *   open, and the next kept block is not in one of them) does not keep
   *   that nesting. A block between two blocks of an open hidden block (for
   *   example the blocks of two columns) does not close it.
   * - In these cases, and if the source parent is not open any more, the
   *   block goes where a new block goes: into the nesting of the next kept
   *   block, or else into the parent of the text.
   */
  private keptParent(j: number, row: KeptRow): Place {
    if (!this.nestingUnchanged(j, row)) {
      return this.textParent(j);
    }
    const asNew = () => this.nestingOfNext(j) ?? this.textParent(j);
    if (row.moved && !this.isNearHiddenAncestor(j, row.id)) {
      return asNew();
    }
    const parent = this.sourceParent(row.id);
    if (parent === undefined) {
      return asNew();
    }
    return this.nextNeedsOpenHiddenBlock(j, parent)
      ? (this.nestingOfNext(j) ?? parent)
      : parent;
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
   * the ancestor is open, or the next kept block is also in it.
   */
  private isNearHiddenAncestor(j: number, id: string): boolean {
    const own = this.hiddenAncestors(id);
    if (own.some((ancestor) => this.isOpenSource(ancestor))) {
      return true;
    }
    const next = this.nextKept(j);
    const ofNext = new Set(
      next === undefined ? [] : this.hiddenAncestors(next.row.id),
    );
    return own.some((ancestor) => ofNext.has(ancestor));
  }

  /** Returns true if the source block is in the tree, and is an open ancestor. */
  private isOpenSource(id: string): boolean {
    const place = this.placeOf.get(id);
    return place !== undefined && this.open.isOpen(place);
  }

  /**
   * Returns true if the next kept block after block `j` needs a hidden block
   * that is open below `parent`. If block `j` went into `parent`, it would
   * close that hidden block, and the next block cannot go back into it.
   * An example is a top-level block that the text puts between the blocks
   * of two columns. This does not change the tree.
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
