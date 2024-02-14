import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FormattingToolbarPositioner } from "../components/FormattingToolbar/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "../components/HyperlinkToolbar/HyperlinkToolbarPositioner";
import { ImageToolbarPositioner } from "../components/ImageToolbar/ImageToolbarPositioner";
import { SideMenuPositioner } from "../components/SideMenu/SideMenuPositioner";
import { DefaultPositionedSuggestionMenu } from "../components/SuggestionMenu/DefaultSuggestionMenu";
import {
  filterSuggestionItems,
  getDefaultReactSlashMenuItems,
} from "../components/SuggestionMenu/defaultReactSlashMenuItems";
import { TableHandlesPositioner } from "../components/TableHandles/TableHandlePositioner";

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
        <FormattingToolbarPositioner editor={props.editor} />
      )}
      {props.hyperlinkToolbar !== false && (
        <HyperlinkToolbarPositioner editor={props.editor} />
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
      {props.sideMenu !== false && <SideMenuPositioner editor={props.editor} />}
      {props.imageToolbar !== false && (
        <ImageToolbarPositioner editor={props.editor} />
      )}
      {props.editor.blockSchema.table && props.tableHandles !== false && (
        <TableHandlesPositioner editor={props.editor as any} />
      )}
    </>
  );
}
