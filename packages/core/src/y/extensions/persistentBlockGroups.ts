import * as delta from "lib0/delta";
import * as dt from "lib0/delta/transformer";
import type * as s from "lib0/schema";

/**
 * # Persistent block groups
 *
 * A `@y/prosemirror` transformer (the `transformers` option of `syncPlugin`)
 * that keeps BlockNote's nested `blockGroup` nodes alive in the Yjs document
 * and hides the empty ones from ProseMirror.
 *
 * ## The problem
 *
 * BlockNote nests child blocks as `blockContainer > [blockContent, blockGroup?]`
 * and its ProseMirror schema forbids an empty `blockGroup`
 * (`content: "blockGroupChild+"`). So the editor creates the group together
 * with the first nested block and removes it with the last one. Under
 * concurrency that is a conflict generator: two users who nest a first child
 * under the same block at the same time each insert their own `blockGroup`,
 * and after the merge the container holds two groups, which the schema
 * rejects. BlockNote worked around it by replacing the whole container
 * whenever a group appeared or disappeared (the nesting check that used to be
 * in `blockMatchNodes`), which turns the same race into two copies of the
 * parent block and rewrites the parent on every first nesting and last
 * un-nesting.
 *
 * ## The model
 *
 * What Yjs stores is decoupled from what ProseMirror shows:
 *
 * - **Yjs (side A)** keeps every `blockGroup` once it exists. Emptying one
 *   leaves it in place, and (with `implicitGroups`, the default) a container
 *   the editor creates gets an empty group right away. Two users nesting a
 *   first child concurrently therefore write into the *same* group item, and
 *   Yjs merges their children like any other concurrent list insert.
 * - **ProseMirror (side B)** sees one `blockGroup` per container, present only
 *   while it has children.
 *
 *       Yjs                                        ProseMirror
 *       blockContainer[ content, group[] ]      ⇄  blockContainer[ content ]
 *       blockContainer[ content, group[a] ]     ⇄  blockContainer[ content, group[a] ]
 *       blockContainer[ content, g1[a], g2[b] ] ⇄  blockContainer[ content, group[a, b] ]
 *       blockContainer[ content ]               ⇄  blockContainer[ content ]        (legacy)
 *
 * The third row is what a document written before this transformer (no
 * groups until the first nesting) produces when two users nest a first child
 * concurrently: the view merges every group of a container into one, so the
 * race degrades to an ordering question instead of invalid content. Edits
 * inside the merged group route back to the Yjs group that holds that
 * position. A legacy container never gets a group implicitly (that would be a
 * concurrent write by every client that opens the document); its first nesting
 * creates the group, as before.
 *
 * ## Rules, per `blockContainer`
 *
 * Yjs → view (`applyA`):
 * - every `blockGroup` child collapses into one view group placed after all
 *   other children; it exists iff the groups hold at least one child in total
 * - a change that makes the total go 0 → n inserts the view group, n → 0
 *   deletes it, n → m modifies it with the inner change re-based onto merged
 *   coordinates (a group's children start at the sum of the lengths of the
 *   groups before it)
 * - the group wrapper's own attributes, formats and attribution have no view
 *   counterpart and are dropped; a group inserted by a suggestion renders its
 *   *children* as inserted, which is what the user sees anyway
 *
 * view → Yjs (`applyB`):
 * - an edit at a merged offset routes into the group covering it; at a
 *   boundary between two groups the earlier group wins
 * - deleting the view group empties every Yjs group and keeps them all
 * - inserting a view group (only possible while no view group exists) routes
 *   its children into the first Yjs group, or, when the container has no
 *   group at all (a legacy container), inserts the group as the editor built
 *   it
 * - a container the view inserts without a group gets an empty group appended
 *   (`implicitGroups`)
 *
 * Cursor positions (root marks) map through the same layout, in both
 * directions.
 *
 * ## Shape of the implementation
 *
 * {@link persistentBlockGroups} composes lib0's `children` template
 * recursively over the node types that can hold containers (`blockGroup`,
 * `column`, `columnList`) and pipes the stateful per-container stage
 * ({@link PersistentGroupTransformer}) after the recursion, so that stage sees
 * its container's children in Yjs layout on the way in and in view layout on
 * the way back. Every other node type (block content, inline content) opts
 * out of the recursion and costs nothing.
 *
 * The per-container state is the container's Yjs child layout: a list of
 * {@link Seg}s, one per child, telling groups (with their child count) apart
 * from everything else. It is kept current from the changes that flow through,
 * so no stage ever re-reads a document; a change costs O(size of the change)
 * plus O(children of the containers on its path), and a container has two or
 * three children.
 *
 * ## Assumptions
 *
 * - `blockContainer` children are a content node followed by zero or more
 *   `blockGroup`s (BlockNote never produces anything else). The code tolerates
 *   other layouts, but the view then shows non-group children in Yjs order
 *   followed by the merged group, which may differ from the Yjs order.
 * - the view inserts at most one `blockGroup` per container (its schema
 *   guarantees that).
 */

