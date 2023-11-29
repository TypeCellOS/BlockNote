import { BlockNoteEditor } from "../../BlockNoteEditor";
import {
  BlockSchema,
  PartialBlock,
} from "../../extensions/Blocks/api/blocks/types";
import { InlineContentSchema } from "../../extensions/Blocks/api/inlineContent/types";
import { StyleSchema } from "../../extensions/Blocks/api/styles/types";

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
