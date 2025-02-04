import { Node, ResolvedPos, Slice } from "prosemirror-model";
import { Selection } from "prosemirror-state";
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
export declare class MultipleNodeSelection extends Selection {
    nodes: Array<Node>;
    constructor($anchor: ResolvedPos, $head: ResolvedPos);
    static create(doc: Node, from: number, to?: number): MultipleNodeSelection;
    content(): Slice;
    eq(selection: Selection): boolean;
    map(doc: Node, mapping: Mappable): Selection;
    toJSON(): any;
}
