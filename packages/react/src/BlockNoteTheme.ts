import { CSSObject, MantineThemeOverride } from "@mantine/core";
import { blockStyles } from "@blocknote/core";

export type CombinedColor = {
  text: string;
  background: string;
};

export type ColorScheme = {
  editor: CombinedColor;
  menu: CombinedColor;
  tooltip: CombinedColor;
  hovered: CombinedColor;
  selected: CombinedColor;
  disabled: CombinedColor;
  shadow: string;
  border: string;
  sideMenu: string;
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
  type: "light" | "dark";
  colors: ColorScheme;
  borderRadius: number;
  fontFamily: string;
};

export type BlockNoteComponentStyles = Partial<{
  // Block Side Menu items, Formatting Toolbar buttons
  ActionIcon: CSSObject;
  // Slash Menu, Formatting Toolbar dropdown, color picker dropdown
  Menu: CSSObject;
  // Icon in the color picker dropdown (Formatting Toolbar & Drag Handle Menu)
  ColorIcon: CSSObject;
  DragHandleMenu: CSSObject;
  // Menu to edit hyperlinks (in Formatting Toolbar & Hyperlink Toolbar)
  EditHyperlinkMenu: CSSObject;
  Editor: CSSObject;
  // Wraps Formatting Toolbar & Hyperlink Toolbar
  Toolbar: CSSObject;
  // Appears on hover for Formatting Toolbar & Hyperlink Toolbar buttons
  Tooltip: CSSObject;
  SlashMenu: CSSObject;
  SideMenu: CSSObject;
}>;

export const blockNoteToMantineTheme = (
  theme: Theme,
  componentStyles?: BlockNoteComponentStyles
): MantineThemeOverride => {
  const editorText = theme.colors.editor.text;
  const editorBackground = theme.colors.editor.background;

  const menuText = theme.colors.menu.text;
  const menuBackground = theme.colors.menu.background;

  const tooltipText = theme.colors.tooltip.text;
  const tooltipBackground = theme.colors.tooltip.background;

  const hoveredText = theme.colors.hovered.text;
  const hoveredBackground = theme.colors.hovered.background;

  const selectedText = theme.colors.selected.text;
  const selectedBackground = theme.colors.selected.background;

  const disabledText = theme.colors.disabled.text;
  const disabledBackground = theme.colors.disabled.background;

  const shadow = `0 4px 12px ${theme.colors.shadow}`;

  const border = `1px solid ${theme.colors.border}`;

  const sideMenu = theme.colors.sideMenu;

  const editorBorderRadius = `${Math.max(theme.borderRadius + 2, 1)}px`;
  const outerBorderRadius = `${theme.borderRadius}px`;
  const innerBorderRadius = `${Math.max(theme.borderRadius - 2, 1)}px`;

  const fontFamily = theme.fontFamily;

  return {
    activeStyles: {
      // Removes button press effect.
      transform: "none",
    },
    colorScheme: theme.type,
    colors: {
      textColors: [
        theme.colors.editor.text,
        theme.colors.highlightColors.gray.text,
        theme.colors.highlightColors.brown.text,
        theme.colors.highlightColors.red.text,
        theme.colors.highlightColors.orange.text,
        theme.colors.highlightColors.yellow.text,
        theme.colors.highlightColors.green.text,
        theme.colors.highlightColors.blue.text,
        theme.colors.highlightColors.purple.text,
        theme.colors.highlightColors.pink.text,
      ],
      backgroundColors: [
        theme.colors.editor.background,
        theme.colors.highlightColors.gray.background,
        theme.colors.highlightColors.brown.background,
        theme.colors.highlightColors.red.background,
        theme.colors.highlightColors.orange.background,
        theme.colors.highlightColors.yellow.background,
        theme.colors.highlightColors.green.background,
        theme.colors.highlightColors.blue.background,
        theme.colors.highlightColors.purple.background,
        theme.colors.highlightColors.pink.background,
      ],
    },
    components: {
      // Block Side Menu items
      ActionIcon: {
        styles: () => ({
          root: {
            color: sideMenu,
            ...componentStyles?.ActionIcon,
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
              borderRadius: innerBorderRadius,
              color: menuText,
            },
            ".mantine-Menu-item[data-hovered]": {
              backgroundColor: hoveredBackground,
              border: "none",
              color: hoveredText,
            },
            ...componentStyles?.Menu,
          },
        }),
      },
      ColorIcon: {
        styles: () => ({
          root: {
            border: border,
            borderRadius: innerBorderRadius,
            ...componentStyles?.ColorIcon,
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
            ...componentStyles?.DragHandleMenu,
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
            ...componentStyles?.EditHyperlinkMenu,
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
            // Placeholders
            [`.${blockStyles.isEmpty} .${blockStyles.inlineContent}:before, .${blockStyles.isFilter} .${blockStyles.inlineContent}:before`]:
              {
                color: theme.colors.sideMenu,
              },
            ...componentStyles?.Editor,
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
            ...componentStyles?.Toolbar,
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
            ...componentStyles?.Tooltip,
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
            ...componentStyles?.SlashMenu,
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
            ...componentStyles?.SideMenu,
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