/**
 * Options of {@link persistentBlockGroups}.
 */
export type PersistentBlockGroupsOptions = {
  /** The nested list node that is kept and hidden. Default `"blockGroup"`. */
  groupName?: string;
  /** The block node whose children the group lives in. Default `"blockContainer"`. */
  containerName?: string;
  /**
   * The node types (besides the container) that can hold containers, so the
   * recursion descends into them. Default `["blockGroup", "column", "columnList"]`.
   */
  nestingNodes?: readonly string[];
  /**
   * Whether a container the view creates gets an empty group right away
   * (default `true`). With `false`, groups are only kept once the first
   * nesting creates them; concurrent first nestings then leave two groups in
   * Yjs, which the view merges.
   */
  implicitGroups?: boolean;
};

const defaults = {
  groupName: "blockGroup",
  containerName: "blockContainer",
  nestingNodes: ["blockGroup", "column", "columnList"],
  implicitGroups: true,
} as const satisfies Required<PersistentBlockGroupsOptions>;

// lib0's delta builders are untyped at this level of genericity: the stage
// works on arbitrary node deltas (`Delta<any>`), as lib0's own transformers do.
type AnyDelta = delta.DeltaAny;
type AnyBuilder = delta.DeltaBuilderAny;
type Format = delta.Formats | null | undefined;
type Attribution = delta.Attribution | null | undefined;

/**
 * One child of a container in Yjs layout: a group with its child count, or
 * anything else.
 */
type Seg =
  | { readonly group: false }
  | { readonly group: true; readonly len: number };

/** The shared layout entry of every non-group child. */
const PASS: Seg = { group: false };

function groupSeg(len: number): Seg {
  return { group: true, len };
}

function isGroup(el: unknown, groupName: string): el is AnyDelta {
  return delta.$deltaAny.check(el) && el.name === groupName;
}

/**
 * Net change of a node's child count from a change delta: positions inserted
 * minus positions deleted (retain and modify keep the count).
 */
function netLen(d: AnyDelta): number {
  let n = 0;
  for (const op of d.children) {
    if (delta.$insertOp.check(op) || delta.$textOp.check(op)) {
      n += op.insert.length;
    } else if (delta.$deleteOp.check(op)) {
      n -= op.delete;
    }
  }
  return n;
}

/** The total child count of the groups in a layout. */
function totalOf(segs: readonly Seg[]): number {
  let n = 0;
  for (const seg of segs) {
    if (seg.group) {
      n += seg.len;
    }
  }
  return n;
}

/** The layout of `n` non-group positions (text characters or opaque nodes). */
function passSegs(n: number): Seg[] {
  const segs: Seg[] = [];
  for (let i = 0; i < n; i++) {
    segs.push(PASS);
  }
  return segs;
}

