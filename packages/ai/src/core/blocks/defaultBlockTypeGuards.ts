import { InlineContentSchema, StyleSchema } from "@blocknote/core";

import type { BlockNoteEditor } from "../editor/BlockNoteEditor";
import { defaultBlockSchema, DefaultBlockSchema } from "./defaultBlocks";

export function checkDefaultBlockTypeInSchema<
  BlockType extends keyof DefaultBlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blockType: BlockType,
  editor: BlockNoteEditor<any, I, S>
): editor is BlockNoteEditor<{ Type: DefaultBlockSchema[BlockType] }, I, S> {
  return (
    blockType in editor.schema.blockSchema &&
    editor.schema.blockSchema[blockType] === defaultBlockSchema[blockType]
  );
}
