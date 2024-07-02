import { useCallback } from "react";

import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController";
import { LinkToolbarController } from "../components/LinkToolbar/LinkToolbarController";
import { FilePanelController } from "../components/FilePanel/FilePanelController";
import { SideMenuController } from "../components/SideMenu/SideMenuController";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController";
import GridSuggestionMenu from "../components/SuggestionMenu/GridSuggestionMenu";
import { getDefaultReactEmojiPickerItems } from "../components/SuggestionMenu/getDefaultReactEmojiPickerItems";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor";

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

  const getEmojiPickerItems = useCallback(
    (query: string) => getDefaultReactEmojiPickerItems(editor, query),
    [editor]
  );
  const emojiPickerOnItemClick = useCallback(
    (item: { id: string; emoji: string }) => {
      editor.insertInlineContent([
        {
          type: "emoji",
          props: {
            emoji: item.emoji,
          },
        },
        " ",
      ]);
    },
    [editor]
  );

  return (
    <>
      {props.formattingToolbar !== false && <FormattingToolbarController />}
      {props.linkToolbar !== false && <LinkToolbarController />}
      {props.slashMenu !== false && (
        <SuggestionMenuController triggerCharacter="/" />
      )}
      {props.emojiPicker !== false && (
        <SuggestionMenuController
          triggerCharacter={":"}
          grid={true}
          suggestionMenuComponent={GridSuggestionMenu}
          getItems={getEmojiPickerItems}
          onItemClick={emojiPickerOnItemClick}
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