type Insert = {
  content: string | unknown[];
  format: Format;
  attribution: Attribution;
  /** the layout of the inserted content */
  segs: Seg[];
};

type SlotOp =
  | { kind: "retain"; format: Format; attribution: Attribution }
  | { kind: "delete" }
  | {
      kind: "modify";
      value: AnyDelta;
      format: Format;
      attribution: Attribution;
    };

/**
 * Edits to one node's child list, keyed by *pre-change* child index so they
 * can be collected in any order (the view's order of a container's children
 * is not the Yjs order) and emitted in index order. Inserts are keyed by the
 * gap they land in (`gap === len` appends). The layout bookkeeping (`segs` of
 * inserted content, deleted indexes, length adjustments of groups) lets
 * {@link ChildEdits.rebuildSegs} derive the post-change layout.
 */
class ChildEdits {
  private readonly inserts = new Map<number, Insert[]>();
  private readonly ops = new Map<number, SlotOp>();
  private readonly lenAdjust = new Map<number, number>();

  insertAt(
    gap: number,
    content: string | unknown[],
    format: Format,
    attribution: Attribution,
    segs: Seg[],
  ): void {
    let arr = this.inserts.get(gap);
    if (arr === undefined) {
      arr = [];
      this.inserts.set(gap, arr);
    }
    arr.push({ content, format, attribution, segs });
  }

  /** A formatted retain (a bare retain is implicit). */
  retainAt(idx: number, format: Format, attribution: Attribution): void {
    this.ops.set(idx, { kind: "retain", format, attribution });
  }

  deleteAt(idx: number): void {
    this.ops.set(idx, { kind: "delete" });
  }

  modifyAt(
    idx: number,
    value: AnyDelta,
    format: Format,
    attribution: Attribution,
  ): void {
    this.ops.set(idx, { kind: "modify", value, format, attribution });
  }

  /** Record that the group at `idx` changed its child count by `d`. */
  adjustLen(idx: number, d: number): void {
    this.lenAdjust.set(idx, (this.lenAdjust.get(idx) ?? 0) + d);
  }

  /**
   * Emit the collected edits onto `out`, in child order. Untouched positions
   * become plain retains (the builder coalesces them, and `done()` trims a
   * trailing run).
   *
   * @param out a delta builder
   * @param len the pre-change child count
   */
  emit(out: AnyBuilder, len: number): void {
    for (let i = 0; i <= len; i++) {
      const ins = this.inserts.get(i);
      if (ins !== undefined) {
        for (const e of ins) {
          out.insert(e.content, e.format, e.attribution);
        }
      }
      if (i === len) {
        break;
      }
      const op = this.ops.get(i);
      if (op === undefined) {
        out.retain(1);
      } else {
        switch (op.kind) {
          case "retain":
            out.retain(1, op.format, op.attribution);
            break;
          case "delete":
            out.delete(1);
            break;
          case "modify":
            out.modify(op.value, op.format, op.attribution);
            break;
        }
      }
    }
  }

  /** The post-change layout, from the pre-change one. */
  rebuildSegs(segs: readonly Seg[]): Seg[] {
    const out: Seg[] = [];
    for (let i = 0; i <= segs.length; i++) {
      const ins = this.inserts.get(i);
      if (ins !== undefined) {
        for (const e of ins) {
          out.push(...e.segs);
        }
      }
      if (i === segs.length) {
        break;
      }
      if (this.ops.get(i)?.kind === "delete") {
        continue;
      }
      const seg = segs[i];
      const adj = this.lenAdjust.get(i);
      out.push(adj === undefined || !seg.group ? seg : groupSeg(seg.len + adj));
    }
    return out;
  }
}

/**
 * The view gap of Yjs gap `k` in layout `segs`: the non-group children before
 * it, plus the view group when the gap sits at the very end behind a visible
 * group.
 */
