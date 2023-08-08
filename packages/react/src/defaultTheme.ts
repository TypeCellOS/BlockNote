import { Theme } from "./index";

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

export const defaultTheme: Theme = {
  colors: {
    editor: {
      text: {
        light: defaultColorScheme[5],
        dark: defaultColorScheme[2],
      },
      background: {
        light: defaultColorScheme[0],
        dark: defaultColorScheme[6],
      },
    },
    menu: {
      text: {
        light: defaultColorScheme[5],
        dark: defaultColorScheme[2],
      },
      background: {
        light: defaultColorScheme[0],
        dark: defaultColorScheme[6],
      },
    },
    tooltip: {
      text: {
        light: defaultColorScheme[5],
        dark: defaultColorScheme[2],
      },
      background: {
        light: defaultColorScheme[1],
        dark: defaultColorScheme[7],
      },
    },
    hovered: {
      text: {
        light: defaultColorScheme[5],
        dark: defaultColorScheme[2],
      },
      background: {
        light: defaultColorScheme[1],
        dark: defaultColorScheme[7],
      },
    },
    selected: {
      text: {
        light: defaultColorScheme[0],
        dark: defaultColorScheme[2],
      },
      background: {
        light: defaultColorScheme[5],
        dark: defaultColorScheme[8],
      },
    },
    disabled: {
      text: {
        light: defaultColorScheme[3],
        dark: defaultColorScheme[5],
      },
      background: {
        light: defaultColorScheme[1],
        dark: defaultColorScheme[7],
      },
    },
    shadow: {
      light: defaultColorScheme[2],
      dark: defaultColorScheme[8],
    },
    border: {
      light: defaultColorScheme[1],
      dark: defaultColorScheme[7],
    },
    sideMenu: {
      light: defaultColorScheme[2],
      dark: defaultColorScheme[4],
    },
    // TODO: Fix dark mode colors
    highlightColors: {
      gray: {
        text: {
          light: "#9b9a97",
          dark: "#9b9a97",
        },
        background: {
          light: "#ebeced",
          dark: "#ebeced",
        },
      },
      brown: {
        text: {
          light: "#64473a",
          dark: "#64473a",
        },
        background: {
          light: "#e9e5e3",
          dark: "#e9e5e3",
        },
      },
      red: {
        text: {
          light: "#e03e3e",
          dark: "#e03e3e",
        },
        background: {
          light: "#fbe4e4",
          dark: "#fbe4e4",
        },
      },
      orange: {
        text: {
          light: "#d9730d",
          dark: "#d9730d",
        },
        background: {
          light: "#f6e9d9",
          dark: "#f6e9d9",
        },
      },
      yellow: {
        text: {
          light: "#dfab01",
          dark: "#dfab01",
        },
        background: {
          light: "#fbf3db",
          dark: "#fbf3db",
        },
      },
      green: {
        text: {
          light: "#4d6461",
          dark: "#4d6461",
        },
        background: {
          light: "#ddedea",
          dark: "#ddedea",
        },
      },
      blue: {
        text: {
          light: "#0b6e99",
          dark: "#0b6e99",
        },
        background: {
          light: "#ddebf1",
          dark: "#ddebf1",
        },
      },
      purple: {
        text: {
          light: "#6940a5",
          dark: "#6940a5",
        },
        background: {
          light: "#eae4f2",
          dark: "#eae4f2",
        },
      },
      pink: {
        text: {
          light: "#ad1a72",
          dark: "#ad1a72",
        },
        background: {
          light: "#f4dfeb",
          dark: "#f4dfeb",
        },
      },
    },
  },
  borderRadius: 6,
  fontFamily:
    '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Open Sans", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};
