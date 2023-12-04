import { CSSObject, MantineThemeOverride } from "@mantine/core";
import merge from "lodash.merge";

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

export type ComponentStyles = Partial<{
  // Slash Menu, Formatting Toolbar dropdown, color picker dropdown
  Menu: CSSObject;
  // Icon in the color picker dropdown (Formatting Toolbar & Drag Handle Menu)
  ColorIcon: CSSObject;
  DragHandleMenu: CSSObject;
  // Menu to edit hyperlinks (in Formatting Toolbar & Hyperlink Toolbar)
  EditHyperlinkMenu: CSSObject;
  Editor: CSSObject;
  // Used in the Image Toolbar
  FileInput: CSSObject;
  // Handle that appears next to tables and the menu that opens when clicking it
  TableHandle: CSSObject;
  TableHandleMenu: CSSObject;
  // Used in the Image Toolbar
  Tabs: CSSObject;
  TextInput: CSSObject;
  // Wraps Formatting Toolbar & Hyperlink Toolbar
  Toolbar: CSSObject;
  // Appears on hover for Formatting Toolbar
  // & Hyperlink Toolbar buttons
  Tooltip: CSSObject;
  SlashMenu: CSSObject;
  SideMenu: CSSObject;
}>;

export type Theme = {
  colors: ColorScheme;
  borderRadius: number;
  fontFamily: string;
  componentStyles?: (theme: Theme) => ComponentStyles;
};

