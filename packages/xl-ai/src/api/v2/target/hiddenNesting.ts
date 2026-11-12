import type { FlatBlock } from "../model.js";
import type { ViewBlock } from "../projection/index.js";
import { type BlockIndex, TOP_LEVEL } from "../util/blocks/index.js";
import type { KeptRow, TargetRow } from "./types.js";

/**
 * The top level of the target document, as a place (see {@link Place}). The
 * rest of the lens uses `undefined` for the top level (`TOP_LEVEL`). Here it
 * is a symbol, because each rule of this file returns `undefined` when it
 * gives no place.
 *
 * @internal
 */
export const TOP_LEVEL_PLACE: unique symbol = Symbol("top level");

/**
 * A place in the target document: the top level, or the ID of a block of the
 * target. That block is the block of a row of the text (a new or a kept
 * block), or an invisible ancestor (a source block without a view block,
 * for example a column, that a kept block keeps as its ancestor).
 *
 * @internal
 */
export type Place = string | typeof TOP_LEVEL_PLACE;

/**
 * One step of the build: block `block` goes into `parent`, after its last
 * child.
 */
type BuildStep = { block: string; parent: Place };

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
 * the order of the text. A block goes into the parent that the text shows,
 * except where the format does not show a nesting of the document (for
 * example a paragraph in a paragraph, in markdown). There, these rules keep
 * that nesting:
 *
 * - A kept block keeps its nesting if the text did not change it and the
 *   parent is still open (see `keptParent`). A new block before such a
 *   block goes into the same nesting (see `nestingOfNext`).
 * - A block that the text moves together with its parent, in a nesting that
 *   the format does not show, stays in that parent (see `parentMovedAlong`).
 * - List items that the text shows as one list share the parent of that
 *   list (see `listParent`).
 * - A block that the text shows one level higher than the view goes where
 *   its parent in the view is, or was (see `outdentParent`).
 *
 * Invisible ancestors that a block keeps get a step too, before the block.
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
  private readonly stack: Place[] = [TOP_LEVEL_PLACE];
  private readonly parents = new Map<string, Place>();
  readonly steps: BuildStep[] = [];

  attach(block: string, parent: Place) {
    const depth = this.depthOf(parent);
    if (depth === -1) {
      throw new Error(`The place ${String(parent)} is not an open ancestor`);
    }
    this.stack.length = depth + 1;
    this.stack.push(block);
    this.parents.set(block, parent);
    this.steps.push({ block, parent });
  }

  /** Returns true if the block has a step (it is in the target). */
  has(block: string): boolean {
    return this.parents.has(block);
  }

  /** The parent of a block that has a step, if that parent is still open. Else `undefined`. */
  openParentOf(block: string): Place | undefined {
    const parent = this.parents.get(block);
    return parent !== undefined && this.isOpen(parent) ? parent : undefined;
  }

  isOpen(place: Place): boolean {
    return this.depthOf(place) !== -1;
  }

  /** The depth of an open ancestor, or -1. */
  depthOf(place: Place): number {
    return this.stack.indexOf(place);
  }
}

type NestingInput = {
  rows: readonly TargetRow[];
  /** The blocks of the text, in a flat list (for their parents and types). */
  textBlocks: readonly FlatBlock[];
  /** The view blocks (for their parents, types and source blocks). */
  view: readonly ViewBlock[];
  sourceIndex: BlockIndex;
  invisibleIds: ReadonlySet<string>;
  /** The source blocks that stay (see `withInvisibleBlocks`). */
  staying: ReadonlySet<string>;
};

/** The nesting rules of {@link decideParents}, with the state of the decisions. */
class ParentDecisions {
  private readonly open = new OpenAncestors();
  /** The row of each block ID of a row. */
  private readonly rowIndexOf: ReadonlyMap<string, number>;
  /** The first kept row at or after each index, with its index. */
  private readonly keptFrom: ({ index: number; row: KeptRow } | undefined)[];
  /** The index of the text block before each text block in its text parent. */
  private readonly previousSibling: (number | undefined)[];

  private readonly rows: NestingInput["rows"];
  private readonly textBlocks: NestingInput["textBlocks"];
  private readonly view: NestingInput["view"];
  private readonly sourceIndex: NestingInput["sourceIndex"];
  private readonly invisibleIds: NestingInput["invisibleIds"];
  private readonly staying: NestingInput["staying"];

  constructor(input: NestingInput) {
    this.rows = input.rows;
    this.textBlocks = input.textBlocks;
    this.view = input.view;
    this.sourceIndex = input.sourceIndex;
    this.invisibleIds = input.invisibleIds;
    this.staying = input.staying;
    const { rows } = input;
    this.rowIndexOf = new Map(rows.map((row, j) => [row.id, j]));
    this.keptFrom = new Array(rows.length + 1);
    for (let k = rows.length - 1; k >= 0; k--) {
      const row = rows[k];
      this.keptFrom[k] =
        row.kind === "kept" ? { index: k, row } : this.keptFrom[k + 1];
    }
    const lastChild = new Map<number | undefined, number>();
    this.previousSibling = input.textBlocks.map(({ parentIndex }, j) => {
      const previous = lastChild.get(parentIndex);
      lastChild.set(parentIndex, j);
      return previous;
    });
  }

