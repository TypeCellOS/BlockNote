import { filterSuggestionItems } from "@blocknote/core";
import { DefaultPositionedFormattingToolbar } from "../components/FormattingToolbar/DefaultPositionedFormattingToolbar";
import { DefaultPositionedHyperlinkToolbar } from "../components/HyperlinkToolbar/DefaultPositionedHyperlinkToolbar";
import { DefaultPositionedImageToolbar } from "../components/ImageToolbar/DefaultPositionedImageToolbar";
import { DefaultPositionedSideMenu } from "../components/SideMenu/DefaultPositionedSideMenu";
import { DefaultPositionedSuggestionMenu } from "../components/SuggestionMenu/DefaultPositionedSuggestionMenu";
import { getDefaultReactSlashMenuItems } from "../components/SuggestionMenu/defaultReactSlashMenuItems";
import { DefaultPositionedTableHandles } from "../components/TableHandles/DefaultPositionedTableHandles";
import { useBlockNoteContext } from "./BlockNoteContext";

export type BlockNoteDefaultUIProps = {
  formattingToolbar?: boolean;
  hyperlinkToolbar?: boolean;
  slashMenu?: boolean;
  sideMenu?: boolean;
  imageToolbar?: boolean;
  tableHandles?: boolean;
};

export function BlockNoteDefaultUI(props: BlockNoteDefaultUIProps) {
  const editor = useBlockNoteContext()?.editor;

  if (!editor) {
    throw new Error(
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider"
    );
  }

  // TODO also remove editor passing to each component, use context
  return (
    <>
      {props.formattingToolbar !== false && (
        <DefaultPositionedFormattingToolbar />
      )}
      {props.hyperlinkToolbar !== false && (
        <DefaultPositionedHyperlinkToolbar />
      )}
      {props.slashMenu !== false && (
        <DefaultPositionedSuggestionMenu
          getItems={async (query) =>
            filterSuggestionItems(getDefaultReactSlashMenuItems(), query)
          }
          // suggestionMenuComponent={MantineSuggestionMenu}
          onItemClick={(item) => {
            item.onItemClick(editor);
          }}
          triggerCharacter="/"
        />
      )}
      {props.sideMenu !== false && <DefaultPositionedSideMenu />}
      {props.imageToolbar !== false && <DefaultPositionedImageToolbar />}
      {editor.blockSchema.table && props.tableHandles !== false && (
        <DefaultPositionedTableHandles editor={editor as any} />
      )}
    </>
  );
}
