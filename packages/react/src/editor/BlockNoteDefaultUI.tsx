import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController";
import { LinkToolbarController } from "../components/LinkToolbar/LinkToolbarController";
import { FilePanelController } from "../components/FilePanel/FilePanelController";
import { SideMenuController } from "../components/SideMenu/SideMenuController";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController";
import EmojiMenu from "../components/SuggestionMenu/emojisMenu.js";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor";
import { Data, SearchIndex, init } from "emoji-mart";

export type BlockNoteDefaultUIProps = {
  formattingToolbar?: boolean;
  linkToolbar?: boolean;
  slashMenu?: boolean;
  sideMenu?: boolean;
  filePanel?: boolean;
  tableHandles?: boolean;
};

export function BlockNoteDefaultUI(props: BlockNoteDefaultUIProps) {
  //this makes sure emjois aren't fetched at every render
  init({ Data });

  async function search(value: string) {
    if (value === "") {
      //Don't do unnecessary linear search if no search query
      return Object.values(Data.emojis).map(
        (emoji: any) => emoji.skins[0].native
      );
    }
    //begin the linear search
    const emojisToShow = await SearchIndex.search(value);

    //return the emojis
    return emojisToShow.map((emoji: any) => emoji.skins[0].native);
  }

  const editor = useBlockNoteEditor();
  async function emojiChangeHandler(query: string) {
    //STEP 2: call the search function, which returns an array of emojis as items for the component
    return search(query);
  }

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
        <>
          <SuggestionMenuController triggerCharacter="/" />
          <SuggestionMenuController
            triggerCharacter={":"}
            grid={true}
            suggestionMenuComponent={EmojiMenu}
            getItems={emojiChangeHandler}
            onItemClick={(item) =>
          {
            editor.insertInlineContent([
              {
                type: 'emoji',
                props: {
                  emoji: item
                }
              }, " "
            ])
          
          }
            }
          />
        </>
      )}
      {props.sideMenu !== false && <SideMenuController />}
      {editor.filePanel && props.filePanel !== false && <FilePanelController />}
      {editor.tableHandles && props.tableHandles !== false && (
        <TableHandlesController />
      )}
    </>
  );
}
