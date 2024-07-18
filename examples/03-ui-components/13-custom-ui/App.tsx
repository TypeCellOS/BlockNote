import { filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  BlockNoteViewRaw,
  getDefaultReactSlashMenuItems,
  SideMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";
import { createTheme, ThemeProvider, useMediaQuery } from "@mui/material";
import { useMemo } from "react";

import { schema } from "./schema";
import { CustomMUIFormattingToolbar } from "./MUIFormattingToolbar";
import { CustomMUISideMenu } from "./MUISideMenu";
import { MUISuggestionMenu } from "./MUISuggestionMenu";

import "./style.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
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

  // Automatically sets light/dark mode based on the user's system preferences.
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
        },
      }),
    [prefersDarkMode]
  );

  // Renders the editor instance.
  return (
    // Provides theming for Material UI.
    <ThemeProvider theme={theme}>
      <BlockNoteViewRaw
        editor={editor}
        // Disables the UI components we'll be replacing.
        formattingToolbar={false}
        slashMenu={false}
        sideMenu={false}
        // Disables remaining UI elements.
        linkToolbar={false}
        filePanel={false}
        tableHandles={false}
        emojiPicker={false}>
        {/* Adds the custom Formatting Toolbar. */}
        {/* `FormattingToolbarController isn't used since we make the custom */}
        {/* toolbar static and always visible above the editor for this */}
        {/* example. */}
        <CustomMUIFormattingToolbar />
        {/* Adds the custom Side Menu and Slash Menu. */}
        {/* These use controllers since we want them to be positioned and */}
        {/* show/hide the same as the default ones. */}
        <SideMenuController sideMenu={CustomMUISideMenu} />
        <SuggestionMenuController
          triggerCharacter={"/"}
          // We use the default slash menu items but exclude the `Emoji` one as
          // we disabled the Emoji Picker.
          getItems={async (query) =>
            filterSuggestionItems(
              getDefaultReactSlashMenuItems(editor).filter(
                (item) => item.title !== "Emoji"
              ),
              query
            )
          }
          suggestionMenuComponent={MUISuggestionMenu}
          onItemClick={(i) => i.onItemClick()}
        />
      </BlockNoteViewRaw>
    </ThemeProvider>
  );
}
