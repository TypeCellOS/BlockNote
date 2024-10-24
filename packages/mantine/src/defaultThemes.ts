import { COLORS_DARK_MODE_DEFAULT, COLORS_DEFAULT } from "@blocknote/core";
import { Theme } from "./BlockNoteTheme.js";

export const defaultColorScheme = [
  "#FFFFFF",
  "#EFEFEF",
  "#CFCFCF",
  "#AFAFAF",
  "#7F7F7F",
  "#3F3F3F",
  "#1F1F1F",
  "#161616",
  "#0F0F0F",
  "#000000",
];

export const lightDefaultTheme = {
  colors: {
    editor: {
      text: defaultColorScheme[5],
      background: defaultColorScheme[0],
    },
    menu: {
      text: defaultColorScheme[5],
      background: defaultColorScheme[0],
    },
    tooltip: {
      text: defaultColorScheme[5],
      background: defaultColorScheme[1],
    },
    hovered: {
      text: defaultColorScheme[5],
      background: defaultColorScheme[1],
    },
    selected: {
      text: defaultColorScheme[0],
      background: defaultColorScheme[5],
    },
    disabled: {
      text: defaultColorScheme[3],
      background: defaultColorScheme[1],
    },
    shadow: defaultColorScheme[2],
    border: defaultColorScheme[1],
    sideMenu: defaultColorScheme[2],
    highlights: COLORS_DEFAULT,
  },
  borderRadius: 6,
  fontFamily:
    '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Open Sans", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
} satisfies Theme;

export const darkDefaultTheme = {
  colors: {
    editor: {
      text: defaultColorScheme[2],
      background: defaultColorScheme[6],
    },
    menu: {
      text: defaultColorScheme[2],
      background: defaultColorScheme[6],
    },
    tooltip: {
      text: defaultColorScheme[2],
      background: defaultColorScheme[7],
    },
    hovered: {
      text: defaultColorScheme[2],
      background: defaultColorScheme[7],
    },
    selected: {
      text: defaultColorScheme[2],
      background: defaultColorScheme[8],
    },
    disabled: {
      text: defaultColorScheme[5],
      background: defaultColorScheme[7],
    },
    shadow: defaultColorScheme[8],
    border: defaultColorScheme[7],
    sideMenu: defaultColorScheme[4],
    highlights: COLORS_DARK_MODE_DEFAULT,
  },
  borderRadius: lightDefaultTheme.borderRadius,
  fontFamily: lightDefaultTheme.fontFamily,
} satisfies Theme;
