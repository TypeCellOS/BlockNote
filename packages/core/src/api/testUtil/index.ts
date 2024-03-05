import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, PartialBlock } from "../../schema/blocks/types";
import { InlineContentSchema } from "../../schema/inlineContent/types";
import { StyleSchema } from "../../schema/styles/types";

export type EditorTestCases<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  name: string;
  createEditor: () => BlockNoteEditor<B, I, S>;
  documents: Array<{
    name: string;
    blocks: PartialBlock<B, I, S>[];
  }>;
};
