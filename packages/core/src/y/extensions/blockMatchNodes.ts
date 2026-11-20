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

/**
 * BlockNote's node-pairing policy for y-prosemirror's `matchNodes` option
 * (forwarded to `lib0/delta.diff`). This is the schema-specific bit that lives
 * in userland - the binding itself stays schema-agnostic.
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

/** The block ID of a node (its `id` attribute), or `undefined` for a node without one. */
function blockIdOf(d: schema.Unwrap<typeof $prosemirrorDelta>): unknown {
  const id: unknown = d.attrs.id;
  return delta.$setAttrOp.check(id) ? id.value : undefined;
}

/**
 * {@link blockMatchNodes}, and the two nodes must also have the same block ID
 * (a node without an `id` attribute has no ID).
 *
 * This is the node-pairing policy for a diff of two documents (see
 * `docDiffToDelta`). Without the ID, the diff pairs the changed nodes of a
 * list by their type alone. An insert or a removal next to a changed block of
 * the same type then pairs a block with its neighbour: the diff rewrites one
 * block into the other, and inserts or removes the wrong block. When that
 * diff is applied to a Y type, a concurrent change of another client to the
 * block lands in the wrong block.
 *
 * TODO: this check belongs in `blockMatchNodes` itself, so that the sync
 * binding (`customCompare` in YSync.ts) pairs blocks by their ID too. The
 * binding has the same fault today, for a transaction that inserts or removes
 * a block next to a changed block, or that changes the type of a block next
 * to a changed block. Moving the check there needs more investigation:
 *
 * - With the check in the binding, "shows both copies when two users change
 *   the type concurrently" (versionDiffAttribution.test.ts) loses the authors
 *   of the inserted copies. The two copies have the same block ID. The editor
 *   gives a copy a new ID, and the binding then writes a new block instead of
 *   a changed attribute. A rule that also pairs a block with a new ID and
 *   unchanged content did not fix that test, so the cause is not fully known.
 * - `splitChangedBlocks` (snapshotPreview.ts) uses `blockMatchNodes` to find
 *   the blocks that the old binding changed in place. With the check, a block
 *   whose ID changed in place counts as structurally changed (see
 *   v1BindingSnapshotDiff.test.ts, whose fixture replaces the block).
 */
export const blockMatchNodesById = (
  a: schema.Unwrap<typeof $prosemirrorDelta>,
  b: schema.Unwrap<typeof $prosemirrorDelta>,
): boolean => blockIdOf(a) === blockIdOf(b) && blockMatchNodes(a, b);
