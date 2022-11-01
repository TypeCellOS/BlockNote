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
          backgroundColor: "green",
          border: `1px solid red`,
          borderRadius: "6px",
          width: "fit-content",
        },
      }),
    },
    Menu: {
      styles: (theme) => ({
        dropdown: {
          border: "",
          boxShadow: "",
        },
        item: {
          color: theme.colors.brandFinal,
        },
        // Adds some space between the item text and selection tick
        itemRightSection: {
          // paddingLeft: "10px",
        },
      }),
    },
    // Box: {
    //   styles: {
    //     root: {
    //       // backgroundColor: "white",
    //       boxShadow:
    //         "0px 4px 8px rgba(9, 30, 66, 0.15), 0px 0px 1px rgba(9, 30, 66, 0.21)",
    //       // border: `1px solid ${theme.colors.brandFinal[1]}`,
    //       borderRadius: "6px",
    //       width: "fit-content",
    //     },
    //   },
    // },
    Group: {
      styles: {},
    },
    Button: {
      styles: {},
    },
    ActionIcon: {
      styles: {},
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
