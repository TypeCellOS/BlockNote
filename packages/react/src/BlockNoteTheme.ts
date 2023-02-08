import { MantineThemeOverride } from "@mantine/core";

export const BlockNoteTheme: MantineThemeOverride = {
  activeStyles: {
    // Removes button press effect.
    transform: "none",
  },
  colorScheme: "light",
  colors: {
    brandFinal: [
      "#F6F6F8",
      "#ECEDF0",
      "#DFE1E6",
      "#C2C7D0",
      "#A6ADBA",
      "#8993A4",
      "#6D798F",
      "#505F79",
      "#344563",
      "#172B4D",
    ],
  },
  components: {
    Menu: {
      styles: (theme) => ({
        dropdown: {
          backgroundColor: "white",
          boxShadow: `0px 4px 8px ${theme.colors.brandFinal[2]}, 0px 0px 1px ${theme.colors.brandFinal[2]}`,
          border: `1px solid ${theme.colors.brandFinal[1]}`,
          borderRadius: "6px",
          padding: "2px",
        },
      }),
    },
    DragHandleMenu: {
      styles: (theme) => ({
        root: {
          ".mantine-Menu-item": {
            color: theme.colors.brandFinal,
            fontSize: "12px",
            height: "34px",
          },
        },
      }),
    },
    EditHyperlinkMenu: {
      styles: (theme) => ({
        root: {
          backgroundColor: "white",
          boxShadow: `0px 4px 8px ${theme.colors.brandFinal[2]}, 0px 0px 1px ${theme.colors.brandFinal[2]}`,
          border: `1px solid ${theme.colors.brandFinal[1]}`,
          borderRadius: "6px",
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
              color: theme.colors.brandFinal,
              display: "flex",
              justifyContent: "center",
              padding: "0",
              width: "fit-content",
            },
            // Row input field
            ".mantine-TextInput-root": {
              background: "transparent",
              width: "300px",
              ".mantine-TextInput-wrapper": {
                ".mantine-TextInput-input": {
                  fontSize: "12px",
                  border: 0,
                  padding: 0,
                },
              },
            },
          },
        },
      }),
    },
    Toolbar: {
      styles: (theme) => ({
        root: {
          backgroundColor: "white",
          boxShadow: `0px 4px 8px ${theme.colors.brandFinal[2]}, 0px 0px 1px ${theme.colors.brandFinal[2]}`,
          border: `1px solid ${theme.colors.brandFinal[1]}`,
          borderRadius: "6px",
          flexWrap: "nowrap",
          gap: "2px",
          padding: "2px",
          width: "fit-content",
          // Button (including dropdown target)
          ".mantine-UnstyledButton-root": {
            borderRadius: "4px",
          },
          // Dropdown
          ".mantine-Menu-dropdown": {
            // Dropdown item
            ".mantine-Menu-item": {
              color: theme.colors.brandFinal,
              fontSize: "12px",
              height: "34px",
              ".mantine-Menu-itemRightSection": {
                paddingLeft: "5px",
              },
            },
          },
        },
      }),
    },
    Tooltip: {
      styles: (theme) => ({
        root: {
          color: theme.colors.brandFinal[2],
          backgroundColor: theme.colors.brandFinal,
          border: `1px solid ${theme.colors.brandFinal[1]}`,
          borderRadius: "6px",
          boxShadow: `0px 4px 8px ${theme.colors.brandFinal[2]}, 0px 0px 1px ${theme.colors.brandFinal[2]}`,
          padding: "4px 10px",
          textAlign: "center",
          "div ~ div": {
            color: theme.colors.brandFinal[4],
          },
        },
      }),
    },
    SlashMenu: {
      styles: (theme) => ({
        root: {
          // ...theme.other.defaultMenuStyles(theme),
          ".mantine-Menu-item": {
            // Icon
            ".mantine-Menu-itemIcon": {
              padding: "8px",
              border: `1px solid ${theme.colors.brandFinal[2]}`,
              backgroundColor: theme.colors.brandFinal[0],
              borderRadius: "4px",
              color: theme.colors.brandFinal,
            },
            // Text
            ".mantine-Menu-itemLabel": {
              color: theme.colors.brandFinal,
              paddingRight: "16px",
              ".mantine-Stack-root": {
                gap: "0",
              },
            },
            // Badge (keyboard shortcut)
            ".mantine-Menu-itemRightSection": {
              ".mantine-Badge-root": {
                border: `1px solid ${theme.colors.brandFinal[2]}`,
              },
            },
          },
        },
      }),
    },
  },
  fontFamily: "Inter",
  primaryColor: "brandFinal",
  primaryShade: 9,
};
