import { MantineThemeOverride } from "@mantine/core";

export type Color = {
  light: string;
  dark: string;
};

export type CombinedColor = {
  text: Color;
  background: Color;
};

export type ColorScheme = {
  editor: CombinedColor;
  menu: CombinedColor;
  tooltip: CombinedColor;
  hovered: CombinedColor;
  selected: CombinedColor;
  disabled: CombinedColor;
  shadow: Color;
  border: Color;
  sideMenu: Color;
};

export type Theme = {
  colors: ColorScheme;
  borderRadius: number;
  fontFamily: string;
};

export const blockNoteColorScheme = [
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

export const blockNoteTheme: Theme = {
  colors: {
    editor: {
      text: {
        light: blockNoteColorScheme[5],
        dark: blockNoteColorScheme[2],
      },
      background: {
        light: blockNoteColorScheme[0],
        dark: blockNoteColorScheme[6],
      },
    },
    menu: {
      text: {
        light: blockNoteColorScheme[5],
        dark: blockNoteColorScheme[2],
      },
      background: {
        light: blockNoteColorScheme[0],
        dark: blockNoteColorScheme[6],
      },
    },
    tooltip: {
      text: {
        light: blockNoteColorScheme[4],
        dark: blockNoteColorScheme[4],
      },
      background: {
        light: blockNoteColorScheme[1],
        dark: blockNoteColorScheme[7],
      },
    },
    hovered: {
      text: {
        light: blockNoteColorScheme[5],
        dark: blockNoteColorScheme[2],
      },
      background: {
        light: blockNoteColorScheme[1],
        dark: blockNoteColorScheme[7],
      },
    },
    selected: {
      text: {
        light: blockNoteColorScheme[0],
        dark: blockNoteColorScheme[2],
      },
      background: {
        light: blockNoteColorScheme[5],
        dark: blockNoteColorScheme[8],
      },
    },
    disabled: {
      text: {
        light: blockNoteColorScheme[3],
        dark: blockNoteColorScheme[5],
      },
      background: {
        light: blockNoteColorScheme[1],
        dark: blockNoteColorScheme[7],
      },
    },
    shadow: {
      light: blockNoteColorScheme[2],
      dark: blockNoteColorScheme[8],
    },
    border: {
      light: blockNoteColorScheme[1],
      dark: blockNoteColorScheme[7],
    },
    sideMenu: {
      light: blockNoteColorScheme[2],
      dark: blockNoteColorScheme[4],
    },
  },
  borderRadius: 6,
  fontFamily:
    '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Open Sans", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};

const custom: Partial<Theme> = {
  colors: {
    editor: {
      text: {
        light: "#222222",
        dark: "#ffffff",
      },
      background: {
        light: "#ffffff",
        dark: "#9b0000",
      },
    },
    menu: {
      text: {
        light: "#ffffff",
        dark: "#ffffff",
      },
      background: {
        light: "#9b0000",
        dark: "#9b0000",
      },
    },
    tooltip: {
      text: {
        light: "#ffffff",
        dark: "#ffffff",
      },
      background: {
        light: "#b00000",
        dark: "#b00000",
      },
    },
    hovered: {
      text: {
        light: "#ffffff",
        dark: "#ffffff",
      },
      background: {
        light: "#b00000",
        dark: "#b00000",
      },
    },
    selected: {
      text: {
        light: "#ffffff",
        dark: "#ffffff",
      },
      background: {
        light: "#c50000",
        dark: "#c50000",
      },
    },
    disabled: {
      text: {
        light: "#9b0000",
        dark: "#9b0000",
      },
      background: {
        light: "#7d0000",
        dark: "#7d0000",
      },
    },
    shadow: {
      light: "#640000",
      dark: "#640000",
    },
    border: {
      light: "#920000",
      dark: "#920000",
    },
    sideMenu: {
      light: "#bababa",
      dark: "#ffffff",
    },
  },
  borderRadius: 4,
  fontFamily: "Helvetica Neue, sans-serif",
};

export const getBlockNoteTheme = (
  useDarkTheme: boolean = false,
  theme: Partial<Theme> = custom
): MantineThemeOverride => {
  const fullTheme: Theme = { ...blockNoteTheme, ...theme };

  const editorText = useDarkTheme
    ? fullTheme.colors.editor.text.dark
    : fullTheme.colors.editor.text.light;
  const editorBackground = useDarkTheme
    ? fullTheme.colors.editor.background.dark
    : fullTheme.colors.editor.background.light;

  const menuText = useDarkTheme
    ? fullTheme.colors.menu.text.dark
    : fullTheme.colors.menu.text.light;
  const menuBackground = useDarkTheme
    ? fullTheme.colors.menu.background.dark
    : fullTheme.colors.menu.background.light;

  const tooltipText = useDarkTheme
    ? fullTheme.colors.tooltip.text.dark
    : fullTheme.colors.tooltip.text.light;
  const tooltipBackground = useDarkTheme
    ? fullTheme.colors.tooltip.background.dark
    : fullTheme.colors.tooltip.background.light;

  const hoveredText = useDarkTheme
    ? fullTheme.colors.hovered.text.dark
    : fullTheme.colors.hovered.text.light;
  const hoveredBackground = useDarkTheme
    ? fullTheme.colors.hovered.background.dark
    : fullTheme.colors.hovered.background.light;

  const selectedText = useDarkTheme
    ? fullTheme.colors.selected.text.dark
    : fullTheme.colors.selected.text.light;
  const selectedBackground = useDarkTheme
    ? fullTheme.colors.selected.background.dark
    : fullTheme.colors.selected.background.light;

  const disabledText = useDarkTheme
    ? fullTheme.colors.disabled.text.dark
    : fullTheme.colors.disabled.text.light;
  const disabledBackground = useDarkTheme
    ? fullTheme.colors.disabled.background.dark
    : fullTheme.colors.disabled.background.light;

  const shadow = `0 4px 12px ${
    useDarkTheme ? fullTheme.colors.shadow.dark : fullTheme.colors.shadow.light
  }`;

  const border = `1px solid ${
    useDarkTheme ? fullTheme.colors.border.dark : fullTheme.colors.border.light
  }`;

  const sideMenu = useDarkTheme
    ? fullTheme.colors.sideMenu.dark
    : fullTheme.colors.sideMenu.light;

  const editorBorderRadius = `${Math.max(fullTheme.borderRadius + 2, 1)}px`;
  const outerBorderRadius = `${fullTheme.borderRadius}px`;
  const innerBorderRadius = `${Math.max(fullTheme.borderRadius - 2, 1)}px`;

  const fontFamily = fullTheme.fontFamily;

  return {
    activeStyles: {
      // Removes button press effect.
      transform: "none",
    },
    colorScheme: useDarkTheme ? "dark" : "light",
    colors: {
      scheme: blockNoteColorScheme,
      dark: blockNoteColorScheme,
      textColors: [
        // primaryText,
        blockNoteColorScheme[6],
        "#9b9a97",
        "#64473a",
        "#e03e3e",
        "#d9730d",
        "#dfab01",
        "#4d6461",
        "#0b6e99",
        "#6940a5",
        "#ad1a72",
      ],
      backgroundColors: [
        // primaryBackground,
        blockNoteColorScheme[0],
        "#ebeced",
        "#e9e5e3",
        "#fbe4e4",
        "#f6e9d9",
        "#fbf3db",
        "#ddedea",
        "#ddebf1",
        "#eae4f2",
        "#f4dfeb",
      ],
    },
    components: {
      // Block Side Menu items
      ActionIcon: {
        styles: () => ({
          root: {
            color: sideMenu,
          },
        }),
      },
      // Slash Menu, Formatting Toolbar dropdown, color picker dropdown
      Menu: {
        styles: () => ({
          dropdown: {
            backgroundColor: menuBackground,
            border: border,
            borderRadius: outerBorderRadius,
            boxShadow: shadow,
            color: menuText,
            padding: "2px",
            ".mantine-Menu-label": {
              backgroundColor: menuBackground,
              color: menuText,
            },
            ".mantine-Menu-item": {
              backgroundColor: menuBackground,
              border: "none",
              color: menuText,
            },
            ".mantine-Menu-item[data-hovered]": {
              backgroundColor: hoveredBackground,
              border: "none",
              color: hoveredText,
            },
          },
        }),
      },
      DragHandleMenu: {
        styles: () => ({
          root: {
            ".mantine-Menu-item": {
              fontSize: "12px",
              height: "30px",
            },
          },
        }),
      },
      EditHyperlinkMenu: {
        styles: () => ({
          root: {
            backgroundColor: menuBackground,
            border: border,
            borderRadius: outerBorderRadius,
            boxShadow: shadow,
            color: menuText,
            gap: "4px",
            minWidth: "145px",
            padding: "2px",
            // Row
            ".mantine-Group-root": {
              flexWrap: "nowrap",
              gap: "8px",
              paddingInline: "6px",
              // Row icon
              ".mantine-Container-root": {
                color: menuText,
                display: "flex",
                justifyContent: "center",
                padding: 0,
                width: "fit-content",
              },
              // Row input field
              ".mantine-TextInput-root": {
                width: "300px",
                ".mantine-TextInput-wrapper": {
                  ".mantine-TextInput-input": {
                    border: "none",
                    color: menuText,
                    fontSize: "12px",
                    padding: 0,
                  },
                },
              },
            },
          },
        }),
      },
      Editor: {
        styles: () => ({
          root: {
            ".ProseMirror": {
              backgroundColor: editorBackground,
              borderRadius: editorBorderRadius,
              color: editorText,
              fontFamily: fontFamily,
            },
          },
        }),
      },
      Toolbar: {
        styles: () => ({
          root: {
            backgroundColor: menuBackground,
            boxShadow: shadow,
            border: border,
            borderRadius: outerBorderRadius,
            flexWrap: "nowrap",
            gap: "2px",
            padding: "2px",
            width: "fit-content",
            // Button (including dropdown target)
            ".mantine-UnstyledButton-root": {
              backgroundColor: menuBackground,
              border: "none",
              borderRadius: innerBorderRadius,
              color: menuText,
            },
            // Hovered button
            ".mantine-UnstyledButton-root:hover": {
              backgroundColor: hoveredBackground,
              border: "none",
              color: hoveredText,
            },
            // Selected button
            ".mantine-UnstyledButton-root[data-selected]": {
              backgroundColor: selectedBackground,
              border: "none",
              color: selectedText,
            },
            // Disabled button
            ".mantine-UnstyledButton-root[data-disabled]": {
              backgroundColor: disabledBackground,
              border: "none",
              color: disabledText,
            },
            // Dropdown
            ".mantine-Menu-dropdown": {
              // Dropdown item
              ".mantine-Menu-item": {
                fontSize: "12px",
                height: "30px",
                ".mantine-Menu-itemRightSection": {
                  paddingLeft: "5px",
                },
              },
              ".mantine-Menu-item:hover": {
                backgroundColor: hoveredBackground,
              },
            },
          },
        }),
      },
      Tooltip: {
        styles: () => ({
          root: {
            backgroundColor: tooltipBackground,
            border: border,
            borderRadius: outerBorderRadius,
            boxShadow: shadow,
            color: tooltipText,
            padding: "4px 10px",
            textAlign: "center",
            "div ~ div": {
              color: tooltipText,
            },
          },
        }),
      },
      SlashMenu: {
        styles: () => ({
          root: {
            position: "relative",
            ".mantine-Menu-item": {
              // Icon
              ".mantine-Menu-itemIcon": {
                backgroundColor: tooltipBackground,
                borderRadius: innerBorderRadius,
                color: tooltipText,
                padding: "8px",
              },
              // Text
              ".mantine-Menu-itemLabel": {
                paddingRight: "16px",
                ".mantine-Stack-root": {
                  gap: "0",
                },
              },
              // Badge (keyboard shortcut)
              ".mantine-Menu-itemRightSection": {
                ".mantine-Badge-root": {
                  backgroundColor: tooltipBackground,
                  color: tooltipText,
                },
              },
            },
          },
        }),
      },
      SideMenu: {
        styles: () => ({
          root: {
            backgroundColor: "transparent",
            ".mantine-ActionIcon-root": {
              color: sideMenu,
            },
          },
        }),
      },
    },
    fontFamily: fontFamily,
    other: {
      colors: [
        "default",
        "gray",
        "brown",
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
        "purple",
        "pink",
      ],
    },
    primaryColor: "scheme",
  };
};
