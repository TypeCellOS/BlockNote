import {
  BlockNoteView,
  SuggestionMenuController,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { customSlashMenuItems } from "./CustomSlashMenuItems";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      {/*TODO*/}
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={customSlashMenuItems}
      />
    </BlockNoteView>
  );
}