function viewGap(segs: readonly Seg[], k: number, total: number): number {
  let n = 0;
  const end = Math.min(k, segs.length);
  for (let i = 0; i < end; i++) {
    if (!segs[i].group) {
      n++;
    }
  }
  return k >= segs.length && total > 0 ? n + 1 : n;
}

/**
 * The Yjs gap of view gap `k` in layout `segs`: before the k-th non-group
 * child, or the end.
 */
function yjsGapPost(segs: readonly Seg[], k: number): number {
  let n = 0;
  for (let i = 0; i < segs.length; i++) {
    if (!segs[i].group) {
      if (n === k) {
        return i;
      }
      n++;
    }
  }
  return segs.length;
}

function mapNumericKey(
  map: (k: number) => number | null,
): (key: number | string) => number | string | null {
  return (key) => (typeof key === "number" ? map(key) : key);
}

/** The change routed into one Yjs group (view → Yjs). */
type GroupChange = {
  b: AnyBuilder;
  /** pre-change positions of the group consumed so far */
  emitted: number;
  /** post-change positions produced so far (anchors lifted marks) */
  out: number;
  /** net child count change */
  net: number;
  touched: boolean;
};

/**
 * The stateful per-container stage. Side A is the container's children in
 * Yjs layout, side B in view layout (see the module doc for the rules).
 */
export class PersistentGroupTransformer extends dt.Transformer<any, any> {
  /**
   * The container's Yjs child layout, kept current from the changes that
   * flow through (both directions).
   */
  segs: Seg[] = [];
  /**
   * Whether no change has been seen yet. The first change a stage receives
   * is the whole container node (lib0's `children` feeds a freshly inserted
   * child through a fresh stage); when that node comes from the view, the
   * container is new and gets its implicit group.
   */
  fresh = true;

  constructor(
    $in: s.Schema<AnyDelta>,
    $out: s.Schema<AnyDelta>,
    readonly groupName: string,
    readonly implicitGroups: boolean,
  ) {
    super($in, $out);
  }

