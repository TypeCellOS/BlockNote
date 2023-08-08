import { MantineThemeOverride } from "@mantine/core";
import { defaultTheme } from "./defaultTheme";

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
  highlightColors: {
    gray: CombinedColor;
    brown: CombinedColor;
    red: CombinedColor;
    orange: CombinedColor;
    yellow: CombinedColor;
    green: CombinedColor;
    blue: CombinedColor;
    purple: CombinedColor;
    pink: CombinedColor;
  };
};

export type Theme = {
  colors: ColorScheme;
  borderRadius: number;
  fontFamily: string;
};

export const blockNoteToMantineTheme = (
  useDarkTheme: boolean = false,
  theme: Partial<Theme> = defaultTheme
): MantineThemeOverride => {
  const fullTheme: Theme = { ...defaultTheme, ...theme };

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
      textColors: [
        useDarkTheme
          ? fullTheme.colors.editor.text.dark
          : fullTheme.colors.editor.text.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.gray.text.dark
          : fullTheme.colors.highlightColors.gray.text.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.brown.text.dark
          : fullTheme.colors.highlightColors.brown.text.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.red.text.dark
          : fullTheme.colors.highlightColors.red.text.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.orange.text.dark
          : fullTheme.colors.highlightColors.orange.text.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.yellow.text.dark
          : fullTheme.colors.highlightColors.yellow.text.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.green.text.dark
          : fullTheme.colors.highlightColors.green.text.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.blue.text.dark
          : fullTheme.colors.highlightColors.blue.text.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.purple.text.dark
          : fullTheme.colors.highlightColors.purple.text.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.pink.text.dark
          : fullTheme.colors.highlightColors.pink.text.light,
      ],
      backgroundColors: [
        useDarkTheme
          ? fullTheme.colors.editor.background.dark
          : fullTheme.colors.editor.background.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.gray.background.dark
          : fullTheme.colors.highlightColors.gray.background.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.brown.background.dark
          : fullTheme.colors.highlightColors.brown.background.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.red.background.dark
          : fullTheme.colors.highlightColors.red.background.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.orange.background.dark
          : fullTheme.colors.highlightColors.orange.background.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.yellow.background.dark
          : fullTheme.colors.highlightColors.yellow.background.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.green.background.dark
          : fullTheme.colors.highlightColors.green.background.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.blue.background.dark
          : fullTheme.colors.highlightColors.blue.background.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.purple.background.dark
          : fullTheme.colors.highlightColors.purple.background.light,
        useDarkTheme
          ? fullTheme.colors.highlightColors.pink.background.dark
          : fullTheme.colors.highlightColors.pink.background.light,
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
      ColorIcon: {
        styles: () => ({
          root: {
            border: border,
            borderRadius: innerBorderRadius,
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
      highlightColorNames: [
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
  };
};
