import { DefaultPositionedFormattingToolbar } from "../components/FormattingToolbar/DefaultPositionedFormattingToolbar";
import { DefaultPositionedHyperlinkToolbar } from "../components/HyperlinkToolbar/DefaultPositionedHyperlinkToolbar";
import { DefaultPositionedSuggestionMenu } from "../components/SuggestionMenu/DefaultPositionedSuggestionMenu";
import { DefaultPositionedSideMenu } from "../components/SideMenu/DefaultPositionedSideMenu";
import { DefaultPositionedImageToolbar } from "../components/ImageToolbar/DefaultPositionedImageToolbar";
import { TableHandlesPositioner } from "../components/TableHandles/TableHandlePositioner";
import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

export function BlockNoteDefaultUI<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
  formattingToolbar?: boolean;
  hyperlinkToolbar?: boolean;
  slashMenu?: boolean;
  sideMenu?: boolean;
  imageToolbar?: boolean;
  tableHandles?: boolean;
}) {
  return (
    <>
      {props.formattingToolbar !== false && (
        <DefaultPositionedFormattingToolbar editor={props.editor} />
      )}
      {props.hyperlinkToolbar !== false && (
        <DefaultPositionedHyperlinkToolbar editor={props.editor} />
      )}
      {props.slashMenu !== false && (
        <DefaultPositionedSuggestionMenu editor={props.editor} />
      )}
      {props.sideMenu !== false && (
        <DefaultPositionedSideMenu editor={props.editor} />
      )}
      {props.imageToolbar !== false && (
        <DefaultPositionedImageToolbar editor={props.editor} />
      )}
      {props.editor.blockSchema.table && props.tableHandles !== false && (
        <TableHandlesPositioner editor={props.editor as any} />
      )}
    </>
  );
}