  /** Yjs layout change → view layout change. */
  override applyA(da: AnyBuilder): dt.TransformResultAny {
    this.fresh = false;
    const segs = this.segs;
    const groupName = this.groupName;
    const totalPre = totalOf(segs);
    let nonPre = 0;
    for (const seg of segs) {
      if (!seg.group) {
        nonPre++;
      }
    }
    const newSegs: Seg[] = [];
    // the view-side edits of the non-group children, keyed by their view index
    const edits = new ChildEdits();
    // the merged change of the view group, in merged pre-change coordinates
    const inner: AnyBuilder = delta.create();
    let innerEmitted = 0; // merged pre-change positions `inner` consumed
    let innerOut = 0; // merged post-change positions `inner` produced (anchors lifted marks)
    let innerTouched = false;
    let ai = 0; // pre-change Yjs cursor
    let bi = 0; // view index of the cursor (non-group children before it)
    let mergedBefore = 0; // merged offset of the cursor (children of the groups before it)
    const alignInner = () => {
      if (mergedBefore > innerEmitted) {
        const n = mergedBefore - innerEmitted;
        inner.retain(n);
        innerEmitted = mergedBefore;
        innerOut += n;
      }
    };
    const step = () => {
      const seg = segs[ai++];
      if (seg.group) {
        mergedBefore += seg.len;
      } else {
        bi++;
      }
    };
    for (const op of da.children) {
      if (delta.$retainOp.check(op)) {
        const fmt = op.format;
        const attr = op.attribution;
        for (let n = op.retain; n > 0 && ai < segs.length; n--) {
          const seg = segs[ai];
          // a format or attribution on a group wrapper has no view counterpart
          if (!seg.group && (fmt !== undefined || attr !== undefined)) {
            edits.retainAt(bi, fmt, attr);
          }
          newSegs.push(seg);
          step();
        }
      } else if (delta.$textOp.check(op)) {
        edits.insertAt(bi, op.insert, op.format, op.attribution, []);
        newSegs.push(...passSegs(op.insert.length));
      } else if (delta.$insertOp.check(op)) {
        for (const el of op.insert) {
          if (isGroup(el, groupName)) {
            alignInner();
            const base = innerOut;
            inner.append(el);
            innerOut += el.childCnt;
            const hasMarks = el.marks !== null || el.deleteMarks !== null;
            if (hasMarks) {
              delta.mergeRootMarks(
                inner,
                el,
                mapNumericKey((k) => base + k),
              );
            }
            innerTouched ||= el.childCnt > 0 || hasMarks;
            newSegs.push(groupSeg(el.childCnt));
          } else {
            edits.insertAt(bi, [el], op.format, op.attribution, []);
            newSegs.push(PASS);
          }
        }
      } else if (delta.$deleteOp.check(op)) {
        for (let n = op.delete; n > 0 && ai < segs.length; n--) {
          const seg = segs[ai];
          if (seg.group) {
            if (seg.len > 0) {
              alignInner();
              inner.delete(seg.len);
              innerEmitted += seg.len;
              innerTouched = true;
            }
          } else {
            edits.deleteAt(bi);
          }
          step();
        }
      } else {
        // modify
        if (ai >= segs.length) {
          continue;
        }
        const seg = segs[ai];
        const v: AnyDelta = op.value;
        if (seg.group) {
          // the group's inner change, re-based onto merged coordinates; its
          // attribute ops (the wrapper's) are dropped
          alignInner();
          const base = innerOut;
          for (const iop of v.children) {
            if (delta.$retainOp.check(iop)) {
              inner.retain(iop.retain, iop.format, iop.attribution);
              innerEmitted += iop.retain;
              innerOut += iop.retain;
              innerTouched ||=
                iop.format !== undefined || iop.attribution !== undefined;
            } else if (delta.$deleteOp.check(iop)) {
              inner.delete(iop.delete);
              innerEmitted += iop.delete;
              innerTouched = true;
            } else if (delta.$modifyOp.check(iop)) {
              inner.modify(delta.clone(iop.value), iop.format, iop.attribution);
              innerEmitted += 1;
              innerOut += 1;
              innerTouched = true;
            } else if (delta.$insertOp.check(iop) || delta.$textOp.check(iop)) {
              inner.insert(iop.insert, iop.format, iop.attribution);
              innerOut += iop.insert.length;
              innerTouched = true;
            }
          }
          if (v.marks !== null || v.deleteMarks !== null) {
            delta.mergeRootMarks(
              inner,
              v,
              mapNumericKey((k) => base + k),
            );
            innerTouched = true;
          }
          newSegs.push(groupSeg(seg.len + netLen(v)));
        } else {
          edits.modifyAt(bi, delta.clone(v), op.format, op.attribution);
          newSegs.push(seg);
        }
        step();
      }
    }
    while (ai < segs.length) {
      newSegs.push(segs[ai++]);
    }
    const totalPost = totalOf(newSegs);
    // name, attrs and root marks (re-keyed below) of the container
    const out: AnyBuilder = delta.cloneShallow(da);
    edits.emit(out, nonPre); // consumes every non-group view position
    if (totalPre === 0) {
      if (totalPost > 0) {
        // the view group appears. There was no content, so `inner` holds only
        // inserts (and marks): materialize the group node from it.
        const g: AnyBuilder = delta.create(groupName);
        for (const iop of inner.children) {
          if (delta.$insertOp.check(iop) || delta.$textOp.check(iop)) {
            g.insert(iop.insert, iop.format, iop.attribution);
          }
        }
        delta.mergeRootMarks(g, inner);
        out.insert([g.done(false)]);
      }
    } else if (totalPost === 0) {
      out.delete(1);
    } else if (innerTouched) {
      out.modify(inner.done(false));
    }
    delta.remapRootMarks(
      out,
      mapNumericKey((k) => viewGap(newSegs, k, totalPost)),
    );
    this.segs = newSegs;
    out.done(false);
    return dt.createTransformResult(null, out);
  }

