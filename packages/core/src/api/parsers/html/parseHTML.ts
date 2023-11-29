import { DOMParser, Schema } from "prosemirror-model";
import { Block, BlockSchema, nodeToBlock } from "../../..";
import { InlineContentSchema } from "../../../extensions/Blocks/api/inlineContent/types";
import { StyleSchema } from "../../../extensions/Blocks/api/styles/types";
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

  // const doc = pmSchema.nodes["doc"].createAndFill()!;

  const parentNode = parser.parse(htmlNode, {
    topNode: pmSchema.nodes["blockGroup"].create(),
    // context: doc.resolve(3),
  }); //, { preserveWhitespace: "full" });
  const blocks: Block<BSchema, I, S>[] = [];

  for (let i = 0; i < parentNode.childCount; i++) {
    blocks.push(
      nodeToBlock(parentNode.child(i), blockSchema, icSchema, styleSchema)
    );
  }

  return blocks;
}