export const blockNoteToMantineTheme = (theme: Theme): MantineThemeOverride => {
  const shadow = `0 4px 12px ${theme.colors.shadow}`;
  const lightShadow = `0 2px 6px ${theme.colors.border}`;
  const border = `1px solid ${theme.colors.border}`;

  const textColors = {
    default: theme.colors.editor.text,
    gray: theme.colors.highlightColors.gray.text,
    brown: theme.colors.highlightColors.brown.text,
    red: theme.colors.highlightColors.red.text,
    orange: theme.colors.highlightColors.orange.text,
    yellow: theme.colors.highlightColors.yellow.text,
    green: theme.colors.highlightColors.green.text,
    blue: theme.colors.highlightColors.blue.text,
    purple: theme.colors.highlightColors.purple.text,
    pink: theme.colors.highlightColors.pink.text,
  };

  const backgroundColors = {
    default: theme.colors.editor.background,
    gray: theme.colors.highlightColors.gray.background,
    brown: theme.colors.highlightColors.brown.background,
    red: theme.colors.highlightColors.red.background,
    orange: theme.colors.highlightColors.orange.background,
    yellow: theme.colors.highlightColors.yellow.background,
    green: theme.colors.highlightColors.green.background,
    blue: theme.colors.highlightColors.blue.background,
    purple: theme.colors.highlightColors.purple.background,
    pink: theme.colors.highlightColors.pink.background,
  };

  const editorBorderRadius = `${Math.max(theme.borderRadius + 2, 1)}px`;
  const outerBorderRadius = `${theme.borderRadius}px`;
  const innerBorderRadius = `${Math.max(theme.borderRadius - 2, 1)}px`;

  return {
    activeStyles: {
      // Removes button press effect.
      transform: "none",
    },
    components: {
      // Slash Menu, Formatting Toolbar dropdown, color picker dropdown
      Menu: {
        styles: () => ({
          dropdown: merge<CSSObject, CSSObject>(
            {
              backgroundColor: theme.colors.menu.background,
              border: border,
              borderRadius: outerBorderRadius,
              boxShadow: shadow,
              color: theme.colors.menu.text,
              padding: "2px",
              overflowY: "scroll",
              ".mantine-Menu-label": {
                backgroundColor: theme.colors.menu.background,
                color: theme.colors.menu.text,
              },
              ".mantine-Menu-item": {
                backgroundColor: theme.colors.menu.background,
                border: "none",
                borderRadius: innerBorderRadius,
                color: theme.colors.menu.text,
              },
              ".mantine-Menu-item[data-hovered]": {
                backgroundColor: theme.colors.hovered.background,
                border: "none",
                color: theme.colors.hovered.text,
              },
            },
            theme.componentStyles?.(theme).Menu || {}
          ),
        }),
      },
      TableHandle: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.menu.background,
              border: border,
              borderRadius: innerBorderRadius,
              boxShadow: lightShadow,
              color: theme.colors.sideMenu,
              ":hover, div.bn-table-handle-dragging": {
                backgroundColor: theme.colors.hovered.background,
              },
              cursor: "pointer",
            },
            theme.componentStyles?.(theme).TableHandle || {}
          ),
        }),
      },
      TableHandleMenu: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              ".mantine-Menu-item": {
                fontSize: "12px",
                height: "30px",
              },
            },
            theme.componentStyles?.(theme).TableHandleMenu || {}
          ),
        }),
      },
      Tabs: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              width: "100%",
              backgroundColor: theme.colors.menu.background,
            },
            theme.componentStyles?.(theme).Tabs || {}
          ),
          tabsList: {
            borderColor: theme.colors.hovered.background,
          },
          tab: {
            color: theme.colors.menu.text,
            borderColor: theme.colors.hovered.background,
            "&:hover": {
              color: theme.colors.hovered.text,
              backgroundColor: theme.colors.hovered.background,
              borderColor: theme.colors.hovered.background,
            },
            "&[data-active], &[data-active]&:hover": {
              color: theme.colors.menu.text,
              borderColor: theme.colors.menu.text,
            },
          },
          panel: {
            padding: "8px",
            ".mantine-UnstyledButton-root": {
              width: "60%",
              border: `solid ${theme.colors.border} 1px`,
              borderRadius: "4px",
              height: "32px",
            },
            ".mantine-UnstyledButton-root:hover": {
              color: theme.colors.hovered.text,
              backgroundColor: theme.colors.hovered.background,
            },
          },
        }),
      },
      FileInput: {
        styles: () => ({
          root: theme.componentStyles?.(theme).FileInput || {},
          input: {
            color: theme.colors.menu.text,
            backgroundColor: theme.colors.menu.background,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: theme.colors.hovered.background,
            },
          },
          wrapper: {
            border: `solid ${theme.colors.border} 1px`,
            borderRadius: "4px",
          },
          placeholder: {
            color: `${theme.colors.menu.text} !important`,
            fontWeight: 600,
          },
        }),
      },
      TextInput: {
        styles: () => ({
          root: theme.componentStyles?.(theme).TextInput || {},
          input: {
            color: theme.colors.menu.text,
            backgroundColor: theme.colors.menu.background,
            border: `solid ${theme.colors.border} 1px`,
            borderRadius: "4px",
            height: "32px",
          },
        }),
      },
      ColorIcon: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              border: border,
              borderRadius: innerBorderRadius,
            },
            theme.componentStyles?.(theme).ColorIcon || {}
          ),
        }),
      },
      DragHandleMenu: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              ".mantine-Menu-item": {
                fontSize: "12px",
                height: "30px",
              },
            },
            theme.componentStyles?.(theme).DragHandleMenu || {}
          ),
        }),
      },
      Editor: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              ".ProseMirror": {
                backgroundColor: theme.colors.editor.background,
                borderRadius: editorBorderRadius,
                color: theme.colors.editor.text,
                fontFamily: theme.fontFamily,
              },
              // Placeholders
              ".bn-is-empty .bn-inline-content:before, .bn-is-filter .bn-inline-content:before":
                {
                  color: theme.colors.sideMenu,
                },
              // Indent lines
              ".bn-block-group": {
                ".bn-block-group": {
                  ".bn-block-outer:not([data-prev-depth-changed])::before": {
                    borderLeft: `1px solid ${theme.colors.sideMenu}`,
                  },
                },
              },
              // Highlight text colors
              ...(Object.fromEntries(
                Object.entries(textColors).map(([key, value]) => [
                  `[data-text-color="${key}"]`,
                  { color: value },
                ])
              ) as CSSObject),
              // Highlight background colors
              ...(Object.fromEntries(
                Object.entries(backgroundColors).map(([key, value]) => [
                  `[data-background-color="${key}"]`,
                  { backgroundColor: value },
                ])
              ) as CSSObject),
            },
            theme.componentStyles?.(theme).Editor || {}
          ),
        }),
      },
      Toolbar: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              backgroundColor: theme.colors.menu.background,
              boxShadow: shadow,
              border: border,
              borderRadius: outerBorderRadius,
              flexWrap: "nowrap",
              gap: "2px",
              padding: "2px",
              width: "fit-content",
              // Button (including dropdown target)
              ".mantine-Button-root, .mantine-ActionIcon-root": {
                backgroundColor: theme.colors.menu.background,
                border: "none",
                borderRadius: innerBorderRadius,
                color: theme.colors.menu.text,
              },
              // Hovered button
              ".mantine-Button-root:hover, .mantine-ActionIcon-root:hover": {
                backgroundColor: theme.colors.hovered.background,
                border: "none",
                color: theme.colors.hovered.text,
              },
              // Selected button
              ".mantine-Button-root[data-selected], .mantine-ActionIcon-root[data-selected]":
                {
                  backgroundColor: theme.colors.selected.background,
                  border: "none",
                  color: theme.colors.selected.text,
                },
              // Disabled button
              ".mantine-Button-root[data-disabled], .mantine-ActionIcon-root[data-disabled]":
                {
                  backgroundColor: theme.colors.disabled.background,
                  border: "none",
                  color: theme.colors.disabled.text,
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
                  backgroundColor: theme.colors.hovered.background,
                },
              },
            },
            theme.componentStyles?.(theme).Toolbar || {}
          ),
        }),
      },
      ToolbarInputDropdown: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              backgroundColor: theme.colors.menu.background,
              border: border,
              borderRadius: outerBorderRadius,
              boxShadow: shadow,
              color: theme.colors.menu.text,
              gap: "4px",
              minWidth: "145px",
              padding: "2px",
              // Row
              ".mantine-Group-root": {
                flexWrap: "nowrap",
                // Row input field
                ".mantine-TextInput-root, .mantine-FileInput-root": {
                  width: "300px",
                  ".mantine-TextInput-wrapper:hover": {
                    backgroundColor: theme.colors.hovered.background,
                  },
                  ".mantine-TextInput-wrapper, .mantine-FileInput-wrapper": {
                    padding: 0,
                    borderRadius: "4px",
                    ".mantine-FileInput-icon": {
                      color: theme.colors.menu.text,
                    },
                    ".mantine-TextInput-input, .mantine-FileInput-input": {
                      border: "none",
                      fontSize: "12px",
                      ".mantine-FileInput-placeholder": {
                        color: theme.colors.menu.text,
                      },
                    },
                    ".mantine-FileInput-input:hover": {
                      backgroundColor: theme.colors.hovered.background,
                    },
                  },
                },
              },
            },
            theme.componentStyles?.(theme).EditHyperlinkMenu || {}
          ),
        }),
      },
      Tooltip: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              backgroundColor: theme.colors.tooltip.background,
              border: border,
              borderRadius: outerBorderRadius,
              boxShadow: shadow,
              color: theme.colors.tooltip.text,
              padding: "4px 10px",
              textAlign: "center",
              "div ~ div": {
                color: theme.colors.tooltip.text,
              },
            },
            theme.componentStyles?.(theme).Tooltip || {}
          ),
        }),
      },
      SlashMenu: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              position: "relative",
              ".mantine-Menu-item": {
                // Icon
                ".mantine-Menu-itemIcon": {
                  backgroundColor: theme.colors.tooltip.background,
                  borderRadius: innerBorderRadius,
                  color: theme.colors.tooltip.text,
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
                    backgroundColor: theme.colors.tooltip.background,
                    color: theme.colors.tooltip.text,
                  },
                },
              },
            },
            theme.componentStyles?.(theme).SlashMenu || {}
          ),
        }),
      },
      SideMenu: {
        styles: () => ({
          root: merge<CSSObject, CSSObject>(
            {
              backgroundColor: "transparent",
              ".mantine-UnstyledButton-root": {
                backgroundColor: "transparent",
                color: theme.colors.sideMenu,
              },
              ".mantine-UnstyledButton-root:hover": {
                backgroundColor: theme.colors.hovered.background,
              },
            },
            theme.componentStyles?.(theme).SideMenu || {}
          ),
        }),
      },
    },
    fontFamily: theme.fontFamily,
    other: {
      textColors: textColors,
      backgroundColors: backgroundColors,
    },
  };
};
