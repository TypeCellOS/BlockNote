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

/**
 * Whether a `blockContainer` delta carries a child `blockGroup` — i.e. the block
 * has nested children. A container's content is `blockContent blockGroup?`, so
 * this is what tells a leaf block apart from a parent.
 */
// const hasBlockGroup = (d: schema.Unwrap<typeof $prosemirrorDelta>): boolean => {
//   for (const op of (d as any).children) {
//     if (delta.$insertOp.check(op)) {
//       for (const it of op.insert) {
//         if (delta.$deltaAny.check(it) && it.name === "blockGroup") {
//           return true;
//         }
//       }
//     }
//   }
//   return false;
// };

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
 * @param a removed (old) node
 * @param b inserted (new) node
 * @returns whether `a` and `b` are the same node (diff in place) vs different (replace)
 */
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

  // A change in nesting is structural too: if one container gains or loses a
  // child `blockGroup`, diffing it in place would insert/delete the blockGroup as
  // a sibling of the block content inside a single container — schema-invalid.
  // Treat it as different so the whole container is replaced instead, same as a
  // content-type change. Keeps concurrent nesting merges (e.g. two users nesting
  // a block under the same parent) from producing a lopsided in-place result.
  // if (hasBlockGroup(a) !== hasBlockGroup(b)) {
  //   return false;
  // }

  if (childA?.name === "table" && childB?.name === "table") {
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
