import { DOMParser, Schema } from "prosemirror-model";
import { Block, BlockSchema, nodeToBlock } from "../../..";
import { InlineContentSchema } from "../../../extensions/Blocks/api/inlineContent/types";
import { StyleSchema } from "../../../extensions/Blocks/api/styles/types";

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
  const htmlNode = document.createElement("div");
  htmlNode.innerHTML = html.trim();

  const parser = DOMParser.fromSchema(pmSchema);
  const parentNode = parser.parse(htmlNode); //, { preserveWhitespace: "full" });

  const blocks: Block<BSchema, I, S>[] = [];

  for (let i = 0; i < parentNode.firstChild!.childCount; i++) {
    blocks.push(
      nodeToBlock(
        parentNode.firstChild!.child(i),
        blockSchema,
        icSchema,
        styleSchema
      )
    );
  }

  return blocks;
}
