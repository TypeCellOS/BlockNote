import { Selection } from "prosemirror-state";
import { Fragment, Node, ResolvedPos, Slice } from "prosemirror-model";
import { Mappable } from "prosemirror-transform";

/**
 * This class represents an editor selection which spans multiple nodes/blocks. It's currently only used to allow users
 * to drag multiple blocks at the same time. Expects the selection anchor and head to be between nodes, i.e. just before
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
    let fromResult = mapping.mapResult(this.from);
    let toResult = mapping.mapResult(this.to);

    if (toResult.deleted) {
      return Selection.near(doc.resolve(fromResult.pos));
    }

    if (fromResult.deleted) {
      return Selection.near(doc.resolve(toResult.pos));
    }

    return new MultipleNodeSelection(
      doc.resolve(fromResult.pos),
      doc.resolve(toResult.pos)
    );
  }

  toJSON(): any {
    return { type: "node", anchor: this.anchor, head: this.head };
  }
}
