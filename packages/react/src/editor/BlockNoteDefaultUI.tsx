import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController";
import { LinkToolbarController } from "../components/LinkToolbar/LinkToolbarController";
import { FilePanelController } from "../components/FilePanel/FilePanelController";
import { SideMenuController } from "../components/SideMenu/SideMenuController";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController";
import { GridSuggestionMenuController } from "../components/SuggestionMenu/GridSuggestionMenu/GridSuggestionMenuController";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor";
import { AIBlockToolbarController } from "../components/AIBlockToolbar/AIBlockToolbarController";
import { AIInlineToolbarController } from "../components/AIInlineToolbar/AIInlineToolbarController";
import { filterSuggestionItems } from "@blocknote/core";
import { getDefaultAIMenuItems } from "../components/SuggestionMenu/getDefaultAIMenuItems";

export type BlockNoteDefaultUIProps = {
  formattingToolbar?: boolean;
  linkToolbar?: boolean;
  slashMenu?: boolean;
  sideMenu?: boolean;
  filePanel?: boolean;
  tableHandles?: boolean;
  emojiPicker?: boolean;
  aiBlockToolbar?: boolean;
  aiInlineToolbar?: boolean;
  aiMenu?: boolean;
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
      {editor.aiBlockToolbar && props.aiBlockToolbar !== false && (
        <AIBlockToolbarController />
      )}
      {props.aiInlineToolbar !== false && <AIInlineToolbarController />}
      {props.aiMenu !== false && (
        <SuggestionMenuController
          triggerCharacter="`"
          getItems={async (query) =>
            filterSuggestionItems(getDefaultAIMenuItems(editor, query), query)
          }
        />
      )}
    </>
  );
}
