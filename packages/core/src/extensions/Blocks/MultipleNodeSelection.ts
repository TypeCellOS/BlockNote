import { Selection } from "prosemirror-state";
import { Fragment, Node, Slice } from "prosemirror-model";
import { Mappable } from "prosemirror-transform";

export class MultipleNodeSelection extends Selection {
  nodes: Array<Node>;

  constructor(doc: Node, anchor: number, head = anchor) {
    // Resolved positions of anchor and head inside block content nodes.
    const $anchor = doc.resolve(anchor);
    const $head = doc.resolve(head);

    // Ensures that entire outermost nodes are selected if the selection spans multiple nesting levels.
    const minDepth = Math.min($anchor.depth, $head.depth);

    // Absolute positions of the start of the block the anchor is in and the end of the block that the head is in.
    // We want these positions for block nodes rather than block content nodes which is why minDepth - 1 is used.
    const startBlockPos = $anchor.start(minDepth - 1);
    const endBlockPos = $head.end(minDepth - 1);

    // Resolved positions at the end of the block before the one the anchor is in, and the start of the block after the
    // one that the head is in. Having the selection start and end just before and just after the target blocks ensures
    // no whitespace/line breaks are left behind after dropping them.
    const $endPrevBlockPos = doc.resolve(startBlockPos - 1);
    const $startNextBlockPos = doc.resolve(endBlockPos + 1);
    super($endPrevBlockPos, $startNextBlockPos);

    // Have to go up 2 nesting levels to get parent since it should be a block group node.
    // minDepth - 0 -> block content
    // minDepth - 1 -> block
    // minDepth - 2 -> block group
    const parentNode = $anchor.node(minDepth - 2);

    this.nodes = [];
    $anchor.doc.nodesBetween(
      startBlockPos,
      endBlockPos,
      (node, _pos, parent) => {
        if (parent !== null && parent.eq(parentNode)) {
          this.nodes.push(node);
          return false;
        }
        return;
      }
    );
  }

  static create(doc: Node, from: number, to: number): MultipleNodeSelection {
    return new MultipleNodeSelection(doc, from, to);
  }

  content(): Slice {
    return new Slice(Fragment.from(this.nodes), 0, 0);
  }

  eq(selection: Selection): boolean {
    if (!(selection instanceof MultipleNodeSelection)) return false;

    if (this.nodes.length !== selection.nodes.length) return false;

    if (this.from !== selection.from || this.to !== selection.to) return false;

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

    if (fromResult.deleted || toResult.deleted)
      return Selection.near(doc.resolve(fromResult.pos));

    return new MultipleNodeSelection(doc, fromResult.pos, toResult.pos);
  }

  toJSON(): any {
    return { type: "node", anchor: this.anchor, head: this.head };
  }
}
