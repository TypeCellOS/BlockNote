import { DOMParser, Schema } from "prosemirror-model";
import {
  Block,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema";

import { nodeToBlock } from "../../nodeConversions/nodeConversions";
import { nestedListsToBlockNoteStructure } from "./util/nestedLists";
export async function HTMLToBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  html: string,
  blockSchema: BSchema,
  icSchema: I,
  styleSchema: S,
  pmSchema: Schema
): Promise<Block<BSchema, I, S>[]> {
  const htmlNode = nestedListsToBlockNoteStructure(html);
  const parser = DOMParser.fromSchema(pmSchema);

  // Other approach might be to use
  // const doc = pmSchema.nodes["doc"].createAndFill()!;
  // and context: doc.resolve(3),

  const parentNode = parser.parse(htmlNode, {
    topNode: pmSchema.nodes["blockGroup"].create(),
  });

  const blocks: Block<BSchema, I, S>[] = [];

  for (let i = 0; i < parentNode.childCount; i++) {
    blocks.push(
      nodeToBlock(parentNode.child(i), blockSchema, icSchema, styleSchema)
    );
  }

  return blocks;
}
