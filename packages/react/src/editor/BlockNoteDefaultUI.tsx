import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController";
import { LinkToolbarController } from "../components/LinkToolbar/LinkToolbarController";
import { FilePanelController } from "../components/FilePanel/FilePanelController";
import { SideMenuController } from "../components/SideMenu/SideMenuController";
import { SuggestionMenuController } from "../components/SuggestionMenu/SuggestionMenuController";
import { TableHandlesController } from "../components/TableHandles/TableHandlesController";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor";
import EmojiMenu from '../components/SuggestionMenu/emojisMenu.jsx'
import { Data, init } from "emoji-mart";

export type BlockNoteDefaultUIProps = {
  formattingToolbar?: boolean;
  linkToolbar?: boolean;
  slashMenu?: boolean;
  sideMenu?: boolean;
  filePanel?: boolean;
  tableHandles?: boolean;
};




export function BlockNoteDefaultUI(props: BlockNoteDefaultUIProps) {



let allemojis = [];
init({ Data })

async function search(value) {
  if(value == ''){

    return Object.values(Data.emojis).map(emoji=>(
      emoji.skins[0].native
    ))
  }
  const emojisToShow = []
  // const emojis = [];
  //begin the search
  Object.values(Data.emojis).forEach((emoji)=>{
    for(let a = 0; a < emoji.keywords.length; a++){
      let keyword = emoji.keywords[a];
      if(keyword.includes(value)){
        emojisToShow.push(emoji.skins[0].native);
        break;
      }
    }

  })
  return emojisToShow;

}

  const editor = useBlockNoteEditor();
  async function emojiChangeHandler(query: string){
  
    //now do the emojis
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
        isEmoji
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
