import { filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  BlockNoteView,
  getDefaultReactSlashMenuItems,
  SideMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomFormattingToolbar } from "./CustomFormattingToolbar";
import { CustomSideMenu } from "./CustomSideMenu";
import { CustomSlashMenu } from "./CustomSlashMenu";
import "./styles.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView
      editor={editor}
      // Disables the UI components we want to replace.
      formattingToolbar={false}
      slashMenu={false}
      sideMenu={false}>
      {/* Adds the custom Formatting Toolbar */}
      {/* `FormattingToolbarController isn't used since the custom toolbar is
      static and always visible above the editor. */}
      <CustomFormattingToolbar />
      {/* Adds the custom Side Menu and Slash Menu. */}
      {/* These use controllers since we want them to be positioned and
      show/hide the same as the default ones.*/}
      <SideMenuController sideMenu={CustomSideMenu} />
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
