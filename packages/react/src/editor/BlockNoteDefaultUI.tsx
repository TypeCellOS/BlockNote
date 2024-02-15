import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { DefaultPositionedFormattingToolbar } from "../components/FormattingToolbar/DefaultPositionedFormattingToolbar";
import { DefaultPositionedHyperlinkToolbar } from "../components/HyperlinkToolbar/DefaultPositionedHyperlinkToolbar";
import { DefaultPositionedImageToolbar } from "../components/ImageToolbar/DefaultPositionedImageToolbar";
import { DefaultPositionedSideMenu } from "../components/SideMenu/DefaultPositionedSideMenu";
import { DefaultPositionedSuggestionMenu } from "../components/SuggestionMenu/DefaultPositionedSuggestionMenu";
import {
  filterSuggestionItems,
  getDefaultReactSlashMenuItems,
} from "../components/SuggestionMenu/defaultReactSlashMenuItems";
import { DefaultPositionedTableHandles } from "../components/TableHandles/DefaultPositionedTableHandles";

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
        <DefaultPositionedSuggestionMenu
          editor={props.editor}
          getItems={async (query) =>
            filterSuggestionItems(getDefaultReactSlashMenuItems(), query)
          }
          // suggestionMenuComponent={MantineSuggestionMenu}
          onItemClick={(item) => {
            item.onItemClick(props.editor);
          }}
        />
      )}
      {props.sideMenu !== false && (
        <DefaultPositionedSideMenu editor={props.editor} />
      )}
      {props.imageToolbar !== false && (
        <DefaultPositionedImageToolbar editor={props.editor} />
      )}
      {props.editor.blockSchema.table && props.tableHandles !== false && (
        <DefaultPositionedTableHandles editor={props.editor as any} />
      )}
    </>
  );
}
