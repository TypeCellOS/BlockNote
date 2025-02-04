import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { BlockInfo } from "../../../getBlockInfoFromPos.js";
/**
 * Returns the block info from the parent block
 * or undefined if we're at the root
 */
export declare const getParentBlockInfo: (doc: Node, beforePos: number) => BlockInfo | undefined;
/**
 * Returns the block info from the sibling block before (above) the given block,
 * or undefined if the given block is the first sibling.
 */
export declare const getPrevBlockInfo: (doc: Node, beforePos: number) => BlockInfo | undefined;
/**
 * If a block has children like this:
 * A
 * - B
 * - C
 * -- D
 *
 * Then the bottom nested block returned is D.
 */
export declare const getBottomNestedBlockInfo: (doc: Node, blockInfo: BlockInfo) => BlockInfo;
export declare const mergeBlocksCommand: (posBetweenBlocks: number) => ({ state, dispatch, }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
}) => boolean;
