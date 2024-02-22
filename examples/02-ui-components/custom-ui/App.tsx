import { filterSuggestionItems } from "@blocknote/core";
import {
  BlockNoteView,
  getDefaultReactSlashMenuItems,
  SideMenuController,
  SuggestionMenuController,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomFormattingToolbar } from "./CustomFormattingToolbar";
import { CustomSideMenu } from "./CustomSideMenu";
import { CustomSlashMenu } from "./CustomSlashMenu";
import "./styles.css";

export default function App() {
  const editor = useBlockNote();

  return (
    <BlockNoteView
      editor={editor}
      formattingToolbar={false}
      slashMenu={false}
      sideMenu={false}>
      <CustomFormattingToolbar />
      <SideMenuController sideMenu={CustomSideMenu} />
      {/* TODO: Shorthand for async function (array with built in filtering) */}
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) =>
          filterSuggestionItems(getDefaultReactSlashMenuItems(editor), query)
        }
        suggestionMenuComponent={CustomSlashMenu}
        onItemClick={(i) => i.onItemClick()}
      />
    </BlockNoteView>
  );
}