  /** View layout change → Yjs layout change. */
  override applyB(db: AnyBuilder): dt.TransformResultAny {
    const fresh = this.fresh;
    this.fresh = false;
    const segs = this.segs;
    const groupName = this.groupName;
    /** the Yjs index of each non-group child, in view order */
    const nonIdx: number[] = [];
    /** the groups in Yjs order with their merged start */
    const groups: Array<{ ai: number; len: number; start: number }> = [];
    {
      let start = 0;
      segs.forEach((seg, i) => {
        if (seg.group) {
          groups.push({ ai: i, len: seg.len, start });
          start += seg.len;
        } else {
          nonIdx.push(i);
        }
      });
    }
    const nonPre = nonIdx.length;
    const totalPre = totalOf(segs);
    const hasView = totalPre > 0; // whether the view group exists (at view index `nonPre`)
    // the Yjs-side edits, keyed by Yjs index
    const edits = new ChildEdits();
    // the change routed into each touched group (by index into `groups`)
    const gcs = new Map<number, GroupChange>();
    const gc = (gi: number): GroupChange => {
      let c = gcs.get(gi);
      if (c === undefined) {
        c = { b: delta.create(), emitted: 0, out: 0, net: 0, touched: false };
        gcs.set(gi, c);
      }
      return c;
    };
    /** `target` is an offset within the group */
    const alignG = (c: GroupChange, target: number) => {
      if (target > c.emitted) {
        const n = target - c.emitted;
        c.b.retain(n);
        c.emitted = target;
        c.out += n;
      }
    };
    /**
     * The Yjs gap an insert at view gap `bi` lands in: before the same
     * non-group child, or at the end for a position at or past the view group.
     */
    const yjsGap = (bi: number) => (bi < nonPre ? nonIdx[bi] : segs.length);
    let createdGroup = false;
    /**
     * Route the children of a view-inserted group node at merged offset `off`
     * into the covering Yjs group (the earliest one at a boundary), or, with
     * no group at all, insert the node as the view built it.
     */
    const insertGroup = (
      el: AnyDelta,
      off: number,
      format: Format,
      attribution: Attribution,
    ) => {
      const gi = groups.findIndex((g) => off <= g.start + g.len);
      if (gi === -1) {
        edits.insertAt(segs.length, [el], format, attribution, [
          groupSeg(el.childCnt),
        ]);
        createdGroup = true;
        return;
      }
      // the wrapper's own attrs, format and attribution are not routed
      const c = gc(gi);
      alignG(c, off - groups[gi].start);
      const base = c.out;
      c.b.append(el);
      c.out += el.childCnt;
      c.net += el.childCnt;
      c.touched = true;
      if (el.marks !== null || el.deleteMarks !== null) {
        delta.mergeRootMarks(
          c.b,
          el,
          mapNumericKey((k) => base + k),
        );
      }
    };
    /**
     * Split a view-side change of the merged group across the Yjs groups.
     *
     * @param v the inner change, in merged pre-change coordinates
     */
    const modifyGroup = (v: AnyDelta) => {
      let gi = 0; // cursor: group index ...
      let go = 0; // ... and offset within it
      // positions are consumed from the next group holding any
      const skipFull = () => {
        while (gi < groups.length && go >= groups[gi].len) {
          gi++;
          go = 0;
        }
      };
      for (const iop of v.children) {
        if (delta.$retainOp.check(iop)) {
          const fmt = iop.format;
          const attr = iop.attribution;
          let rem = iop.retain;
          while (rem > 0) {
            skipFull();
            if (gi >= groups.length) {
              break;
            }
            const k = Math.min(groups[gi].len - go, rem);
            if (fmt !== undefined || attr !== undefined) {
              const c = gc(gi);
              alignG(c, go);
              c.b.retain(k, fmt, attr);
              c.emitted += k;
              c.out += k;
              c.touched = true;
            }
            go += k;
            rem -= k;
          }
        } else if (delta.$deleteOp.check(iop)) {
          let rem = iop.delete;
          while (rem > 0) {
            skipFull();
            if (gi >= groups.length) {
              break;
            }
            const k = Math.min(groups[gi].len - go, rem);
            const c = gc(gi);
            alignG(c, go);
            c.b.delete(k);
            c.emitted += k;
            c.net -= k;
            c.touched = true;
            go += k;
            rem -= k;
          }
        } else if (delta.$modifyOp.check(iop)) {
          skipFull();
          if (gi >= groups.length) {
            continue;
          }
          const c = gc(gi);
          alignG(c, go);
          c.b.modify(delta.clone(iop.value), iop.format, iop.attribution);
          c.emitted += 1;
          c.out += 1;
          c.touched = true;
          go += 1;
        } else if (delta.$insertOp.check(iop) || delta.$textOp.check(iop)) {
          // the group the cursor sits in (the earlier one at a boundary)
          if (gi >= groups.length) {
            gi = groups.length - 1;
            go = groups[gi].len;
          }
          const c = gc(gi);
          alignG(c, go);
          c.b.insert(iop.insert, iop.format, iop.attribution);
          c.out += iop.insert.length;
          c.net += iop.insert.length;
          c.touched = true;
        }
      }
      // root marks (merged post-change coordinates) go to the covering group
      if (v.marks !== null) {
        let start = 0;
        const ranges = groups.map((g, i) => {
          const r = { start, len: g.len + (gcs.get(i)?.net ?? 0) };
          start += r.len;
          return r;
        });
        for (const m of v.marks) {
          if (typeof m.key !== "number") {
            continue; // an attribute mark on the merged wrapper has no home
          }
          const key = m.key;
          let gi = ranges.findIndex((r) => key <= r.start + r.len);
          if (gi === -1) {
            gi = groups.length - 1;
          }
          const c = gc(gi);
          delta.addRootMark(c.b, m.copy(key - ranges[gi].start));
          c.touched = true;
        }
      }
      if (v.deleteMarks !== null && groups.length > 0) {
        const c = gc(0);
        for (const id of v.deleteMarks) {
          delta.deleteRootMark(c.b, id);
        }
        c.touched = true;
      }
    };
    let bi = 0; // pre-change view cursor
    for (const op of db.children) {
      if (delta.$retainOp.check(op)) {
        const fmt = op.format;
        const attr = op.attribution;
        for (let n = op.retain; n > 0; n--, bi++) {
          if (bi < nonPre) {
            if (fmt !== undefined || attr !== undefined) {
              edits.retainAt(nonIdx[bi], fmt, attr);
            }
          } else if (!(bi === nonPre && hasView)) {
            break; // past the layout
          }
          // a format on the merged group has no single Yjs node to land on
        }
      } else if (delta.$textOp.check(op)) {
        edits.insertAt(
          yjsGap(bi),
          op.insert,
          op.format,
          op.attribution,
          passSegs(op.insert.length),
        );
      } else if (delta.$insertOp.check(op)) {
        for (const el of op.insert) {
          if (isGroup(el, groupName)) {
            insertGroup(
              el,
              hasView && bi > nonPre ? totalPre : 0,
              op.format,
              op.attribution,
            );
          } else {
            edits.insertAt(yjsGap(bi), [el], op.format, op.attribution, [PASS]);
          }
        }
      } else if (delta.$deleteOp.check(op)) {
        for (let n = op.delete; n > 0; n--, bi++) {
          if (bi < nonPre) {
            edits.deleteAt(nonIdx[bi]);
          } else if (bi === nonPre && hasView) {
            // the view removed its group: empty every Yjs group, keep them all
            groups.forEach((g, gi) => {
              if (g.len > 0) {
                const c = gc(gi);
                alignG(c, 0);
                c.b.delete(g.len);
                c.emitted = g.len;
                c.net -= g.len;
                c.touched = true;
              }
            });
          } else {
            break;
          }
        }
      } else {
        // modify
        if (bi < nonPre) {
          edits.modifyAt(
            nonIdx[bi],
            delta.clone(op.value),
            op.format,
            op.attribution,
          );
        } else if (bi === nonPre && hasView) {
          modifyGroup(op.value); // the op's own format / attribution (the wrapper's) is dropped
        }
        bi++;
      }
    }
    for (const [gi, c] of gcs) {
      if (c.touched) {
        edits.modifyAt(groups[gi].ai, c.b.done(false), undefined, undefined);
      }
      if (c.net !== 0) {
        edits.adjustLen(groups[gi].ai, c.net);
      }
    }
    if (this.implicitGroups && fresh && groups.length === 0 && !createdGroup) {
      // implicit creation: a container the view just built gets its group
      edits.insertAt(
        segs.length,
        [delta.create(groupName).done(false)],
        undefined,
        undefined,
        [groupSeg(0)],
      );
    }
    const out: AnyBuilder = delta.cloneShallow(db);
    edits.emit(out, segs.length);
    const newSegs = edits.rebuildSegs(segs);
    delta.remapRootMarks(
      out,
      mapNumericKey((k) => yjsGapPost(newSegs, k)),
    );
    this.segs = newSegs;
    out.done(false);
    return dt.createTransformResult(out, null);
  }
}

