import { MantineTheme, MantineThemeOverride } from "@mantine/core";

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
    EditHyperlinkMenu: {
      styles: (theme) => ({
        root: {
          ...theme.other.defaultMenuStyles(theme),
          gap: "4px",
          minWidth: "145px",
          // Menu row.
          ".mantine-Group-root": {
            flexWrap: "nowrap",
            gap: "8px",
            paddingInline: "6px",
            // Row icon.
            ".mantine-Container-root": {
              color: theme.colors.brandFinal,
              display: "flex",
              justifyContent: "center",
              padding: "0",
              width: "fit-content",
            },
            // Row input field.
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
          ...theme.other.defaultMenuStyles(theme),
          flexWrap: "nowrap",
          gap: "2px",
          width: "fit-content",
          // Menu button (including dropdown target).
          ".mantine-UnstyledButton-root": {
            borderRadius: "4px",
          },
          // Menu dropdown.
          ".mantine-Menu-dropdown": {
            ...theme.other.defaultMenuStyles(theme),
            ".mantine-Menu-item": {
              borderRadius: "4px",
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
    SuggestionList: {
      styles: (theme) => ({
        root: {
          backgroundColor: "red",
          color: "red",
          ...theme.other.defaultMenuStyles(theme),
          ".mantine-Menu-dropdown": {
            backgroundColor: "red",
          },
        },
      }),
    },
  },
  fontFamily: "Inter",
  primaryColor: "brandFinal",
  primaryShade: 9,
  other: {
    defaultMenuStyles: (theme: MantineTheme) => ({
      backgroundColor: "white",
      boxShadow:
        "0px 4px 8px rgba(9, 30, 66, 0.15), 0px 0px 1px rgba(9, 30, 66, 0.21)",
      border: `1px solid ${theme.colors.brandFinal[1]}`,
      borderRadius: "6px",
      padding: "2px",
    }),
  },
};
