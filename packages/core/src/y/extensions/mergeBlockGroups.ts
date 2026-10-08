import * as delta from "lib0/delta";
import * as dt from "lib0/delta/transformer";

/**
 * Lets nesting changes diff in place instead of replacing the parent block.
 *
 * A `blockContainer`'s content is `blockContent blockGroup?`, but Y can hold
 * several `blockGroup`s in one container (two users giving a block its first
 * child concurrently, or a diff rendering an old and a new group side by side),
 * and a group can be empty. A `blockGroup` carries no attributes, so the view
 * shows one group holding the children of all non-empty groups, and hides the
 * group while there are none. Edits to that group are routed back to the group
 * each child came from; emptying a group keeps it in Y (only hidden), so a child
 * another user adds to it concurrently is not lost with it.
 *
 * Assumes the groups follow the block content, as the schema orders them.
 */

type Slot = { group: false } | { group: true; len: number };
type GroupSlot = Extract<Slot, { group: true }>;
// lib0's delta builders are untyped at this level of genericity.
type AnyDelta = any;

const GROUP = "blockGroup";

function isGroup(el: unknown): boolean {
  return delta.$deltaAny.check(el) && (el as AnyDelta).name === GROUP;
}

function isVisible(slots: Slot[]): boolean {
  return slots.some((slot) => slot.group && slot.len > 0);
}

/** Positions an op covers before the change, and after it. */
function oldLength(op: AnyDelta): number {
  return delta.$insertOp.check(op) || delta.$textOp.check(op) ? 0 : op.length;
}
function newLength(op: AnyDelta): number {
  return delta.$deleteOp.check(op) ? 0 : op.length;
}
function written(d: AnyDelta, side: "old" | "new"): number {
  let n = 0;
  for (const op of d.children) {
    n += side === "old" ? oldLength(op) : newLength(op);
  }
  return n;
}
function isEmpty(d: AnyDelta): boolean {
  return d.children.start == null;
}

/** Copy `len` positions of `op` (all of it by default) into `target`. */
function copyOp(target: AnyDelta, op: AnyDelta, len: number = op.length) {
  if (delta.$retainOp.check(op)) {
    target.retain(len, op.format, op.attribution);
  } else if (delta.$insertOp.check(op) || delta.$textOp.check(op)) {
    target.insert(op.insert, op.format, op.attribution);
  } else if (delta.$deleteOp.check(op)) {
    target.delete(len);
  } else if (delta.$modifyOp.check(op)) {
    target.modify(delta.clone(op.value), op.format, op.attribution);
  }
}

/**
 * Insert the children of an inserted group into `target`. Each child keeps its
 * own attribution; the group's applies where a child has none.
 */
function insertChildren(target: AnyDelta, group: AnyDelta, groupOp: AnyDelta) {
  for (const op of group.children) {
    if (delta.$insertOp.check(op)) {
      target.insert(
        op.insert,
        op.format ?? groupOp.format,
        op.attribution ?? groupOp.attribution,
      );
    }
  }
}

class MergeBlockGroupsTransformer extends dt.Transformer<any, any> {
  /** One entry per child on the Y side. Groups follow the block content. */
  slots: Slot[] = [];

  /** Y-side change -> view-side change. */
  override applyA(d: AnyDelta) {
    const out: AnyDelta = delta.cloneShallow(d);
    const oldSlots = this.slots;
    const newSlots: Slot[] = [];
    // The change to the shown group's children.
    const shown: AnyDelta = delta.create();
    let oi = 0;

    for (const op of d.children) {
      if (delta.$insertOp.check(op)) {
        for (const el of op.insert) {
          if (isGroup(el)) {
            newSlots.push({ group: true, len: el.childCnt });
            insertChildren(shown, el, op);
          } else {
            newSlots.push({ group: false });
            out.insert([el], op.format, op.attribution);
          }
        }
        continue;
      }
      if (delta.$textOp.check(op)) {
        out.insert(op.insert, op.format, op.attribution);
        continue;
      }
      for (let n = 0; n < op.length && oi < oldSlots.length; n++) {
        const slot = oldSlots[oi++];
        if (!slot.group) {
          copyOp(out, op, 1);
          if (!delta.$deleteOp.check(op)) {
            newSlots.push(slot);
          }
        } else if (delta.$retainOp.check(op)) {
          if (slot.len > 0) {
            shown.retain(slot.len, op.format, op.attribution);
          }
          newSlots.push(slot);
        } else if (delta.$deleteOp.check(op)) {
          if (slot.len > 0) {
            shown.delete(slot.len);
          }
        } else {
          // replay the group's own child ops, then step over the rest of it
          let consumed = 0;
          let len = slot.len;
          for (const child of op.value.children) {
            copyOp(shown, child);
            consumed += oldLength(child);
            len += newLength(child) - oldLength(child);
          }
          if (slot.len > consumed) {
            shown.retain(slot.len - consumed);
          }
          newSlots.push({ group: true, len });
        }
      }
    }
    newSlots.push(...oldSlots.slice(oi));
    this.slots = newSlots;

    const wasShown = isVisible(oldSlots);
    const isShown = isVisible(newSlots);
    const position = newSlots.filter((s) => !s.group).length;
    const gap = position - written(out, "new");
    if (wasShown && isShown && !isEmpty(shown)) {
      out.retain(gap);
      out.modify(shown.done(false));
    } else if (wasShown && !isShown) {
      out.retain(gap);
      out.delete(1);
    } else if (!wasShown && isShown) {
      // Every group was empty before, so the change only inserts children.
      const group = delta.create(GROUP);
      for (const op of shown.children) {
        if (delta.$insertOp.check(op)) {
          group.insert(op.insert, op.format, op.attribution);
        }
      }
      out.retain(gap);
      out.insert([group.done(false)]);
    }
    out.done(false);
    return dt.createTransformResult(null, out);
  }