/** Template of the per-container stage. */
export class PersistentGroup extends dt.Template<any, any> {
  constructor(
    $d: s.Schema<AnyDelta>,
    readonly groupName: string,
    readonly implicitGroups: boolean,
  ) {
    super($d, delta.$deltaAny);
  }

  override get name(): string {
    return `blocknote:persistentGroup:${this.groupName}`;
  }

  override init(): dt.Transformer<any, any> {
    return new PersistentGroupTransformer(
      this.$in,
      this.$out,
      this.groupName,
      this.implicitGroups,
    );
  }
}

/**
 * The transformer: hide empty `blockGroup`s from the view, keep them in Yjs,
 * create them with every new container, and merge concurrently created ones
 * (module doc above). Slot it into the sync plugin:
 *
 * ```ts
 * syncPlugin({ transformers: [persistentBlockGroups], customCompare: blockMatchNodes })
 * ```
 *
 * and into the standalone conversions with
 * `defaultTransformer({ mapAttributionToMark, transformers: [persistentBlockGroups] })`.
 *
 * The returned template is the recursion over the document (lib0's
 * `children`): containers get the per-container stage, the `nestingNodes`
 * descend, every other node opts out.
 */
export function persistentBlockGroups<IN extends delta.DeltaConf>(
  $d: s.Schema<delta.Delta<IN>>,
  options: PersistentBlockGroupsOptions = {},
): dt.Template<IN, any> {
  const groupName = options.groupName ?? defaults.groupName;
  const containerName = options.containerName ?? defaults.containerName;
  const implicitGroups = options.implicitGroups ?? defaults.implicitGroups;
  const nesting = new Set<string>(
    options.nestingNodes ?? defaults.nestingNodes,
  );
  function descend($c: s.Schema<AnyDelta>): dt.Template<any, any> {
    return dt.children($c, (child, $cc) =>
      child.name === containerName
        ? container($cc)
        : child.name !== null && nesting.has(child.name)
          ? descend($cc)
          : null,
    );
  }
  /**
   * Yjs → view order: descend into the container's groups first (Yjs layout),
   * then map the layout. The reverse direction runs the stages right to left.
   */
  function container($c: s.Schema<AnyDelta>): dt.Template<any, any> {
    return dt.pipe(
      $c,
      ($c1) => descend($c1),
      ($c2) => new PersistentGroup($c2, groupName, implicitGroups),
    );
  }
  return descend($d);
}
