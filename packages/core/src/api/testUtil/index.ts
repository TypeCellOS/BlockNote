import { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockSchema } from "../../schema/blocks/types.js";
import { InlineContentSchema } from "../../schema/inlineContent/types.js";
import { StyleSchema } from "../../schema/styles/types.js";
import { NoInfer } from "../../util/typescript.js";

export type EditorTestCases<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  name: string;
  createEditor: () => BlockNoteEditor<B, I, S>;
  documents: Array<{
    name: string;
    blocks: PartialBlock<NoInfer<B>, NoInfer<I>, NoInfer<S>>[];
  }>;
};
