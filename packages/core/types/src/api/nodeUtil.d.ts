import { Node } from "prosemirror-model";
/**
 * Get a TipTap node by id
 */
export declare function getNodeById(id: string, doc: Node): {
    node: Node;
    posBeforeNode: number;
} | undefined;
