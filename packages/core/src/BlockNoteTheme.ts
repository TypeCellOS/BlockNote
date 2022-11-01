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
    Toolbar: {
      styles: (theme) => ({
        root: {
          backgroundColor: "white",
          border: `1px solid ${theme.colors.brandFinal[1]}`,
          boxShadow: theme.other.defaultBoxShadow,
          borderRadius: "6px",
          width: "fit-content",
        },
        wrapper: {
          backgroundColor: "transparent",
          flexWrap: "nowrap",
          gap: "2px",
          padding: 2,
        },
      }),
    },
    ToolbarButton: {
      styles: (theme) => ({
        root: {
          color: theme.colors.brandFinal,
        },
      }),
    },
    ToolbarDropdown: {
      styles: (theme) => ({
        dropdown: {
          backgroundColor: "white",
          border: `1px solid ${theme.colors.brandFinal[1]}`,
          borderRadius: "6px",
          boxShadow: theme.other.defaultBoxShadow,
          padding: "2px",
        },
        item: {
          borderRadius: "4px",
          color: theme.colors.brandFinal,
          fontSize: "12px",
          height: "34px",
        },
        itemIcon: {},
        itemRightSection: {
          paddingLeft: "5px",
        },
      }),
    },
    ToolbarDropdownTarget: {
      styles: {
        root: {
          // backgroundColor: "red",
        },
      },
    },
  },
  fontFamily: "Inter",
  primaryColor: "brandFinal",
  primaryShade: 9,
  other: {
    defaultBoxShadow:
      "0px 4px 8px rgba(9, 30, 66, 0.15), 0px 0px 1px rgba(9, 30, 66, 0.21)",
    // border: `1px solid ${theme.colors.brandFinal[1]}`,
  },
};
