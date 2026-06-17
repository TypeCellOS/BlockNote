import * as delta from "lib0/delta";
import * as schema from "lib0/schema";
import { $prosemirrorDelta } from "@y/prosemirror";

/**
 * Canonical name of a content delta's first block child (the child carried by an
 * insert op), or `null`. For a BlockNote `blockContainer` (content
 * `blockContent blockGroup?`) this is its block-content type (paragraph,
 * heading, image, ...).
 */
const firstChildName = (
  d: schema.Unwrap<typeof $prosemirrorDelta>,
): string | null => {
  for (const op of (d as any).children) {
    if (delta.$insertOp.check(op)) {
      for (const it of op.insert) {
        if (delta.$deltaAny.check(it)) {
          return it.name;
        }
      }
    }
  }
  return null;
};

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
): boolean =>
  a.name === b.name &&
  (a.name !== "blockContainer" || firstChildName(a) === firstChildName(b));