  decide(): BuildStep[] {
    this.rows.forEach((row, j) => {
      switch (row.kind) {
        case "new":
          this.open.attach(row.id, this.asNew(j));
          return;
        case "kept":
          this.open.attach(row.id, this.keptParent(j, row));
          return;
      }
    });
    return this.open.steps;
  }

  /** The type of the block at a place. */
  private typeOf(place: Place): string {
    if (place === TOP_LEVEL_PLACE) {
      return "";
    }
    const j = this.rowIndexOf.get(place);
    return j !== undefined
      ? this.rows[j].fields.type
      : this.sourceIndex.block(place).type;
  }

  /** The place of the parent of text block `j` in the text, or the top level. */
  private textParent(j: number): Place {
    const p = this.textBlocks[j].parentIndex;
    return p === undefined ? TOP_LEVEL_PLACE : this.rows[p].id;
  }

  /**
   * Returns true if the text shows kept text block `j` with the nesting
   * of its view block: the same parent, with the same type. A format can
   * show the children of different types in different ways (for example
   * HTML, the children of a toggle and of a bullet). Thus, after a change of
   * the parent type, a nesting that the view did not show can show.
   */
  private nestingUnchanged(j: number, row: KeptRow): boolean {
    const textParentIndex = this.textBlocks[j].parentIndex;
    const viewParentIndex = this.view[row.viewIndex].parentIndex;
    if (textParentIndex === undefined || viewParentIndex === undefined) {
      return textParentIndex === viewParentIndex;
    }
    return (
      this.textParentIs(j, viewParentIndex) &&
      this.view[viewParentIndex].block.type ===
        this.textBlocks[textParentIndex].block.type
    );
  }

  /**
   * Returns true if the parent of text block `j` in the text is the pair of
   * view block `viewIndex` (`undefined`: the top level).
   */
  private textParentIs(j: number, viewIndex: number | undefined): boolean {
    const textParentIndex = this.textBlocks[j].parentIndex;
    if (textParentIndex === undefined) {
      return viewIndex === undefined;
    }
    const parentRow = this.rows[textParentIndex];
    return parentRow.kind === "kept" && parentRow.viewIndex === viewIndex;
  }

