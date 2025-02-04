import { Node, ResolvedPos } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
type SingleBlockInfo = {
    node: Node;
    beforePos: number;
    afterPos: number;
};
export type BlockInfo = {
    /**
     * The outer node that represents a BlockNote block. This is the node that has the ID.
     * Most of the time, this will be a blockContainer node, but it could also be a Column or ColumnList
     */
    bnBlock: SingleBlockInfo;
    /**
     * The type of BlockNote block that this node represents.
     * When dealing with a blockContainer, this is retrieved from the blockContent node, otherwise it's retrieved from the bnBlock node.
     */
    blockNoteType: string;
} & ({
    /**
     * The Prosemirror node that holds block.children. For non-blockContainer, this node will be the same as bnBlock.
     */
    childContainer: SingleBlockInfo;
    isBlockContainer: false;
} | {
    /**
     * The Prosemirror node that holds block.children. For blockContainers, this is the blockGroup node, if it exists.
     */
    childContainer?: SingleBlockInfo;
    /**
     * The Prosemirror node that wraps block.content and has most of the props
     */
    blockContent: SingleBlockInfo;
    /**
     * Whether bnBlock is a blockContainer node
     */
    isBlockContainer: true;
});
/**
 * Retrieves the position just before the nearest block node in a ProseMirror
 * doc, relative to a position. If the position is within a block node or its
 * descendants, the position just before it is returned. If the position is not
 * within a block node or its descendants, the position just before the next
 * closest block node is returned. If the position is beyond the last block, the
 * position just before the last block is returned.
 * @param doc The ProseMirror doc.
 * @param pos An integer position in the document.
 * @returns The position just before the nearest blockContainer node.
 */
export declare function getNearestBlockPos(doc: Node, pos: number): {
    posBeforeNode: number;
    node: Node;
};
/**
 * Gets information regarding the ProseMirror nodes that make up a block in a
 * BlockNote document. This includes the main `blockContainer` node, the
 * `blockContent` node with the block's main body, and the optional `blockGroup`
 * node which contains the block's children. As well as the nodes, also returns
 * the ProseMirror positions just before & after each node.
 * @param node The main `blockContainer` node that the block information should
 * be retrieved from,
 * @param bnBlockBeforePosOffset the position just before the
 * `blockContainer` node in the document.
 */
export declare function getBlockInfoWithManualOffset(node: Node, bnBlockBeforePosOffset: number): BlockInfo;
/**
 * Gets information regarding the ProseMirror nodes that make up a block in a
 * BlockNote document. This includes the main `blockContainer` node, the
 * `blockContent` node with the block's main body, and the optional `blockGroup`
 * node which contains the block's children. As well as the nodes, also returns
 * the ProseMirror positions just before & after each node.
 * @param posInfo An object with the main `blockContainer` node that the block
 * information should be retrieved from, and the position just before it in the
 * document.
 */
export declare function getBlockInfo(posInfo: {
    posBeforeNode: number;
    node: Node;
}): BlockInfo;
/**
 * Gets information regarding the ProseMirror nodes that make up a block from a
 * resolved position just before the `blockContainer` node in the document that
 * corresponds to it.
 * @param resolvedPos The resolved position just before the `blockContainer`
 * node.
 */
export declare function getBlockInfoFromResolvedPos(resolvedPos: ResolvedPos): BlockInfo;
/**
 * Gets information regarding the ProseMirror nodes that make up a block. The
 * block chosen is the one currently containing the current ProseMirror
 * selection.
 * @param state The ProseMirror editor state.
 */
export declare function getBlockInfoFromSelection(state: EditorState): BlockInfo;
export {};
