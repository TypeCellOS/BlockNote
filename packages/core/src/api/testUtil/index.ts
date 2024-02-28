import { PartialBlock } from "../../blocks/defaultBlocks";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema } from "../../schema/blocks/types";
import { InlineContentSchema } from "../../schema/inlineContent/types";
import { StyleSchema } from "../../schema/styles/types";
import { NoInfer } from "../../util/typescript";

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
