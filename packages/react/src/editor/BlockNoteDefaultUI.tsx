import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController";
import { LinkToolbarController } from "../components/LinkToolbar/LinkToolbarController";
import { FilePanelController } from "../components/FilePanel/FilePanelController";
import { SideMenuController } from "../components/SideMenu/SideMenuController";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor";

export type BlockNoteDefaultUIProps = {
  dir?: "rtl" | "ltr";
  formattingToolbar?: boolean;
  linkToolbar?: boolean;
  slashMenu?: boolean;
  sideMenu?: boolean;
  filePanel?: boolean;
  tableHandles?: boolean;
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
      {props.sideMenu !== false && <SideMenuController dir={props.dir} />}
      {editor.filePanel && props.filePanel !== false && <FilePanelController />}
      {editor.tableHandles && props.tableHandles !== false && (
        <TableHandlesController />
      )}
    </>
  );
}
