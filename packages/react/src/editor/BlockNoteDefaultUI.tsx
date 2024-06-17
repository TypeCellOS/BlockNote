import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController";
import { LinkToolbarController } from "../components/LinkToolbar/LinkToolbarController";
import { FilePanelController } from "../components/FilePanel/FilePanelController";
import { SideMenuController } from "../components/SideMenu/SideMenuController";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor";
import EmojiMenu from '../components/SuggestionMenu/emojisMenu.jsx'
import { Data, SearchIndex, init } from "emoji-mart";

export type BlockNoteDefaultUIProps = {
  formattingToolbar?: boolean;
  linkToolbar?: boolean;
  slashMenu?: boolean;
  sideMenu?: boolean;
  filePanel?: boolean;
  tableHandles?: boolean;
};

init({ Data })

async function search(value) {
  const response = await fetch(
    'https://cdn.jsdelivr.net/npm/@emoji-mart/data',
  )
  let allemojis = await response.json()
  let emojisToShow = []

  const emojis = await SearchIndex.search(value);
  console.log(emojis)
  const results = (emojis || []).map((emoji) => {
    return emoji.id;
  })
  Object.values(allemojis.emojis).forEach(({id, skins})=>{
    //add all emojis if not yet searched for an emoji
    results.includes(id) || !emojis ? emojisToShow.push(skins[0].native) : null
  });
  console.log(emojisToShow)
  return emojisToShow;

}


export function BlockNoteDefaultUI(props: BlockNoteDefaultUIProps) {
  const editor = useBlockNoteEditor();
  async function emojiChangeHandler(query){
  
    //now do the emojis
    console.log('IM HERE')
    //return a promise
   return search(query);
  //  setEmojisToHide(results)
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
       suggestionMenuComponent={EmojiMenu}
       getItems={emojiChangeHandler}
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
