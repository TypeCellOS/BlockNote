import { Node, Schema } from "@tiptap/pm/model";
import type { InlineContentSchema, PartialInlineContent, PartialTableContent, StyleSchema } from "../../schema";
import type { PartialBlock } from "../../blocks/defaultBlocks";
/**
 * converts an array of inline content elements to prosemirror nodes
 */
export declare function inlineContentToNodes<I extends InlineContentSchema, S extends StyleSchema>(blockContent: PartialInlineContent<I, S>, schema: Schema, styleSchema: S): Node[];
/**
 * converts an array of inline content elements to prosemirror nodes
 */
export declare function tableContentToNodes<I extends InlineContentSchema, S extends StyleSchema>(tableContent: PartialTableContent<I, S>, schema: Schema, styleSchema: StyleSchema): Node[];
/**
 * Converts a BlockNote block to a Prosemirror node.
 */
export declare function blockToNode(block: PartialBlock<any, any, any>, schema: Schema, styleSchema: StyleSchema): Node;
