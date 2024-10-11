import { FilePanelController } from "../components/FilePanel/FilePanelController.js";
import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController.js";
import { LinkToolbarController } from "../components/LinkToolbar/LinkToolbarController.js";
import { SideMenuController } from "../components/SideMenu/SideMenuController.js";
import { GridSuggestionMenuController } from "../components/SuggestionMenu/GridSuggestionMenu/GridSuggestionMenuController.js";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController.js";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController.js";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor.js";

export type BlockNoteDefaultUIProps = {
  formattingToolbar?: boolean;
  linkToolbar?: boolean;
  slashMenu?: boolean;
  sideMenu?: boolean;
  filePanel?: boolean;
  tableHandles?: boolean;
  emojiPicker?: boolean;
};

export function BlockNoteDefaultUI(props: BlockNoteDefaultUIProps) {
  const editor = useBlockNoteEditor();

  if (!editor) {
    throw new Error(
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider"
    );
  }

  return (
    <>
      {props.formattingToolbar !== false && <FormattingToolbarController />}
      {props.linkToolbar !== false && <LinkToolbarController />}
      {props.slashMenu !== false && (
        <SuggestionMenuController triggerCharacter="/" />
      )}
      {props.emojiPicker !== false && (
        <GridSuggestionMenuController
          triggerCharacter=":"
          columns={10}
          minQueryLength={2}
        />
      )}
      {props.sideMenu !== false && <SideMenuController />}
      {editor.filePanel && props.filePanel !== false && <FilePanelController />}
      {editor.tableHandles && props.tableHandles !== false && (
        <TableHandlesController />
      )}
    </>
  );
}
