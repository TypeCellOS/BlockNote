import {Selection} from "prosemirror-state";
import {Fragment, Node, Slice} from "prosemirror-model";

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

    // Resolved positions of the start of the block the anchor is in and the start of the block after the one that the
    // head is in - ensures that dragging and dropping multiple blocks doesn't leave behind a line break.
    const $startBlockPos = doc.resolve(startBlockPos);
    const $startNextBlockPos = doc.resolve(endBlockPos + 2);

    super($startBlockPos, $startNextBlockPos);


    this.nodes = [];

    // Have to go up 2 nesting levels to get parent since it should be a block group node.
    // minDepth - 0 -> block content
    // minDepth - 1 -> block
    // minDepth - 2 -> block group
    const parentNode = $anchor.node(minDepth - 2);
    console["log"]("Parent Node:", parentNode);

    $anchor.doc.nodesBetween(
      startBlockPos,
      endBlockPos,
      (node, _pos, parent) => {
        // console.log("NODE:");
        // console.log("    TYPE:", node.type.name);
        // console.log("    CONTENT:", node.textContent)
        // console.log("    START:", _pos);
        // console.log("    END:", _pos + node.nodeSize);
        if(parent !== null && parent.eq(parentNode)) {
          this.nodes.push(node);
          return false;
        }
        return;
      }
    )

    // console.log("Nodes:", this.nodes);
  }

  static create(doc: Node, from: number, to: number): MultipleNodeSelection {
    return new MultipleNodeSelection(doc, from, to);
  }

  // TODO: Ensure that t
  content(): Slice {
    return new Slice(Fragment.from(this.nodes), 0, 0)
  }

  eq(selection: Selection): boolean {
    return false;
  }

  map(doc: Node, mapping: Mappable): Selection {
    return undefined;
  }

  toJSON(): any {
  }
}