  /**
   * Returns the place of the source parent of kept block `id`, if the block
   * can stay in it: the parent and the ancestors stay, the parent is an open
   * ancestor, and the parent keeps its type. Invisible ancestors that are not
   * in the target yet get a step here. If not, returns `undefined`.
   */
  private sourceParent(id: string): Place | undefined {
    const invisible = this.invisibleAncestors(id);
    const visible = this.sourceIndex.parent(invisible.at(-1) ?? id);
    let parent: Place = visible === TOP_LEVEL ? TOP_LEVEL_PLACE : visible;
    if (
      !this.open.isOpen(parent) ||
      invisible.some((ancestor) => !this.staying.has(ancestor)) ||
      // The format did not show the nesting under the type of the source
      // parent. Under a new type (for example a bullet instead of a
      // paragraph), the format can show it, thus the text decides.
      (visible !== undefined &&
        this.typeOf(parent) !== this.sourceIndex.block(visible).type)
    ) {
      return undefined;
    }
    for (const ancestor of invisible.reverse()) {
      if (!this.open.has(ancestor)) {
        this.open.attach(ancestor, parent);
      } else if (!this.open.isOpen(ancestor)) {
        return undefined;
      }
      parent = ancestor;
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
    const list = LISTS.get(this.textBlocks[j].block.type);
    if (
      previous === undefined ||
      list === undefined ||
      LISTS.get(this.textBlocks[previous].block.type) !== list
    ) {
      return undefined;
    }
    return this.open.openParentOf(this.rows[previous].id);
  }

  /**
   * Returns the parent of kept block `j` if the text shows the block one
   * level higher than the view: at the level of its parent in the view.
   *
   * - An outdent: the parent in the view stays. The block goes where that
   *   parent is, if that place is open.
   * - A lift: the text removed the parent in the view, and its blocks take
   *   its place. The block goes where that parent was, if that place is
   *   open.
   *
   * That place can be a nesting that the format does not show (for example
   * a paragraph with a list in it, in markdown). Else, returns `undefined`.
   */
  private outdentParent(j: number, row: KeptRow): Place | undefined {
    const viewParent = this.view[row.viewIndex].parentIndex;
    if (
      viewParent === undefined ||
      !this.textParentIs(j, this.view[viewParent].parentIndex)
    ) {
      return undefined;
    }
    const shownParent = this.view[viewParent].sourceId;
    if (!this.staying.has(shownParent)) {
      return this.sourceParent(shownParent);
    }
    return this.open.openParentOf(shownParent);
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
    return this.textBlocks[index].parentIndex ===
      this.textBlocks[j].parentIndex && this.nestingUnchanged(index, row)
      ? next
      : undefined;
  }

  /**
   * The parent of kept block `j` in the target:
   *
   * - If the text changed the nesting of the block, the parent of the text,
   *   with three exceptions. If the text moved the block together with its
   *   parent, in a nesting that the format does not show, the block stays
   *   in that parent (see
   *   {@link parentMovedAlong}). A list item goes into the parent of its list
   *   (see {@link listParent}). A block that the text moved up out of its
   *   source parent goes where that parent is (see {@link outdentParent}).
   *   Thus, a block that the text outdents out of an item of a list in a
   *   hidden nesting stays in the parent of that list, and the next blocks
   *   stay there too.
   * - Else, the source parent, with the nesting that the format does not
   *   show (for example a column). There are two exceptions. A block that
   *   the text moved to a place outside its invisible ancestors (none of
   *   them is open, and the next kept block is not in one of them) does not
   *   keep that nesting. A block between two blocks of an open invisible
   *   block (for example the blocks of two columns) does not close it.
   * - In these cases, and if the source parent is not open any more, the
   *   block goes where a new block goes (see {@link asNew}).
   */
  private keptParent(j: number, row: KeptRow): Place {
    if (!this.nestingUnchanged(j, row)) {
      return (
        this.parentMovedAlong(j, row) ??
        this.listParent(j) ??
        this.outdentParent(j, row) ??
        this.textParent(j)
      );
    }
    if (row.moved && !this.isNearInvisibleAncestor(j, row.id)) {
      return this.asNew(j);
    }
    const parent = this.sourceParent(row.id);
    if (parent === undefined) {
      return this.asNew(j);
    }
    return this.nextNeedsOpenInvisibleBlock(j, parent)
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
    const parentId = this.sourceIndex.parent(row.id);
    const index =
      parentId === TOP_LEVEL ? undefined : this.rowIndexOf.get(parentId);
    if (index === undefined || !this.open.isOpen(this.rows[index].id)) {
      return undefined;
    }
    const parentRow = this.rows[index];
    return parentRow.kind === "kept" &&
      parentRow.fields.type === this.sourceIndex.block(parentRow.id).type &&
      this.view[parentRow.viewIndex].parentIndex ===
        this.view[row.viewIndex].parentIndex &&
      this.textBlocks[index].parentIndex === this.textBlocks[j].parentIndex
      ? parentRow.id
      : undefined;
  }

  /** The invisible ancestors of a source block: the ancestors up to the first visible one. */
  private invisibleAncestors(id: string): string[] {
    const ancestors: string[] = [];
    for (
      let ancestor = this.sourceIndex.parent(id);
      ancestor !== undefined && this.invisibleIds.has(ancestor);
      ancestor = this.sourceIndex.parent(ancestor)
    ) {
      ancestors.push(ancestor);
    }
    return ancestors;
  }

  /**
   * Returns true if an invisible ancestor of kept block `j` is at its new
   * place: the ancestor is open, or the next kept block is also in it. A block
   * without invisible ancestors can have a visible parent that the format does
   * not show as its parent (for example a paragraph with a list in it, in
   * markdown). That block is near its nesting if that parent is open, or if
   * the block is at the top level.
   */
  private isNearInvisibleAncestor(j: number, id: string): boolean {
    const own = this.invisibleAncestors(id);
    if (own.length === 0) {
      const parent = this.sourceIndex.parent(id);
      return parent === TOP_LEVEL || this.isOpenSource(parent);
    }
    if (own.some((ancestor) => this.isOpenSource(ancestor))) {
      return true;
    }
    const next = this.nextKept(j);
    const ofNext = new Set(
      next === undefined ? [] : this.invisibleAncestors(next.row.id),
    );
    return own.some((ancestor) => ofNext.has(ancestor));
  }

  /** Returns true if the source block is in the target, and is an open ancestor. */
  private isOpenSource(id: string): boolean {
    return this.open.isOpen(id);
  }

  /**
   * Returns true if the next kept block after block `j` needs an invisible
   * block that is open below `parent`. If block `j` went into `parent`, it
   * would close that invisible block, and the next block cannot go back into it.
   * An example is a top-level block that the text puts between the blocks
   * of two columns. This does not change the target.
   */
  private nextNeedsOpenInvisibleBlock(j: number, parent: Place): boolean {
    const next = this.nextKept(j);
    const depth = this.open.depthOf(parent);
    return (
      next !== undefined &&
      this.invisibleAncestors(next.row.id).some(
        (ancestor) => this.open.depthOf(ancestor) > depth,
      )
    );
  }
}
