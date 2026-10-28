import { Fragment, Node, ResolvedPos, Slice } from "prosemirror-model";
import { Selection, SelectionBookmark } from "prosemirror-state";
import { Mappable } from "prosemirror-transform";

/**
 * This class represents an editor selection which spans one or more whole nodes/blocks. It's used for block drags
 * and their restored history selections. Expects the selection anchor and head to be between nodes, i.e. just before
 * the first target node and just after the last, and that anchor and head are at the same nesting level.
 *
 * Partially based on ProseMirror's NodeSelection implementation:
 * (https://github.com/ProseMirror/prosemirror-state/blob/master/src/selection.ts)
 * MultipleNodeSelection differs from NodeSelection in the following ways:
 * 1. Stores which nodes are included in the selection instead of just a single node.
 * 2. Already expects the selection to start just before the first target node and ends just after the last, while a
 * NodeSelection automatically sets both anchor and head to just before the single target node.
 */
export class MultipleNodeSelection extends Selection {
  nodes: Array<Node>;

  constructor($anchor: ResolvedPos, $head: ResolvedPos) {
    super($anchor, $head);

    // Parent is at the same nesting level as anchor/head since they are just before/ just after target nodes.
    const parentNode = $anchor.node();

    this.nodes = [];
    $anchor.doc.nodesBetween($anchor.pos, $head.pos, (node, _pos, parent) => {
      if (parent !== null && parent.eq(parentNode)) {
        this.nodes.push(node);
        return false;
      }
      return;
    });
  }

  static create(doc: Node, from: number, to = from): MultipleNodeSelection {
    return new MultipleNodeSelection(doc.resolve(from), doc.resolve(to));
  }

  static fromJSON(doc: Node, json: { anchor: number; head: number }) {
    if (typeof json.anchor !== "number" || typeof json.head !== "number") {
      throw new RangeError("Invalid input for MultipleNodeSelection.fromJSON");
    }
    return MultipleNodeSelection.create(doc, json.anchor, json.head);
  }

  content(): Slice {
    return new Slice(Fragment.from(this.nodes), 0, 0);
  }

  eq(selection: Selection): boolean {
    if (!(selection instanceof MultipleNodeSelection)) {
      return false;
    }

    if (this.nodes.length !== selection.nodes.length) {
      return false;
    }

    if (this.from !== selection.from || this.to !== selection.to) {
      return false;
    }

    for (let i = 0; i < this.nodes.length; i++) {
      if (!this.nodes[i].eq(selection.nodes[i])) {
        return false;
      }
    }

    return true;
  }

  map(doc: Node, mapping: Mappable): Selection {
    return this.getBookmark().map(mapping).resolve(doc);
  }

  getBookmark(): SelectionBookmark {
    return new MultipleNodeBookmark(this.from, this.to);
  }

  toJSON() {
    return { type: "multiple-node", anchor: this.anchor, head: this.head };
  }
}

class MultipleNodeBookmark implements SelectionBookmark {
  constructor(
    private readonly from: number,
    private readonly to: number,
  ) {}

  map(mapping: Mappable): SelectionBookmark {
    const from = mapping.mapResult(this.from, 1);
    // A collapsed bookmark is a fallback cursor, not a range to expand.
    if (this.from === this.to) {
      return new MultipleNodeBookmark(from.pos, from.pos);
    }
    const to = mapping.mapResult(this.to, -1);

    if (to.deleted) {
      return new MultipleNodeBookmark(from.pos, from.pos);
    }
    if (from.deleted) {
      return new MultipleNodeBookmark(to.pos, to.pos);
    }

    return new MultipleNodeBookmark(from.pos, to.pos);
  }

  resolve(doc: Node): Selection {
    const $from = doc.resolve(this.from);
    const $to = doc.resolve(this.to);
    // Structural edits can leave positions inside blocks or in different parents.
    // Only restore the block selection when both ends are still node boundaries.
    if (
      this.from < this.to &&
      $from.sameParent($to) &&
      $from.textOffset === 0 &&
      $to.textOffset === 0
    ) {
      return new MultipleNodeSelection($from, $to);
    }

    return Selection.near($from);
  }
}

Selection.jsonID("multiple-node", MultipleNodeSelection);
