import { $prosemirrorDelta } from "@y/prosemirror";
import * as delta from "lib0/delta";
import * as schema from "lib0/schema";

/**
 * Canonical name of a content delta's first block child (the child carried by an
 * insert op), or `null`. For a BlockNote `blockContainer` (content
 * `blockContent blockGroup?`) this is its block-content type (paragraph,
 * heading, image, ...).
 */
const firstChild = (
  d: schema.Unwrap<typeof $prosemirrorDelta>,
): schema.Unwrap<typeof $prosemirrorDelta> | null => {
  for (const op of (d as any).children) {
    if (delta.$insertOp.check(op)) {
      for (const it of op.insert) {
        if (delta.$deltaAny.check(it)) {
          return it;
        }
      }
    }
  }
  return null;
};

function getTableDimensions(
  d: schema.Unwrap<typeof $prosemirrorDelta>,
): { rows: number; cols: number } | null {
  if (d.name !== "table") {
    return null;
  }

  // Collect all rows with their cells' colspan/rowspan values.
  const rows: Array<Array<{ colspan: number; rowspan: number }>> = [];
  for (const op of (d as any).children) {
    if (delta.$insertOp.check(op)) {
      for (const tr of op.insert as Array<
        schema.Unwrap<typeof $prosemirrorDelta>
      >) {
        if (tr.name !== "tableRow") {
          return null;
        }
        const cells: Array<{ colspan: number; rowspan: number }> = [];
        for (const trOp of (tr as any).children) {
          if (delta.$insertOp.check(trOp)) {
            for (const td of trOp.insert as Array<
              schema.Unwrap<typeof $prosemirrorDelta>
            >) {
              if (td.name !== "tableCell" && td.name !== "tableHeader") {
                return null;
              }
              cells.push({
                colspan: Number(td.attrs.colspan) || 1,
                rowspan: Number(td.attrs.rowspan) || 1,
              });
            }
          }
        }
        rows.push(cells);
      }
    }
  }

  if (rows.length === 0) {
    return null;
  }

  // Build an occupancy grid to determine the true column count.
  // Each entry in `grid[r]` tracks which columns are already occupied
  // (by a cell from a previous row with rowspan > 1).
  const grid: boolean[][] = [];
  for (let r = 0; r < rows.length; r++) {
    if (!grid[r]) {
      grid[r] = [];
    }
    let col = 0;
    for (const cell of rows[r]) {
      // Skip columns already occupied by a rowspan from above.
      while (grid[r][col]) {
        col++;
      }
      // Mark all slots this cell occupies.
      for (let dr = 0; dr < cell.rowspan; dr++) {
        if (!grid[r + dr]) {
          grid[r + dr] = [];
        }
        for (let dc = 0; dc < cell.colspan; dc++) {
          grid[r + dr][col + dc] = true;
        }
      }
      col += cell.colspan;
    }
  }

  const numCols = Math.max(...grid.map((row) => row.length));
  return { rows: rows.length, cols: numCols };
}

/** The block ID of a node (its `id` attribute), or `undefined` for a node without one. */
function blockIdOf(d: schema.Unwrap<typeof $prosemirrorDelta>): unknown {
  // In a delta, an attribute is an operation that holds its value.
  const id: unknown = d.attrs.id;
  return delta.$setAttrOp.check(id) ? id.value : undefined;
}

const contentCache = new WeakMap<object, string>();

/**
 * A node as a string, without the block IDs in it (the `id` attribute of the
 * node and of each node in it). Two nodes that are different only in block
 * IDs give the same string. The keys are sorted: a delta from a ProseMirror
 * document and a delta from a Y type do not have the same key order.
 */
function contentWithoutBlockIds(
  d: schema.Unwrap<typeof $prosemirrorDelta>,
): string {
  const cached = contentCache.get(d);
  if (cached !== undefined) {
    return cached;
  }
  const content = JSON.stringify(sortedWithoutBlockIds(d.toJSON(), false));
  // A delta that is done does not change, thus its string can stay.
  if (d.isDone) {
    contentCache.set(d, content);
  }
  return content;
}

