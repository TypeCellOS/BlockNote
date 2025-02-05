import { Node, Slice } from "@tiptap/pm/model";
import type { BlockSchema, InlineContent, InlineContentSchema, StyleSchema, TableContent } from "../../schema/index.js";
import { EditorState, Transaction } from "prosemirror-state";
import type { Block } from "../../blocks/defaultBlocks.js";
/**
 * Converts an internal (prosemirror) table node contentto a BlockNote Tablecontent
 */
export declare function contentNodeToTableContent<I extends InlineContentSchema, S extends StyleSchema>(contentNode: Node, inlineContentSchema: I, styleSchema: S): TableContent<I, S>;
/**
 * Converts an internal (prosemirror) content node to a BlockNote InlineContent array.
 */
export declare function contentNodeToInlineContent<I extends InlineContentSchema, S extends StyleSchema>(contentNode: Node, inlineContentSchema: I, styleSchema: S): InlineContent<I, S>[];
export declare function nodeToCustomInlineContent<I extends InlineContentSchema, S extends StyleSchema>(node: Node, inlineContentSchema: I, styleSchema: S): InlineContent<I, S>;
/**
 * Convert a Prosemirror node to a BlockNote block.
 *
 * TODO: test changes
 */
export declare function nodeToBlock<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(node: Node, blockSchema: BSchema, inlineContentSchema: I, styleSchema: S, blockCache?: WeakMap<Node, Block<BSchema, I, S>>): Block<BSchema, I, S>;
/**
 * Convert a Prosemirror document to a BlockNote document (array of blocks)
 */
export declare function docToBlocks<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(doc: Node, blockSchema: BSchema, inlineContentSchema: I, styleSchema: S, blockCache?: WeakMap<Node, Block<BSchema, I, S>>): Block<BSchema, I, S>[];
export type SlicedBlock<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema> = {
    block: Block<BSchema, I, S> & {
        children: SlicedBlock<BSchema, I, S>[];
    };
    contentCutAtStart: boolean;
    contentCutAtEnd: boolean;
};
export declare function selectionToInsertionEnd(tr: Transaction, startLen: number): number | undefined;
/**
 * Create a transaction that adds selection markers to the document at the given positions.
 *
 * @param state - The editor state.
 * @param from - The start position of the selection.
 * @param to - The end position of the selection.
 * @returns The transaction and the new end position.
 */
export declare function addSelectionMarkersTr(state: EditorState, from: number, to: number): {
    tr: Transaction;
    newEnd: number;
};
export declare function getDocumentWithSelectionMarkers<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(state: EditorState, from: number, to: number, blockSchema: BSchema, inlineContentSchema: I, styleSchema: S, blockCache?: WeakMap<Node, Block<BSchema, I, S>>): Block<BSchema, I, S>[];
/**
 * Add selection markers to the document at the given positions and return the blocks that span the selection.
 */
export declare function getSelectedBlocksWithSelectionMarkers<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(state: EditorState, from: number, to: number, blockSchema: BSchema, inlineContentSchema: I, styleSchema: S, blockCache?: WeakMap<Node, Block<BSchema, I, S>>): Block<BSchema, I, S>[];
export declare function withoutSliceMetadata<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(blocks: SlicedBlock<BSchema, I, S>[]): Block<BSchema, I, S>[];
/**
 *
 * Parse a Prosemirror Slice into a BlockNote selection. The prosemirror schema looks like this:
 *
 * <blockGroup>
 *   <blockContainer> (main content of block)
 *       <p, heading, etc.>
 *   <blockGroup> (only if blocks has children)
 *     <blockContainer> (child block)
 *       <p, heading, etc.>
 *     </blockContainer>
 *    <blockContainer> (child block 2)
 *       <p, heading, etc.>
 *     </blockContainer>
 *   </blockContainer>
 *  </blockGroup>
 * </blockGroup>
 *
 * Examples,
 *
 * for slice:
 *
 * {"content":[{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"1","textColor":"yellow","backgroundColor":"blue"},"content":[{"type":"heading","attrs":{"textAlignment":"right","level":2},"content":[{"type":"text","marks":[{"type":"bold"},{"type":"underline"}],"text":"ding "},{"type":"text","marks":[{"type":"italic"},{"type":"strike"}],"text":"2"}]},{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"2","textColor":"default","backgroundColor":"red"},"content":[{"type":"paragraph","attrs":{"textAlignment":"left"},"content":[{"type":"text","text":"Par"}]}]}]}]}]}],"openStart":3,"openEnd":5}
 *
 * should return:
 *
 * [
 *   {
 *     block: {
 *       nodeToBlock(first blockContainer node),
 *       children: [
 *         {
 *           block: nodeToBlock(second blockContainer node),
 *           contentCutAtEnd: true,
 *           childrenCutAtEnd: false,
 *         },
 *       ],
 *     },
 *      contentCutAtStart: true,
 *     contentCutAtEnd: false,
 *     childrenCutAtEnd: true,
 *   },
 * ]
 *
 * TODO: do we actually need / use this?
 */
export declare function prosemirrorSliceToSlicedBlocks<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(slice: Slice, blockSchema: BSchema, inlineContentSchema: I, styleSchema: S, blockCache?: WeakMap<Node, Block<BSchema, I, S>>): {
    blocks: SlicedBlock<BSchema, I, S>[];
};
