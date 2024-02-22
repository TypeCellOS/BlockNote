import {
  BlockSchema,
  filterSuggestionItems,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController";
import { HyperlinkToolbarController } from "../components/HyperlinkToolbar/HyperlinkToolbarController";
import { ImageToolbarController } from "../components/ImageToolbar/ImageToolbarController";
import { SideMenuController } from "../components/SideMenu/SideMenuController";
import { getDefaultReactSlashMenuItems } from "../components/SuggestionMenu/getDefaultReactSlashMenuItems";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController";
import { useBlockNoteEditor } from "./BlockNoteContext";

export type BlockNoteDefaultUIProps = {
  formattingToolbar?: boolean;
  hyperlinkToolbar?: boolean;
  slashMenu?: boolean;
  sideMenu?: boolean;
  imageToolbar?: boolean;
  tableHandles?: boolean;
};

export function BlockNoteDefaultUI(props: BlockNoteDefaultUIProps) {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  if (!editor) {
    throw new Error(
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider"
    );
  }

  return (
    <>
      {props.formattingToolbar !== false && <FormattingToolbarController />}
      {props.hyperlinkToolbar !== false && <HyperlinkToolbarController />}
      {props.slashMenu !== false && (
        <SuggestionMenuController
          getItems={async (query) =>
            filterSuggestionItems(getDefaultReactSlashMenuItems(editor), query)
          }
          // suggestionMenuComponent={MantineSuggestionMenu}
          onItemClick={(item) => {
            item.onItemClick();
          }}
          triggerCharacter="/"
        />
      )}
      {props.sideMenu !== false && <SideMenuController />}
      {editor.imageToolbar && props.imageToolbar !== false && (
        <ImageToolbarController />
      )}
      {editor.tableHandles && props.tableHandles !== false && (
        <TableHandlesController />
      )}
    </>
  );
}