function sortedWithoutBlockIds(value: unknown, isAttrs: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortedWithoutBlockIds(item, false));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !(isAttrs && key === "id"))
      .sort(([keyA], [keyB]) => (keyA < keyB ? -1 : keyA > keyB ? 1 : 0))
      .map(([key, child]) => [
        key,
        sortedWithoutBlockIds(child, key === "attrs"),
      ]),
  );
}

/**
 * BlockNote's node-pairing policy for y-prosemirror's `matchNodes` option
 * (forwarded to `lib0/delta.diff`). This is the schema-specific bit that lives
 * in userland - the binding itself stays schema-agnostic.
 *
 * Two blocks pair only if they have the same block ID. Without the ID, the
 * diff pairs the changed nodes of a list by their type alone. An insert or a
 * removal next to a changed block of the same type then pairs a block with
 * its neighbour: the diff rewrites one block into the other, and inserts or
 * removes the wrong block. In the Y type, a concurrent change of another
 * client to the block then lands in the wrong block (see
 * blockMatchNodes.test.ts).
 *
 * A block whose only change is its ID is still the same block. A document
 * can have two blocks with one ID (two users changed the type of a block, or
 * moved a block, at the same time). An editor that loads such a document
 * gives the copies new IDs, and the binding writes that change. As a change
 * of the `id` attribute in place, two clients that load at the same time
 * change the same blocks. As a removal and an insert, each client would add
 * its own copies, and text typed in a copy at that time would be lost.
 *
 * A `blockContainer` holds exactly one block content (`blockContent
 * blockGroup?`). Diffing a *type change* of that content as an in-place child
 * delete+insert would, under a suggestion, tombstone the old content next to the
 * new one => two block-contents in one container => schema-invalid. So we
 * declare a container's identity to be its first block-content child's type:
 * when that changes, the two containers are reported as *different*, the PM->Y
 * diff replaces the whole container, and the deleted + inserted containers sit
 * as siblings in the blockGroup (`blockGroupChild+` allows that). Each carries
 * the `y-attributed-*` node mark - which `blockContainer` already whitelists -
 * so no schema change and no storage transform are needed. A plain text edit
 * keeps the same first-child type => same identity => the diff descends and
 * merges as usual.
 *
 * A change in nesting is *not* an identity change: a container that gains or
 * loses its child `blockGroup` is diffed in place. The persistent block group
 * transformer (see persistentBlockGroups.ts) keeps every `blockGroup` in Y and
 * routes the view's group insert into the container's existing group, so the
 * in-place diff can never leave two groups in one container. Replacing the
 * container instead would recreate the race the transformer removes (two users
 * nesting a first child concurrently would each insert their own container).
 *
 * @param a removed (old) node
 * @param b inserted (new) node
 * @returns whether `a` and `b` are the same node (diff in place) vs different (replace)
 */
const replaceReshapedTables = false;

export const blockMatchNodes = (
  a: schema.Unwrap<typeof $prosemirrorDelta>,
  b: schema.Unwrap<typeof $prosemirrorDelta>,
): boolean => {
  if (a.name !== b.name) {
    return false;
  }

  // Two nodes with different block IDs are different blocks, unless the IDs
  // are their only difference (see above). A node without an `id` attribute
  // (a block group, a table cell, a text node) has no ID.
  if (
    blockIdOf(a) !== blockIdOf(b) &&
    contentWithoutBlockIds(a) !== contentWithoutBlockIds(b)
  ) {
    return false;
  }

  if (a.name !== "blockContainer") {
    return true;
  }

  const childA = firstChild(a);
  const childB = firstChild(b);

  if (childA?.name !== childB?.name) {
    return false;
  }

  // Disabled: replacing a table that one edit reshapes both ways silently
  // dropped concurrent edits to it, and version diffs compare all the changes
  // between two versions, so concurrent one-way reshapes (a row and a column)
  // replaced the whole table there. Reshapes merge in place, as one-way ones
  // always did.
  if (
    replaceReshapedTables &&
    childA?.name === "table" &&
    childB?.name === "table"
  ) {
    const dimA = getTableDimensions(childA);
    const dimB = getTableDimensions(childB);
    if (
      dimA !== null &&
      dimB !== null &&
      dimA.rows !== dimB.rows &&
      dimA.cols !== dimB.cols
    ) {
      return false;
    }
  }

  return true;
};