  /** View-side change -> Y-side change. */
  override applyB(d: AnyDelta) {
    const out: AnyDelta = delta.cloneShallow(d);
    const groups = this.slots.filter((s): s is GroupSlot => s.group);
    const plain = this.slots.length - groups.length;
    const shown = isVisible(this.slots);
    const newSlots: Slot[] = [];
    let bi = 0; // view-side child index before the change

    for (const op of d.children) {
      if (delta.$insertOp.check(op)) {
        for (const el of op.insert) {
          if (isGroup(el) && groups.length > 0) {
            // The view shows a group again: refill the first hidden group
            // rather than adding another one.
            const refill = delta.create();
            insertChildren(refill, el, op);
            out.modify(refill.done(false));
            groups[0] = { group: true, len: el.childCnt };
            if (groups.length > 1) {
              out.retain(groups.length - 1);
            }
            newSlots.push(...groups);
            groups.length = 0;
          } else {
            out.insert([el], op.format, op.attribution);
            newSlots.push(
              isGroup(el)
                ? { group: true, len: el.childCnt }
                : { group: false },
            );
          }
        }
        continue;
      }
      if (delta.$textOp.check(op)) {
        copyOp(out, op);
        continue;
      }
      for (let n = 0; n < op.length; n++, bi++) {
        if (bi < plain) {
          copyOp(out, op, 1);
          if (!delta.$deleteOp.check(op)) {
            newSlots.push(this.slots[bi]);
          }
          continue;
        }
        if (!shown || groups.length === 0) {
          continue;
        }
        // the shown group stands for all of the Y side's groups
        if (delta.$retainOp.check(op)) {
          out.retain(groups.length, op.format, op.attribution);
          newSlots.push(...groups);
        } else if (delta.$deleteOp.check(op)) {
          // Empty every group, but keep them: see the module doc.
          for (const group of groups) {
            if (group.len > 0) {
              out.modify(delta.create().delete(group.len).done(false));
            } else {
              out.retain(1);
            }
            newSlots.push({ group: true, len: 0 });
          }
        } else {
          this.routeIntoGroups(op.value, groups, out, newSlots);
        }
        groups.length = 0;
      }
    }
    // untouched trailing slots
    if (bi < plain) {
      newSlots.push(...this.slots.slice(bi, plain));
    }
    newSlots.push(...groups);
    this.slots = newSlots;
    out.done(false);
    return dt.createTransformResult(out, null);
  }

  /** Route a change to the shown group into changes to each Y-side group. */
  routeIntoGroups(
    change: AnyDelta,
    groups: GroupSlot[],
    out: AnyDelta,
    newSlots: Slot[],
  ) {
    const ends: number[] = [];
    let acc = 0;
    for (const group of groups) {
      acc += group.len;
      ends.push(acc);
    }
    const perGroup: AnyDelta[] = groups.map(() => delta.create());
    const lens = groups.map((group) => group.len);
    let pos = 0;
    for (const op of change.children) {
      if (delta.$insertOp.check(op) || delta.$textOp.check(op)) {
        // an insert at a boundary joins the earlier group
        let k = ends.findIndex((end) => pos <= end);
        k = k === -1 ? groups.length - 1 : k;
        const start = k === 0 ? 0 : ends[k - 1];
        const target = perGroup[k];
        target.retain(Math.max(0, pos - start - written(target, "old")));
        copyOp(target, op);
        lens[k] += op.length;
        continue;
      }
      let remaining = op.length;
      while (remaining > 0) {
        const k = ends.findIndex((end) => pos < end);
        if (k === -1) {
          break;
        }
        const start = k === 0 ? 0 : ends[k - 1];
        const take = Math.min(remaining, ends[k] - pos);
        const target = perGroup[k];
        target.retain(Math.max(0, pos - start - written(target, "old")));
        copyOp(target, op, take);
        if (delta.$deleteOp.check(op)) {
          lens[k] -= take;
        }
        pos += take;
        remaining -= take;
      }
    }
    groups.forEach((_, k) => {
      if (isEmpty(perGroup[k])) {
        out.retain(1);
      } else {
        out.modify(perGroup[k].done(false));
      }
      newSlots.push({ group: true, len: lens[k] });
    });
  }
}

class MergeBlockGroups extends dt.Template<any, any> {
  override get name() {
    return "blocknote:mergeBlockGroups";
  }
  override init() {
    return new MergeBlockGroupsTransformer(this.$in, this.$out);
  }
}

const groupHolders = new Set(["blockGroup", "column", "columnList"]);

/** Applies {@link MergeBlockGroupsTransformer} to every `blockContainer`. */
export function mergeBlockGroups($d: any): dt.Template<any, any> {
  return dt.children($d, (child: AnyDelta, $c: any) =>
    child.name === "blockContainer"
      ? dt.pipe(
          $c,
          ($1: any) => new MergeBlockGroups($1, delta.$deltaAny),
          mergeBlockGroups,
        )
      : groupHolders.has(child.name)
        ? mergeBlockGroups($c)
        : null,
  );
}
