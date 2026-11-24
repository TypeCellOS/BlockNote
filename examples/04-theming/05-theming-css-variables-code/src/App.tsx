import "@blocknote/core/fonts/inter.css";
import {
  BlockNoteView,
  darkDefaultTheme,
  lightDefaultTheme,
  Theme,
} from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

// Base theme
const redThemeVariables = {
  textColor: {
    primary: "#222222",
    menu: "#ffffff",
    tooltip: "#ffffff",
    hovered: "#ffffff",
    selected: "#ffffff",
    disabled: "#9b0000",
    muted: "#bababa",
  },
  backgroundColor: {
    editor: "#ffeeee",
    menu: "#9b0000",
    tooltip: "#b00000",
    hovered: "#b00000",
    selected: "#c50000",
    disabled: "#7d0000",
  },
  shadow: { default: "0 4px 12px #640000", subtle: "0 2px 6px #870000" },
  border: { color: "#870000", colorStrong: "#bababa" },
  focusRing: { color: "#bababa" },
  radius: { small: "2px", medium: "4px", large: "6px" },
  fontFamily: { default: "Helvetica Neue, sans-serif" },
};

const lightRedTheme = {
  ...lightDefaultTheme,
  ...redThemeVariables,
  textColor: {
    ...lightDefaultTheme.textColor,
    ...redThemeVariables.textColor,
  },
  backgroundColor: {
    ...lightDefaultTheme.backgroundColor,
    ...redThemeVariables.backgroundColor,
  },
} satisfies Theme;

const darkRedTheme = {
  ...darkDefaultTheme,
  ...redThemeVariables,
  textColor: {
    ...darkDefaultTheme.textColor,
    ...redThemeVariables.textColor,
    primary: "#ffffff",
    muted: "#ffffff",
  },
  backgroundColor: {
    ...darkDefaultTheme.backgroundColor,
    ...redThemeVariables.backgroundColor,
    editor: "#9b0000",
  },
  border: { ...redThemeVariables.border, colorStrong: "#ffffff" },
  focusRing: { color: "#ffffff" },
} satisfies Theme;

// The combined "red theme",
// we pass this to BlockNoteView and then the editor will automatically
// switch between lightRedTheme / darkRedTheme based on the system theme
const redTheme = {
  light: lightRedTheme,
  dark: darkRedTheme,
};

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
        content: "Open up a menu or toolbar to see more of the red theme",
      },
      {
        type: "paragraph",
        content:
          "Toggle light/dark mode in the page footer and see the theme change too",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} theme={redTheme} />;
}
