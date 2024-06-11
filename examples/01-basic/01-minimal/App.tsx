import "@blocknote/core/fonts/inter.css";
import {SuggestionMenuController, useCreateBlockNote} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    uploadFile: async () => 'https://www.blocknotejs.org/img/logos/banner.svg'
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor}>
    <SuggestionMenuController triggerCharacter={'@'} getItems={query => {

    }}/>
  </BlockNoteView>
}
