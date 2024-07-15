import { filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  BlockNoteViewRaw,
  getDefaultReactSlashMenuItems,
  SideMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  createTheme,
  CssBaseline,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { useMemo } from "react";

import { MUIFormattingToolbar } from "./MUIFormattingToolbar";
import { CustomSideMenu } from "./CustomSideMenu";
import { MUISlashMenu } from "./MUISlashMenu";

import "./style.css";

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
    <BlockNoteViewRaw
      editor={editor}
      // Disables the UI components we want to replace.
      formattingToolbar={false}
      slashMenu={false}
      sideMenu={false}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Adds the custom Formatting Toolbar */}
        {/* `FormattingToolbarController isn't used since the custom toolbar is
      static and always visible above the editor. */}
        <MUIFormattingToolbar />
        {/* Adds the custom Side Menu and Slash Menu. */}
        {/* These use controllers since we want them to be positioned and
      show/hide the same as the default ones.*/}
        <SideMenuController sideMenu={CustomSideMenu} />
        <SuggestionMenuController
          triggerCharacter={"/"}
          getItems={async (query) =>
            filterSuggestionItems(getDefaultReactSlashMenuItems(editor), query)
          }
          suggestionMenuComponent={MUISlashMenu}
          onItemClick={(i) => i.onItemClick()}
        />
      </ThemeProvider>
    </BlockNoteViewRaw>
  );
}
