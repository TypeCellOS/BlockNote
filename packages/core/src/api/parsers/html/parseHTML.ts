import { DOMParser, Schema } from "prosemirror-model";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";

import { Block } from "../../../blocks/defaultBlocks.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";
import { nestedListsToBlockNoteStructure } from "./util/nestedLists.js";

export function HTMLToBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(html: string, pmSchema: Schema): Block<BSchema, I, S>[] {
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
    blocks.push(nodeToBlock(parentNode.child(i), pmSchema));
  }

  return blocks;
}
