import {
  BlockNoteView,
  DefaultPositionedSuggestionMenu,
  getDefaultReactSlashMenuItems,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { filterSuggestionItems } from "@blocknote/core";
import { customSlashMenuItems } from "./CustomSlashMenuItems";

// import { customSlashMenuItems } from "./CustomSlashMenuItems";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <DefaultPositionedSuggestionMenu
        triggerCharacter={"/"}
        getItems={async (query) =>
          filterSuggestionItems(customSlashMenuItems, query)
        }
      />
    </BlockNoteView>
  );
}
