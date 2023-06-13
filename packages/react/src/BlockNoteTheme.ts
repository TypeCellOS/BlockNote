import { MantineThemeOverride } from "@mantine/core";

type ColorScheme = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
];

export const blockNoteColorScheme: ColorScheme = [
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

export const getBlockNoteTheme = (
  useDarkTheme: boolean = false
): MantineThemeOverride => {
  const boxShadow = `0px 4px 8px ${
    useDarkTheme ? blockNoteColorScheme[8] : blockNoteColorScheme[2]
  }, 0px 0px 1px ${
    useDarkTheme ? blockNoteColorScheme[6] : blockNoteColorScheme[1]
  }`;

  const border = `1px solid ${
    useDarkTheme ? blockNoteColorScheme[7] : blockNoteColorScheme[1]
  }`;

  const sideMenu = useDarkTheme
    ? blockNoteColorScheme[4]
    : blockNoteColorScheme[2];

  const primaryBackground = useDarkTheme
    ? blockNoteColorScheme[6]
    : blockNoteColorScheme[0];
  const secondaryBackground = useDarkTheme
    ? blockNoteColorScheme[7]
    : blockNoteColorScheme[1];

  const primaryText = useDarkTheme
    ? blockNoteColorScheme[2]
    : blockNoteColorScheme[5];
  const secondaryText = useDarkTheme
    ? blockNoteColorScheme[4]
    : blockNoteColorScheme[4];

  const hoveredBackground = useDarkTheme
    ? blockNoteColorScheme[7]
    : blockNoteColorScheme[1];
  const hoveredText = useDarkTheme
    ? blockNoteColorScheme[2]
    : blockNoteColorScheme[5];

  const selectedBackground = useDarkTheme
    ? blockNoteColorScheme[8]
    : blockNoteColorScheme[5];
  const selectedText = useDarkTheme
    ? blockNoteColorScheme[2]
    : blockNoteColorScheme[0];

  const disabledBackground = useDarkTheme
    ? blockNoteColorScheme[7]
    : blockNoteColorScheme[1];
  const disabledText = useDarkTheme
    ? blockNoteColorScheme[5]
    : blockNoteColorScheme[3];

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
            backgroundColor: primaryBackground,
            border: border,
            borderRadius: "6px",
            boxShadow: boxShadow,
            color: primaryText,
            padding: "2px",
            ".mantine-Menu-item": {
              backgroundColor: primaryBackground,
              border: "none",
              color: primaryText,
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
            backgroundColor: primaryBackground,
            border: border,
            borderRadius: "6px",
            boxShadow: boxShadow,
            color: primaryText,
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
                color: primaryText,
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
                    color: primaryText,
                    fontSize: "12px",
                    padding: 0,
                  },
                },
              },
            },
          },
        }),
      },
      Toolbar: {
        styles: () => ({
          root: {
            backgroundColor: primaryBackground,
            boxShadow: boxShadow,
            border: border,
            borderRadius: "6px",
            flexWrap: "nowrap",
            gap: "2px",
            padding: "2px",
            width: "fit-content",
            // Button (including dropdown target)
            ".mantine-UnstyledButton-root": {
              backgroundColor: primaryBackground,
              border: "none",
              borderRadius: "4px",
              color: primaryText,
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
            backgroundColor: primaryBackground,
            border: border,
            borderRadius: "6px",
            boxShadow: boxShadow,
            color: primaryText,
            padding: "4px 10px",
            textAlign: "center",
            "div ~ div": {
              color: secondaryText,
            },
          },
        }),
      },
      SlashMenu: {
        styles: () => ({
          root: {
            ".mantine-Menu-item": {
              // Icon
              ".mantine-Menu-itemIcon": {
                backgroundColor: secondaryBackground,
                borderRadius: "4px",
                color: primaryText,
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
                  backgroundColor: secondaryBackground,
                  color: primaryText,
                },
              },
            },
          },
        }),
      },
    },
    fontFamily: "Inter",
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
