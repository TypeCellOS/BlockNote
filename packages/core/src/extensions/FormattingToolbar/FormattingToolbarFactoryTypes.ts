import { EditorElement, ElementFactory } from "../../shared/EditorElement";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../Blocks/api/blockTypes";

export type FormattingToolbarStaticParams<BSchema extends BlockSchema> = {
  editor: BlockNoteEditor<BSchema>;
};

export type FormattingToolbarDynamicParams<BSchema extends BlockSchema> = {
  editor: BlockNoteEditor<BSchema>;
  referenceRect: DOMRect;
};

export type FormattingToolbar<BSchema extends BlockSchema> = EditorElement<
  FormattingToolbarDynamicParams<BSchema>
>;
export type FormattingToolbarFactory<BSchema extends BlockSchema> =
  ElementFactory<
    FormattingToolbarStaticParams<BSchema>,
    FormattingToolbarDynamicParams<BSchema>
  >;
