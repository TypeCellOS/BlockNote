import {
  BlockNoteView,
  darkDefaultTheme,
  lightDefaultTheme,
  Theme,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

// Base theme
const lightRedTheme = {
  colors: {
    editor: {
      text: "#222222",
      background: "#ffffff",
    },
    menu: {
      text: "#ffffff",
      background: "#9b0000",
    },
    tooltip: {
      text: "#ffffff",
      background: "#b00000",
    },
    hovered: {
      text: "#ffffff",
      background: "#b00000",
    },
    selected: {
      text: "#ffffff",
      background: "#c50000",
    },
    disabled: {
      text: "#9b0000",
      background: "#7d0000",
    },
    shadow: "#640000",
    border: "#870000",
    sideMenu: "#bababa",
    highlights: lightDefaultTheme.colors!.highlights,
  },
  borderRadius: 4,
  fontFamily: "Helvetica Neue, sans-serif",
} satisfies Theme;

// Changes for dark mode
const darkRedTheme = {
  ...lightRedTheme,
  colors: {
    ...lightRedTheme.colors,
    editor: {
      text: "#ffffff",
      background: "#9b0000",
    },
    sideMenu: "#ffffff",
    highlights: darkDefaultTheme.colors!.highlights,
  },
} satisfies Theme;

const redTheme = {
  light: lightRedTheme,
  dark: darkRedTheme,
};

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      // Sets the red theme
      theme={redTheme}
    />
  );
}
