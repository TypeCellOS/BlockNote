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
const hasBlockGroup = (d: schema.Unwrap<typeof $prosemirrorDelta>): boolean => {
  for (const op of (d as any).children) {
    if (delta.$insertOp.check(op)) {
      for (const it of op.insert) {
        if (delta.$deltaAny.check(it) && it.name === "blockGroup") {
          return true;
        }
      }
    }
  }
  return false;
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
): boolean => {
  if (a.name !== b.name) {
    return false;
  }

  if (a.name !== "blockContainer") {
    return true;
  }

  // Two containers with *different* block ids are different blocks, no matter
  // how similar their content — pairing them would diff one block into the
  // other in place. That rendered e.g. a full-document replacement as edits
  // *inside* the first deleted block instead of a separately inserted one.
  // Only enforced when both sides carry an id, so content converted from
  // outside the editor (which may not have ids yet) still pairs by shape.
  // Delta attrs are op-wrapped ({ type, value }) — compare the values.
  const idA = (a as any).attrs?.id?.value;
  const idB = (b as any).attrs?.id?.value;
  if (idA && idB && idA !== idB) {
    return false;
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
  if (hasBlockGroup(a) !== hasBlockGroup(b)) {
    return false;
  }

  return true;
};
