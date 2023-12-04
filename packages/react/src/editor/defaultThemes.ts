import { Theme } from "./BlockNoteTheme";

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

export const lightDefaultTheme: Theme = {
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
    highlightColors: {
      gray: {
        text: "#9b9a97",
        background: "#ebeced",
      },
      brown: {
        text: "#64473a",
        background: "#e9e5e3",
      },
      red: {
        text: "#e03e3e",
        background: "#fbe4e4",
      },
      orange: {
        text: "#d9730d",
        background: "#f6e9d9",
      },
      yellow: {
        text: "#dfab01",
        background: "#fbf3db",
      },
      green: {
        text: "#4d6461",
        background: "#ddedea",
      },
      blue: {
        text: "#0b6e99",
        background: "#ddebf1",
      },
      purple: {
        text: "#6940a5",
        background: "#eae4f2",
      },
      pink: {
        text: "#ad1a72",
        background: "#f4dfeb",
      },
    },
  },
  borderRadius: 6,
  fontFamily:
    '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Open Sans", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};

export const darkDefaultTheme: Theme = {
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
    highlightColors: {
      gray: {
        text: "#bebdb8",
        background: "#9b9a97",
      },
      brown: {
        text: "#8e6552",
        background: "#64473a",
      },
      red: {
        text: "#ec4040",
        background: "#be3434",
      },
      orange: {
        text: "#e3790d",
        background: "#b7600a",
      },
      yellow: {
        text: "#dfab01",
        background: "#b58b00",
      },
      green: {
        text: "#6b8b87",
        background: "#4d6461",
      },
      blue: {
        text: "#0e87bc",
        background: "#0b6e99",
      },
      purple: {
        text: "#8552d7",
        background: "#6940a5",
      },
      pink: {
        text: "#da208f",
        background: "#ad1a72",
      },
    },
  },
  borderRadius: lightDefaultTheme.borderRadius,
  fontFamily: lightDefaultTheme.fontFamily,
};
